#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(ROOT, 'server', 'server.js');
const PROFILE_PATH = path.join(ROOT, 'server', 'profiles.json');
const SERVER_URL = `ws://localhost:${process.env.PORT || 8180}/ws`;
const SERVER_START_TIMEOUT_MS = 10000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MONGO_URL: '',
        MONGO_DB: '',
        MONGO_COLLECTION: '',
      },
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      child.kill();
      reject(new Error('Timed out waiting for server startup.'));
    }, SERVER_START_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[server] ${text}`);
      if (!resolved && text.includes('Server running')) {
        resolved = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      process.stderr.write(`[server:err] ${text}`);
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Server exited early with code ${code}`));
      }
    });
  });
}

async function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }
    const cleanup = () => resolve();
    child.once('exit', cleanup);
    child.kill('SIGTERM');
    setTimeout(cleanup, 4000);
  });
}

class PlayerClient {
  constructor(label) {
    this.label = label;
    this.ws = null;
    this.queue = [];
    this.waiters = [];
    this.stateWaiters = [];
    this.inventory = null;
    this.bank = null;
    this.position = null;
    this.aim = { x: 1, y: 0 };
    this.id = null;
    this.profileId = null;
    this.zoneId = null;
    this.safeZones = [];
    this.oreNodes = [];
    this.tradingFacility = null;
    this.isAdmin = false;
    this.latestState = null;
    this.latestStateAt = 0;
  }

