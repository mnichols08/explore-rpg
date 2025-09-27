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

    .hud .bottom-right {
      justify-self: end;
      align-self: end;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
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

    .chat-entry {
      position: absolute;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      min-width: 260px;
      max-width: min(420px, 80vw);
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.9);
      padding: 0.5rem 0.75rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 1rem 2rem rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(6px);
      gap: 0.5rem;
      align-items: center;
    }

    .chat-entry[hidden] {
      display: none;
    }

    .chat-entry input {
      all: unset;
      width: 100%;
      font-size: 0.9rem;
      color: #f8fafc;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    }

    .chat-entry input::placeholder {
      color: rgba(148, 163, 184, 0.7);
    }

    .resource-panel {
      min-width: 220px;
      max-width: 360px;
      background: rgba(15, 23, 42, 0.82);
      border-radius: 0.85rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 0.75rem 1rem;
      color: #e2e8f0;
      font-size: 0.78rem;
      line-height: 1.4;
      box-shadow: 0 0.85rem 2.4rem rgba(8, 15, 31, 0.45);
      backdrop-filter: blur(6px);
      display: grid;
      gap: 0.65rem;
    }

    .resource-panel.flash {
      animation: resourceFlash 480ms ease;
    }

    .resource-panel h4 {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.85);
    }

    .resource-panel .totals {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.78rem;
      color: #f8fafc;
    }

    .resource-panel ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
      max-height: 9rem;
      overflow-y: auto;
    }

    .resource-panel ul li {
      display: flex;
      justify-content: space-between;
      gap: 0.45rem;
      padding: 0.25rem 0.35rem;
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 0.5rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.74rem;
    }

    .resource-panel ul li.empty {
      justify-content: center;
      color: rgba(148, 163, 184, 0.6);
      border-style: dashed;
      font-style: italic;
    }

    .resource-panel ul li span:first-child {
      color: rgba(226, 232, 240, 0.85);
    }

    .resource-panel ul li span:last-child {
      color: rgba(148, 163, 184, 0.85);
    }

    .resource-panel .status {
      padding: 0.35rem 0.5rem;
      border-radius: 0.5rem;
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.22);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .resource-panel .status span {
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      color: #f8fafc;
    }

    @keyframes resourceFlash {
      0% {
        box-shadow: 0 0 0 rgba(56, 189, 248, 0.5);
      }
      40% {
        box-shadow: 0 0 1.5rem rgba(56, 189, 248, 0.55);
      }
      100% {
        box-shadow: 0 0 0 rgba(56, 189, 248, 0.0);
      }
    }

    .bank-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .bank-actions button {
      all: unset;
      cursor: pointer;
      padding: 0.4rem 0.75rem;
      border-radius: 0.55rem;
      background: rgba(56, 189, 248, 0.18);
      border: 1px solid rgba(56, 189, 248, 0.45);
      color: #e0f2fe;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: background 150ms ease, border 150ms ease, transform 150ms ease, color 150ms ease;
    }

    .bank-actions button:hover:not([disabled]) {
      background: rgba(56, 189, 248, 0.3);
      border-color: rgba(125, 211, 252, 0.65);
    }

    .bank-actions button:active:not([disabled]) {
      transform: translateY(1px);
    }

    .bank-actions button[disabled] {
      cursor: default;
      background: rgba(71, 85, 105, 0.35);
      border-color: rgba(100, 116, 139, 0.35);
      color: rgba(148, 163, 184, 0.6);
    }

    .bank-feedback {
      font-size: 0.72rem;
      color: rgba(148, 163, 184, 0.85);
      min-height: 1.1rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
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
  Press Enter to chat with nearby heroes. Tap E to gather resources or scoop up loose loot.<br />
  Inside the glowing safe zone, use the bank panel to deposit or sell your haul.
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
    <div class="bottom-right">
      <div class="resource-panel" data-inventory-panel>
        <div>
          <h4>Inventory</h4>
          <div class="totals"><span>Currency</span><span data-inventory-currency>0</span></div>
          <ul data-inventory-items></ul>
        </div>
        <div>
          <h4>Bank</h4>
          <div class="totals"><span>Vault</span><span data-bank-currency>0</span></div>
          <ul data-bank-items></ul>
        </div>
        <div class="status" data-safe-zone-status>
          <span>Safe Zone</span>
          <span data-safe-zone-indicator>Unknown</span>
        </div>
        <div class="bank-actions" data-bank-actions>
          <button type="button" data-bank-deposit disabled>Deposit All</button>
          <button type="button" data-bank-withdraw disabled>Withdraw All</button>
          <button type="button" data-bank-sell disabled>Sell Ores</button>
        </div>
        <div class="bank-feedback" data-bank-feedback></div>
      </div>
    </div>
    <div class="message" hidden data-message>Connecting...</div>
  </div>
  <div class="chat-entry" hidden data-chat-entry>
    <input type="text" maxlength="140" placeholder="Type a message" data-chat-input />
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

const CHARGE_TIME_BONUS = 0.75;
const CHARGE_GLOW_STYLE = {
  melee: { fill: 'rgba(239, 68, 68, 0.35)', stroke: 'rgba(248, 113, 113, 0.9)' },
  ranged: { fill: 'rgba(249, 115, 22, 0.32)', stroke: 'rgba(251, 191, 36, 0.95)' },
  spell: { fill: 'rgba(59, 130, 246, 0.35)', stroke: 'rgba(96, 165, 250, 0.95)' },
  default: { fill: 'rgba(148, 163, 184, 0.28)', stroke: 'rgba(226, 232, 240, 0.85)' },
};
const CHAT_LIFETIME_MS = 6000;
const CHAT_MAX_LENGTH = 140;
const CHAT_MAX_WIDTH = 240;
const CHAT_LINE_HEIGHT = 16;
const ORE_COLOR = {
  copper: '#b87333',
  iron: '#d1d5db',
  silver: '#c0c0c0',
  gold: '#facc15',
};
const LOOT_COLOR = '#f97316';
const SAFE_ZONE_STYLE = {
  stroke: 'rgba(56, 189, 248, 0.55)',
  fill: 'rgba(14, 165, 233, 0.12)',
};

function wrapChatLines(ctx, text, maxWidth) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      let remainder = word;
      while (remainder.length) {
        let sliceLength = remainder.length;
        while (sliceLength > 1 && ctx.measureText(remainder.slice(0, sliceLength)).width > maxWidth) {
          sliceLength -= 1;
        }
        const segment = remainder.slice(0, sliceLength) + (sliceLength < remainder.length ? '-' : '');
        lines.push(segment);
        remainder = remainder.slice(sliceLength);
      }
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 4);
}

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
  this.chatEntry = this.shadowRoot.querySelector('[data-chat-entry]');
  this.chatInput = this.shadowRoot.querySelector('[data-chat-input]');
    this.inventoryPanel = this.shadowRoot.querySelector('[data-inventory-panel]');
    this.inventoryCurrencyEl = this.shadowRoot.querySelector('[data-inventory-currency]');
    this.inventoryItemsEl = this.shadowRoot.querySelector('[data-inventory-items]');
    this.bankCurrencyEl = this.shadowRoot.querySelector('[data-bank-currency]');
    this.bankItemsEl = this.shadowRoot.querySelector('[data-bank-items]');
    this.safeZoneStatusEl = this.shadowRoot.querySelector('[data-safe-zone-status]');
    this.safeZoneIndicatorEl = this.shadowRoot.querySelector('[data-safe-zone-indicator]');
  this.bankActionsEl = this.shadowRoot.querySelector('[data-bank-actions]');
  this.bankDepositButton = this.shadowRoot.querySelector('[data-bank-deposit]');
  this.bankWithdrawButton = this.shadowRoot.querySelector('[data-bank-withdraw]');
  this.bankSellButton = this.shadowRoot.querySelector('[data-bank-sell]');
  this.bankFeedbackEl = this.shadowRoot.querySelector('[data-bank-feedback]');
    this._handleChatInputKeydown = this._handleChatInputKeydown.bind(this);
    this._submitChatMessage = this._submitChatMessage.bind(this);
    this._exitChatMode = this._exitChatMode.bind(this);

    this.world = null;
    this.players = new Map();
    this.effects = [];
  this.enemies = new Map();
  this.chats = new Map();
    this.oreNodes = new Map();
    this.lootDrops = new Map();
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
    this.inventory = { currency: 0, items: {} };
    this.bankInventory = { currency: 0, items: {} };
    this.bankInfo = null;
    this.keys = new Set();
    this.pointerAim = { x: 1, y: 0 };
    this.lastInputSent = 0;
  this.lastInteractSent = 0;
    this.tileSize = 36;
    this.activeAction = null;
    this.actionStart = 0;
    this.pointerButtons = 0;
    this.knownEffects = new Set();
  this.profileId = null;
  this.pendingProfileId = undefined;
    this.chatActive = false;

  this.lastSafeZoneState = null;

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
    this._handleBankDeposit = this._handleBankDeposit.bind(this);
    this._handleBankWithdraw = this._handleBankWithdraw.bind(this);
    this._handleBankSell = this._handleBankSell.bind(this);
    this.bankFeedbackTimer = null;
    this._updateBankButtons(false);
    this._showBankFeedback('');
    this._updateInventoryPanel();
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
    this.chatInput?.addEventListener('keydown', this._handleChatInputKeydown);
  this.bankDepositButton?.addEventListener('click', this._handleBankDeposit);
  this.bankWithdrawButton?.addEventListener('click', this._handleBankWithdraw);
  this.bankSellButton?.addEventListener('click', this._handleBankSell);
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
  this.chatInput?.removeEventListener('keydown', this._handleChatInputKeydown);
  this.bankDepositButton?.removeEventListener('click', this._handleBankDeposit);
  this.bankWithdrawButton?.removeEventListener('click', this._handleBankWithdraw);
  this.bankSellButton?.removeEventListener('click', this._handleBankSell);
  if (this.bankFeedbackTimer) {
    clearTimeout(this.bankFeedbackTimer);
    this.bankFeedbackTimer = null;
  }
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
      this.profileId = null;
      this._updateHeroIdDisplay();
      this._connect();
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
        this._replaceChats(data.chats);
        this._ingestOreNodes(data.oreNodes);
        this._ingestLootDrops(data.loot);
  this.bankInfo = this._normalizeBankInfo(data.bank);
        this._updateInventoryPanel();
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
    this._replaceChats(data.chats);
        this._ingestOreNodes(data.oreNodes);
        this._ingestLootDrops(data.loot);
    this.bankInfo = this._normalizeBankInfo(data.bank);
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
      } else if (data.type === 'chat') {
        this._addChatBubble(data.chat);
      } else if (data.type === 'inventory') {
        if (data.inventory) {
          this.inventory = {
            currency: Number(data.inventory.currency) || 0,
            items: { ...(data.inventory.items || {}) },
          };
        }
        if (data.bank) {
          this.bankInventory = {
            currency: Number(data.bank.currency) || 0,
            items: { ...(data.bank.items || {}) },
          };
        }
        this._updateInventoryPanel();
        this._flashInventoryPanel();
      } else if (data.type === 'ore-update') {
        if (data.node) {
          this._applyOreNodeUpdate(data.node);
        }
      } else if (data.type === 'loot-spawn') {
        if (data.drop) {
          this._applyLootUpdate(data.drop, Boolean(data.removed));
        }
      } else if (data.type === 'loot-update') {
        if (data.drop) {
          this._applyLootUpdate(data.drop, Boolean(data.removed));
        }
      } else if (data.type === 'gathered') {
        this._flashInventoryPanel();
      } else if (data.type === 'loot-collected') {
        this._flashInventoryPanel();
      } else if (data.type === 'bank-result') {
        const ok = data.ok !== false;
        const message = typeof data.message === 'string' ? data.message : ok ? 'Bank transaction complete.' : 'Bank action failed.';
        this._showBankFeedback(message, ok);
        if (ok) {
          this._flashInventoryPanel();
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
      this._exitChatMode();
      this.chats.clear();
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
    const time = performance.now();

    ctx.clearRect(0, 0, width, height);

    if (!this.world) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const local = this.players.get(this.youId);
    const cameraX = local?.x ?? this.world.width / 2;
    const cameraY = local?.y ?? this.world.height / 2;
    this._updateSafeZoneIndicator(this._isPlayerInSafeZone(local));

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

    if (this.bankInfo) {
      ctx.save();
      const offsetX = (this.bankInfo.x - cameraX) * this.tileSize;
      const offsetY = (this.bankInfo.y - cameraY) * this.tileSize;
      const radiusPx = (this.bankInfo.radius || 0) * this.tileSize;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.fillStyle = SAFE_ZONE_STYLE.fill;
      ctx.strokeStyle = SAFE_ZONE_STYLE.stroke;
      ctx.lineWidth = 2.5;
      ctx.arc(offsetX, offsetY, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (const node of this.oreNodes.values()) {
      if (!node) continue;
      ctx.save();
      const offsetX = (node.x - cameraX) * this.tileSize;
      const offsetY = (node.y - cameraY) * this.tileSize;
      const radiusPx = this.tileSize * 0.45;
      const color = ORE_COLOR[node.type] || '#f8fafc';
      const ratio = node.maxAmount ? Math.max(0, Math.min(1, node.amount / node.maxAmount)) : 0;
      ctx.globalAlpha = 0.35 + ratio * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.max(0.2, 0.45 + ratio * 0.35);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = color;
      ctx.stroke();
      if (node.amount <= 0 && node.respawnIn != null) {
        const dashRatio = Math.max(0, Math.min(1, node.respawnIn / 120000));
        const dash = Math.max(3, 8 - dashRatio * 4);
        ctx.setLineDash([dash, dash + 4]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, radiusPx + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const drop of this.lootDrops.values()) {
      if (!drop) continue;
      const empty = (drop.currency || 0) <= 0 && Object.keys(drop.items || {}).length === 0;
      if (empty) continue;
      ctx.save();
      const offsetX = (drop.x - cameraX) * this.tileSize;
      const offsetY = (drop.y - cameraY) * this.tileSize;
      const size = this.tileSize * 0.28;
      ctx.translate(offsetX, offsetY);
      const pulse = Math.sin((time / 220) % (Math.PI * 2)) * 0.08 + 0.4;
      const alpha = 0.5 + pulse * 0.45;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = LOOT_COLOR;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#fde68a';
      ctx.stroke();
      ctx.restore();
    }

    // Effects
    for (const effect of this.effects) {
      const offsetX = (effect.x - cameraX) * this.tileSize;
      const offsetY = (effect.y - cameraY) * this.tileSize;
      const alpha = Math.max(0, Math.min(1, effect.ttl / 600));
      const color = effect.type === 'spell' ? '#2563eb' : effect.type === 'ranged' ? '#f97316' : '#ef4444';
      const aim = effect.aim ?? { x: 1, y: 0 };
      const aimAngle = Math.atan2(aim.y || 0, aim.x || 1);
      const shape = effect.shape || (effect.type === 'spell' ? 'burst' : effect.type === 'ranged' ? 'beam' : 'cone');
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.globalAlpha = alpha;

      if (shape === 'cone') {
        const lengthPx = (effect.length ?? effect.range ?? 0) * this.tileSize;
        const totalAngle = effect.angle ?? Math.PI;
        const halfAngle = totalAngle / 2;
        const start = aimAngle - halfAngle;
        const end = aimAngle + halfAngle;
        if (lengthPx > 0) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, lengthPx, start, end);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.35;
          ctx.fill();
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      } else if (shape === 'beam') {
        const lengthPx = (effect.length ?? effect.range ?? 0) * this.tileSize;
        const widthPx = (effect.width ?? 0.6) * this.tileSize;
        if (lengthPx > 0 && widthPx > 0) {
          ctx.rotate(aimAngle);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.4;
          ctx.fillRect(0, -widthPx / 2, lengthPx, widthPx);
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = color;
          ctx.strokeRect(0, -widthPx / 2, lengthPx, widthPx);
        }
      } else {
        const radius = (effect.range ?? effect.length ?? 0) * this.tileSize;
        if (radius > 0) {
          ctx.beginPath();
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = color;
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
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
      if (player.charging) {
        const chargeRatio = Math.max(0, Math.min(1, player.chargeRatio ?? 0));
        const kind = player.actionKind || 'default';
  const glow = CHARGE_GLOW_STYLE[kind] || CHARGE_GLOW_STYLE.default;
  const pulse = Math.sin((time / 160) % (Math.PI * 2)) * 0.08 + 0.08;
        const rangeBoost = kind === 'spell' ? 2.4 : kind === 'ranged' ? 1.8 : 1.4;
        const outerRadius = radius + this.tileSize * (0.45 + chargeRatio * rangeBoost + pulse);
        ctx.save();
        ctx.globalAlpha = 0.25 + chargeRatio * 0.45;
        ctx.fillStyle = glow.fill;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4 + chargeRatio * 0.5;
        ctx.lineWidth = 2 + chargeRatio * 3;
        ctx.strokeStyle = glow.stroke;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, outerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
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

    const expiredChats = [];
    const chatFont = '600 13px "Segoe UI"';
    ctx.font = chatFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const chat of this.chats.values()) {
      const owner = this.players.get(chat.owner);
      if (!owner) continue;
      const remaining = Math.max(0, chat.ttl - (time - chat.receivedAt));
      if (remaining <= 0) {
        expiredChats.push(chat.id);
        continue;
      }
      const alpha = Math.max(0.2, Math.min(1, remaining / CHAT_LIFETIME_MS));
      const offsetX = (owner.x - cameraX) * this.tileSize;
      const offsetY = (owner.y - cameraY) * this.tileSize;
      const radius = this.tileSize * 0.35;
      const lines = wrapChatLines(ctx, chat.text, CHAT_MAX_WIDTH);
      if (!lines.length) continue;
      let maxLineWidth = 0;
      for (const line of lines) {
        const widthMeasure = ctx.measureText(line).width;
        if (widthMeasure > maxLineWidth) {
          maxLineWidth = widthMeasure;
        }
      }
      const paddingX = 12;
      const paddingY = 10;
      const bubbleWidth = Math.min(CHAT_MAX_WIDTH, maxLineWidth) + paddingX * 2;
      const bubbleHeight = lines.length * CHAT_LINE_HEIGHT + paddingY * 2;
      const bubbleTop = offsetY - radius - bubbleHeight - 18;
      const bubbleLeft = offsetX - bubbleWidth / 2;
      const bubbleRight = bubbleLeft + bubbleWidth;
      const bubbleBottom = bubbleTop + bubbleHeight;
      ctx.save();
      ctx.globalAlpha = 0.75 + alpha * 0.2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      const corner = 12;
      ctx.moveTo(bubbleLeft + corner, bubbleTop);
      ctx.lineTo(bubbleRight - corner, bubbleTop);
      ctx.quadraticCurveTo(bubbleRight, bubbleTop, bubbleRight, bubbleTop + corner);
      ctx.lineTo(bubbleRight, bubbleBottom - corner);
      ctx.quadraticCurveTo(bubbleRight, bubbleBottom, bubbleRight - corner, bubbleBottom);
      ctx.lineTo(offsetX + 12, bubbleBottom);
      ctx.lineTo(offsetX, offsetY - radius - 4);
      ctx.lineTo(offsetX - 12, bubbleBottom);
      ctx.lineTo(bubbleLeft + corner, bubbleBottom);
      ctx.quadraticCurveTo(bubbleLeft, bubbleBottom, bubbleLeft, bubbleBottom - corner);
      ctx.lineTo(bubbleLeft, bubbleTop + corner);
      ctx.quadraticCurveTo(bubbleLeft, bubbleTop, bubbleLeft + corner, bubbleTop);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.stroke();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < lines.length; i += 1) {
        const textY = bubbleTop + paddingY + CHAT_LINE_HEIGHT / 2 + i * CHAT_LINE_HEIGHT;
        ctx.fillText(lines[i], offsetX, textY);
      }
      ctx.restore();
    }

    for (const id of expiredChats) {
      this.chats.delete(id);
    }

    ctx.restore();

    if (this.activeAction && this.localBonuses) {
      const maxChargeWindow = (this.localBonuses.maxCharge ?? 0) + CHARGE_TIME_BONUS;
      const ratio = Math.max(
        0,
        Math.min(1, (Date.now() - this.actionStart) / (Math.max(0.1, maxChargeWindow) * 1000))
      );
      this.chargeMeter.value = ratio;
      this.audio.onChargeProgress(this.activeAction, ratio);
    }
  }

  _sendInput(timestamp) {
    if (this.chatActive) return;
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

  _enterChatMode() {
    if (this.chatActive) return;
    if (this.identityOverlay && !this.identityOverlay.hidden) return;
    this.chatActive = true;
    this.keys.clear();
    this.pointerButtons = 0;
    if (this.activeAction) {
      this._cancelAction();
    }
    if (this.chatEntry) {
      this.chatEntry.hidden = false;
    }
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.focus({ preventScroll: true });
    }
  }

  _exitChatMode() {
    if (!this.chatActive) return;
    this.chatActive = false;
    this.pointerButtons = 0;
    if (this.chatInput) {
      this.chatInput.blur();
      this.chatInput.value = '';
    }
    if (this.chatEntry) {
      this.chatEntry.hidden = true;
    }
  }

  _submitChatMessage() {
    if (!this.chatInput) {
      this._exitChatMode();
      return;
    }
    const message = (this.chatInput.value ?? '').trim();
    const truncated = message.slice(0, CHAT_MAX_LENGTH);
    if (truncated && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'chat',
          message: truncated,
        })
      );
    }
    this.chatInput.value = '';
    this._exitChatMode();
  }

  _requestGatherLoot() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - this.lastInteractSent < 220) return;
    this.lastInteractSent = now;
    this.socket.send(JSON.stringify({ type: 'gather' }));
    this.socket.send(JSON.stringify({ type: 'loot' }));
  }

  _handleBankDeposit() {
    this._sendBankRequest('deposit');
  }

  _handleBankWithdraw() {
    this._sendBankRequest('withdraw');
  }

  _handleBankSell() {
    this._sendBankRequest('sell');
  }

  _sendBankRequest(action) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!action) return;
    this.socket.send(
      JSON.stringify({
        type: 'bank',
        action,
      })
    );
  }

  _handleChatInputKeydown(event) {
    if (!this.chatActive) return;
    if (event.code === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this._submitChatMessage();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this._exitChatMode();
    } else {
      event.stopPropagation();
    }
  }

  _handleKeyDown(event) {
    if (event.repeat) return;
    if (this.chatActive) {
      if (event.code === 'Escape') {
        event.preventDefault();
        this._exitChatMode();
      }
      return;
    }
    if (event.code === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this._enterChatMode();
      return;
    }
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
    if (event.code === 'KeyE') {
      event.preventDefault();
      this._requestGatherLoot();
      return;
    }
    this.keys.add(event.code);
  }

  _handleKeyUp(event) {
    if (this.chatActive) return;
    this.keys.delete(event.code);
  }

  _handlePointerDown(event) {
    if (this.chatActive) {
      this._exitChatMode();
      return;
    }
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
    if (this.chatActive) return;
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
    if (this.chatActive) return;
    this._updatePointerAim(event);
  }

  _handlePointerLeave() {
    if (this.chatActive) {
      this._exitChatMode();
      return;
    }
    if (this.activeAction) {
      this._releaseAction();
    }
    this.pointerButtons = 0;
  }

  _handlePointerCancel() {
    if (this.chatActive) {
      this._exitChatMode();
      return;
    }
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

  _replaceChats(chats) {
    const now = performance.now();
    const map = new Map();
    if (Array.isArray(chats)) {
      for (const chat of chats) {
        if (!chat || typeof chat.text !== 'string' || !chat.owner) continue;
        const id = chat.id || `chat-${chat.owner}-${now}-${map.size}`;
        map.set(id, {
          id,
          owner: chat.owner,
          text: chat.text,
          ttl: Math.max(0, Number(chat.ttl) || 0),
          receivedAt: now,
        });
      }
    }
    this.chats = map;
  }

  _addChatBubble(chat) {
    if (!chat || typeof chat.text !== 'string' || !chat.owner) return;
    const now = performance.now();
    const id = chat.id || `chat-${chat.owner}-${now}-${Math.random().toString(16).slice(2)}`;
    this.chats.set(id, {
      id,
      owner: chat.owner,
      text: chat.text,
      ttl: Math.max(0, Number(chat.ttl) || CHAT_LIFETIME_MS),
      receivedAt: now,
    });
  }

  _normalizeOreNode(node) {
    if (!node || !node.id) return null;
    const amount = Math.max(0, Number(node.amount) || 0);
    const maxAmount = Math.max(1, Number(node.maxAmount) || 1);
    return {
      id: node.id,
      type: node.type || 'copper',
      label: node.label || node.type || 'Ore',
      x: Number(node.x) || 0,
      y: Number(node.y) || 0,
      amount,
      maxAmount,
      respawnIn: node.respawnIn != null ? Math.max(0, Number(node.respawnIn) || 0) : null,
    };
  }

  _ingestOreNodes(nodes) {
    if (!Array.isArray(nodes)) return;
    const next = new Map();
    for (const raw of nodes) {
      const normalized = this._normalizeOreNode(raw);
      if (normalized) {
        next.set(normalized.id, normalized);
      }
    }
    this.oreNodes = next;
  }

  _applyOreNodeUpdate(node) {
    const normalized = this._normalizeOreNode(node);
    if (!normalized) return;
    const next = new Map(this.oreNodes);
    next.set(normalized.id, normalized);
    this.oreNodes = next;
  }

  _normalizeLootDrop(drop) {
    if (!drop || !drop.id) return null;
    const items = {};
    if (drop.items && typeof drop.items === 'object') {
      for (const [key, value] of Object.entries(drop.items)) {
        const qty = Math.max(0, Number(value) || 0);
        if (qty > 0) {
          items[key] = qty;
        }
      }
    }
    return {
      id: drop.id,
      x: Number(drop.x) || 0,
      y: Number(drop.y) || 0,
      currency: Math.max(0, Number(drop.currency) || 0),
      items,
      owner: drop.owner ?? null,
      ttl: Math.max(0, Number(drop.ttl) || 0),
    };
  }

  _ingestLootDrops(drops) {
    if (!Array.isArray(drops)) return;
    const next = new Map();
    for (const raw of drops) {
      const normalized = this._normalizeLootDrop(raw);
      if (!normalized) continue;
      if (normalized.currency <= 0 && Object.keys(normalized.items).length === 0) continue;
      next.set(normalized.id, normalized);
    }
    this.lootDrops = next;
  }

  _applyLootUpdate(drop, removed = false) {
    const normalized = this._normalizeLootDrop(drop);
    if (!normalized) return;
    const next = new Map(this.lootDrops);
    const empty = normalized.currency <= 0 && Object.keys(normalized.items || {}).length === 0;
    if (removed || empty) {
      next.delete(normalized.id);
    } else {
      next.set(normalized.id, normalized);
    }
    this.lootDrops = next;
  }

  _normalizeBankInfo(bank) {
    if (!bank) return null;
    return {
      x: Number(bank.x) || 0,
      y: Number(bank.y) || 0,
      radius: Math.max(0, Number(bank.radius) || 0),
    };
  }

  _populateItemsList(container, items) {
    if (!container) return;
    container.innerHTML = '';
    const entries = Object.entries(items || {})
      .map(([key, value]) => [key, Math.max(0, Number(value) || 0)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Empty';
      container.appendChild(li);
      return;
    }
    for (const [key, value] of entries) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = key;
      const qty = document.createElement('span');
      qty.textContent = value.toLocaleString();
      li.append(label, qty);
      container.appendChild(li);
    }
  }

  _updateInventoryPanel() {
    if (this.inventoryCurrencyEl) {
      this.inventoryCurrencyEl.textContent = Math.max(0, Number(this.inventory.currency) || 0).toLocaleString();
    }
    if (this.bankCurrencyEl) {
      this.bankCurrencyEl.textContent = Math.max(0, Number(this.bankInventory.currency) || 0).toLocaleString();
    }
    this._populateItemsList(this.inventoryItemsEl, this.inventory.items);
    this._populateItemsList(this.bankItemsEl, this.bankInventory.items);
  }

  _flashInventoryPanel() {
    if (!this.inventoryPanel) return;
    this.inventoryPanel.classList.remove('flash');
    // Force reflow to restart animation
    void this.inventoryPanel.offsetWidth;
    this.inventoryPanel.classList.add('flash');
  }

  _updateBankButtons(enabled) {
    const allow = Boolean(enabled) && this.socket && this.socket.readyState === WebSocket.OPEN;
    const buttons = [this.bankDepositButton, this.bankWithdrawButton, this.bankSellButton];
    for (const button of buttons) {
      if (!button) continue;
      button.disabled = !allow;
    }
  }

  _showBankFeedback(message, ok = true) {
    if (!this.bankFeedbackEl) return;
    this.bankFeedbackEl.textContent = message || '';
    this.bankFeedbackEl.style.color = ok ? '#bbf7d0' : '#fca5a5';
    if (this.bankFeedbackTimer) {
      clearTimeout(this.bankFeedbackTimer);
    }
    if (message) {
      this.bankFeedbackTimer = setTimeout(() => {
        this.bankFeedbackEl.textContent = '';
        this.bankFeedbackTimer = null;
      }, 3200);
    } else {
      this.bankFeedbackTimer = null;
    }
  }

  _isPlayerInSafeZone(player) {
    if (!player || !this.bankInfo) return false;
    const dx = player.x - this.bankInfo.x;
    const dy = player.y - this.bankInfo.y;
    return dx * dx + dy * dy <= Math.pow(this.bankInfo.radius || 0, 2);
  }

  _updateSafeZoneIndicator(isInside) {
    if (!this.safeZoneIndicatorEl) return;
    if (!this.bankInfo) {
      this.safeZoneIndicatorEl.textContent = 'Unknown';
      this.safeZoneIndicatorEl.style.color = 'rgba(148, 163, 184, 0.65)';
      this.lastSafeZoneState = null;
      this._updateBankButtons(false);
      return;
    }
    if (this.lastSafeZoneState === isInside) {
      this._updateBankButtons(isInside);
      return;
    }
    this.lastSafeZoneState = isInside;
    if (isInside) {
      this.safeZoneIndicatorEl.textContent = 'Inside';
      this.safeZoneIndicatorEl.style.color = '#38bdf8';
    } else {
      this.safeZoneIndicatorEl.textContent = 'Outside';
      this.safeZoneIndicatorEl.style.color = 'rgba(248, 250, 252, 0.75)';
    }
    this._updateBankButtons(isInside);
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
    this.oreNodes = new Map();
    this.lootDrops = new Map();
    this.world = null;
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
    this.inventory = { currency: 0, items: {} };
    this.bankInventory = { currency: 0, items: {} };
    this.bankInfo = null;
  this.lastSafeZoneState = null;
  this._updateInventoryPanel();
  this._updateSafeZoneIndicator(false);
  this._showBankFeedback('');
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
