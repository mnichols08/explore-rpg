const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8180);
const PROFILE_PATH = path.join(__dirname, 'profiles.json');
const PROFILE_SAVE_DELAY = 750;
const TICK_RATE = 20; // updates per second
const WORLD_WIDTH = 160;
const WORLD_HEIGHT = 160;
const WORLD_SEED = 9272025;
const TILE_TYPES = ['water', 'sand', 'grass', 'forest', 'rock'];
const TILE_WALKABLE = new Set(['sand', 'grass', 'forest', 'ember', 'glyph']);
const EFFECT_LIFETIME = 600; // ms
const ENEMY_SPAWN_INTERVAL = 8000;
const ENEMY_MAX_COUNT = 24;
const ENEMY_WANDER_INTERVAL = 1800;
const ENEMY_VARIANTS = [
  {
    type: 'slime',
    health: 55,
    speed: 1.4,
    xp: { melee: 8, ranged: 6, spell: 7 },
    radius: 0.5,
    attack: { type: 'melee', damage: 14, range: 1.65, cooldown: 1400, hitChance: 0.8 },
  },
  {
    type: 'wolf',
    health: 85,
    speed: 2.4,
    xp: { melee: 10, ranged: 8, spell: 9 },
    radius: 0.55,
    attack: { type: 'ranged', damage: 12, range: 6.5, cooldown: 1700, width: 0.55, hitChance: 0.7 },
  },
  {
    type: 'wisp',
    health: 60,
    speed: 2.1,
    xp: { melee: 6, ranged: 8, spell: 12 },
    radius: 0.45,
    attack: { type: 'spell', damage: 16, range: 6.2, cooldown: 2100, splash: 1.45, hitChance: 0.75 },
  },
];
const PLAYER_HIT_RADIUS = 0.45;
const MELEE_CONE_HALF_ANGLE = Math.PI / 3; // 60° frontal swing
const PROJECTILE_HALF_WIDTH = 0.35;
const CHARGE_TIME_BONUS = 0.75;
const CHARGE_RANGE_SCALE = {
  melee: 0.35,
  ranged: 0.5,
  spell: 0.7,
};
const CHAT_LIFETIME_MS = 6000;
const CHAT_MAX_LENGTH = 140;
const ORE_TYPES = [
  { id: 'copper', label: 'Copper', color: '#b87333', yield: 6, value: 4 },
  { id: 'iron', label: 'Iron', color: '#d1d5db', yield: 5, value: 6 },
  { id: 'silver', label: 'Silver', color: '#c0c0c0', yield: 4, value: 9 },
  { id: 'gold', label: 'Gold', color: '#facc15', yield: 3, value: 15 },
];
const ORE_NODE_COUNT = 55;
const ORE_RESPAWN_MS = 120000;
const ORE_NODE_MIN_DISTANCE = 4;
const ORE_NODE_RADIUS = 0.65;
const LOOT_LIFETIME_MS = 90000;
const BANK_POSITION = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
const SAFE_ZONE_RADIUS = 8.5;
const BANK_TRADE_BATCH = 5;
const SAFE_ZONE_HEAL_DURATION_MS = 60000;

const PORTAL_DISTANCE_THRESHOLD = 1.6;
const LEVEL_PORTAL_MIN_DISTANCE = 14;
const LEVEL_SAFEZONE_BUFFER = SAFE_ZONE_RADIUS + 6;

const clients = new Map();
let nextPlayerId = 1;
let effectCounter = 1;
let chatCounter = 1;
let oreNodeCounter = 1;
let lootCounter = 1;

const profileSource = loadProfiles();
const profiles = profileSource.map;
nextPlayerId = Math.max(nextPlayerId, profileSource.nextPlayerId);

const world = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  seed: WORLD_SEED,
  tiles: generateTerrain(WORLD_WIDTH, WORLD_HEIGHT, WORLD_SEED),
  effects: [],
  enemies: [],
  chats: [],
  oreNodes: [],
  loot: [],
  portals: [],
};

world.levels = new Map();

let bankLocation = null;

let profileSaveTimer = null;
let nextEnemyId = 1;
let enemySpawnAccumulator = 0;

process.on('beforeExit', () => {
  saveProfilesSync();
});

process.on('SIGINT', () => {
  saveProfilesSync();
  process.exit(0);
});

process.on('SIGTERM', () => {
  saveProfilesSync();
  process.exit(0);
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return function rand() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    hash = (hash << 5) - hash + code;
    hash |= 0;
  }
  return hash >>> 0;
}

