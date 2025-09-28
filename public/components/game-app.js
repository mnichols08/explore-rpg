import './stat-panel.js';
import './charge-meter.js';
import './audio-toggle.js';
import { AudioEngine } from '../audio/audio-engine.js';
import { WorldWebGLRenderer } from '../renderers/world-webgl.js';

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
    }

    canvas[data-webgl-canvas] {
      z-index: 2;
      pointer-events: none;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 70%);
      mix-blend-mode: screen;
    }

    canvas[data-main-canvas] {
      z-index: 1;
      cursor: crosshair;
      touch-action: none;
      background: transparent;
    }

    .hud {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      pointer-events: none;
      padding: 1.5rem;
      z-index: 3;
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

    .hud .top-right .minimap-card {
      width: 190px;
      max-width: 48vw;
      display: grid;
      gap: 0.55rem;
      padding: 0.75rem;
      border-radius: 0.85rem;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 1.1rem 2.4rem rgba(8, 15, 31, 0.45);
      backdrop-filter: blur(6px);
      transition: padding 150ms ease;
    }

    .minimap-card.collapsed {
      padding-bottom: 0.55rem;
    }

    .minimap-card.collapsed .minimap-body {
      display: none;
    }

    .minimap-header {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.85);
    }

    .minimap-header .minimap-header-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .minimap-header span[data-minimap-label] {
      color: var(--minimap-accent, #38bdf8);
      font-weight: 600;
    }

    .minimap-header button {
      all: unset;
      cursor: pointer;
      padding: 0.2rem 0.45rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.6);
      color: rgba(226, 232, 240, 0.9);
      font-size: 0.66rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: background 120ms ease, border 120ms ease, transform 120ms ease;
    }

    .minimap-header button:hover {
      background: rgba(51, 65, 85, 0.75);
      border-color: rgba(148, 163, 184, 0.6);
    }

    .minimap-header button:active {
      transform: translateY(1px);
    }

    .minimap-body {
      display: grid;
      gap: 0.55rem;
    }

    canvas[data-minimap] {
      width: 176px;
      height: 176px;
      max-width: 100%;
      background: rgba(15, 23, 42, 0.9);
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.3);
      box-shadow: inset 0 0 1.2rem rgba(8, 15, 31, 0.45);
    }

    .minimap-legend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem 0.65rem;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.68rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.75);
    }

    .minimap-legend li {
      position: relative;
      padding-left: 1.2rem;
      line-height: 1.1;
    }

    .minimap-legend li::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 999px;
      transform: translateY(-50%);
      box-shadow: 0 0 0.45rem rgba(148, 163, 184, 0.4);
    }

    .minimap-legend li[data-type="you"]::before {
      background: #38bdf8;
    }

    .minimap-legend li[data-type="hero"]::before {
      background: #f97316;
    }

    .minimap-legend li[data-type="portal"]::before {
      background: #fbbf24;
    }

    .minimap-legend li[data-type="safe"]::before {
      background: #22d3ee;
    }

    .minimap-footer {
      font-size: 0.68rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.7);
      line-height: 1.4;
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

    .visual-toggle {
      all: unset;
      cursor: pointer;
      padding: 0.35rem 0.65rem;
      border-radius: 0.55rem;
      background: rgba(30, 41, 59, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #f8fafc;
      transition: background 150ms ease, border 150ms ease, transform 150ms ease, color 150ms ease;
    }

    .visual-toggle:hover:not([disabled]) {
      background: rgba(51, 65, 85, 0.88);
      border-color: rgba(148, 163, 184, 0.55);
    }

    .visual-toggle:active:not([disabled]) {
      transform: translateY(1px);
    }

    .visual-toggle[disabled] {
      cursor: default;
      opacity: 0.55;
      color: rgba(148, 163, 184, 0.7);
      border-color: rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.55);
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

    .desktop-help {
      display: block;
    }

    .mobile-help {
      display: none;
      font-size: 0.78rem;
      line-height: 1.5;
      letter-spacing: 0.04em;
      color: rgba(226, 232, 240, 0.85);
      background: rgba(15, 23, 42, 0.68);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 0.65rem;
      padding: 0.5rem 0.65rem;
      margin-bottom: 0.6rem;
    }

    :host([data-touch]) .desktop-help {
      display: none;
    }

    :host([data-touch]) .mobile-help {
      display: block;
    }

    :host([data-touch]) .hud .bottom-left {
      max-height: 48vh;
      overflow-y: auto;
      margin-bottom: clamp(150px, 24vh, 240px);
    }

    :host([data-touch]) .hud .bottom-right {
      margin-bottom: clamp(130px, 22vh, 220px);
    }

    .touch-controls {
      position: absolute;
      left: 1.2rem;
      right: 1.2rem;
      bottom: 1.2rem;
      display: none;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1.5rem;
      pointer-events: none;
      z-index: 6;
    }

    .touch-controls > * {
      pointer-events: auto;
    }

    .touch-pad {
      position: relative;
      width: clamp(120px, 28vw, 180px);
      height: clamp(120px, 28vw, 180px);
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 1.1rem 2.4rem rgba(8, 15, 31, 0.45);
      display: grid;
      place-items: center;
      touch-action: none;
    }

    .touch-pad::after {
      content: "";
      position: absolute;
      inset: 18%;
      border-radius: 50%;
      border: 1px dashed rgba(148, 163, 184, 0.35);
    }

    .touch-thumb {
      width: clamp(52px, 14vw, 68px);
      height: clamp(52px, 14vw, 68px);
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.75), rgba(99, 102, 241, 0.8));
      border: 1px solid rgba(148, 163, 184, 0.45);
      box-shadow: 0 0.6rem 1.2rem rgba(15, 23, 42, 0.55);
      transform: translate3d(0, 0, 0);
      transition: transform 90ms ease;
    }

    .touch-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem;
      padding: 0.65rem;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 0.85rem;
      box-shadow: 0 1.1rem 2.4rem rgba(8, 15, 31, 0.45);
      min-width: clamp(180px, 42vw, 240px);
    }

    .touch-actions button {
      all: unset;
      cursor: pointer;
      padding: 0.65rem 0.75rem;
      border-radius: 0.75rem;
      background: rgba(30, 41, 59, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #f8fafc;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: center;
      box-shadow: 0 0.65rem 1.2rem rgba(15, 23, 42, 0.35);
      transition: background 120ms ease, border 120ms ease, transform 80ms ease;
      user-select: none;
    }

    .touch-actions button span {
      display: block;
      pointer-events: none;
    }

    .touch-actions button:active,
    .touch-actions button.active {
      background: rgba(251, 191, 36, 0.85);
      border-color: rgba(253, 230, 138, 0.85);
      color: #0f172a;
      transform: translateY(1px);
    }

    .touch-actions .touch-interact {
      grid-column: span 2;
      background: rgba(34, 197, 94, 0.85);
      border-color: rgba(134, 239, 172, 0.85);
      color: #022c22;
    }

    .touch-actions .touch-interact:active,
    .touch-actions .touch-interact.active {
      background: rgba(16, 185, 129, 0.98);
      border-color: rgba(45, 212, 191, 0.98);
      color: #022c22;
    }

    .touch-actions .touch-chat {
      background: rgba(99, 102, 241, 0.82);
      border-color: rgba(165, 180, 252, 0.82);
      color: #0f172a;
    }

    .touch-actions .touch-chat:active,
    .touch-actions .touch-chat.active {
      background: rgba(129, 140, 248, 0.95);
      border-color: rgba(165, 180, 252, 0.95);
      color: #0f172a;
    }

    .touch-actions .touch-hud {
      grid-column: span 2;
      background: rgba(45, 212, 191, 0.88);
      border-color: rgba(94, 234, 212, 0.88);
      color: #022c22;
    }

    .touch-actions .touch-hud:active,
    .touch-actions .touch-hud.active {
      background: rgba(20, 184, 166, 0.98);
      border-color: rgba(94, 234, 212, 0.98);
      color: #022c22;
    }

    .touch-actions .touch-hint {
      grid-column: span 2;
      margin: 0;
      font-size: 0.68rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.82);
      text-align: center;
    }

    :host([data-touch]) .touch-controls {
      display: flex;
    }

    :host([data-touch][data-ui-collapsed]) .hud .top-left,
    :host([data-touch][data-ui-collapsed]) .hud .top-right,
    :host([data-touch][data-ui-collapsed]) .hud .bottom-left,
    :host([data-touch][data-ui-collapsed]) .hud .bottom-right {
      display: none !important;
    }

    :host([data-touch][data-ui-collapsed]) .hud .level-banner,
    :host([data-touch][data-ui-collapsed]) .hud .portal-prompt,
    :host([data-touch][data-ui-collapsed]) .hud .message {
      display: none !important;
    }

    :host([data-touch][data-ui-collapsed]) .touch-actions .touch-hud {
      background: rgba(20, 184, 166, 0.98);
      border-color: rgba(94, 234, 212, 0.98);
      color: #022c22;
    }

    @media (max-width: 1080px) {
      .hud {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto 1fr;
        gap: 1rem;
      }

      .hud .top-right {
        justify-self: end;
        width: min(100%, 320px);
        align-items: stretch;
      }

      .hud .bottom-left,
      .hud .bottom-right {
        justify-self: stretch;
      }

      .hud .bottom-right {
        align-self: end;
        width: min(100%, 360px);
      }
    }

    @media (max-width: 720px) {
      :host {
        font-size: 15px;
      }

      .hud {
        padding: 0.85rem;
        gap: 0.85rem;
      }

      .hud .top-right {
        justify-self: stretch;
        align-items: flex-start;
        width: 100%;
      }

      .hud .bottom-left {
        background: rgba(15, 23, 42, 0.75);
        border-radius: 0.8rem;
        border: 1px solid rgba(148, 163, 184, 0.3);
        padding: 0.7rem 0.85rem;
        box-shadow: 0 0.9rem 1.8rem rgba(8, 15, 31, 0.45);
        gap: 0.55rem;
      }

      .hud .bottom-right {
        width: 100%;
      }

      .identity-tools button {
        flex: 1 1 calc(50% - 0.45rem);
        text-align: center;
      }

      .touch-actions {
        min-width: min(260px, 60vw);
      }
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

    .resource-panel .status.zone span:last-child {
      color: #38bdf8;
    }

    .resource-panel .status.zone.level span:last-child {
      color: #f97316;
    }

    .hud .level-banner {
      position: absolute;
      top: 1.2rem;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 1.1rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.45);
      color: #f8fafc;
      font-size: 0.82rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      box-shadow: 0 1.1rem 2.4rem rgba(15, 23, 42, 0.45);
      pointer-events: none;
    }

    .hud .level-banner::before {
      content: "";
      display: block;
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: var(--level-accent, #38bdf8);
      box-shadow: 0 0 0.65rem var(--level-accent-shadow, rgba(56, 189, 248, 0.6));
    }

    .portal-prompt {
      position: absolute;
      top: 4.4rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.45rem 0.9rem;
      border-radius: 0.75rem;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #f8fafc;
      font-size: 0.76rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      box-shadow: 0 0.9rem 2.1rem rgba(15, 23, 42, 0.4);
      pointer-events: none;
      transition: opacity 140ms ease;
    }

    .portal-prompt[hidden] {
      display: none;
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
  <canvas data-webgl-canvas></canvas>
  <canvas data-main-canvas></canvas>
  <div class="hud">
    <div class="top-left"><stat-panel></stat-panel></div>
    <div class="top-right">
      <charge-meter></charge-meter>
      <audio-toggle></audio-toggle>
      <button type="button" class="visual-toggle" data-visual-toggle aria-pressed="true">Glow On</button>
      <div class="minimap-card" data-minimap-card>
        <div class="minimap-header" data-minimap-header>
          <span>Minimap</span>
          <div class="minimap-header-actions">
            <span data-minimap-label>Overworld</span>
            <button type="button" data-minimap-toggle aria-pressed="false">Hide</button>
          </div>
        </div>
        <div class="minimap-body" data-minimap-body>
          <canvas data-minimap></canvas>
          <ul class="minimap-legend">
            <li data-type="you">You</li>
            <li data-type="hero">Allies</li>
            <li data-type="portal">Portals</li>
            <li data-type="safe">Safe Zone</li>
          </ul>
          <div class="minimap-footer" data-minimap-portal-hint>Follow the gold arrow to reach a gateway.</div>
        </div>
      </div>
    </div>
    <div class="bottom-left">
      <div class="desktop-help">
        <strong>Explore &amp; grow:</strong><br />
  WASD to move. Left click to swing. Right click to shoot. Spacebar channels spells (or hold both mouse buttons). Hold any action to overcharge.<br />
  Press Enter to chat with nearby heroes. Tap E to gather resources or scoop up loose loot.<br />
  Follow the gold arrow or minimap marker to the nearest gateway—press E while inside its glow to enter a generated stronghold, and press E again atop the exit sigil to return.<br />
  Inside the glowing safe zone, use the bank panel to deposit or sell your haul. Collapse or reopen the minimap from its header button. Music toggle: button or press M. Shift + N to forge a new hero.
      </div>
      <div class="mobile-help">
        Drag the left pad to roam, tap Slash, Volley, or Spell to attack, and hold to charge. Tap Chat to open the message bar, HUD to hide or reveal panels, and Interact to scoop loot, gather ore, or slip through glowing portals. The minimap, glow, and music toggles live up top when you need them.
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
        <div class="status zone" data-zone-status>
          <span>Zone</span>
          <span data-zone-indicator>Overworld</span>
        </div>
        <div class="bank-actions" data-bank-actions>
          <button type="button" data-bank-deposit disabled>Deposit All</button>
          <button type="button" data-bank-withdraw disabled>Withdraw All</button>
          <button type="button" data-bank-sell disabled>Sell Ores</button>
        </div>
        <div class="bank-feedback" data-bank-feedback></div>
      </div>
    </div>
    <div class="portal-prompt" hidden data-portal-prompt></div>
    <div class="level-banner" hidden data-level-banner></div>
    <div class="message" hidden data-message>Connecting...</div>
    <div class="touch-controls" data-touch-controls>
      <div class="touch-pad" data-joystick aria-label="Virtual joystick">
        <div class="touch-thumb" data-joystick-thumb></div>
      </div>
      <div class="touch-actions">
        <button type="button" data-touch-action="melee" aria-label="Melee">
          <span>Slash</span>
        </button>
        <button type="button" data-touch-action="ranged" aria-label="Ranged">
          <span>Volley</span>
        </button>
        <button type="button" data-touch-action="spell" aria-label="Spell">
          <span>Spell</span>
        </button>
        <button type="button" class="touch-chat" data-touch-chat aria-label="Chat">
          <span>Chat</span>
        </button>
        <button type="button" class="touch-hud" data-touch-ui-toggle aria-label="Hide HUD">
          <span data-touch-ui-label>Hide HUD</span>
        </button>
        <button type="button" class="touch-interact" data-touch-interact aria-label="Interact">
          <span>Interact</span>
        </button>
  <p class="touch-hint">Drag left pad to move · Tap actions to attack · Chat to talk · Glow to swap visuals · HUD to clear panels · Interact for loot and portals</p>
      </div>
    </div>
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
  ember: '#fb923c',
  glyph: '#818cf8',
  obsidian: '#111827',
  lava: '#ef4444',
  void: '#030712',
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
  emberling: { inner: '#fb923c', outer: '#c2410c' },
  warden: { inner: '#f97316', outer: '#9a3412' },
  phantom: { inner: '#38bdf8', outer: '#1e3a8a' },
  seer: { inner: '#c4b5fd', outer: '#4338ca' },
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
const DEFAULT_PORTAL_COLOR = '#38bdf8';
const LEVEL_VIGNETTE = {
  'ember-sanctum': {
    fill: 'rgba(249, 115, 22, 0.16)',
    shadow: 'rgba(249, 115, 22, 0.48)',
    background: '#130d1f',
  },
  'astral-vault': {
    fill: 'rgba(56, 189, 248, 0.18)',
    shadow: 'rgba(56, 189, 248, 0.42)',
    background: '#0b1220',
  },
};
const PORTAL_INTERACT_RADIUS = 1.6;
const MINIMAP_STORAGE_KEY = 'explore-rpg-minimap';
const VISUAL_STORAGE_KEY = 'explore-rpg-visuals';
const UI_COLLAPSE_STORAGE_KEY = 'explore-rpg-ui-collapsed';
const MINIMAP_SIZE = 176;
const MINIMAP_TILE_COLORS = {
  water: '#0f172a',
  sand: '#fbbf24',
  grass: '#2dd4bf',
  forest: '#166534',
  rock: '#475569',
  ember: '#fb923c',
  glyph: '#6366f1',
  obsidian: '#111827',
  lava: '#b91c1c',
  void: '#1e1b4b',
};
const MINIMAP_PLAYER_COLORS = {
  you: '#38bdf8',
  ally: '#f97316',
};
const MINIMAP_PORTAL_COLOR = '#fbbf24';
const MINIMAP_SAFE_FILL = 'rgba(56, 189, 248, 0.16)';
const MINIMAP_SAFE_STROKE = 'rgba(125, 211, 252, 0.75)';
const MINIMAP_VIEWPORT_STROKE = 'rgba(148, 163, 184, 0.55)';
const MINIMAP_VIEWPORT_FILL = 'rgba(30, 41, 59, 0.22)';
const MINIMAP_BACKGROUND = 'rgba(12, 20, 32, 0.95)';
const PORTAL_COMPASS_RADIUS_FACTOR = 0.42;
const PORTAL_COMPASS_MIN_DISTANCE = 2.5;
const PORTAL_ARROW_COLOR = '#fbbf24';
const PORTAL_ARROW_OUTLINE = 'rgba(15, 23, 42, 0.85)';
const PORTAL_COMPASS_TEXT_COLOR = '#fde68a';
const PORTAL_COMPASS_LABEL_BACKGROUND = 'rgba(15, 23, 42, 0.68)';

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
    this.webglCanvas = this.shadowRoot.querySelector('[data-webgl-canvas]');
    this.canvas = this.shadowRoot.querySelector('[data-main-canvas]');
    this.ctx = this.canvas.getContext('2d');
    this.webglRenderer = this.webglCanvas ? new WorldWebGLRenderer(this.webglCanvas) : null;
    if (this.webglRenderer && this.webglRenderer.supported === false) {
      this.webglRenderer = null;
    }
    this.statPanel = this.shadowRoot.querySelector('stat-panel');
    this.chargeMeter = this.shadowRoot.querySelector('charge-meter');
    this.messageEl = this.shadowRoot.querySelector('[data-message]');
    this.minimapCardEl = this.shadowRoot.querySelector('[data-minimap-card]');
    this.minimapBodyEl = this.shadowRoot.querySelector('[data-minimap-body]');
    this.minimapCanvas = this.shadowRoot.querySelector('[data-minimap]');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    if (this.minimapCtx) {
      this.minimapCtx.imageSmoothingEnabled = false;
    }
    this.minimapHeaderEl = this.shadowRoot.querySelector('[data-minimap-header]');
    this.minimapLabelEl = this.shadowRoot.querySelector('[data-minimap-label]');
    this.minimapToggleButton = this.shadowRoot.querySelector('[data-minimap-toggle]');
    this.minimapPortalHintEl = this.shadowRoot.querySelector('[data-minimap-portal-hint]');
  this.audioToggle = this.shadowRoot.querySelector('audio-toggle');
    this.visualToggleButton = this.shadowRoot.querySelector('[data-visual-toggle]');
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
    this.touchControlsEl = this.shadowRoot.querySelector('[data-touch-controls]');
    this.joystickEl = this.shadowRoot.querySelector('[data-joystick]');
    this.joystickThumbEl = this.shadowRoot.querySelector('[data-joystick-thumb]');
    this.touchActionButtons = Array.from(this.shadowRoot.querySelectorAll('[data-touch-action]'));
    this.touchInteractButton = this.shadowRoot.querySelector('[data-touch-interact]');
  this.touchChatButton = this.shadowRoot.querySelector('[data-touch-chat]');
    this.touchUiToggleButton = this.shadowRoot.querySelector('[data-touch-ui-toggle]');
    this.touchUiToggleLabel = this.shadowRoot.querySelector('[data-touch-ui-label]');
    this.inventoryPanel = this.shadowRoot.querySelector('[data-inventory-panel]');
    this.inventoryCurrencyEl = this.shadowRoot.querySelector('[data-inventory-currency]');
    this.inventoryItemsEl = this.shadowRoot.querySelector('[data-inventory-items]');
    this.bankCurrencyEl = this.shadowRoot.querySelector('[data-bank-currency]');
    this.bankItemsEl = this.shadowRoot.querySelector('[data-bank-items]');
    this.safeZoneStatusEl = this.shadowRoot.querySelector('[data-safe-zone-status]');
    this.safeZoneIndicatorEl = this.shadowRoot.querySelector('[data-safe-zone-indicator]');
    this.zoneStatusEl = this.shadowRoot.querySelector('[data-zone-status]');
    this.zoneIndicatorEl = this.shadowRoot.querySelector('[data-zone-indicator]');
    this.levelBannerEl = this.shadowRoot.querySelector('[data-level-banner]');
    this.portalPromptEl = this.shadowRoot.querySelector('[data-portal-prompt]');
  this.bankActionsEl = this.shadowRoot.querySelector('[data-bank-actions]');
  this.bankDepositButton = this.shadowRoot.querySelector('[data-bank-deposit]');
  this.bankWithdrawButton = this.shadowRoot.querySelector('[data-bank-withdraw]');
  this.bankSellButton = this.shadowRoot.querySelector('[data-bank-sell]');
  this.bankFeedbackEl = this.shadowRoot.querySelector('[data-bank-feedback]');
    this._handleChatInputKeydown = this._handleChatInputKeydown.bind(this);
    this._submitChatMessage = this._submitChatMessage.bind(this);
    this._exitChatMode = this._exitChatMode.bind(this);
  this._handleJoystickStart = this._handleJoystickStart.bind(this);
  this._handleJoystickMove = this._handleJoystickMove.bind(this);
  this._handleJoystickEnd = this._handleJoystickEnd.bind(this);
  this._handleTouchActionPress = this._handleTouchActionPress.bind(this);
  this._handleTouchActionRelease = this._handleTouchActionRelease.bind(this);
  this._handleTouchActionCancel = this._handleTouchActionCancel.bind(this);
  this._handleTouchInteract = this._handleTouchInteract.bind(this);
  this._handleTouchInteractEnd = this._handleTouchInteractEnd.bind(this);
  this._handleGlobalPointerDown = this._handleGlobalPointerDown.bind(this);
  this._handlePointerSchemeChange = this._handlePointerSchemeChange.bind(this);
  this._handleTouchChatToggle = this._handleTouchChatToggle.bind(this);
  this._handleTouchChatPointerEnd = this._handleTouchChatPointerEnd.bind(this);
  this._handleVisualToggle = this._handleVisualToggle.bind(this);
  this._handleTouchUiToggle = this._handleTouchUiToggle.bind(this);
  this._handleTouchUiPointerEnd = this._handleTouchUiPointerEnd.bind(this);

    this.world = null;
    this.players = new Map();
    this.effects = [];
    this.portals = new Map();
  this.levels = new Map();
  this.enemies = new Map();
  this.chats = new Map();
    this.touchMoveVector = { x: 0, y: 0 };
    this.joystickPointerId = null;
    this.joystickActive = false;
    this.touchControlsBound = false;
    this.touchEnabled = false;
    this.detectedTouch = false;
  this.uiCollapsed = false;
  this.viewportWidth = 0;
  this.viewportHeight = 0;
  this.webglEnabled = Boolean(this.webglRenderer);
    const coarseQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    this.coarsePointerQuery = coarseQuery;
    if ((typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || (coarseQuery && coarseQuery.matches)) {
      this.detectedTouch = true;
    }
    this.oreNodes = new Map();
    this.lootDrops = new Map();
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
  this.localMomentum = null;
    this.inventory = { currency: 0, items: {} };
    this.bankInventory = { currency: 0, items: {} };
    this.bankInfo = null;
  this.minimapBase = null;
  this.minimapScaleX = 1;
  this.minimapScaleY = 1;
    this.minimapVisible = true;
    this.currentLevelId = null;
    this.currentLevelExit = null;
    this.currentLevelInfo = null;
    this.currentLevelColor = null;
  this.lastKnownPosition = null;
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
    this.spellKeyActive = false;

  this.lastSafeZoneState = null;
    this.levelBannerTimer = null;

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
  this._toggleMinimapVisibility = this._toggleMinimapVisibility.bind(this);
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
    this._updateLevelStatus(null);
    this._updateMinimapLabel(null);
    this._updatePortalHint(null, null);
    this._setMinimapVisible(true, false);
    this._loadMinimapPreference();
    this._loadUiCollapsePreference();
    this._loadVisualPreference();
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
    this.visualToggleButton?.addEventListener('click', this._handleVisualToggle);
    this.minimapToggleButton?.addEventListener('click', this._toggleMinimapVisibility);
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
    window.addEventListener('pointerdown', this._handleGlobalPointerDown, { passive: true });
    if (this.coarsePointerQuery) {
      if (this.coarsePointerQuery.addEventListener) {
        this.coarsePointerQuery.addEventListener('change', this._handlePointerSchemeChange);
      } else if (this.coarsePointerQuery.addListener) {
        this.coarsePointerQuery.addListener(this._handlePointerSchemeChange);
      }
    }
    if (this.detectedTouch) {
      this._enableTouchControls();
    }
    this._resizeCanvas();
    this._initializeIdentity();
    requestAnimationFrame(this._loop);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this._resizeCanvas);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('pointerdown', this._handleGlobalPointerDown);
    if (this.coarsePointerQuery) {
      if (this.coarsePointerQuery.removeEventListener) {
        this.coarsePointerQuery.removeEventListener('change', this._handlePointerSchemeChange);
      } else if (this.coarsePointerQuery.removeListener) {
        this.coarsePointerQuery.removeListener(this._handlePointerSchemeChange);
      }
    }
    this.canvas.removeEventListener('pointerdown', this._handlePointerDown);
    this.canvas.removeEventListener('pointerup', this._handlePointerUp);
    this.canvas.removeEventListener('pointermove', this._handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this._handlePointerLeave);
    this.canvas.removeEventListener('pointercancel', this._handlePointerCancel);
    this.audioToggle?.removeEventListener('music-toggle', this._handleMusicToggle);
  this.visualToggleButton?.removeEventListener('click', this._handleVisualToggle);
  this.minimapToggleButton?.removeEventListener('click', this._toggleMinimapVisibility);
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
    this._unbindTouchControls();
  if (this.bankFeedbackTimer) {
    clearTimeout(this.bankFeedbackTimer);
    this.bankFeedbackTimer = null;
  }
  if (this.levelBannerTimer) {
    clearTimeout(this.levelBannerTimer);
    this.levelBannerTimer = null;
  }
    this.audio.setMusicEnabled(false);
    this.webglRenderer?.dispose?.();
    this.webglRenderer = null;
    this.webglEnabled = false;
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
        this._ingestLevels(data.levels);
        this._prepareMinimap(true);
        this._ingestPortals(data.portals);
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
        this.localMomentum = data.you.momentum || null;
        this._applyLevelInfoFromPayload(data.you);
        this.statPanel.data = {
          stats: this.localStats,
          bonuses: this.localBonuses,
          health: this.localHealth.health,
          maxHealth: this.localHealth.maxHealth,
          momentum: this.localMomentum,
        };
        this.chargeMeter.actionName = 'Idle';
      } else if (data.type === 'state') {
        if (Array.isArray(data.levels)) {
          this._ingestLevels(data.levels);
        }
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
  this._ingestPortals(data.portals);
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
          this._applyLevelInfoFromPayload(me);
          this.localStats = me.stats;
          this.localBonuses = me.bonuses;
          this.localHealth = { health: me.health, maxHealth: me.maxHealth };
          this.localMomentum = me.momentum || null;
          this.statPanel.data = {
            stats: this.localStats,
            bonuses: this.localBonuses,
            health: me.health,
            maxHealth: me.maxHealth,
            momentum: this.localMomentum,
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
      } else if (data.type === 'portal-event') {
        this._handlePortalEvent(data);
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
    const dpr = window.devicePixelRatio || 1;
    const width = this.viewportWidth || this.canvas.clientWidth || this.canvas.width / dpr;
    const height = this.viewportHeight || this.canvas.clientHeight || this.canvas.height / dpr;
    const time = performance.now();
    const timeSeconds = time / 1000;

    ctx.clearRect(0, 0, width, height);

    if (!this.world) {
      if (this.webglRenderer && this.webglEnabled) {
        this.webglRenderer.render({ width, height, dpr, time: timeSeconds, dangerClusters: [] });
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

  const local = this.players.get(this.youId);
  const anchor = local ?? this.lastKnownPosition;
  const currentLevelId = local?.levelId ?? this.currentLevelId;
  const nearestPortal = this._computeNearestPortal(anchor, currentLevelId);
  this._updatePortalHint(currentLevelId, nearestPortal);
  this._updatePortalPrompt(local, currentLevelId, nearestPortal);
    const levelTheme = this._getLevelTheme(currentLevelId, this.currentLevelColor);

    const cameraX = local?.x ?? this.world.width / 2;
    const cameraY = local?.y ?? this.world.height / 2;
    this._updateSafeZoneIndicator(this._isPlayerInSafeZone(local));

    const heroScreen = local
      ? this._worldToScreen(local.x, local.y, cameraX, cameraY, width, height)
      : { x: width / 2, y: height / 2 };
    const focus = {
      x: Math.max(0, Math.min(1, heroScreen.x / Math.max(1, width))),
      y: Math.max(0, Math.min(1, heroScreen.y / Math.max(1, height))),
    };
    const safeScreen = this.bankInfo
      ? this._worldToScreen(this.bankInfo.x, this.bankInfo.y, cameraX, cameraY, width, height)
      : null;
    const safeCenter = safeScreen
      ? {
          x: Math.max(-2, Math.min(3, safeScreen.x / Math.max(1, width))),
          y: Math.max(-2, Math.min(3, safeScreen.y / Math.max(1, height))),
        }
      : { x: -1, y: -1 };
    const safeRadiusPx = this.bankInfo ? (this.bankInfo.radius || 0) * this.tileSize : 0;
    const safeRadius = safeRadiusPx > 0 ? safeRadiusPx / Math.max(1, Math.max(width, height)) : 0;
    const momentumStacks = Math.max(0, this.localMomentum?.stacks ?? 0);
    const momentumDuration = Math.max(1, this.localMomentum?.duration ?? 1);
    const momentumRemaining = Math.max(0, this.localMomentum?.remaining ?? 0);
    const momentumFraction = Math.max(0, Math.min(1, momentumRemaining / momentumDuration));
    const momentumBonus = Math.max(
      this.localMomentum?.bonus?.damage ?? 0,
      this.localMomentum?.bonus?.speed ?? 0,
      this.localMomentum?.bonus?.xp ?? 0
    );
    const momentumIntensity = Math.min(1, momentumStacks * 0.22 + momentumFraction * 0.35 + momentumBonus * 0.6);
    let portalDir = { x: 0, y: 0 };
    let portalIntensity = 0;
    if (nearestPortal) {
      const magnitude = Math.hypot(nearestPortal.dx, nearestPortal.dy);
      if (magnitude > 0.0001) {
        portalDir = { x: nearestPortal.dx / magnitude, y: nearestPortal.dy / magnitude };
      }
      portalIntensity = Math.max(0, 1 - Math.min(nearestPortal.distance / 14, 1));
    }
    const accentColorVec = this._cssColorToVec3(
      this.currentLevelColor || levelTheme?.shadow || '#38bdf8',
      [0.2, 0.45, 0.72]
    );
    const baseColorVec = this._cssColorToVec3(levelTheme?.background || '#0f172a', [0.05, 0.07, 0.12]);
    const dungeonFactor = currentLevelId ? 1 : 0;

    const dangerClusters = this.webglRenderer && this.webglEnabled
      ? this._collectDangerClusters(cameraX, cameraY, width, height, currentLevelId)
      : [];

    if (this.webglRenderer && this.webglEnabled) {
      this.webglRenderer.render({
        width,
        height,
        dpr,
        time: timeSeconds,
        focus,
        momentum: momentumIntensity,
        safeCenter,
        safeRadius,
        portalDirection: portalDir,
        portalIntensity,
        baseColor: baseColorVec,
        accentColor: accentColorVec,
        dungeonFactor,
        dangerClusters,
      });
    } else {
      ctx.fillStyle = levelTheme?.background || '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    const halfTilesX = width / (2 * this.tileSize);
    const halfTilesY = height / (2 * this.tileSize);

    const startX = Math.max(0, Math.floor(cameraX - halfTilesX - 1));
    const endX = Math.min(this.world.width, Math.ceil(cameraX + halfTilesX + 1));
    const startY = Math.max(0, Math.floor(cameraY - halfTilesY - 1));
    const endY = Math.min(this.world.height, Math.ceil(cameraY + halfTilesY + 1));

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const tile = this.world.tiles[y][x];
        const screenX = (x - cameraX) * this.tileSize + width / 2;
        const screenY = (y - cameraY) * this.tileSize + height / 2;
        if (tile === 'lava') {
          ctx.fillStyle = '#7c2d12';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          const gradient = ctx.createRadialGradient(
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2,
            this.tileSize * 0.15,
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2,
            this.tileSize * 0.6
          );
          const pulse = Math.sin((time / 170) + x * 0.5 + y * 0.5) * 0.15 + 0.75;
          gradient.addColorStop(0, `rgba(249, 115, 22, ${Math.min(0.85, 0.55 + pulse * 0.25)})`);
          gradient.addColorStop(1, 'rgba(185, 28, 28, 0.12)');
          ctx.fillStyle = gradient;
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          continue;
        }
        if (tile === 'void') {
          ctx.fillStyle = '#020617';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          const shimmer = Math.sin((time / 320) + x * 0.4 + y * 0.4) * 0.1 + 0.12;
          ctx.fillStyle = `rgba(129, 140, 248, ${0.05 + shimmer})`;
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          continue;
        }
        ctx.fillStyle = TILE_STYLE[tile] || '#1e293b';
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        if (tile === 'obsidian') {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.globalAlpha = 0.45;
          ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
          ctx.globalAlpha = 1;
        }
      }
    }

    this._renderPortals(ctx, cameraX, cameraY, width, height, time, local, currentLevelId);

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

    if (currentLevelId && this.currentLevelExit) {
      ctx.save();
      const exitOffsetX = (this.currentLevelExit.x - cameraX) * this.tileSize;
      const exitOffsetY = (this.currentLevelExit.y - cameraY) * this.tileSize;
      const exitColor = this.currentLevelColor || DEFAULT_PORTAL_COLOR;
      const pulse = Math.sin(time / 200) * 0.12 + 0.68;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = exitColor;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(exitOffsetX, exitOffsetY, this.tileSize * (0.65 + pulse * 0.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = this._withAlpha(exitColor, 0.35);
      ctx.beginPath();
      ctx.arc(exitOffsetX, exitOffsetY, this.tileSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
      ctx.font = '600 12px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', exitOffsetX, exitOffsetY - this.tileSize * 0.85);
      ctx.restore();
    }

    if (!currentLevelId) {
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
    }

    for (const drop of this.lootDrops.values()) {
      if (!drop) continue;
      if ((drop.levelId || null) !== (currentLevelId || null)) continue;
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
      if ((effect.levelId || null) !== (currentLevelId || null)) continue;
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
      if ((enemy.levelId || null) !== (currentLevelId || null)) continue;
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
      if ((player.levelId || null) !== (currentLevelId || null)) continue;
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
      if ((owner.levelId || null) !== (currentLevelId || null)) continue;
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

  this._renderPortalCompass(ctx, anchor, nearestPortal, cameraX, cameraY, width, height, currentLevelId, time);

  this._renderMinimap(local, currentLevelId, nearestPortal);

    if (currentLevelId) {
      const tint = levelTheme?.fill || this._withAlpha(this.currentLevelColor || DEFAULT_PORTAL_COLOR, 0.18);
      ctx.save();
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        this.tileSize * 2,
        width / 2,
        height / 2,
        Math.hypot(width, height) * 0.65
      );
      grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      grad.addColorStop(1, tint);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (this.activeAction) {
      const baseCharge = this.localBonuses?.maxCharge ?? 0.5;
      const clampedBase = Math.max(0.5, Math.min(5, baseCharge));
      const maxChargeWindow = clampedBase + CHARGE_TIME_BONUS;
      const elapsed = Date.now() - this.actionStart;
      const ratio = Math.max(0, Math.min(1, elapsed / (Math.max(0.1, maxChargeWindow) * 1000)));
      this.chargeMeter.value = ratio;
      this.audio.onChargeProgress(this.activeAction, ratio);
      if (ratio >= 0.999) {
        this._releaseAction();
      }
    }
  }

  _sendInput(timestamp) {
    if (this.chatActive) return;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!this.world) return;
    if (timestamp - this.lastInputSent < 50) return;

    let moveX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    let moveY = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);

    if (this.touchMoveVector) {
      moveX += this.touchMoveVector.x;
      moveY += this.touchMoveVector.y;
    }

    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
    }
    if (Math.abs(moveX) < 0.02) moveX = 0;
    if (Math.abs(moveY) < 0.02) moveY = 0;

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
    this.spellKeyActive = false;
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
    this._syncTouchChatButton();
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
    this._syncTouchChatButton();
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
    if (event.code === 'Space') {
      event.preventDefault();
      if (!this.spellKeyActive) {
        this.spellKeyActive = true;
        if (this.activeAction && this.activeAction !== 'spell') {
          this._cancelAction();
        }
        if (this.activeAction !== 'spell') {
          this._startAction('spell');
        }
      }
      return;
    }
    if (event.code === 'KeyE') {
      event.preventDefault();
      if (this._attemptPortalInteraction()) {
        return;
      }
      this._requestGatherLoot();
      return;
    }
    this.keys.add(event.code);
  }

  _handleKeyUp(event) {
    if (this.chatActive) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.spellKeyActive = false;
      const pointerAction = this._determineAction(this.pointerButtons);
      if (this.activeAction === 'spell' && pointerAction !== 'spell') {
        this._releaseAction();
      }
      return;
    }
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
      levelId: drop.levelId || null,
    };
  }

  _normalizePortal(portal) {
    if (!portal || !portal.id) return null;
    return {
      id: portal.id,
      levelId: portal.levelId || null,
      name: portal.name || 'Gateway',
      difficulty: portal.difficulty || '',
      color: portal.color || DEFAULT_PORTAL_COLOR,
      x: Number(portal.x) || 0,
      y: Number(portal.y) || 0,
    };
  }

  _ingestPortals(portals) {
    if (!Array.isArray(portals)) {
      if (!this.portals) {
        this.portals = new Map();
      }
      return;
    }
    const map = new Map();
    for (const raw of portals) {
      const normalized = this._normalizePortal(raw);
      if (normalized) {
        map.set(normalized.id, normalized);
      }
    }
    this.portals = map;
  }

  _toggleMinimapVisibility(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    this._setMinimapVisible(!this.minimapVisible);
  }

  _setMinimapVisible(visible, persist = true) {
    const next = Boolean(visible);
    this.minimapVisible = next;
    if (this.minimapCardEl) {
      this.minimapCardEl.classList.toggle('collapsed', !next);
    }
    if (this.minimapBodyEl) {
      this.minimapBodyEl.style.display = next ? '' : 'none';
    }
    if (this.minimapToggleButton) {
      this.minimapToggleButton.textContent = next ? 'Hide' : 'Show';
      this.minimapToggleButton.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (persist) {
      try {
        window.localStorage?.setItem(MINIMAP_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage failures
      }
    }
  }

  _loadMinimapPreference() {
    let stored = null;
    try {
      stored = window.localStorage?.getItem(MINIMAP_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === '0') {
      this._setMinimapVisible(false, false);
    } else {
      this._setMinimapVisible(true, false);
    }
  }

  _handleVisualToggle(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    if (!this.webglRenderer) {
      return;
    }
    this._setVisualEffectsEnabled(!this.webglEnabled);
  }

  _setVisualEffectsEnabled(enabled, persist = true) {
    const available = Boolean(this.webglRenderer);
    const next = available && Boolean(enabled);
    this.webglEnabled = next;
    if (this.webglCanvas) {
      this.webglCanvas.style.visibility = next ? 'visible' : 'hidden';
      this.webglCanvas.style.opacity = next ? '1' : '0';
    }
    this._syncVisualToggle();
    if (persist) {
      try {
        window.localStorage?.setItem(VISUAL_STORAGE_KEY, enabled ? '1' : '0');
      } catch (err) {
        // ignore storage issues
      }
    }
  }

  _syncVisualToggle() {
    if (!this.visualToggleButton) return;
    if (!this.webglRenderer) {
      this.visualToggleButton.textContent = 'Glow N/A';
      this.visualToggleButton.disabled = true;
      this.visualToggleButton.setAttribute('aria-pressed', 'false');
      this.visualToggleButton.setAttribute('aria-label', 'Glow visuals not supported');
      return;
    }
    const label = this.webglEnabled ? 'Glow On' : 'Glow Off';
    this.visualToggleButton.disabled = false;
    this.visualToggleButton.textContent = label;
    this.visualToggleButton.setAttribute('aria-pressed', this.webglEnabled ? 'true' : 'false');
    this.visualToggleButton.setAttribute('aria-label', `Glow visuals ${this.webglEnabled ? 'enabled' : 'disabled'}`);
  }

  _loadVisualPreference() {
    if (!this.webglRenderer) {
      this.webglEnabled = false;
      if (this.webglCanvas) {
        this.webglCanvas.style.visibility = 'hidden';
        this.webglCanvas.style.opacity = '0';
      }
      this._syncVisualToggle();
      return;
    }
    let stored = null;
    try {
      stored = window.localStorage?.getItem(VISUAL_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === '0') {
      this._setVisualEffectsEnabled(false, false);
    } else {
      this._setVisualEffectsEnabled(true, false);
    }
  }

  _setUICollapsed(collapsed, persist = true) {
    const next = Boolean(collapsed);
    this.uiCollapsed = next;
    if (next) {
      this.setAttribute('data-ui-collapsed', 'true');
    } else {
      this.removeAttribute('data-ui-collapsed');
    }
    this._syncTouchUiToggleButton();
    if (persist) {
      try {
        window.localStorage?.setItem(UI_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage failures
      }
    }
  }

  _loadUiCollapsePreference() {
    let stored = null;
    try {
      stored = window.localStorage?.getItem(UI_COLLAPSE_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === '1') {
      this._setUICollapsed(true, false);
    } else {
      this._setUICollapsed(false, false);
    }
  }

  _formatDistance(distance) {
    if (!Number.isFinite(distance)) return '0 tiles';
    const rounded = Math.max(0, Math.round(distance));
    return `${rounded} tile${rounded === 1 ? '' : 's'}`;
  }

  _describeDirection(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return '';
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return '';
    const compass = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const normalized = (compass + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalized / 45) % directions.length;
    return directions[index];
  }

  _computeNearestPortal(anchor, currentLevelId) {
    if (!anchor || !this.portals || currentLevelId) return null;
    let best = null;
    for (const portal of this.portals.values()) {
      if (!portal) continue;
      const dx = portal.x - anchor.x;
      const dy = portal.y - anchor.y;
      const distance = Math.hypot(dx, dy);
      if (!best || distance < best.distance) {
        best = { portal, distance, dx, dy };
      }
    }
    return best;
  }

  _updatePortalHint(currentLevelId, nearest) {
    if (!this.minimapPortalHintEl) return;
    if (currentLevelId) {
      this.minimapPortalHintEl.textContent = 'Find the exit sigil to return to the overworld.';
      return;
    }
    if (!nearest) {
      this.minimapPortalHintEl.textContent = 'Scouting for gateways...';
      return;
    }
    const direction = this._describeDirection(nearest.dx, nearest.dy);
    const parts = [`${nearest.portal.name || 'Gateway'}`, this._formatDistance(nearest.distance)];
    if (direction) {
      parts.push(direction);
    }
    this.minimapPortalHintEl.textContent = `Nearest gateway: ${parts.join(' · ')}`;
  }

  _updatePortalPrompt(local, currentLevelId, nearest) {
    if (!this.portalPromptEl) return;
    let text = '';
    if (local) {
      if (currentLevelId && this.currentLevelExit) {
        const exitDist = Math.hypot(local.x - this.currentLevelExit.x, local.y - this.currentLevelExit.y);
        if (exitDist <= PORTAL_INTERACT_RADIUS * 1.25) {
          const label = this.currentLevelInfo?.name || 'Stronghold';
          text = `Press E to exit ${label}`;
        }
      } else if (!currentLevelId && this.portals && this.portals.size) {
        let closest = null;
        let bestDist = Infinity;
        for (const portal of this.portals.values()) {
          const dist = Math.hypot(local.x - portal.x, local.y - portal.y);
          if (dist < bestDist) {
            bestDist = dist;
            closest = portal;
          }
        }
        if (closest && bestDist <= PORTAL_INTERACT_RADIUS * 1.3) {
          const parts = [`Enter ${closest.name || 'Gateway'}`];
          if (closest.difficulty) {
            parts.push(closest.difficulty);
          }
          text = `Press E to ${parts.join(' · ')}`;
        } else if (!closest && nearest && nearest.distance <= PORTAL_INTERACT_RADIUS * 1.3) {
          const parts = [`Enter ${nearest.portal.name || 'Gateway'}`];
          if (nearest.portal.difficulty) {
            parts.push(nearest.portal.difficulty);
          }
          text = `Press E to ${parts.join(' · ')}`;
        }
      }
    }
    if (text) {
      this.portalPromptEl.textContent = text;
      this.portalPromptEl.hidden = false;
    } else {
      this.portalPromptEl.hidden = true;
      this.portalPromptEl.textContent = '';
    }
  }

  _renderPortalCompass(ctx, anchor, nearest, cameraX, cameraY, width, height, currentLevelId, time) {
    if (!ctx || !nearest || !anchor || currentLevelId) return;
    const { portal, distance, dx, dy } = nearest;
    if (!portal || !Number.isFinite(distance) || distance < PORTAL_COMPASS_MIN_DISTANCE) return;
    const screenX = (portal.x - cameraX) * this.tileSize + width / 2;
    const screenY = (portal.y - cameraY) * this.tileSize + height / 2;
    const margin = this.tileSize * 1.2;
    if (screenX >= -margin && screenX <= width + margin && screenY >= -margin && screenY <= height + margin) {
      return;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const radius = Math.min(width, height) * PORTAL_COMPASS_RADIUS_FACTOR;
    const centerX = width / 2 + nx * radius;
    const centerY = height / 2 + ny * radius;
    const angle = Math.atan2(ny, nx);
    const color = portal.color || PORTAL_ARROW_COLOR;
    const pulse = Math.sin((time / 240) + distance * 0.15) * 0.08 + 0.88;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = this._withAlpha(color, pulse);
    const arrowLength = 30;
    const arrowWidth = 12;
    ctx.beginPath();
    ctx.moveTo(arrowLength / 2, 0);
    ctx.lineTo(-arrowLength / 2, arrowWidth / 2);
    ctx.lineTo(-arrowLength / 3, 0);
    ctx.lineTo(-arrowLength / 2, -arrowWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PORTAL_ARROW_OUTLINE;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([6, 10]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = this._withAlpha(color, 0.5);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, angle - 0.04, angle + 0.04);
    ctx.stroke();
    ctx.restore();

    const direction = this._describeDirection(dx, dy);
    const labelParts = [portal.name || 'Gateway', this._formatDistance(distance)];
    if (direction) {
      labelParts.push(direction);
    }
    const label = labelParts.join(' · ');
    const metricsCtx = ctx;
    metricsCtx.save();
    metricsCtx.font = '600 13px "Segoe UI"';
    metricsCtx.textAlign = 'center';
    metricsCtx.textBaseline = 'middle';
    const textWidth = metricsCtx.measureText(label).width;
    const paddingX = 12;
    const paddingY = 6;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 26;
    const labelX = width / 2;
    const labelY = 54;
    metricsCtx.globalAlpha = 0.82;
    metricsCtx.fillStyle = PORTAL_COMPASS_LABEL_BACKGROUND;
    metricsCtx.fillRect(labelX - boxWidth / 2, labelY - boxHeight / 2, boxWidth, boxHeight);
    metricsCtx.globalAlpha = 0.9;
    metricsCtx.strokeStyle = this._withAlpha(color, 0.65);
    metricsCtx.lineWidth = 1.2;
    metricsCtx.strokeRect(labelX - boxWidth / 2, labelY - boxHeight / 2, boxWidth, boxHeight);
    metricsCtx.fillStyle = PORTAL_COMPASS_TEXT_COLOR;
    metricsCtx.fillText(label, labelX, labelY);
    metricsCtx.restore();
  }

  _normalizeLevel(level) {
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
    const normalized = {
      id: level.id,
      name: level.name || level.id,
      difficulty: level.difficulty || '',
      color: level.color || DEFAULT_PORTAL_COLOR,
      origin: toPoint(level.origin),
      size: Math.max(0, Number(level.size) || 0),
      bounds: toBounds(level.bounds),
      entry: toPoint(level.entry),
      exit: toPoint(level.exit),
      entrance: toPoint(level.entrance),
    };
    if (!normalized.origin && normalized.bounds) {
      normalized.origin = {
        x: Math.max(0, Math.floor(normalized.bounds.minX - 0.5)),
        y: Math.max(0, Math.floor(normalized.bounds.minY - 0.5)),
      };
    }
    if (!normalized.size && normalized.bounds) {
      normalized.size = Math.max(0, Math.ceil(normalized.bounds.maxX - normalized.bounds.minX));
    }
    return normalized;
  }

  _ingestLevels(levels) {
    if (!Array.isArray(levels)) {
      if (!this.levels) {
        this.levels = new Map();
      }
      return;
    }
    const map = new Map();
    for (const raw of levels) {
      const normalized = this._normalizeLevel(raw);
      if (normalized) {
        map.set(normalized.id, normalized);
      }
    }
    this.levels = map;
    this.minimapBase = null;
  }

  _prepareMinimap(force = false) {
    if (!this.minimapCanvas) return;
    if (!this.world || !Array.isArray(this.world.tiles)) return;
    if (this.minimapBase && !force) return;
    const { width, height, tiles } = this.world;
    if (!Number.isFinite(width) || !Number.isFinite(height) || !tiles || !tiles.length) return;
    if (!this.minimapCtx) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
      if (!this.minimapCtx) return;
      this.minimapCtx.imageSmoothingEnabled = false;
    }
    this.minimapCanvas.width = MINIMAP_SIZE;
    this.minimapCanvas.height = MINIMAP_SIZE;
    this.minimapCanvas.style.width = `${MINIMAP_SIZE}px`;
    this.minimapCanvas.style.height = `${MINIMAP_SIZE}px`;

    const base = document.createElement('canvas');
    base.width = MINIMAP_SIZE;
    base.height = MINIMAP_SIZE;
    const ctx = base.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = MINIMAP_BACKGROUND;
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const scaleX = MINIMAP_SIZE / width;
    const scaleY = MINIMAP_SIZE / height;
    const tileWidth = Math.max(1, Math.ceil(scaleX));
    const tileHeight = Math.max(1, Math.ceil(scaleY));
    for (let y = 0; y < height; y += 1) {
      const row = tiles[y];
      if (!row) continue;
      for (let x = 0; x < width; x += 1) {
        const tile = row[x];
        ctx.fillStyle = MINIMAP_TILE_COLORS[tile] || MINIMAP_TILE_COLORS.water;
        ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), tileWidth, tileHeight);
      }
    }

    this.minimapBase = base;
    this.minimapScaleX = scaleX;
    this.minimapScaleY = scaleY;
  }

  _renderMinimap(local, currentLevelId, nearestPortal) {
    if (!this.minimapVisible) return;
    if (!this.minimapCanvas || !this.world) return;
    if (!this.minimapBase) {
      this._prepareMinimap();
      if (!this.minimapBase) return;
    }
    if (!this.minimapCtx) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
      if (!this.minimapCtx) return;
      this.minimapCtx.imageSmoothingEnabled = false;
    }
    const ctx = this.minimapCtx;
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.minimapBase, 0, 0, width, height);

    const scaleX = this.minimapScaleX || 1;
    const scaleY = this.minimapScaleY || 1;
    const levelKey = currentLevelId || null;
    const anchorX = local?.x ?? this.lastKnownPosition?.x ?? null;
    const anchorY = local?.y ?? this.lastKnownPosition?.y ?? null;

    ctx.save();

    for (const level of this.levels.values()) {
      const origin = level.origin || { x: 0, y: 0 };
      const size = Math.max(0, level.size || 0);
      const rectX = origin.x * scaleX;
      const rectY = origin.y * scaleY;
      const rectW = Math.max(2, size * scaleX);
      const rectH = Math.max(2, size * scaleY);
      const color = level.color || DEFAULT_PORTAL_COLOR;
      const active = level.id === levelKey;
      ctx.save();
      ctx.globalAlpha = active ? 0.3 : 0.18;
      ctx.fillStyle = this._withAlpha(color, active ? 0.3 : 0.18);
      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.globalAlpha = active ? 0.95 : 0.65;
      ctx.lineWidth = active ? 1.6 : 1.1;
      ctx.strokeStyle = this._withAlpha(color, active ? 0.9 : 0.6);
      ctx.strokeRect(rectX + 0.5, rectY + 0.5, Math.max(1, rectW - 1), Math.max(1, rectH - 1));
      ctx.restore();
    }

    if (this.bankInfo && Number.isFinite(this.bankInfo.x) && Number.isFinite(this.bankInfo.y) && Number.isFinite(this.bankInfo.radius)) {
      const centerX = this.bankInfo.x * scaleX;
      const centerY = this.bankInfo.y * scaleY;
      const radiusX = Math.max(2, this.bankInfo.radius * scaleX);
      const radiusY = Math.max(2, this.bankInfo.radius * scaleY);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = MINIMAP_SAFE_FILL;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = MINIMAP_SAFE_STROKE;
      ctx.stroke();
      ctx.restore();
    }

    if (!this.levels.size || levelKey === null) {
      for (const portal of this.portals.values()) {
        if (!portal) continue;
        const px = portal.x * scaleX;
        const py = portal.y * scaleY;
        const size = Math.max(2.5, (scaleX + scaleY) * 0.9);
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = this._withAlpha(portal.color || MINIMAP_PORTAL_COLOR, 0.95);
        ctx.beginPath();
        ctx.moveTo(px, py - size);
        ctx.lineTo(px + size, py);
        ctx.lineTo(px, py + size);
        ctx.lineTo(px - size, py);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    if (!currentLevelId && nearestPortal && anchorX != null && anchorY != null) {
      const px = nearestPortal.portal.x * scaleX;
      const py = nearestPortal.portal.y * scaleY;
      const cx = anchorX * scaleX;
      const cy = anchorY * scaleY;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = this._withAlpha(nearestPortal.portal.color || MINIMAP_PORTAL_COLOR, 0.85);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();
    }

    if (levelKey && this.currentLevelExit && Number.isFinite(this.currentLevelExit.x) && Number.isFinite(this.currentLevelExit.y)) {
      const ex = this.currentLevelExit.x * scaleX;
      const ey = this.currentLevelExit.y * scaleY;
      const radius = Math.max(3.6, (scaleX + scaleY) * 1.3);
      const accent = this.currentLevelColor || DEFAULT_PORTAL_COLOR;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = this._withAlpha(accent, 0.95);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ex, ey, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = this._withAlpha(accent, 0.4);
      ctx.beginPath();
      ctx.arc(ex, ey, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    let drewSelf = false;
    for (const player of this.players.values()) {
      if (!player) continue;
      if ((player.levelId || null) !== levelKey) continue;
      const px = player.x * scaleX;
      const py = player.y * scaleY;
      const isSelf = player.id === this.youId;
      const radius = Math.max(isSelf ? 3.4 : 2.4, (scaleX + scaleY) * (isSelf ? 1.1 : 0.8));
      ctx.save();
      ctx.globalAlpha = isSelf ? 0.95 : 0.82;
      ctx.fillStyle = isSelf ? MINIMAP_PLAYER_COLORS.you : MINIMAP_PLAYER_COLORS.ally;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      if (isSelf) {
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = MINIMAP_PLAYER_COLORS.you;
        ctx.stroke();
        drewSelf = true;
      }
      ctx.restore();
    }

    if (!drewSelf && this.lastKnownPosition && (this.lastKnownPosition.levelId || null) === levelKey) {
      const px = this.lastKnownPosition.x * scaleX;
      const py = this.lastKnownPosition.y * scaleY;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = MINIMAP_PLAYER_COLORS.you;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(3.2, (scaleX + scaleY)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const anchor = local || this.lastKnownPosition;
    if (anchor && this.canvas && this.canvas.clientWidth && this.canvas.clientHeight) {
      const halfX = (this.canvas.clientWidth / this.tileSize) / 2;
      const halfY = (this.canvas.clientHeight / this.tileSize) / 2;
      if (halfX > 0 && halfY > 0) {
        const left = Math.max(0, anchor.x - halfX);
        const top = Math.max(0, anchor.y - halfY);
        const right = Math.min(this.world.width, anchor.x + halfX);
        const bottom = Math.min(this.world.height, anchor.y + halfY);
        const rectX = left * scaleX;
        const rectY = top * scaleY;
        const rectW = Math.max(2, (right - left) * scaleX);
        const rectH = Math.max(2, (bottom - top) * scaleY);
        ctx.save();
        ctx.fillStyle = MINIMAP_VIEWPORT_FILL;
        ctx.fillRect(rectX, rectY, rectW, rectH);
        ctx.strokeStyle = MINIMAP_VIEWPORT_STROKE;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  _updateMinimapLabel(info) {
    if (!this.minimapLabelEl) return;
    const header = this.minimapHeaderEl;
    if (info) {
      const difficulty = info.difficulty ? ` · ${info.difficulty}` : '';
      this.minimapLabelEl.textContent = info.name ? `${info.name}${difficulty}` : info.id || 'Stronghold';
      if (info.difficulty) {
        this.minimapLabelEl.title = `${info.name || info.id} · ${info.difficulty}`;
      } else {
        this.minimapLabelEl.removeAttribute('title');
      }
      const accent = info.color || DEFAULT_PORTAL_COLOR;
      header?.style.setProperty('--minimap-accent', accent);
    } else {
      this.minimapLabelEl.textContent = 'Overworld';
      this.minimapLabelEl.removeAttribute('title');
      header?.style.setProperty('--minimap-accent', '#38bdf8');
    }
  }

  _applyLevelInfoFromPayload(you) {
    const levelId = you?.levelId || null;
    const x = Number(you?.x);
    const y = Number(you?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      this.lastKnownPosition = { x, y, levelId: levelId || null };
    }
    if (levelId) {
      const exit = you?.levelExit;
      const info = {
        id: levelId,
        name: you?.levelName || 'Stronghold',
        difficulty: you?.levelDifficulty || 'Challenge',
        color: you?.levelColor || DEFAULT_PORTAL_COLOR,
      };
      this.currentLevelId = levelId;
      this.currentLevelExit = exit && typeof exit === 'object'
        ? { x: Number(exit.x) || 0, y: Number(exit.y) || 0 }
        : this.currentLevelExit;
      this.currentLevelInfo = info;
      this.currentLevelColor = info.color;
      this._updateLevelStatus(info);
    } else {
      this.currentLevelId = null;
      this.currentLevelExit = null;
      this.currentLevelInfo = null;
      this.currentLevelColor = null;
      this._updateLevelStatus(null);
    }
  }

  _updateLevelStatus(info) {
    if (!this.zoneIndicatorEl) return;
    this._updateMinimapLabel(info);
    if (info) {
      const detail = info.difficulty ? `${info.name} · ${info.difficulty}` : info.name;
      this.zoneIndicatorEl.textContent = detail || info.id || 'Stronghold';
      const accent = info.color || DEFAULT_PORTAL_COLOR;
      this.zoneIndicatorEl.style.color = accent;
      this.zoneStatusEl?.classList.add('level');
    } else {
      this.zoneIndicatorEl.textContent = 'Overworld';
      this.zoneIndicatorEl.style.color = '#38bdf8';
      this.zoneStatusEl?.classList.remove('level');
    }
  }

  _withAlpha(color, alpha) {
    if (!color) return `rgba(56, 189, 248, ${alpha})`;
    if (color.startsWith('#')) {
      const hex = color.length === 4
        ? color
            .slice(1)
            .split('')
            .map((c) => c + c)
            .join('')
        : color.slice(1);
      const value = parseInt(hex, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgba(')) {
      const body = color.slice(5, -1).split(',').map((part) => part.trim());
      const [r = '56', g = '189', b = '248'] = body;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      const body = color.slice(4, -1);
      return `rgba(${body}, ${alpha})`;
    }
    return color;
  }

  _showLevelBanner(message, accent) {
    if (!this.levelBannerEl) return;
    const color = accent || DEFAULT_PORTAL_COLOR;
    this.levelBannerEl.textContent = message || '';
    this.levelBannerEl.hidden = false;
    this.levelBannerEl.style.setProperty('--level-accent', color);
    this.levelBannerEl.style.setProperty('--level-accent-shadow', this._withAlpha(color, 0.55));
    if (this.levelBannerTimer) {
      clearTimeout(this.levelBannerTimer);
    }
    this.levelBannerTimer = setTimeout(() => {
      this._hideLevelBanner();
    }, 3600);
  }

  _hideLevelBanner() {
    if (this.levelBannerTimer) {
      clearTimeout(this.levelBannerTimer);
      this.levelBannerTimer = null;
    }
    if (this.levelBannerEl) {
      this.levelBannerEl.hidden = true;
      this.levelBannerEl.textContent = '';
    }
  }

  _handlePortalEvent(data) {
    if (!data) return;
    const event = data.event;
    const levelPayload = data.level || {};
    if (event === 'enter') {
      const info = {
        id: levelPayload.id || this.currentLevelId || 'stronghold',
        name: levelPayload.name || 'Stronghold',
        difficulty: levelPayload.difficulty || 'Challenge',
        color: levelPayload.color || DEFAULT_PORTAL_COLOR,
      };
      this.currentLevelId = info.id;
      this.currentLevelExit = levelPayload.exit && typeof levelPayload.exit === 'object'
        ? { x: Number(levelPayload.exit.x) || 0, y: Number(levelPayload.exit.y) || 0 }
        : this.currentLevelExit;
      this.currentLevelInfo = info;
      this.currentLevelColor = info.color;
      this._updateLevelStatus(info);
      this.audio.ensureContext();
      this.audio.onEffect({ type: 'spell' }, true);
      this._showLevelBanner(`Entering ${info.name}${info.difficulty ? ` · ${info.difficulty}` : ''}`, info.color);
    } else if (event === 'exit') {
      this.currentLevelId = null;
      this.currentLevelExit = null;
      this.currentLevelInfo = null;
      this.currentLevelColor = null;
      this._updateLevelStatus(null);
      this.audio.ensureContext();
      this.audio.onEffect({ type: 'ranged' }, true);
      this._showLevelBanner('Returned to Overworld', DEFAULT_PORTAL_COLOR);
    }
  }

  _attemptPortalInteraction() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    const local = this.players.get(this.youId);
    if (!local) return false;
    const currentLevelId = local.levelId || this.currentLevelId;
    if (currentLevelId) {
      if (!this.currentLevelExit) return false;
      const dist = Math.hypot(local.x - this.currentLevelExit.x, local.y - this.currentLevelExit.y);
      if (dist <= PORTAL_INTERACT_RADIUS) {
        this.socket.send(
          JSON.stringify({
            type: 'portal',
            action: 'exit',
          })
        );
        return true;
      }
      return false;
    }
    let closest = null;
    let bestDist = Infinity;
    for (const portal of this.portals.values()) {
      const dist = Math.hypot(local.x - portal.x, local.y - portal.y);
      if (dist < bestDist) {
        bestDist = dist;
        closest = portal;
      }
    }
    if (closest && bestDist <= PORTAL_INTERACT_RADIUS) {
      this.socket.send(
        JSON.stringify({
          type: 'portal',
          action: 'enter',
          portalId: closest.id,
        })
      );
      return true;
    }
    return false;
  }

  _getLevelTheme(levelId, color) {
    if (!levelId) return null;
    const preset = LEVEL_VIGNETTE[levelId];
    if (preset) return preset;
    const accent = color || DEFAULT_PORTAL_COLOR;
    return {
      fill: this._withAlpha(accent, 0.18),
      shadow: this._withAlpha(accent, 0.45),
      background: '#0f172a',
    };
  }

  _collectDangerClusters(cameraX, cameraY, width, height, currentLevelId) {
    if (!this.enemies || !this.enemies.size) return [];
    const maxRadiusTiles = 2.5;
    const clusterDivisor = 2;
    const maxDistance = 30;
    const clusters = new Map();
    for (const enemy of this.enemies.values()) {
      if (!enemy) continue;
      if (enemy.levelId && enemy.levelId !== currentLevelId) continue;
      if (Number.isFinite(enemy.level) && enemy.level < 0) continue;
      const ex = Number(enemy.x);
      const ey = Number(enemy.y);
      if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;
      const dx = ex - cameraX;
      const dy = ey - cameraY;
      if (Math.hypot(dx, dy) > maxDistance) continue;
      const gx = Math.round(ex / clusterDivisor);
      const gy = Math.round(ey / clusterDivisor);
      const key = `${gx},${gy}`;
      let cluster = clusters.get(key);
      if (!cluster) {
        cluster = {
          count: 0,
          sumX: 0,
          sumY: 0,
          minX: ex,
          maxX: ex,
          minY: ey,
          maxY: ey,
        };
        clusters.set(key, cluster);
      }
      cluster.count += 1;
      cluster.sumX += ex;
      cluster.sumY += ey;
      if (ex < cluster.minX) cluster.minX = ex;
      if (ex > cluster.maxX) cluster.maxX = ex;
      if (ey < cluster.minY) cluster.minY = ey;
      if (ey > cluster.maxY) cluster.maxY = ey;
    }

    if (!clusters.size) return [];
    const results = [];
    const denomW = Math.max(1, width);
    const denomH = Math.max(1, height);
    const denomRadius = Math.max(denomW, denomH);
    for (const cluster of clusters.values()) {
      if (cluster.count <= 0) continue;
      const centerX = cluster.sumX / cluster.count;
      const centerY = cluster.sumY / cluster.count;
      const spanX = cluster.maxX - cluster.minX;
      const spanY = cluster.maxY - cluster.minY;
      const estimatedRadiusTiles = Math.min(maxRadiusTiles, Math.max(1.2, Math.max(spanX, spanY) * 0.5 + 0.8));
      const distance = Math.hypot(centerX - cameraX, centerY - cameraY);
      const crowdFactor = Math.min(1, cluster.count / 6);
      const distanceFactor = Math.max(0, 1 - distance / maxDistance);
      const intensity = Math.min(1, 0.35 + crowdFactor * 0.9) * distanceFactor;
      if (intensity <= 0.02) continue;
      const screen = this._worldToScreen(centerX, centerY, cameraX, cameraY, width, height);
      const normX = Math.max(-2, Math.min(3, screen.x / denomW));
      const normY = Math.max(-2, Math.min(3, screen.y / denomH));
      const radiusPx = estimatedRadiusTiles * this.tileSize;
      const normRadius = Math.min(1.2, radiusPx / denomRadius);
      results.push({ x: normX, y: normY, intensity, radius: normRadius });
    }

    results.sort((a, b) => b.intensity - a.intensity);
    return results.slice(0, 8);
  }

  _renderPortals(ctx, cameraX, cameraY, width, height, time, local, currentLevelId) {
    if (currentLevelId) return;
    if (!this.portals || !this.portals.size) return;
    for (const portal of this.portals.values()) {
      const offsetX = (portal.x - cameraX) * this.tileSize + width / 2;
      const offsetY = (portal.y - cameraY) * this.tileSize + height / 2;
      const near = local ? Math.hypot(local.x - portal.x, local.y - portal.y) <= PORTAL_INTERACT_RADIUS : false;
      const color = portal.color || DEFAULT_PORTAL_COLOR;
      const pulse = Math.sin((time / 240) + portal.x * 0.4 + portal.y * 0.4) * 0.2 + 0.8;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.globalAlpha = near ? 0.95 : 0.75;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, this.tileSize * (0.58 + pulse * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.28 + pulse * 0.12;
      ctx.fillStyle = this._withAlpha(color, 0.28 + pulse * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, this.tileSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
      ctx.font = '600 12px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText(portal.name, offsetX, offsetY - this.tileSize * 0.9);
      if (portal.difficulty) {
        ctx.font = '600 10px "Segoe UI"';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.92)';
        ctx.fillText(portal.difficulty, offsetX, offsetY - this.tileSize * 0.65);
      }
      ctx.restore();
    }
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
    const baseCharge = this.localBonuses?.maxCharge ?? 0.5;
    const clampedBase = Math.max(0.5, Math.min(5, baseCharge));
    const maxDuration = Math.max(0.1, (clampedBase + CHARGE_TIME_BONUS) * 1000);
    const ratio = Math.max(0, Math.min(1, (now - this.actionStart) / maxDuration));
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
  this.portals = new Map();
    this.world = null;
    this.youId = null;
    this.localStats = null;
    this.localBonuses = null;
    this.localHealth = { health: 0, maxHealth: 0 };
  this.localMomentum = null;
    this.inventory = { currency: 0, items: {} };
    this.bankInventory = { currency: 0, items: {} };
    this.bankInfo = null;
  this.currentLevelId = null;
  this.currentLevelExit = null;
  this.currentLevelInfo = null;
  this.currentLevelColor = null;
  this.lastSafeZoneState = null;
  this._updateInventoryPanel();
  this._updateSafeZoneIndicator(false);
  this._updateLevelStatus(null);
  this._hideLevelBanner();
  this._showBankFeedback('');
  if (this.portalPromptEl) {
    this.portalPromptEl.hidden = true;
    this.portalPromptEl.textContent = '';
  }
    this._clearTouchMovement();
    if (this.statPanel) {
      this.statPanel.data = {
        stats: { strength: 0, dexterity: 0, intellect: 0 },
        bonuses: { hitChance: 0, range: 0, maxCharge: 0 },
        health: 0,
        maxHealth: 0,
        momentum: null,
      };
    }
    this.activeAction = null;
    this.actionStart = 0;
    this.pointerButtons = 0;
    this.spellKeyActive = false;
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

  _enableTouchControls() {
    if (!this.touchEnabled) {
      this.touchEnabled = true;
      this.setAttribute('data-touch', 'true');
    }
    this._bindTouchControls();
    this._syncTouchChatButton();
    this._syncTouchUiToggleButton();
  }

  _bindTouchControls() {
    if (this.touchControlsBound) return;
    if (!this.touchControlsEl) return;
    this.touchControlsBound = true;
    this._clearTouchMovement();
    this.joystickEl?.addEventListener('pointerdown', this._handleJoystickStart);
    this.joystickEl?.addEventListener('pointermove', this._handleJoystickMove);
    this.joystickEl?.addEventListener('pointerup', this._handleJoystickEnd);
    this.joystickEl?.addEventListener('pointercancel', this._handleJoystickEnd);
    this.joystickEl?.addEventListener('pointerleave', this._handleJoystickEnd);
    for (const button of this.touchActionButtons) {
      button.addEventListener('pointerdown', this._handleTouchActionPress);
      button.addEventListener('pointerup', this._handleTouchActionRelease);
      button.addEventListener('pointercancel', this._handleTouchActionCancel);
      button.addEventListener('pointerleave', this._handleTouchActionCancel);
    }
    if (this.touchInteractButton) {
      this.touchInteractButton.addEventListener('pointerdown', this._handleTouchInteract);
      this.touchInteractButton.addEventListener('pointerup', this._handleTouchInteractEnd);
      this.touchInteractButton.addEventListener('pointercancel', this._handleTouchInteractEnd);
      this.touchInteractButton.addEventListener('pointerleave', this._handleTouchInteractEnd);
    }
    if (this.touchChatButton) {
      this.touchChatButton.addEventListener('pointerdown', this._handleTouchChatToggle);
      this.touchChatButton.addEventListener('pointerup', this._handleTouchChatPointerEnd);
      this.touchChatButton.addEventListener('pointercancel', this._handleTouchChatPointerEnd);
      this.touchChatButton.addEventListener('pointerleave', this._handleTouchChatPointerEnd);
    }
    if (this.touchUiToggleButton) {
      this.touchUiToggleButton.addEventListener('pointerdown', this._handleTouchUiToggle);
      this.touchUiToggleButton.addEventListener('pointerup', this._handleTouchUiPointerEnd);
      this.touchUiToggleButton.addEventListener('pointercancel', this._handleTouchUiPointerEnd);
      this.touchUiToggleButton.addEventListener('pointerleave', this._handleTouchUiPointerEnd);
    }
    this._syncTouchChatButton();
    this._syncTouchUiToggleButton();
  }

  _unbindTouchControls() {
    if (!this.touchControlsBound) return;
    this.touchControlsBound = false;
    this.joystickEl?.removeEventListener('pointerdown', this._handleJoystickStart);
    this.joystickEl?.removeEventListener('pointermove', this._handleJoystickMove);
    this.joystickEl?.removeEventListener('pointerup', this._handleJoystickEnd);
    this.joystickEl?.removeEventListener('pointercancel', this._handleJoystickEnd);
    this.joystickEl?.removeEventListener('pointerleave', this._handleJoystickEnd);
    for (const button of this.touchActionButtons) {
      button.removeEventListener('pointerdown', this._handleTouchActionPress);
      button.removeEventListener('pointerup', this._handleTouchActionRelease);
      button.removeEventListener('pointercancel', this._handleTouchActionCancel);
      button.removeEventListener('pointerleave', this._handleTouchActionCancel);
    }
    if (this.touchInteractButton) {
      this.touchInteractButton.removeEventListener('pointerdown', this._handleTouchInteract);
      this.touchInteractButton.removeEventListener('pointerup', this._handleTouchInteractEnd);
      this.touchInteractButton.removeEventListener('pointercancel', this._handleTouchInteractEnd);
      this.touchInteractButton.removeEventListener('pointerleave', this._handleTouchInteractEnd);
    }
    if (this.touchChatButton) {
      this.touchChatButton.removeEventListener('pointerdown', this._handleTouchChatToggle);
      this.touchChatButton.removeEventListener('pointerup', this._handleTouchChatPointerEnd);
      this.touchChatButton.removeEventListener('pointercancel', this._handleTouchChatPointerEnd);
      this.touchChatButton.removeEventListener('pointerleave', this._handleTouchChatPointerEnd);
    }
    if (this.touchUiToggleButton) {
      this.touchUiToggleButton.removeEventListener('pointerdown', this._handleTouchUiToggle);
      this.touchUiToggleButton.removeEventListener('pointerup', this._handleTouchUiPointerEnd);
      this.touchUiToggleButton.removeEventListener('pointercancel', this._handleTouchUiPointerEnd);
      this.touchUiToggleButton.removeEventListener('pointerleave', this._handleTouchUiPointerEnd);
    }
    this._clearTouchMovement();
  }

  _handlePointerSchemeChange(event) {
    if (event?.matches) {
      this.detectedTouch = true;
      this._enableTouchControls();
    }
  }

  _handleGlobalPointerDown(event) {
    if (this._isTouchLike(event)) {
      this.detectedTouch = true;
      this._enableTouchControls();
    }
  }

  _isTouchLike(event) {
    if (!event) return false;
    const type = event.pointerType;
    return type === 'touch' || type === 'pen' || type === '' || type === undefined;
  }

  _handleJoystickStart(event) {
    if (!this._isTouchLike(event)) return;
    this._enableTouchControls();
    this.joystickActive = true;
    this.joystickPointerId = event.pointerId;
    this.joystickEl?.setPointerCapture?.(event.pointerId);
    this._updateJoystickVector(event);
    event.preventDefault();
  }

  _handleJoystickMove(event) {
    if (!this.joystickActive) return;
    if (event.pointerId !== this.joystickPointerId) return;
    this._updateJoystickVector(event);
    event.preventDefault();
  }

  _handleJoystickEnd(event) {
    if (event.pointerId !== this.joystickPointerId) return;
    this.joystickActive = false;
    this.joystickPointerId = null;
    if (this.joystickEl?.hasPointerCapture?.(event.pointerId)) {
      this.joystickEl?.releasePointerCapture?.(event.pointerId);
    }
    this._clearTouchMovement();
    event.preventDefault();
  }

  _updateJoystickVector(event) {
    if (!this.joystickEl) return;
    const rect = this.joystickEl.getBoundingClientRect();
    const radius = rect.width / 2;
    if (!radius) return;
    const maxRadius = radius * 0.85;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    let vx = dx / maxRadius;
    let vy = dy / maxRadius;
    const length = Math.hypot(vx, vy);
    if (length > 1) {
      vx /= length;
      vy /= length;
    }
    vx = Math.max(-1, Math.min(1, vx));
    vy = Math.max(-1, Math.min(1, vy));
    this.touchMoveVector = { x: vx, y: vy };
    this._updateJoystickThumb(this.touchMoveVector, radius * 0.55);
    const moveMagnitude = Math.hypot(this.touchMoveVector.x, this.touchMoveVector.y);
    if (moveMagnitude > 0.1) {
      this.pointerAim = this._normalize({ x: this.touchMoveVector.x, y: this.touchMoveVector.y });
    }
  }

  _updateJoystickThumb(vector, travel) {
    if (!this.joystickThumbEl) return;
    const range = travel ?? (this.joystickEl ? (this.joystickEl.offsetWidth || 0) * 0.25 : 36);
    const tx = vector.x * range;
    const ty = vector.y * range;
    this.joystickThumbEl.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }

  _clearTouchMovement() {
    this.touchMoveVector = { x: 0, y: 0 };
    if (this.joystickThumbEl) {
      this.joystickThumbEl.style.transform = 'translate3d(0, 0, 0)';
    }
  }

  _syncTouchChatButton() {
    if (!this.touchChatButton) return;
    this.touchChatButton.classList.toggle('active', Boolean(this.chatActive));
  }

  _syncTouchUiToggleButton() {
    if (!this.touchUiToggleButton) return;
    const label = this.uiCollapsed ? 'Show HUD' : 'Hide HUD';
    if (this.touchUiToggleLabel) {
      this.touchUiToggleLabel.textContent = label;
    } else {
      this.touchUiToggleButton.textContent = label;
    }
    this.touchUiToggleButton.classList.toggle('active', Boolean(this.uiCollapsed));
    this.touchUiToggleButton.setAttribute('aria-pressed', this.uiCollapsed ? 'true' : 'false');
    this.touchUiToggleButton.setAttribute('aria-label', label);
  }

  _handleTouchChatToggle(event) {
    if (!this._isTouchLike(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._enableTouchControls();
    if (this.chatActive) {
      this._exitChatMode();
    } else {
      this._enterChatMode();
    }
    this._syncTouchChatButton();
  }

  _handleTouchChatPointerEnd(event) {
    if (!this._isTouchLike(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._syncTouchChatButton();
  }

  _handleTouchUiToggle(event) {
    if (!this._isTouchLike(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._enableTouchControls();
    this._setUICollapsed(!this.uiCollapsed);
  }

  _handleTouchUiPointerEnd(event) {
    if (!this._isTouchLike(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this._syncTouchUiToggleButton();
  }

  _handleTouchActionPress(event) {
    if (!this._isTouchLike(event)) return;
    const button = event.currentTarget;
    const action = button?.dataset?.touchAction;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    this._enableTouchControls();
    if (this.activeAction && this.activeAction !== action) {
      this._cancelAction();
    }
    this._startAction(action);
    button.classList.add('active');
  }

  _handleTouchActionRelease(event) {
    if (!this._isTouchLike(event)) return;
    const button = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    button?.classList.remove('active');
    this._releaseAction();
  }

  _handleTouchActionCancel(event) {
    if (!this._isTouchLike(event)) return;
    const button = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    button?.classList.remove('active');
    this._cancelAction();
  }

  _handleTouchInteract(event) {
    if (!this._isTouchLike(event)) return;
    const button = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    button?.classList.add('active');
    this._enableTouchControls();
    const portalUsed = this._attemptPortalInteraction();
    this._requestGatherLoot();
    if (!portalUsed) {
      setTimeout(() => {
        button?.classList.remove('active');
      }, 160);
    }
  }

  _handleTouchInteractEnd(event) {
    if (!this._isTouchLike(event)) return;
    const button = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    button?.classList.remove('active');
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

  _worldToScreen(worldX, worldY, cameraX, cameraY, width, height) {
    return {
      x: (worldX - cameraX) * this.tileSize + width / 2,
      y: (worldY - cameraY) * this.tileSize + height / 2,
    };
  }

  _cssColorToVec3(color, fallback = [0, 0, 0]) {
    if (Array.isArray(color)) {
      const [r = 0, g = 0, b = 0] = color;
      return [
        Math.max(0, Math.min(1, Number(r))),
        Math.max(0, Math.min(1, Number(g))),
        Math.max(0, Math.min(1, Number(b))),
      ];
    }
    if (typeof color !== 'string') {
      return fallback.slice();
    }
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
      let hex = trimmed.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        hex = hex
          .split('')
          .map((ch) => ch + ch)
          .join('');
      }
      if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        if ([r, g, b].every((value) => Number.isFinite(value))) {
          return [r / 255, g / 255, b / 255];
        }
      }
    } else {
      const match = trimmed.match(/rgba?\(([^)]+)\)/i);
      if (match) {
        const parts = match[1]
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((value, index) => index < 3 && Number.isFinite(value));
        if (parts.length === 3) {
          return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
        }
      }
    }
    return fallback.slice();
  }

  _resizeCanvas() {
    const rect = this.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.canvas.style) {
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
    if (this.webglRenderer) {
      this.webglRenderer.setSize(rect.width, rect.height, dpr);
    } else if (this.webglCanvas) {
      this.webglCanvas.width = rect.width * dpr;
      this.webglCanvas.height = rect.height * dpr;
      if (this.webglCanvas.style) {
        this.webglCanvas.style.width = `${rect.width}px`;
        this.webglCanvas.style.height = `${rect.height}px`;
      }
    }
  }
}

customElements.define('game-app', GameApp);