  async connectAndRegister(account, password) {
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(SERVER_URL);
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });

    this.ws.on('message', (data) => this._handleMessage(data));
    this.ws.on('close', () => {
      this.queue = [];
      this.waiters.forEach((entry) => {
        clearTimeout(entry.timer);
        entry.reject(new Error(`${this.label} connection closed`));
      });
      this.waiters = [];
      this.stateWaiters.forEach((entry) => {
        clearTimeout(entry.timer);
        entry.reject(new Error(`${this.label} connection closed`));
      });
      this.stateWaiters = [];
    });

    await this.waitFor((msg) => msg.type === 'control' && msg.event === 'auth-required', 4000);

    this.send({
      type: 'auth',
      action: 'register',
      account,
      password,
    });

    const init = await this.waitFor((msg) => msg.type === 'init', 5000);
    this.id = init.id;
    this.profileId = init.profileId;
    this.zoneId = init.you?.zoneId || 'frontier';
    this.position = { x: init.you?.x ?? 0, y: init.you?.y ?? 0 };
    this.aim = { x: init.you?.aimX ?? 1, y: init.you?.aimY ?? 0 };
    this.safeZones = Array.isArray(init.safeZones) ? init.safeZones : [];
    this.oreNodes = Array.isArray(init.oreNodes) ? init.oreNodes : [];
    this.isAdmin = Boolean(init.profile?.isAdmin);
    this.tradingFacility = this._resolveTradingSpot();

    await this.waitFor((msg) => msg.type === 'inventory', 5000);
    await this.waitForState(4000);
  }

  _resolveTradingSpot() {
    const zone = this.safeZones.find((entry) => entry?.id === this.zoneId) || this.safeZones[0];
    const trading = zone?.facilities?.trading;
    if (!trading) {
      throw new Error('Trading facility not found in safe zone data.');
    }
    return trading;
  }

  _handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (err) {
      console.error(`[${this.label}] failed to parse message`, raw);
      return;
    }

    if (message.type === 'state') {
      this._handleState(message);
      return;
    }

    if (message.type === 'inventory') {
      this.inventory = message.inventory || this.inventory;
      this.bank = message.bank || this.bank;
    }

    this._dispatch(message);
  }

  _handleState(message) {
    this.latestState = message;
    this.latestStateAt = Date.now();
    const playerData = Array.isArray(message.players)
      ? message.players.find((entry) => entry.id === this.id)
      : null;
    if (playerData) {
      this.position = { x: playerData.x, y: playerData.y };
      this.aim = {
        x: Number.isFinite(playerData.aimX) ? playerData.aimX : this.aim.x,
        y: Number.isFinite(playerData.aimY) ? playerData.aimY : this.aim.y,
      };
    }
    while (this.stateWaiters.length) {
      const entry = this.stateWaiters.shift();
      clearTimeout(entry.timer);
      entry.resolve(message);
    }
  }

  _dispatch(message) {
    for (let i = 0; i < this.waiters.length; i += 1) {
      const entry = this.waiters[i];
      if (entry.predicate(message)) {
        this.waiters.splice(i, 1);
        clearTimeout(entry.timer);
        entry.resolve(message);
        return;
      }
    }
    this.queue.push(message);
    if (this.queue.length > 50) {
      this.queue.shift();
    }
  }

  waitFor(predicate, timeout = 5000) {
    return new Promise((resolve, reject) => {
      for (let i = 0; i < this.queue.length; i += 1) {
        const message = this.queue[i];
        if (predicate(message)) {
          this.queue.splice(i, 1);
          resolve(message);
          return;
        }
      }

      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((entry) => entry.timer === timer);
        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
        reject(new Error(`${this.label} waitFor timeout after ${timeout}ms`));
      }, timeout);

      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  waitForState(timeout = 3000) {
    if (this.latestState && Date.now() - this.latestStateAt < 100) {
      return Promise.resolve(this.latestState);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.stateWaiters.findIndex((entry) => entry.timer === timer);
        if (index !== -1) {
          this.stateWaiters.splice(index, 1);
        }
        reject(new Error(`${this.label} waitForState timeout after ${timeout}ms`));
      }, timeout);
      this.stateWaiters.push({ resolve, reject, timer });
    });
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`${this.label} attempted to send on closed socket`);
    }
    this.ws.send(JSON.stringify(payload));
  }

  async close() {
    if (!this.ws) return;
    await new Promise((resolve) => {
      const done = () => resolve();
      this.ws.once('close', done);
      this.ws.close();
      setTimeout(done, 2000);
    });
  }

  async moveTo(targetX, targetY, { tolerance = 0.5, pollInterval = 80, maxMs = 14000 } = {}) {
    const start = Date.now();
    let bestDistance = Infinity;
    let lastImprovement = Date.now();
    let mode = 'direct';

    while (Date.now() - start < maxMs) {
      await this.waitForState(Math.min(1200, pollInterval + 320)).catch(() => {});
      if (!this.position) {
        await delay(pollInterval);
        continue;
      }

      const dx = targetX - this.position.x;
      const dy = targetY - this.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= tolerance) {
        this._sendInput(0, 0);
        return;
      }

      if (distance + 0.02 < bestDistance) {
        bestDistance = distance;
        lastImprovement = Date.now();
        mode = 'direct';
      } else if (Date.now() - lastImprovement > 1200) {
        if (mode === 'direct') {
          mode = Math.abs(dx) >= Math.abs(dy) ? 'axisX' : 'axisY';
        } else if (mode === 'axisX') {
          mode = 'axisY';
        } else {
          mode = 'direct';
        }
        lastImprovement = Date.now();
      }

      let moveX = 0;
      let moveY = 0;
      if (mode === 'direct') {
        moveX = dx / (distance || 1);
        moveY = dy / (distance || 1);
      } else if (mode === 'axisX') {
        moveX = Math.sign(dx);
        moveY = 0;
      } else {
        moveX = 0;
        moveY = Math.sign(dy);
      }

      if (moveX === 0 && moveY === 0 && distance > tolerance) {
        moveX = dx / (distance || 1);
        moveY = dy / (distance || 1);
      }

      this._sendInput(moveX, moveY);
      await delay(pollInterval);
    }

    this._sendInput(0, 0);
    throw new Error(`${this.label} failed to reach destination (${targetX.toFixed(2)}, ${targetY.toFixed(2)})`);
  }

  _sendInput(moveX, moveY) {
    this.send({
      type: 'input',
      moveX,
      moveY,
      aimX: this.aim.x,
      aimY: this.aim.y,
    });
  }

  async gatherOre(oreId) {
    const beforeAmount = Number(this.inventory?.items?.[oreId] || 0);
    this.send({ type: 'gather' });
    await this.waitFor((msg) => msg.type === 'gathered', 3000);
    await this.waitForInventory((inv) => Number(inv?.items?.[oreId] || 0) >= beforeAmount + 1, 4000);
  }

  async waitForInventory(condition, timeout = 5000) {
    if (this.inventory && condition(this.inventory, this.bank)) {
      return this.inventory;
    }
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const remaining = end - Date.now();
      const message = await this.waitFor((msg) => msg.type === 'inventory', remaining).catch(() => null);
      if (!message) break;
      if (condition(this.inventory, this.bank)) {
        return this.inventory;
      }
    }
    throw new Error(`${this.label} inventory condition not met within ${timeout}ms`);
  }

  async grantCurrency(targetProfileId, amount) {
    if (!this.isAdmin) {
      throw new Error(`${this.label} is not an admin and cannot grant currency.`);
    }
    this.send({
      type: 'admin',
      command: 'grant-currency',
      profileId: targetProfileId,
      inventoryDelta: amount,
      bankDelta: 0,
    });
    const response = await this.waitFor(
      (msg) => msg.type === 'admin' && msg.command === 'grant-currency',
      4000
    );
    if (response.event !== 'ok') {
      throw new Error(`Grant currency failed: ${response.message || 'unknown error'}`);
    }
    return response;
  }

  async teleportToSafeZone(targetProfileId) {
    if (!this.isAdmin) {
      throw new Error(`${this.label} is not an admin and cannot teleport players.`);
    }
    this.send({
      type: 'admin',
      command: 'teleport-safe',
      profileId: targetProfileId,
    });
    const response = await this.waitFor(
      (msg) =>
        msg.type === 'admin' &&
        msg.command === 'teleport-safe' &&
        msg.profileId === targetProfileId,
      4000
    );
    if (response.event !== 'ok') {
      throw new Error(`Teleport failed: ${response.message || 'unknown error'}`);
    }
    return response.safeZone || null;
  }

  async requestListings() {
    this.send({ type: 'trading', action: 'listings' });
    const response = await this.waitFor(
      (msg) => msg.type === 'trading' && msg.action === 'listings',
      4000
    );
    return Array.isArray(response.listings) ? response.listings : [];
  }

  async createListing({ itemId, amount, price }) {
    const beforeAmount = Number(this.inventory?.items?.[itemId] || 0);
    this.send({
      type: 'trading',
      action: 'create',
      itemId,
      amount,
      price,
    });
    const response = await this.waitFor(
      (msg) => msg.type === 'trading' && msg.action === 'create',
      5000
    );
    if (!response.ok) {
      throw new Error(`Create listing failed: ${response.message || 'unknown error'}`);
    }
    await this.waitForInventory((inv) => Number(inv?.items?.[itemId] || 0) === beforeAmount - amount, 5000);
    return response.listing;
  }

  async cancelListing(listingId, itemId, amount) {
    this.send({ type: 'trading', action: 'cancel', listingId });
    const response = await this.waitFor(
      (msg) => msg.type === 'trading' && msg.action === 'cancel' && msg.listingId === listingId,
      4000
    );
    if (!response.ok) {
      throw new Error(`Cancel listing failed: ${response.message || 'unknown error'}`);
    }
    await this.waitForInventory((inv) => Number(inv?.items?.[itemId] || 0) >= amount, 4000);
    return response;
  }

  async buyListing(listingId, price, itemId, expectedQuantity) {
    const beforeCurrency = Number(this.inventory?.currency || 0);
    const beforeItemAmount = Number(this.inventory?.items?.[itemId] || 0);
    this.send({ type: 'trading', action: 'buy', listingId });
    const response = await this.waitFor(
      (msg) => msg.type === 'trading' && msg.action === 'buy',
      5000
    );
    if (response.listingId && response.listingId !== listingId) {
      throw new Error(`Buy listing response mismatch (expected ${listingId}, got ${response.listingId}).`);
    }
    if (!response.ok) {
      throw new Error(`Buy listing failed: ${response.message || 'unknown error'}`);
    }
    await this.waitForInventory(
      (inv) =>
        Number(inv?.currency || 0) === beforeCurrency - price &&
        Number(inv?.items?.[itemId] || 0) === beforeItemAmount + expectedQuantity,
      5000
    );
    return response;
  }

  findNearestOreNode() {
    if (!this.position) {
      throw new Error('Player position unavailable when searching for ore nodes.');
    }
    if (!Array.isArray(this.oreNodes) || !this.oreNodes.length) {
      throw new Error('No ore nodes provided by server.');
    }
    let best = null;
    let bestDist = Infinity;
    for (const node of this.oreNodes) {
      if (node.amount <= 0) continue;
      const dist = Math.hypot(node.x - this.position.x, node.y - this.position.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    if (!best) {
      throw new Error('Failed to locate a usable ore node.');
    }
    return best;
  }
}

async function runWorkflow() {
  const timestamp = Date.now();
  const sellerAccount = `seller_${timestamp}`;
  const buyerAccount = `buyer_${timestamp}`;
  const password = 'Testpass123!';

  const seller = new PlayerClient('seller');
  const buyer = new PlayerClient('buyer');

  try {
    await seller.connectAndRegister(sellerAccount, password);
    await buyer.connectAndRegister(buyerAccount, password);

    const oreCandidates = Array.isArray(seller.oreNodes) ? [...seller.oreNodes] : [];
    oreCandidates.sort((a, b) => {
      const distA = Math.hypot((a?.x || 0) - (seller.position?.x || 0), (a?.y || 0) - (seller.position?.y || 0));
      const distB = Math.hypot((b?.x || 0) - (seller.position?.x || 0), (b?.y || 0) - (seller.position?.y || 0));
      return distA - distB;
    });
    let oreNode = null;
    for (const candidate of oreCandidates) {
      if (!candidate || candidate.amount <= 0) continue;
      try {
  await seller.moveTo(candidate.x, candidate.y, { tolerance: 0.8, maxMs: 16000 });
        oreNode = candidate;
        break;
      } catch (err) {
        // try next candidate if this node cannot be reached
      }
    }
    if (!oreNode) {
      throw new Error('Failed to reach any ore node for gathering.');
    }

    const gatherTarget = 3;
    for (let i = 0; i < gatherTarget; i += 1) {
      await seller.gatherOre(oreNode.type);
      await delay(120);
    }

  await seller.teleportToSafeZone(seller.profileId);
    await seller.waitForState(4000);

  await seller.teleportToSafeZone(buyer.profileId);
    await buyer.waitForState(4000);

  const tradingSpot = seller.tradingFacility;
    const facilityTolerance = Math.max(1.5, (tradingSpot.radius || 2) * 0.92);
    const approachOffsets = [
      { dx: 0, dy: Math.max(1.6, (tradingSpot.radius || 2) * 1.35) },
      { dx: -1.8, dy: Math.max(1.6, (tradingSpot.radius || 2) * 1.35) },
      { dx: 1.8, dy: Math.max(1.6, (tradingSpot.radius || 2) * 1.35) },
      { dx: -2.6, dy: Math.max(1.8, (tradingSpot.radius || 2) * 1.45) },
      { dx: 2.6, dy: Math.max(1.8, (tradingSpot.radius || 2) * 1.45) },
    ];

    let sellerAtTrading = false;
    for (const offset of approachOffsets) {
      const preTarget = {
        x: tradingSpot.x + offset.dx,
        y: tradingSpot.y + offset.dy,
      };
      try {
        await seller.moveTo(preTarget.x, preTarget.y, {
          tolerance: Math.max(1.3, (tradingSpot.radius || 2) * 0.9),
        });
        if (seller.position) {
          const dist = Math.hypot(tradingSpot.x - seller.position.x, tradingSpot.y - seller.position.y);
          if (dist <= facilityTolerance) {
            sellerAtTrading = true;
            break;
          }
        }
        await seller.moveTo(tradingSpot.x, tradingSpot.y, {
          tolerance: facilityTolerance,
        });
        sellerAtTrading = true;
        break;
      } catch (err) {
        // try next offset if this path is blocked
      }
    }
    if (!sellerAtTrading) {
      throw new Error('Seller could not reach the trading facility.');
    }

    let buyerAtTrading = false;
    const sellerAnchor = seller.position
      ? { x: seller.position.x, y: seller.position.y }
      : { x: tradingSpot.x, y: tradingSpot.y + facilityTolerance * 0.5 };
    try {
      await buyer.moveTo(sellerAnchor.x + 0.5, sellerAnchor.y + 0.25, {
        tolerance: facilityTolerance,
      });
      if (buyer.position) {
        const dist = Math.hypot(tradingSpot.x - buyer.position.x, tradingSpot.y - buyer.position.y);
        buyerAtTrading = dist <= facilityTolerance;
      }
    } catch (err) {
      buyerAtTrading = false;
    }

    if (!buyerAtTrading) {
      for (const offset of approachOffsets) {
        const preTarget = {
          x: tradingSpot.x + offset.dx * 0.7,
          y: tradingSpot.y + offset.dy * 0.85,
        };
        try {
          await buyer.moveTo(preTarget.x, preTarget.y, {
            tolerance: Math.max(1.3, (tradingSpot.radius || 2) * 0.9),
          });
          if (buyer.position) {
            const dist = Math.hypot(tradingSpot.x - buyer.position.x, tradingSpot.y - buyer.position.y);
            if (dist <= facilityTolerance) {
              buyerAtTrading = true;
              break;
            }
          }
          await buyer.moveTo(tradingSpot.x + 0.6, tradingSpot.y + 0.4, {
            tolerance: facilityTolerance,
          });
          buyerAtTrading = true;
          break;
        } catch (err) {
          // try next offset if this path is blocked
        }
      }
    }

    if (!buyerAtTrading) {
      throw new Error('Buyer could not reach the trading facility.');
    }

  await seller.grantCurrency(buyer.profileId, 200);
    await buyer.waitForInventory((inv) => Number(inv?.currency || 0) >= 200, 4000);

    const listingQuantity = 2;
    const listingPrice = 90;
    const oreId = oreNode.type;

  const firstListing = await seller.createListing({ itemId: oreId, amount: listingQuantity, price: listingPrice });
    await seller.cancelListing(firstListing.id, oreId, gatherTarget);
    await seller.waitForInventory((inv) => Number(inv?.items?.[oreId] || 0) === gatherTarget, 4000);

  const secondListing = await seller.createListing({ itemId: oreId, amount: listingQuantity, price: listingPrice });

  const listingsSnapshot = await buyer.requestListings();
    const snapshotListing = listingsSnapshot.find((entry) => entry.id === secondListing.id);
    if (!snapshotListing) {
      throw new Error('Buyer did not receive serialized listing data.');
    }
    if (!snapshotListing.itemLabel || !snapshotListing.expiresAt) {
      throw new Error('Listing serialization missing expected fields.');
    }

    const sellerBankBefore = Number(seller.bank?.currency || 0);

  await buyer.buyListing(secondListing.id, listingPrice, oreId, listingQuantity);

    const expectedPayout = listingPrice - Math.floor(listingPrice * 0.05);
    await seller.waitForInventory(
      (_inv, bank) => Number(bank?.currency || 0) >= sellerBankBefore + expectedPayout,
      5000
    );

    const sellerOreFinal = Number(seller.inventory?.items?.[oreId] || 0);
    const buyerOreFinal = Number(buyer.inventory?.items?.[oreId] || 0);
    const buyerCurrencyFinal = Number(buyer.inventory?.currency || 0);
    const sellerBankFinal = Number(seller.bank?.currency || 0);

    console.log('--- Trading workflow verification ---');
    console.log(`Seller ore remaining: ${sellerOreFinal}`);
    console.log(`Buyer ore acquired: ${buyerOreFinal}`);
    console.log(`Buyer currency after purchase: ${buyerCurrencyFinal}`);
    console.log(`Seller bank currency: ${sellerBankFinal}`);
    console.log(`Listing expires in ${(snapshotListing.expiresAt - Date.now()) / 1000}s`);

    if (sellerOreFinal !== gatherTarget - listingQuantity) {
      throw new Error('Seller ore count mismatch after sale.');
    }
    if (buyerOreFinal < listingQuantity) {
      throw new Error('Buyer did not receive purchased ore.');
    }
    if (buyerCurrencyFinal !== 200 - listingPrice) {
      throw new Error('Buyer currency did not decrease by sale price.');
    }
    if (sellerBankFinal < sellerBankBefore + expectedPayout) {
      throw new Error('Seller bank balance missing payout.');
    }

    console.log('Trading workflow succeeded.');
  } finally {
    await buyer.close();
    await seller.close();
  }
}

async function run() {
  const originalProfiles = fs.existsSync(PROFILE_PATH)
    ? fs.readFileSync(PROFILE_PATH, 'utf8')
    : null;

  let serverProcess = null;
  try {
    serverProcess = await startServer();
    await delay(300);
    await runWorkflow();
  } finally {
    await stopServer(serverProcess);
    if (originalProfiles != null) {
      fs.writeFileSync(PROFILE_PATH, originalProfiles, 'utf8');
    } else if (fs.existsSync(PROFILE_PATH)) {
      fs.unlinkSync(PROFILE_PATH);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