const LEVEL_TEMPLATES = [
  {
    id: 'ember-sanctum',
    name: 'Ember Sanctum',
    difficulty: 'Hard',
    color: '#f97316',
    interior: { x: 10, y: 112, size: 24 },
    floorTile: 'ember',
    accentTile: 'glyph',
    wallTile: 'obsidian',
    hazardTile: 'lava',
    hazardDensity: 0.1,
    entryOffset: { x: 12, y: 3 },
    exitOffset: { x: 12, y: 20 },
    spawnInterval: 4200,
    maxEnemies: 8,
    enemyVariants: [
      {
        type: 'emberling',
        health: 95,
        speed: 2.6,
        xp: { melee: 12, ranged: 12, spell: 14 },
        radius: 0.52,
        attack: { type: 'ranged', damage: 22, range: 6.8, cooldown: 1500, width: 0.65, hitChance: 0.78 },
      },
      {
        type: 'warden',
        health: 180,
        speed: 1.9,
        xp: { melee: 18, ranged: 16, spell: 22 },
        radius: 0.62,
        attack: { type: 'melee', damage: 32, range: 2.4, cooldown: 1700, hitChance: 0.86 },
      },
    ],
  },
  {
    id: 'astral-vault',
    name: 'Astral Vault',
    difficulty: 'Extreme',
    color: '#38bdf8',
    interior: { x: 118, y: 108, size: 22 },
    floorTile: 'glyph',
    accentTile: 'ember',
    wallTile: 'obsidian',
    hazardTile: 'void',
    hazardDensity: 0.08,
    entryOffset: { x: 10, y: 3 },
    exitOffset: { x: 10, y: 18 },
    spawnInterval: 4400,
    maxEnemies: 7,
    enemyVariants: [
      {
        type: 'phantom',
        health: 120,
        speed: 2.9,
        xp: { melee: 14, ranged: 20, spell: 24 },
        radius: 0.5,
        attack: { type: 'ranged', damage: 24, range: 7.5, cooldown: 1400, width: 0.55, hitChance: 0.82 },
      },
      {
        type: 'seer',
        health: 140,
        speed: 2.1,
        xp: { melee: 16, ranged: 18, spell: 26 },
        radius: 0.52,
        attack: { type: 'spell', damage: 28, range: 6.9, cooldown: 1900, splash: 1.8, hitChance: 0.85 },
      },
    ],
  },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function generateTerrain(width, height, seed) {
  const rand = seededRandom(seed);
  const gridSize = 12;
  const grid = [];
  for (let gx = 0; gx <= Math.ceil(width / gridSize); gx += 1) {
    grid[gx] = [];
    for (let gy = 0; gy <= Math.ceil(height / gridSize); gy += 1) {
      grid[gx][gy] = rand();
    }
  }

  const tiles = new Array(height);
  for (let y = 0; y < height; y += 1) {
    tiles[y] = new Array(width);
    for (let x = 0; x < width; x += 1) {
      const gx = Math.floor(x / gridSize);
      const gy = Math.floor(y / gridSize);
      const tx = (x % gridSize) / gridSize;
      const ty = (y % gridSize) / gridSize;

      const v00 = grid[gx][gy];
      const v10 = grid[gx + 1]?.[gy] ?? v00;
      const v01 = grid[gx]?.[gy + 1] ?? v00;
      const v11 = grid[gx + 1]?.[gy + 1] ?? v10;

      const sx = smoothstep(tx);
      const sy = smoothstep(ty);

      const ix0 = lerp(v00, v10, sx);
      const ix1 = lerp(v01, v11, sx);
      const value = lerp(ix0, ix1, sy);

      let tileType;
      if (value < 0.3) tileType = 'water';
      else if (value < 0.42) tileType = 'sand';
      else if (value < 0.68) tileType = 'grass';
      else if (value < 0.85) tileType = 'forest';
      else tileType = 'rock';

      tiles[y][x] = tileType;
    }
  }
  return tiles;
}

function carveLevelTemplate(template) {
  const interior = template.interior;
  const originX = clamp(Math.floor(interior.x), 0, WORLD_WIDTH - 2);
  const originY = clamp(Math.floor(interior.y), 0, WORLD_HEIGHT - 2);
  const size = Math.min(Math.max(10, Math.floor(interior.size)), Math.min(WORLD_WIDTH - originX, WORLD_HEIGHT - originY));
  const rand = seededRandom((WORLD_SEED ^ hashString(template.id) ^ 0x9e3779b9) >>> 0);
  const floorTile = template.floorTile || 'ember';
  const accentTile = template.accentTile || floorTile;
  const wallTile = template.wallTile || 'rock';
  const hazardTile = template.hazardTile || null;
  const hazardDensity = Math.max(0, Math.min(0.45, Number(template.hazardDensity) || 0));

  const entryOffset = {
    x: clamp(Math.floor(template.entryOffset?.x ?? size / 2), 1, size - 2),
    y: clamp(Math.floor(template.entryOffset?.y ?? 2), 1, size - 2),
  };
  const exitOffset = {
    x: clamp(Math.floor(template.exitOffset?.x ?? size / 2), 1, size - 2),
    y: clamp(Math.floor(template.exitOffset?.y ?? size - 3), 1, size - 2),
  };

  const entry = { x: originX + entryOffset.x + 0.5, y: originY + entryOffset.y + 0.5 };
  const exit = { x: originX + exitOffset.x + 0.5, y: originY + exitOffset.y + 0.5 };
  const midX = originX + size / 2;
  const midY = originY + size / 2;

  for (let y = 0; y < size; y += 1) {
    const gy = originY + y;
    if (gy <= 0 || gy >= WORLD_HEIGHT) continue;
    world.tiles[gy] = world.tiles[gy] || [];
    for (let x = 0; x < size; x += 1) {
      const gx = originX + x;
      if (gx <= 0 || gx >= WORLD_WIDTH) continue;
      let tile = floorTile;
      const isBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      if (isBorder) {
        world.tiles[gy][gx] = wallTile;
        continue;
      }

      const cellCenterX = gx + 0.5;
      const cellCenterY = gy + 0.5;
      const radial = Math.hypot(cellCenterX - midX, cellCenterY - midY);
      const crossHighlight = Math.abs(gx - Math.round(midX)) <= 1 || Math.abs(gy - Math.round(midY)) <= 1;
      if (crossHighlight && rand() < 0.85) {
        tile = accentTile;
      } else if (radial > size * 0.32 && rand() < 0.35) {
        tile = accentTile;
      }

      const nearEntry = Math.abs(gx + 0.5 - entry.x) <= 1.5 && Math.abs(gy + 0.5 - entry.y) <= 1.5;
      const nearExit = Math.abs(gx + 0.5 - exit.x) <= 1.5 && Math.abs(gy + 0.5 - exit.y) <= 1.5;

      if (!nearEntry && !nearExit && hazardTile && rand() < hazardDensity) {
        tile = hazardTile;
      }

      world.tiles[gy][gx] = tile;
    }
  }

  // ensure entry/exit corridors are clear
  const entryGX = Math.floor(entry.x);
  const exitGX = Math.floor(exit.x);
  const entryGY = Math.floor(entry.y);
  const exitGY = Math.floor(exit.y);
  if (world.tiles[entryGY]) {
    world.tiles[entryGY][entryGX] = floorTile;
  }
  if (world.tiles[exitGY]) {
    world.tiles[exitGY][exitGX] = floorTile;
  }

  const corridorX = entryGX;
  const corridorStartY = Math.min(entryGY, exitGY);
  const corridorEndY = Math.max(entryGY, exitGY);
  for (let y = corridorStartY; y <= corridorEndY; y += 1) {
    if (!world.tiles[y]) continue;
    world.tiles[y][corridorX] = floorTile;
    const leftX = corridorX - 1;
    const rightX = corridorX + 1;
    if (world.tiles[y][leftX] !== wallTile) {
      world.tiles[y][leftX] = accentTile;
    }
    if (world.tiles[y][rightX] !== wallTile) {
      world.tiles[y][rightX] = accentTile;
    }
  }

  const bounds = {
    minX: originX + 0.5,
    minY: originY + 0.5,
    maxX: originX + size - 0.5,
    maxY: originY + size - 0.5,
  };

  const spawnMargin = 2;
  const spawnBox = {
    minX: originX + spawnMargin + 0.5,
    minY: originY + spawnMargin + 0.5,
    maxX: originX + size - spawnMargin - 0.5,
    maxY: originY + size - spawnMargin - 0.5,
  };

  return {
    id: template.id,
    name: template.name,
    difficulty: template.difficulty,
    color: template.color,
    entry,
    exit,
    bounds,
    spawnBox,
    enemyVariants: template.enemyVariants.slice(),
    spawnInterval: template.spawnInterval ?? 4200,
    maxEnemies: template.maxEnemies ?? 8,
    spawnTimer: 0,
    portalId: null,
    entrance: null,
    accentTile,
    floorTile,
    origin: { x: originX, y: originY },
    size,
  };
}

function levelForCoordinate(x, y) {
  for (const level of world.levels.values()) {
    if (x >= level.bounds.minX && x <= level.bounds.maxX && y >= level.bounds.minY && y <= level.bounds.maxY) {
      return level;
    }
  }
  return null;
}

function isInsideAnyLevel(x, y) {
  return Boolean(levelForCoordinate(x, y));
}

function findPortalLocation(level) {
  const rand = seededRandom((WORLD_SEED ^ hashString(level.id) ^ 0x51a8d9) >>> 0);
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const x = Math.floor(rand() * WORLD_WIDTH) + 0.5;
    const y = Math.floor(rand() * WORLD_HEIGHT) + 0.5;
    if (!walkable(x, y)) continue;
    if (isInsideAnyLevel(x, y)) continue;
    if (bankLocation && Math.hypot(bankLocation.x - x, bankLocation.y - y) < LEVEL_SAFEZONE_BUFFER) continue;
    if (isInSafeZone(x, y)) continue;
    let minPortalDist = Infinity;
    for (const existing of world.portals) {
      const dist = Math.hypot(existing.x - x, existing.y - y);
      if (dist < minPortalDist) minPortalDist = dist;
    }
    if (minPortalDist < LEVEL_PORTAL_MIN_DISTANCE) continue;
    const distToLevel = Math.hypot(level.entry.x - x, level.entry.y - y);
    const score = distToLevel * 0.2 + (bankLocation ? Math.hypot(x - bankLocation.x, y - bankLocation.y) : 0) + rand();
    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  if (!best) {
    const fallback = findSpawn();
    best = { x: fallback.x, y: fallback.y };
  }
  return best;
}

function initializeLevels() {
  if (typeof world.levels.clear === 'function') {
    world.levels.clear();
  }
  world.portals = [];
  for (const template of LEVEL_TEMPLATES) {
    const level = carveLevelTemplate(template);
    world.levels.set(level.id, level);
  }
  for (const level of world.levels.values()) {
    const portal = findPortalLocation(level);
    const gx = Math.floor(portal.x);
    const gy = Math.floor(portal.y);
    if (world.tiles[gy]?.[gx] != null) {
      world.tiles[gy][gx] = level.accentTile || level.floorTile || 'glyph';
    }
    level.portalId = `portal-${level.id}`;
    level.entrance = { x: portal.x, y: portal.y };
    world.portals.push({
      id: level.portalId,
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty,
      color: level.color,
      x: portal.x,
      y: portal.y,
    });
  }
}

function findSpawn() {
  const rand = seededRandom(Date.now() ^ WORLD_SEED);
  for (let attempts = 0; attempts < 500; attempts += 1) {
    const x = Math.floor(rand() * WORLD_WIDTH);
    const y = Math.floor(rand() * WORLD_HEIGHT);
    if (isInsideAnyLevel(x + 0.5, y + 0.5)) continue;
    if (TILE_WALKABLE.has(world.tiles[y][x])) {
      return { x: x + 0.5, y: y + 0.5 };
    }
  }
  return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
}

function findEnemySpawn() {
  const rand = seededRandom((Date.now() + nextEnemyId) ^ (WORLD_SEED >>> 1));
  for (let attempts = 0; attempts < 400; attempts += 1) {
    const x = Math.floor(rand() * WORLD_WIDTH);
    const y = Math.floor(rand() * WORLD_HEIGHT);
    if (!TILE_WALKABLE.has(world.tiles[y][x])) continue;
    if (isInsideAnyLevel(x + 0.5, y + 0.5)) continue;
    if (!isTileFarFromPlayers(x + 0.5, y + 0.5, 6, null)) continue;
    if (isInSafeZone(x + 0.5, y + 0.5)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return findSpawn();
}

function findLevelSpawn(level) {
  if (!level) return findEnemySpawn();
  const seed = Date.now() + nextEnemyId * 7 + hashString(level.id);
  const rand = seededRandom(seed >>> 0);
  const minTileX = clamp(Math.floor(level.spawnBox.minX - 0.5), 1, WORLD_WIDTH - 2);
  const maxTileX = clamp(Math.floor(level.spawnBox.maxX - 0.5), minTileX, WORLD_WIDTH - 2);
  const minTileY = clamp(Math.floor(level.spawnBox.minY - 0.5), 1, WORLD_HEIGHT - 2);
  const maxTileY = clamp(Math.floor(level.spawnBox.maxY - 0.5), minTileY, WORLD_HEIGHT - 2);

  for (let attempts = 0; attempts < 400; attempts += 1) {
    const gx = Math.floor(rand() * (maxTileX - minTileX + 1)) + minTileX;
    const gy = Math.floor(rand() * (maxTileY - minTileY + 1)) + minTileY;
    const x = gx + 0.5;
    const y = gy + 0.5;
    if (!walkable(x, y)) continue;
    if (!isTileFarFromPlayers(x, y, 3, level.id)) continue;
    return { x, y };
  }
  return { x: level.entry.x, y: level.entry.y };
}

function isTileFarFromPlayers(x, y, minDistance, levelId = null) {
  for (const player of clients.values()) {
    if ((player.levelId || null) !== (levelId || null)) continue;
    const dist = Math.hypot(player.x - x, player.y - y);
    if (dist < minDistance) {
      return false;
    }
  }
  return true;
}

function allocateAlias() {
  return `p${nextPlayerId++}`;
}

function createPlayer(connection, requestedProfileId) {
  const timestamp = Date.now();
  const normalizedProfileId = normalizeProfileId(requestedProfileId);
  const profileId = normalizedProfileId ?? generateProfileId();
  let profileData = profiles.get(profileId);
  if (!profileData) {
    profileData = {
      xp: cloneXP(),
      maxHealth: 100,
      lastSeen: timestamp,
      alias: allocateAlias(),
      position: null,
      health: 100,
      inventory: ensureInventoryData(),
      bank: ensureBankData(),
    };
  } else if (!profileData.alias) {
    profileData.alias = allocateAlias();
  }

  profileData.inventory = ensureInventoryData(profileData.inventory);
  profileData.bank = ensureBankData(profileData.bank);

  const alias = profileData.alias;

  const existing = alias ? clients.get(alias) : null;
  if (existing) {
    syncProfile(existing);
    try {
      existing.connection?.socket?.destroy?.();
    } catch (err) {
      // ignore cleanup errors
    }
    clients.delete(existing.id);
    broadcast({ type: 'disconnect', id: existing.id });
  }

  profiles.set(profileId, profileData);

  let spawn;
  if (profileData.position) {
    const px = clamp(Number(profileData.position.x) || 0.5, 0.5, WORLD_WIDTH - 0.5);
    const py = clamp(Number(profileData.position.y) || 0.5, 0.5, WORLD_HEIGHT - 0.5);
    if (walkable(px, py)) {
      spawn = { x: px, y: py };
    }
  }
  if (!spawn) {
    spawn = findSpawn();
  }
  const xp = cloneXP(profileData?.xp);
  const maxHealth = Number(profileData?.maxHealth) || 100;
  let savedHealth = Number(profileData?.health);
  if (!Number.isFinite(savedHealth) || savedHealth <= 0) {
    savedHealth = maxHealth;
  }
  const inventory = ensureInventoryData(profileData?.inventory);
  const bank = ensureBankData(profileData?.bank);
  const player = {
    id: alias,
    profileId,
    connection,
    x: spawn.x,
    y: spawn.y,
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    health: clamp(savedHealth, 1, maxHealth),
    maxHealth,
    lastUpdate: timestamp,
    action: null,
    xp,
    stats: baseStats(),
    bonuses: computeBonuses(baseStats()),
    inventory,
    bank,
    levelId: null,
    levelReturn: null,
  };
  const spawnLevel = levelForCoordinate(spawn.x, spawn.y);
  if (spawnLevel) {
    player.levelId = spawnLevel.id;
    player.levelReturn = spawnLevel.entrance ? { ...spawnLevel.entrance } : null;
  }
  applyStats(player);
  player.health = clamp(savedHealth, 1, player.maxHealth);
  profileData.health = player.health;
  syncProfile(player);
  return player;
}

function createEnemy(options = {}) {
  const level = options.level ?? null;
  const pool = level && Array.isArray(level.enemyVariants) && level.enemyVariants.length ? level.enemyVariants : ENEMY_VARIANTS;
  const variant = pool[nextEnemyId % pool.length];
  const spawn = level ? findLevelSpawn(level) : findEnemySpawn();
  const enemy = {
    id: `e${nextEnemyId++}`,
    type: variant.type,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    wanderTarget: randomDirection(),
    wanderTimer: ENEMY_WANDER_INTERVAL * (0.5 + Math.random()),
    speed: variant.speed,
    health: variant.health,
    maxHealth: variant.health,
    xpReward: variant.xp,
    radius: variant.radius,
    attack: variant.attack ? { ...variant.attack } : null,
    attackCooldown: variant.attack ? variant.attack.cooldown * (0.5 + Math.random() * 0.6) : 0,
    levelId: level ? level.id : null,
  };
  return enemy;
}

function updateEnemies(dt) {
  enemySpawnAccumulator += dt * 1000;
  let overworldCount = 0;
  for (const enemy of world.enemies) {
    if (!enemy.levelId) {
      overworldCount += 1;
    }
  }

  const spawned = [];
  while (enemySpawnAccumulator >= ENEMY_SPAWN_INTERVAL) {
    enemySpawnAccumulator -= ENEMY_SPAWN_INTERVAL;
    if (overworldCount < ENEMY_MAX_COUNT) {
      const enemy = createEnemy();
      spawned.push(enemy);
      overworldCount += 1;
    }
  }

  for (const level of world.levels.values()) {
    level.spawnTimer = (level.spawnTimer || 0) + dt * 1000;
    let levelCount = 0;
    for (const enemy of world.enemies) {
      if (enemy.levelId === level.id) levelCount += 1;
    }
    for (const enemy of spawned) {
      if (enemy.levelId === level.id) levelCount += 1;
    }
    while (levelCount < level.maxEnemies && level.spawnTimer >= level.spawnInterval) {
      level.spawnTimer -= level.spawnInterval;
      const enemy = createEnemy({ level });
      spawned.push(enemy);
      levelCount += 1;
    }
  }

  if (spawned.length) {
    world.enemies.push(...spawned);
  }

  const updated = [];
  for (const enemy of world.enemies) {
    const level = enemy.levelId ? world.levels.get(enemy.levelId) : null;
    enemy.wanderTimer -= dt * 1000;
    if (enemy.wanderTimer <= 0) {
      enemy.wanderTarget = randomDirection();
      enemy.wanderTimer = ENEMY_WANDER_INTERVAL * (0.5 + Math.random());
    }

    let targetPlayer = null;
    let targetDistance = Infinity;
    for (const player of clients.values()) {
      if ((player.levelId || null) !== (enemy.levelId || null)) continue;
      if (playerInSafeZone(player)) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < targetDistance) {
        targetDistance = dist;
        targetPlayer = player;
      }
    }

    let direction = enemy.wanderTarget;
    let speedBoost = 0;
    if (targetPlayer && targetDistance < 10) {
      direction = normalizeVector({ x: targetPlayer.x - enemy.x, y: targetPlayer.y - enemy.y });
      speedBoost = 0.5;
    }

    const speed = enemy.speed + speedBoost;
    const dx = direction.x * speed * dt;
    const dy = direction.y * speed * dt;

    const candidateX = enemy.x + dx;
    const candidateY = enemy.y + dy;
    const insideLevelX = !level || (candidateX >= level.bounds.minX && candidateX <= level.bounds.maxX);
    if (walkable(candidateX, enemy.y) && (level ? insideLevelX : !isInSafeZone(candidateX, enemy.y))) {
      enemy.x = clamp(candidateX, 0.5, world.width - 0.5);
    } else {
      enemy.wanderTarget = randomDirection();
    }
    const insideLevelY = !level || (candidateY >= level.bounds.minY && candidateY <= level.bounds.maxY);
    if (walkable(enemy.x, candidateY) && (level ? insideLevelY : !isInSafeZone(enemy.x, candidateY))) {
      enemy.y = clamp(candidateY, 0.5, world.height - 0.5);
    } else {
      enemy.wanderTarget = randomDirection();
    }

    if (enemy.attack) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt * 1000);
      if (targetPlayer) {
        const attack = enemy.attack;
        const dxTarget = targetPlayer.x - enemy.x;
        const dyTarget = targetPlayer.y - enemy.y;
        const distanceToTarget = Math.hypot(dxTarget, dyTarget);
        let inRange = false;
        if (attack.type === 'melee') {
          inRange = distanceToTarget <= attack.range + PLAYER_HIT_RADIUS + enemy.radius;
        } else {
          inRange = distanceToTarget <= attack.range;
        }
        if (inRange && enemy.attackCooldown <= 0) {
          performEnemyAttack(enemy, attack, targetPlayer);
          enemy.attackCooldown = attack.cooldown * (0.7 + Math.random() * 0.6);
        }
      }
    }

    updated.push(enemy);
  }
  world.enemies = updated;
}

