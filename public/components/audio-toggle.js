const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: inline-flex;
    }

    button {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #e2e8f0;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: background 150ms ease, border 150ms ease, transform 150ms ease;
    }

    button:hover {
      background: rgba(30, 41, 59, 0.85);
      border-color: rgba(148, 163, 184, 0.55);
    }

    button:active {
      transform: translateY(1px);
    }

    .dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: #ef4444;
      box-shadow: 0 0 0.4rem rgba(239, 68, 68, 0.5);
      transition: background 150ms ease, box-shadow 150ms ease;
    }

    :host([active]) .dot {
      background: #22c55e;
      box-shadow: 0 0 0.45rem rgba(34, 197, 94, 0.6);
    }
  </style>
  <button type="button" aria-pressed="false">
    <span class="dot"></span>
    <span data-label>Music Off</span>
  </button>
`;

class AudioToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.button = this.shadowRoot.querySelector('button');
    this.label = this.shadowRoot.querySelector('[data-label]');
    this._active = false;
  }

  connectedCallback() {
    this.button.addEventListener('click', () => {
      this.active = !this.active;
      this.dispatchEvent(
        new CustomEvent('music-toggle', {
          detail: { active: this.active },
          bubbles: true,
          composed: true,
        })
      );
    });
    this._render();
  }

  set active(value) {
    const normalized = Boolean(value);
    if (this._active === normalized) return;
    this._active = normalized;
    this._render();
  }

  get active() {
    return this._active;
  }

  _render() {
    if (this._active) {
      this.setAttribute('active', '');
      this.button.setAttribute('aria-pressed', 'true');
      this.label.textContent = 'Music On';
    } else {
      this.removeAttribute('active');
      this.button.setAttribute('aria-pressed', 'false');
      this.label.textContent = 'Music Off';
    }
  }
}

customElements.define('audio-toggle', AudioToggle);
