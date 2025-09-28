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

    .momentum {
      display: grid;
      gap: 0.35rem;
      margin-top: 0.6rem;
      padding-top: 0.6rem;
      border-top: 1px solid rgba(148, 163, 184, 0.25);
    }

    .momentum-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .momentum-head .value {
      font-weight: 700;
      font-size: 0.8rem;
      color: #fbbf24;
    }

    .momentum-bar {
      height: 0.45rem;
      background: rgba(71, 85, 105, 0.4);
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .momentum-bar span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #f97316, #fb7185);
      transition: width 150ms ease;
    }

    .momentum-status {
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(250, 204, 21, 0.82);
    }

    .momentum:not(.active) .momentum-head .value {
      color: rgba(148, 163, 184, 0.8);
    }

    .momentum:not(.active) .momentum-status {
      color: rgba(148, 163, 184, 0.7);
    }

    .momentum:not(.active) .momentum-bar span {
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.55), rgba(148, 163, 184, 0.25));
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
  <div class="momentum" data-momentum>
    <div class="momentum-head">
      <span class="label">Battle Momentum</span>
      <span class="value" data-momentum-label>Ready</span>
    </div>
    <div class="momentum-bar">
      <span data-momentum-bar></span>
    </div>
    <span class="momentum-status" data-momentum-status>Chain takedowns to surge with power.</span>
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
      momentumContainer: this.shadowRoot.querySelector('[data-momentum]'),
      momentumLabel: this.shadowRoot.querySelector('[data-momentum-label]'),
      momentumStatus: this.shadowRoot.querySelector('[data-momentum-status]'),
      momentumBar: this.shadowRoot.querySelector('[data-momentum-bar]'),
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

    if (this.dom.momentumContainer) {
      const momentum = this._data.momentum || null;
      const stacks = Math.max(0, Math.floor(momentum?.stacks ?? 0));
      const remainingMs = Math.max(0, momentum?.remaining ?? 0);
      const durationMs = Math.max(1, momentum?.duration ?? 0);
      const progress = Math.max(0, Math.min(1, remainingMs / durationMs));
      if (this.dom.momentumBar) {
        this.dom.momentumBar.style.width = `${progress * 100}%`;
      }

      const seconds = remainingMs / 1000;
      let label = 'Ready';
      if (stacks > 0) {
        let timeText = '';
        if (seconds > 0) {
          timeText = seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
        }
        label = `${stacks} stack${stacks === 1 ? '' : 's'}${timeText ? ` • ${timeText}` : ''}`;
      }
      if (this.dom.momentumLabel) {
        this.dom.momentumLabel.textContent = label;
      }

      const bonus = momentum?.bonus || {};
      const bonusParts = [];
      if (bonus.damage) bonusParts.push(`Power +${(bonus.damage * 100).toFixed(0)}%`);
      if (bonus.speed) bonusParts.push(`Speed +${(bonus.speed * 100).toFixed(0)}%`);
      if (bonus.xp) bonusParts.push(`XP +${(bonus.xp * 100).toFixed(0)}%`);
      const statusText = stacks > 0 && bonusParts.length
        ? bonusParts.join(' • ')
        : 'Chain takedowns to surge with power.';
      if (this.dom.momentumStatus) {
        this.dom.momentumStatus.textContent = statusText;
      }
      this.dom.momentumContainer.classList.toggle('active', stacks > 0);
    }
  }
}

customElements.define('stat-panel', StatPanel);