function randomOreType() {
  return ORE_TYPES[Math.floor(Math.random() * ORE_TYPES.length)] ?? ORE_TYPES[0];
}

function getOreType(id) {
  return ORE_TYPES.find((ore) => ore.id === id) ?? ORE_TYPES[0];
}

function findOreSpawn() {
  const rand = seededRandom(Date.now() ^ (WORLD_SEED >>> 2));
  for (let attempts = 0; attempts < 500; attempts += 1) {
    const x = Math.floor(rand() * WORLD_WIDTH) + 0.5;
    const y = Math.floor(rand() * WORLD_HEIGHT) + 0.5;
    if (!walkable(x, y)) continue;
    if (isInSafeZone(x, y)) continue;
    if (isInsideAnyLevel(x, y)) continue;
    let tooClose = false;
    for (const node of world.oreNodes) {
      if (Math.hypot(node.x - x, node.y - y) < ORE_NODE_MIN_DISTANCE) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    return { x, y };
  }
  return findSpawn();
}

function createOreNode() {
  const ore = randomOreType();
  const spawn = findOreSpawn();
  return {
    id: `ore${oreNodeCounter++}`,
    type: ore.id,
    label: ore.label,
    x: spawn.x,
    y: spawn.y,
    amount: ore.yield,
    maxAmount: ore.yield,
    respawnAt: null,
  };
}

function initializeOreNodes() {
  world.oreNodes = [];
  for (let i = 0; i < ORE_NODE_COUNT; i += 1) {
    world.oreNodes.push(createOreNode());
  }
}

function updateOreNodes(now) {
  for (const node of world.oreNodes) {
    if (node.amount > 0) continue;
    if (!node.respawnAt) {
      node.respawnAt = now + ORE_RESPAWN_MS;
      continue;
    }
    if (now >= node.respawnAt) {
      const next = createOreNode();
      node.type = next.type;
      node.label = next.label;
      node.x = next.x;
      node.y = next.y;
      node.amount = next.amount;
      node.maxAmount = next.maxAmount;
      node.respawnAt = null;
    }
  }
}

function gatherNearestOre(player) {
  if (player.levelId) return null;
  let target = null;
  let bestDist = 999;
  for (const node of world.oreNodes) {
    if (node.amount <= 0) continue;
    const dist = Math.hypot(player.x - node.x, player.y - node.y);
    if (dist <= 1.6 && dist < bestDist) {
      target = node;
      bestDist = dist;
    }
  }
  if (!target) return null;
  const ore = getOreType(target.type);
  target.amount = Math.max(0, (target.amount || 0) - 1);
  if (target.amount <= 0) {
    target.respawnAt = Date.now() + ORE_RESPAWN_MS;
  }
  addInventoryItem(player.inventory, target.type, 1);
  return {
    node: target,
    ore,
    amount: 1,
  };
}

function createLootDrop(x, y, { currency = 0, items = {}, owner = null } = {}, levelId = null) {
  const normalizedItems = {};
  for (const [key, value] of Object.entries(items || {})) {
    if (value > 0) normalizedItems[key] = Math.floor(value);
  }
  const totalCurrency = Math.max(0, Math.floor(currency || 0));
  if (!totalCurrency && !Object.keys(normalizedItems).length) return null;
  const drop = {
    id: `loot${lootCounter++}`,
    x,
    y,
    currency: totalCurrency,
    items: normalizedItems,
    owner,
    expiresAt: Date.now() + LOOT_LIFETIME_MS,
    levelId: levelId || null,
  };
  world.loot.push(drop);
  const now = Date.now();
  broadcast({
    type: 'loot-spawn',
    drop: {
      id: drop.id,
      x: drop.x,
      y: drop.y,
      currency: drop.currency,
      items: normalizeItemMap(drop.items),
      owner: drop.owner,
      ttl: Math.max(0, drop.expiresAt - now),
      levelId: drop.levelId,
    },
    removed: false,
  });
  return drop;
}

function updateLoot(now) {
  const remaining = [];
  for (const drop of world.loot) {
    if (drop.expiresAt <= now) continue;
    if (drop.currency <= 0 && (!drop.items || Object.keys(drop.items).length === 0)) {
      continue;
    }
    remaining.push(drop);
  }
  world.loot = remaining;
}

function lootNearestDrop(player) {
  let best = null;
  let bestDist = 999;
  for (const drop of world.loot) {
    if ((drop.levelId || null) !== (player.levelId || null)) continue;
    const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
    if (dist <= 1.6 && dist < bestDist) {
      best = drop;
      bestDist = dist;
    }
  }
  if (!best) return null;
  const collectedItems = {};
  let collectedCurrency = 0;
  if (best.currency > 0) {
    collectedCurrency = best.currency;
    player.inventory.currency = Math.max(0, Math.floor(player.inventory.currency || 0)) + best.currency;
    best.currency = 0;
  }
  for (const [key, qty] of Object.entries(best.items || {})) {
    const amount = Math.max(0, Math.floor(Number(qty) || 0));
    if (amount <= 0) continue;
    addInventoryItem(player.inventory, key, amount);
    collectedItems[key] = (collectedItems[key] || 0) + amount;
  }
  best.items = {};
  best.expiresAt = Date.now() + 1000;
  return {
    drop: best,
    pickup: {
      currency: collectedCurrency,
      items: collectedItems,
    },
  };
}

function dropPlayerInventory(player) {
  const payload = {
    currency: player.inventory.currency,
    items: { ...player.inventory.items },
  };
  if (payload.currency <= 0 && Object.keys(payload.items).length === 0) return;
  createLootDrop(player.x, player.y, payload, player.levelId || null);
  player.inventory.currency = 0;
  player.inventory.items = {};
}

function damageEnemy(enemy, amount) {
  enemy.health = clamp(enemy.health - amount, 0, enemy.maxHealth);
  return enemy.health <= 0;
}

function awardKillXP(player, actionType, enemy) {
  const reward = enemy?.xpReward;
  if (!reward) return;
  if (actionType === 'melee') player.xp.melee += reward.melee ?? 0;
  else if (actionType === 'ranged') player.xp.ranged += reward.ranged ?? 0;
  else if (actionType === 'spell') player.xp.magic += reward.spell ?? 0;
  applyStats(player);
  syncProfile(player);
}

function grantSkillXP(player, actionType, amount) {
  if (!amount || amount <= 0) return false;
  if (actionType === 'melee') player.xp.melee += amount;
  else if (actionType === 'ranged') player.xp.ranged += amount;
  else if (actionType === 'spell') player.xp.magic += amount;
  else return false;
  return true;
}

function performEnemyAttack(enemy, attack, targetPlayer) {
  if (!attack || !targetPlayer) return;
  if (playerInSafeZone(targetPlayer)) return;
  const now = Date.now();
  let aim = normalizeVector({ x: targetPlayer.x - enemy.x, y: targetPlayer.y - enemy.y });
  if (aim.x === 0 && aim.y === 0) {
    aim = randomDirection();
  }

  let effectX = enemy.x;
  let effectY = enemy.y;
  let effectRange = attack.range;
  let effectLength = attack.range;
  let effectAngle = null;
  let effectWidth = null;
  let shape = 'burst';

  if (attack.type === 'melee') {
    shape = 'cone';
    effectAngle = MELEE_CONE_HALF_ANGLE * 2;
  } else if (attack.type === 'ranged') {
    shape = 'beam';
    effectWidth = (attack.width ?? (PROJECTILE_HALF_WIDTH + 0.15)) * 2;
  } else if (attack.type === 'spell') {
    const splash = attack.splash ?? 1.2;
    effectRange = splash;
    effectLength = splash;
    effectX = targetPlayer.x;
    effectY = targetPlayer.y;
  }

  const effect = {
    id: `fx${effectCounter++}`,
    type: attack.type,
    owner: enemy.id,
    x: effectX,
    y: effectY,
    aim,
    range: effectRange,
    length: effectLength,
    angle: effectAngle,
    width: effectWidth,
    shape,
    expiresAt: now + EFFECT_LIFETIME * 0.6,
    levelId: enemy.levelId || null,
  };
  world.effects.push(effect);

  const hitChance = clamp(attack.hitChance ?? 1, 0.05, 1);

  if (attack.type === 'melee') {
    for (const player of clients.values()) {
      if ((player.levelId || null) !== (enemy.levelId || null)) continue;
      if (playerInSafeZone(player)) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist <= attack.range + PLAYER_HIT_RADIUS + enemy.radius && Math.random() <= hitChance) {
        damagePlayer(player, attack.damage);
      }
    }
  } else if (attack.type === 'ranged') {
    const halfWidth = attack.width ?? (PROJECTILE_HALF_WIDTH + 0.15);
    let victim = null;
    let bestTravel = Infinity;
    for (const player of clients.values()) {
      if ((player.levelId || null) !== (enemy.levelId || null)) continue;
      if (playerInSafeZone(player)) continue;
      const travel = projectileTravel(enemy, aim, player, PLAYER_HIT_RADIUS, attack.range, halfWidth);
      if (travel !== null && travel < bestTravel) {
        bestTravel = travel;
        victim = player;
      }
    }
    if (victim && !playerInSafeZone(victim) && Math.random() <= hitChance) {
      damagePlayer(victim, attack.damage);
    }
  } else if (attack.type === 'spell') {
    const splash = attack.splash ?? 1.2;
    for (const player of clients.values()) {
      if ((player.levelId || null) !== (enemy.levelId || null)) continue;
      if (playerInSafeZone(player)) continue;
      const dist = Math.hypot(player.x - effectX, player.y - effectY);
      if (dist <= splash + PLAYER_HIT_RADIUS && Math.random() <= hitChance) {
        damagePlayer(player, attack.damage);
      }
    }
  }
}

