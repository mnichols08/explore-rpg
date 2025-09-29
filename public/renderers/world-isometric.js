const THREE_MODULE_URL = 'https://unpkg.com/three@0.164.0/build/three.module.js?module';

const TILE_COLORS = {
  water: '#0f172a',
  sand: '#fbbf24',
  grass: '#22d3ee',
  forest: '#166534',
  rock: '#94a3b8',
  ember: '#fb923c',
  glyph: '#818cf8',
  obsidian: '#0f172a',
  lava: '#ef4444',
  void: '#1e1b4b',
};

const TILE_HEIGHTS = {
  water: 0.12,
  sand: 0.18,
  grass: 0.22,
  forest: 0.32,
  rock: 0.35,
  ember: 0.28,
  glyph: 0.3,
  obsidian: 0.4,
  lava: 0.26,
  void: 0.16,
};

const WALKABLE_TILE_TYPES = new Set(['sand', 'grass', 'forest', 'ember', 'glyph']);
const WALKABLE_OVERLAY_COLOR = '#38bdf8';
const WALKABLE_BARRIER_COLOR = '#1d4ed8';
const TERRAIN_TEXTURE_SCHEMES = {
  grass: {
    base: '#14532d',
    highlight: '#1e7044',
    shadow: '#0b3520',
    accent: '#4ade80',
    accentDensity: 0.08,
    highlightDensity: 0.25,
    repeat: 3.1,
  },
  sand: {
    base: '#d6b26d',
    highlight: '#f0d38a',
    shadow: '#b68c4c',
    accent: '#fde68a',
    accentDensity: 0.05,
    highlightDensity: 0.2,
    repeat: 2.4,
  },
  forest: {
    base: '#0f3620',
    highlight: '#166534',
    shadow: '#052112',
    accent: '#34d399',
    accentDensity: 0.07,
    highlightDensity: 0.28,
    repeat: 2.8,
  },
  ember: {
    base: '#40150a',
    highlight: '#b45309',
    shadow: '#220801',
    accent: '#fb923c',
    accentDensity: 0.06,
    highlightDensity: 0.22,
    repeat: 2.2,
  },
  glyph: {
    base: '#211c5c',
    highlight: '#3730a3',
    shadow: '#0f172a',
    accent: '#6366f1',
    accentDensity: 0.05,
    highlightDensity: 0.18,
    repeat: 2.6,
  },
  default: {
    base: '#334155',
    highlight: '#475569',
    shadow: '#1f2937',
    accent: '#64748b',
    accentDensity: 0.04,
    highlightDensity: 0.18,
    repeat: 2.2,
  },
};
const ARMOR_STYLES = {
  'armor-cloth': {
    torso: '#e2e8f0',
    trim: '#cbd5f5',
    emissive: '#38bdf8',
    undersuit: '#1f2937',
    cloak: { base: '#1e3a8a', edge: '#60a5fa' },
  },
  'armor-leather': {
    torso: '#78350f',
    trim: '#fde68a',
    emissive: '#f97316',
    undersuit: '#0f172a',
    cloak: { base: '#4d1f07', edge: '#fb923c' },
  },
  'armor-mail': {
    torso: '#94a3b8',
    trim: '#e2e8f0',
    emissive: '#38bdf8',
    undersuit: '#0b1220',
    cloak: { base: '#0f172a', edge: '#38bdf8' },
  },
  default: {
    torso: '#475569',
    trim: '#cbd5f5',
    emissive: '#38bdf8',
    undersuit: '#111827',
    cloak: { base: '#1f2937', edge: '#38bdf8' },
  },
};
const WEAPON_STYLES = {
  'melee-fist': {
    type: 'fist',
    primary: '#facc15',
    accent: '#f97316',
    length: 0.6,
    thickness: 0.24,
    mount: 'hand',
    idle: { sway: 0.08, spin: 0.18, speed: 2.6, bob: 0.02 },
  },
  'melee-stick': {
    type: 'staff',
    primary: '#b45309',
    accent: '#fde68a',
    length: 1.18,
    thickness: 0.12,
    mount: 'hand',
    idle: { sway: 0.1, speed: 1.8, bob: 0.03 },
  },
  'melee-sword': {
    type: 'blade',
    primary: '#e2e8f0',
    accent: '#38bdf8',
    pommel: '#f97316',
    length: 1.12,
    bladeWidth: 0.16,
    bladeThickness: 0.06,
    mount: 'hand',
    idle: { sway: 0.06, speed: 2.2, tilt: 0.18 },
  },
  'ranged-rock': {
    type: 'sling',
    primary: '#cbd5f5',
    accent: '#f97316',
    thickness: 0.22,
    mount: 'hip',
    idle: { sway: 0.05, speed: 1.6, bob: 0.02 },
  },
  'ranged-sling': {
    type: 'sling',
    primary: '#fde68a',
    accent: '#facc15',
    thickness: 0.2,
    mount: 'hip',
    idle: { sway: 0.06, speed: 1.7, bob: 0.025, spin: 0.12 },
  },
  'ranged-bow': {
    type: 'bow',
    primary: '#78350f',
    accent: '#fbbf24',
    mount: 'back',
    length: 1.42,
    thickness: 0.08,
    idle: { sway: 0.08, speed: 1.4, tilt: 0.12 },
  },
  'spell-air': {
    type: 'orb',
    primary: '#38bdf8',
    accent: '#bae6fd',
    thickness: 0.24,
    length: 0.82,
    mount: 'float',
    idle: { orbit: 0.16, bob: 0.06, speed: 1.9, spin: 0.6 },
  },
  'spell-fire': {
    type: 'orb',
    primary: '#fb923c',
    accent: '#facc15',
    thickness: 0.26,
    length: 0.78,
    mount: 'float',
    idle: { orbit: 0.14, bob: 0.05, speed: 2.1, spin: 0.7 },
  },
  'spell-ice': {
    type: 'tome',
    primary: '#1e3a8a',
    accent: '#93c5fd',
    thickness: 0.18,
    length: 0.9,
    mount: 'float',
    idle: { sway: 0.05, bob: 0.04, speed: 1.5, tilt: 0.2 },
  },
  'spell-lightning': {
    type: 'scepter',
    primary: '#6366f1',
    accent: '#c4b5fd',
    mount: 'float',
    length: 1.05,
    thickness: 0.12,
    idle: { spin: 0.8, bob: 0.05, speed: 2.4 },
  },
  default: {
    type: 'staff',
    primary: '#94a3b8',
    accent: '#38bdf8',
    length: 1.05,
    thickness: 0.1,
    mount: 'hand',
    idle: { sway: 0.08, speed: 1.6, bob: 0.02 },
  },
};
const MELEE_VARIANT_COLORS = {
  'melee-fist': '#facc15',
  'melee-stick': '#f97316',
  'melee-sword': '#38bdf8',
  default: '#fbbf24',
};
const DEFAULT_EFFECT_LIFETIME = 600;

const PLAYER_STYLES = {
  self: {
    base: '#38bdf8',
    emissive: '#1d4ed8',
    ring: '#38bdf8',
  },
  ally: {
    base: '#f97316',
    emissive: '#c2410c',
    ring: '#fb923c',
  },
};

const ENEMY_STYLES = {
  slime: {
    base: '#0ea5e9',
    emissive: '#155e75',
    glow: '#38bdf8',
    geometry: 'sphere',
    scale: 0.68,
    glowScale: 2.6,
    ringRadius: 0.82,
  },
  wolf: {
    base: '#facc15',
    emissive: '#c2410c',
    glow: '#fbbf24',
    geometry: 'cone',
    scale: 0.82,
    glowScale: 2.4,
    ringRadius: 0.78,
  },
  wisp: {
    base: '#c084fc',
    emissive: '#7c3aed',
    glow: '#e9d5ff',
    geometry: 'icosa',
    scale: 0.7,
    glowScale: 2.9,
    glowHeight: 1.08,
    ringRadius: 0.86,
    glowOpacityMin: 0.46,
    glowOpacityMax: 0.88,
  },
  emberling: {
    base: '#fb923c',
    emissive: '#b91c1c',
    glow: '#f97316',
    geometry: 'icosa',
    scale: 0.74,
    glowScale: 2.45,
    ringRadius: 0.8,
  },
  warden: {
    base: '#f97316',
    emissive: '#9a3412',
    glow: '#fb923c',
    geometry: 'cone',
    scale: 0.9,
    glowScale: 2.5,
    ringRadius: 0.82,
  },
  phantom: {
    base: '#38bdf8',
    emissive: '#1e3a8a',
    glow: '#60a5fa',
    geometry: 'sphere',
    scale: 0.72,
    glowScale: 2.55,
    ringRadius: 0.8,
  },
  seer: {
    base: '#c4b5fd',
    emissive: '#4338ca',
    glow: '#cbd5ff',
    geometry: 'icosa',
    scale: 0.74,
    glowScale: 2.6,
    ringRadius: 0.8,
  },
  default: {
    base: '#f87171',
    emissive: '#b91c1c',
    glow: '#fecaca',
    geometry: 'sphere',
    scale: 0.74,
    glowScale: 2.4,
  },
};

const ENEMY_VISIBILITY_DEFAULTS = {
  glowScale: 2.4,
  glowHeight: 0.92,
  glowOpacityMin: 0.42,
  glowOpacityMax: 0.82,
  ringRadius: 0.74,
  ringOpacityMin: 0.34,
  ringOpacityMax: 0.64,
};

const ENEMY_EMISSIVE_MULTIPLIER = 1.32;
const ENEMY_EMISSIVE_FLOOR = 0.92;
const ENEMY_EMISSIVE_CEILING = 2.4;

const ORE_STYLES = {
  copper: { base: '#b87333', emissive: '#8c5523', crystal: '#f59e0b' },
  iron: { base: '#d1d5db', emissive: '#9ca3af', crystal: '#f1f5f9' },
  silver: { base: '#c0c0c0', emissive: '#94a3b8', crystal: '#e2e8f0' },
  gold: { base: '#facc15', emissive: '#f59e0b', crystal: '#fef08a' },
  default: { base: '#94a3b8', emissive: '#64748b', crystal: '#cbd5f5' },
};

const LOOT_STYLE = {
  body: '#fde68a',
  emissive: '#fbbf24',
  ring: '#fef3c7',
};

const EXIT_STYLE = {
  pedestal: '#111827',
  rune: '#38bdf8',
  beam: '#60a5fa',
  halo: '#1d4ed8',
};

const MAX_PIXEL_RATIO = 2.5;

function pseudoRandom(x, y) {
  return (Math.sin(x * 136.424 + y * 329.393) * 43758.5453) % 1;
}

function hashString(value) {
  let hash = 0;
  const str = String(value);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((mat) => mat?.dispose?.());
    return;
  }
  material.dispose?.();
}

