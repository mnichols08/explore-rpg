import './stat-panel.js';
import './charge-meter.js';
import './audio-toggle.js';
import { AudioEngine } from '../audio/audio-engine.js';

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 70%);
      cursor: crosshair;
    }

    .hud {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      pointer-events: none;
      padding: 1.5rem;
    }

    .hud > * {
      pointer-events: auto;
    }

    .hud .top-left {
      justify-self: start;
      align-self: start;
    }

    .hud .top-right {
      justify-self: end;
      align-self: start;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.75rem;
    }

    .hud .bottom-left {
      justify-self: start;
      align-self: end;
      color: rgba(226, 232, 240, 0.85);
      font-size: 0.8rem;
      line-height: 1.4;
      max-width: 320px;
      background: rgba(15, 23, 42, 0.65);
      border-radius: 0.75rem;
      padding: 0.65rem 0.9rem;
      border: 1px solid rgba(148, 163, 184, 0.2);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .identity-tools {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .identity-tools button {
      all: unset;
      cursor: pointer;
      padding: 0.35rem 0.55rem;
      border-radius: 0.5rem;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.35);
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #e2e8f0;
      transition: background 150ms ease, border 150ms ease, transform 150ms ease;
    }

    .identity-tools button:hover {
      background: rgba(51, 65, 85, 0.9);
      border-color: rgba(148, 163, 184, 0.6);
    }

    .identity-tools button:active {
      transform: translateY(1px);
    }

    .hero-id {
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.78rem;
      color: #f8fafc;
      word-break: break-all;
    }

    .identity-legend {
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.8);
    }

    .identity-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 5;
    }

    .identity-overlay[hidden] {
      display: none;
    }

    .identity-card {
      min-width: 280px;
      max-width: 360px;
      padding: 1.25rem 1.5rem;
      background: rgba(15, 23, 42, 0.92);
      border-radius: 0.85rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #e2e8f0;
      display: grid;
      gap: 0.75rem;
      text-align: center;
      box-shadow: 0 1.5rem 3rem rgba(8, 16, 32, 0.45);
    }

    .identity-card h3 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #93c5fd;
    }

    .identity-card p {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5;
      color: rgba(226, 232, 240, 0.85);
    }

    .identity-card input {
      all: unset;
      padding: 0.55rem 0.75rem;
      background: rgba(30, 41, 59, 0.85);
      border-radius: 0.65rem;
      border: 1px solid rgba(148, 163, 184, 0.4);
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.85rem;
      color: #f8fafc;
    }

    .identity-card input::placeholder {
      color: rgba(148, 163, 184, 0.6);
    }

    .identity-card .actions {
      display: grid;
      gap: 0.45rem;
    }

    .identity-card button {
      all: unset;
      cursor: pointer;
      padding: 0.55rem 0.75rem;
      border-radius: 0.65rem;
      border: 1px solid rgba(148, 163, 184, 0.45);
      background: rgba(30, 41, 59, 0.95);
      color: #f8fafc;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 0.78rem;
      transition: background 150ms ease, border 150ms ease, transform 150ms ease;
    }

    .identity-card button.primary {
      background: linear-gradient(120deg, #38bdf8, #6366f1);
      border-color: transparent;
      color: #0f172a;
    }

    .identity-card button:hover {
      background: rgba(45, 55, 72, 0.95);
      border-color: rgba(148, 163, 184, 0.7);
    }

    .identity-card button.primary:hover {
      filter: brightness(1.08);
    }

    .identity-card button:active {
      transform: translateY(1px);
    }

    .hud .message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #e2e8f0;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 1rem 3rem rgba(15, 23, 42, 0.6);
      pointer-events: none;
    }
  </style>
  <canvas></canvas>
  <div class="hud">
    <div class="top-left"><stat-panel></stat-panel></div>
    <div class="top-right">
      <charge-meter></charge-meter>
      <audio-toggle></audio-toggle>
    </div>
    <div class="bottom-left">
      <div>
        <strong>Explore &amp; grow:</strong><br />
        WASD to move. Left click to swing. Right click to shoot. Press both to cast. Hold to charge every action.<br />
        Music toggle: button or press M. Shift + N to forge a new hero.
      </div>
      <div>
        <span class="identity-legend">Hero ID</span>
        <div class="hero-id" data-hero-id>—</div>
      </div>
      <div class="identity-tools">
        <button type="button" data-copy-id>Copy ID</button>
        <button type="button" data-new-hero>Start New Hero</button>
        <button type="button" data-use-id>Use Hero ID</button>
      </div>
    </div>
    <div class="message" hidden data-message>Connecting...</div>
  </div>
  <div class="identity-overlay" hidden data-identity-overlay>
    <div class="identity-card">
      <h3>Hero Login</h3>
      <p>Paste an existing Hero ID to continue, or launch a fresh hero.</p>
      <input type="text" placeholder="Paste Hero ID" data-identity-input />
      <div class="actions">
        <button type="button" class="primary" data-identity-load>Load Hero</button>
        <button type="button" data-identity-new>Start New Hero</button>
        <button type="button" data-identity-cancel>Cancel</button>
      </div>
    </div>
  </div>