function baseStats() {
  return {
    strength: 5,
    dexterity: 5,
    intellect: 5,
  };
}

function computeStatsFromXP(player) {
  const base = 5;
  return {
    strength: base + player.xp.melee / 6,
    dexterity: base + player.xp.ranged / 6,
    intellect: base + player.xp.magic / 6,
  };
}

function computeBonuses(stats) {
  return {
    maxCharge: 1.2 + stats.intellect * 0.1,
    hitChance: 0.5 + stats.dexterity * 0.025,
    range: 2.5 + stats.strength * 0.18,
  };
}

function applyStats(player) {
  player.stats = computeStatsFromXP(player);
  player.bonuses = computeBonuses(player.stats);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeVector(vec) {
  const length = Math.hypot(vec.x, vec.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vec.x / length, y: vec.y / length };
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function resolveBankPosition() {
  const preferX = clamp(BANK_POSITION.x, 2, world.width - 2);
  const preferY = clamp(BANK_POSITION.y, 2, world.height - 2);
  const attempts = 120;
  let best = { x: preferX, y: preferY };
  let bestDist = Infinity;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const angle = (attempt / attempts) * Math.PI * 2;
    const radius = attempt / attempts * 8;
    const x = clamp(Math.round(preferX + Math.cos(angle) * radius), 1, world.width - 2);
    const y = clamp(Math.round(preferY + Math.sin(angle) * radius), 1, world.height - 2);
    if (!walkable(x + 0.5, y + 0.5)) continue;
    const dist = Math.hypot(x + 0.5 - preferX, y + 0.5 - preferY);
    if (dist < bestDist) {
      best = { x: x + 0.5, y: y + 0.5 };
      bestDist = dist;
      if (dist < 1) break;
    }
  }
  return best;
}

function isInSafeZone(x, y) {
  if (!bankLocation) return false;
  const dx = x - bankLocation.x;
  const dy = y - bankLocation.y;
  return dx * dx + dy * dy <= SAFE_ZONE_RADIUS * SAFE_ZONE_RADIUS;
}

function playerInSafeZone(player) {
  if (!player || player.levelId) return false;
  return isInSafeZone(player.x, player.y);
}

function ensureInventoryData(source) {
  const items = {};
  for (const ore of ORE_TYPES) {
    const value = Number(source?.items?.[ore.id]) || 0;
    if (value > 0) items[ore.id] = Math.floor(value);
  }
  return {
    items,
    currency: Math.max(0, Math.floor(Number(source?.currency) || 0)),
  };
}

function ensureBankData(source) {
  const base = ensureInventoryData(source);
  return {
    items: base.items,
    currency: base.currency,
  };
}

function addInventoryItem(inventory, itemId, amount) {
  if (!inventory.items[itemId]) inventory.items[itemId] = 0;
  inventory.items[itemId] += amount;
  if (inventory.items[itemId] <= 0) {
    delete inventory.items[itemId];
  }
}

function normalizeItemMap(source) {
  const items = {};
  for (const [key, value] of Object.entries(source || {})) {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    if (qty > 0) {
      items[key] = qty;
    }
  }
  return items;
}

function serializeInventory(inventory) {
  return {
    currency: Math.max(0, Math.floor(Number(inventory.currency) || 0)),
    items: normalizeItemMap(inventory.items),
  };
}

function transferItems(source, target) {
  const moved = {};
  if (!source?.items || !target?.items) return moved;
  for (const [key, value] of Object.entries(source.items)) {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    if (!amount) continue;
    addInventoryItem(target, key, amount);
    moved[key] = (moved[key] || 0) + amount;
    delete source.items[key];
  }
  return moved;
}

function depositAllToBank(player) {
  const movedItems = transferItems(player.inventory, player.bank);
  const currency = Math.max(0, Math.floor(Number(player.inventory.currency) || 0));
  if (currency > 0) {
    player.bank.currency = Math.max(0, Math.floor(Number(player.bank.currency) || 0)) + currency;
    player.inventory.currency = 0;
  }
  return {
    items: movedItems,
    currency,
    action: 'deposit',
  };
}

function withdrawAllFromBank(player) {
  const movedItems = transferItems(player.bank, player.inventory);
  const currency = Math.max(0, Math.floor(Number(player.bank.currency) || 0));
  if (currency > 0) {
    player.inventory.currency = Math.max(0, Math.floor(Number(player.inventory.currency) || 0)) + currency;
    player.bank.currency = 0;
  }
  return {
    items: movedItems,
    currency,
    action: 'withdraw',
  };
}

function sellInventoryOres(player) {
  const soldItems = {};
  let totalCurrency = 0;
  for (const [key, value] of Object.entries(player.inventory.items || {})) {
    const ore = getOreType(key);
    if (!ore?.value) continue;
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    if (!amount) continue;
    totalCurrency += amount * ore.value;
    soldItems[key] = (soldItems[key] || 0) + amount;
    delete player.inventory.items[key];
  }
  if (totalCurrency > 0) {
    player.inventory.currency = Math.max(0, Math.floor(Number(player.inventory.currency) || 0)) + totalCurrency;
  }
  return {
    items: soldItems,
    currency: totalCurrency,
    action: 'sell',
  };
}

function summarizeItemsCount(items) {
  let total = 0;
  for (const value of Object.values(items || {})) {
    total += Math.max(0, Number(value) || 0);
  }
  return total;
}

function handleBankOperation(player, action) {
  if (!player?.bank || !player?.inventory) {
    return { ok: false, action, message: 'Bank unavailable.' };
  }
  const normalizedAction = action === 'deposit' || action === 'withdraw' || action === 'sell' ? action : null;
  if (!normalizedAction) {
    return { ok: false, action, message: 'Unknown bank action.' };
  }
  if (!playerInSafeZone(player)) {
    return { ok: false, action, message: 'You must stand in the bank safe zone.' };
  }

  let result;
  if (normalizedAction === 'deposit') {
    result = depositAllToBank(player);
  } else if (normalizedAction === 'withdraw') {
    result = withdrawAllFromBank(player);
  } else if (normalizedAction === 'sell') {
    result = sellInventoryOres(player);
  }

  const movedCurrency = Math.max(0, Number(result?.currency) || 0);
  const movedItems = result?.items || {};
  const totalItems = summarizeItemsCount(movedItems);
  const changed = movedCurrency > 0 || totalItems > 0;

  let message;
  if (!changed) {
    if (normalizedAction === 'sell') message = 'No ores available to sell.';
    else if (normalizedAction === 'withdraw') message = 'Your bank is empty.';
    else message = 'Nothing to deposit.';
  } else if (normalizedAction === 'sell') {
    message = `Sold ${totalItems.toLocaleString()} ore for ${movedCurrency.toLocaleString()} coins.`;
  } else if (normalizedAction === 'deposit') {
    message = `Deposited ${totalItems.toLocaleString()} items and ${movedCurrency.toLocaleString()} coins.`;
  } else if (normalizedAction === 'withdraw') {
    message = `Withdrew ${totalItems.toLocaleString()} items and ${movedCurrency.toLocaleString()} coins.`;
  } else {
    message = 'Transaction complete.';
  }

  sendInventoryUpdate(player);

  return {
    ok: changed,
    action: normalizedAction,
    message,
    currency: movedCurrency,
    items: movedItems,
  };
}

function handlePortalEnter(player, portalId) {
  if (!player || !portalId) return;
  const portal = world.portals.find((p) => p.id === portalId);
  if (!portal) return;
  const level = world.levels.get(portal.levelId);
  if (!level) return;
  if (player.levelId && player.levelId !== level.id) return;
  const distance = Math.hypot(player.x - portal.x, player.y - portal.y);
  if (distance > PORTAL_DISTANCE_THRESHOLD) return;
  if (player.levelId === level.id) return;
  player.levelReturn = { x: player.x, y: player.y };
  player.levelId = level.id;
  player.x = level.entry.x;
  player.y = level.entry.y;
  player.move.x = 0;
  player.move.y = 0;
  player.action = null;
  sendTo(player, {
    type: 'portal-event',
    event: 'enter',
    level: {
      id: level.id,
      name: level.name,
      difficulty: level.difficulty,
      color: level.color,
      exit: level.exit,
    },
  });
  syncProfile(player);
}

function handlePortalExit(player) {
  if (!player?.levelId) return;
  const level = world.levels.get(player.levelId);
  if (!level) {
    player.levelId = null;
    player.levelReturn = null;
    return;
  }
  const distance = Math.hypot(player.x - level.exit.x, player.y - level.exit.y);
  if (distance > PORTAL_DISTANCE_THRESHOLD) return;
  let destination = player.levelReturn || level.entrance || findSpawn();
  if (!walkable(destination.x, destination.y)) {
    destination = level.entrance || findSpawn();
  }
  if (!walkable(destination.x, destination.y)) {
    destination = findSpawn();
  }
  player.levelId = null;
  player.levelReturn = null;
  player.x = clamp(destination.x, 0.5, world.width - 0.5);
  player.y = clamp(destination.y + 1.2, 0.5, world.height - 0.5);
  player.move.x = 0;
  player.move.y = 0;
  player.action = null;
  sendTo(player, {
    type: 'portal-event',
    event: 'exit',
    level: {
      id: level.id,
      name: level.name,
    },
  });
  syncProfile(player);
}

function sendInventoryUpdate(player) {
  sendTo(player, {
    type: 'inventory',
    inventory: serializeInventory(player.inventory),
    bank: serializeInventory(player.bank),
  });
  syncProfile(player);
}

function isWithinCone(origin, aim, target, length, cosHalfAngle, targetRadius = 0) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= targetRadius) return true;
  if (distance - targetRadius > length) return false;
  const normalizedDistance = distance || 1;
  const dot = (dx * aim.x + dy * aim.y) / normalizedDistance;
  return dot >= cosHalfAngle;
}

