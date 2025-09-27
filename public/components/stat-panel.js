const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: grid;
      gap: 0.35rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.85));
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 0.75rem;
      min-width: 220px;
      color: #e2e8f0;
      backdrop-filter: blur(6px);
    }

    h2 {
      margin: 0;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      color: #94a3b8;
    }

    .bar {
      height: 0.5rem;
      background: rgba(71, 85, 105, 0.4);
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .bar span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #38bdf8, #6366f1);
    }

    .grid {
      display: grid;
      grid-template-columns: auto auto;
      gap: 0.4rem 0.75rem;
      font-size: 0.85rem;
    }

    .label {
      color: #cbd5f5;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 0.75rem;
    }

    .value {
      font-weight: 600;
    }

    .health {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.4rem;
    }
  </style>
  <h2>Your Hero</h2>
  <div class="grid">
    <span class="label">Strength</span><span class="value" data-strength>0</span>
    <span class="label">Dexterity</span><span class="value" data-dexterity>0</span>
    <span class="label">Intellect</span><span class="value" data-intellect>0</span>
    <span class="label">Hit Chance</span><span class="value" data-hit>0%</span>
    <span class="label">Range</span><span class="value" data-range>0</span>
    <span class="label">Max Charge</span><span class="value" data-charge>0s</span>
  </div>
  <div class="health">
    <span class="label">Vitality</span>
    <div class="bar">
      <span data-health></span>
    </div>
    <span class="value" data-health-text>0 / 0</span>
  </div>
`;

class StatPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.dom = {
      strength: this.shadowRoot.querySelector('[data-strength]'),
      dexterity: this.shadowRoot.querySelector('[data-dexterity]'),
      intellect: this.shadowRoot.querySelector('[data-intellect]'),
      hit: this.shadowRoot.querySelector('[data-hit]'),
      range: this.shadowRoot.querySelector('[data-range]'),
      charge: this.shadowRoot.querySelector('[data-charge]'),
      healthBar: this.shadowRoot.querySelector('[data-health]'),
      healthText: this.shadowRoot.querySelector('[data-health-text]'),
    };
    this._data = null;
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  get data() {
    return this._data;
  }

  render() {
    if (!this._data) return;
    const { stats, bonuses, health, maxHealth } = this._data;
    this.dom.strength.textContent = stats.strength.toFixed(1);
    this.dom.dexterity.textContent = stats.dexterity.toFixed(1);
    this.dom.intellect.textContent = stats.intellect.toFixed(1);
    this.dom.hit.textContent = `${(bonuses.hitChance * 100).toFixed(0)}%`;
    this.dom.range.textContent = `${bonuses.range.toFixed(1)}m`;
    this.dom.charge.textContent = `${bonuses.maxCharge.toFixed(2)}s`;

    const ratio = maxHealth ? health / maxHealth : 0;
    this.dom.healthBar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    this.dom.healthText.textContent = `${Math.round(health)} / ${Math.round(maxHealth)}`;
  }
}

customElements.define('stat-panel', StatPanel);
