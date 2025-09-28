const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: grid;
      grid-template-columns: auto;
      gap: 0.35rem;
      background: rgba(15, 23, 42, 0.72);
      border-radius: 0.7rem;
      padding: 0.4rem 0.6rem;
      border: 1px solid rgba(148, 163, 184, 0.24);
      min-width: 0;
      width: 100%;
      backdrop-filter: blur(6px);
    }

    .label {
      text-transform: uppercase;
      font-size: 0.64rem;
      letter-spacing: 0.16em;
      color: #94a3b8;
    }

    .bar {
      height: 0.45rem;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(71, 85, 105, 0.35);
    }

    .bar span {
      display: block;
      height: 100%;
      width: 0;
      transition: width 80ms linear;
      background: linear-gradient(90deg, #f97316, #e11d48);
    }

    .action {
      font-size: 0.8rem;
      font-weight: 600;
      color: #e2e8f0;
    }
  </style>
  <span class="label">Charge</span>
  <div class="bar"><span data-fill></span></div>
  <span class="action" data-action>Idle</span>
`;

class ChargeMeter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.fill = this.shadowRoot.querySelector('[data-fill]');
    this.label = this.shadowRoot.querySelector('[data-action]');
    this._value = 0;
  }

  set value(v) {
    this._value = Math.max(0, Math.min(1, v ?? 0));
    this.fill.style.width = `${this._value * 100}%`;
  }

  get value() {
    return this._value;
  }

  set actionName(name) {
    this.label.textContent = name || 'Idle';
  }
}

customElements.define('charge-meter', ChargeMeter);