function projectileTravel(origin, aim, target, targetRadius, maxDistance, halfWidth) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const forward = dx * aim.x + dy * aim.y;
  if (forward <= 0) return null;
  if (forward - targetRadius > maxDistance) return null;
  const lateral = Math.abs(dx * aim.y - dy * aim.x);
  if (lateral > halfWidth + targetRadius) return null;
  return forward;
}

function walkable(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) {
    return false;
  }
  return TILE_WALKABLE.has(world.tiles[ty][tx]);
}

if (!bankLocation) {
  bankLocation = resolveBankPosition();
}

initializeLevels();

initializeOreNodes();

function resolveMovement(player, dt) {
  const direction = normalizeVector(player.move);
  const speed = 4 + player.stats.dexterity * 0.12;
  const dx = direction.x * speed * dt;
  const dy = direction.y * speed * dt;
  const candidateX = player.x + dx;
  const candidateY = player.y + dy;

  if (walkable(candidateX, player.y)) {
    player.x = clamp(candidateX, 0.5, world.width - 0.5);
  }
  if (walkable(player.x, candidateY)) {
    player.y = clamp(candidateY, 0.5, world.height - 0.5);
  }
}

function damagePlayer(target, amount) {
  if (playerInSafeZone(target)) return;
  target.health = clamp(target.health - amount, 0, target.maxHealth);
  const profile = target.profileId ? profiles.get(target.profileId) : null;
  if (profile) {
    profile.health = clamp(target.health, 0, target.maxHealth);
  }
  if (target.health <= 0) {
    dropPlayerInventory(target);
    sendInventoryUpdate(target);
    target.levelId = null;
    target.levelReturn = null;
    const spawn = findSpawn();
    target.x = spawn.x;
    target.y = spawn.y;
    target.health = target.maxHealth;
    if (profile) {
      profile.position = { x: target.x, y: target.y };
      profile.health = target.health;
    }
  }
}

