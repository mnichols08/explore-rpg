require('dotenv').config();
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8180);
const PROFILE_PATH = path.join(__dirname, 'profiles.json');
const PROFILE_SAVE_DELAY = 750;
const MONGO_URL = process.env.MONGO_URL || '';
const MONGO_DB_NAME = process.env.MONGO_DB || 'explore_rpg';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'profiles';
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
const PROJECTILE_HALF_WIDTH = 0.18;
const SPELL_PROJECTILE_HALF_WIDTH = 0.45;
const CHARGE_TIME_BONUS = 0.75;
const MELEE_BASE_RANGE = 2.05;
const RANGED_BASE_RANGE = 3.8;
const RANGED_RANGE_PER_DEX = 0.14;
const SPELL_BASE_RANGE = 3.7;
const SPELL_RANGE_PER_INT = 0.22;
const CHARGE_RANGE_SCALE = {
  melee: 0,
  ranged: 0.5,
  spell: 0,
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
const WILDERNESS_HEAL_SCALE = 1 / 1000;
const MOMENTUM_MAX_STACKS = 5;
const MOMENTUM_DURATION_MS = 15000;
const MOMENTUM_DAMAGE_SCALE = 0.1;
const MOMENTUM_SPEED_SCALE = 0.06;
const MOMENTUM_XP_SCALE = 0.08;

const HERO_NAME_MIN_LENGTH = 3;
const HERO_NAME_MAX_LENGTH = 24;
const PVP_DISABLE_COOLDOWN_MS = 60_000;

let MongoClientModule = null;
let mongoClient = null;
let profilesCollection = null;
let usingMongo = false;

let profiles = new Map();
let initializationPromise = null;
let initialized = false;
const pendingMongoWrites = new Set();
let shuttingDown = false;

function logMongoStatus(message) {
  if (!message) return;
  console.log(`[mongo] ${message}`);
}

const PORTAL_DISTANCE_THRESHOLD = 1.6;
const LEVEL_PORTAL_MIN_DISTANCE = 14;
const LEVEL_SAFEZONE_BUFFER = SAFE_ZONE_RADIUS + 6;

const EQUIPMENT_SLOTS = ['melee', 'ranged', 'spell', 'armor'];

const STARTING_EQUIPMENT = {
  melee: 'melee-fist',
  ranged: 'ranged-rock',
  spell: 'spell-air',
  armor: 'armor-cloth',
};

const GEAR_PROGRESSIONS = {
  melee: ['melee-fist', 'melee-stick', 'melee-sword'],
  ranged: ['ranged-rock', 'ranged-sling', 'ranged-bow'],
  spell: ['spell-air', 'spell-fire', 'spell-ice', 'spell-lightning'],
  armor: ['armor-cloth', 'armor-leather', 'armor-mail'],
};

const ITEM_DEFINITIONS = {
  'melee-fist': {
    id: 'melee-fist',
    slot: 'melee',
    label: 'Bare Fists',
    description: 'Just your hands—close range and light impact.',
    damageMultiplier: 0.85,
    rangeBonus: -0.4,
    knockback: 0.4,
  },
  'melee-stick': {
    id: 'melee-stick',
    slot: 'melee',
    label: 'Forager Stick',
    description: 'A sturdy branch that extends your reach a little.',
    damageMultiplier: 1.1,
    rangeBonus: 0.2,
    knockback: 0.6,
  },
  'melee-sword': {
    id: 'melee-sword',
    slot: 'melee',
    label: 'Steel Sword',
    description: 'Reliable steel with solid reach and cutting power.',
    damageMultiplier: 1.35,
    rangeBonus: 0.55,
    knockback: 0.8,
  },
  'ranged-rock': {
    id: 'ranged-rock',
    slot: 'ranged',
    label: 'Throwing Rocks',
    description: 'Improvised stones; heavy arc and slow travel.',
    damageMultiplier: 0.9,
    rangeBonus: -0.3,
    projectile: {
      travelMs: 900,
  widthScale: 0.85,
      variant: 'ranged-rock',
    },
  },
  'ranged-sling': {
    id: 'ranged-sling',
    slot: 'ranged',
    label: 'Simple Sling',
    description: 'Woven cord that launches pebbles faster.',
    damageMultiplier: 1.05,
    rangeBonus: 0.2,
    hitBonus: 0.05,
    projectile: {
      travelMs: 700,
  widthScale: 0.8,
      variant: 'ranged-sling',
    },
  },
  'ranged-bow': {
    id: 'ranged-bow',
    slot: 'ranged',
    label: 'Hunter Bow',
    description: 'A balanced bow with quick arrows and reach.',
    damageMultiplier: 1.3,
    rangeBonus: 0.8,
    hitBonus: 0.08,
    projectile: {
      travelMs: 520,
  widthScale: 0.72,
      variant: 'ranged-bow',
    },
  },
  'spell-air': {
    id: 'spell-air',
    slot: 'spell',
    label: 'Zephyr Primer',
    description: 'A gust that shoves enemies away without harm.',
    damageMultiplier: 0,
    rangeBonus: 0.3,
    chargeBonus: 0.1,
    spell: {
      effect: 'knockback',
      magnitude: 2.4,
      variant: 'spell-air',
      travelMs: 640,
    },
  },
  'spell-fire': {
    id: 'spell-fire',
    slot: 'spell',
    label: 'Ember Grimoire',
    description: 'Ignites foes with an intense bolt of flame.',
    damageMultiplier: 1.25,
    rangeBonus: 0.2,
    chargeBonus: 0.15,
    spell: {
      effect: 'burn',
      burnDamage: 8,
      variant: 'spell-fire',
      travelMs: 560,
    },
  },
  'spell-ice': {
    id: 'spell-ice',
    slot: 'spell',
    label: 'Frost Codex',
    description: 'Crystallizes the air to slow anything it touches.',
    damageMultiplier: 0.95,
    rangeBonus: 0.5,
    spell: {
      effect: 'slow',
      slowFactor: 0.55,
      durationMs: 2800,
      variant: 'spell-ice',
      travelMs: 720,
    },
  },
  'spell-lightning': {
    id: 'spell-lightning',
    slot: 'spell',
    label: 'Storm Scroll',
    description: 'A crackling bolt that can arc between foes.',
    damageMultiplier: 1.45,
    rangeBonus: 0.3,
    chargeBonus: 0.2,
    spell: {
      effect: 'chain',
      chainRadius: 2.6,
      chainScale: 0.55,
      variant: 'spell-lightning',
      travelMs: 480,
    },
  },
  'armor-cloth': {
    id: 'armor-cloth',
    slot: 'armor',
    label: 'Traveler Cloth',
    description: 'Light wraps with no additional protection.',
    maxHealthBonus: 0,
  },
  'armor-leather': {
    id: 'armor-leather',
    slot: 'armor',
    label: 'Scout Leathers',
    description: 'Layered hide that blunts incoming strikes.',
    maxHealthBonus: 25,
  },
  'armor-mail': {
    id: 'armor-mail',
    slot: 'armor',
    label: 'Tempered Mail',
    description: 'Interlocking plates for stalwart defenders.',
    maxHealthBonus: 60,
  },
};

const STARTING_GEAR_SET = new Set(Object.values(STARTING_EQUIPMENT));

const clients = new Map();
let nextPlayerId = 1;
let effectCounter = 1;
let chatCounter = 1;
let oreNodeCounter = 1;
let lootCounter = 1;

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

async function handleExit(shouldExitProcess, exitCode = 0) {
  if (shuttingDown) {
    if (shouldExitProcess) {
      process.exit(exitCode);
    }
    return;
  }
  shuttingDown = true;
  try {
    await flushPersistence();
  } catch (err) {
    console.error('Error while flushing persistence during shutdown:', err);
  } finally {
    if (shouldExitProcess) {
      process.exit(exitCode);
    }
  }
}

process.on('beforeExit', async () => {
  await handleExit(false);
});
process.on('SIGINT', () => handleExit(true));
process.on('SIGTERM', () => handleExit(true));

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
  const isNewProfile = !profileData;
  const isFirstProfile = isNewProfile && profiles.size === 0;

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
      name: null,
      tutorialCompleted: false,
      admin: isFirstProfile,
      banned: false,
      createdAt: timestamp,
    };
  } else {
    profileData.xp = cloneXP(profileData.xp);
    profileData.maxHealth = Number(profileData.maxHealth) || 100;
    profileData.lastSeen = timestamp;
    if (!profileData.alias) {
      profileData.alias = allocateAlias();
    }
    profileData.name = normalizeHeroName(profileData.name);
    profileData.tutorialCompleted = Boolean(profileData.tutorialCompleted);
    profileData.admin = Boolean(profileData.admin);
    profileData.banned = Boolean(profileData.banned);
    const createdAt = Number(profileData.createdAt);
    profileData.createdAt = Number.isFinite(createdAt) && createdAt > 0 ? createdAt : timestamp;
  }

  profileData.inventory = ensureInventoryData(profileData.inventory);
  profileData.bank = ensureBankData(profileData.bank);

  if (profileData.banned) {
    profiles.set(profileId, profileData);
    return { error: 'banned', profileId, profileData };
  }

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

  let spawn = null;
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
  const baseMaxHealth = Number(profileData?.maxHealth) || 100;
  let savedHealth = Number(profileData?.health);
  if (!Number.isFinite(savedHealth) || savedHealth <= 0) {
    savedHealth = baseMaxHealth;
  }
  const inventory = ensureInventoryData(profileData?.inventory);
  const bank = ensureBankData(profileData?.bank);
  const gear = ensureGearData(profileData?.gear);
  const equipment = ensureEquipmentData(profileData?.equipment, gear);
  const player = {
    id: alias,
    profileId,
    connection,
    x: spawn.x,
    y: spawn.y,
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    health: clamp(savedHealth, 1, baseMaxHealth),
    maxHealth: baseMaxHealth,
    baseMaxHealth,
    lastUpdate: timestamp,
    action: null,
    xp,
    stats: baseStats(),
    bonuses: {},
    inventory,
    bank,
    gear,
    equipment,
    levelId: null,
    levelReturn: null,
    momentum: createMomentumState(),
  };

  player.profileMeta = {
    name: profileData.name || null,
    tutorialCompleted: Boolean(profileData.tutorialCompleted),
    isAdmin: Boolean(profileData.admin),
    banned: Boolean(profileData.banned),
    createdAt: profileData.createdAt,
    pvpOptIn: Boolean(profileData.pvpOptIn),
    pvpCooldownUntil: Number(profileData.pvpCooldownUntil) || 0,
    pvpLastCombatAt: Number(profileData.pvpLastCombatAt) || 0,
  };

  const spawnLevel = levelForCoordinate(spawn.x, spawn.y);
  if (spawnLevel) {
    player.levelId = spawnLevel.id;
    player.levelReturn = spawnLevel.entrance ? { ...spawnLevel.entrance } : null;
  }
  applyStats(player);
  player.health = clamp(savedHealth, 1, player.maxHealth);
  profileData.health = player.health;
  profileData.maxHealth = player.baseMaxHealth;
  profileData.name = player.profileMeta.name;
  profileData.tutorialCompleted = player.profileMeta.tutorialCompleted;
  profileData.admin = player.profileMeta.isAdmin;
  profileData.banned = player.profileMeta.banned;
  profileData.pvpOptIn = player.profileMeta.pvpOptIn;
  profileData.pvpCooldownUntil = player.profileMeta.pvpCooldownUntil;
  profileData.pvpLastCombatAt = player.profileMeta.pvpLastCombatAt;
  profileData.lastSeen = timestamp;
  syncProfile(player);

  return { player, profileId, profileData };
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
    status: { slowUntil: 0, slowFactor: 1 },
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

    if (!enemy.status) {
      enemy.status = { slowUntil: 0, slowFactor: 1 };
    }
    const now = Date.now();
    const slowActive = enemy.status.slowUntil && enemy.status.slowUntil > now;
    if (!slowActive) {
      enemy.status.slowFactor = 1;
    }
    const slowFactor = slowActive ? clamp(enemy.status.slowFactor || 1, 0.15, 1) : 1;

    const speed = enemy.speed * slowFactor + speedBoost;
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
  const collectedGear = {};
  let collectedCurrency = 0;
  if (best.currency > 0) {
    collectedCurrency = best.currency;
    player.inventory.currency = Math.max(0, Math.floor(player.inventory.currency || 0)) + best.currency;
    best.currency = 0;
  }
  for (const [key, qty] of Object.entries(best.items || {})) {
    const amount = Math.max(0, Math.floor(Number(qty) || 0));
    if (amount <= 0) continue;
    if (typeof key === 'string' && key.startsWith('gear:')) {
      const gearId = key.slice(5);
      let gained = 0;
      for (let i = 0; i < amount; i += 1) {
        if (unlockGear(player, gearId, { autoEquip: true, silent: true })) {
          gained += 1;
        }
      }
      if (gained > 0) {
        collectedGear[gearId] = (collectedGear[gearId] || 0) + gained;
      }
    } else {
      addInventoryItem(player.inventory, key, amount);
      collectedItems[key] = (collectedItems[key] || 0) + amount;
    }
  }
  best.items = {};
  best.expiresAt = Date.now() + 1000;
  return {
    drop: best,
    pickup: {
      currency: collectedCurrency,
      items: collectedItems,
      gear: collectedGear,
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

function rollEnemyLoot(enemy, killer) {
  const loot = {
    currency: 0,
    items: {},
  };
  const healthValue = Math.max(enemy.maxHealth || 0, 30);
  loot.currency = Math.max(0, Math.floor(4 + Math.random() * (healthValue * 0.18)));
  if (Math.random() < 0.28) {
    const ore = randomOreType();
    loot.items[ore.id] = (loot.items[ore.id] || 0) + 1;
  }
  if (killer) {
    const candidates = [];
    for (const slot of EQUIPMENT_SLOTS) {
      const nextId = nextLockedGearId(killer, slot);
      if (nextId) candidates.push({ slot, id: nextId });
    }
    if (candidates.length) {
      const baseChance = 0.35;
      const bonus = Math.min(0.2, candidates.length * 0.06);
      if (Math.random() < baseChance + bonus) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        loot.items[`gear:${pick.id}`] = 1;
      }
    }
  }
  if (loot.currency <= 0 && Object.keys(loot.items).length === 0) {
    return null;
  }
  return loot;
}

function handleEnemyDeath(enemy, killer) {
  const loot = rollEnemyLoot(enemy, killer);
  if (loot) {
    createLootDrop(enemy.x, enemy.y, loot, enemy.levelId || null);
  }
}

function awardKillXP(player, actionType, enemy) {
  const reward = enemy?.xpReward;
  if (!reward) return;
  const now = Date.now();
  const momentum = ensureMomentum(player);
  const stacks = momentum.stacks || 0;
  const multiplier = 1 + stacks * MOMENTUM_XP_SCALE;
  const scaleXP = (base) => {
    if (!base) return 0;
    const scaled = Math.round(base * multiplier);
    return Math.max(base, scaled);
  };

  if (actionType === 'melee') {
    player.xp.melee += scaleXP(reward.melee ?? 0);
  } else if (actionType === 'ranged') {
    player.xp.ranged += scaleXP(reward.ranged ?? 0);
  } else if (actionType === 'spell') {
    player.xp.magic += scaleXP(reward.spell ?? 0);
  } else {
    return;
  }

  applyStats(player);
  gainMomentum(player, now);
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
  } else if (attack.type === 'ranged' || attack.type === 'spell') {
    shape = 'projectile';
    const splashRadius = attack.splash != null ? Math.max(0.2, attack.splash * 0.5) : null;
    const baseHalfWidth = attack.width ?? (attack.type === 'spell'
      ? Math.max(SPELL_PROJECTILE_HALF_WIDTH, splashRadius ?? (SPELL_PROJECTILE_HALF_WIDTH + 0.05))
  : PROJECTILE_HALF_WIDTH + 0.05);
    effectWidth = baseHalfWidth * 2;
  }

  const effectLifetime = EFFECT_LIFETIME * 0.6;

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
    lifetime: effectLifetime,
    expiresAt: now + effectLifetime,
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
  } else if (attack.type === 'ranged' || attack.type === 'spell') {
    const splashRadius = attack.splash != null ? Math.max(0.2, attack.splash * 0.5) : null;
    const halfWidth = attack.width ?? (attack.type === 'spell'
      ? Math.max(SPELL_PROJECTILE_HALF_WIDTH, splashRadius ?? (SPELL_PROJECTILE_HALF_WIDTH + 0.05))
  : PROJECTILE_HALF_WIDTH + 0.05);
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

function computeBonuses(player) {
  const stats = player?.stats || baseStats();
  const melee = getEquippedItem(player, 'melee');
  const ranged = getEquippedItem(player, 'ranged');
  const spell = getEquippedItem(player, 'spell');
  const armor = getEquippedItem(player, 'armor');
  return {
    maxCharge: 1.2 + stats.intellect * 0.1 + (spell?.chargeBonus ?? 0),
    hitChance: 0.5 + stats.dexterity * 0.025 + (ranged?.hitBonus ?? 0),
    meleeRange: MELEE_BASE_RANGE + (melee?.rangeBonus ?? 0),
    projectileRange: RANGED_BASE_RANGE + stats.dexterity * RANGED_RANGE_PER_DEX + (ranged?.rangeBonus ?? 0),
    spellRange: SPELL_BASE_RANGE + stats.intellect * SPELL_RANGE_PER_INT + (spell?.rangeBonus ?? 0),
    armorBonus: armor?.maxHealthBonus ?? 0,
  };
}

function applyStats(player) {
  player.stats = computeStatsFromXP(player);
  player.bonuses = computeBonuses(player);
  applyArmorBonus(player);
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

function getSafeZoneLocation() {
  if (!bankLocation) {
    bankLocation = resolveBankPosition();
  }
  return bankLocation || { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
}

function teleportPlayerToSafeZone(player) {
  if (!player) return null;
  const safe = getSafeZoneLocation();
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * Math.max(0, SAFE_ZONE_RADIUS - 1.2);
  let x = safe.x + Math.cos(angle) * radius;
  let y = safe.y + Math.sin(angle) * radius;
  if (!walkable(x, y)) {
    x = safe.x;
    y = safe.y;
  }
  player.levelId = null;
  player.levelReturn = null;
  player.x = clamp(x, 0.5, WORLD_WIDTH - 0.5);
  player.y = clamp(y, 0.5, WORLD_HEIGHT - 0.5);
  player.move.x = 0;
  player.move.y = 0;
  player.action = null;
  player.health = player.maxHealth;
  return { x: player.x, y: player.y };
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

function getItemDefinition(id) {
  if (!id) return null;
  return ITEM_DEFINITIONS[id] || null;
}

function getProgressionForSlot(slot) {
  if (!slot) return [];
  return GEAR_PROGRESSIONS[slot] || [];
}

function ensureGearData(source) {
  const owned = new Set();
  if (Array.isArray(source)) {
    for (const id of source) {
      if (typeof id === 'string') owned.add(id);
    }
  } else if (source && typeof source === 'object') {
    if (Array.isArray(source.owned)) {
      for (const id of source.owned) {
        if (typeof id === 'string') owned.add(id);
      }
    } else {
      for (const key of Object.keys(source)) {
        if (typeof key === 'string') owned.add(key);
      }
    }
  }
  for (const id of STARTING_GEAR_SET) {
    owned.add(id);
  }
  const normalized = new Set();
  for (const id of owned) {
    const def = getItemDefinition(id);
    if (def) normalized.add(def.id);
  }
  return {
    owned: normalized,
  };
}

function ensureGear(player) {
  if (!player.gear || !(player.gear.owned instanceof Set)) {
    player.gear = ensureGearData(player.gear);
  }
  return player.gear;
}

function ensureEquipmentData(source, gear) {
  const equipment = {};
  const owned = gear?.owned instanceof Set ? gear.owned : ensureGearData(gear).owned;
  for (const slot of EQUIPMENT_SLOTS) {
    const requested = typeof source?.[slot] === 'string' ? source[slot] : null;
    const def = requested ? getItemDefinition(requested) : null;
    if (def && def.slot === slot && owned.has(def.id)) {
      equipment[slot] = def.id;
    } else {
      const fallback = getItemDefinition(STARTING_EQUIPMENT[slot]);
      equipment[slot] = fallback ? fallback.id : null;
    }
  }
  return equipment;
}

function ensureEquipment(player) {
  const gear = ensureGear(player);
  if (!player.equipment) {
    player.equipment = ensureEquipmentData(null, gear);
  } else {
    player.equipment = ensureEquipmentData(player.equipment, gear);
  }
  return player.equipment;
}

function serializeGear(gear) {
  const owned = gear?.owned instanceof Set ? Array.from(gear.owned) : [];
  owned.sort();
  return {
    owned,
  };
}

function serializeEquipment(equipment) {
  const normalized = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const value = typeof equipment?.[slot] === 'string' ? equipment[slot] : null;
    const def = value ? getItemDefinition(value) : null;
    normalized[slot] = def ? def.id : STARTING_EQUIPMENT[slot];
  }
  return normalized;
}

function getEquippedItem(player, slot) {
  const equipment = ensureEquipment(player);
  const id = equipment?.[slot];
  const def = id ? getItemDefinition(id) : null;
  if (def && def.slot === slot) return def;
  return getItemDefinition(STARTING_EQUIPMENT[slot]);
}

function applyArmorBonus(player) {
  const armor = getEquippedItem(player, 'armor');
  const armorBonus = armor?.maxHealthBonus ?? 0;
  const base = Number(player.baseMaxHealth || player.maxHealth || 100) || 100;
  player.maxHealth = Math.max(40, base + armorBonus);
  player.health = clamp(player.health, 0, player.maxHealth);
}

function canOccupyPosition(x, y, levelId = null) {
  if (!walkable(x, y)) return false;
  if (!levelId) return true;
  const level = world.levels.get(levelId);
  if (!level) return true;
  return (
    x >= level.bounds.minX &&
    x <= level.bounds.maxX &&
    y >= level.bounds.minY &&
    y <= level.bounds.maxY
  );
}

function applyKnockbackEntity(entity, magnitude, aim, levelId = null) {
  if (!entity || !aim || magnitude <= 0) return false;
  const steps = Math.max(1, Math.ceil(magnitude * 3));
  const stepX = (aim.x || 0) * (magnitude / steps);
  const stepY = (aim.y || 0) * (magnitude / steps);
  let moved = false;
  for (let i = 0; i < steps; i += 1) {
    const nextX = clamp(entity.x + stepX, 0.5, world.width - 0.5);
    const nextY = clamp(entity.y + stepY, 0.5, world.height - 0.5);
    if (!canOccupyPosition(nextX, nextY, levelId)) break;
    entity.x = nextX;
    entity.y = nextY;
    moved = true;
  }
  return moved;
}

function applyEnemySlow(enemy, factor, durationMs) {
  if (!enemy) return;
  const now = Date.now();
  const magnitude = clamp(Number(factor) || 0.5, 0.15, 1);
  const duration = Math.max(300, Number(durationMs) || 2000);
  if (!enemy.status) {
    enemy.status = { slowUntil: 0, slowFactor: 1 };
  }
  if (!enemy.status.slowUntil || enemy.status.slowUntil < now) {
    enemy.status.slowFactor = magnitude;
  } else {
    enemy.status.slowFactor = Math.min(enemy.status.slowFactor, magnitude);
  }
  enemy.status.slowUntil = now + duration;
}

function applySpellImpact(player, spellItem, enemy, damageAmount, aim) {
  if (!enemy) return false;
  const config = spellItem?.spell || {};
  const effectType = config.effect || null;
  let killed = false;
  if (effectType === 'knockback') {
    if (config.magnitude) {
      applyKnockbackEntity(enemy, config.magnitude, aim, enemy.levelId || null);
    }
    if (damageAmount > 0) {
      killed = damageEnemy(enemy, damageAmount);
    }
  } else if (effectType === 'burn') {
    const total = damageAmount + Math.max(0, config.burnDamage || 0);
    killed = damageEnemy(enemy, total);
  } else if (effectType === 'slow') {
    applyEnemySlow(enemy, config.slowFactor ?? 0.5, config.durationMs ?? 2400);
    if (damageAmount > 0) {
      killed = damageEnemy(enemy, damageAmount);
    }
  } else if (effectType === 'chain') {
    killed = damageEnemy(enemy, damageAmount);
    if (!killed) {
      const radius = Math.max(0.5, Number(config.chainRadius) || 2.5);
      const scale = clamp(Number(config.chainScale) || 0.5, 0.1, 1);
      const playerLevel = player.levelId || null;
      let secondary = null;
      let bestDist = Infinity;
      for (const other of world.enemies) {
        if (other === enemy) continue;
        if ((other.levelId || null) !== playerLevel) continue;
        const dist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
        if (dist <= radius && dist < bestDist) {
          bestDist = dist;
          secondary = other;
        }
      }
      if (secondary) {
        const chainDamage = damageAmount * scale;
        const chainKilled = damageEnemy(secondary, chainDamage);
        if (chainKilled) {
          awardKillXP(player, 'spell', secondary);
          handleEnemyDeath(secondary, player);
        }
      }
    }
  } else {
    if (damageAmount > 0) {
      killed = damageEnemy(enemy, damageAmount);
    }
  }
  return killed;
}

function nextLockedGearId(player, slot) {
  const progression = getProgressionForSlot(slot);
  if (!progression.length) return null;
  const gear = ensureGear(player);
  for (const id of progression) {
    if (!gear.owned.has(id)) return id;
  }
  return null;
}

function unlockGear(player, gearId, { autoEquip = true, silent = false } = {}) {
  const def = getItemDefinition(gearId);
  if (!def) return false;
  const gear = ensureGear(player);
  if (gear.owned.has(def.id)) return false;
  gear.owned.add(def.id);
  if (autoEquip) {
    const current = ensureEquipment(player)[def.slot];
    if (!current || current === STARTING_EQUIPMENT[def.slot]) {
      equipItem(player, def.slot, def.id, false, true);
    }
  }
  if (!silent) {
    sendInventoryUpdate(player);
  } else {
    syncProfile(player);
  }
  return true;
}

function equipItem(player, slot, itemId, broadcastUpdate = true, suppressMessage = false) {
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    return { ok: false, message: 'Unknown equipment slot.' };
  }
  const def = getItemDefinition(itemId);
  if (!def || def.slot !== slot) {
    return { ok: false, message: 'That item cannot go in that slot.' };
  }
  const gear = ensureGear(player);
  if (!gear.owned.has(def.id)) {
    return { ok: false, message: 'You have not unlocked that item yet.' };
  }
  const equipment = ensureEquipment(player);
  if (equipment[slot] === def.id) {
    return { ok: true, slot, itemId: def.id, message: suppressMessage ? undefined : 'Already equipped.' };
  }
  equipment[slot] = def.id;
  applyStats(player);
  if (broadcastUpdate) {
    sendInventoryUpdate(player);
  } else {
    syncProfile(player);
  }
  return { ok: true, slot, itemId: def.id };
}

function createMomentumState() {
  return {
    stacks: 0,
    expiresAt: 0,
    peak: 0,
    lastGainAt: 0,
  };
}

function ensureMomentum(player) {
  if (!player.momentum) {
    player.momentum = createMomentumState();
  }
  return player.momentum;
}

function resetMomentum(player) {
  const momentum = ensureMomentum(player);
  momentum.stacks = 0;
  momentum.expiresAt = 0;
  momentum.lastGainAt = 0;
  return momentum;
}

function gainMomentum(player, now = Date.now()) {
  const momentum = ensureMomentum(player);
  if (momentum.stacks > 0 && momentum.expiresAt > now) {
    momentum.stacks = Math.min(MOMENTUM_MAX_STACKS, momentum.stacks + 1);
  } else {
    momentum.stacks = 1;
  }
  momentum.expiresAt = now + MOMENTUM_DURATION_MS;
  momentum.lastGainAt = now;
  momentum.peak = Math.max(momentum.peak || 0, momentum.stacks);
  return momentum;
}

function decayMomentum(player, now) {
  const momentum = player?.momentum;
  if (!momentum) return false;
  const current = now ?? Date.now();
  if (momentum.stacks > 0 && momentum.expiresAt && momentum.expiresAt <= current) {
    momentum.stacks = 0;
    momentum.expiresAt = 0;
    momentum.lastGainAt = 0;
    return true;
  }
  return false;
}

function getMomentumStacks(player, now) {
  const momentum = player?.momentum;
  if (!momentum) return 0;
  const current = now ?? Date.now();
  if (momentum.stacks > 0 && momentum.expiresAt && momentum.expiresAt <= current) {
    momentum.stacks = 0;
    momentum.expiresAt = 0;
    momentum.lastGainAt = 0;
    return 0;
  }
  return momentum.stacks || 0;
}

function serializeMomentum(player, now) {
  const momentum = player?.momentum;
  const stacks = momentum?.stacks > 0 ? momentum.stacks : 0;
  const current = now ?? Date.now();
  const remaining = stacks > 0 && momentum?.expiresAt ? Math.max(0, momentum.expiresAt - current) : 0;
  return {
    stacks,
    remaining,
    duration: MOMENTUM_DURATION_MS,
    bonus: {
      damage: stacks * MOMENTUM_DAMAGE_SCALE,
      speed: stacks * MOMENTUM_SPEED_SCALE,
      xp: stacks * MOMENTUM_XP_SCALE,
    },
    peak: Math.max(momentum?.peak || 0, stacks),
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
    gear: serializeGear(player.gear),
    equipment: serializeEquipment(player.equipment),
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
  const stacks = ensureMomentum(player).stacks || 0;
  const speedMultiplier = 1 + stacks * MOMENTUM_SPEED_SCALE;
  const speed = (4 + player.stats.dexterity * 0.12) * speedMultiplier;
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
    resetMomentum(target);
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

function isPvpEnabled(player) {
  return Boolean(player?.profileMeta?.pvpOptIn);
}

function canEngageInPvp(attacker, target) {
  if (!attacker || !target) return false;
  if (attacker === target) return false;
  if (!attacker.profileMeta || !target.profileMeta) return false;
  if (!isPvpEnabled(attacker) || !isPvpEnabled(target)) return false;
  return true;
}

function recordPvpEngagement(player) {
  if (!player) return;
  const now = Date.now();
  if (!player.profileMeta) {
    player.profileMeta = {};
  }
  player.profileMeta.pvpLastCombatAt = now;
  player.profileMeta.pvpCooldownUntil = now + PVP_DISABLE_COOLDOWN_MS;
  const record = player.profileId ? profiles.get(player.profileId) : null;
  if (record) {
    record.pvpLastCombatAt = player.profileMeta.pvpLastCombatAt;
    record.pvpCooldownUntil = player.profileMeta.pvpCooldownUntil;
    record.pvpOptIn = Boolean(player.profileMeta.pvpOptIn);
    profiles.set(player.profileId, record);
    if (usingMongo && profilesCollection) {
      persistProfileToMongo(player.profileId, record);
    } else {
      queueSaveProfiles();
    }
  }
}

function resolveAction(player, actionType, aimVector, chargeSeconds) {
  const now = Date.now();
  ensureEquipment(player);
  const bonuses = player.bonuses || computeBonuses(player);
  const baseChargeCap = clamp(bonuses.maxCharge, 0.5, 5);
  const maxChargeTime = baseChargeCap + CHARGE_TIME_BONUS;
  const charge = clamp(chargeSeconds, 0.1, maxChargeTime);
  const potency = charge;
  const momentumStacks = getMomentumStacks(player, now);
  const damageMultiplier = 1 + momentumStacks * MOMENTUM_DAMAGE_SCALE;
  const xpMultiplier = 1 + momentumStacks * MOMENTUM_XP_SCALE;

  let aim = aimVector && typeof aimVector.x === 'number' && typeof aimVector.y === 'number'
    ? normalizeVector(aimVector)
    : normalizeVector(player.aim);
  if (aim.x === 0 && aim.y === 0) {
    aim = { x: 1, y: 0 };
  }

  const meleeItem = getEquippedItem(player, 'melee');
  const rangedItem = getEquippedItem(player, 'ranged');
  const spellItem = getEquippedItem(player, 'spell');

  let xpGain = 0;
  let damageBase = 0;
  let range = 0;
  let projectileHalfWidth = null;
  let effectLifetime = EFFECT_LIFETIME;
  let effectVariant = null;
  const meleeKnockback = meleeItem?.knockback ?? 0.5;

  if (actionType === 'melee') {
    xpGain = 6 * potency;
    damageBase = 18 * potency * (player.stats.strength / 10) * (meleeItem?.damageMultiplier ?? 1);
    range = bonuses.meleeRange ?? MELEE_BASE_RANGE;
  } else if (actionType === 'ranged') {
    xpGain = 5 * potency;
    damageBase = 16 * potency * (player.stats.dexterity / 10) * (rangedItem?.damageMultiplier ?? 1);
    range = bonuses.projectileRange ?? (RANGED_BASE_RANGE + player.stats.dexterity * RANGED_RANGE_PER_DEX);
  projectileHalfWidth = (PROJECTILE_HALF_WIDTH + potency * 0.08) * (rangedItem?.projectile?.widthScale ?? 1);
    effectLifetime = rangedItem?.projectile?.travelMs ?? EFFECT_LIFETIME;
    effectVariant = rangedItem?.projectile?.variant ?? null;
  } else if (actionType === 'spell') {
    xpGain = 7 * potency;
    damageBase = 14 * potency * (player.stats.intellect / 10) * (spellItem?.damageMultiplier ?? 1);
    range = bonuses.spellRange ?? (SPELL_BASE_RANGE + player.stats.intellect * SPELL_RANGE_PER_INT);
    projectileHalfWidth = (SPELL_PROJECTILE_HALF_WIDTH + potency * 0.25);
    if (spellItem?.spell?.travelMs) {
      effectLifetime = spellItem.spell.travelMs;
    }
    effectVariant = spellItem?.spell?.variant ?? null;
    if ((spellItem?.damageMultiplier ?? 1) === 0) {
      damageBase = 0;
    }
  } else {
    return;
  }

  if (projectileHalfWidth != null) {
    projectileHalfWidth = Math.max(0.12, projectileHalfWidth);
  }

  const rangeBonusFactor = CHARGE_RANGE_SCALE[actionType] ?? 0;
  const normalizedCharge = Math.max(0, charge - 0.1);
  if (rangeBonusFactor > 0) {
    range *= 1 + normalizedCharge * rangeBonusFactor;
  }
  xpGain *= xpMultiplier;
  damageBase *= damageMultiplier;

  if (!effectVariant && actionType === 'melee') {
    effectVariant = meleeItem?.id ?? null;
  }

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
    width: projectileHalfWidth != null ? projectileHalfWidth * 2 : null,
    shape: actionType === 'melee' ? 'cone' : projectileHalfWidth != null ? 'projectile' : 'burst',
    lifetime: effectLifetime,
    variant: effectVariant,
    expiresAt: now + effectLifetime,
    levelId: player.levelId || null,
  };
  world.effects.push(effect);

  const hitChance = clamp(bonuses.hitChance, 0.1, 0.97);
  const coneCosHalfAngle = Math.cos(MELEE_CONE_HALF_ANGLE);

  if (projectileHalfWidth != null) {
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
      if (!playerInSafeZone(candidatePlayer) && canEngageInPvp(player, candidatePlayer)) {
        if (actionType === 'spell') {
          const config = spellItem?.spell;
          if (config?.effect === 'knockback' && config.magnitude) {
            applyKnockbackEntity(candidatePlayer, config.magnitude, aim, candidatePlayer.levelId || null);
          }
        }
        if (damageBase > 0) {
          damagePlayer(candidatePlayer, damageBase);
          recordPvpEngagement(player);
          recordPvpEngagement(candidatePlayer);
        }
      }
    }
  } else {
    for (const target of clients.values()) {
      if (target.id === player.id) continue;
      if ((target.levelId || null) !== (player.levelId || null)) continue;
      if (playerInSafeZone(target)) continue;
      const within = isWithinCone(player, aim, target, range + PLAYER_HIT_RADIUS, coneCosHalfAngle, PLAYER_HIT_RADIUS);
      if (!within) continue;
      if (Math.random() <= hitChance && canEngageInPvp(player, target)) {
        damagePlayer(target, damageBase);
        if (damageBase > 0) {
          recordPvpEngagement(player);
          recordPvpEngagement(target);
        }
        if (actionType === 'melee' && meleeKnockback > 0) {
          applyKnockbackEntity(target, meleeKnockback, aim, target.levelId || null);
        }
      }
    }
  }

  if (world.enemies.length) {
    let xpApplied = false;
    const playerLevelId = player.levelId || null;
    if (projectileHalfWidth != null) {
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
        let enemyKilled = false;
        if (enemy === candidateEnemy && Math.random() <= hitChance) {
          if (!xpApplied && grantSkillXP(player, actionType, xpGain)) {
            xpApplied = true;
          }
          if (actionType === 'spell') {
            enemyKilled = applySpellImpact(player, spellItem, enemy, damageBase, aim);
          } else {
            enemyKilled = damageEnemy(enemy, damageBase);
            if (!enemyKilled) {
              applyKnockbackEntity(enemy, 0.45 + potency * 0.25, aim, enemy.levelId || null);
            }
          }
          if (enemyKilled) {
            awardKillXP(player, actionType, enemy);
            handleEnemyDeath(enemy, player);
          }
        }
        if (!enemyKilled && enemy.health > 0) {
          survivors.push(enemy);
        }
      }
      world.enemies = survivors;
    } else {
      const survivors = [];
      for (const enemy of world.enemies) {
        if ((enemy.levelId || null) !== playerLevelId) {
          survivors.push(enemy);
          continue;
        }
        const within = isWithinCone(player, aim, enemy, range + enemy.radius, coneCosHalfAngle, enemy.radius);
        let enemyKilled = false;
        if (within && Math.random() <= hitChance) {
          if (!xpApplied && grantSkillXP(player, actionType, xpGain)) {
            xpApplied = true;
          }
          enemyKilled = damageEnemy(enemy, damageBase);
          if (!enemyKilled && meleeKnockback > 0) {
            applyKnockbackEntity(enemy, meleeKnockback, aim, enemy.levelId || null);
          }
          if (enemyKilled) {
            awardKillXP(player, actionType, enemy);
            handleEnemyDeath(enemy, player);
          }
        }
        if (!enemyKilled && enemy.health > 0) {
          survivors.push(enemy);
        }
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
    decayMomentum(player, now);
    resolveMovement(player, dt);
    if (player.health < player.maxHealth) {
      const healRatePerMs = player.maxHealth / SAFE_ZONE_HEAL_DURATION_MS;
      const healMultiplier = playerInSafeZone(player) ? 1 : WILDERNESS_HEAL_SCALE;
      const healAmount = healRatePerMs * healMultiplier * dt * 1000;
      if (healAmount > 0) {
        player.health = clamp(player.health + healAmount, 0, player.maxHealth);
      }
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
      name: player.profileMeta?.name || null,
      admin: Boolean(player.profileMeta?.isAdmin),
      x: player.x,
      y: player.y,
      health: player.health,
      maxHealth: player.maxHealth,
      stats: player.stats,
      bonuses: player.bonuses,
      equipment: serializeEquipment(player.equipment),
      charging: player.action ? true : false,
      actionKind: player.action?.kind ?? null,
      chargeRatio: player.action
        ? clamp((now - player.action.startedAt) / ((player.bonuses.maxCharge + CHARGE_TIME_BONUS) * 1000), 0, 1)
        : 0,
      levelId: player.levelId || null,
      momentum: serializeMomentum(player, now),
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
      lifetime: effect.lifetime ?? EFFECT_LIFETIME,
      ttl: Math.max(0, effect.expiresAt - now),
      variant: effect.variant ?? null,
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
  } else if (payload.type === 'equip') {
    const slot = typeof payload.slot === 'string' ? payload.slot.toLowerCase() : '';
    const itemId = typeof payload.itemId === 'string' ? payload.itemId : null;
    const result = equipItem(player, slot, itemId, true, false);
    sendTo(player, {
      type: 'equip-result',
      ok: Boolean(result?.ok),
      slot,
      itemId: result?.itemId ?? null,
      message: result?.message ?? null,
      equipment: serializeEquipment(player.equipment),
    });
  } else if (payload.type === 'profile') {
    handleProfileMessage(player, payload);
  } else if (payload.type === 'admin') {
    handleAdminMessage(player, payload);
  }
}

function sendProfileSnapshot(player) {
  if (!player) return;
  sendTo(player, {
    type: 'profile',
    event: 'refresh',
    profile: {
      id: player.profileId,
      name: player.profileMeta?.name || null,
      tutorialCompleted: Boolean(player.profileMeta?.tutorialCompleted),
      isAdmin: Boolean(player.profileMeta?.isAdmin),
      banned: Boolean(player.profileMeta?.banned),
      createdAt: player.profileMeta?.createdAt || null,
      pvpOptIn: Boolean(player.profileMeta?.pvpOptIn),
      pvpCooldownEndsAt: Number(player.profileMeta?.pvpCooldownUntil) || 0,
      pvpLastCombatAt: Number(player.profileMeta?.pvpLastCombatAt) || 0,
    },
  });
}

function handleProfileMessage(player, payload) {
  if (!player?.profileId) return;
  const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : '';

  if (action === 'set-name') {
    const normalized = normalizeHeroName(payload.name);
    if (!normalized) {
      sendTo(player, {
        type: 'profile',
        event: 'error',
        field: 'name',
        message: `Hero name must be ${HERO_NAME_MIN_LENGTH}-${HERO_NAME_MAX_LENGTH} characters using letters, numbers, spaces, apostrophes, or hyphens.`,
      });
      return;
    }
    player.profileMeta.name = normalized;
    const record = profiles.get(player.profileId) || {};
    record.name = normalized;
    profiles.set(player.profileId, record);
    syncProfile(player);
    sendTo(player, {
      type: 'profile',
      event: 'name-set',
      name: normalized,
    });
    sendProfileSnapshot(player);
  } else if (action === 'tutorial-complete') {
    player.profileMeta.tutorialCompleted = true;
    const record = profiles.get(player.profileId) || {};
    record.tutorialCompleted = true;
    profiles.set(player.profileId, record);
    const destination = teleportPlayerToSafeZone(player);
    syncProfile(player);
    sendTo(player, {
      type: 'profile',
      event: 'tutorial-complete',
      tutorialCompleted: true,
      safeZone: destination,
      skipped: Boolean(payload.skipped),
    });
    sendProfileSnapshot(player);
  } else if (action === 'toggle-pvp') {
    const enable = payload.enabled !== undefined ? Boolean(payload.enabled) : true;
    if (enable) {
      player.profileMeta.pvpOptIn = true;
      player.profileMeta.pvpCooldownUntil = 0;
      syncProfile(player);
      sendTo(player, {
        type: 'profile',
        event: 'pvp-updated',
        pvpOptIn: true,
        cooldownEndsAt: Number(player.profileMeta?.pvpCooldownUntil) || 0,
        lastCombatAt: Number(player.profileMeta?.pvpLastCombatAt) || 0,
        message: 'PvP enabled. You can now engage with other flagged heroes.',
      });
      sendProfileSnapshot(player);
    } else {
      const now = Date.now();
      const cooldownUntil = Math.max(
        Number(player.profileMeta?.pvpCooldownUntil) || 0,
        (Number(player.profileMeta?.pvpLastCombatAt) || 0) + PVP_DISABLE_COOLDOWN_MS
      );
      if (cooldownUntil > now) {
        const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
        sendTo(player, {
          type: 'profile',
          event: 'error',
          field: 'pvp',
          message: `Stay out of PvP for ${remainingSeconds} more second${remainingSeconds === 1 ? '' : 's'} before disabling.`,
        });
        return;
      }
      player.profileMeta.pvpOptIn = false;
      player.profileMeta.pvpCooldownUntil = 0;
      syncProfile(player);
      sendTo(player, {
        type: 'profile',
        event: 'pvp-updated',
        pvpOptIn: false,
        cooldownEndsAt: 0,
        lastCombatAt: Number(player.profileMeta?.pvpLastCombatAt) || 0,
        message: 'PvP disabled. You are no longer vulnerable to other heroes.',
      });
      sendProfileSnapshot(player);
    }
  } else if (action === 'reset-tutorial') {
    player.profileMeta.tutorialCompleted = false;
    const destination = teleportPlayerToSafeZone(player);
    syncProfile(player);
    sendTo(player, {
      type: 'profile',
      event: 'tutorial-reset',
      message: 'Tutorial reset. Review the basics from the safe zone bank.',
      safeZone: destination,
    });
    sendProfileSnapshot(player);
  } else {
    sendTo(player, {
      type: 'profile',
      event: 'error',
      message: 'Unknown profile action.',
    });
  }
}

function handleAdminMessage(player, payload) {
  if (!player?.profileMeta?.isAdmin) {
    sendTo(player, {
      type: 'admin',
      event: 'error',
      message: 'Admin access required.'
    });
    return;
  }

  const command = typeof payload.command === 'string' ? payload.command.toLowerCase() : 'list';
  if (!command || command === 'list' || command === 'refresh') {
    sendAdminProfiles(player);
    return;
  }

  const respondError = (message, extra = {}) => {
    sendTo(player, {
      type: 'admin',
      event: 'error',
      command,
      message,
      ...extra,
    });
  };

  const respondOk = (data = {}) => {
    sendTo(player, {
      type: 'admin',
      event: 'ok',
      command,
      ...data,
    });
  };

  const profileId = resolveProfileId(payload.profileId);
  if (!profileId) {
    respondError('Profile not found.');
    return;
  }

  if (command === 'set-xp') {
    const xpPayload = payload.xp || {};
    const normalizeXp = (value) => Math.max(0, Math.floor(Number(value) || 0));
    const nextXp = {
      melee: normalizeXp(xpPayload.melee),
      ranged: normalizeXp(xpPayload.ranged),
      magic: normalizeXp(xpPayload.magic),
    };
    const targetPlayer = findPlayerByProfile(profileId);
    if (targetPlayer) {
      targetPlayer.xp = cloneXP(nextXp);
      applyStats(targetPlayer);
      targetPlayer.health = clamp(targetPlayer.health, 1, targetPlayer.maxHealth);
      syncProfile(targetPlayer);
    } else {
      mutateProfileRecord(profileId, (record) => {
        record.xp = cloneXP(nextXp);
        record.maxHealth = Number(record.maxHealth) || 100;
        record.health = clamp(Number(record.health) || record.maxHealth, 1, record.maxHealth);
      });
    }
    respondOk({ profileId, xp: nextXp });
    sendAdminProfiles(player);
    return;
  }

  if (command === 'set-meta') {
    const meta = payload.meta || {};
    const targetPlayer = findPlayerByProfile(profileId);
    const hasName = Object.prototype.hasOwnProperty.call(meta, 'name');
    const hasAdminFlag = Object.prototype.hasOwnProperty.call(meta, 'admin');
    const hasBannedFlag = Object.prototype.hasOwnProperty.call(meta, 'banned');
    const hasTutorialFlag = Object.prototype.hasOwnProperty.call(meta, 'tutorialCompleted');

    const updates = {};
    if (hasName) {
      if (!meta.name) {
        updates.name = null;
      } else {
        const normalizedName = normalizeHeroName(meta.name);
        if (!normalizedName) {
          respondError(`Name must be ${HERO_NAME_MIN_LENGTH}-${HERO_NAME_MAX_LENGTH} characters.`, { field: 'name' });
          return;
        }
        updates.name = normalizedName;
      }
    }
    if (hasAdminFlag) {
      updates.admin = Boolean(meta.admin);
    }
    if (hasBannedFlag) {
      updates.banned = Boolean(meta.banned);
    }
    if (hasTutorialFlag) {
      updates.tutorialCompleted = Boolean(meta.tutorialCompleted);
    }

    if (Object.keys(updates).length === 0) {
      respondError('No metadata fields provided.');
      return;
    }

    const applyUpdatesToRecord = (record) => {
      if (!record) return;
      if (hasName) record.name = updates.name;
      if (hasAdminFlag) record.admin = updates.admin;
      if (hasBannedFlag) record.banned = updates.banned;
      if (hasTutorialFlag) record.tutorialCompleted = updates.tutorialCompleted;
    };

    if (targetPlayer) {
      if (hasName) targetPlayer.profileMeta.name = updates.name;
      if (hasAdminFlag) targetPlayer.profileMeta.isAdmin = updates.admin;
      if (hasBannedFlag) targetPlayer.profileMeta.banned = updates.banned;
      if (hasTutorialFlag) targetPlayer.profileMeta.tutorialCompleted = updates.tutorialCompleted;
      applyUpdatesToRecord(profiles.get(profileId));
      syncProfile(targetPlayer);
      sendProfileSnapshot(targetPlayer);
      if (updates.banned) {
        try {
          sendTo(targetPlayer, {
            type: 'control',
            event: 'forced-logout',
            reason: 'You have been banned by the server admin.',
          });
        } catch (err) {
          // ignore send failures
        }
        setTimeout(() => {
          try {
            targetPlayer.connection?.socket?.end?.();
          } catch (err) {
            targetPlayer.connection?.socket?.destroy?.();
          }
        }, 25);
      }
    } else {
      mutateProfileRecord(profileId, applyUpdatesToRecord);
    }

    respondOk({ profileId, meta: updates });
    sendAdminProfiles(player);
    return;
  }

  if (command === 'kick') {
    const targetPlayer = findPlayerByProfile(profileId);
    if (!targetPlayer) {
      respondError('Player is not currently online.');
      return;
    }
    try {
      sendTo(targetPlayer, {
        type: 'control',
        event: 'forced-logout',
        reason: 'You have been removed by the server admin.',
      });
    } catch (err) {
      // ignore send failures
    }
    setTimeout(() => {
      try {
        targetPlayer.connection?.socket?.end?.();
      } catch (err) {
        targetPlayer.connection?.socket?.destroy?.();
      }
    }, 25);
    respondOk({ profileId });
    sendAdminProfiles(player);
    return;
  }

  if (command === 'teleport-safe') {
    const targetPlayer = findPlayerByProfile(profileId);
    if (!targetPlayer) {
      respondError('Player must be online to teleport.');
      return;
    }
    const destination = teleportPlayerToSafeZone(targetPlayer);
    syncProfile(targetPlayer);
    try {
      sendTo(targetPlayer, {
        type: 'control',
        event: 'teleport-safe',
        location: destination,
      });
    } catch (err) {
      // ignore
    }
    respondOk({ profileId, safeZone: destination });
    sendAdminProfiles(player);
    return;
  }

  if (command === 'grant-currency') {
    const inventoryDelta = Math.floor(Number(payload.inventoryDelta) || 0);
    const bankDelta = Math.floor(Number(payload.bankDelta) || 0);
    if (inventoryDelta === 0 && bankDelta === 0) {
      respondError('Specify a non-zero currency adjustment.');
      return;
    }
    const applyAdjustments = (inventory, delta) => {
      if (!delta) return inventory;
      const next = { ...inventory };
      next.currency = Math.max(0, Math.floor(Number(next.currency) || 0) + delta);
      return next;
    };
    const targetPlayer = findPlayerByProfile(profileId);
    if (targetPlayer) {
      if (inventoryDelta) {
        targetPlayer.inventory.currency = Math.max(0, Math.floor(Number(targetPlayer.inventory.currency) || 0) + inventoryDelta);
      }
      if (bankDelta) {
        targetPlayer.bank.currency = Math.max(0, Math.floor(Number(targetPlayer.bank.currency) || 0) + bankDelta);
      }
      sendInventoryUpdate(targetPlayer);
    } else {
      mutateProfileRecord(profileId, (record) => {
        const inventory = ensureInventoryData(record.inventory);
        const bank = ensureBankData(record.bank);
        record.inventory = applyAdjustments(inventory, inventoryDelta);
        record.bank = applyAdjustments(bank, bankDelta);
      });
    }
    respondOk({ profileId, inventoryDelta, bankDelta });
    sendAdminProfiles(player);
    return;
  }

  respondError('Unknown admin command.');
}

function resolveProfileId(identifier) {
  if (!identifier) return null;
  const normalized = normalizeProfileId(identifier);
  if (normalized && profiles.has(normalized)) return normalized;
  if (typeof identifier === 'string') {
    const lowered = identifier.trim().toLowerCase();
    for (const [id, record] of profiles.entries()) {
      const alias = typeof record?.alias === 'string' ? record.alias.toLowerCase() : null;
      if (alias && alias === lowered) {
        return id;
      }
    }
  }
  return null;
}

function findPlayerByProfile(profileId) {
  if (!profileId) return null;
  for (const client of clients.values()) {
    if (client.profileId === profileId) {
      return client;
    }
  }
  return null;
}

function mutateProfileRecord(profileId, mutator) {
  if (!profileId || typeof mutator !== 'function') return null;
  const record = profiles.get(profileId);
  if (!record) return null;
  mutator(record);
  profiles.set(profileId, record);
  if (usingMongo && profilesCollection) {
    persistProfileToMongo(profileId, record);
  } else {
    queueSaveProfiles();
  }
  return record;
}

function snapshotInventory(source, bank = false) {
  const base = bank ? ensureBankData(source) : ensureInventoryData(source);
  return serializeInventory(base);
}

function buildAdminProfileList() {
  const onlineByProfile = new Map();
  for (const client of clients.values()) {
    if (client.profileId) {
      onlineByProfile.set(client.profileId, client);
    }
  }

  const list = [];
  for (const [profileId, record] of profiles.entries()) {
    const online = onlineByProfile.get(profileId) || null;
    const xp = cloneXP(record?.xp);
    const stats = computeStatsFromXP({ xp });
    const position = online
      ? { x: online.x, y: online.y, levelId: online.levelId || null }
      : record?.position && typeof record.position.x === 'number' && typeof record.position.y === 'number'
      ? { x: record.position.x, y: record.position.y, levelId: null }
      : null;
    list.push({
      id: profileId,
      name: record?.name || null,
      alias: record?.alias || null,
      admin: Boolean(record?.admin),
      banned: Boolean(record?.banned),
      tutorialCompleted: Boolean(record?.tutorialCompleted),
      lastSeen: Number(record?.lastSeen) || null,
      createdAt: Number(record?.createdAt) || null,
      maxHealth: Number(record?.maxHealth) || 100,
      xp,
      stats,
      inventory: snapshotInventory(record?.inventory, false),
      bank: snapshotInventory(record?.bank, true),
      online: Boolean(online),
      playerId: online?.id || null,
      position,
      pvpOptIn: Boolean(record?.pvpOptIn),
      pvpCooldownUntil: Math.max(0, Number(record?.pvpCooldownUntil) || 0),
    });
  }

  list.sort((a, b) => {
    const left = a.createdAt || 0;
    const right = b.createdAt || 0;
    if (left === right) return a.id.localeCompare(b.id);
    return left - right;
  });

  return list;
}

function sendAdminProfiles(adminPlayer) {
  if (!adminPlayer) return;
  sendTo(adminPlayer, {
    type: 'admin',
    event: 'profiles',
    profiles: buildAdminProfileList(),
    safeZone: getSafeZoneLocation(),
  });
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
  if (pathname === '/status/persistence') {
    const response = {
      storage: usingMongo ? 'mongo' : 'file',
      mongo: {
        configured: Boolean(MONGO_URL),
        connected: usingMongo,
        database: usingMongo ? MONGO_DB_NAME : null,
        collection: usingMongo ? MONGO_COLLECTION : null,
        pendingWrites: usingMongo ? pendingMongoWrites.size : 0,
      },
      file: {
        path: PROFILE_PATH,
        queuedSave: Boolean(profileSaveTimer),
      },
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
    return;
  }
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

function normalizeHeroName(value) {
  if (!value || typeof value !== 'string') return null;
  let sanitized = value.replace(/[\r\n]+/g, ' ');
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  sanitized = sanitized.replace(/[^A-Za-z0-9'\-\s]/g, '');
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  if (sanitized.length > HERO_NAME_MAX_LENGTH) {
    sanitized = sanitized.slice(0, HERO_NAME_MAX_LENGTH).trim();
  }
  if (sanitized.length < HERO_NAME_MIN_LENGTH) {
    return null;
  }
  return sanitized;
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
  const now = Date.now();
  const existing = profiles.get(player.profileId) || {};
  const createdAt = Number(player.profileMeta?.createdAt) || Number(existing.createdAt) || now;
  const meta = player.profileMeta || {};
  const name = meta.name != null ? meta.name : existing.name || null;
  const tutorialCompleted =
    meta.tutorialCompleted != null ? Boolean(meta.tutorialCompleted) : Boolean(existing.tutorialCompleted);
  const adminFlag = meta.isAdmin != null ? Boolean(meta.isAdmin) : Boolean(existing.admin);
  const bannedFlag = meta.banned != null ? Boolean(meta.banned) : Boolean(existing.banned);
  const pvpOptIn = meta.pvpOptIn != null ? Boolean(meta.pvpOptIn) : Boolean(existing.pvpOptIn);
  const pvpCooldownUntil =
    meta.pvpCooldownUntil != null
      ? Math.max(0, Number(meta.pvpCooldownUntil) || 0)
      : Math.max(0, Number(existing.pvpCooldownUntil) || 0);
  const pvpLastCombatAt =
    meta.pvpLastCombatAt != null
      ? Math.max(0, Number(meta.pvpLastCombatAt) || 0)
      : Math.max(0, Number(existing.pvpLastCombatAt) || 0);

  player.profileMeta = {
    ...meta,
    name,
    tutorialCompleted,
    isAdmin: adminFlag,
    banned: bannedFlag,
    createdAt,
    pvpOptIn,
    pvpCooldownUntil,
    pvpLastCombatAt,
  };

  const record = {
    xp: cloneXP(player.xp),
    maxHealth: Number(player.baseMaxHealth) || 100,
    lastSeen: now,
    alias: player.id,
    position: {
      x: clamp(player.x, 0.5, world.width - 0.5),
      y: clamp(player.y, 0.5, world.height - 0.5),
    },
    health: clamp(player.health, 0, player.maxHealth),
    name,
    tutorialCompleted,
    admin: adminFlag,
    banned: bannedFlag,
    createdAt,
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
    gear: serializeGear(player.gear),
    equipment: serializeEquipment(player.equipment),
    pvpOptIn,
    pvpCooldownUntil,
    pvpLastCombatAt,
  };
  profiles.set(player.profileId, record);
  if (usingMongo && profilesCollection) {
    persistProfileToMongo(player.profileId, record);
  } else {
    queueSaveProfiles();
  }
}

function buildProfileCache(entries) {
  const map = new Map();
  let maxAliasIndex = 0;
  for (const [key, value] of entries) {
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
    const gear = ensureGearData(value?.gear);
    const equipment = ensureEquipmentData(value?.equipment, gear);
    const name = normalizeHeroName(value?.name) || null;
    const tutorialCompleted = Boolean(value?.tutorialCompleted);
    const admin = Boolean(value?.admin);
    const banned = Boolean(value?.banned);
    const createdAt = Number(value?.createdAt) || Number(value?.lastSeen) || Date.now();
    const pvpOptIn = Boolean(value?.pvpOptIn);
    const pvpCooldownUntil = Math.max(0, Number(value?.pvpCooldownUntil) || 0);
    const pvpLastCombatAt = Math.max(0, Number(value?.pvpLastCombatAt) || 0);
    map.set(normalized, {
      xp: cloneXP(value?.xp),
      maxHealth,
      lastSeen: Number(value?.lastSeen) || Date.now(),
      alias,
      position,
      health,
      inventory,
      bank,
      gear,
      equipment,
      name,
      tutorialCompleted,
      admin,
      banned,
      createdAt,
      pvpOptIn,
      pvpCooldownUntil,
      pvpLastCombatAt,
    });
  }
  return { map, nextPlayerId: maxAliasIndex + 1 };
}

function loadProfilesFromFile() {
  try {
    const raw = fs.readFileSync(PROFILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return buildProfileCache(Object.entries(parsed));
  } catch (err) {
    return { map: new Map(), nextPlayerId: 1 };
  }
}

async function loadProfiles() {
  if (MONGO_URL) {
    try {
      if (!MongoClientModule) {
        ({ MongoClient: MongoClientModule } = require('mongodb'));
      }
      mongoClient = new MongoClientModule(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      const db = mongoClient.db(MONGO_DB_NAME);
      profilesCollection = db.collection(MONGO_COLLECTION);
      usingMongo = true;
      logMongoStatus(`Connected. Database="${MONGO_DB_NAME}" Collection="${MONGO_COLLECTION}"`);
      const docs = await profilesCollection.find().toArray();
      const entries = docs
        .map((doc) => [normalizeProfileId(doc._id || doc.id || ''), doc])
        .filter(([id]) => Boolean(id));
      return buildProfileCache(entries);
    } catch (err) {
      console.error('Failed to connect to MongoDB, falling back to local file storage:', err);
      usingMongo = false;
      closeMongoConnection();
    }
  }
  if (!MONGO_URL) {
    logMongoStatus('MONGO_URL not configured; using local file persistence.');
  }
  return loadProfilesFromFile();
}

function serializeProfileRecord(value) {
  const record = {
    xp: cloneXP(value?.xp),
    maxHealth: Number(value?.maxHealth) || 100,
    lastSeen: Number(value?.lastSeen) || Date.now(),
    alias: typeof value?.alias === 'string' ? value.alias : undefined,
    name: typeof value?.name === 'string' ? value.name : undefined,
    tutorialCompleted: Boolean(value?.tutorialCompleted),
    admin: Boolean(value?.admin),
    banned: Boolean(value?.banned),
    createdAt: Number(value?.createdAt) || undefined,
    position:
      value?.position && typeof value.position.x === 'number' && typeof value.position.y === 'number'
        ? { x: Number(value.position.x), y: Number(value.position.y) }
        : undefined,
    health:
      typeof value?.health === 'number'
        ? clamp(Number(value.health), 0, Number(value?.maxHealth) || 100)
        : undefined,
    pvpOptIn: Boolean(value?.pvpOptIn),
    pvpCooldownUntil: Math.max(0, Number(value?.pvpCooldownUntil) || 0),
    pvpLastCombatAt: Math.max(0, Number(value?.pvpLastCombatAt) || 0),
  };

  if (value?.inventory) {
    record.inventory = {
      currency: Math.max(0, Math.floor(Number(value.inventory.currency) || 0)),
      items: Object.fromEntries(
        Object.entries(value.inventory.items || {})
          .filter(([, qty]) => Number(qty) > 0)
          .map(([key, qty]) => [key, Math.floor(Number(qty))])
      ),
    };
  }

  if (value?.bank) {
    record.bank = {
      currency: Math.max(0, Math.floor(Number(value.bank.currency) || 0)),
      items: Object.fromEntries(
        Object.entries(value.bank.items || {})
          .filter(([, qty]) => Number(qty) > 0)
          .map(([key, qty]) => [key, Math.floor(Number(qty))])
      ),
    };
  }

  if (value?.gear) {
    const owned = Array.isArray(value.gear.owned) ? [...value.gear.owned] : [];
    owned.sort();
    record.gear = { owned };
  }

  if (value?.equipment) {
    record.equipment = { ...value.equipment };
  }

  return record;
}

function serializeProfiles() {
  const output = {};
  for (const [key, value] of profiles.entries()) {
    output[key] = serializeProfileRecord(value);
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
  if (usingMongo) return;
  if (profileSaveTimer) return;
  profileSaveTimer = setTimeout(() => {
    profileSaveTimer = null;
    saveProfiles();
  }, PROFILE_SAVE_DELAY);
}

function saveProfiles() {
  if (usingMongo) return;
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
  if (usingMongo) {
    if (profileSaveTimer) {
      clearTimeout(profileSaveTimer);
      profileSaveTimer = null;
    }
    return;
  }
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

function persistProfileToMongo(profileId, record) {
  if (!usingMongo || !profilesCollection || !profileId || !record) return;
  const payload = serializeProfileRecord(record);
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  const createdAt = sanitized.createdAt;
  delete sanitized.createdAt;
  const op = profilesCollection
    .updateOne(
      { _id: profileId },
      {
        $set: {
          ...sanitized,
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          createdAt: createdAt ?? Date.now(),
        },
      },
      { upsert: true }
    )
    .catch((err) => {
      console.error('Failed to persist hero profile to MongoDB:', err);
      throw err;
    });
  pendingMongoWrites.add(op);
  op.finally(() => pendingMongoWrites.delete(op));
}

async function closeMongoConnection() {
  if (!mongoClient) return;
  const client = mongoClient;
  mongoClient = null;
  profilesCollection = null;
  try {
    await client.close();
  } catch (err) {
    console.error('Failed to close MongoDB client:', err);
  }
}
async function flushPersistence() {
  if (usingMongo) {
    while (pendingMongoWrites.size) {
      const pending = Array.from(pendingMongoWrites);
      await Promise.allSettled(pending);
    }
    await closeMongoConnection();
  } else {
    saveProfilesSync();
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
    const result = createPlayer(connection, requestedProfileId);
    if (!result || result.error) {
      const reason = result?.error === 'banned' ? 'You are banned from this server.' : 'Unable to create hero profile.';
      try {
        connection.send(JSON.stringify({ type: 'control', event: 'connection-rejected', reason }));
      } catch (err) {
        // ignore send errors
      }
      setTimeout(() => {
        try {
          connection.socket?.end?.();
        } catch (err) {
          connection.socket?.destroy?.();
        }
      }, 10);
      return;
    }
    const player = result.player;
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
      profile: {
        id: player.profileId,
        name: player.profileMeta?.name || null,
        tutorialCompleted: Boolean(player.profileMeta?.tutorialCompleted),
        isAdmin: Boolean(player.profileMeta?.isAdmin),
        banned: Boolean(player.profileMeta?.banned),
        createdAt: player.profileMeta?.createdAt || null,
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
        momentum: serializeMomentum(player, Date.now()),
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

async function ensureInitialized() {
  if (initialized) return;
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const profileSource = await loadProfiles();
      profiles = profileSource.map;
      nextPlayerId = Math.max(nextPlayerId, profileSource.nextPlayerId);
      initialized = true;
    })().catch((err) => {
      initializationPromise = null;
      throw err;
    });
  }
  await initializationPromise;
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
  const { player: firstPlayer } = createPlayer(stubConnection, null) || {};
  if (!firstPlayer) {
    console.error('Failed to create first player during self-test');
    process.exit(1);
  }
  const profileId = firstPlayer.profileId;
  const { x: expectedX, y: expectedY } = findSpawn();
  firstPlayer.x = expectedX;
  firstPlayer.y = expectedY;
  const profileRecord = profiles.get(profileId);
  if (profileRecord) {
    profileRecord.position = { x: expectedX, y: expectedY };
    profileRecord.health = 42;
  }
  const { player: secondPlayer } = createPlayer(stubConnection, profileId) || {};
  if (!secondPlayer) {
    console.error('Failed to restore profile during self-test');
    process.exit(1);
  }
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

async function main() {
  const selfTest = process.argv.some((arg) => arg === '--self-test' || arg === '--test');
  try {
    await ensureInitialized();
    if (selfTest) {
      runSelfTest();
      await handleExit(true, 0);
      return;
    } else {
      startServer();
    }
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error during startup:', err);
    handleExit(true, 1);
  });
}

module.exports = {
  startServer,
  generateTerrain,
  runSelfTest,
  ensureInitialized,
};