export class WorldIsometricRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.supported = Boolean(canvas?.getContext);
    this.ready = false;
    this._initPromise = this.supported ? this._init() : Promise.resolve();
    this._colorCache = new Map();
    this._worldRef = null;
    this._tilesRef = null;
    this._pendingWorld = null;
    this.playerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.portalMeshes = new Map();
    this.oreMeshes = new Map();
    this.lootMeshes = new Map();
    this.exitEntry = null;
    this.oreGroup = null;
    this.lootGroup = null;
    this.exitGroup = null;
    this.terrainGroup = null;
  this.effectGroup = null;
    this.walkabilityGroup = null;
    this.walkOverlayMaterial = null;
    this.walkBarrierMaterial = null;
    this.walkBarrierCrossMaterial = null;
    this._terrainTextureCache = new Map();
  this.effectMeshes = new Map();
  this.weaponSwingStates = new Map();
    this.cameraDistance = 32;
    this.cameraElevation = Math.PI / 3.2;
    this.cameraAzimuth = Math.PI / 4;
    this.cameraLerp = 0.12;
    this._cameraTarget = null;
    this._cameraFocus = null;
    this._pointerVecNear = null;
    this._pointerVecFar = null;
    this._pointerDir = null;
    this._pointerIntersection = null;
  }

  _syncDungeonExit(exitInfo, levelId, time, exitColor) {
    if (!this.exitGroup) return;
    if (!levelId || !exitInfo) {
      if (this.exitEntry) {
        this.exitEntry.group.visible = false;
      }
      return;
    }
    if (!this.exitEntry) {
      this.exitEntry = this._createExitEntry();
      this.exitGroup.add(this.exitEntry.group);
    }
    const entry = this.exitEntry;
    const tint = exitColor ? this._getColor(exitColor) : this._getColor(EXIT_STYLE.rune);
    entry.group.visible = true;
    entry.group.position.set(exitInfo.x, 0, exitInfo.y);
    if (entry.ring?.material) {
      entry.ring.material.color.copy(tint);
      entry.ring.material.emissive?.copy?.(tint);
      if (entry.ring.material.emissiveIntensity !== undefined) {
        entry.ring.material.emissiveIntensity = 0.7 + Math.sin(time * 3) * 0.2;
      } else if (entry.ring.material.opacity !== undefined) {
        entry.ring.material.opacity = 0.28 + Math.sin(time * 2.4) * 0.08;
      }
    }
    if (entry.beam?.material?.color) {
      entry.beam.material.color.copy(tint);
      entry.beam.material.emissive?.copy?.(tint);
      if (entry.beam.material.emissiveIntensity !== undefined) {
        entry.beam.material.emissiveIntensity = 0.65 + Math.sin(time * 4 + entry.seed * 5) * 0.25;
      }
    }
    if (entry.glyph?.material) {
      entry.glyph.material.color.copy(tint);
      entry.glyph.material.opacity = 0.28 + Math.sin(time * 3.2) * 0.1;
    }
    if (entry.halo?.material) {
      entry.halo.material.opacity = 0.22 + Math.sin(time * 2.2 + entry.seed * 7) * 0.18;
      entry.halo.rotation.y = time * 0.8;
    }
    entry.ring.rotation.x = Math.PI / 2;
    entry.ring.rotation.z = time * 1.6;
    entry.beam.scale.y = 0.6 + Math.sin(time * 2 + entry.seed * 10) * 0.08;
    entry.animate?.(time);
  }

  _createExitEntry() {
    const {
      Group,
      Mesh,
      CylinderGeometry,
      MeshStandardMaterial,
      TorusGeometry,
      MeshBasicMaterial,
      RingGeometry,
    } = this.THREE;
    const group = new Group();
    const meshes = [];
    const addMesh = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const pedestal = addMesh(
      new Mesh(
        new CylinderGeometry(0.5, 0.7, 0.4, 24),
        new MeshStandardMaterial({ color: EXIT_STYLE.pedestal, roughness: 0.85, metalness: 0.18 })
      )
    );
    pedestal.position.y = 0.2;

    const glyph = addMesh(
      new Mesh(
        new RingGeometry(0.4, 1, 48),
        new MeshBasicMaterial({ color: EXIT_STYLE.rune, transparent: true, opacity: 0.32 })
      )
    );
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.y = 0.01;

    const ring = addMesh(
      new Mesh(
        new TorusGeometry(0.75, 0.09, 26, 80),
        new MeshStandardMaterial({
          color: EXIT_STYLE.rune,
          emissive: EXIT_STYLE.rune,
          emissiveIntensity: 0.68,
          metalness: 0.45,
          roughness: 0.28,
        })
      )
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.1;

    const beam = addMesh(
      new Mesh(
        new CylinderGeometry(0.18, 0.12, 2.2, 20, 1, true),
        new MeshStandardMaterial({
          color: EXIT_STYLE.beam,
          emissive: EXIT_STYLE.beam,
          transparent: true,
          opacity: 0.55,
          emissiveIntensity: 0.8,
          metalness: 0.18,
          roughness: 0.1,
        })
      )
    );
    beam.position.y = 1.3;

    const halo = addMesh(
      new Mesh(
        new TorusGeometry(1.3, 0.06, 24, 64),
        new MeshBasicMaterial({ color: EXIT_STYLE.halo, transparent: true, opacity: 0.2 })
      )
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.08;

    const seed = hashString('dungeon-exit');

    const dispose = () => {
      for (const mesh of meshes) {
        mesh.geometry?.dispose?.();
        disposeMaterial(mesh.material);
      }
    };

    const animate = (time) => {
      ring.rotation.y = time * 1.4;
      beam.material.opacity = 0.48 + Math.sin(time * 3.4) * 0.18;
    };

    return {
      group,
      ring,
      beam,
      glyph,
      halo,
      seed,
      dispose,
      animate,
    };
  }

  isReady() {
    return this.ready && this.supported;
  }

  async _init() {
    try {
      const THREE = await import(THREE_MODULE_URL);
      if (!THREE) {
        this.supported = false;
        return;
      }
      this.THREE = THREE;
      const {
        Scene,
        Color,
        FogExp2,
        WebGLRenderer,
        OrthographicCamera,
        Vector3,
        Group,
        AmbientLight,
        DirectionalLight,
        Mesh,
        CircleGeometry,
        MeshBasicMaterial,
        RingGeometry,
      } = THREE;

      this.scene = new Scene();
      this.scene.background = null;
      this.scene.fog = new FogExp2(new Color('#0f172a'), 0.02);

      this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1));
      const initialWidth = this.canvas?.clientWidth || this.canvas?.width || 1;
      const initialHeight = this.canvas?.clientHeight || this.canvas?.height || 1;
      this.renderer.setSize(initialWidth, initialHeight, false);
      this.renderer.autoClear = true;
      this.renderer.setClearColor(0x000000, 0);

      this.camera = new OrthographicCamera(-16, 16, 16, -16, 0.1, 200);
      this.camera.position.set(20, 22, 20);
      this.camera.lookAt(0, 0, 0);

    this.tileGroup = new Group();
    this.terrainGroup = new Group();
    this.decorGroup = new Group();
      this.portalGroup = new Group();
      this.safeGroup = new Group();
      this.walkabilityGroup = new Group();
      this.oreGroup = new Group();
      this.lootGroup = new Group();
      this.exitGroup = new Group();
    this.effectGroup = new Group();
      this.characterGroup = new Group();
    this.scene.add(this.tileGroup);
    this.scene.add(this.terrainGroup);
    this.scene.add(this.decorGroup);
      this.scene.add(this.portalGroup);
      this.scene.add(this.safeGroup);
      this.scene.add(this.walkabilityGroup);
      this.scene.add(this.oreGroup);
      this.scene.add(this.lootGroup);
      this.scene.add(this.exitGroup);
    this.scene.add(this.effectGroup);
      this.scene.add(this.characterGroup);

      this.ambientLight = new AmbientLight(0xf8fafc, 0.65);
      this.scene.add(this.ambientLight);

      this.sunLight = new DirectionalLight(0xfff6e0, 1.35);
      this.sunLight.position.set(26, 36, 18);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 0.1;
      this.sunLight.shadow.camera.far = 160;
      this.sunLight.shadow.camera.left = -60;
      this.sunLight.shadow.camera.right = 60;
      this.sunLight.shadow.camera.top = 60;
      this.sunLight.shadow.camera.bottom = -60;
      this.sunLight.shadow.bias = -0.0006;
      this.scene.add(this.sunLight);

      this.groundGlow = new Mesh(
        new CircleGeometry(220, 64),
        new MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.16 })
      );
      this.groundGlow.rotation.x = -Math.PI / 2;
      this.groundGlow.position.y = 0.01;
      this.scene.add(this.groundGlow);

      this.safeZoneMesh = new Mesh(
        new RingGeometry(1, 1.05, 96),
        new MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
      );
      this.safeZoneMesh.rotation.x = -Math.PI / 2;
      this.safeZoneMesh.visible = false;
      this.safeGroup.add(this.safeZoneMesh);

      this.ready = true;
      if (this._pendingWorld) {
        this.setWorld(this._pendingWorld);
        this._pendingWorld = null;
      }
    } catch (error) {
      console.warn('WorldIsometricRenderer: initialization failed', error);
      this.supported = false;
    }
  }

  setSize(width, height, dpr = 1) {
    if (!this.isReady()) return;
    const safeWidth = Math.max(1, Math.floor(width || 1));
    const safeHeight = Math.max(1, Math.floor(height || 1));
    const pixelRatio = Math.min(MAX_PIXEL_RATIO, Math.max(1, dpr || 1));

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(safeWidth, safeHeight, false);

    const aspect = safeWidth / safeHeight || 1;
    const viewSize = 18;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
  }

  screenPointToWorld(screenX, screenY, width, height) {
    if (!this.isReady()) return null;
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const { Vector3 } = this.THREE;
    if (!this._pointerVecNear) {
      this._pointerVecNear = new Vector3();
      this._pointerVecFar = new Vector3();
      this._pointerDir = new Vector3();
      this._pointerIntersection = new Vector3();
    }

    const ndcX = (screenX / width) * 2 - 1;
    const ndcY = -(screenY / height) * 2 + 1;

    this._pointerVecNear.set(ndcX, ndcY, -1).unproject(this.camera);
    this._pointerVecFar.set(ndcX, ndcY, 1).unproject(this.camera);
    this._pointerDir.copy(this._pointerVecFar).sub(this._pointerVecNear).normalize();

    const denom = this._pointerDir.y;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-5) {
      return null;
    }
    const distance = -this._pointerVecNear.y / denom;
    if (!Number.isFinite(distance) || distance < 0) {
      return null;
    }

    this._pointerIntersection.copy(this._pointerVecNear).addScaledVector(this._pointerDir, distance);
    return { x: this._pointerIntersection.x, y: this._pointerIntersection.z };
  }

  setWorld(world) {
    if (!world) {
      this._worldRef = null;
      this._tilesRef = null;
      if (this.isReady()) {
        this._disposeGroup(this.tileGroup);
        this._disposeGroup(this.terrainGroup, false);
        this._disposeGroup(this.decorGroup);
        this._disposeGroup(this.walkabilityGroup, false);
        this.walkOverlayMaterial = null;
        this.walkBarrierMaterial = null;
        this.walkBarrierCrossMaterial = null;
      } else {
        this._pendingWorld = null;
      }
      return;
    }
    if (!Array.isArray(world?.tiles)) {
      return;
    }
    if (!this.isReady()) {
      this._pendingWorld = world;
      return;
    }
    if (this._tilesRef === world.tiles) {
      return;
    }
    this._worldRef = world;
    this._tilesRef = world.tiles;
    this._buildWorld(world);
  }

  renderFrame(state = {}) {
    if (!this.supported) return;
    if (!this.isReady()) {
      this._initPromise?.then(() => this.renderFrame(state));
      return;
    }

    const width = state.width ?? this.canvas?.clientWidth ?? this.canvas?.width ?? 1;
    const height = state.height ?? this.canvas?.clientHeight ?? this.canvas?.height ?? 1;
    const dpr = state.dpr ?? (window.devicePixelRatio || 1);
    this.setSize(width, height, dpr);

    const world = state.world ?? this._worldRef;
    if (!world || !Array.isArray(world.tiles)) {
      this.renderer.clear(true, true, true);
      return;
    }
    if (world.tiles !== this._tilesRef) {
      this.setWorld(world);
    }

    const time = state.time ?? 0;
    const currentLevelId = state.levelId ?? null;

    this._syncLighting(state.levelTheme || null, currentLevelId);
    this._syncSafeZone(state.bank || null, currentLevelId);
    this._syncPortals(state.portals || [], currentLevelId, time);
    this._syncOreNodes(state.oreNodes || [], currentLevelId, time);
    this._syncLootDrops(state.lootDrops || [], currentLevelId, time);
    this._syncDungeonExit(state.dungeonExit || null, currentLevelId, time, state.exitColor || null);
    this._syncPlayers(state.players || [], state.localId ?? null, time, currentLevelId, state.chargeSnapshot || null);
    this._syncEnemies(state.enemies || [], time, currentLevelId);
  this._syncEffects(state.effects || [], time, currentLevelId);
    this._updateWalkabilityPulse(time, currentLevelId);

    const cameraX = state.cameraX ?? world.width / 2;
    const cameraY = state.cameraY ?? world.height / 2;
    this._updateCamera(cameraX, cameraY, time);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._initPromise = null;
    if (!this.supported) return;
    this.playerMeshes.clear();
    this.enemyMeshes.clear();
    this.portalMeshes.clear();
    this.oreMeshes.clear();
    this.lootMeshes.clear();
    if (this.exitEntry) {
      this.exitEntry.dispose?.();
      this.exitGroup?.remove(this.exitEntry.group);
      this.exitEntry = null;
    }
    this._enemyFactories = null;
    if (this.tileGroup) {
      this._disposeGroup(this.tileGroup);
    }
    if (this.decorGroup) {
      this._disposeGroup(this.decorGroup);
    }
    if (this.terrainGroup) {
      this._disposeGroup(this.terrainGroup);
    }
    if (this.portalGroup) {
      this._disposeGroup(this.portalGroup);
    }
    if (this.oreGroup) {
      this._disposeGroup(this.oreGroup);
    }
    if (this.lootGroup) {
      this._disposeGroup(this.lootGroup);
    }
    if (this.exitGroup) {
      this._disposeGroup(this.exitGroup);
    }
    if (this.effectGroup) {
      this._disposeGroup(this.effectGroup);
    }
    if (this.characterGroup) {
      this._disposeGroup(this.characterGroup);
    }
    if (this.safeGroup) {
      this._disposeGroup(this.safeGroup, false);
    }
    if (this.walkabilityGroup) {
      this._disposeGroup(this.walkabilityGroup);
      this.walkOverlayMaterial = null;
      this.walkBarrierMaterial = null;
      this.walkBarrierCrossMaterial = null;
    }
    this.effectMeshes.clear();
    this.weaponSwingStates.clear();
    this._terrainTextureCache.clear();
    this.renderer?.dispose?.();
  }

  _buildWorld(world) {
    if (!this.isReady()) return;
    const { tiles } = world;
    const rows = tiles.length;
    const cols = tiles[0]?.length ?? 0;
    if (!rows || !cols) {
      this._disposeGroup(this.tileGroup);
      this._disposeGroup(this.decorGroup);
      this._disposeGroup(this.terrainGroup, false);
      this._disposeGroup(this.walkabilityGroup, false);
      this.walkOverlayMaterial = null;
      this.walkBarrierMaterial = null;
      this.walkBarrierCrossMaterial = null;
      return;
    }

    const { BoxGeometry, MeshStandardMaterial, InstancedMesh, Object3D } = this.THREE;

  this._disposeGroup(this.tileGroup);
  this._disposeGroup(this.decorGroup);
  this._disposeGroup(this.terrainGroup, false);
    this._disposeGroup(this.walkabilityGroup, false);
    this.walkOverlayMaterial = null;
    this.walkBarrierMaterial = null;
    this.walkBarrierCrossMaterial = null;

    const baseGeometry = new BoxGeometry(1, 1, 1);
    const baseMaterial = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.05,
    });
    const instanceCount = rows * cols;
    const tileMesh = new InstancedMesh(baseGeometry, baseMaterial, instanceCount);
    tileMesh.receiveShadow = true;
    tileMesh.castShadow = false;

    const dummy = new Object3D();
    const color = new this.THREE.Color();
    const forest = [];
    const stones = [];
    const crystals = [];
    const embers = [];
    const walkableTiles = [];
    const barrierX = [];
    const barrierZ = [];
    let index = 0;
    for (let y = 0; y < rows; y += 1) {
      const row = tiles[y];
      for (let x = 0; x < cols; x += 1) {
        const tile = row?.[x] ?? 'grass';
        const height = TILE_HEIGHTS[tile] ?? 0.24;
        const px = x + 0.5;
        const pz = y + 0.5;
        dummy.position.set(px, height / 2, pz);
        dummy.scale.set(1, Math.max(0.08, height), 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tileMesh.setMatrixAt(index, dummy.matrix);

        color.copy(this._getColor(TILE_COLORS[tile] || '#2dd4bf'));
        tileMesh.setColorAt(index, color);

        const seed = pseudoRandom(x, y);
        const isWalkable = WALKABLE_TILE_TYPES.has(tile);
        if (isWalkable) {
          walkableTiles.push({ x: px, z: pz, height, type: tile, seed });
          const neighborOffsets = [
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 },
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 },
          ];
          for (const { dx, dz } of neighborOffsets) {
            const nx = x + dx;
            const nz = y + dz;
            const neighborTile = tiles[nz]?.[nx] ?? null;
            const neighborWalkable = neighborTile ? WALKABLE_TILE_TYPES.has(neighborTile) : false;
            if (!neighborWalkable) {
              const neighborHeight = neighborTile ? (TILE_HEIGHTS[neighborTile] ?? height) : height;
              const entry = {
                x: px + dx * 0.5,
                z: pz + dz * 0.5,
                height: Math.max(height, neighborHeight),
              };
              if (dz !== 0) {
                barrierX.push(entry);
              } else {
                barrierZ.push(entry);
              }
            }
          }
        }
        if (tile === 'forest' && seed > 0.35) {
          forest.push({
            x: px,
            z: pz,
            height,
            scale: 0.7 + seed * 0.6,
            twist: seed * Math.PI * 2,
            sway: (seed - 0.5) * 0.35,
          });
        } else if (tile === 'rock' && seed > 0.52) {
          stones.push({
            x: px,
            z: pz,
            height,
            scale: 0.5 + seed * 0.65,
            twist: seed * Math.PI * 2,
          });
        } else if (tile === 'glyph' && seed > 0.28) {
          crystals.push({
            x: px,
            z: pz,
            height,
            scale: 0.45 + seed * 0.55,
            twist: seed * Math.PI * 2,
          });
        } else if (tile === 'ember' && seed > 0.3) {
          embers.push({
            x: px,
            z: pz,
            height,
            scale: 0.4 + seed * 0.4,
            twist: seed * Math.PI * 2,
          });
        }
        index += 1;
      }
    }
    tileMesh.instanceMatrix.needsUpdate = true;
    if (tileMesh.instanceColor) {
      tileMesh.instanceColor.needsUpdate = true;
    }
    this.tileGroup.add(tileMesh);

    this._buildTerrainDetail(walkableTiles);
    this._buildDecor(forest, stones, crystals, embers);
    this._buildWalkabilityOverlay(walkableTiles, barrierX, barrierZ);
  }

  _buildDecor(forest, stones, crystals, embers) {
    const { Object3D, InstancedMesh, MeshStandardMaterial, ConeGeometry, IcosahedronGeometry, OctahedronGeometry } = this.THREE;
    const dummy = new Object3D();
    const addInstances = (items, geometry, materialOptions, heightOffset = 0) => {
      if (!items.length) return;
      const material = new MeshStandardMaterial(materialOptions);
      const mesh = new InstancedMesh(geometry, material, items.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        dummy.position.set(item.x, item.height + heightOffset, item.z);
        dummy.rotation.set(item.sway ?? 0, item.twist ?? 0, (item.roll ?? 0));
        const scale = item.scale ?? 1;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.decorGroup.add(mesh);
    };

    addInstances(
      forest,
      new ConeGeometry(0.4, 1.4, 9),
      { color: 0x14532d, emissive: 0x166534, roughness: 0.6, metalness: 0.08 },
      0.7
    );

    addInstances(
      stones,
      new IcosahedronGeometry(0.4, 0),
      { color: 0x94a3b8, emissive: 0x475569, roughness: 0.9, metalness: 0.05 },
      0.25
    );

    addInstances(
      crystals,
      new IcosahedronGeometry(0.32, 0),
      { color: 0x818cf8, emissive: 0x4338ca, emissiveIntensity: 0.8, roughness: 0.45, metalness: 0.35 },
      0.5
    );

    addInstances(
      embers,
      new OctahedronGeometry(0.35, 0),
      { color: 0xfb923c, emissive: 0xc2410c, emissiveIntensity: 0.7, roughness: 0.55, metalness: 0.25 },
      0.45
    );
  }

  _resolveArmorPalette(armorId) {
    const key = armorId && ARMOR_STYLES[armorId] ? armorId : 'default';
    return ARMOR_STYLES[key];
  }

  _resolveWeaponSpec(weaponId) {
    const base = WEAPON_STYLES[weaponId] || WEAPON_STYLES.default;
    return {
      type: base.type || 'staff',
      primary: base.primary || '#cbd5f5',
      accent: base.accent || '#38bdf8',
      pommel: base.pommel || base.accent || '#38bdf8',
      length: base.length ?? 1,
      thickness: base.thickness ?? 0.1,
      bladeWidth: base.bladeWidth ?? 0.14,
      bladeThickness: base.bladeThickness ?? 0.05,
      mount: base.mount || 'hand',
      idle: base.idle ? { ...base.idle } : null,
    };
  }

  _refreshPlayerCosmetics(entry, player, isSelf) {
    if (!entry?.group) return;
    const equipment = player?.equipment || {};
    const armorId = equipment.armor || null;
    const palette = this._resolveArmorPalette(armorId);
  const { body, armor, shoulderLeft, shoulderRight, belt, cloak } = entry.group.userData;
    if (entry.state.armorId !== armorId) {
      if (armor?.material) {
        armor.material.color.copy(this._getColor(palette.torso));
        armor.material.emissive.copy(this._getColor(palette.emissive));
      }
      if (shoulderLeft?.material) {
        shoulderLeft.material.color.copy(this._getColor(palette.trim));
        shoulderLeft.material.emissive.copy(this._getColor(palette.emissive));
      }
      if (shoulderRight?.material) {
        shoulderRight.material.color.copy(this._getColor(palette.trim));
        shoulderRight.material.emissive.copy(this._getColor(palette.emissive));
      }
      if (belt?.material) {
        belt.material.color.copy(this._getColor(palette.trim));
        belt.material.emissive.copy(this._getColor(palette.emissive));
      }
      if (cloak?.material) {
        cloak.material.color.copy(this._getColor(palette.cloak.base));
        cloak.material.emissive.copy(this._getColor(palette.cloak.edge));
      }
      if (body?.material) {
        body.material.color.copy(this._getColor(palette.undersuit));
        body.material.emissiveIntensity = isSelf ? 0.52 : 0.38;
      }
      entry.state.armorId = armorId;
    }
    const weaponSpec = this._ensureWeapon(entry, equipment.melee, isSelf);
    entry.state.weaponSpec = weaponSpec;
  }

  _ensureWeapon(entry, weaponId, isSelf) {
    const resolvedId = weaponId || 'melee-fist';
    if (entry.state.weaponId === resolvedId && entry.state.weaponSpec) {
      return entry.state.weaponSpec;
    }
    const spec = this._resolveWeaponSpec(resolvedId);
    this._rebuildWeapon(entry, spec, isSelf);
    entry.state.weaponId = resolvedId;
    entry.state.weaponSpec = spec;
    return spec;
  }

  _rebuildWeapon(entry, spec, isSelf) {
    const { Mesh, MeshStandardMaterial, MeshBasicMaterial, CylinderGeometry, BoxGeometry, SphereGeometry } = this.THREE;
    const pivot = entry.group.userData.weaponPivot;
    if (!pivot) return;
    if (pivot.userData.parts) {
      for (const part of pivot.userData.parts) {
        pivot.remove(part);
        part.geometry?.dispose?.();
        disposeMaterial(part.material);
      }
    }
    pivot.userData.parts = [];

    const addPart = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pivot.add(mesh);
      pivot.userData.parts.push(mesh);
      return mesh;
    };

    const primaryColor = this._getColor(spec.primary);
    const accentColor = this._getColor(spec.accent);
    const pommelColor = this._getColor(spec.pommel);

    pivot.visible = true;

    if (spec.type === 'blade') {
      const blade = addPart(
        new Mesh(
          new BoxGeometry(spec.bladeWidth, spec.bladeThickness, spec.length),
          new MeshStandardMaterial({
            color: primaryColor,
            emissive: accentColor,
            emissiveIntensity: 0.28,
            roughness: 0.24,
            metalness: 0.88,
          })
        )
      );
      blade.position.set(0, 0, spec.length / 2);

      const guard = addPart(
        new Mesh(
          new BoxGeometry(spec.bladeWidth * 1.8, spec.bladeThickness * 2.2, 0.14),
          new MeshStandardMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.4,
            roughness: 0.32,
            metalness: 0.62,
          })
        )
      );
      guard.position.set(0, 0, 0.12);

      const grip = addPart(
        new Mesh(
          new CylinderGeometry(spec.bladeThickness * 0.45, spec.bladeThickness * 0.45, 0.36, 14),
          new MeshStandardMaterial({
            color: pommelColor,
            emissive: accentColor,
            emissiveIntensity: 0.22,
            roughness: 0.42,
            metalness: 0.56,
          })
        )
      );
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0, 0, -0.18);
    } else if (spec.type === 'staff') {
      const rod = addPart(
        new Mesh(
          new CylinderGeometry(spec.thickness / 2, spec.thickness / 2, spec.length, 12),
          new MeshStandardMaterial({
            color: primaryColor,
            emissive: accentColor,
            emissiveIntensity: 0.2,
            roughness: 0.48,
            metalness: 0.36,
          })
        )
      );
      rod.rotation.x = Math.PI / 2;
      rod.position.set(0, 0, spec.length / 2 - 0.12);

      const cap = addPart(
        new Mesh(
          new SphereGeometry(spec.thickness * 0.7, 12, 10),
          new MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.9 })
        )
      );
      cap.position.set(0, 0, spec.length - 0.12);
    } else {
      const gauntlet = addPart(
        new Mesh(
          new BoxGeometry(0.26, 0.24, 0.34),
          new MeshStandardMaterial({
            color: primaryColor,
            emissive: accentColor,
            emissiveIntensity: 0.45,
            roughness: 0.38,
            metalness: 0.55,
          })
        )
      );
      gauntlet.position.set(0, 0, 0.24);
    }

    const trail = entry.group.userData.weaponTrail;
    if (trail?.material) {
      trail.material.color.copy(accentColor);
      trail.material.opacity = 0;
      trail.visible = false;
      trail.position.z = spec.type === 'fist' ? 0.3 : Math.min(1.4, (spec.length ?? 1) * 0.8);
      trail.position.y = spec.type === 'fist' ? 0 : 0.1;
    }
    pivot.userData.spec = spec;
    if (spec.type === 'fist') {
      pivot.position.set(0.28, 0.4, 0.08);
    } else {
      pivot.position.set(0.32, 0.46, 0);
    }
    if (!pivot.userData.basePosition) {
      pivot.userData.basePosition = new this.THREE.Vector3();
    }
    pivot.userData.basePosition.set(pivot.position.x, pivot.position.y, pivot.position.z);
  }

  _scheduleWeaponFollowThrough(ownerId, time, effect) {
    if (!ownerId) return;
  const lifetimeMs = Number(effect?.lifetime) || DEFAULT_EFFECT_LIFETIME;
    const duration = Math.max(0.18, Math.min(0.6, lifetimeMs / 1000));
    this.weaponSwingStates.set(ownerId, {
      until: time + duration,
      duration,
    });
  }

  _buildTerrainDetail(walkableTiles) {
    if (!this.terrainGroup) return;
    this._disposeGroup(this.terrainGroup, false);
    if (!walkableTiles || walkableTiles.length === 0) {
      return;
    }

    const {
      Object3D,
      InstancedMesh,
      MeshStandardMaterial,
      PlaneGeometry,
      DoubleSide,
      RepeatWrapping,
      LinearMipMapLinearFilter,
      LinearFilter,
    } = this.THREE;

    const tilesByType = new Map();
    for (const tile of walkableTiles) {
      const key = tile.type || 'default';
      if (!tilesByType.has(key)) {
        tilesByType.set(key, []);
      }
      tilesByType.get(key).push(tile);
    }

    if (tilesByType.size === 0) {
      return;
    }

    const dummy = new Object3D();
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);

    const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;

    for (const [type, tiles] of tilesByType.entries()) {
      const scheme = TERRAIN_TEXTURE_SCHEMES[type] || TERRAIN_TEXTURE_SCHEMES.default;
      const texture = this._getTerrainTexture(type);
      if (!texture) continue;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.needsUpdate = true;
      if (texture.repeat) {
        const repeatScalar = scheme.repeat ?? 2.4;
        texture.repeat.set(repeatScalar, repeatScalar);
      }
      if (texture.anisotropy !== maxAnisotropy) {
        texture.anisotropy = maxAnisotropy;
      }
      if (LinearMipMapLinearFilter) {
        texture.minFilter = LinearMipMapLinearFilter;
      }
      if (LinearFilter) {
        texture.magFilter = LinearFilter;
      }

      const material = new MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        side: DoubleSide,
        roughness: 0.82,
        metalness: 0.04,
        depthWrite: false,
      });

      const mesh = new InstancedMesh(geometry, material, tiles.length);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 1;

      for (let i = 0; i < tiles.length; i += 1) {
        const tile = tiles[i];
        const jitter = 0.92 + (tile.seed ?? 0) * 0.1;
        dummy.position.set(tile.x, tile.height + 0.022, tile.z);
        dummy.rotation.set(0, (tile.seed ?? 0) * Math.PI * 2, 0);
  dummy.scale.set(jitter, jitter, jitter);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      this.terrainGroup.add(mesh);
    }
  }

  _buildWalkabilityOverlay(walkableTiles, barrierX, barrierZ) {
    if (!this.walkabilityGroup) return;
    this._disposeGroup(this.walkabilityGroup, false);
    if ((!walkableTiles || walkableTiles.length === 0) && (!barrierX || barrierX.length === 0) && (!barrierZ || barrierZ.length === 0)) {
      this.walkOverlayMaterial = null;
      this.walkBarrierMaterial = null;
      this.walkBarrierCrossMaterial = null;
      return;
    }

    const { Object3D, InstancedMesh, MeshBasicMaterial, PlaneGeometry, BoxGeometry, DoubleSide } = this.THREE;
    const dummy = new Object3D();

    if (walkableTiles && walkableTiles.length) {
      this.walkOverlayMaterial = new MeshBasicMaterial({
        color: WALKABLE_OVERLAY_COLOR,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: DoubleSide,
      });
      const overlayGeometry = new PlaneGeometry(1, 1);
      const overlayMesh = new InstancedMesh(overlayGeometry, this.walkOverlayMaterial, walkableTiles.length);
      overlayMesh.renderOrder = 2;
      for (let i = 0; i < walkableTiles.length; i += 1) {
        const tile = walkableTiles[i];
        dummy.position.set(tile.x, tile.height + 0.025, tile.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(0.94, 0.94, 0.94);
        dummy.updateMatrix();
        overlayMesh.setMatrixAt(i, dummy.matrix);
      }
      overlayMesh.instanceMatrix.needsUpdate = true;
      this.walkabilityGroup.add(overlayMesh);
    }

    if (barrierX && barrierX.length) {
      this.walkBarrierMaterial = new MeshBasicMaterial({
        color: WALKABLE_BARRIER_COLOR,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      });
      const barrierGeometryX = new BoxGeometry(1, 0.52, 0.08);
      const barrierMeshX = new InstancedMesh(barrierGeometryX, this.walkBarrierMaterial, barrierX.length);
      barrierMeshX.renderOrder = 3;
      for (let i = 0; i < barrierX.length; i += 1) {
        const segment = barrierX[i];
        dummy.position.set(segment.x, segment.height + 0.26, segment.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.96, 1, 0.9);
        dummy.updateMatrix();
        barrierMeshX.setMatrixAt(i, dummy.matrix);
      }
      barrierMeshX.instanceMatrix.needsUpdate = true;
      this.walkabilityGroup.add(barrierMeshX);
    } else {
      this.walkBarrierMaterial = null;
    }

    if (barrierZ && barrierZ.length) {
      this.walkBarrierCrossMaterial = new MeshBasicMaterial({
        color: WALKABLE_BARRIER_COLOR,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      });
      const barrierGeometryZ = new BoxGeometry(0.08, 0.52, 1);
      const barrierMeshZ = new InstancedMesh(barrierGeometryZ, this.walkBarrierCrossMaterial, barrierZ.length);
      barrierMeshZ.renderOrder = 3;
      for (let i = 0; i < barrierZ.length; i += 1) {
        const segment = barrierZ[i];
        dummy.position.set(segment.x, segment.height + 0.26, segment.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.9, 1, 0.96);
        dummy.updateMatrix();
        barrierMeshZ.setMatrixAt(i, dummy.matrix);
      }
      barrierMeshZ.instanceMatrix.needsUpdate = true;
      this.walkabilityGroup.add(barrierMeshZ);
    } else {
      this.walkBarrierCrossMaterial = null;
    }
  }

  _getTerrainTexture(type) {
    const cacheKey = TERRAIN_TEXTURE_SCHEMES[type] ? type : 'default';
    if (this._terrainTextureCache?.has(cacheKey)) {
      return this._terrainTextureCache.get(cacheKey);
    }
    if (!this._terrainTextureCache) {
      this._terrainTextureCache = new Map();
    }

    const scheme = TERRAIN_TEXTURE_SCHEMES[cacheKey] || TERRAIN_TEXTURE_SCHEMES.default;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.fillStyle = scheme.base;
    ctx.fillRect(0, 0, size, size);

    const fract = (value) => value - Math.floor(value);

    const drawNoise = (count, color, minRadius, maxRadius, alphaRange, seedOffset = 0) => {
      if (count <= 0) return;
      ctx.fillStyle = color;
      for (let i = 0; i < count; i += 1) {
        const u = fract(pseudoRandom(seedOffset + i * 0.73, seedOffset + i * 1.19));
        const v = fract(pseudoRandom(seedOffset + i * 2.17, seedOffset + i * 0.37));
        const w = fract(pseudoRandom(seedOffset + i * 3.61, seedOffset + i * 1.41));
        const x = Math.floor(u * size);
        const y = Math.floor(v * size);
        const radius = minRadius + w * (maxRadius - minRadius);
        const alpha = (alphaRange.min ?? 0.05) + w * ((alphaRange.max ?? 0.2) - (alphaRange.min ?? 0.05));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const highlightCount = Math.floor(size * scheme.highlightDensity * 6.5);
    const accentCount = Math.floor(size * scheme.accentDensity * 5.2);
    const shadowCount = Math.floor(size * scheme.highlightDensity * 4.2);

    drawNoise(highlightCount, scheme.highlight, 0.6, 2.6, { min: 0.06, max: 0.16 }, 11.3);
    drawNoise(accentCount, scheme.accent, 0.5, 1.8, { min: 0.12, max: 0.28 }, 47.9);
    drawNoise(shadowCount, scheme.shadow, 0.5, 2.1, { min: 0.04, max: 0.12 }, 83.7);

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.07)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new this.THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture && this.THREE.SRGBColorSpace) {
      texture.colorSpace = this.THREE.SRGBColorSpace;
    } else if ('encoding' in texture && this.THREE.sRGBEncoding) {
      texture.encoding = this.THREE.sRGBEncoding;
    }

    texture.needsUpdate = true;

    this._terrainTextureCache.set(cacheKey, texture);
    return texture;
  }

  _syncLighting(theme, levelId) {
    if (!this.isReady()) return;
    if (levelId) {
      this.ambientLight.intensity = 0.55;
      this.sunLight.intensity = 1.1;
      this.scene.fog.density = 0.028;
      const fogColor = theme?.background || '#020617';
      this.scene.fog.color.copy(this._getColor(fogColor));
    } else {
      this.ambientLight.intensity = 0.72;
      this.sunLight.intensity = 1.35;
      this.scene.fog.density = 0.018;
      const fogColor = theme?.background || '#0f172a';
      this.scene.fog.color.copy(this._getColor(fogColor));
    }
  }

  _syncSafeZone(bank, levelId) {
    if (!this.safeZoneMesh) return;
    if (!bank || levelId) {
      this.safeZoneMesh.visible = false;
      return;
    }
    const radius = Math.max(0, Number(bank.radius) || 0);
    this.safeZoneMesh.visible = radius > 0.1;
    if (this.safeZoneMesh.visible) {
      const scale = radius;
      this.safeZoneMesh.scale.set(scale, scale, scale);
      this.safeZoneMesh.position.set(bank.x, 0.05, bank.y);
    }
  }

  _syncPortals(portalsInput, levelId, time) {
    const portals = Array.isArray(portalsInput) ? portalsInput : portalsInput instanceof Map ? Array.from(portalsInput.values()) : [];
    const active = new Set();
    for (const portal of portals) {
      if (!portal) continue;
      if (levelId) {
        continue;
      }
      const id = portal.id ?? `${portal.x}-${portal.y}`;
      active.add(id);
      let group = this.portalMeshes.get(id);
      if (!group) {
        group = this._createPortalMesh(portal);
        this.portalMeshes.set(id, group);
        this.portalGroup.add(group);
      }
      const baseColor = this._getColor(portal.color || '#fbbf24');
      group.position.set(portal.x, 0, portal.y);
      const pulse = Math.sin(time * 2 + hashString(id) * Math.PI * 2) * 0.2 + 0.8;
      group.children.forEach((child) => {
        if (child.material) {
          if (child.userData?.variant === 'ring') {
            child.material.opacity = 0.28 + pulse * 0.12;
          } else if (child.material.emissive) {
            child.material.emissive.copy(baseColor);
            child.material.color.copy(baseColor);
            child.material.emissiveIntensity = 0.6 + pulse * 0.25;
          }
        }
      });
      group.visible = true;
    }
    for (const [id, mesh] of this.portalMeshes.entries()) {
      if (!active.has(id)) {
        this.portalGroup.remove(mesh);
        mesh.traverse((child) => {
          disposeMaterial(child.material);
          child.geometry?.dispose?.();
        });
        this.portalMeshes.delete(id);
      }
    }
  }

  _createPortalMesh(portal) {
    const { Group, Mesh, CylinderGeometry, MeshStandardMaterial, TorusGeometry, MeshBasicMaterial } = this.THREE;
    const group = new Group();
    const color = this._getColor(portal.color || '#fbbf24');

    const pedestal = new Mesh(
      new CylinderGeometry(0.32, 0.45, 0.35, 18),
      new MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85, metalness: 0.12 })
    );
    pedestal.position.y = 0.17;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    const torus = new Mesh(
      new TorusGeometry(0.6, 0.11, 22, 64),
      new MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.35 })
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.95;
    torus.castShadow = true;
    group.add(torus);

    const ring = new Mesh(
      new this.THREE.CircleGeometry(0.82, 48),
      new MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 })
    );
    ring.userData.variant = 'ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    return group;
  }

  _syncOreNodes(nodesInput, levelId, time) {
    if (!this.oreGroup) return;
    if (levelId) {
      if (this.oreMeshes.size) {
        for (const [id, entry] of this.oreMeshes.entries()) {
          this.oreGroup.remove(entry.group);
          entry.dispose();
          this.oreMeshes.delete(id);
        }
      }
      return;
    }
    const nodes = nodesInput instanceof Map ? Array.from(nodesInput.values()) : Array.isArray(nodesInput) ? nodesInput : [];
    const active = new Set();
    for (const node of nodes) {
      if (!node) continue;
      const id = node.id ?? `${node.x}-${node.y}`;
      active.add(id);
      let entry = this.oreMeshes.get(id);
      if (!entry) {
        entry = this._createOreEntry(node);
        this.oreMeshes.set(id, entry);
        this.oreGroup.add(entry.group);
      }
      const ratio = node.maxAmount ? Math.max(0, Math.min(1, node.amount / node.maxAmount)) : 1;
      const meta = entry.meta;
      const pulse = 0.6 + Math.sin(time * 1.8 + entry.seed * Math.PI * 2) * 0.2;
      entry.group.position.set(node.x, 0, node.y);
      const depletionScale = 0.55 + ratio * 0.55;
      entry.group.scale.setScalar(depletionScale);
      if (entry.crystal?.material?.emissive) {
        entry.crystal.material.emissiveIntensity = 0.45 + ratio * 0.55 + pulse * 0.25;
        entry.crystal.material.color.copy(meta.crystalColor);
        entry.crystal.material.emissive.copy(meta.crystalColor);
      }
      const spin = time * 0.9 + entry.seed * 6.28;
      entry.crystal.rotation.set(Math.sin(spin * 0.6) * 0.3, spin, 0);
      if (entry.shards) {
        for (let i = 0; i < entry.shards.length; i += 1) {
          const shard = entry.shards[i];
          const offset = (entry.seed + i * 0.17) * 12.57;
          shard.rotation.y = spin * 1.2 + offset;
          shard.position.y = 0.5 + Math.sin(time * 2.4 + offset) * 0.08;
          shard.material.emissiveIntensity = 0.35 + ratio * 0.35 + pulse * 0.2;
        }
      }
      entry.group.visible = ratio > 0.05;
    }
    for (const [id, entry] of this.oreMeshes.entries()) {
      if (!active.has(id)) {
        this.oreGroup.remove(entry.group);
        entry.dispose();
        this.oreMeshes.delete(id);
      }
    }
  }

  _createOreEntry(node) {
    const {
      Group,
      Mesh,
      CylinderGeometry,
      MeshStandardMaterial,
      OctahedronGeometry,
      TetrahedronGeometry,
    } = this.THREE;
    const type = node.type || 'default';
    const metaRaw = ORE_STYLES[type] || ORE_STYLES.default;
    const meta = {
      baseColor: this._getColor(metaRaw.base),
      emissiveColor: this._getColor(metaRaw.emissive),
      crystalColor: this._getColor(metaRaw.crystal),
    };
    const group = new Group();
    group.position.set(node.x || 0, 0, node.y || 0);
    group.castShadow = false;
    group.receiveShadow = false;
    const meshes = [];
    const addMesh = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const base = addMesh(
      new Mesh(
        new CylinderGeometry(0.42, 0.58, 0.55, 8, 1, false),
        new MeshStandardMaterial({ color: meta.baseColor, emissive: meta.emissiveColor, roughness: 0.5, metalness: 0.32 })
      )
    );
    base.position.y = 0.27;

    const crystal = addMesh(
      new Mesh(
        new OctahedronGeometry(0.36, 0),
        new MeshStandardMaterial({
          color: meta.crystalColor,
          emissive: meta.crystalColor,
          emissiveIntensity: 0.65,
          metalness: 0.6,
          roughness: 0.28,
        })
      )
    );
    crystal.position.y = 0.82;

    const shards = [];
    const shardGeometry = new TetrahedronGeometry(0.18, 0);
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2;
      const radius = 0.5;
      const shard = addMesh(
        new Mesh(
          shardGeometry.clone(),
          new MeshStandardMaterial({
            color: meta.crystalColor,
            emissive: meta.crystalColor,
            emissiveIntensity: 0.45,
            metalness: 0.48,
            roughness: 0.32,
          })
        )
      );
      shard.position.set(Math.cos(angle) * radius, 0.45, Math.sin(angle) * radius);
      shards.push(shard);
    }

    const seed = hashString(node.id ?? `${node.x}-${node.y}-${type}`);

    return {
      group,
      base,
      crystal,
      shards,
      meta,
      seed,
      dispose: () => {
        for (const mesh of meshes) {
          mesh.geometry?.dispose?.();
          disposeMaterial(mesh.material);
        }
      },
    };
  }

  _syncLootDrops(dropsInput, levelId, time) {
    if (!this.lootGroup) return;
    const drops = dropsInput instanceof Map ? Array.from(dropsInput.values()) : Array.isArray(dropsInput) ? dropsInput : [];
    const active = new Set();
    for (const drop of drops) {
      if (!drop || (drop.levelId || null) !== (levelId || null)) continue;
      const id = drop.id ?? `${drop.x}-${drop.y}-${drop.item ?? 'loot'}`;
      active.add(id);
      let entry = this.lootMeshes.get(id);
      if (!entry) {
        entry = this._createLootEntry(drop);
        this.lootMeshes.set(id, entry);
        this.lootGroup.add(entry.group);
      }
      entry.group.position.set(drop.x, 0, drop.y);
      const bob = Math.sin(time * 2.4 + entry.seed * 8) * 0.12 + 0.6;
      entry.core.position.y = bob;
      entry.core.rotation.y = time * 2 + entry.seed * 6.283;
      entry.core.material.emissiveIntensity = 0.6 + Math.sin(time * 3.6 + entry.seed * 5) * 0.25;
      if (entry.halo) {
        const flicker = 0.45 + Math.sin(time * 4 + entry.seed * 11) * 0.2;
        entry.halo.material.opacity = 0.22 + flicker * 0.2;
        entry.halo.rotation.z = time * 1.4;
      }
      entry.group.visible = true;
    }
    for (const [id, entry] of this.lootMeshes.entries()) {
      if (!active.has(id)) {
        this.lootGroup.remove(entry.group);
        entry.dispose();
        this.lootMeshes.delete(id);
      }
    }
  }

  _createLootEntry(drop) {
    const {
      Group,
      Mesh,
      OctahedronGeometry,
      MeshStandardMaterial,
      MeshBasicMaterial,
      RingGeometry,
    } = this.THREE;
    const group = new Group();
    const meshes = [];
    const addMesh = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };
    const bodyColor = this._getColor(LOOT_STYLE.body);
    const emissiveColor = this._getColor(LOOT_STYLE.emissive);

    const core = addMesh(
      new Mesh(
        new OctahedronGeometry(0.32, 0),
        new MeshStandardMaterial({
          color: bodyColor,
          emissive: emissiveColor,
          emissiveIntensity: 0.75,
          metalness: 0.65,
          roughness: 0.25,
        })
      )
    );
    core.position.y = 0.6;

    const halo = addMesh(
      new Mesh(
        new RingGeometry(0.45, 0.68, 36),
        new MeshBasicMaterial({ color: LOOT_STYLE.ring, transparent: true, opacity: 0.32 })
      )
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.08;

    const seed = hashString(drop.id ?? `${drop.x}-${drop.y}-${drop.item ?? 'loot'}`);

    return {
      group,
      core,
      halo,
      seed,
      dispose: () => {
        for (const mesh of meshes) {
          mesh.geometry?.dispose?.();
          disposeMaterial(mesh.material);
        }
      },
    };
  }

  _syncPlayers(playersInput, localId, time, levelId) {
    const players = playersInput instanceof Map ? Array.from(playersInput.values()) : playersInput;
    const active = new Set();
    for (const player of players) {
      if (!player || !player.id) continue;
      const playerLevel = player.levelId || null;
      if (playerLevel !== (levelId || null)) continue;
      const id = player.id;
      active.add(id);
      const isSelf = id === localId;
      const mesh = this._ensurePlayerMesh(id, isSelf);
      this._updatePlayerMesh(mesh, player, isSelf, time);
    }
    for (const [id, mesh] of this.playerMeshes.entries()) {
      if (!active.has(id)) {
        this.characterGroup.remove(mesh.group);
        mesh.dispose();
        this.playerMeshes.delete(id);
        this.weaponSwingStates.delete(id);
      }
    }
  }

  _ensurePlayerMesh(id, isSelf) {
    if (this.playerMeshes.has(id)) {
      return this.playerMeshes.get(id);
    }
    const {
      Group,
      Mesh,
      CapsuleGeometry,
      MeshStandardMaterial,
      MeshBasicMaterial,
      CircleGeometry,
      SphereGeometry,
      CylinderGeometry,
      PlaneGeometry,
  TorusGeometry,
  DoubleSide,
  Vector3,
    } = this.THREE;
    const style = isSelf ? PLAYER_STYLES.self : PLAYER_STYLES.ally;
    const armorPalette = this._resolveArmorPalette(null);
    const group = new Group();

    const cloak = new Mesh(
      new PlaneGeometry(1.32, 1.62, 1, 6),
      new MeshStandardMaterial({
        color: armorPalette.cloak.base,
        emissive: armorPalette.cloak.edge,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.9,
        side: DoubleSide,
        roughness: 0.82,
        metalness: 0.08,
        depthWrite: false,
      })
    );
    cloak.position.set(0, 0.38, -0.36);
    cloak.rotation.x = -0.42;
    cloak.castShadow = false;
    cloak.receiveShadow = false;
    group.add(cloak);

    const body = new Mesh(
      new CapsuleGeometry(0.3, 0.68, 8, 16),
      new MeshStandardMaterial({
        color: armorPalette.undersuit,
        emissive: style.emissive,
        emissiveIntensity: 0.4,
        roughness: 0.42,
        metalness: 0.18,
      })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const armor = new Mesh(
      new CapsuleGeometry(0.36, 0.32, 12, 18),
      new MeshStandardMaterial({
        color: armorPalette.torso,
        emissive: armorPalette.emissive,
        emissiveIntensity: 0.35,
        roughness: 0.28,
        metalness: 0.68,
      })
    );
    armor.scale.set(1.14, 0.7, 0.82);
    armor.position.y = 0.36;
    armor.castShadow = true;
    group.add(armor);

    const shoulderL = new Mesh(
      new TorusGeometry(0.32, 0.08, 12, 28, Math.PI),
      new MeshStandardMaterial({
        color: armorPalette.trim,
        emissive: armorPalette.emissive,
        emissiveIntensity: 0.25,
        roughness: 0.32,
        metalness: 0.52,
      })
    );
    shoulderL.rotation.set(Math.PI / 2, 0, Math.PI / 2.4);
    shoulderL.position.set(-0.28, 0.54, 0);
    shoulderL.castShadow = true;
    group.add(shoulderL);
    const shoulderR = new Mesh(
      new TorusGeometry(0.32, 0.08, 12, 28, Math.PI),
      new MeshStandardMaterial({
        color: armorPalette.trim,
        emissive: armorPalette.emissive,
        emissiveIntensity: 0.25,
        roughness: 0.32,
        metalness: 0.52,
      })
    );
    shoulderR.rotation.set(Math.PI / 2, 0, -Math.PI / 2.4);
    shoulderR.position.set(0.28, 0.54, 0);
    shoulderR.castShadow = true;
    group.add(shoulderR);

    const belt = new Mesh(
      new CylinderGeometry(0.36, 0.36, 0.18, 20, 1, true),
      new MeshStandardMaterial({
        color: armorPalette.trim,
        emissive: armorPalette.emissive,
        emissiveIntensity: 0.18,
        roughness: 0.38,
        metalness: 0.42,
        transparent: true,
        opacity: 0.92,
      })
    );
    belt.rotation.y = Math.PI / 6;
    belt.position.y = 0.15;
    belt.scale.set(1, 0.9, 1);
    belt.castShadow = false;
    group.add(belt);

    const head = new Mesh(
      new SphereGeometry(0.24, 16, 16),
      new MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.65, metalness: 0.05 })
    );
    head.position.y = 0.68;
    head.castShadow = true;
    group.add(head);

    const ring = new Mesh(
      new CircleGeometry(0.56, 36),
      new MeshBasicMaterial({ color: style.ring, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.userData.variant = 'ring';
    group.add(ring);

    const weaponPivot = new Group();
    weaponPivot.position.set(0.32, 0.46, 0);
    weaponPivot.userData.parts = [];
  weaponPivot.userData.basePosition = new Vector3().copy(weaponPivot.position);
    group.add(weaponPivot);

    const weaponTrail = new Mesh(
      new PlaneGeometry(0.18, 1.4, 1, 12),
      new MeshBasicMaterial({
        color: style.ring,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
      })
    );
    weaponTrail.material.depthTest = false;
  weaponTrail.material.toneMapped = false;
  weaponTrail.renderOrder = 8;
    weaponTrail.visible = false;
    weaponTrail.rotation.y = Math.PI / 2;
    weaponTrail.position.set(0, 0.1, 0.6);
    weaponPivot.add(weaponTrail);

    group.userData.seed = hashString(id);
    group.userData.body = body;
    group.userData.head = head;
    group.userData.ring = ring;
    group.userData.armor = armor;
    group.userData.shoulderLeft = shoulderL;
    group.userData.shoulderRight = shoulderR;
    group.userData.belt = belt;
    group.userData.cloak = cloak;
    group.userData.weaponPivot = weaponPivot;
    group.userData.weaponTrail = weaponTrail;
    group.userData.accentHex = style.ring;

    this.characterGroup.add(group);

    const entry = {
      group,
      state: {
        armorId: null,
        weaponId: null,
        lastCharge: 0,
      },
      dispose: () => {
        body.geometry?.dispose?.();
        disposeMaterial(body.material);
        head.geometry?.dispose?.();
        disposeMaterial(head.material);
        ring.geometry?.dispose?.();
        disposeMaterial(ring.material);
        armor.geometry?.dispose?.();
        disposeMaterial(armor.material);
        belt.geometry?.dispose?.();
        disposeMaterial(belt.material);
        shoulderL.geometry?.dispose?.();
        disposeMaterial(shoulderL.material);
        shoulderR.geometry?.dispose?.();
        disposeMaterial(shoulderR.material);
        cloak.geometry?.dispose?.();
        disposeMaterial(cloak.material);
        weaponTrail.geometry?.dispose?.();
        disposeMaterial(weaponTrail.material);
        for (const part of weaponPivot.userData.parts || []) {
          part.geometry?.dispose?.();
          disposeMaterial(part.material);
        }
      },
    };
    this.playerMeshes.set(id, entry);
    return entry;
  }

  _updatePlayerMesh(entry, player, isSelf, time) {
    const group = entry.group;
    const body = group.userData.body;
    const head = group.userData.head;
    const ring = group.userData.ring;
    const cloak = group.userData.cloak;
    const armor = group.userData.armor;
    const shoulderLeft = group.userData.shoulderLeft;
    const shoulderRight = group.userData.shoulderRight;
    const weaponPivot = group.userData.weaponPivot;
    const weaponTrail = group.userData.weaponTrail;
    const seed = group.userData.seed || 0;

    this._refreshPlayerCosmetics(entry, player, isSelf);
  const spec = entry.state.weaponSpec || this._resolveWeaponSpec(entry.state.weaponId || 'melee-fist');

    group.position.set(player.x, 0, player.y);
    const aim = player.aim || { x: 1, y: 0 };
    const yaw = Math.atan2(aim.x || 0, aim.y || 1);
    group.rotation.y = yaw;

    const charge = Math.max(0, Math.min(1, player.chargeRatio ?? 0));
    const bob = Math.sin(time * 3.4 + seed * Math.PI * 2) * 0.08;
    body.position.y = 0.35 + bob * 0.4;
    head.position.y = 0.68 + bob * 0.55;
    if (cloak) {
      const cloakSway = Math.sin(time * 1.8 + seed * 5.3) * 0.12;
      cloak.rotation.x = -0.42 - charge * 0.32 + cloakSway * 0.45;
      cloak.position.z = -0.36 - Math.abs(cloakSway) * 0.12 - charge * 0.12;
      cloak.material.opacity = Math.min(1, 0.82 + Math.min(0.15, Math.abs(cloakSway) * 0.2) + charge * 0.12);
    }

    const charging = Boolean(player.charging) || charge > 0.05;
    ring.material.opacity = charging ? 0.45 + charge * 0.4 : 0.3;
    ring.scale.setScalar(1 + charge * 0.3);
    if (body.material?.emissive) {
      body.material.emissiveIntensity = charging ? 0.75 + charge * 0.4 : 0.48;
    }
    if (armor?.material?.emissive) {
      armor.material.emissiveIntensity = charging ? 0.4 + charge * 0.65 : 0.35;
    }
    if (shoulderLeft?.material?.emissive) {
      const intensity = charging ? 0.32 + charge * 0.5 : 0.24;
      shoulderLeft.material.emissiveIntensity = intensity;
      shoulderRight.material.emissiveIntensity = intensity;
    }
    if (!isSelf && player.health != null && player.maxHealth) {
      const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth));
      ring.material.color.copy(this._getColor(ratio > 0.45 ? '#fb923c' : '#f87171'));
    } else if (isSelf) {
      ring.material.color.copy(this._getColor(PLAYER_STYLES.self.ring));
    }

    if (weaponPivot) {
      const swingState = this.weaponSwingStates.get(player.id) || null;
      let swingProgress = 0;
      if (swingState) {
        const remaining = swingState.until - time;
        if (remaining <= 0) {
          this.weaponSwingStates.delete(player.id);
        } else {
          swingProgress = 1 - remaining / swingState.duration;
        }
      }
      const followThrough = swingProgress > 0 ? Math.sin(Math.min(1, swingProgress) * Math.PI) : 0;
      const windup = charging ? charge : charge * 0.3;
      weaponPivot.rotation.x = -0.9 * windup + followThrough * 1.4;
      weaponPivot.rotation.y = 0.24 * windup;
      weaponPivot.rotation.z = -followThrough * 0.8;
      const basePos = weaponPivot.userData.basePosition;
      const baseY = basePos ? basePos.y : weaponPivot.position.y;
      weaponPivot.position.y = baseY + Math.sin(time * 3.2 + seed * 4.1) * 0.02;
      if (basePos) {
        weaponPivot.position.x = basePos.x;
        weaponPivot.position.z = basePos.z;
      }

      if (weaponTrail?.material) {
        if (followThrough > 0.01 && spec && spec.type !== 'fist') {
          weaponTrail.visible = true;
          weaponTrail.material.opacity = 0.45 * followThrough;
          const trailScale = 1 + (spec.length ?? 1) * 0.1;
          weaponTrail.scale.set(trailScale, trailScale, 1);
          weaponTrail.rotation.z = followThrough * 0.5;
        } else {
          weaponTrail.visible = false;
          weaponTrail.material.opacity = 0;
          weaponTrail.rotation.z = 0;
          weaponTrail.scale.set(1, 1, 1);
        }
      }
    }
  }

  _syncEnemies(enemiesInput, time, levelId) {
    const enemies = enemiesInput instanceof Map ? Array.from(enemiesInput.values()) : enemiesInput;
    const active = new Set();
    for (const enemy of enemies) {
      if (!enemy || !enemy.id) continue;
      const enemyLevel = enemy.levelId || null;
      if (enemyLevel !== (levelId || null)) continue;
      const id = enemy.id;
      active.add(id);
      const type = enemy.type || 'default';
      const factory = this._ensureEnemyFactory(type);
      let entry = this.enemyMeshes.get(id);
      if (!entry) {
        entry = factory(enemy);
        this.enemyMeshes.set(id, entry);
        this.characterGroup.add(entry.group);
      }
      this._updateEnemy(entry, enemy, time);
    }
    for (const [id, entry] of this.enemyMeshes.entries()) {
      if (!active.has(id)) {
        this.characterGroup.remove(entry.group);
        entry.dispose();
        this.enemyMeshes.delete(id);
      }
    }
  }

  _syncEffects(effectsInput, time, levelId) {
    if (!this.effectGroup) return;
    const effects = Array.isArray(effectsInput)
      ? effectsInput
      : effectsInput instanceof Map
      ? Array.from(effectsInput.values())
      : [];
    const active = new Set();
    for (const effect of effects) {
      if (!effect) continue;
      if ((effect.levelId || null) !== (levelId || null)) continue;
      if (effect.type !== 'melee') continue;
      const id = effect.id || `${effect.owner || 'unknown'}-${effect.expiresAt || ''}`;
      active.add(id);
      let entry = this.effectMeshes.get(id);
      if (!entry) {
        entry = this._createMeleeEffectEntry(effect);
        this.effectMeshes.set(id, entry);
        this.effectGroup.add(entry.group);
        this._scheduleWeaponFollowThrough(effect.owner, time, effect);
      }
      this._updateMeleeEffectEntry(entry, effect, time);
    }
    for (const [id, entry] of this.effectMeshes.entries()) {
      if (!active.has(id)) {
        this.effectGroup.remove(entry.group);
        entry.dispose();
        this.effectMeshes.delete(id);
      }
    }
  }

  _createMeleeEffectEntry(effect) {
    const { Group, Mesh, CircleGeometry, MeshBasicMaterial } = this.THREE;
    const angle = Math.max(Math.PI / 6, typeof effect.angle === 'number' ? effect.angle : Math.PI * 0.6);
    const group = new Group();
    const geometry = new CircleGeometry(1, 48, -angle / 2, angle);
    const color = this._getColor(this._resolveMeleeEffectColor(effect));
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    material.depthTest = false;
  material.toneMapped = false;
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 6;
    group.add(mesh);

    const halo = new Mesh(
      new CircleGeometry(1, 48, -angle / 2, angle),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false })
    );
    halo.material.depthTest = false;
  halo.material.toneMapped = false;
    halo.rotation.x = -Math.PI / 2;
    halo.renderOrder = 5;
    group.add(halo);

    return {
      group,
      mesh,
      halo,
      angle,
      dispose: () => {
        mesh.geometry?.dispose?.();
        disposeMaterial(mesh.material);
        halo.geometry?.dispose?.();
        disposeMaterial(halo.material);
      },
    };
  }

  _updateMeleeEffectEntry(entry, effect, time) {
    const range = Math.max(0.4, effect.length ?? effect.range ?? 1);
    entry.group.position.set(effect.x, 0.02, effect.y);
    const aim = effect.aim || { x: 1, y: 0 };
    const yaw = Math.atan2(aim.x || 0, aim.y || 1);
    entry.group.rotation.y = yaw;

    entry.mesh.scale.set(range, range, range);
    entry.halo.scale.set(range * 0.62, range * 0.62, range * 0.62);

    const lifetime = Math.max(0.1, (Number(effect.lifetime) || DEFAULT_EFFECT_LIFETIME) / 1000);
    const ttl = Math.max(0, (Number(effect.ttl) || 0) / 1000);
    const alpha = lifetime > 0 ? Math.max(0, Math.min(1, ttl / lifetime)) : 0;

    const baseColor = this._getColor(this._resolveMeleeEffectColor(effect));
    entry.mesh.material.color.copy(baseColor);
    entry.mesh.material.opacity = 0.48 * alpha;
    entry.halo.material.opacity = 0.18 * alpha;
  }

  _resolveMeleeEffectColor(effect) {
    const key = effect?.variant && MELEE_VARIANT_COLORS[effect.variant] ? effect.variant : 'default';
    return MELEE_VARIANT_COLORS[key];
  }

  _updateWalkabilityPulse(time) {
    if (this.walkOverlayMaterial) {
      const base = 0.16;
      const pulse = Math.sin(time * 1.6) * 0.04;
      this.walkOverlayMaterial.opacity = Math.max(0.08, base + pulse);
    }
    if (this.walkBarrierMaterial) {
      const base = 0.22;
      const pulse = Math.sin(time * 2.3) * 0.05;
      this.walkBarrierMaterial.opacity = Math.max(0.1, base + pulse);
    }
    if (this.walkBarrierCrossMaterial) {
      const base = 0.22;
      const pulse = Math.sin(time * 2.3 + Math.PI / 2) * 0.05;
      this.walkBarrierCrossMaterial.opacity = Math.max(0.1, base + pulse);
    }
  }

  _ensureEnemyFactory(type) {
    if (!this._enemyFactories) {
      this._enemyFactories = new Map();
    }
    if (this._enemyFactories.has(type)) {
      return this._enemyFactories.get(type);
    }
    const factory = (source) => this._createEnemyEntry(type, source);
    this._enemyFactories.set(type, factory);
    return factory;
  }

  _createEnemyEntry(type, source) {
    const {
      Group,
      Mesh,
      MeshStandardMaterial,
      MeshBasicMaterial,
      CircleGeometry,
      SphereGeometry,
      TorusGeometry,
      ConeGeometry,
      CapsuleGeometry,
      IcosahedronGeometry,
      Sprite,
      SpriteMaterial,
      AdditiveBlending,
    } = this.THREE;
    const meta = ENEMY_STYLES[type] || ENEMY_STYLES.default;
    const group = new Group();
    const meshes = [];
    const emissiveMultiplier = meta.emissiveMultiplier ?? ENEMY_EMISSIVE_MULTIPLIER;
    const emissiveFloor = meta.emissiveFloor ?? ENEMY_EMISSIVE_FLOOR;
    const emissiveCeiling = meta.emissiveCeiling ?? ENEMY_EMISSIVE_CEILING;
    const boostMaterial = (material) => {
      if (!material) return;
      if (Array.isArray(material)) {
        material.forEach((mat) => boostMaterial(mat));
        return;
      }
      if (typeof material.emissiveIntensity === 'number') {
        const next = Math.min(
          Math.max(material.emissiveIntensity * emissiveMultiplier, emissiveFloor),
          emissiveCeiling
        );
        material.emissiveIntensity = next;
      }
    };
    const addMesh = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      boostMaterial(mesh.material);
      return mesh;
    };

  const baseColor = this._getColor(meta.base).clone();
  baseColor.lerp(this._getColor('#f8fafc'), 0.1);
    const emissiveColor = this._getColor(meta.emissive).clone();
    emissiveColor.lerp(this._getColor('#ffffff'), 0.18);
    const glowColor = this._getColor(meta.glow || meta.emissive || meta.base).clone();
    glowColor.lerp(this._getColor('#ffffff'), 0.24);

    const glowScale = meta.glowScale ?? ENEMY_VISIBILITY_DEFAULTS.glowScale;
    const glowHeight = meta.glowHeight ?? ENEMY_VISIBILITY_DEFAULTS.glowHeight;
    const glowOpacityMin = meta.glowOpacityMin ?? ENEMY_VISIBILITY_DEFAULTS.glowOpacityMin;
    const glowOpacityMax = Math.max(glowOpacityMin, meta.glowOpacityMax ?? ENEMY_VISIBILITY_DEFAULTS.glowOpacityMax);
    const ringRadius = meta.ringRadius ?? ENEMY_VISIBILITY_DEFAULTS.ringRadius;
    const ringOpacityMin = meta.ringOpacityMin ?? ENEMY_VISIBILITY_DEFAULTS.ringOpacityMin;
    const ringOpacityMax = Math.max(ringOpacityMin, meta.ringOpacityMax ?? ENEMY_VISIBILITY_DEFAULTS.ringOpacityMax);

    const ring = addMesh(
      new Mesh(
        new CircleGeometry(ringRadius, 48),
        new MeshBasicMaterial({
          color: glowColor.clone(),
          transparent: true,
          opacity: (ringOpacityMin + ringOpacityMax) / 2,
          depthWrite: false,
          blending: AdditiveBlending,
        })
      )
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.userData.variant = 'ring';
    ring.renderOrder = 1;

    const glow = addMesh(
      new Sprite(
        new SpriteMaterial({
          color: glowColor,
          transparent: true,
          opacity: (glowOpacityMin + glowOpacityMax) / 2,
          depthWrite: false,
          depthTest: true,
          blending: AdditiveBlending,
        })
      )
    );
    glow.scale.set(glowScale, glowScale, 1);
    glow.position.y = glowHeight;
    glow.userData.variant = 'glow';
    glow.renderOrder = 2;
  glow.castShadow = false;
  glow.receiveShadow = false;
  parts.glow = glow;

    const seed = hashString(source?.id ?? `${type}-template`);
    let core = null;
    const parts = {};
    let animate = null;
    let floatBase = 0.1;
    let floatAmplitude = 0.08;
    let floatSpeed = 2.4;

    if (type === 'slime') {
      floatBase = 0;
      floatAmplitude = 0;
      const shell = addMesh(
        new Mesh(
          new SphereGeometry(0.55, 32, 24),
          new MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.5,
            roughness: 0.25,
            metalness: 0.18,
            transparent: true,
            opacity: 0.88,
          })
        )
      );
      shell.position.y = 0.44;
      const innerColor = baseColor.clone().offsetHSL(0, 0, 0.18);
      const inner = addMesh(
        new Mesh(
          new SphereGeometry(0.36, 24, 18),
          new MeshStandardMaterial({
            color: innerColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.3,
            roughness: 0.32,
            metalness: 0.15,
            transparent: true,
            opacity: 0.76,
          })
        )
      );
      inner.position.y = 0.42;
      const bubble = addMesh(
        new Mesh(
          new SphereGeometry(0.16, 18, 12),
          new MeshStandardMaterial({
            color: emissiveColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.82,
            roughness: 0.12,
            metalness: 0.32,
            transparent: true,
            opacity: 0.9,
          })
        )
      );
      bubble.position.set(0.2, 0.83, 0.1);
      core = shell;
      parts.shell = shell;
      parts.inner = inner;
      parts.bubble = bubble;
      animate = (entry, _enemy, t) => {
        const wobble = Math.sin(t * 3.2 + entry.seed * 6.28) * 0.18;
        shell.scale.set(1 + wobble * 0.12, 1 - wobble * 0.18, 1 + wobble * 0.12);
        inner.scale.setScalar(0.95 + wobble * 0.08);
        bubble.position.y = 0.83 + Math.sin(t * 4.1 + entry.seed * 8) * 0.05;
        bubble.rotation.y = t * 1.6;
        if (shell.material?.emissiveIntensity != null) {
          shell.material.emissiveIntensity = 0.55 + Math.abs(wobble) * 0.6;
        }
      };
    } else if (type === 'wolf') {
      floatBase = 0;
      floatAmplitude = 0;
      floatSpeed = 0;
      const body = addMesh(
        new Mesh(
          new CapsuleGeometry(0.24, 0.82, 12, 20),
          new MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.55,
            roughness: 0.32,
            metalness: 0.38,
          })
        )
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.36;
      const headColor = baseColor.clone().offsetHSL(0, 0, -0.08);
      const head = addMesh(
        new Mesh(
          new SphereGeometry(0.26, 22, 18),
          new MeshStandardMaterial({
            color: headColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.55,
            roughness: 0.34,
            metalness: 0.32,
          })
        )
      );
      head.position.set(0.5, 0.6, 0);
      const tail = addMesh(
        new Mesh(
          new ConeGeometry(0.12, 0.46, 12),
          new MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.45,
            roughness: 0.4,
            metalness: 0.26,
          })
        )
      );
      tail.rotation.z = -Math.PI / 2.8;
      tail.position.set(-0.54, 0.52, 0);
      const earGeometry = new ConeGeometry(0.09, 0.18, 8);
      const leftEar = addMesh(
        new Mesh(
          earGeometry,
          new MeshStandardMaterial({
            color: emissiveColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.6,
            roughness: 0.3,
            metalness: 0.4,
          })
        )
      );
      leftEar.position.set(0.6, 0.84, 0.16);
      leftEar.rotation.x = Math.PI / 2.6;
      const rightEar = addMesh(
        new Mesh(
          earGeometry.clone(),
          leftEar.material.clone()
        )
      );
      rightEar.position.set(0.6, 0.84, -0.16);
      rightEar.rotation.x = Math.PI / 2.6;
      core = body;
      parts.head = head;
      parts.tail = tail;
      parts.ears = [leftEar, rightEar];
      animate = (entry, enemy, t) => {
        const stride = Math.sin(t * 6 + entry.seed * 4.1) * 0.08;
        entry.group.position.y += Math.abs(stride) * 0.05;
        head.position.y = 0.6 + Math.cos(t * 3 + entry.seed * 6) * 0.04;
        tail.rotation.y = Math.sin(t * 7 + entry.seed * 3) * 0.55;
        tail.rotation.x = -Math.PI / 2.8 + Math.sin(t * 3.2 + entry.seed * 5) * 0.08;
        const aim = enemy?.aim || enemy?.targetDirection || null;
        if (aim && (aim.x || aim.y)) {
          const yaw = Math.atan2(aim.x || 0, aim.y || 1);
          entry.group.rotation.y = yaw;
        }
      };
    } else if (type === 'wisp') {
      floatBase = 0.32;
      floatAmplitude = 0.12;
      floatSpeed = 2.8;
      const coreMesh = addMesh(
        new Mesh(
          new IcosahedronGeometry(0.38, 0),
          new MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.82,
            roughness: 0.24,
            metalness: 0.2,
          })
        )
      );
      coreMesh.position.y = 0.52;
      const orb = addMesh(
        new Mesh(
          new SphereGeometry(0.52, 26, 20),
          new MeshStandardMaterial({
            color: baseColor.clone().offsetHSL(0, 0.05, 0.18),
            emissive: emissiveColor,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.58,
            roughness: 0.18,
            metalness: 0.12,
          })
        )
      );
      orb.position.y = 0.52;
      const halo = addMesh(
        new Mesh(
          new TorusGeometry(0.58, 0.05, 20, 48),
          new MeshBasicMaterial({ color: emissiveColor, transparent: true, opacity: 0.34, depthWrite: false })
        )
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.08;
      core = coreMesh;
      parts.orb = orb;
      parts.halo = halo;
      animate = (entry, _enemy, t) => {
        coreMesh.rotation.y = t * 1.8;
        coreMesh.rotation.x = Math.sin(t * 1.4) * 0.4;
        orb.material.opacity = 0.52 + Math.sin(t * 3 + entry.seed * 5) * 0.18;
        orb.scale.setScalar(1 + Math.sin(t * 2.6 + entry.seed * 7) * 0.08);
        halo.rotation.z = t * 1.2;
      };
    } else {
      floatBase = 0.18;
      floatAmplitude = 0.08;
      floatSpeed = 2.2;
      const prism = addMesh(
        new Mesh(
          new IcosahedronGeometry(0.42, 0),
          new MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.7,
            roughness: 0.28,
            metalness: 0.24,
          })
        )
      );
      prism.position.y = 0.42;
      const spikeGeometry = new ConeGeometry(0.12, 0.38, 8);
      const spikes = [];
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * Math.PI * 2;
        const spike = addMesh(
          new Mesh(
            spikeGeometry.clone(),
            new MeshStandardMaterial({
              color: emissiveColor,
              emissive: emissiveColor,
              emissiveIntensity: 0.6,
              roughness: 0.25,
              metalness: 0.38,
            })
          )
        );
        spike.position.set(Math.cos(angle) * 0.4, 0.7, Math.sin(angle) * 0.4);
        spike.rotation.x = -Math.PI / 3;
        spikes.push(spike);
      }
      core = prism;
      parts.spikes = spikes;
      animate = (entry, _enemy, t) => {
        prism.rotation.y = t * 1.6;
        prism.rotation.x = Math.sin(t * 1.2 + entry.seed * 5) * 0.3;
        spikes.forEach((spike, idx) => {
          spike.rotation.y = t * 1.5 + idx * (Math.PI * 0.66);
          spike.material.emissiveIntensity = 0.55 + Math.sin(t * 3.4 + idx) * 0.25;
        });
      };
    }

    const dispose = () => {
      for (const mesh of meshes) {
        mesh.geometry?.dispose?.();
        disposeMaterial(mesh.material);
      }
    };

    return {
      group,
      core,
      ring,
      parts,
      seed,
      meta,
      animate,
      floatBase,
      floatAmplitude,
      floatSpeed,
      glow,
      glowScale,
      glowOpacityRange: [glowOpacityMin, glowOpacityMax],
      ringOpacityRange: [ringOpacityMin, ringOpacityMax],
      dispose,
    };
  }

  _updateEnemy(entry, enemy, time) {
    const scaleBase = entry?.meta?.scale ?? ENEMY_STYLES.default.scale;
    const radiusScale = enemy.radius ? enemy.radius / 0.5 : 1;
    const scale = scaleBase * radiusScale;
    const phase = time * (entry.floatSpeed || 2.2) + entry.seed * 6.283;
    const floatOffset = entry.floatAmplitude ? entry.floatBase + Math.sin(phase) * entry.floatAmplitude : entry.floatBase;
    entry.group.position.set(enemy.x, floatOffset, enemy.y);
    entry.group.scale.set(scale, scale, scale);
    const aim = enemy.aim || enemy.direction || enemy.heading;
    if (aim && (aim.x || aim.y)) {
      const yaw = Math.atan2(aim.x || 0, aim.y || 1);
      entry.group.rotation.y = yaw;
    } else if (typeof enemy.rotation === 'number') {
      entry.group.rotation.y = enemy.rotation;
    }
    if (entry.parts?.glow) {
      const glowSprite = entry.parts.glow;
      const [glowMin, glowMax] = entry.glowOpacityRange || [
        ENEMY_VISIBILITY_DEFAULTS.glowOpacityMin,
        ENEMY_VISIBILITY_DEFAULTS.glowOpacityMax,
      ];
      const glowPulse = 0.5 + 0.5 * Math.sin(time * 3.8 + entry.seed * 6.3);
      const glowScaleBase = entry.glowScale ?? ENEMY_VISIBILITY_DEFAULTS.glowScale;
      const glowScalePulse = 1 + Math.sin(time * 3.1 + entry.seed * 5.7) * 0.18;
      glowSprite.scale.set(glowScaleBase * glowScalePulse, glowScaleBase * glowScalePulse, 1);
      if (glowSprite.material) {
        glowSprite.material.opacity = glowMin + (glowMax - glowMin) * glowPulse;
      }
    }
    if (entry.ring?.material) {
      const [ringMin, ringMax] = entry.ringOpacityRange || [
        ENEMY_VISIBILITY_DEFAULTS.ringOpacityMin,
        ENEMY_VISIBILITY_DEFAULTS.ringOpacityMax,
      ];
      const ringPulse = 0.5 + 0.5 * Math.sin(time * 4 + entry.seed * 5);
      entry.ring.material.opacity = ringMin + (ringMax - ringMin) * ringPulse;
      entry.ring.rotation.z = time * 1.5;
    }
    if (entry.animate) {
      entry.animate(entry, enemy, time);
    }
  }

  _updateCamera(targetX, targetY, time) {
    const { Vector3 } = this.THREE;
    if (!this._cameraTarget) {
      this._cameraTarget = new Vector3(targetX + 0.5, 0, targetY + 0.5);
      this._cameraFocus = this._cameraTarget.clone();
    }
    const desired = new Vector3(targetX + 0.5, 0, targetY + 0.5);
    this._cameraFocus.lerp(desired, this.cameraLerp);
    const distance = this.cameraDistance;
    const elevation = this.cameraElevation;
    const azimuth = this.cameraAzimuth;
    const planar = Math.cos(elevation) * distance;
    const height = Math.sin(elevation) * distance;
    const offsetX = Math.cos(azimuth) * planar;
    const offsetZ = Math.sin(azimuth) * planar;

    this.camera.position.set(
      this._cameraFocus.x + offsetX,
      height,
      this._cameraFocus.z + offsetZ
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._cameraFocus.x, 0, this._cameraFocus.z);
    this.sunLight.position.set(this._cameraFocus.x + 14, height + 12, this._cameraFocus.z - 18);
    if (this.groundGlow) {
      this.groundGlow.position.set(this._cameraFocus.x, 0.01, this._cameraFocus.z);
      this.groundGlow.material.opacity = 0.14 + Math.sin(time * 0.6) * 0.02;
    }
  }

  _disposeGroup(group, disposeSelf = true) {
    if (!group) return;
    for (let i = group.children.length - 1; i >= 0; i -= 1) {
      const child = group.children[i];
      group.remove(child);
      child.traverse?.((node) => {
        disposeMaterial(node.material);
        node.geometry?.dispose?.();
      });
    }
    if (disposeSelf) {
      group.traverse?.((node) => {
        disposeMaterial(node.material);
        node.geometry?.dispose?.();
      });
    }
  }

  _getColor(hex) {
    const key = String(hex || '#ffffff').toLowerCase();
    if (!this._colorCache.has(key)) {
      this._colorCache.set(key, new this.THREE.Color(key));
    }
    return this._colorCache.get(key);
  }
}