function resolveAction(player, actionType, aimVector, chargeSeconds) {
  const bonuses = player.bonuses;
  const baseChargeCap = clamp(bonuses.maxCharge, 0.5, 5);
  const maxChargeTime = baseChargeCap + CHARGE_TIME_BONUS;
  const charge = clamp(chargeSeconds, 0.1, maxChargeTime);
  const potency = charge;

  let aim = aimVector && typeof aimVector.x === 'number' && typeof aimVector.y === 'number'
    ? normalizeVector(aimVector)
    : normalizeVector(player.aim);
  if (aim.x === 0 && aim.y === 0) {
    aim = { x: 1, y: 0 };
  }

  let xpGain = 0;
  let damageBase = 12;
  let range = bonuses.range;

  if (actionType === 'melee') {
    xpGain = 6 * potency;
    damageBase = 18 * potency * (player.stats.strength / 10);
    range *= 0.6;
  } else if (actionType === 'ranged') {
    xpGain = 5 * potency;
    damageBase = 16 * potency * (player.stats.dexterity / 10);
    range *= 1.1;
  } else if (actionType === 'spell') {
    xpGain = 7 * potency;
    damageBase = 14 * potency * (player.stats.intellect / 10);
    range *= 1.4;
  } else {
    return;
  }

  const rangeBonusFactor = CHARGE_RANGE_SCALE[actionType] ?? 0.4;
  const normalizedCharge = Math.max(0, charge - 0.1);
  range *= 1 + normalizedCharge * rangeBonusFactor;

  const effect = {
    id: `fx${effectCounter++}`,
    type: actionType,
    owner: player.id,
    x: player.x,
    y: player.y,
    aim,
    range,
    length: range,
    angle: actionType === 'melee' ? MELEE_CONE_HALF_ANGLE * 2 : null,
    width: actionType === 'ranged' ? (PROJECTILE_HALF_WIDTH + potency * 0.2) * 2 : null,
    shape: actionType === 'melee' ? 'cone' : actionType === 'ranged' ? 'beam' : 'burst',
    expiresAt: Date.now() + EFFECT_LIFETIME,
    levelId: player.levelId || null,
  };
  world.effects.push(effect);

  const hitChance = clamp(player.bonuses.hitChance, 0.1, 0.95);
  const coneCosHalfAngle = Math.cos(MELEE_CONE_HALF_ANGLE);
  const projectileHalfWidth = PROJECTILE_HALF_WIDTH + potency * 0.2;

  if (actionType === 'ranged') {
    let candidatePlayer = null;
    let candidateDistance = Infinity;
    for (const target of clients.values()) {
      if (target.id === player.id) continue;
      if ((target.levelId || null) !== (player.levelId || null)) continue;
      if (playerInSafeZone(target)) continue;
      const travel = projectileTravel(player, aim, target, PLAYER_HIT_RADIUS, range, projectileHalfWidth);
      if (travel !== null && travel < candidateDistance) {
        candidateDistance = travel;
        candidatePlayer = target;
      }
    }
    if (candidatePlayer && Math.random() <= hitChance) {
      if (!playerInSafeZone(candidatePlayer)) {
        damagePlayer(candidatePlayer, damageBase);
      }
    }
  } else {
    for (const target of clients.values()) {
      if (target.id === player.id) continue;
      if ((target.levelId || null) !== (player.levelId || null)) continue;
      if (playerInSafeZone(target)) continue;
      let within = false;
      if (actionType === 'melee') {
        within = isWithinCone(player, aim, target, range + PLAYER_HIT_RADIUS, coneCosHalfAngle, PLAYER_HIT_RADIUS);
      } else {
        const distance = Math.hypot(target.x - player.x, target.y - player.y);
        within = distance <= range + PLAYER_HIT_RADIUS;
      }
      if (!within) continue;
      if (Math.random() <= hitChance) {
        damagePlayer(target, damageBase);
      }
    }
  }

  if (world.enemies.length) {
    let xpApplied = false;
    const playerLevelId = player.levelId || null;
    if (actionType === 'ranged') {
      let candidateEnemy = null;
      let bestDistance = Infinity;
      for (const enemy of world.enemies) {
        if ((enemy.levelId || null) !== playerLevelId) continue;
        const travel = projectileTravel(player, aim, enemy, enemy.radius ?? 0, range, projectileHalfWidth);
        if (travel !== null && travel < bestDistance) {
          bestDistance = travel;
          candidateEnemy = enemy;
        }
      }

      const survivors = [];
      for (const enemy of world.enemies) {
        if ((enemy.levelId || null) !== playerLevelId) {
          survivors.push(enemy);
          continue;
        }
        if (enemy === candidateEnemy && Math.random() <= hitChance) {
          if (!xpApplied && grantSkillXP(player, actionType, xpGain)) {
            xpApplied = true;
          }
          const killed = damageEnemy(enemy, damageBase);
          if (killed) {
            awardKillXP(player, actionType, enemy);
            continue;
          }
        }
        survivors.push(enemy);
      }
      world.enemies = survivors;
    } else {
      const survivors = [];
      for (const enemy of world.enemies) {
        if ((enemy.levelId || null) !== playerLevelId) {
          survivors.push(enemy);
          continue;
        }
        let within = false;
        if (actionType === 'melee') {
          within = isWithinCone(player, aim, enemy, range + enemy.radius, coneCosHalfAngle, enemy.radius);
        } else {
          const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          within = distance <= range + enemy.radius;
        }
        if (within && Math.random() <= hitChance) {
          if (!xpApplied && grantSkillXP(player, actionType, xpGain)) {
            xpApplied = true;
          }
          const killed = damageEnemy(enemy, damageBase);
          if (killed) {
            awardKillXP(player, actionType, enemy);
            continue;
          }
        }
        survivors.push(enemy);
      }
      world.enemies = survivors;
    }

    if (xpApplied) {
      applyStats(player);
      syncProfile(player);
    }
  }
}

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients.values()) {
    client.connection.send(payload);
  }
}

function sendTo(player, message) {
  player.connection.send(JSON.stringify(message));
}

function gameTick(now, dt) {
  updateEnemies(dt);
  updateOreNodes(now);
  updateLoot(now);
  for (const player of clients.values()) {
    resolveMovement(player, dt);
    if (playerInSafeZone(player) && player.health < player.maxHealth) {
      const healRatePerMs = player.maxHealth / SAFE_ZONE_HEAL_DURATION_MS;
      const healAmount = healRatePerMs * dt * 1000;
      player.health = clamp(player.health + healAmount, 0, player.maxHealth);
    }
  if (player.action && player.action.startedAt && player.action.kind) {
      const baseChargeCap = clamp(player.bonuses?.maxCharge ?? 0.5, 0.5, 5);
      const maxChargeTime = baseChargeCap + CHARGE_TIME_BONUS;
      const elapsedMs = now - player.action.startedAt;
      if (elapsedMs >= maxChargeTime * 1000) {
        const elapsedSeconds = Math.min(elapsedMs / 1000, maxChargeTime);
        resolveAction(player, player.action.kind, player.action.aim, elapsedSeconds);
        player.action = null;
      }
    }
    if (player.profileId) {
      const profile = profiles.get(player.profileId);
      if (profile) {
        profile.position = {
          x: clamp(player.x, 0.5, world.width - 0.5),
          y: clamp(player.y, 0.5, world.height - 0.5),
        };
        profile.health = clamp(player.health, 0, player.maxHealth);
      }
    }
  }

  const activeEffects = [];
  for (const effect of world.effects) {
    if (effect.expiresAt > now) {
      activeEffects.push(effect);
    }
  }
  world.effects = activeEffects;

  const activeChats = [];
  for (const chat of world.chats) {
    if (chat.expiresAt > now) {
      activeChats.push(chat);
    }
  }
  world.chats = activeChats;

  const snapshot = {
    type: 'state',
    players: Array.from(clients.values()).map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      health: player.health,
      maxHealth: player.maxHealth,
      stats: player.stats,
      bonuses: player.bonuses,
      charging: player.action ? true : false,
      actionKind: player.action?.kind ?? null,
      chargeRatio: player.action
        ? clamp((now - player.action.startedAt) / ((player.bonuses.maxCharge + CHARGE_TIME_BONUS) * 1000), 0, 1)
        : 0,
      levelId: player.levelId || null,
    })),
    effects: world.effects.map((effect) => ({
      id: effect.id,
      type: effect.type,
      x: effect.x,
      y: effect.y,
      range: effect.range,
      length: effect.length ?? effect.range,
      angle: effect.angle ?? null,
      width: effect.width ?? null,
      shape: effect.shape ?? null,
      aim: effect.aim ?? { x: 1, y: 0 },
      owner: effect.owner,
      ttl: Math.max(0, effect.expiresAt - now),
      levelId: effect.levelId || null,
    })),
    enemies: world.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      radius: enemy.radius,
      levelId: enemy.levelId || null,
    })),
    chats: world.chats.map((chat) => ({
      id: chat.id,
      owner: chat.owner,
      text: chat.text,
      ttl: Math.max(0, chat.expiresAt - now),
      levelId: chat.levelId || null,
    })),
    oreNodes: world.oreNodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      x: node.x,
      y: node.y,
      amount: node.amount,
      maxAmount: node.maxAmount,
      respawnIn: node.respawnAt ? Math.max(0, node.respawnAt - now) : null,
    })),
    loot: world.loot.map((drop) => ({
      id: drop.id,
      x: drop.x,
      y: drop.y,
      currency: drop.currency,
      items: normalizeItemMap(drop.items),
      owner: drop.owner,
      ttl: Math.max(0, drop.expiresAt - now),
      levelId: drop.levelId || null,
    })),
    bank: bankLocation
      ? {
          x: bankLocation.x,
          y: bankLocation.y,
          radius: SAFE_ZONE_RADIUS,
        }
      : null,
    portals: world.portals.map((portal) => ({
      id: portal.id,
      levelId: portal.levelId,
      name: portal.name,
      difficulty: portal.difficulty,
      color: portal.color,
      x: portal.x,
      y: portal.y,
    })),
  };

  broadcast(snapshot);
}

