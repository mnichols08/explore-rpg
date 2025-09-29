const THREE_MODULE_URL = 'https://cdn.skypack.dev/three@0.164.0';

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
  slime: { base: '#0ea5e9', emissive: '#155e75', geometry: 'sphere', scale: 0.68 },
  wolf: { base: '#facc15', emissive: '#c2410c', geometry: 'cone', scale: 0.82 },
  wisp: { base: '#c084fc', emissive: '#7c3aed', geometry: 'icosa', scale: 0.7 },
  emberling: { base: '#fb923c', emissive: '#b91c1c', geometry: 'icosa', scale: 0.74 },
  warden: { base: '#f97316', emissive: '#9a3412', geometry: 'cone', scale: 0.9 },
  phantom: { base: '#38bdf8', emissive: '#1e3a8a', geometry: 'sphere', scale: 0.72 },
  seer: { base: '#c4b5fd', emissive: '#4338ca', geometry: 'icosa', scale: 0.74 },
  default: { base: '#f87171', emissive: '#b91c1c', geometry: 'sphere', scale: 0.74 },
};

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
    this.cameraDistance = 32;
    this.cameraElevation = Math.PI / 3.2;
    this.cameraAzimuth = Math.PI / 4;
    this.cameraLerp = 0.12;
    this._cameraTarget = null;
    this._cameraFocus = null;
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
      this.decorGroup = new Group();
      this.portalGroup = new Group();
      this.safeGroup = new Group();
    this.oreGroup = new Group();
    this.lootGroup = new Group();
    this.exitGroup = new Group();
      this.characterGroup = new Group();
      this.scene.add(this.tileGroup);
      this.scene.add(this.decorGroup);
      this.scene.add(this.portalGroup);
      this.scene.add(this.safeGroup);
    this.scene.add(this.oreGroup);
    this.scene.add(this.lootGroup);
    this.scene.add(this.exitGroup);
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

  setWorld(world) {
    if (!world) {
      this._worldRef = null;
      this._tilesRef = null;
      if (this.isReady()) {
        this._disposeGroup(this.tileGroup);
        this._disposeGroup(this.decorGroup);
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
    if (this.characterGroup) {
      this._disposeGroup(this.characterGroup);
    }
    if (this.safeGroup) {
      this._disposeGroup(this.safeGroup, false);
    }
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
      return;
    }

    const { BoxGeometry, MeshStandardMaterial, InstancedMesh, Object3D } = this.THREE;

    this._disposeGroup(this.tileGroup);
    this._disposeGroup(this.decorGroup);

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

    this._buildDecor(forest, stones, crystals, embers);
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
    } = this.THREE;
    const style = isSelf ? PLAYER_STYLES.self : PLAYER_STYLES.ally;
    const group = new Group();
    const body = new Mesh(
      new CapsuleGeometry(0.32, 0.7, 8, 16),
      new MeshStandardMaterial({
        color: style.base,
        emissive: style.emissive,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.22,
      })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

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

    group.userData.seed = hashString(id);
    group.userData.body = body;
    group.userData.head = head;
    group.userData.ring = ring;

    this.characterGroup.add(group);

    const entry = {
      group,
      dispose: () => {
        body.geometry?.dispose?.();
        disposeMaterial(body.material);
        head.geometry?.dispose?.();
        disposeMaterial(head.material);
        ring.geometry?.dispose?.();
        disposeMaterial(ring.material);
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
    const seed = group.userData.seed || 0;

    group.position.set(player.x, 0, player.y);
    const aim = player.aim || { x: 1, y: 0 };
    const yaw = Math.atan2(aim.x || 0, aim.y || 1);
    group.rotation.y = yaw;

    const bob = Math.sin(time * 3.4 + seed * Math.PI * 2) * 0.08;
    body.position.y = 0.35 + bob * 0.4;
    head.position.y = 0.68 + bob * 0.55;

    const charge = Math.max(0, Math.min(1, player.chargeRatio ?? 0));
    const charging = Boolean(player.charging) || charge > 0.05;
    ring.material.opacity = charging ? 0.45 + charge * 0.4 : 0.3;
    ring.scale.setScalar(1 + charge * 0.3);
    if (body.material?.emissive) {
      body.material.emissiveIntensity = charging ? 0.75 + charge * 0.5 : 0.55;
    }
    if (!isSelf && player.health != null && player.maxHealth) {
      const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth));
      ring.material.color.copy(this._getColor(ratio > 0.45 ? '#fb923c' : '#f87171'));
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
    } = this.THREE;
    const meta = ENEMY_STYLES[type] || ENEMY_STYLES.default;
    const group = new Group();
    const meshes = [];
    const addMesh = (mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const baseColor = this._getColor(meta.base).clone();
    const emissiveColor = this._getColor(meta.emissive).clone();

    const ring = addMesh(
      new Mesh(
        new CircleGeometry(0.58, 32),
        new MeshBasicMaterial({ color: emissiveColor, transparent: true, opacity: 0.26, depthWrite: false })
      )
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.userData.variant = 'ring';

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
    if (entry.ring?.material) {
      entry.ring.material.opacity = 0.22 + Math.sin(time * 4 + entry.seed * 5) * 0.1;
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