`;

const TILE_STYLE = {
  water: '#0f172a',
  sand: '#fbbf24',
  grass: '#2dd4bf',
  forest: '#166534',
  rock: '#94a3b8',
};

const ACTION_LABEL = {
  melee: 'Melee Charge',
  ranged: 'Arrow Charge',
  spell: 'Spell Charge',
};

const PROFILE_STORAGE_KEY = 'explore-rpg-profile-id';
const ENEMY_STYLE = {
  slime: { inner: '#0ea5e9', outer: '#0369a1' },
  wolf: { inner: '#facc15', outer: '#f97316' },
  wisp: { inner: '#c084fc', outer: '#7c3aed' },
  default: { inner: '#f87171', outer: '#dc2626' },
};

class GameApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.statPanel = this.shadowRoot.querySelector('stat-panel');
    this.chargeMeter = this.shadowRoot.querySelector('charge-meter');
    this.messageEl = this.shadowRoot.querySelector('[data-message]');
  this.audioToggle = this.shadowRoot.querySelector('audio-toggle');
  this.heroIdEl = this.shadowRoot.querySelector('[data-hero-id]');
  this.copyHeroButton = this.shadowRoot.querySelector('[data-copy-id]');
  this.newHeroButton = this.shadowRoot.querySelector('[data-new-hero]');
  this.useHeroButton = this.shadowRoot.querySelector('[data-use-id]');
  this.identityOverlay = this.shadowRoot.querySelector('[data-identity-overlay]');
  this.identityInput = this.shadowRoot.querySelector('[data-identity-input]');
  this.identityLoadButton = this.shadowRoot.querySelector('[data-identity-load]');
  this.identityNewButton = this.shadowRoot.querySelector('[data-identity-new]');
  this.identityCancelButton = this.shadowRoot.querySelector('[data-identity-cancel]');

    this.world = null;
    this.players = new Map();
    this.effects = [];
  this.enemies = new Map();
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
    this.keys = new Set();
    this.pointerAim = { x: 1, y: 0 };
    this.lastInputSent = 0;
    this.tileSize = 36;
    this.activeAction = null;
    this.actionStart = 0;
    this.pointerButtons = 0;
    this.knownEffects = new Set();
  this.profileId = null;
  this.pendingProfileId = undefined;

    this.audio = new AudioEngine();

    this._loop = this._loop.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handlePointerMove = this._handlePointerMove.bind(this);
    this._handlePointerLeave = this._handlePointerLeave.bind(this);
    this._handlePointerCancel = this._handlePointerCancel.bind(this);
    this._handleMusicToggle = this._handleMusicToggle.bind(this);
  this._handleCopyHeroId = this._handleCopyHeroId.bind(this);
  this._handleNewHeroRequest = this._handleNewHeroRequest.bind(this);
  this._handleUseHeroRequest = this._handleUseHeroRequest.bind(this);
  this._handleIdentityLoad = this._handleIdentityLoad.bind(this);
  this._handleIdentityNew = this._handleIdentityNew.bind(this);
  this._handleIdentityCancel = this._handleIdentityCancel.bind(this);
  this._handleIdentityInputKeydown = this._handleIdentityInputKeydown.bind(this);
    this._resizeCanvas = this._resizeCanvas.bind(this);
  }

  connectedCallback() {
    this.resizeObserver = new ResizeObserver(this._resizeCanvas);
    this.resizeObserver.observe(this);
    window.addEventListener('resize', this._resizeCanvas);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    this.canvas.addEventListener('pointerdown', this._handlePointerDown);
    this.canvas.addEventListener('pointerup', this._handlePointerUp);
    this.canvas.addEventListener('pointermove', this._handlePointerMove);
    this.canvas.addEventListener('pointerleave', this._handlePointerLeave);
    this.canvas.addEventListener('pointercancel', this._handlePointerCancel);
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.audioToggle?.addEventListener('music-toggle', this._handleMusicToggle);
    if (this.audioToggle) {
      this.audioToggle.active = this.audio.musicEnabled;
    }
    this.copyHeroButton?.addEventListener('click', this._handleCopyHeroId);
    this.newHeroButton?.addEventListener('click', this._handleNewHeroRequest);
    this.useHeroButton?.addEventListener('click', this._handleUseHeroRequest);
    this.identityLoadButton?.addEventListener('click', this._handleIdentityLoad);
    this.identityNewButton?.addEventListener('click', this._handleIdentityNew);
    this.identityCancelButton?.addEventListener('click', this._handleIdentityCancel);
    this.identityInput?.addEventListener('keydown', this._handleIdentityInputKeydown);
    this._resizeCanvas();
    this._initializeIdentity();
    requestAnimationFrame(this._loop);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this._resizeCanvas);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    this.canvas.removeEventListener('pointerdown', this._handlePointerDown);
    this.canvas.removeEventListener('pointerup', this._handlePointerUp);
    this.canvas.removeEventListener('pointermove', this._handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this._handlePointerLeave);
    this.canvas.removeEventListener('pointercancel', this._handlePointerCancel);
    this.audioToggle?.removeEventListener('music-toggle', this._handleMusicToggle);
  this.copyHeroButton?.removeEventListener('click', this._handleCopyHeroId);
  this.newHeroButton?.removeEventListener('click', this._handleNewHeroRequest);
  this.useHeroButton?.removeEventListener('click', this._handleUseHeroRequest);
  this.identityLoadButton?.removeEventListener('click', this._handleIdentityLoad);
  this.identityNewButton?.removeEventListener('click', this._handleIdentityNew);
  this.identityCancelButton?.removeEventListener('click', this._handleIdentityCancel);
  this.identityInput?.removeEventListener('keydown', this._handleIdentityInputKeydown);
    this.audio.setMusicEnabled(false);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  _initializeIdentity() {
    let storedId = null;
    try {
      storedId = window.localStorage?.getItem(PROFILE_STORAGE_KEY) ?? null;
    } catch (err) {
      storedId = null;
    }
    if (storedId) {
      this.profileId = storedId;
      this._updateHeroIdDisplay();
      this._connect();
    } else {
      this._showIdentityOverlay('');
    }
  }

  _connect() {
    if (this.socket) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host || `localhost:${window.location.port || 8080}`;
    const params = [];
    if (this.profileId) {
      params.push(`profile=${encodeURIComponent(this.profileId)}`);
    }
    const wsUrl = `${protocol}://${host}${params.length ? `/?${params.join('&')}` : '/'}`;

    this.messageEl.textContent = 'Connecting...';
    this.messageEl.hidden = false;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      this.socket = socket;
      this.messageEl.hidden = true;
      this._hideIdentityOverlay();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        this.world = data.world;
        this.youId = data.id;
        if (data.profileId) {
          this.profileId = data.profileId;
          this._persistProfileId(data.profileId);
          this._updateHeroIdDisplay();
        }
        this.enemies = new Map();
        if (Array.isArray(data.enemies)) {
          for (const enemy of data.enemies) {
            this.enemies.set(enemy.id, enemy);
          }
        }
        this.localStats = data.you.stats;
        this.localBonuses = data.you.bonuses;
        this.localHealth = { health: data.you.health ?? 100, maxHealth: data.you.maxHealth ?? 100 };
        this.statPanel.data = {
          stats: this.localStats,
          bonuses: this.localBonuses,
          health: this.localHealth.health,
          maxHealth: this.localHealth.maxHealth,
        };
        this.chargeMeter.actionName = 'Idle';
      } else if (data.type === 'state') {
        const map = new Map();
        let me = null;
        for (const p of data.players) {
          map.set(p.id, p);
          if (p.id === this.youId) {
            me = p;
          }
        }
        this.players = map;
  this.effects = data.effects || [];
        const enemyMap = new Map();
        if (Array.isArray(data.enemies)) {
          for (const enemy of data.enemies) {
            enemyMap.set(enemy.id, enemy);
          }
        }
        this.enemies = enemyMap;
  this._processEffects(this.effects);
        if (me) {
          this.localStats = me.stats;
          this.localBonuses = me.bonuses;
          this.localHealth = { health: me.health, maxHealth: me.maxHealth };
          this.statPanel.data = {
            stats: this.localStats,
            bonuses: this.localBonuses,
            health: me.health,
            maxHealth: me.maxHealth,
          };
          const ratio = me.chargeRatio ?? 0;
          if (!this.activeAction) {
            this.chargeMeter.value = ratio;
          }
          if (!this.activeAction) {
            if (me.charging) {
              this.chargeMeter.actionName = ACTION_LABEL[me.actionKind] || 'Charging';
            } else {
              this.chargeMeter.actionName = 'Idle';
            }
          }
        }
      } else if (data.type === 'disconnect') {
        this.players.delete(data.id);
      }
    };

    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
      }
      const nextProfile = this.pendingProfileId;
      this._prepareForReconnect(nextProfile ?? this.profileId);
      this.pointerButtons = 0;
      if (this.activeAction) {
        this.audio.onActionCancel(this.activeAction);
        this.activeAction = null;
        this.chargeMeter.actionName = 'Idle';
        this.chargeMeter.value = 0;
      }
      if (nextProfile !== undefined) {
        this.profileId = nextProfile;
        this.pendingProfileId = undefined;
        this._connect();
      } else {
        this.messageEl.textContent = 'Connection lost. Refresh to retry.';
        this.messageEl.hidden = false;
        if (!this.profileId) {
          this._showIdentityOverlay('');
        }
      }
    };

    socket.onerror = () => {
      this.messageEl.textContent = 'Unable to connect.';
      this.messageEl.hidden = false;
    };
  }

  _loop(timestamp) {
    this._render();
    this._sendInput(timestamp);
    requestAnimationFrame(this._loop);
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    if (!this.world) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const local = this.players.get(this.youId);
    const cameraX = local?.x ?? this.world.width / 2;
    const cameraY = local?.y ?? this.world.height / 2;

    const halfTilesX = width / (2 * this.tileSize);
    const halfTilesY = height / (2 * this.tileSize);

    const startX = Math.max(0, Math.floor(cameraX - halfTilesX - 1));
    const endX = Math.min(this.world.width, Math.ceil(cameraX + halfTilesX + 1));
    const startY = Math.max(0, Math.floor(cameraY - halfTilesY - 1));
    const endY = Math.min(this.world.height, Math.ceil(cameraY + halfTilesY + 1));

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const tile = this.world.tiles[y][x];
        ctx.fillStyle = TILE_STYLE[tile] || '#1e293b';
        const screenX = (x - cameraX) * this.tileSize + width / 2;
        const screenY = (y - cameraY) * this.tileSize + height / 2;
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
      }
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Effects
    for (const effect of this.effects) {
      const offsetX = (effect.x - cameraX) * this.tileSize;
      const offsetY = (effect.y - cameraY) * this.tileSize;
      const radius = effect.range * this.tileSize;
      const alpha = Math.max(0, effect.ttl / 600);
      ctx.beginPath();
      ctx.strokeStyle = effect.type === 'spell' ? `rgba(14, 165, 233, ${alpha})` : effect.type === 'ranged' ? `rgba(249, 115, 22, ${alpha})` : `rgba(220, 38, 38, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enemies
    for (const enemy of this.enemies.values()) {
      const offsetX = (enemy.x - cameraX) * this.tileSize;
      const offsetY = (enemy.y - cameraY) * this.tileSize;
      const style = ENEMY_STYLE[enemy.type] || ENEMY_STYLE.default;
      const radius = (enemy.radius ?? 0.5) * this.tileSize;
      const gradient = ctx.createRadialGradient(offsetX, offsetY, radius * 0.25, offsetX, offsetY, radius);
      gradient.addColorStop(0, style.inner);
      gradient.addColorStop(1, style.outer);
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Enemy health bar
      const hpRatio = enemy.maxHealth ? enemy.health / enemy.maxHealth : 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(offsetX - radius, offsetY + radius + 3, radius * 2, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(offsetX - radius, offsetY + radius + 3, radius * 2 * Math.max(0, Math.min(1, hpRatio)), 4);
    }

    // Players
    for (const player of this.players.values()) {
      const offsetX = (player.x - cameraX) * this.tileSize;
      const offsetY = (player.y - cameraY) * this.tileSize;
      const radius = this.tileSize * 0.35;
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(offsetX, offsetY, radius * 0.2, offsetX, offsetY, radius);
      if (player.id === this.youId) {
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#0ea5e9');
      } else {
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(1, '#ea580c');
      }
      ctx.fillStyle = gradient;
      ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.font = 'bold 10px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText(player.id, offsetX, offsetY - radius - 6);

      // Health bar
      const hpRatio = player.maxHealth ? player.health / player.maxHealth : 0;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(offsetX - radius, offsetY + radius + 4, radius * 2, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(offsetX - radius, offsetY + radius + 4, radius * 2 * Math.max(0, Math.min(1, hpRatio)), 5);
    }

    ctx.restore();

    if (this.activeAction && this.localBonuses) {
      const ratio = Math.max(
        0,
        Math.min(1, (Date.now() - this.actionStart) / (this.localBonuses.maxCharge * 1000))
      );
      this.chargeMeter.value = ratio;
      this.audio.onChargeProgress(this.activeAction, ratio);
    }
  }

  _sendInput(timestamp) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!this.world) return;
    if (timestamp - this.lastInputSent < 50) return;

    const moveX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const moveY = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);

    this.socket.send(
      JSON.stringify({
        type: 'input',
        moveX,
        moveY,
        aimX: this.pointerAim.x,
        aimY: this.pointerAim.y,
      })
    );
    this.lastInputSent = timestamp;
  }

  _handleKeyDown(event) {
    if (event.repeat) return;
    if (event.code === 'KeyN' && event.shiftKey) {
      event.preventDefault();
      this._startNewHero(false);
      return;
    }
    if (event.code === 'KeyM') {
      event.preventDefault();
      this.audio.ensureContext();
      const next = !this.audio.musicEnabled;
      this.audio.setMusicEnabled(next);
      if (this.audioToggle) {
        this.audioToggle.active = next;
      }
      return;
    }
    this.audio.ensureContext();
    if (this.identityOverlay && !this.identityOverlay.hidden) {
      return;
    }
    this.keys.add(event.code);
  }

  _handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  _handlePointerDown(event) {
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.audio.ensureContext();
    this._updatePointerAim(event);
    if (typeof event.buttons === 'number' && event.buttons !== 0) {
      this.pointerButtons = event.buttons;
    } else {
      this.pointerButtons |= this._maskFromButton(event.button);
    }
    const action = this._determineAction(this.pointerButtons);
    if (!action) return;
    if (this.activeAction && this.activeAction !== action) {
      this._cancelAction();
    }
    this._startAction(action);
  }

  _handlePointerUp(event) {
    if (typeof event.buttons === 'number') {
      this.pointerButtons = event.buttons;
    } else {
      this.pointerButtons &= ~this._maskFromButton(event.button);
    }
    const nextAction = this._determineAction(this.pointerButtons);
    if (!nextAction) {
      if (this.activeAction) {
        this._releaseAction();
      }
      return;
    }
    if (this.activeAction !== nextAction) {
      if (this.activeAction) {
        this._releaseAction();
      }
      this._startAction(nextAction);
    }
  }

  _handlePointerMove(event) {
    this._updatePointerAim(event);
  }

  _handlePointerLeave() {
    if (this.activeAction) {
      this._releaseAction();
    }
    this.pointerButtons = 0;
  }

  _handlePointerCancel() {
    this.pointerButtons = 0;
    if (this.activeAction) {
      this._cancelAction();
    }
  }

  _handleMusicToggle(event) {
    const active = Boolean(event?.detail?.active);
    this.audio.ensureContext();
    this.audio.setMusicEnabled(active);
    if (this.audioToggle) {
      this.audioToggle.active = this.audio.musicEnabled;
    }
  }

  _processEffects(effects) {
    if (!effects) return;
    const nextIds = new Set();
    for (const effect of effects) {
      if (!effect?.id) continue;
      nextIds.add(effect.id);
      if (!this.knownEffects.has(effect.id) && this.audio.context) {
        const isLocal = effect.owner === this.youId;
        this.audio.onEffect(effect, isLocal);
      }
    }
    this.knownEffects = nextIds;
  }

  _determineAction(buttonMask) {
    if (!buttonMask) return null;
    const left = (buttonMask & 1) !== 0;
    const right = (buttonMask & 2) !== 0;
    if (left && right) return 'spell';
    if (left) return 'melee';
    if (right) return 'ranged';
    return null;
  }

  _startAction(kind) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.audio.ensureContext();
    this.audio.onActionStart(kind);
    this.activeAction = kind;
    this.actionStart = Date.now();
    this.chargeMeter.actionName = ACTION_LABEL[kind] || 'Charging';
    this.socket.send(
      JSON.stringify({
        type: 'action',
        action: kind,
        phase: 'start',
        aimX: this.pointerAim.x,
        aimY: this.pointerAim.y,
      })
    );
  }

  _releaseAction() {
    if (!this.activeAction) return;
    const kind = this.activeAction;
    const now = Date.now();
    let ratio = 0;
    if (this.localBonuses) {
      const maxDuration = Math.max(0.01, this.localBonuses.maxCharge * 1000);
      ratio = Math.max(0, Math.min(1, (now - this.actionStart) / maxDuration));
    }
    this.audio.onActionRelease(kind, ratio);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.activeAction = null;
      this.chargeMeter.actionName = 'Idle';
      this.chargeMeter.value = 0;
      return;
    }
    this.socket.send(
      JSON.stringify({
        type: 'action',
        action: kind,
        phase: 'release',
      })
    );
    this.activeAction = null;
    this.chargeMeter.actionName = 'Idle';
    this.chargeMeter.value = 0;
  }

  _cancelAction() {
    if (!this.activeAction) return;
    const kind = this.activeAction;
    this.audio.onActionCancel(kind);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.activeAction = null;
      this.chargeMeter.actionName = 'Idle';
      this.chargeMeter.value = 0;
      return;
    }
    this.socket.send(
      JSON.stringify({
        type: 'action',
        action: kind,
        phase: 'cancel',
      })
    );
    this.activeAction = null;
    this.chargeMeter.actionName = 'Idle';
    this.chargeMeter.value = 0;
  }

  _updatePointerAim(event) {
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    const aim = this._normalize({ x: offsetX / this.tileSize, y: offsetY / this.tileSize });
    this.pointerAim = aim;
  }

  _prepareForReconnect(nextProfileId = this.profileId) {
    this.players.clear();
    this.effects = [];
    this.knownEffects.clear();
  this.enemies = new Map();
    this.world = null;
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
    if (this.statPanel) {
      this.statPanel.data = {
        stats: { strength: 0, dexterity: 0, intellect: 0 },
        bonuses: { hitChance: 0, range: 0, maxCharge: 0 },
        health: 0,
        maxHealth: 0,
      };
    }
    this.activeAction = null;
    this.actionStart = 0;
    this.pointerButtons = 0;
    this.chargeMeter.actionName = 'Idle';
    this.chargeMeter.value = 0;
    if (this.heroIdEl) {
      this.heroIdEl.textContent = nextProfileId || '—';
    }
  }

  _showIdentityOverlay(preset = '') {
    if (!this.identityOverlay) return;
    this.identityOverlay.hidden = false;
    if (this.identityInput) {
      this.identityInput.value = preset ?? '';
      this.identityInput.focus();
      this.identityInput.select?.();
    }
  }

  _hideIdentityOverlay() {
    if (!this.identityOverlay) return;
    this.identityOverlay.hidden = true;
  }

  _updateHeroIdDisplay() {
    if (!this.heroIdEl) return;
    this.heroIdEl.textContent = this.profileId || '—';
  }

  _persistProfileId(id) {
    if (!id) return;
    try {
      window.localStorage?.setItem(PROFILE_STORAGE_KEY, id);
    } catch (err) {
      // ignore storage errors (private mode, etc.)
    }
  }

  _clearStoredProfileId() {
    try {
      window.localStorage?.removeItem(PROFILE_STORAGE_KEY);
    } catch (err) {
      // ignore storage errors
    }
  }

  _switchProfile(profileId) {
    const normalized = profileId ? String(profileId).trim() : null;
    this.pendingProfileId = normalized ?? null;
    this._prepareForReconnect(normalized ?? '—');
    this.messageEl.textContent = 'Switching hero...';
    this.messageEl.hidden = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      try {
        this.socket.close();
      } catch (err) {
        // ignore close errors
      }
    } else {
      this.profileId = this.pendingProfileId;
      this.pendingProfileId = undefined;
      this._connect();
    }
  }

  _startNewHero(skipConfirm = false) {
    if (!skipConfirm) {
      const proceed = window.confirm('Start a brand new hero? You can always return later using your saved Hero ID.');
      if (!proceed) return;
    }
    this._clearStoredProfileId();
    this.profileId = null;
    this._switchProfile(null);
  }

  _handleCopyHeroId() {
    if (!this.profileId) {
      this._showIdentityOverlay('');
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(this.profileId).catch(() => {
        window.prompt('Hero ID (copy manually):', this.profileId);
      });
    } else {
      window.prompt('Hero ID (copy manually):', this.profileId);
    }
  }

  _handleNewHeroRequest() {
    this._startNewHero(false);
  }

  _handleUseHeroRequest() {
    this._showIdentityOverlay(this.profileId || '');
  }

  _handleIdentityLoad() {
    if (!this.identityInput) return;
    const value = this.identityInput.value.trim();
    if (!value) {
      this.identityInput.focus();
      return;
    }
    this._hideIdentityOverlay();
    this.profileId = value;
    this._persistProfileId(value);
    this._switchProfile(value);
  }

  _handleIdentityNew() {
    this._hideIdentityOverlay();
    this._startNewHero(true);
  }

  _handleIdentityCancel() {
    if (!this.profileId && !this.socket) {
      return;
    }
    this._hideIdentityOverlay();
  }

  _handleIdentityInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleIdentityLoad();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._handleIdentityCancel();
    }
  }

  _maskFromButton(button) {
    if (button === 0) return 1;
    if (button === 2) return 2;
    if (button === 1) return 4;
    return 0;
  }

  _normalize(vec) {
    const length = Math.hypot(vec.x, vec.y);
    if (!length) return { x: 1, y: 0 };
    return { x: vec.x / length, y: vec.y / length };
  }

  _resizeCanvas() {
    const rect = this.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }
}

customElements.define('game-app', GameApp);