function handleMessage(player, message) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch (err) {
    return;
  }

  if (payload.type === 'input') {
    const { moveX, moveY, aimX, aimY } = payload;
    player.move.x = clamp(moveX ?? 0, -1, 1);
    player.move.y = clamp(moveY ?? 0, -1, 1);
    const aim = normalizeVector({ x: aimX ?? player.aim.x, y: aimY ?? player.aim.y });
    if (!Number.isNaN(aim.x) && !Number.isNaN(aim.y)) {
      player.aim = aim;
    }
  } else if (payload.type === 'action') {
    if (payload.phase === 'start') {
      const aim = normalizeVector({ x: payload.aimX ?? player.aim.x, y: payload.aimY ?? player.aim.y });
      player.action = {
        kind: payload.action,
        startedAt: Date.now(),
        aim,
      };
    } else if (payload.phase === 'cancel') {
      player.action = null;
    } else if (payload.phase === 'release' && player.action) {
      const duration = (Date.now() - player.action.startedAt) / 1000;
      resolveAction(player, player.action.kind, player.action.aim, duration);
      player.action = null;
    }
  } else if (payload.type === 'chat') {
    if (typeof payload.message !== 'string') return;
    let message = payload.message.trim();
    if (!message) return;
    if (message.length > CHAT_MAX_LENGTH) {
      message = message.slice(0, CHAT_MAX_LENGTH);
    }
    const chat = {
      id: `chat${chatCounter++}`,
      owner: player.id,
      text: message,
      expiresAt: Date.now() + CHAT_LIFETIME_MS,
      levelId: player.levelId || null,
    };
    world.chats.push(chat);
    if (world.chats.length > 40) {
      world.chats.splice(0, world.chats.length - 40);
    }
    broadcast({
      type: 'chat',
      chat: {
        id: chat.id,
        owner: chat.owner,
        text: chat.text,
        ttl: CHAT_LIFETIME_MS,
        levelId: chat.levelId || null,
      },
    });
  } else if (payload.type === 'gather') {
    const result = gatherNearestOre(player);
    if (!result) return;
    const now = Date.now();
    sendInventoryUpdate(player);
    broadcast({
      type: 'ore-update',
      node: {
        id: result.node.id,
        type: result.node.type,
        label: result.node.label,
        x: result.node.x,
        y: result.node.y,
        amount: result.node.amount,
        maxAmount: result.node.maxAmount,
        respawnIn: result.node.respawnAt ? Math.max(0, result.node.respawnAt - now) : null,
      },
      gatheredBy: player.id,
      ore: {
        id: result.ore.id,
        label: result.ore.label,
        amount: result.amount,
      },
    });
    sendTo(player, {
      type: 'gathered',
      ore: {
        id: result.ore.id,
        label: result.ore.label,
        amount: result.amount,
      },
    });
  } else if (payload.type === 'loot') {
    const result = lootNearestDrop(player);
    if (!result) return;
    sendInventoryUpdate(player);
    const now = Date.now();
    broadcast({
      type: 'loot-update',
      drop: {
        id: result.drop.id,
        x: result.drop.x,
        y: result.drop.y,
        currency: result.drop.currency,
        items: normalizeItemMap(result.drop.items),
        ttl: Math.max(0, result.drop.expiresAt - now),
        levelId: result.drop.levelId || null,
      },
      collectedBy: player.id,
      pickup: result.pickup,
      removed: result.drop.currency <= 0 && Object.keys(result.drop.items).length === 0,
    });
    sendTo(player, {
      type: 'loot-collected',
      pickup: result.pickup,
    });
  } else if (payload.type === 'bank') {
    const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : '';
    const result = handleBankOperation(player, action);
    if (result) {
      sendTo(player, { type: 'bank-result', ...result });
    }
  } else if (payload.type === 'portal') {
    const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : '';
    if (action === 'enter') {
      const portalId = typeof payload.portalId === 'string' ? payload.portalId : null;
      handlePortalEnter(player, portalId);
    } else if (action === 'exit') {
      handlePortalExit(player);
    }
  }
}

class WebSocketConnection {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.alive = true;
    this.onMessage = () => {};
    this.onClose = () => {};

    socket.on('data', (chunk) => this._handleData(chunk));
    socket.on('close', () => this._handleClose());
    socket.on('end', () => this._handleClose());
    socket.on('error', () => this._handleClose());
  }

  send(payload) {
    if (!this.alive) return;
    const frame = encodeFrame(Buffer.from(payload));
    this.socket.write(frame);
  }

  _handleClose() {
    if (!this.alive) return;
    this.alive = false;
    this.onClose();
  }

  _handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const frame = decodeFrame(this.buffer);
      if (!frame) break;
      this.buffer = this.buffer.slice(frame.lengthConsumed);
      if (frame.opcode === 0x8) {
        this.socket.end();
        this._handleClose();
        break;
      } else if (frame.opcode === 0x9) {
        this.socket.write(encodeFrame(frame.payload, 0xA));
      } else if (frame.opcode === 0x1) {
        this.onMessage(frame.payload.toString('utf8'));
      }
    }
  }
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;
  const first = buffer[0];
  const opcode = first & 0x0f;
  const second = buffer[1];
  const masked = (second & 0x80) === 0x80;
  let payloadLen = second & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLen = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLen === 127) {
    if (buffer.length < offset + 8) return null;
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    if (high !== 0) throw new Error('Frame too large');
    payloadLen = low;
    offset += 8;
  }

  const maskKey = masked ? buffer.slice(offset, offset + 4) : null;
  if (masked && buffer.length < offset + 4) return null;
  if (masked) offset += 4;

  if (buffer.length < offset + payloadLen) return null;

  let payload = buffer.slice(offset, offset + payloadLen);
  if (masked) {
    const unmasked = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i += 1) {
      unmasked[i] = payload[i] ^ maskKey[i % 4];
    }
    payload = unmasked;
  }

  return {
    opcode,
    payload,
    lengthConsumed: offset + payloadLen,
  };
}

function encodeFrame(payload, opcode = 0x1) {
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(length, 6);
  }
  return Buffer.concat([header, payload]);
}

function serveStatic(req, res) {
  const parsedUrl = url.parse(req.url);
  const publicRoot = path.resolve(path.join(__dirname, '..', 'public'));
  const pathname = parsedUrl.pathname || '/';
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const sanitized = path
    .normalize(relative)
    .replace(/^([.][.][/\\])+/g, '')
    .replace(/^[/\\]+/, '');
  const resolved = path.resolve(path.join(publicRoot, sanitized));
  if (!resolved.startsWith(publicRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(resolved).pipe(res);
  });
}

function cloneXP(source) {
  return {
    melee: Number(source?.melee) || 0,
    ranged: Number(source?.ranged) || 0,
    magic: Number(source?.magic) || 0,
  };
}

function normalizeProfileId(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(trimmed)) return null;
  return trimmed;
}

function generateProfileId() {
  let id = null;
  do {
    if (typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID().replace(/-/g, '');
    } else {
      id = crypto.randomBytes(12).toString('hex');
    }
  } while (profiles.has(id));
  return id;
}

function syncProfile(player) {
  if (!player?.profileId) return;
  profiles.set(player.profileId, {
    xp: cloneXP(player.xp),
    maxHealth: Number(player.maxHealth) || 100,
    lastSeen: Date.now(),
    alias: player.id,
    position: {
      x: clamp(player.x, 0.5, world.width - 0.5),
      y: clamp(player.y, 0.5, world.height - 0.5),
    },
    health: clamp(player.health, 0, player.maxHealth),
    inventory: {
      currency: Math.max(0, Math.floor(player.inventory.currency || 0)),
      items: Object.fromEntries(
        Object.entries(player.inventory.items || {}).filter(([, value]) => value > 0).map(([key, value]) => [key, Math.floor(value)])
      ),
    },
    bank: {
      currency: Math.max(0, Math.floor(player.bank.currency || 0)),
      items: Object.fromEntries(
        Object.entries(player.bank.items || {}).filter(([, value]) => value > 0).map(([key, value]) => [key, Math.floor(value)])
      ),
    },
  });
  queueSaveProfiles();
}

function loadProfiles() {
  try {
    const raw = fs.readFileSync(PROFILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const map = new Map();
    let maxAliasIndex = 0;
    for (const [key, value] of Object.entries(parsed)) {
      const normalized = normalizeProfileId(key);
      if (!normalized) continue;
      const alias = typeof value?.alias === 'string' ? value.alias : null;
      if (alias) {
        const match = /^p(\d+)$/.exec(alias);
        if (match) {
          maxAliasIndex = Math.max(maxAliasIndex, Number(match[1]));
        }
      }
      const pos = value?.position;
      let position = null;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        const px = clamp(pos.x, 0.5, WORLD_WIDTH - 0.5);
        const py = clamp(pos.y, 0.5, WORLD_HEIGHT - 0.5);
        position = { x: px, y: py };
      }
      const maxHealth = Number(value?.maxHealth) || 100;
      let health = Number(value?.health);
      if (!Number.isFinite(health) || health <= 0) {
        health = maxHealth;
      } else {
        health = clamp(health, 1, maxHealth);
      }
      const inventory = ensureInventoryData(value?.inventory);
      const bank = ensureBankData(value?.bank);
      map.set(normalized, {
        xp: cloneXP(value?.xp),
        maxHealth,
        lastSeen: Number(value?.lastSeen) || Date.now(),
        alias,
        position,
        health,
        inventory,
        bank,
      });
    }
    return { map, nextPlayerId: maxAliasIndex + 1 };
  } catch (err) {
    return { map: new Map(), nextPlayerId: 1 };
  }
}

function serializeProfiles() {
  const output = {};
  for (const [key, value] of profiles.entries()) {
    output[key] = {
      xp: cloneXP(value?.xp),
      maxHealth: Number(value?.maxHealth) || 100,
      lastSeen: Number(value?.lastSeen) || Date.now(),
      alias: typeof value?.alias === 'string' ? value.alias : undefined,
      position:
        value?.position && typeof value.position.x === 'number' && typeof value.position.y === 'number'
          ? { x: Number(value.position.x), y: Number(value.position.y) }
          : undefined,
      health:
        typeof value?.health === 'number'
          ? clamp(Number(value.health), 0, Number(value?.maxHealth) || 100)
          : undefined,
      inventory: value?.inventory
        ? {
            currency: Math.max(0, Math.floor(Number(value.inventory.currency) || 0)),
            items: Object.fromEntries(
              Object.entries(value.inventory.items || {})
                .filter(([, qty]) => Number(qty) > 0)
                .map(([key, qty]) => [key, Math.floor(Number(qty))])
            ),
          }
        : undefined,
      bank: value?.bank
        ? {
            currency: Math.max(0, Math.floor(Number(value.bank.currency) || 0)),
            items: Object.fromEntries(
              Object.entries(value.bank.items || {})
                .filter(([, qty]) => Number(qty) > 0)
                .map(([key, qty]) => [key, Math.floor(Number(qty))])
            ),
          }
        : undefined,
    };
  }
  return JSON.stringify(output, null, 2);
}

function serializeLevel(level) {
  if (!level || !level.id) return null;
  const toPoint = (point) => {
    if (!point) return null;
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  };
  const toBounds = (bounds) => {
    if (!bounds) return null;
    const minX = Number(bounds.minX);
    const minY = Number(bounds.minY);
    const maxX = Number(bounds.maxX);
    const maxY = Number(bounds.maxY);
    if ([minX, minY, maxX, maxY].some((value) => !Number.isFinite(value))) return null;
    return { minX, minY, maxX, maxY };
  };
  return {
    id: level.id,
    name: level.name,
    difficulty: level.difficulty,
    color: level.color,
    origin: toPoint(level.origin),
    size: Math.max(0, Number(level.size) || 0),
    bounds: toBounds(level.bounds),
    entry: toPoint(level.entry),
    exit: toPoint(level.exit),
    entrance: toPoint(level.entrance),
  };
}

function queueSaveProfiles() {
  if (profileSaveTimer) return;
  profileSaveTimer = setTimeout(() => {
    profileSaveTimer = null;
    saveProfiles();
  }, PROFILE_SAVE_DELAY);
}

function saveProfiles() {
  if (!profiles.size) {
    fs.promises
      .writeFile(PROFILE_PATH, '{}', 'utf8')
      .catch(() => {});
    return;
  }
  const payload = serializeProfiles();
  fs.writeFile(PROFILE_PATH, payload, 'utf8', (err) => {
    if (err) {
      console.error('Failed to persist hero profiles:', err);
    }
  });
}

function saveProfilesSync() {
  if (profileSaveTimer) {
    clearTimeout(profileSaveTimer);
    profileSaveTimer = null;
  }
  try {
    if (!profiles.size) {
      fs.writeFileSync(PROFILE_PATH, '{}', 'utf8');
      return;
    }
    fs.writeFileSync(PROFILE_PATH, serializeProfiles(), 'utf8');
  } catch (err) {
    console.error('Failed to synchronously persist hero profiles:', err);
  }
}

function startServer() {
  const server = http.createServer(serveStatic);

  server.on('upgrade', (req, socket) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const parsedUpgradeUrl = url.parse(req.url, true);
    const requestedProfileId = normalizeProfileId(parsedUpgradeUrl.query?.profile);
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ];
    socket.write(headers.join('\r\n'));

    const connection = new WebSocketConnection(socket);
    const player = createPlayer(connection, requestedProfileId);
    clients.set(player.id, player);

    connection.onMessage = (message) => handleMessage(player, message);
    connection.onClose = () => {
      clients.delete(player.id);
      syncProfile(player);
      broadcast({ type: 'disconnect', id: player.id });
    };

    const youLevel = player.levelId ? world.levels.get(player.levelId) : null;

    sendTo(player, {
      type: 'init',
      id: player.id,
      profileId: player.profileId,
      world: {
        width: world.width,
        height: world.height,
        tiles: world.tiles,
      },
      enemies: world.enemies.map((enemy) => ({
        id: enemy.id,
        type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        radius: enemy.radius,
      })),
      chats: world.chats.map((chat) => ({
        id: chat.id,
        owner: chat.owner,
        text: chat.text,
        ttl: Math.max(0, chat.expiresAt - Date.now()),
      })),
      oreNodes: world.oreNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        x: node.x,
        y: node.y,
        amount: node.amount,
        maxAmount: node.maxAmount,
        respawnIn: node.respawnAt ? Math.max(0, node.respawnAt - Date.now()) : null,
      })),
      loot: world.loot.map((drop) => ({
        id: drop.id,
        x: drop.x,
        y: drop.y,
        currency: drop.currency,
        items: normalizeItemMap(drop.items),
        owner: drop.owner,
        ttl: Math.max(0, drop.expiresAt - Date.now()),
        levelId: drop.levelId || null,
      })),
      bank: bankLocation
        ? {
            x: bankLocation.x,
            y: bankLocation.y,
            radius: SAFE_ZONE_RADIUS,
          }
        : null,
      portals: world.portals.map((portal) => ({
        id: portal.id,
        levelId: portal.levelId,
        name: portal.name,
        difficulty: portal.difficulty,
        color: portal.color,
        x: portal.x,
        y: portal.y,
      })),
      levels: Array.from(world.levels.values())
        .map((level) => serializeLevel(level))
        .filter(Boolean),
      you: {
        x: player.x,
        y: player.y,
        stats: player.stats,
        bonuses: player.bonuses,
        health: player.health,
        maxHealth: player.maxHealth,
        levelId: player.levelId || null,
        levelExit: youLevel?.exit ?? null,
        levelName: youLevel?.name ?? null,
        levelDifficulty: youLevel?.difficulty ?? null,
        levelColor: youLevel?.color ?? null,
      },
    });
    sendInventoryUpdate(player);

    broadcast({
      type: 'join',
      player: {
        id: player.id,
        x: player.x,
        y: player.y,
        stats: player.stats,
      },
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    gameTick(now, dt);
  }, 1000 / TICK_RATE);

  return server;
}

function runSelfTest() {
  console.log('Running self-test...');
  const mapA = generateTerrain(32, 32, 1234);
  const mapB = generateTerrain(32, 32, 1234);
  const mapC = generateTerrain(32, 32, 5678);

  const consistent = mapA.every((row, y) => row.every((value, x) => value === mapB[y][x]));
  if (!consistent) {
    console.error('Deterministic terrain failed');
    process.exit(1);
  }

  const diversity = mapA.some((row, y) => row.some((value, x) => value !== mapC[y][x]));
  if (!diversity) {
    console.error('Different seeds should produce different maps');
    process.exit(1);
  }

  const stubConnection = { send() {} };
  const firstPlayer = createPlayer(stubConnection, null);
  const profileId = firstPlayer.profileId;
  const { x: expectedX, y: expectedY } = findSpawn();
  firstPlayer.x = expectedX;
  firstPlayer.y = expectedY;
  const profileRecord = profiles.get(profileId);
  if (profileRecord) {
    profileRecord.position = { x: expectedX, y: expectedY };
    profileRecord.health = 42;
  }
  const secondPlayer = createPlayer(stubConnection, profileId);
  const distance = Math.hypot(secondPlayer.x - expectedX, secondPlayer.y - expectedY);
  if (distance > 0.01) {
    console.error('Profile position was not restored on reconnect');
    process.exit(1);
  }
  if (Math.abs(secondPlayer.health - 42) > 0.01) {
    console.error('Profile health was not restored on reconnect');
    process.exit(1);
  }
  profiles.delete(profileId);
  clients.delete(firstPlayer.id);
  clients.delete(secondPlayer.id);
  if (profileSaveTimer) {
    clearTimeout(profileSaveTimer);
    profileSaveTimer = null;
  }

  console.log('Self-test passed.');
}

if (require.main === module) {
  const selfTest = process.argv.some((arg) => arg === '--self-test' || arg === '--test');
  if (selfTest) {
    runSelfTest();
  } else {
    startServer();
  }
}

module.exports = {
  startServer,
  generateTerrain,
  runSelfTest,
};
