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
      --hud-gap: clamp(0.85rem, 1.1vw + 0.2rem, 1.35rem);
      --hud-panel-max-width: clamp(200px, 21vw, 260px);
      --hud-panel-background: rgba(15, 23, 42, 0.72);
      --hud-panel-border: rgba(148, 163, 184, 0.28);
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
      pointer-events: none;
      padding: var(--hud-gap);
      z-index: 3;
    }

    .hud > * {
      position: absolute;
      pointer-events: auto;
      max-width: min(var(--hud-panel-max-width), calc(100% - (var(--hud-gap) * 2)));
    }

    .hud .top-left {
      top: var(--hud-gap);
      left: var(--hud-gap);
      width: min(var(--hud-panel-max-width), calc(48vw - var(--hud-gap)));
      display: grid;
      gap: 0.6rem;
    }

    .utility-bar charge-meter {
      flex: 1 1 150px;
      min-width: 0;
    }

    .minimap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .minimap-header-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .minimap-header-actions span {
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.78);
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

    .map-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.2rem;
      padding: 2.5rem clamp(1.5rem, 4vw, 3rem);
      background: rgba(15, 23, 42, 0.86);
      backdrop-filter: blur(8px);
      z-index: 40;
      pointer-events: auto;
    }

    .map-overlay[hidden] {
      display: none;
    }

    .map-overlay header {
      text-align: center;
      display: grid;
      gap: 0.35rem;
      color: rgba(226, 232, 240, 0.96);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .map-overlay header h3 {
      margin: 0;
      font-size: clamp(1.1rem, 2vw, 1.6rem);
      letter-spacing: 0.08em;
    }

    .map-overlay header p {
      margin: 0;
      font-size: clamp(0.7rem, 1vw, 0.85rem);
      color: rgba(148, 163, 184, 0.9);
      letter-spacing: 0.05em;
    }

    .map-overlay canvas {
      width: min(78vw, 78vh);
      max-width: 780px;
      max-height: 780px;
      border-radius: 1.1rem;
      border: 1px solid rgba(148, 163, 184, 0.38);
      box-shadow: 0 1.8rem 3.4rem rgba(8, 15, 31, 0.55);
      background: rgba(10, 17, 31, 0.92);
    }

    .map-overlay button {
      all: unset;
      cursor: pointer;
      padding: 0.55rem 1.2rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      background: rgba(30, 41, 59, 0.76);
      color: rgba(226, 232, 240, 0.92);
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: background 120ms ease, border 120ms ease, transform 120ms ease;
    }

    .map-overlay button:hover {
      background: rgba(51, 65, 85, 0.85);
      border-color: rgba(148, 163, 184, 0.65);
    }

    .map-overlay button:active {
      transform: translateY(1px);
    }

    .map-controls {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    :host([data-map-open="true"]) .minimap-card {
      visibility: hidden;
      pointer-events: none;
    }

    .minimap-body {
      display: grid;
      gap: 0.55rem;
    }

    .minimap-card.floating {
      position: absolute;
      z-index: 12;
      cursor: grab;
      pointer-events: auto;
      box-shadow: 0 1.4rem 2.4rem rgba(15, 23, 42, 0.45);
    }

    .minimap-card.floating.dragging {
      cursor: grabbing;
    }

    .minimap-ghost {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      margin-bottom: 0.45rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.45);
      color: rgba(226, 232, 240, 0.85);
      font-size: 0.68rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      box-shadow: 0 0.9rem 1.8rem rgba(15, 23, 42, 0.35);
      pointer-events: auto;
      transition: background 140ms ease, border 140ms ease, transform 80ms ease;
    }

    .minimap-ghost:hover {
      background: rgba(30, 41, 59, 0.88);
      border-color: rgba(148, 163, 184, 0.6);
      transform: translateY(-1px);
    }

    .minimap-ghost:active {
      transform: translateY(0);
    }

    canvas[data-minimap] {
      width: clamp(120px, 20vw, 160px);
      height: clamp(120px, 20vw, 160px);
      max-width: 100%;
      background: rgba(15, 23, 42, 0.9);
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.28);
      box-shadow: inset 0 0 1.1rem rgba(8, 15, 31, 0.42);
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
      bottom: var(--hud-gap);
      left: var(--hud-gap);
      width: clamp(210px, 24vw, 280px);
      max-width: min(var(--hud-panel-max-width), calc(48vw - var(--hud-gap)));
      max-height: calc(48vh - var(--hud-gap));
      overflow-y: auto;
      color: rgba(226, 232, 240, 0.86);
      font-size: 0.74rem;
      line-height: 1.35;
      background: rgba(15, 23, 42, 0.64);
      border-radius: 0.7rem;
      padding: 0.6rem 0.8rem;
      border: 1px solid rgba(148, 163, 184, 0.22);
      backdrop-filter: blur(6px);
      display: grid;
      gap: 0.55rem;
    }

    .hud .bottom-right {
      bottom: var(--hud-gap);
      right: var(--hud-gap);
      width: clamp(210px, 24vw, 280px);
      max-width: min(var(--hud-panel-max-width), calc(48vw - var(--hud-gap)));
      display: grid;
      gap: 0.5rem;
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

    .identity-tools button[data-attention='true'] {
      border-color: rgba(250, 191, 36, 0.8);
      box-shadow: 0 0 0.6rem rgba(250, 191, 36, 0.35);
      background: rgba(30, 41, 59, 0.95);
      color: #fef3c7;
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
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.32rem 0.6rem;
      border-radius: 0.6rem;
      background: rgba(30, 41, 59, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.32);
      font-size: 0.68rem;
      letter-spacing: 0.05em;
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

    .hero-name {
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #f8fafc;
    }

    .hero-account {
      font-size: 0.8rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      color: rgba(148, 163, 184, 0.85);
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
      width: 100%;
      box-sizing: border-box;
    }

    .identity-card input::placeholder {
      color: rgba(148, 163, 184, 0.6);
    }

    .identity-feedback {
      min-height: 1.05rem;
      font-size: 0.78rem;
      color: #fbbf24;
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

    .identity-secondary {
      all: unset;
      cursor: pointer;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(147, 197, 253, 0.9);
      transition: color 120ms ease;
    }

    .identity-secondary:hover {
      color: rgba(191, 219, 254, 1);
      text-decoration: underline;
    }

    .account-card {
      text-align: left;
      gap: 0.65rem;
    }

    .onboarding-feedback {
      min-height: 1rem;
      font-size: 0.76rem;
      color: #fca5a5;
    }

    .tutorial-card {
      width: clamp(300px, 50vw, 480px);
      text-align: left;
    }

    .tutorial-card .tutorial-body {
      display: grid;
      gap: 0.75rem;
      font-size: 0.85rem;
      line-height: 1.6;
      color: rgba(226, 232, 240, 0.9);
    }

    .tutorial-card .tutorial-progress {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(148, 163, 184, 0.78);
      text-align: center;
    }

    .tutorial-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .tutorial-actions button {
      flex: 1 1 auto;
      text-align: center;
    }

    .admin-card {
      width: clamp(320px, 60vw, 640px);
      text-align: left;
      gap: 1rem;
    }

    .admin-card h3 {
      text-align: center;
    }

    .settings-card {
      width: clamp(280px, 45vw, 420px);
      text-align: left;
      display: grid;
      gap: 1rem;
    }

    .settings-section {
      display: grid;
      gap: 0.45rem;
      padding: 0.8rem;
      border-radius: 0.75rem;
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .settings-section h4 {
      margin: 0;
      font-size: 0.9rem;
      color: #e2e8f0;
    }

    .settings-section p {
      margin: 0;
      font-size: 0.8rem;
      color: rgba(203, 213, 225, 0.9);
      line-height: 1.5;
    }

    .settings-section button {
      justify-self: start;
    }

    .settings-feedback {
      min-height: 1rem;
      font-size: 0.78rem;
      color: #bae6fd;
      text-align: center;
    }

    .admin-status {
      font-size: 0.78rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.85);
      text-align: center;
    }

    .admin-content {
      max-height: clamp(220px, 55vh, 420px);
      overflow-y: auto;
      display: grid;
      gap: 0.85rem;
    }

    .admin-profile {
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 0.65rem;
      padding: 0.7rem 0.8rem;
      background: rgba(30, 41, 59, 0.72);
      display: grid;
      gap: 0.55rem;
    }

    .admin-profile header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.45rem;
      font-size: 0.85rem;
      color: #e2e8f0;
    }

    .admin-profile .admin-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06rem;
      color: rgba(148, 163, 184, 0.75);
    }

    .admin-profile .admin-details {
      display: grid;
      gap: 0.4rem;
      font-size: 0.78rem;
      color: rgba(226, 232, 240, 0.88);
    }

    .admin-profile .admin-field {
      display: grid;
      gap: 0.35rem;
    }

    .admin-profile .admin-field-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08rem;
      color: rgba(148, 163, 184, 0.72);
    }

    .admin-profile .admin-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .admin-profile .admin-actions button,
    .admin-profile .admin-actions input {
      flex: 1 1 110px;
    }

    .admin-profile input[type="number"] {
      all: unset;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 0.55rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.75rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      color: #e2e8f0;
      text-align: center;
      width: 100%;
    }

    .admin-feedback {
      font-size: 0.75rem;
      min-height: 1rem;
      text-align: center;
      color: #bae6fd;
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
      display: grid;
      gap: 0.45rem;
    }

    .desktop-help[hidden],
    .mobile-help[hidden] {
      display: none !important;
    }

    .desktop-help h4 {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.8);
    }

    .help-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.3rem;
    }

    .help-list li {
      display: flex;
      justify-content: space-between;
      gap: 0.45rem;
      font-size: 0.74rem;
      color: rgba(226, 232, 240, 0.85);
    }

    .help-list li span:first-child {
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.9);
    }

    .help-footnote {
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.75);
    }

    .mobile-help {
      display: none;
      font-size: 0.76rem;
      line-height: 1.4;
      letter-spacing: 0.04em;
      color: rgba(226, 232, 240, 0.85);
      background: rgba(15, 23, 42, 0.68);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 0.65rem;
      padding: 0.45rem 0.6rem;
    }

    :host([data-touch]) .desktop-help {
      display: none;
    }

    :host([data-touch]) .mobile-help {
      display: block;
    }

    :host([data-touch]) .hud .bottom-left {
      bottom: calc(var(--hud-gap) + clamp(110px, 18vh, 190px));
      max-height: calc(48vh - var(--hud-gap));
    }

    :host([data-touch]) .hud .bottom-right {
      bottom: calc(var(--hud-gap) + clamp(96px, 16vh, 176px));
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

    .toast-stack {
      position: absolute;
      top: clamp(1rem, 3vh, 2.5rem);
      right: clamp(1rem, 3vw, 2.5rem);
      display: grid;
      gap: 0.6rem;
      z-index: 20;
      pointer-events: none;
    }

    .toast-message {
      min-width: 220px;
      max-width: min(320px, 40vw);
      padding: 0.65rem 0.9rem;
      border-radius: 0.7rem;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #e2e8f0;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 1.2rem 2.4rem rgba(8, 16, 32, 0.45);
      animation: toast-in 220ms ease;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
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

    :host([data-compact]) {
      --hud-gap: clamp(0.55rem, 0.8vw, 0.75rem);
      --hud-panel-max-width: clamp(190px, 24vw, 240px);
    }

    :host([data-compact]) .hud .bottom-left,
    :host([data-compact]) .hud .bottom-right {
      font-size: 0.7rem;
    }

    :host([data-compact]) .touch-controls {
      left: 0.6rem;
      right: 0.6rem;
      bottom: 0.6rem;
      gap: 1rem;
    }

    :host([data-compact]) .touch-pad {
      width: clamp(96px, 32vw, 136px);
      height: clamp(96px, 32vw, 136px);
    }

    :host([data-compact]) .touch-thumb {
      width: clamp(44px, 12vw, 58px);
      height: clamp(44px, 12vw, 58px);
    }

    :host([data-compact]) .touch-actions {
      min-width: min(220px, 72vw);
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      padding: 0.5rem;
    }

    :host([data-compact]) .touch-actions button {
      padding: 0.5rem 0.55rem;
      font-size: 0.72rem;
    }

    :host([data-compact]) .touch-actions .touch-hint {
      display: none;
    }

    :host([data-compact]) .gear-slot {
      padding: 0.55rem;
    }

    :host([data-compact]) .gear-slot header .slot-equipped {
      font-size: 0.74rem;
    }

    :host([data-compact]) .gear-options button {
      font-size: 0.7rem;
      padding: 0.35rem 0.45rem;
    }

    .compact-status {
      position: absolute;
      top: 0.85rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.4rem;
      padding: 0.4rem 0.55rem;
      border-radius: 0.65rem;
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #e2e8f0;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 0.65rem 1.4rem rgba(15, 23, 42, 0.45);
      z-index: 6;
      pointer-events: none;
    }

    .compact-status[hidden] {
      display: none;
    }

    .compact-status .metric {
      display: grid;
      gap: 0.25rem;
      min-width: 94px;
    }

    .compact-status .metric .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: rgba(226, 232, 240, 0.85);
    }

    .compact-status .metric .label-row span:last-child {
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.7rem;
      color: #f8fafc;
    }

    .compact-status .metric .bar {
      height: 0.35rem;
      border-radius: 999px;
      background: rgba(71, 85, 105, 0.45);
      overflow: hidden;
    }

    .compact-status .metric .bar span {
      display: block;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #38bdf8, #6366f1);
      transition: width 160ms ease;
    }

    .compact-status .metric[data-kind="momentum"] .bar span {
      background: linear-gradient(90deg, #f97316, #fb7185);
    }

    @media (max-width: 1280px) {
      :host {
        --hud-gap: clamp(0.6rem, 0.9vw, 1rem);
        --hud-panel-max-width: clamp(190px, 28vw, 260px);
      }

      .hud .top-right,
      .hud .top-left {
        gap: 0.5rem;
      }

      .hud .bottom-left,
      .hud .bottom-right {
        width: clamp(190px, 32vw, 260px);
      }

      .utility-bar {
        gap: 0.35rem;
      }
    }

    @media (max-width: 960px) {
      :host {
        font-size: 15px;
        --hud-gap: 0.8rem;
        --hud-panel-max-width: clamp(220px, 80vw, 420px);
      }

      .hud {
        position: static;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.85rem;
        pointer-events: auto;
      }

      .hud > * {
        position: static;
        width: 100%;
        max-width: none;
      }

      :host([data-touch]) .hud .bottom-left,
      :host([data-touch]) .hud .bottom-right {
        bottom: auto;
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
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 0.85rem;
      border: 1px solid rgba(148, 163, 184, 0.3);
      padding: 0.65rem 0.8rem;
      color: #e2e8f0;
      font-size: 0.76rem;
      line-height: 1.35;
      box-shadow: 0 0.8rem 2rem rgba(8, 15, 31, 0.4);
      backdrop-filter: blur(6px);
      display: grid;
      gap: 0.55rem;
      max-height: min(46vh, 340px);
      overflow: hidden;
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
      gap: 0.45rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.76rem;
      color: #f8fafc;
    }

    .resource-panel ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
      max-height: 8.5rem;
      overflow-y: auto;
      padding-right: 0.1rem;
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

    .gear-panel {
      gap: 0.6rem;
      max-height: min(46vh, 360px);
      overflow: hidden;
    }

    .gear-panel .gear-head h4 {
      margin-bottom: 0.35rem;
    }

    .gear-panel .gear-head p {
      margin: 0;
      color: rgba(148, 163, 184, 0.75);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .gear-slots {
      display: grid;
      gap: 0.55rem;
      max-height: 14rem;
      overflow-y: auto;
      padding-right: 0.1rem;
    }

    .gear-slot {
      padding: 0.6rem;
      border-radius: 0.65rem;
      background: rgba(30, 41, 59, 0.68);
      border: 1px solid rgba(148, 163, 184, 0.28);
      display: grid;
      gap: 0.45rem;
    }

    .gear-slot header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: baseline;
    }

    .gear-slot header .slot-label {
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.82);
    }

    .gear-slot header .slot-equipped {
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
      font-size: 0.74rem;
      color: #f8fafc;
    }

    .gear-options {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }

    .gear-options li {
      display: grid;
      gap: 0.2rem;
    }

    .gear-options li.locked {
      padding: 0.35rem 0.45rem;
      border-radius: 0.5rem;
      border: 1px dashed rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.45);
      color: rgba(148, 163, 184, 0.65);
    }

    .gear-options li.locked .summary {
      color: rgba(148, 163, 184, 0.55);
    }

    .gear-options button {
      all: unset;
      cursor: pointer;
      padding: 0.4rem 0.55rem;
      border-radius: 0.55rem;
      background: rgba(56, 189, 248, 0.18);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #e0f2fe;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      transition: background 140ms ease, border 140ms ease, color 140ms ease, transform 80ms ease;
    }

    .gear-options button:hover {
      background: rgba(56, 189, 248, 0.3);
      border-color: rgba(125, 211, 252, 0.6);
    }

    .gear-options button:active {
      transform: translateY(1px);
    }

    .gear-options button.active {
      background: rgba(56, 189, 248, 0.4);
      border-color: rgba(125, 211, 252, 0.75);
      color: #0f172a;
    }

    .gear-options .summary {
      font-size: 0.7rem;
      letter-spacing: 0.03em;
      color: rgba(148, 163, 184, 0.72);
      line-height: 1.45;
    }

    .gear-feedback {
      font-size: 0.72rem;
      color: rgba(148, 163, 184, 0.85);
      min-height: 1.1rem;
      font-family: "Menlo", "Consolas", "Segoe UI Mono", monospace;
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
      <div class="utility-bar">
        <charge-meter></charge-meter>
        <audio-toggle></audio-toggle>
        <button type="button" class="visual-toggle" data-visual-toggle aria-pressed="true">Glow On</button>
      </div>
      <button
        type="button"
        class="minimap-ghost"
        data-minimap-ghost
        hidden
        aria-hidden="true"
        aria-label="Show minimap"
      >
        Show Minimap
      </button>
      <div class="minimap-card" data-minimap-card>
        <div class="minimap-header" data-minimap-header>
          <span>Minimap</span>
          <div class="minimap-header-actions">
            <span data-minimap-label>Overworld</span>
            <button type="button" data-minimap-expand aria-haspopup="dialog" aria-pressed="false">Expand</button>
            <button type="button" data-minimap-float aria-pressed="false">Float</button>
            <button type="button" data-minimap-toggle aria-pressed="false">Hide</button>
          </div>
        </div>
        <div class="minimap-body" data-minimap-body>
          <canvas data-minimap></canvas>
          <ul class="minimap-legend">
            <li data-type="you">You</li>
            <li data-type="hero">Allies</li>
            <li data-type="pvp">PvP Flagged</li>
            <li data-type="portal">Portals</li>
            <li data-type="safe">Safe Zone</li>
          </ul>
          <div class="minimap-footer" data-minimap-portal-hint>Follow the gold arrow to reach a gateway.</div>
        </div>
      </div>
    </div>
    <div class="bottom-left">
      <div class="desktop-help">
        <h4>Core controls</h4>
        <ul class="help-list">
          <li><span>Move</span><span>WASD — Hold any attack to charge</span></li>
          <li><span>Melee</span><span>Left click — builds Strength</span></li>
          <li><span>Ranged</span><span>Right click — builds Dexterity</span></li>
          <li><span>Spell</span><span>Space or both buttons</span></li>
          <li><span>Interact</span><span>E to gather, loot, or portal</span></li>
        </ul>
        <div class="help-footnote">Enter chats nearby • M opens map • Alt+M toggles music • Shift+M toggles controls • Shift+N starts a fresh hero.</div>
      </div>
      <div class="mobile-help">
        Use the left pad to move, Slash/Volley/Spell to act, Interact for loot and portals, Chat to speak, and tap HUD anytime to reveal the panels.
      </div>
      <div>
        <span class="identity-legend">Hero</span>
        <div class="hero-name" data-hero-name>New Adventurer</div>
      </div>
      <div>
        <span class="identity-legend">Account</span>
        <div class="hero-account" data-hero-account>Not linked</div>
      </div>
      <div>
        <span class="identity-legend">Hero ID</span>
        <div class="hero-id" data-hero-id>—</div>
      </div>
      <div class="identity-tools">
        <button type="button" data-account-manage>Account</button>
        <button type="button" data-sign-out hidden>Sign Out</button>
        <button type="button" data-new-hero>Start New Hero</button>
        <button type="button" data-copy-id>Copy ID</button>
        <button type="button" data-control-hints-toggle>Show Controls</button>
        <button type="button" data-settings-panel>Settings</button>
        <button type="button" data-admin-panel hidden>Admin Panel</button>
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
      <div class="resource-panel gear-panel" data-gear-panel>
        <div class="gear-head">
          <h4>Equipment</h4>
          <p>Swap between weapons, spellbooks, and armor you have found.</p>
        </div>
        <div class="gear-slots">
          <div class="gear-slot" data-gear-slot="melee">
            <header>
              <span class="slot-label">Melee Weapon</span>
              <span class="slot-equipped" data-equipped-label="melee">Bare Fists</span>
            </header>
            <ul class="gear-options" data-gear-options="melee"></ul>
          </div>
          <div class="gear-slot" data-gear-slot="ranged">
            <header>
              <span class="slot-label">Ranged Weapon</span>
              <span class="slot-equipped" data-equipped-label="ranged">Throwing Rocks</span>
            </header>
            <ul class="gear-options" data-gear-options="ranged"></ul>
          </div>
          <div class="gear-slot" data-gear-slot="spell">
            <header>
              <span class="slot-label">Spellbook</span>
              <span class="slot-equipped" data-equipped-label="spell">Zephyr Primer</span>
            </header>
            <ul class="gear-options" data-gear-options="spell"></ul>
          </div>
          <div class="gear-slot" data-gear-slot="armor">
            <header>
              <span class="slot-label">Armor</span>
              <span class="slot-equipped" data-equipped-label="armor">Traveler Cloth</span>
            </header>
            <ul class="gear-options" data-gear-options="armor"></ul>
          </div>
        </div>
        <div class="gear-feedback" data-gear-feedback></div>
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
  <p class="touch-hint">Move with the pad • Slash, Volley, Spell attack • Chat to talk • HUD reveals panels • Interact scoops loot and portals</p>
      </div>
    </div>
    <div class="compact-status" hidden data-compact-status>
      <div class="metric" data-kind="health">
        <div class="label-row">
          <span>HP</span>
          <span data-compact-health-text>0 / 0</span>
        </div>
        <div class="bar">
          <span data-compact-health-bar></span>
        </div>
      </div>
      <div class="metric" data-kind="momentum">
        <div class="label-row">
          <span>Momentum</span>
          <span data-compact-momentum-label>Ready</span>
        </div>
        <div class="bar">
          <span data-compact-momentum-bar></span>
        </div>
      </div>
    </div>
  </div>
  <div class="chat-entry" hidden data-chat-entry>
    <input type="text" maxlength="140" placeholder="Type a message" data-chat-input />
  </div>
  <div class="identity-overlay" hidden data-auth-overlay>
    <div class="identity-card auth-card">
      <h3>Hero Account</h3>
      <p data-auth-description>Sign in or create an account to continue your adventure.</p>
      <input type="text" placeholder="Account name" data-auth-account />
      <input type="password" placeholder="Password" data-auth-password />
      <p class="identity-feedback" data-auth-feedback></p>
      <div class="actions">
        <button type="button" class="primary" data-auth-login>Sign In</button>
        <button type="button" data-auth-register>Create Account</button>
        <button type="button" data-auth-cancel>Cancel</button>
      </div>
      <button type="button" class="identity-secondary" data-auth-legacy>Use Hero ID instead</button>
    </div>
  </div>
  <div class="identity-overlay" hidden data-legacy-overlay>
    <div class="identity-card legacy-card">
      <h3>Hero ID Login</h3>
      <p>Paste an existing Hero ID to continue.</p>
      <input type="text" placeholder="Paste Hero ID" data-legacy-input />
      <p class="identity-feedback" data-legacy-feedback></p>
      <div class="actions">
        <button type="button" class="primary" data-legacy-load>Load Hero</button>
        <button type="button" data-legacy-back>Back</button>
      </div>
    </div>
  </div>
  <div class="identity-overlay" hidden data-account-overlay>
    <div class="identity-card account-card">
      <h3>Account Security</h3>
      <p>Set or update your password to log in from any device.</p>
      <input type="text" placeholder="Account name" data-account-name />
      <input type="password" placeholder="Current password (optional)" data-account-current />
      <input type="password" placeholder="New password" data-account-password />
      <input type="password" placeholder="Confirm new password" data-account-confirm />
      <p class="identity-feedback" data-account-feedback></p>
      <div class="actions">
        <button type="button" class="primary" data-account-save>Save Password</button>
        <button type="button" data-account-cancel>Close</button>
      </div>
    </div>
  </div>
  <div class="identity-overlay" hidden data-onboarding-overlay>
    <div class="identity-card onboarding-card">
      <h3>Create Your Hero</h3>
      <p>Choose a name for your new adventurer. You can always change it later from the admin panel.</p>
      <input type="text" maxlength="24" placeholder="Enter hero name" data-hero-name-input />
      <p class="onboarding-feedback" data-hero-name-feedback></p>
      <div class="actions">
        <button type="button" class="primary" data-hero-name-submit>Create Hero</button>
        <button type="button" data-hero-name-cancel>Logout</button>
      </div>
    </div>
  </div>
  <div class="identity-overlay" hidden data-tutorial-overlay>
    <div class="identity-card tutorial-card">
      <h3>Learn the Basics</h3>
      <div class="tutorial-body" data-tutorial-body></div>
      <div class="tutorial-progress" data-tutorial-progress></div>
      <div class="actions tutorial-actions">
        <button type="button" data-tutorial-back hidden>Back</button>
        <button type="button" class="primary" data-tutorial-next>Next</button>
        <button type="button" data-tutorial-skip>Skip Tutorial</button>
      </div>
    </div>
  </div>
  <div class="identity-overlay" hidden data-admin-overlay>
    <div class="identity-card admin-card">
      <h3>Server Admin</h3>
      <div class="admin-status" data-admin-status>Loading server data...</div>
      <div class="admin-content" data-admin-content></div>
      <div class="admin-feedback" data-admin-feedback></div>
      <div class="actions">
        <button type="button" data-admin-refresh>Refresh</button>
        <button type="button" data-admin-close>Close</button>
      </div>
    </div>
  </div>
  <div class="identity-overlay" hidden data-settings-overlay>
    <div class="identity-card settings-card">
      <h3>Player Settings</h3>
      <div class="settings-section">
        <h4>Player-versus-Player</h4>
        <p data-settings-pvp-status>Loading PvP status…</p>
        <button type="button" class="primary" data-settings-pvp-toggle>Toggle PvP</button>
      </div>
      <div class="settings-section">
        <h4>Tutorial</h4>
        <p>Replay the tutorial to revisit the basics.</p>
        <button type="button" data-settings-reset-tutorial>Reset Tutorial</button>
      </div>
      <div class="settings-feedback" data-settings-feedback></div>
      <div class="actions">
        <button type="button" data-settings-close>Close</button>
      </div>
    </div>
  </div>
  <div class="toast-stack" data-toast-stack></div>
  <div
    class="map-overlay"
    hidden
    data-map-overlay
    role="dialog"
    aria-modal="true"
    aria-labelledby="map-overlay-title"
    aria-hidden="true"
  >
    <header>
      <h3 id="map-overlay-title">World Map</h3>
      <p>Press M or Escape to close • Alt+M toggles music • Drag the minimap anytime to reposition</p>
    </header>
    <canvas data-map-canvas></canvas>
    <div class="map-controls">
      <button type="button" data-map-close>Close Map</button>
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
  melee: 'Slash',
  ranged: 'Volley',
  spell: 'Spell',
};

const EFFECT_FADE_MS = 600;

const COMPACT_BREAKPOINT = 820;

const EQUIPMENT_ORDER = ['melee', 'ranged', 'spell', 'armor'];

const EQUIPMENT_SLOT_META = {
  melee: { label: 'Melee Weapon', actionFallback: 'Slash' },
  ranged: { label: 'Ranged Weapon', actionFallback: 'Volley' },
  spell: { label: 'Spellbook', actionFallback: 'Spell' },
  armor: { label: 'Armor', actionFallback: 'Armor' },
};

const STARTING_EQUIPMENT = {
  melee: 'melee-fist',
  ranged: 'ranged-rock',
  spell: 'spell-air',
  armor: 'armor-cloth',
};

const GEAR_PROGRESSION = {
  melee: ['melee-fist', 'melee-stick', 'melee-sword'],
  ranged: ['ranged-rock', 'ranged-sling', 'ranged-bow'],
  spell: ['spell-air', 'spell-fire', 'spell-ice', 'spell-lightning'],
  armor: ['armor-cloth', 'armor-leather', 'armor-mail'],
};

const GEAR_LIBRARY = {
  'melee-fist': {
    id: 'melee-fist',
    slot: 'melee',
    name: 'Bare Fists',
    shortLabel: 'Fists',
    summary: 'Baseline damage with minimal reach.',
  },
  'melee-stick': {
    id: 'melee-stick',
    slot: 'melee',
    name: 'Forager Stick',
    shortLabel: 'Stick',
  summary: '+10% damage — extra reach.',
  },
  'melee-sword': {
    id: 'melee-sword',
    slot: 'melee',
    name: 'Steel Sword',
    shortLabel: 'Sword',
  summary: '+35% damage — wide arc swing.',
  },
  'ranged-rock': {
    id: 'ranged-rock',
    slot: 'ranged',
    name: 'Throwing Rocks',
    shortLabel: 'Rocks',
    summary: 'Slow but hefty projectiles.',
  },
  'ranged-sling': {
    id: 'ranged-sling',
    slot: 'ranged',
    name: 'Simple Sling',
    shortLabel: 'Sling',
  summary: '+5% damage — faster travel.',
  },
  'ranged-bow': {
    id: 'ranged-bow',
    slot: 'ranged',
    name: 'Hunter Bow',
    shortLabel: 'Bow',
  summary: '+30% damage — long reach.',
  },
  'spell-air': {
    id: 'spell-air',
    slot: 'spell',
    name: 'Zephyr Primer',
    shortLabel: 'Gust',
    summary: 'Pushes foes back without damage.',
  },
  'spell-fire': {
    id: 'spell-fire',
    slot: 'spell',
    name: 'Ember Grimoire',
    shortLabel: 'Fire',
    summary: 'High damage bolt with extra burn.',
  },
  'spell-ice': {
    id: 'spell-ice',
    slot: 'spell',
    name: 'Frost Codex',
    shortLabel: 'Frost',
    summary: 'Chills enemies, slowing movement.',
  },
  'spell-lightning': {
    id: 'spell-lightning',
    slot: 'spell',
    name: 'Storm Scroll',
    shortLabel: 'Storm',
    summary: 'Arcs to a nearby foe with heavy damage.',
  },
  'armor-cloth': {
    id: 'armor-cloth',
    slot: 'armor',
    name: 'Traveler Cloth',
    shortLabel: 'Cloth',
  summary: 'No bonus — light and breezy.',
  },
  'armor-leather': {
    id: 'armor-leather',
    slot: 'armor',
    name: 'Scout Leathers',
    shortLabel: 'Leather',
    summary: '+25 max HP for adventurous runs.',
  },
  'armor-mail': {
    id: 'armor-mail',
    slot: 'armor',
    name: 'Tempered Mail',
    shortLabel: 'Mail',
    summary: '+60 max HP for hardened defenders.',
  },
};

const EFFECT_VARIANT_COLORS = {
  'melee-fist': '#f97316',
  'melee-stick': '#fbbf24',
  'melee-sword': '#fb7185',
  'ranged-rock': '#f97316',
  'ranged-sling': '#fb923c',
  'ranged-bow': '#fde68a',
  'spell-air': '#38bdf8',
  'spell-fire': '#f97316',
  'spell-ice': '#38bdf8',
  'spell-lightning': '#fde68a',
};

const PROFILE_STORAGE_KEY = 'explore-rpg-profile-id';
const ACCOUNT_STORAGE_KEY = 'explore-rpg-account-name';
const SESSION_STORAGE_KEY = 'explore-rpg-session-token';
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;
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
const MINIMAP_FLOAT_STORAGE_KEY = 'explore-rpg-minimap-floating';
const MINIMAP_FLOAT_POSITION_KEY = 'explore-rpg-minimap-pos';
const VISUAL_STORAGE_KEY = 'explore-rpg-visuals';
const UI_COLLAPSE_STORAGE_KEY = 'explore-rpg-ui-collapsed';
const CONTROL_HINTS_STORAGE_KEY = 'explore-rpg-control-hints';
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
  pvp: '#f87171',
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
const TOAST_DEFAULT_DURATION = 4000;

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
  this.hudEl = this.shadowRoot.querySelector('.hud');
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
    this.minimapExpandButton = this.shadowRoot.querySelector('[data-minimap-expand]');
  this.minimapFloatButton = this.shadowRoot.querySelector('[data-minimap-float]');
    this.minimapGhostButton = this.shadowRoot.querySelector('[data-minimap-ghost]');
    this.minimapPortalHintEl = this.shadowRoot.querySelector('[data-minimap-portal-hint]');
  this.toastStackEl = this.shadowRoot.querySelector('[data-toast-stack]');
    this.mapOverlayEl = this.shadowRoot.querySelector('[data-map-overlay]');
    this.mapOverlayCanvas = this.shadowRoot.querySelector('[data-map-canvas]');
    this.mapOverlayCtx = this.mapOverlayCanvas ? this.mapOverlayCanvas.getContext('2d') : null;
    if (this.mapOverlayCtx) {
      this.mapOverlayCtx.imageSmoothingEnabled = false;
    }
    this.mapOverlayCloseButton = this.shadowRoot.querySelector('[data-map-close]');
  this.minimapDockParent = this.minimapCardEl?.parentElement ?? null;
  this.audioToggle = this.shadowRoot.querySelector('audio-toggle');
    this.visualToggleButton = this.shadowRoot.querySelector('[data-visual-toggle]');
  this.heroNameEl = this.shadowRoot.querySelector('[data-hero-name]');
  this.heroAccountEl = this.shadowRoot.querySelector('[data-hero-account]');
  this.heroIdEl = this.shadowRoot.querySelector('[data-hero-id]');
  this.accountManageButton = this.shadowRoot.querySelector('[data-account-manage]');
  this.signOutButton = this.shadowRoot.querySelector('[data-sign-out]');
  this.copyHeroButton = this.shadowRoot.querySelector('[data-copy-id]');
  this.newHeroButton = this.shadowRoot.querySelector('[data-new-hero]');
  this.adminPanelButton = this.shadowRoot.querySelector('[data-admin-panel]');
  this.settingsPanelButton = this.shadowRoot.querySelector('[data-settings-panel]');
  this.authOverlay = this.shadowRoot.querySelector('[data-auth-overlay]');
  this.authDescriptionEl = this.shadowRoot.querySelector('[data-auth-description]');
  this.authAccountInput = this.shadowRoot.querySelector('[data-auth-account]');
  this.authPasswordInput = this.shadowRoot.querySelector('[data-auth-password]');
  this.authFeedbackEl = this.shadowRoot.querySelector('[data-auth-feedback]');
  this.authLoginButton = this.shadowRoot.querySelector('[data-auth-login]');
  this.authRegisterButton = this.shadowRoot.querySelector('[data-auth-register]');
  this.authCancelButton = this.shadowRoot.querySelector('[data-auth-cancel]');
  this.authLegacyButton = this.shadowRoot.querySelector('[data-auth-legacy]');
  this.legacyOverlay = this.shadowRoot.querySelector('[data-legacy-overlay]');
  this.legacyInput = this.shadowRoot.querySelector('[data-legacy-input]');
  this.legacyFeedbackEl = this.shadowRoot.querySelector('[data-legacy-feedback]');
  this.legacyLoadButton = this.shadowRoot.querySelector('[data-legacy-load]');
  this.legacyBackButton = this.shadowRoot.querySelector('[data-legacy-back]');
  this.accountOverlay = this.shadowRoot.querySelector('[data-account-overlay]');
  this.accountNameInput = this.shadowRoot.querySelector('[data-account-name]');
  this.accountCurrentInput = this.shadowRoot.querySelector('[data-account-current]');
  this.accountPasswordInput = this.shadowRoot.querySelector('[data-account-password]');
  this.accountConfirmInput = this.shadowRoot.querySelector('[data-account-confirm]');
  this.accountFeedbackEl = this.shadowRoot.querySelector('[data-account-feedback]');
  this.accountSaveButton = this.shadowRoot.querySelector('[data-account-save]');
  this.accountCancelButton = this.shadowRoot.querySelector('[data-account-cancel]');
  this.onboardingOverlay = this.shadowRoot.querySelector('[data-onboarding-overlay]');
  this.heroNameInput = this.shadowRoot.querySelector('[data-hero-name-input]');
  this.heroNameSubmitButton = this.shadowRoot.querySelector('[data-hero-name-submit]');
  this.heroNameCancelButton = this.shadowRoot.querySelector('[data-hero-name-cancel]');
  this.heroNameFeedback = this.shadowRoot.querySelector('[data-hero-name-feedback]');
  this.tutorialOverlay = this.shadowRoot.querySelector('[data-tutorial-overlay]');
  this.tutorialBody = this.shadowRoot.querySelector('[data-tutorial-body]');
  this.tutorialProgress = this.shadowRoot.querySelector('[data-tutorial-progress]');
  this.tutorialNextButton = this.shadowRoot.querySelector('[data-tutorial-next]');
  this.tutorialBackButton = this.shadowRoot.querySelector('[data-tutorial-back]');
  this.tutorialSkipButton = this.shadowRoot.querySelector('[data-tutorial-skip]');
  this.adminOverlay = this.shadowRoot.querySelector('[data-admin-overlay]');
  this.adminStatusEl = this.shadowRoot.querySelector('[data-admin-status]');
  this.adminContentEl = this.shadowRoot.querySelector('[data-admin-content]');
  this.adminFeedbackEl = this.shadowRoot.querySelector('[data-admin-feedback]');
  this.adminRefreshButton = this.shadowRoot.querySelector('[data-admin-refresh]');
  this.adminCloseButton = this.shadowRoot.querySelector('[data-admin-close]');
  this.settingsOverlay = this.shadowRoot.querySelector('[data-settings-overlay]');
  this.settingsPvpStatusEl = this.shadowRoot.querySelector('[data-settings-pvp-status]');
  this.settingsPvpToggleButton = this.shadowRoot.querySelector('[data-settings-pvp-toggle]');
  this.settingsResetTutorialButton = this.shadowRoot.querySelector('[data-settings-reset-tutorial]');
  this.settingsCloseButton = this.shadowRoot.querySelector('[data-settings-close]');
  this.settingsFeedbackEl = this.shadowRoot.querySelector('[data-settings-feedback]');
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
    this.desktopHelpEl = this.shadowRoot.querySelector('.desktop-help');
    this.mobileHelpEl = this.shadowRoot.querySelector('.mobile-help');
    this.compactStatusEl = this.shadowRoot.querySelector('[data-compact-status]');
    this.compactHealthBar = this.shadowRoot.querySelector('[data-compact-health-bar]');
    this.compactHealthText = this.shadowRoot.querySelector('[data-compact-health-text]');
    this.compactMomentumBar = this.shadowRoot.querySelector('[data-compact-momentum-bar]');
    this.compactMomentumLabel = this.shadowRoot.querySelector('[data-compact-momentum-label]');
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
  this.controlHintsToggleButton = this.shadowRoot.querySelector('[data-control-hints-toggle]');
    this.gearPanel = this.shadowRoot.querySelector('[data-gear-panel]');
    this.gearFeedbackEl = this.shadowRoot.querySelector('[data-gear-feedback]');
    this.equipmentLabels = {};
    this.equipmentOptionLists = {};
    for (const slot of EQUIPMENT_ORDER) {
      this.equipmentLabels[slot] = this.shadowRoot.querySelector(`[data-equipped-label="${slot}"]`);
      this.equipmentOptionLists[slot] = this.shadowRoot.querySelector(`[data-gear-options="${slot}"]`);
    }
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
  this._handleGearPanelClick = this._handleGearPanelClick.bind(this);

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
    this.compactMode = false;
    this.compactAutoCollapse = false;
    this.hasStoredUiPreference = false;
  this.uiCollapsed = false;
  this.controlHintsVisible = true;
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
  this.ownedGear = new Set(Object.values(STARTING_EQUIPMENT));
  this.equipment = { ...STARTING_EQUIPMENT };
  this.minimapBase = null;
  this.minimapScaleX = 1;
  this.minimapScaleY = 1;
    this.minimapVisible = true;
  this.minimapFloating = false;
  this.minimapFloatPosition = null;
  this.minimapDragPointerId = null;
  this.minimapDragOffset = { x: 0, y: 0 };
  this.mapOverlayVisible = false;
  this.mapOverlayLastFocus = null;
  this.mapOverlayRenderSize = 0;
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
    this.activeActionAim = null;
    this.pointerButtons = 0;
    this.knownEffects = new Set();
  this.profileId = null;
  this.pendingProfileId = undefined;
  this.accountName = null;
  this.sessionToken = null;
  this.authPolicy = {
    passwordMinLength: PASSWORD_MIN_LENGTH,
    passwordMaxLength: PASSWORD_MAX_LENGTH,
  };
  this.authPending = false;
  this.legacyPending = false;
  this.accountPending = false;
  this.expectingLogout = false;
  this.legacyProfileWarningShown = false;
  this._messageTimer = null;
    this.profileMeta = {
      name: null,
      tutorialCompleted: false,
      isAdmin: false,
      banned: false,
      createdAt: null,
    };
    this.pendingNameRequest = false;
    this.tutorialSteps = [
      {
        title: 'Movement & Camera',
  body: 'Use <strong>WASD</strong> (or the left stick on touch) to explore. Aim with your mouse or right pad — the reticle shows where abilities will land.',
        hint: 'Hold <strong>Shift</strong> to stroll carefully around the safe zone bank.',
      },
      {
        title: 'Combat Basics',
        body: 'Left click for <strong>Melee</strong>, right click for <strong>Ranged</strong>, and press <strong>Space</strong> (or both buttons) to cast a <strong>Spell</strong>. Hold any attack to charge and release a stronger strike.',
        hint: 'Build Strength with melee, Dexterity with ranged, and Intellect with spells.',
      },
      {
        title: 'Gather, Loot, & Momentum',
        body: 'Tap <strong>E</strong> near shimmering nodes to gather ores, scoop glowing drops to loot, and keep attacking to build <strong>Momentum</strong> for bigger rewards.',
  hint: 'Momentum fades if you pause — chain fights to keep the edge.',
      },
      {
        title: 'Safe Zone & Progress',
        body: 'Return to the glowing safe zone bank to heal, store loot, and trade ores for coins. Portals whisk you to tougher realms once you are ready.',
        hint: 'You can replay this tutorial anytime from the admin tools.',
      },
    ];
    this.currentTutorialStep = 0;
    this.tutorialCompleting = false;
    this.adminProfiles = [];
    this.adminSafeZone = null;
  this.adminPanelOpen = false;
  this.settingsPanelOpen = false;
  this.settingsPvpPending = false;
  this.settingsTutorialPending = false;
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
  this._toggleMapOverlay = this._toggleMapOverlay.bind(this);
  this._closeMapOverlay = this._closeMapOverlay.bind(this);
  this._handleMapOverlayBackdropClick = this._handleMapOverlayBackdropClick.bind(this);
    this._handleMinimapFloatToggle = this._handleMinimapFloatToggle.bind(this);
    this._handleMinimapDragStart = this._handleMinimapDragStart.bind(this);
    this._handleMinimapDragMove = this._handleMinimapDragMove.bind(this);
    this._handleMinimapDragEnd = this._handleMinimapDragEnd.bind(this);
    this._handleMinimapDragCancel = this._handleMinimapDragCancel.bind(this);
  this._handleCopyHeroId = this._handleCopyHeroId.bind(this);
  this._handleNewHeroRequest = this._handleNewHeroRequest.bind(this);
  this._handleAuthLogin = this._handleAuthLogin.bind(this);
  this._handleAuthRegister = this._handleAuthRegister.bind(this);
  this._handleAuthCancel = this._handleAuthCancel.bind(this);
  this._handleAuthInputKeydown = this._handleAuthInputKeydown.bind(this);
  this._handleAuthLegacy = this._handleAuthLegacy.bind(this);
  this._handleLegacyLoad = this._handleLegacyLoad.bind(this);
  this._handleLegacyBack = this._handleLegacyBack.bind(this);
  this._handleLegacyInputKeydown = this._handleLegacyInputKeydown.bind(this);
  this._handleAccountManage = this._handleAccountManage.bind(this);
  this._handleAccountSave = this._handleAccountSave.bind(this);
  this._handleAccountCancel = this._handleAccountCancel.bind(this);
  this._handleAccountInputKeydown = this._handleAccountInputKeydown.bind(this);
  this._handleSignOut = this._handleSignOut.bind(this);
  this._handleHeroNameSubmit = this._handleHeroNameSubmit.bind(this);
  this._handleHeroNameCancel = this._handleHeroNameCancel.bind(this);
  this._handleHeroNameInputKeydown = this._handleHeroNameInputKeydown.bind(this);
  this._handleTutorialNext = this._handleTutorialNext.bind(this);
  this._handleTutorialBack = this._handleTutorialBack.bind(this);
  this._handleTutorialSkip = this._handleTutorialSkip.bind(this);
  this._handleAdminToggle = this._handleAdminToggle.bind(this);
  this._handleAdminClose = this._handleAdminClose.bind(this);
  this._handleAdminRefresh = this._handleAdminRefresh.bind(this);
  this._handleAdminContentClick = this._handleAdminContentClick.bind(this);
  this._handleSettingsToggle = this._handleSettingsToggle.bind(this);
  this._handleSettingsClose = this._handleSettingsClose.bind(this);
  this._handleSettingsPvpToggle = this._handleSettingsPvpToggle.bind(this);
  this._handleSettingsResetTutorial = this._handleSettingsResetTutorial.bind(this);
  this._handleControlHintsToggle = this._handleControlHintsToggle.bind(this);
    this._resizeCanvas = this._resizeCanvas.bind(this);
  this._syncMapOverlaySize = this._syncMapOverlaySize.bind(this);
    this._handleBankDeposit = this._handleBankDeposit.bind(this);
    this._handleBankWithdraw = this._handleBankWithdraw.bind(this);
    this._handleBankSell = this._handleBankSell.bind(this);
    this.bankFeedbackTimer = null;
    this._updateBankButtons(false);
    this._showBankFeedback('');
  this.gearFeedbackTimer = null;
  this._showGearFeedback('');
    this._updateInventoryPanel();
    this._updateLevelStatus(null);
    this._updateMinimapLabel(null);
  this._syncMinimapFloatButton();
    this._updatePortalHint(null, null);
    this._setMinimapVisible(true, false);
    this._loadMinimapPreference();
  this._loadMinimapFloatPreference();
    this._loadUiCollapsePreference();
    this._loadVisualPreference();
    this._evaluateCompactLayout();
    this._updateCompactStatus();
    this._syncCompactOverlayVisibility();
    this._loadControlHintsPreference();
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
    this.minimapGhostButton?.addEventListener('click', this._toggleMinimapVisibility);
  this.minimapExpandButton?.addEventListener('click', this._toggleMapOverlay);
    this.minimapFloatButton?.addEventListener('click', this._handleMinimapFloatToggle);
    this.minimapHeaderEl?.addEventListener('pointerdown', this._handleMinimapDragStart);
  this.mapOverlayCloseButton?.addEventListener('click', this._closeMapOverlay);
  this.mapOverlayEl?.addEventListener('click', this._handleMapOverlayBackdropClick);
    this.accountManageButton?.addEventListener('click', this._handleAccountManage);
    this.signOutButton?.addEventListener('click', this._handleSignOut);
    this.copyHeroButton?.addEventListener('click', this._handleCopyHeroId);
    this.newHeroButton?.addEventListener('click', this._handleNewHeroRequest);
    this.authLoginButton?.addEventListener('click', this._handleAuthLogin);
    this.authRegisterButton?.addEventListener('click', this._handleAuthRegister);
    this.authCancelButton?.addEventListener('click', this._handleAuthCancel);
    this.authAccountInput?.addEventListener('keydown', this._handleAuthInputKeydown);
    this.authPasswordInput?.addEventListener('keydown', this._handleAuthInputKeydown);
    this.authLegacyButton?.addEventListener('click', this._handleAuthLegacy);
    this.legacyLoadButton?.addEventListener('click', this._handleLegacyLoad);
    this.legacyBackButton?.addEventListener('click', this._handleLegacyBack);
    this.legacyInput?.addEventListener('keydown', this._handleLegacyInputKeydown);
    this.accountSaveButton?.addEventListener('click', this._handleAccountSave);
    this.accountCancelButton?.addEventListener('click', this._handleAccountCancel);
    this.accountNameInput?.addEventListener('keydown', this._handleAccountInputKeydown);
    this.accountCurrentInput?.addEventListener('keydown', this._handleAccountInputKeydown);
    this.accountPasswordInput?.addEventListener('keydown', this._handleAccountInputKeydown);
    this.accountConfirmInput?.addEventListener('keydown', this._handleAccountInputKeydown);
  this.heroNameSubmitButton?.addEventListener('click', this._handleHeroNameSubmit);
  this.heroNameCancelButton?.addEventListener('click', this._handleHeroNameCancel);
  this.heroNameInput?.addEventListener('keydown', this._handleHeroNameInputKeydown);
  this.tutorialNextButton?.addEventListener('click', this._handleTutorialNext);
  this.tutorialBackButton?.addEventListener('click', this._handleTutorialBack);
  this.tutorialSkipButton?.addEventListener('click', this._handleTutorialSkip);
  this.adminPanelButton?.addEventListener('click', this._handleAdminToggle);
  this.adminRefreshButton?.addEventListener('click', this._handleAdminRefresh);
  this.adminCloseButton?.addEventListener('click', this._handleAdminClose);
  this.adminContentEl?.addEventListener('click', this._handleAdminContentClick);
  this.settingsPanelButton?.addEventListener('click', this._handleSettingsToggle);
  this.settingsPvpToggleButton?.addEventListener('click', this._handleSettingsPvpToggle);
  this.settingsResetTutorialButton?.addEventListener('click', this._handleSettingsResetTutorial);
  this.settingsCloseButton?.addEventListener('click', this._handleSettingsClose);
  this.controlHintsToggleButton?.addEventListener('click', this._handleControlHintsToggle);
    this.chatInput?.addEventListener('keydown', this._handleChatInputKeydown);
  this.bankDepositButton?.addEventListener('click', this._handleBankDeposit);
  this.bankWithdrawButton?.addEventListener('click', this._handleBankWithdraw);
  this.bankSellButton?.addEventListener('click', this._handleBankSell);
    this.gearPanel?.addEventListener('click', this._handleGearPanelClick);
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
    this._syncMapOverlaySize();
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
  this.minimapGhostButton?.removeEventListener('click', this._toggleMinimapVisibility);
  this.minimapExpandButton?.removeEventListener('click', this._toggleMapOverlay);
  this.minimapFloatButton?.removeEventListener('click', this._handleMinimapFloatToggle);
  this.minimapHeaderEl?.removeEventListener('pointerdown', this._handleMinimapDragStart);
  this.mapOverlayCloseButton?.removeEventListener('click', this._closeMapOverlay);
  this.mapOverlayEl?.removeEventListener('click', this._handleMapOverlayBackdropClick);
  this.accountManageButton?.removeEventListener('click', this._handleAccountManage);
  this.signOutButton?.removeEventListener('click', this._handleSignOut);
  this.copyHeroButton?.removeEventListener('click', this._handleCopyHeroId);
  this.newHeroButton?.removeEventListener('click', this._handleNewHeroRequest);
  this.authLoginButton?.removeEventListener('click', this._handleAuthLogin);
  this.authRegisterButton?.removeEventListener('click', this._handleAuthRegister);
  this.authCancelButton?.removeEventListener('click', this._handleAuthCancel);
  this.authAccountInput?.removeEventListener('keydown', this._handleAuthInputKeydown);
  this.authPasswordInput?.removeEventListener('keydown', this._handleAuthInputKeydown);
  this.authLegacyButton?.removeEventListener('click', this._handleAuthLegacy);
  this.legacyLoadButton?.removeEventListener('click', this._handleLegacyLoad);
  this.legacyBackButton?.removeEventListener('click', this._handleLegacyBack);
  this.legacyInput?.removeEventListener('keydown', this._handleLegacyInputKeydown);
  this.accountSaveButton?.removeEventListener('click', this._handleAccountSave);
  this.accountCancelButton?.removeEventListener('click', this._handleAccountCancel);
  this.accountNameInput?.removeEventListener('keydown', this._handleAccountInputKeydown);
  this.accountCurrentInput?.removeEventListener('keydown', this._handleAccountInputKeydown);
  this.accountPasswordInput?.removeEventListener('keydown', this._handleAccountInputKeydown);
  this.accountConfirmInput?.removeEventListener('keydown', this._handleAccountInputKeydown);
  this.heroNameSubmitButton?.removeEventListener('click', this._handleHeroNameSubmit);
  this.heroNameCancelButton?.removeEventListener('click', this._handleHeroNameCancel);
  this.heroNameInput?.removeEventListener('keydown', this._handleHeroNameInputKeydown);
  this.tutorialNextButton?.removeEventListener('click', this._handleTutorialNext);
  this.tutorialBackButton?.removeEventListener('click', this._handleTutorialBack);
  this.tutorialSkipButton?.removeEventListener('click', this._handleTutorialSkip);
  this.adminPanelButton?.removeEventListener('click', this._handleAdminToggle);
  this.adminRefreshButton?.removeEventListener('click', this._handleAdminRefresh);
  this.adminCloseButton?.removeEventListener('click', this._handleAdminClose);
  this.adminContentEl?.removeEventListener('click', this._handleAdminContentClick);
  this.settingsPanelButton?.removeEventListener('click', this._handleSettingsToggle);
  this.settingsPvpToggleButton?.removeEventListener('click', this._handleSettingsPvpToggle);
  this.settingsResetTutorialButton?.removeEventListener('click', this._handleSettingsResetTutorial);
  this.settingsCloseButton?.removeEventListener('click', this._handleSettingsClose);
  this.controlHintsToggleButton?.removeEventListener('click', this._handleControlHintsToggle);
  this.chatInput?.removeEventListener('keydown', this._handleChatInputKeydown);
  this.bankDepositButton?.removeEventListener('click', this._handleBankDeposit);
  this.bankWithdrawButton?.removeEventListener('click', this._handleBankWithdraw);
  this.bankSellButton?.removeEventListener('click', this._handleBankSell);
  this.gearPanel?.removeEventListener('click', this._handleGearPanelClick);
  if (this.settingsOverlay) {
    this.settingsOverlay.hidden = true;
  }
  this.settingsPanelOpen = false;
  this.settingsPvpPending = false;
  this.settingsTutorialPending = false;
  this._unbindTouchControls();
  if (this.bankFeedbackTimer) {
    clearTimeout(this.bankFeedbackTimer);
    this.bankFeedbackTimer = null;
  }
  if (this.gearFeedbackTimer) {
    clearTimeout(this.gearFeedbackTimer);
    this.gearFeedbackTimer = null;
  }
  if (this.levelBannerTimer) {
    clearTimeout(this.levelBannerTimer);
    this.levelBannerTimer = null;
  }
  if (this._messageTimer) {
    clearTimeout(this._messageTimer);
    this._messageTimer = null;
  }
  window.removeEventListener('pointermove', this._handleMinimapDragMove);
  window.removeEventListener('pointerup', this._handleMinimapDragEnd);
  window.removeEventListener('pointercancel', this._handleMinimapDragCancel);
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
    this.profileMeta = {
      name: null,
      tutorialCompleted: false,
      isAdmin: false,
      banned: false,
      createdAt: null,
      pvpOptIn: false,
      pvpCooldownEndsAt: 0,
      pvpLastCombatAt: 0,
    };
    this._updateHeroNameDisplay();
    this._updateAdminButtonVisibility();
    this._updateSettingsState();
    let storedProfileId = null;
    let storedAccount = null;
    let storedSession = null;
    try {
      const storage = window.localStorage;
      storedProfileId = storage?.getItem(PROFILE_STORAGE_KEY) ?? null;
      storedAccount = storage?.getItem(ACCOUNT_STORAGE_KEY) ?? null;
      storedSession = storage?.getItem(SESSION_STORAGE_KEY) ?? null;
    } catch (err) {
      storedProfileId = null;
      storedAccount = null;
      storedSession = null;
    }
    this.accountName = storedAccount || null;
    this.sessionToken = storedSession || null;
    if (this.sessionToken) {
      this.profileId = null;
    } else if (storedProfileId) {
      this.profileId = storedProfileId;
    } else {
      this.profileId = null;
    }
    this._updateAccountDisplay();
    this._updateSignOutVisibility();
    this._updateHeroIdDisplay();
      this._updateAuthDescription();
    this._connect();
  }

  _connect() {
    if (this.socket) return;
    this.expectingLogout = false;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host || `localhost:${window.location.port || 8080}`;
    const params = [];
    if (this.sessionToken) {
      params.push(`session=${encodeURIComponent(this.sessionToken)}`);
    } else if (this.profileId) {
      params.push(`profile=${encodeURIComponent(this.profileId)}`);
    }
    const wsUrl = `${protocol}://${host}${params.length ? `/?${params.join('&')}` : '/'}`;

    this.messageEl.textContent = 'Connecting...';
    this.messageEl.hidden = false;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      this.socket = socket;
      this.expectingLogout = false;
      this.messageEl.hidden = true;
      this._hideAuthOverlay();
      this._hideLegacyOverlay();
      this._hideAccountOverlay();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        this.authPending = false;
        this.legacyPending = false;
        this.accountPending = false;
  this.legacyProfileWarningShown = false;
        this._setAuthFormDisabled(false);
        this._setLegacyFormDisabled(false);
        this._setAccountFormDisabled(false);
        this._setAuthFeedback('', 'info');
        this._setLegacyFeedback('', 'info');
        this._setAccountFeedback('', 'info');
        this._hideAuthOverlay();
        this._hideLegacyOverlay();

        const authInfo = data?.auth || {};
        const sessionToken =
          typeof data.sessionToken === 'string' && data.sessionToken.length ? data.sessionToken : null;
        if (sessionToken) {
          this.sessionToken = sessionToken;
          this._persistSessionToken(sessionToken);
        } else {
          this.sessionToken = null;
          this._clearStoredSessionToken();
        }

        const passwordMin = Number(authInfo.passwordMinLength) || PASSWORD_MIN_LENGTH;
        const passwordMax = Number(authInfo.passwordMaxLength) || PASSWORD_MAX_LENGTH;
        this.authPolicy = {
          passwordMinLength: passwordMin,
          passwordMaxLength: passwordMax,
        };
        this._updateAuthDescription();

        let nextAccountName = null;
        if (typeof authInfo.accountName === 'string' && authInfo.accountName.trim()) {
          nextAccountName = authInfo.accountName.trim();
        } else if (typeof data?.account?.name === 'string' && data.account.name.trim()) {
          nextAccountName = data.account.name.trim();
        }
        this.accountName = nextAccountName;
        if (this.accountName) {
          this._persistAccountName(this.accountName);
        } else {
          this._clearStoredAccountName();
        }
        this._updateAccountDisplay();

        this._updateSignOutVisibility();

        if (authInfo.legacyProfile && !this.legacyProfileWarningShown) {
          this.legacyProfileWarningShown = true;
          this._showTransientMessage('Secure this hero via Account to set a password.', 4800);
        }

        this.world = data.world;
        this._ingestLevels(data.levels);
        this._prepareMinimap(true);
        this._ingestPortals(data.portals);
        this.youId = data.id;
        this._applyProfileSnapshot(data.profile || null);
        if (data.profileId) {
          this.profileId = data.profileId;
          if (this.sessionToken) {
            this._clearStoredProfileId();
          } else {
            this._persistProfileId(data.profileId);
          }
          this._updateHeroIdDisplay();
        }
        if (!data.profileId && this.sessionToken) {
          this._clearStoredProfileId();
          this._updateHeroIdDisplay();
        }
        this._updateHeroNameDisplay();
        this._updateAdminButtonVisibility();
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
        this._updateCompactStatus();
        this._syncCompactOverlayVisibility();
        this.chargeMeter.actionName = 'Idle';
        this._maybeStartOnboardingFlow();
      } else if (data.type === 'state') {
        if (Array.isArray(data.levels)) {
          this._ingestLevels(data.levels);
        }
        const map = new Map();
        let me = null;
        for (const rawPlayer of data.players) {
          const player = this._normalizePlayerState(rawPlayer);
          if (!player) continue;
          map.set(player.id, player);
          if (player.id === this.youId) {
            me = player;
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
          if (me.equipment) {
            this.equipment = this._normalizeEquipmentPayload(me.equipment);
            this._syncEquipmentOwnership();
            this._updateEquipmentPanel();
          }
          this._updateCompactStatus();
          this._syncCompactOverlayVisibility();
          const ratio = me.chargeRatio ?? 0;
          if (!this.activeAction) {
            this.chargeMeter.value = ratio;
          }
          if (!this.activeAction) {
            if (me.charging) {
              this.chargeMeter.actionName = this._resolveActionLabel(me.actionKind) || 'Charging';
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
        if (data.gear) {
          this._applyGearPayload(data.gear);
        }
        if (data.equipment) {
          this.equipment = this._normalizeEquipmentPayload(data.equipment);
        }
        this._syncEquipmentOwnership();
        this._updateInventoryPanel();
        this._flashInventoryPanel();
        if (data.gear || data.equipment) {
          this._flashEquipmentPanel();
        }
      } else if (data.type === 'ore-update') {
        if (data.node) {
          this._applyOreNodeUpdate(data.node);
        }
      } else if (data.type === 'loot-spawn') {
        if (data.drop) {
          this._applyLootUpdate(data.drop, Boolean(data.removed));
        }
      } else if (data.type === 'profile') {
        this._handleProfileEvent(data);
      } else if (data.type === 'admin') {
        this._handleAdminEvent(data);
      } else if (data.type === 'auth') {
        this._handleAuthEvent(data);
      } else if (data.type === 'control') {
        this._handleControlEvent(data);
      } else if (data.type === 'loot-collected') {
        this._flashInventoryPanel();
      } else if (data.type === 'bank-result') {
        const ok = data.ok !== false;
        const message =
          typeof data.message === 'string'
            ? data.message
            : ok
            ? 'Bank transaction complete.'
            : 'Bank action failed.';
        this._showBankFeedback(message, ok);
        if (ok) {
          this._flashInventoryPanel();
        }
      } else if (data.type === 'equip-result') {
        const ok = data.ok !== false;
        if (data.equipment) {
          this.equipment = this._normalizeEquipmentPayload(data.equipment);
          this._syncEquipmentOwnership();
          this._updateEquipmentPanel();
          if (ok) {
            this._flashEquipmentPanel();
          }
        } else if (ok && data.slot && data.itemId) {
          if (!this.equipment) {
            this.equipment = { ...STARTING_EQUIPMENT };
          }
          if (EQUIPMENT_SLOT_META[data.slot] && GEAR_LIBRARY[data.itemId]) {
            this.equipment[data.slot] = data.itemId;
            this._syncEquipmentOwnership();
            this._updateEquipmentPanel();
            this._flashEquipmentPanel();
          }
        }
        let message = typeof data.message === 'string' ? data.message : null;
        if (!message) {
          const def = data.itemId ? GEAR_LIBRARY[data.itemId] : null;
          if (ok && def?.name) {
            message = `${def.name} equipped.`;
          } else {
            const slotMeta = data.slot ? EQUIPMENT_SLOT_META[data.slot] : null;
            const slotLabel =
              slotMeta?.label || (data.slot ? data.slot.charAt(0).toUpperCase() + data.slot.slice(1) : 'Item');
            message = ok ? `${slotLabel} updated.` : `Unable to equip ${slotLabel.toLowerCase()}.`;
          }
        }
        this._showGearFeedback(message, ok);
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
      this._hideAccountOverlay(true);
      this.authPending = false;
      this.legacyPending = false;
      this._setAuthFormDisabled(false);
      this._setLegacyFormDisabled(false);
      if (nextProfile !== undefined) {
        this.profileId = nextProfile;
        this.pendingProfileId = undefined;
        this._connect();
      } else {
        if (this.expectingLogout) {
          this.expectingLogout = false;
          if (this.messageEl) {
            this.messageEl.hidden = true;
          }
          setTimeout(() => this._connect(), 120);
        } else {
          this.messageEl.textContent = 'Connection lost. Refresh to retry.';
          this.messageEl.hidden = false;
        }
        if (!this.sessionToken) {
          this._showAuthOverlay(this.accountName || '');
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
    const chargeState = this._computeChargeState(local);

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
        charge: chargeState,
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
  const lifetime = Math.max(16, Number(effect.lifetime) || EFFECT_FADE_MS);
  const ttl = Math.max(0, Math.min(lifetime, Number(effect.ttl) || 0));
  const alpha = lifetime > 0 ? Math.max(0, Math.min(1, ttl / lifetime)) : 0;
  const travelProgress = lifetime > 0 ? 1 - Math.max(0, Math.min(1, ttl / lifetime)) : 1;
  const color = this._resolveEffectColor(effect);
  const highlight = effect.type === 'spell' ? '#e0f2fe' : '#fff7ed';
      const aim = effect.aim ?? { x: 1, y: 0 };
      const aimAngle = Math.atan2(aim.y || 0, aim.x || 1);
  const shape = effect.shape || (effect.type === 'spell' || effect.type === 'ranged' ? 'projectile' : effect.type === 'melee' ? 'cone' : 'burst');
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
      } else if (shape === 'projectile') {
        const lengthTiles = effect.length ?? effect.range ?? 0;
        const lengthPx = lengthTiles * this.tileSize;
        if (lengthPx > 0) {
          const widthTiles = effect.width != null ? effect.width / 2 : 0.18;
          const radiusPx = Math.max(this.tileSize * 0.12, widthTiles * this.tileSize);
          const travel = lengthPx * travelProgress;
          ctx.rotate(aimAngle);
          const tailLength = Math.max(radiusPx * 2.4, lengthPx * 0.22);
          const tailStart = Math.max(0, travel - tailLength);
          const headRadius = radiusPx * 1.05;

          const gradient = ctx.createLinearGradient(tailStart, 0, travel + headRadius, 0);
          gradient.addColorStop(0, this._withAlpha(color, 0));
          gradient.addColorStop(0.35, this._withAlpha(color, 0.35));
          gradient.addColorStop(0.75, this._withAlpha(color, 0.85));
          gradient.addColorStop(1, highlight);

          ctx.globalAlpha = alpha;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(tailStart, -radiusPx);
          ctx.lineTo(travel, -radiusPx * 0.55);
          ctx.lineTo(travel, radiusPx * 0.55);
          ctx.lineTo(tailStart, radiusPx);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = this._withAlpha(color, 0.7);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = highlight;
          ctx.arc(travel, 0, headRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = this._withAlpha(color, 0.9);
          ctx.stroke();
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
      const isSelf = player.id === this.youId;
      const selfCharge = isSelf ? chargeState : null;
      const serverChargeRatio = Math.max(0, Math.min(1, player.chargeRatio ?? 0));
      const chargeRatio = selfCharge ? selfCharge.ratio : serverChargeRatio;
      const chargeKind = selfCharge?.kind || player.actionKind || 'default';
      const isCharging = (player.charging && serverChargeRatio > 0.001) || (selfCharge && chargeRatio > 0.001);
      if (isCharging) {
        const glow = CHARGE_GLOW_STYLE[chargeKind] || CHARGE_GLOW_STYLE.default;
        const pulse = Math.sin((time / 160) % (Math.PI * 2)) * 0.08 + 0.08;
        const rangeBoost = chargeKind === 'spell' ? 2.4 : chargeKind === 'ranged' ? 1.8 : 1.4;
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
        const wedgeDirection = isSelf ? selfCharge?.direction : player.actionAim || player.aim;
        if (wedgeDirection) {
          ctx.save();
          const wedgeAlpha = isSelf ? 0.85 : 0.58;
          ctx.globalAlpha = wedgeAlpha;
          ctx.translate(offsetX, offsetY);
          ctx.rotate(Math.atan2(wedgeDirection.y ?? 0, wedgeDirection.x ?? 1));
          const wedgeLength = this.tileSize * (isSelf ? 1.4 + chargeRatio * 4.2 : 1.1 + chargeRatio * 3.2);
          const wedgeWidth = this.tileSize * (isSelf ? 0.75 + chargeRatio * 1.6 : 0.55 + chargeRatio * 1.2);
          const gradient = ctx.createLinearGradient(0, 0, wedgeLength, 0);
          gradient.addColorStop(0, this._withAlpha(glow.stroke, 0));
          gradient.addColorStop(0.25, this._withAlpha(glow.stroke, isSelf ? 0.35 : 0.24));
          gradient.addColorStop(0.9, this._withAlpha(glow.stroke, isSelf ? 0.95 : 0.7));
          ctx.fillStyle = gradient;
          const startPadding = Math.min(this.tileSize * 0.25, wedgeLength * 0.28);
          ctx.beginPath();
          ctx.moveTo(startPadding, -wedgeWidth / 2);
          ctx.lineTo(wedgeLength, 0);
          ctx.lineTo(startPadding, wedgeWidth / 2);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.lineWidth = (isSelf ? 1.8 : 1.1) + chargeRatio * (isSelf ? 1.4 : 0.9);
          ctx.strokeStyle = this._withAlpha(glow.stroke, isSelf ? 0.8 : 0.55);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(offsetX, offsetY, radius * 0.2, offsetX, offsetY, radius);
      if (isSelf) {
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#0ea5e9');
      } else {
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(1, '#ea580c');
      }
      ctx.fillStyle = gradient;
      ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      ctx.fill();

      if (!isSelf) {
        const rawName = typeof player.name === 'string' ? player.name.trim() : '';
        const displayName = rawName || player.id;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.font = 'bold 10px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(displayName, offsetX, offsetY - radius - 6);
      }

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
  this._renderMapOverlay(local, currentLevelId, nearestPortal);

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
    if (this._shouldIgnoreGlobalKey(event)) {
      return;
    }
    const noModifiers = !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (this.mapOverlayVisible) {
      if ((event.code === 'KeyM' && noModifiers) || event.code === 'Escape') {
        event.preventDefault();
        this._setMapOverlayVisible(false);
      }
      return;
    }
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
    if (event.code === 'KeyM' && event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this._handleControlHintsToggle();
      return;
    }
    if (event.code === 'KeyM' && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.audio.ensureContext();
      const next = !this.audio.musicEnabled;
      this.audio.setMusicEnabled(next);
      if (this.audioToggle) {
        this.audioToggle.active = next;
      }
      return;
    }
    if (event.code === 'KeyM' && noModifiers) {
      event.preventDefault();
      this._setMapOverlayVisible(!this.mapOverlayVisible);
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
    if (this._shouldIgnoreGlobalKey(event)) {
      return;
    }
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

  _resolveEffectColor(effect) {
    if (!effect) return '#f97316';
    const variantKey = effect.variant || effect.itemId || null;
    if (variantKey && EFFECT_VARIANT_COLORS[variantKey]) {
      return EFFECT_VARIANT_COLORS[variantKey];
    }
    if (effect.type === 'spell') return '#2563eb';
    if (effect.type === 'ranged') return '#f97316';
    if (effect.type === 'melee') return '#ef4444';
    return '#f97316';
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

  _normalizePlayerState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = typeof raw.id === 'string' ? raw.id : raw.id != null ? String(raw.id) : null;
    if (!id) return null;
    const aimX = Number.isFinite(raw.aimX) ? Number(raw.aimX) : Number.isFinite(raw.aim?.x) ? Number(raw.aim.x) : 1;
    const aimY = Number.isFinite(raw.aimY) ? Number(raw.aimY) : Number.isFinite(raw.aim?.y) ? Number(raw.aim.y) : 0;
    const aim = this._normalize({ x: aimX, y: aimY });
    const actionAimX = Number.isFinite(raw.actionAimX)
      ? Number(raw.actionAimX)
      : Number.isFinite(raw.actionAim?.x)
      ? Number(raw.actionAim.x)
      : null;
    const actionAimY = Number.isFinite(raw.actionAimY)
      ? Number(raw.actionAimY)
      : Number.isFinite(raw.actionAim?.y)
      ? Number(raw.actionAim.y)
      : null;
    const hasActionAim = Number.isFinite(actionAimX) && Number.isFinite(actionAimY);
    const actionAim = hasActionAim ? this._normalize({ x: actionAimX, y: actionAimY }) : null;
    return {
      ...raw,
      id,
      aimX,
      aimY,
      aim,
      actionAimX: hasActionAim ? actionAimX : null,
      actionAimY: hasActionAim ? actionAimY : null,
      actionAim,
    };
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

  _handleMinimapFloatToggle(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    this._setMinimapFloating(!this.minimapFloating);
  }

  _setMinimapFloating(floating, persist = true) {
    if (!this.minimapCardEl) return;
    const next = Boolean(floating);
    if (this.minimapFloating === next) {
      if (next) {
        this._restoreMinimapFloatPosition();
      }
      if (persist) {
        try {
          window.localStorage?.setItem(MINIMAP_FLOAT_STORAGE_KEY, next ? '1' : '0');
        } catch (err) {
          // ignore storage write failures
        }
      }
      return;
    }
    if (!this.minimapDockParent && this.minimapCardEl.parentElement) {
      this.minimapDockParent = this.minimapCardEl.parentElement;
    }
    if (next) {
      let fallbackPosition = null;
      if (this.hudEl) {
        const hudRect = this.hudEl.getBoundingClientRect();
        const cardRect = this.minimapCardEl.getBoundingClientRect();
        fallbackPosition = {
          left: cardRect.left - hudRect.left,
          top: cardRect.top - hudRect.top,
        };
      }
      this.hudEl?.appendChild(this.minimapCardEl);
      this.minimapCardEl.classList.add('floating');
      this.minimapFloating = true;
      const restored = this._restoreMinimapFloatPosition(fallbackPosition);
      if (!restored && fallbackPosition) {
        this._applyMinimapFloatPosition(fallbackPosition.left, fallbackPosition.top);
      }
  this._avoidMinimapOverlap(true);
    } else {
      this.minimapFloating = false;
      this.minimapCardEl.classList.remove('floating', 'dragging');
      this.minimapCardEl.style.left = '';
      this.minimapCardEl.style.top = '';
      this.minimapCardEl.style.right = '';
      this.minimapCardEl.style.bottom = '';
      if (this.minimapDockParent) {
        const anchor = this.minimapDockParent.querySelector('.utility-bar');
        if (anchor) {
          anchor.insertAdjacentElement('afterend', this.minimapCardEl);
        } else {
          this.minimapDockParent.appendChild(this.minimapCardEl);
        }
      }
      this.minimapDragPointerId = null;
      window.removeEventListener('pointermove', this._handleMinimapDragMove);
      window.removeEventListener('pointerup', this._handleMinimapDragEnd);
      window.removeEventListener('pointercancel', this._handleMinimapDragCancel);
    }
    this._syncMinimapFloatButton();
    if (persist) {
      try {
        window.localStorage?.setItem(MINIMAP_FLOAT_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage write failures
      }
      if (next) {
        this._persistMinimapFloatPosition();
      }
    }
  }

  _syncMinimapFloatButton() {
    if (!this.minimapFloatButton) return;
    const label = this.minimapFloating ? 'Dock' : 'Float';
    this.minimapFloatButton.textContent = label;
    this.minimapFloatButton.setAttribute('aria-pressed', this.minimapFloating ? 'true' : 'false');
    this.minimapFloatButton.setAttribute('aria-label', `${label} minimap`);
  }

  _loadMinimapFloatPreference() {
    let stored = null;
    try {
      stored = window.localStorage?.getItem(MINIMAP_FLOAT_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === '1') {
      this._setMinimapFloating(true, false);
    } else {
      this._setMinimapFloating(false, false);
    }
  }

  _restoreMinimapFloatPosition(fallbackPosition = null) {
    if (!this.minimapCardEl || !this.minimapFloating) return false;
    let stored = null;
    try {
      stored = window.localStorage?.getItem(MINIMAP_FLOAT_POSITION_KEY);
    } catch (err) {
      stored = null;
    }
    let position = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
          position = { left: Number(parsed.left), top: Number(parsed.top) };
        }
      } catch (err) {
        position = null;
      }
    }
    if (!position && fallbackPosition) {
      position = { left: fallbackPosition.left, top: fallbackPosition.top };
    }
    if (!position) {
      const padding = Math.max(12, this._getHudPadding());
      const hudRect = this.hudEl?.getBoundingClientRect();
      const cardRect = this.minimapCardEl.getBoundingClientRect();
      if (hudRect && cardRect) {
        position = {
          left: Math.max(padding, hudRect.width - cardRect.width - padding),
          top: padding,
        };
      } else {
        position = { left: 0, top: 0 };
      }
    }
    const clamped = this._clampMinimapFloatPosition(position.left, position.top);
    this._applyMinimapFloatPosition(clamped.left, clamped.top);
  this._avoidMinimapOverlap(true);
    return Boolean(stored);
  }

  _applyMinimapFloatPosition(left, top) {
    if (!this.minimapCardEl) return;
    const clamped = this._clampMinimapFloatPosition(left, top);
    this.minimapCardEl.style.left = `${Math.round(clamped.left)}px`;
    this.minimapCardEl.style.top = `${Math.round(clamped.top)}px`;
    this.minimapCardEl.style.right = 'auto';
    this.minimapCardEl.style.bottom = 'auto';
    this.minimapFloatPosition = { left: clamped.left, top: clamped.top };
  }

  _clampMinimapFloatPosition(left, top) {
    const hudRect = this.hudEl?.getBoundingClientRect();
    if (!hudRect || !this.minimapCardEl) {
      const safeLeft = Number.isFinite(left) ? Number(left) : 0;
      const safeTop = Number.isFinite(top) ? Number(top) : 0;
      return {
        left: Math.max(0, safeLeft || 0),
        top: Math.max(0, safeTop || 0),
      };
    }
    const cardRect = this.minimapCardEl.getBoundingClientRect();
    const maxLeft = Math.max(0, hudRect.width - cardRect.width);
    const maxTop = Math.max(0, hudRect.height - cardRect.height);
    const safeLeft = Number.isFinite(left) ? Number(left) : 0;
    const safeTop = Number.isFinite(top) ? Number(top) : 0;
    return {
      left: Math.min(Math.max(safeLeft, 0), maxLeft),
      top: Math.min(Math.max(safeTop, 0), maxTop),
    };
  }

  _rectsOverlap(a, b) {
    if (!a || !b) return false;
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  _avoidMinimapOverlap(force = false) {
    if (!this.minimapFloating || !this.minimapCardEl || !this.statPanel || !this.hudEl) return;
    const hudRect = this.hudEl.getBoundingClientRect();
    const cardRect = this.minimapCardEl.getBoundingClientRect();
    const statsRect = this.statPanel.getBoundingClientRect();
    if (!hudRect || !cardRect || !statsRect) return;
    if (!this._rectsOverlap(cardRect, statsRect)) return;

    const overlapWidth = Math.max(0, Math.min(cardRect.right, statsRect.right) - Math.max(cardRect.left, statsRect.left));
    const overlapHeight = Math.max(0, Math.min(cardRect.bottom, statsRect.bottom) - Math.max(cardRect.top, statsRect.top));
    const overlapArea = overlapWidth * overlapHeight;
    const cardArea = cardRect.width * cardRect.height || 1;
    if (!force && overlapArea <= cardArea * 0.35) {
      return;
    }

    const padding = Math.max(12, this._getHudPadding());
    const cardWidth = cardRect.width;
    const cardHeight = cardRect.height;
    const baseCandidates = [
      { left: hudRect.width - cardWidth - padding, top: padding },
      { left: hudRect.width - cardWidth - padding, top: hudRect.height - cardHeight - padding },
      { left: padding, top: hudRect.height - cardHeight - padding },
      { left: padding, top: padding },
    ];

    for (const candidate of baseCandidates) {
      const clamped = this._clampMinimapFloatPosition(candidate.left, candidate.top);
      const projected = {
        left: hudRect.left + clamped.left,
        top: hudRect.top + clamped.top,
        right: hudRect.left + clamped.left + cardWidth,
        bottom: hudRect.top + clamped.top + cardHeight,
      };
      if (!this._rectsOverlap(projected, statsRect)) {
        this._applyMinimapFloatPosition(clamped.left, clamped.top);
        this._persistMinimapFloatPosition();
        return;
      }
    }
  }

  _persistMinimapFloatPosition() {
    if (!this.minimapFloatPosition) return;
    try {
      window.localStorage?.setItem(
        MINIMAP_FLOAT_POSITION_KEY,
        JSON.stringify({
          left: Math.round(this.minimapFloatPosition.left),
          top: Math.round(this.minimapFloatPosition.top),
        })
      );
    } catch (err) {
      // ignore storage write failures
    }
  }

  _getHudPadding() {
    if (!this.hudEl || typeof window === 'undefined' || !window.getComputedStyle) return 0;
    try {
      const styles = window.getComputedStyle(this.hudEl);
      const value = parseFloat(styles?.paddingLeft || '0');
      return Number.isFinite(value) ? value : 0;
    } catch (err) {
      return 0;
    }
  }

  _handleMinimapDragStart(event) {
    if (!this.minimapCardEl) return;
    if (event && typeof event.button === 'number' && event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }
    if (event?.target?.closest?.('button')) {
      return;
    }
    if (!this.minimapFloating) {
      this._setMinimapFloating(true);
    }
    if (!this.minimapFloating) {
      return;
    }
    event.preventDefault?.();
    const cardRect = this.minimapCardEl.getBoundingClientRect();
    this.minimapDragPointerId = event.pointerId;
    this.minimapDragOffset = {
      x: event.clientX - cardRect.left,
      y: event.clientY - cardRect.top,
    };
    this.minimapCardEl.classList.add('dragging');
    window.addEventListener('pointermove', this._handleMinimapDragMove);
    window.addEventListener('pointerup', this._handleMinimapDragEnd);
    window.addEventListener('pointercancel', this._handleMinimapDragCancel);
  }

  _handleMinimapDragMove(event) {
    if (!this.minimapFloating || event.pointerId !== this.minimapDragPointerId || !this.minimapCardEl) {
      return;
    }
    const hudRect = this.hudEl?.getBoundingClientRect();
    if (!hudRect) return;
    event.preventDefault?.();
    const proposedLeft = event.clientX - hudRect.left - this.minimapDragOffset.x;
    const proposedTop = event.clientY - hudRect.top - this.minimapDragOffset.y;
    const clamped = this._clampMinimapFloatPosition(proposedLeft, proposedTop);
    this.minimapCardEl.style.left = `${Math.round(clamped.left)}px`;
    this.minimapCardEl.style.top = `${Math.round(clamped.top)}px`;
    this.minimapCardEl.style.right = 'auto';
    this.minimapCardEl.style.bottom = 'auto';
    this.minimapFloatPosition = { left: clamped.left, top: clamped.top };
  }

  _handleMinimapDragEnd(event) {
    if (event.pointerId !== this.minimapDragPointerId) return;
    event.preventDefault?.();
    this.minimapDragPointerId = null;
    this.minimapCardEl?.classList.remove('dragging');
    window.removeEventListener('pointermove', this._handleMinimapDragMove);
    window.removeEventListener('pointerup', this._handleMinimapDragEnd);
    window.removeEventListener('pointercancel', this._handleMinimapDragCancel);
    this._avoidMinimapOverlap();
    this._persistMinimapFloatPosition();
  }

  _handleMinimapDragCancel(event) {
    if (event.pointerId !== this.minimapDragPointerId) return;
    this.minimapDragPointerId = null;
    this.minimapCardEl?.classList.remove('dragging');
    window.removeEventListener('pointermove', this._handleMinimapDragMove);
    window.removeEventListener('pointerup', this._handleMinimapDragEnd);
    window.removeEventListener('pointercancel', this._handleMinimapDragCancel);
    this._avoidMinimapOverlap();
    this._persistMinimapFloatPosition();
  }

  _handleControlHintsToggle(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    this._setControlHintsVisible(!this.controlHintsVisible);
  }

  _setControlHintsVisible(visible, persist = true) {
    const next = Boolean(visible);
    if (this.controlHintsVisible === next && !persist) {
      this._syncControlHintsVisibility();
      return;
    }
    this.controlHintsVisible = next;
    this._syncControlHintsVisibility();
    if (persist) {
      try {
        window.localStorage?.setItem(CONTROL_HINTS_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage write failures
      }
    }
  }

  _syncControlHintsVisibility() {
    const visible = this.controlHintsVisible;
    if (this.desktopHelpEl) {
      if (visible) {
        this.desktopHelpEl.removeAttribute('hidden');
      } else {
        this.desktopHelpEl.setAttribute('hidden', '');
      }
    }
    if (this.mobileHelpEl) {
      if (visible) {
        this.mobileHelpEl.removeAttribute('hidden');
      } else {
        this.mobileHelpEl.setAttribute('hidden', '');
      }
    }
    if (this.controlHintsToggleButton) {
      const label = visible ? 'Hide Controls' : 'Show Controls';
      this.controlHintsToggleButton.textContent = label;
      this.controlHintsToggleButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
      this.controlHintsToggleButton.setAttribute('aria-label', `${label} panel`);
    }
  }

  _loadControlHintsPreference() {
    let stored = null;
    try {
      stored = window.localStorage?.getItem(CONTROL_HINTS_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    if (stored === '0') {
      this._setControlHintsVisible(false, false);
    } else {
      this._setControlHintsVisible(true, false);
    }
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
    const previous = this.minimapVisible;
    this.minimapVisible = next;
    if (this.minimapCardEl) {
      this.minimapCardEl.classList.toggle('collapsed', !next);
      this.minimapCardEl.hidden = !next;
      this.minimapCardEl.setAttribute('aria-hidden', next ? 'false' : 'true');
    }
    if (this.minimapBodyEl) {
      this.minimapBodyEl.style.display = next ? '' : 'none';
    }
    if (this.minimapGhostButton) {
      this.minimapGhostButton.hidden = next;
      this.minimapGhostButton.setAttribute('aria-hidden', next ? 'true' : 'false');
    }
    if (this.minimapToggleButton) {
      this.minimapToggleButton.textContent = next ? 'Hide' : 'Show';
      this.minimapToggleButton.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (previous !== next) {
      if (!next && this.minimapGhostButton) {
        setTimeout(() => {
          try {
            this.minimapGhostButton.focus({ preventScroll: true });
          } catch (err) {
            // ignore focus errors
          }
        }, 0);
      } else if (next && this.minimapToggleButton) {
        setTimeout(() => {
          try {
            this.minimapToggleButton.focus({ preventScroll: true });
          } catch (err) {
            // ignore focus errors
          }
        }, 0);
      }
    }
    if (persist) {
      try {
        window.localStorage?.setItem(MINIMAP_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage failures
      }
    }
  }

  _toggleMapOverlay(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    this._setMapOverlayVisible(!this.mapOverlayVisible);
  }

  _closeMapOverlay(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    this._setMapOverlayVisible(false);
  }

  _handleMapOverlayBackdropClick(event) {
    if (!this.mapOverlayEl || !event) return;
    if (event.target === this.mapOverlayEl) {
      this._closeMapOverlay(event);
    }
  }

  _setMapOverlayVisible(visible) {
    const next = Boolean(visible);
    if (!this.mapOverlayEl) {
      this.mapOverlayVisible = false;
      return;
    }
    if (this.mapOverlayVisible === next) {
      if (next) {
        this._syncMapOverlaySize();
      }
      return;
    }
    if (next) {
      const globalActive = typeof document !== 'undefined' ? document.activeElement : null;
      this.mapOverlayLastFocus = this.shadowRoot.activeElement || globalActive || null;
    }
    this.mapOverlayVisible = next;
    this.mapOverlayEl.hidden = !next;
    this.mapOverlayEl.setAttribute('aria-hidden', next ? 'false' : 'true');
    if (next) {
      this.setAttribute('data-map-open', 'true');
      this._syncMapOverlaySize(true);
    } else {
      this.removeAttribute('data-map-open');
    }
    if (this.minimapExpandButton) {
      this.minimapExpandButton.textContent = next ? 'Collapse' : 'Expand';
      this.minimapExpandButton.setAttribute('aria-pressed', next ? 'true' : 'false');
      this.minimapExpandButton.setAttribute(
        'aria-label',
        next ? 'Close expanded map' : 'Open expanded map'
      );
    }
    if (next) {
      this.mapOverlayCloseButton?.focus({ preventScroll: true });
    } else {
      const focusTarget = this.mapOverlayLastFocus || this.minimapExpandButton;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        setTimeout(() => {
          try {
            focusTarget.focus({ preventScroll: true });
          } catch (err) {
            // ignore focus errors
          }
        }, 0);
      }
      this.mapOverlayLastFocus = null;
    }
  }

  _syncMapOverlaySize(force = false) {
    if (!this.mapOverlayCanvas || !this.mapOverlayCtx) return;
    let reference = Math.min(this.viewportWidth || 0, this.viewportHeight || 0);
    if (!reference || !Number.isFinite(reference)) {
      if (typeof window !== 'undefined') {
        const vw = window.innerWidth || 0;
        const vh = window.innerHeight || 0;
        reference = Math.min(vw, vh);
      }
    }
    if (!reference || !Number.isFinite(reference)) {
      reference = 640;
    }
    const cssSize = Math.max(320, Math.min(820, Math.round(reference * 0.78)));
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const pixelSize = Math.max(320, Math.floor(cssSize * dpr));
    if (force || this.mapOverlayCanvas.width !== pixelSize) {
      this.mapOverlayCanvas.width = pixelSize;
      this.mapOverlayCanvas.height = pixelSize;
      this.mapOverlayCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.mapOverlayCtx.scale(dpr, dpr);
      this.mapOverlayCtx.imageSmoothingEnabled = false;
    }
    if (this.mapOverlayCanvas.style) {
      this.mapOverlayCanvas.style.width = `${cssSize}px`;
      this.mapOverlayCanvas.style.height = `${cssSize}px`;
    }
    this.mapOverlayRenderSize = cssSize;
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
    this._syncCompactOverlayVisibility();
    this._updateCompactStatus();
    if (persist) {
      try {
        window.localStorage?.setItem(UI_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch (err) {
        // ignore storage failures
      }
      this.hasStoredUiPreference = true;
      if (!next) {
        this.compactAutoCollapse = false;
      }
    } else if (!next) {
      this.compactAutoCollapse = false;
    }
  }

  _loadUiCollapsePreference() {
    let stored = null;
    try {
      stored = window.localStorage?.getItem(UI_COLLAPSE_STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    const hasPref = stored === '0' || stored === '1';
    this.hasStoredUiPreference = hasPref;
    if (stored === '1') {
      this.compactAutoCollapse = false;
      this._setUICollapsed(true, false);
    } else if (stored === '0') {
      this.compactAutoCollapse = false;
      this._setUICollapsed(false, false);
    } else {
      const autoCollapse = this._shouldAutoCollapseHud();
      this.compactAutoCollapse = autoCollapse;
      this._setUICollapsed(autoCollapse, false);
    }
    this._syncCompactOverlayVisibility();
  }

  _evaluateCompactLayout() {
    const rectWidth = this.viewportWidth || (typeof this.getBoundingClientRect === 'function' ? this.getBoundingClientRect().width : 0);
    const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0;
    const width = rectWidth || fallbackWidth;
    const coarsePointer = this.detectedTouch || Boolean(this.coarsePointerQuery?.matches) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    const shouldCompact = coarsePointer && width > 0 && width <= COMPACT_BREAKPOINT;
    if (this.compactMode === shouldCompact) {
      if (shouldCompact) {
        this.setAttribute('data-compact', 'true');
        this._maybeAutoCollapseForCompact();
      } else {
        this.removeAttribute('data-compact');
      }
      this._syncCompactOverlayVisibility();
      return shouldCompact;
    }
    this.compactMode = shouldCompact;
    if (shouldCompact) {
      this.setAttribute('data-compact', 'true');
    } else {
      this.removeAttribute('data-compact');
    }
    this._syncTouchUiToggleButton();
    this._syncCompactOverlayVisibility();
    this._updateCompactStatus();
    if (shouldCompact) {
      this._maybeAutoCollapseForCompact();
    } else if (this.compactAutoCollapse && !this.hasStoredUiPreference) {
      this.compactAutoCollapse = false;
      if (this.uiCollapsed) {
        this._setUICollapsed(false, false);
      } else {
        this._syncCompactOverlayVisibility();
        this._updateCompactStatus();
      }
    }
    return shouldCompact;
  }

  _syncCompactOverlayVisibility() {
    if (!this.compactStatusEl) return;
    const maxHealth = Math.max(0, this.localHealth?.maxHealth ?? 0);
    const shouldShow = (this.compactMode || this.uiCollapsed) && maxHealth > 0;
    this.compactStatusEl.hidden = !shouldShow;
  }

  _updateCompactStatus() {
    if (!this.compactStatusEl) return;
    const health = Math.max(0, Math.round(this.localHealth?.health ?? 0));
    const maxHealth = Math.max(0, Math.round(this.localHealth?.maxHealth ?? 0));
    const healthRatio = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;
    if (this.compactHealthText) {
      this.compactHealthText.textContent = maxHealth > 0 ? `${health} / ${maxHealth}` : `${health}`;
    }
    if (this.compactHealthBar) {
      this.compactHealthBar.style.width = `${Math.round(healthRatio * 100)}%`;
    }
    const momentum = this.localMomentum || null;
    let momentumRatio = 0;
    let momentumLabel = 'Ready';
    if (momentum) {
      const stacks = Math.max(0, Number(momentum.stacks) || 0);
      const remaining = Math.max(0, Number(momentum.remaining) || 0);
      const duration = Math.max(1, Number(momentum.duration) || 1);
      momentumRatio = Math.max(0, Math.min(1, duration > 0 ? remaining / duration : 0));
      if (stacks > 0) {
        momentumLabel = `${stacks} stack${stacks === 1 ? '' : 's'}`;
      } else if (momentumRatio > 0) {
        momentumLabel = 'Active';
      } else {
        momentumLabel = 'Ready';
      }
    }
    if (this.compactMomentumLabel) {
      this.compactMomentumLabel.textContent = momentumLabel;
    }
    if (this.compactMomentumBar) {
      this.compactMomentumBar.style.width = `${Math.round(momentumRatio * 100)}%`;
    }
  }

  _shouldAutoCollapseHud() {
    const rectWidth = this.viewportWidth || (typeof this.getBoundingClientRect === 'function' ? this.getBoundingClientRect().width : 0);
    const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0;
    const width = rectWidth || fallbackWidth;
    if (!width) return false;
    const coarsePointer = this.detectedTouch || Boolean(this.coarsePointerQuery?.matches) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    return coarsePointer && width <= COMPACT_BREAKPOINT;
  }

  _maybeAutoCollapseForCompact() {
    if (!this.compactMode) return;
    if (this.uiCollapsed) return;
    if (this.hasStoredUiPreference) return;
    if (this.compactAutoCollapse) return;
    if (this._shouldAutoCollapseHud()) {
      this.compactAutoCollapse = true;
      this._setUICollapsed(true, false);
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
  this.minimapPortalHintEl.textContent = `Nearest gateway: ${parts.join(' • ')}`;
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
          text = `Press E to ${parts.join(' • ')}`;
        } else if (!closest && nearest && nearest.distance <= PORTAL_INTERACT_RADIUS * 1.3) {
          const parts = [`Enter ${nearest.portal.name || 'Gateway'}`];
          if (nearest.portal.difficulty) {
            parts.push(nearest.portal.difficulty);
          }
          text = `Press E to ${parts.join(' • ')}`;
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
  const label = labelParts.join(' • ');
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
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;
    if (!width || !height) return;
    this._renderMapSurface(this.minimapCtx, width, height, local, currentLevelId, nearestPortal, {
      includeViewport: true,
    });
  }

  _renderMapOverlay(local, currentLevelId, nearestPortal) {
    if (!this.mapOverlayVisible) return;
    if (!this.mapOverlayCanvas || !this.mapOverlayCtx || !this.world) return;
    this._syncMapOverlaySize();
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const width = this.mapOverlayRenderSize || (this.mapOverlayCanvas.width / dpr);
    const height = width;
    if (!width || !height) return;
    this._renderMapSurface(this.mapOverlayCtx, width, height, local, currentLevelId, nearestPortal, {
      includeViewport: true,
    });
  }

  _renderMapSurface(ctx, width, height, local, currentLevelId, nearestPortal, options = {}) {
    if (!ctx || !width || !height) return;
    if (!this.world) return;
    if (!this.minimapBase) {
      this._prepareMinimap();
      if (!this.minimapBase) return;
    }
    if (!this.levels) {
      this.levels = new Map();
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.minimapBase, 0, 0, width, height);

    const baseWidth = this.minimapBase.width || width;
    const baseHeight = this.minimapBase.height || height;
    const scaleMultiplierX = baseWidth ? width / baseWidth : 1;
    const scaleMultiplierY = baseHeight ? height / baseHeight : 1;
    const scaleX = (this.minimapScaleX || 1) * scaleMultiplierX;
    const scaleY = (this.minimapScaleY || 1) * scaleMultiplierY;
    const levelKey = currentLevelId || null;
    const anchorX = local?.x ?? this.lastKnownPosition?.x ?? null;
    const anchorY = local?.y ?? this.lastKnownPosition?.y ?? null;

    ctx.save();

    for (const level of this.levels.values()) {
      if (!level) continue;
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

    if ((!this.levels || this.levels.size === 0) || levelKey === null) {
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

    if (!levelKey && nearestPortal && anchorX != null && anchorY != null) {
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
      ctx.arc(px, py, Math.max(3.2, scaleX + scaleY), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const includeViewport = options.includeViewport !== false;
    const anchor = local || this.lastKnownPosition;
    if (includeViewport && anchor && this.canvas && this.canvas.clientWidth && this.canvas.clientHeight) {
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
  const difficulty = info.difficulty ? ` • ${info.difficulty}` : '';
      this.minimapLabelEl.textContent = info.name ? `${info.name}${difficulty}` : info.id || 'Stronghold';
      if (info.difficulty) {
  this.minimapLabelEl.title = `${info.name || info.id} • ${info.difficulty}`;
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
  const detail = info.difficulty ? `${info.name} • ${info.difficulty}` : info.name;
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
  this._showLevelBanner(`Entering ${info.name}${info.difficulty ? ` • ${info.difficulty}` : ''}`, info.color);
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
    this._updateEquipmentPanel();
  }

  _flashInventoryPanel() {
    if (!this.inventoryPanel) return;
    this.inventoryPanel.classList.remove('flash');
    // Force reflow to restart animation
    void this.inventoryPanel.offsetWidth;
    this.inventoryPanel.classList.add('flash');
  }

  _flashEquipmentPanel() {
    if (!this.gearPanel) return;
    this.gearPanel.classList.remove('flash');
    void this.gearPanel.offsetWidth;
    this.gearPanel.classList.add('flash');
  }

  _applyGearPayload(payload) {
    const owned = new Set(Object.values(STARTING_EQUIPMENT));
    if (!payload) {
      this.ownedGear = owned;
      return;
    }
    const source = Array.isArray(payload?.owned)
      ? payload.owned
      : Array.isArray(payload)
      ? payload
      : Object.keys(payload || {});
    for (const id of source) {
      if (GEAR_LIBRARY[id]) {
        owned.add(id);
      }
    }
    this.ownedGear = owned;
  }

  _normalizeEquipmentPayload(payload) {
    const equipment = { ...STARTING_EQUIPMENT };
    if (payload && typeof payload === 'object') {
      for (const slot of EQUIPMENT_ORDER) {
        const candidate = payload[slot];
        if (typeof candidate === 'string' && GEAR_LIBRARY[candidate]) {
          equipment[slot] = candidate;
        }
      }
    }
    return equipment;
  }

  _syncEquipmentOwnership() {
    if (!this.equipment) {
      this.equipment = { ...STARTING_EQUIPMENT };
    }
    const owned = this.ownedGear instanceof Set ? this.ownedGear : new Set(Object.values(STARTING_EQUIPMENT));
    for (const slot of EQUIPMENT_ORDER) {
      const current = this.equipment[slot];
      if (!current || !GEAR_LIBRARY[current] || !owned.has(current)) {
        this.equipment[slot] = STARTING_EQUIPMENT[slot];
      }
    }
  }

  _updateEquipmentPanel() {
    if (!this.gearPanel) return;
    this._syncEquipmentOwnership();
    const owned = this.ownedGear || new Set();
    for (const slot of EQUIPMENT_ORDER) {
      const labelEl = this.equipmentLabels?.[slot];
      const listEl = this.equipmentOptionLists?.[slot];
      const equippedId = this.equipment?.[slot] || STARTING_EQUIPMENT[slot];
      const equippedDef = GEAR_LIBRARY[equippedId] || GEAR_LIBRARY[STARTING_EQUIPMENT[slot]];
      if (labelEl) {
        labelEl.textContent = equippedDef ? equippedDef.name : equippedId;
      }
      if (!listEl) continue;
      listEl.innerHTML = '';
      const order = GEAR_PROGRESSION[slot] || [];
      for (const id of order) {
        const def = GEAR_LIBRARY[id];
        if (!def) continue;
        const ownedItem = owned.has(id);
        const isEquipped = equippedId === id;
        const li = document.createElement('li');
        if (!ownedItem) {
          li.classList.add('locked');
          const label = document.createElement('span');
          label.textContent = `${def.name} — Locked`;
          li.appendChild(label);
          if (def.summary) {
            const summary = document.createElement('span');
            summary.className = 'summary';
            summary.textContent = def.summary;
            li.appendChild(summary);
          }
        } else {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.equipOption = slot;
          button.dataset.itemId = id;
          button.textContent = def.name;
          if (isEquipped) {
            button.classList.add('active');
          }
          li.appendChild(button);
          if (def.summary) {
            const summary = document.createElement('span');
            summary.className = 'summary';
            summary.textContent = def.summary;
            li.appendChild(summary);
          }
        }
        listEl.appendChild(li);
      }
    }
    this._syncActionButtonLabels();
    if (this.activeAction) {
      this.chargeMeter.actionName = this._resolveActionLabel(this.activeAction);
    }
  }

  _handleGearPanelClick(event) {
    const button = event.target.closest('[data-equip-option]');
    if (!button) return;
    const slot = button.dataset.equipOption;
    const itemId = button.dataset.itemId;
    if (!slot || !itemId) return;
    if (this.equipment?.[slot] === itemId) return;
    this._requestEquip(slot, itemId);
  }

  _requestEquip(slot, itemId) {
    if (!EQUIPMENT_SLOT_META[slot]) return;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: 'equip',
        slot,
        itemId,
      }),
    );
  }

  _resolveActionLabel(kind) {
    const slot = kind === 'spell' ? 'spell' : kind;
    const equippedId = this.equipment?.[slot] || STARTING_EQUIPMENT[slot];
    const def = GEAR_LIBRARY[equippedId];
    if (def?.shortLabel) return def.shortLabel;
    const meta = EQUIPMENT_SLOT_META[slot];
    if (meta?.actionFallback) return meta.actionFallback;
    return ACTION_LABEL[kind] || 'Charging';
  }

  _syncActionButtonLabels() {
    if (!Array.isArray(this.touchActionButtons)) return;
    for (const button of this.touchActionButtons) {
      const kind = button?.dataset?.touchAction;
      if (!kind) continue;
      const span = button.querySelector('span');
      if (!span) continue;
      span.textContent = this._resolveActionLabel(kind);
    }
    if (!this.activeAction) {
      this.chargeMeter.actionName = 'Idle';
    }
  }

  _showGearFeedback(message, ok = true) {
    if (!this.gearFeedbackEl) return;
    this.gearFeedbackEl.textContent = message || '';
    this.gearFeedbackEl.style.color = ok ? '#bae6fd' : '#fca5a5';
    if (this.gearFeedbackTimer) {
      clearTimeout(this.gearFeedbackTimer);
    }
    if (message) {
      this.gearFeedbackTimer = setTimeout(() => {
        if (this.gearFeedbackEl) {
          this.gearFeedbackEl.textContent = '';
        }
        this.gearFeedbackTimer = null;
      }, 3200);
    } else {
      this.gearFeedbackTimer = null;
    }
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

  _showTransientMessage(message, duration = 3200) {
    if (!this.messageEl) return;
    if (this._messageTimer) {
      clearTimeout(this._messageTimer);
      this._messageTimer = null;
    }
    this.messageEl.textContent = message || '';
    this.messageEl.hidden = !message;
    if (message && duration > 0) {
      this._messageTimer = setTimeout(() => {
        if (this.messageEl?.textContent === message) {
          this.messageEl.hidden = true;
        }
        this._messageTimer = null;
      }, duration);
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
    this.activeActionAim = this._normalize(this.pointerAim || { x: 1, y: 0 });
  this.chargeMeter.actionName = this._resolveActionLabel(kind);
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
    this.activeActionAim = null;
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
    this.activeActionAim = null;
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
    this._updateCompactStatus();
    this._syncCompactOverlayVisibility();
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
    this._hideOnboarding(true);
    this._closeTutorial(true);
    this._closeAdminPanel(false);
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
  this.activeActionAim = null;
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
    if (this.identityInput) {
      this.identityInput.blur();
    }
  }

  _showAuthOverlay(presetAccount = this.accountName || '') {
    if (!this.authOverlay) return;
    this._hideIdentityOverlay();
    this._hideLegacyOverlay();
    this.authOverlay.hidden = false;
    this.authPending = false;
    this.legacyPending = false;
    this._setAuthFormDisabled(false);
    this._clearAuthForm(presetAccount);
    this._updateAuthDescription();
    requestAnimationFrame(() => {
      const target = this.authAccountInput || this.authPasswordInput;
      target?.focus();
      target?.select?.();
    });
  }

  _hideAuthOverlay() {
    if (!this.authOverlay) return;
    this.authOverlay.hidden = true;
    this._clearAuthForm(this.accountName || '');
    this.authAccountInput?.blur();
    this.authPasswordInput?.blur();
  }

  _clearAuthForm(presetAccount = this.accountName || '') {
    if (this.authAccountInput) {
      this.authAccountInput.value = typeof presetAccount === 'string' ? presetAccount : '';
    }
    if (this.authPasswordInput) {
      this.authPasswordInput.value = '';
    }
    this._setAuthFeedback('', 'info');
  }

  _setAuthFormDisabled(disabled) {
    if (this.authAccountInput) {
      this.authAccountInput.disabled = Boolean(disabled);
    }
    if (this.authPasswordInput) {
      this.authPasswordInput.disabled = Boolean(disabled);
    }
    if (this.authLoginButton) {
      this.authLoginButton.disabled = Boolean(disabled);
    }
    if (this.authRegisterButton) {
      this.authRegisterButton.disabled = Boolean(disabled);
    }
    if (this.authLegacyButton) {
      this.authLegacyButton.disabled = Boolean(disabled);
    }
  }

  _setAuthFeedback(message, variant = 'info') {
    if (!this.authFeedbackEl) return;
    this.authFeedbackEl.textContent = message || '';
    const color =
      variant === 'success' ? '#bbf7d0' : variant === 'error' ? '#fca5a5' : '#bae6fd';
    this.authFeedbackEl.style.color = color;
  }

  _updateAuthDescription() {
    if (!this.authDescriptionEl) return;
    const min = Number(this.authPolicy?.passwordMinLength) || PASSWORD_MIN_LENGTH;
    const max = Number(this.authPolicy?.passwordMaxLength) || PASSWORD_MAX_LENGTH;
    this.authDescriptionEl.textContent = `Sign in or create an account to continue your adventure. Passwords must be ${min}-${max} characters.`;
  }

  _handleAuthLogin(event) {
    event?.preventDefault?.();
    if (this.authPending) return;
    const account = this.authAccountInput?.value?.trim?.() || '';
    const password = this.authPasswordInput?.value || '';
    if (!account) {
      this._setAuthFeedback('Enter your account name to continue.', 'error');
      this.authAccountInput?.focus();
      return;
    }
    if (!password) {
      this._setAuthFeedback('Enter your password to sign in.', 'error');
      this.authPasswordInput?.focus();
      return;
    }
    this.authPending = true;
    this._setAuthFormDisabled(true);
    this._setAuthFeedback('Signing in...', 'info');
    if (!this._sendAuthMessage('login', { account, password })) {
      this.authPending = false;
      this._setAuthFormDisabled(false);
      this._setAuthFeedback('Unable to contact the server. Please try again.', 'error');
    }
  }

  _handleAuthRegister(event) {
    event?.preventDefault?.();
    if (this.authPending) return;
    const account = this.authAccountInput?.value?.trim?.() || '';
    const password = this.authPasswordInput?.value || '';
    if (!account) {
      this._setAuthFeedback('Choose an account name to register.', 'error');
      this.authAccountInput?.focus();
      return;
    }
    if (!ACCOUNT_NAME_PATTERN.test(account)) {
      this._setAuthFeedback('Account names use letters, numbers, underscores, or hyphens (3-32 chars).', 'error');
      this.authAccountInput?.focus();
      return;
    }
    const min = Number(this.authPolicy?.passwordMinLength) || PASSWORD_MIN_LENGTH;
    const max = Number(this.authPolicy?.passwordMaxLength) || PASSWORD_MAX_LENGTH;
    if (password.length < min || password.length > max) {
      this._setAuthFeedback(`Password must be ${min}-${max} characters.`, 'error');
      this.authPasswordInput?.focus();
      return;
    }
    this.authPending = true;
    this._setAuthFormDisabled(true);
    this._setAuthFeedback('Creating account...', 'info');
    if (!this._sendAuthMessage('register', { account, password })) {
      this.authPending = false;
      this._setAuthFormDisabled(false);
      this._setAuthFeedback('Unable to reach the server. Please retry shortly.', 'error');
    }
  }

  _handleAuthCancel(event) {
    event?.preventDefault?.();
    if (this.authPending) return;
    this._hideAuthOverlay();
  }

  _handleAuthInputKeydown(event) {
    if (!event) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleAuthLogin();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._handleAuthCancel();
    }
  }

  _handleAuthLegacy(event) {
    event?.preventDefault?.();
    if (this.authPending) return;
    this._hideAuthOverlay();
    this._showLegacyOverlay(this.profileId || this.pendingProfileId || '');
  }

  _showLegacyOverlay(preset = this.profileId || '') {
    if (!this.legacyOverlay) return;
    this.legacyOverlay.hidden = false;
    this.legacyPending = false;
    this._setLegacyFormDisabled(false);
    if (this.legacyInput) {
      this.legacyInput.value = typeof preset === 'string' ? preset : '';
    }
    this._setLegacyFeedback('', 'info');
    requestAnimationFrame(() => {
      this.legacyInput?.focus();
      this.legacyInput?.select?.();
    });
  }

  _hideLegacyOverlay() {
    if (!this.legacyOverlay) return;
    this.legacyOverlay.hidden = true;
    if (this.legacyInput) {
      this.legacyInput.blur();
    }
    this._setLegacyFeedback('', 'info');
  }

  _setLegacyFeedback(message, variant = 'info') {
    if (!this.legacyFeedbackEl) return;
    this.legacyFeedbackEl.textContent = message || '';
    const color =
      variant === 'success' ? '#bbf7d0' : variant === 'error' ? '#fca5a5' : '#bae6fd';
    this.legacyFeedbackEl.style.color = color;
  }

  _setLegacyFormDisabled(disabled) {
    if (this.legacyInput) {
      this.legacyInput.disabled = Boolean(disabled);
    }
    if (this.legacyLoadButton) {
      this.legacyLoadButton.disabled = Boolean(disabled);
    }
    if (this.legacyBackButton) {
      this.legacyBackButton.disabled = Boolean(disabled);
    }
  }

  _handleLegacyLoad(event) {
    event?.preventDefault?.();
    if (this.legacyPending) return;
    const value = this.legacyInput?.value?.trim?.() || '';
    if (!value) {
      this._setLegacyFeedback('Enter a Hero ID to continue.', 'error');
      this.legacyInput?.focus();
      return;
    }
    this.legacyPending = true;
    this._setLegacyFormDisabled(true);
    this._setLegacyFeedback('Loading hero profile...', 'info');
    if (!this._sendAuthMessage('hero-id', { profileId: value })) {
      this.legacyPending = false;
      this._setLegacyFormDisabled(false);
      this._setLegacyFeedback('Unable to reach the server. Try again shortly.', 'error');
    }
  }

  _handleLegacyBack(event) {
    event?.preventDefault?.();
    if (this.legacyPending) return;
    this._hideLegacyOverlay();
    this._showAuthOverlay(this.accountName || '');
  }

  _handleLegacyInputKeydown(event) {
    if (!event) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleLegacyLoad();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._handleLegacyBack();
    }
  }

  _showAccountOverlay() {
    if (!this.accountOverlay) return;
    this.accountOverlay.hidden = false;
    this.accountPending = false;
    this._setAccountFormDisabled(false);
    this._setAccountFeedback('', 'info');
    this._resetAccountForm();
    requestAnimationFrame(() => {
      this.accountNameInput?.focus();
      this.accountNameInput?.select?.();
    });
  }

  _hideAccountOverlay(reset = false) {
    if (!this.accountOverlay) return;
    this.accountOverlay.hidden = true;
    if (reset) {
      this._resetAccountForm();
    }
    this.accountNameInput?.blur();
    this.accountCurrentInput?.blur();
    this.accountPasswordInput?.blur();
    this.accountConfirmInput?.blur();
  }

  _resetAccountForm() {
    if (this.accountNameInput) {
      this.accountNameInput.value = this.accountName || '';
    }
    if (this.accountCurrentInput) {
      this.accountCurrentInput.value = '';
    }
    if (this.accountPasswordInput) {
      this.accountPasswordInput.value = '';
    }
    if (this.accountConfirmInput) {
      this.accountConfirmInput.value = '';
    }
    this._setAccountFeedback('', 'info');
  }

  _setAccountFeedback(message, variant = 'info') {
    if (!this.accountFeedbackEl) return;
    this.accountFeedbackEl.textContent = message || '';
    const color =
      variant === 'success' ? '#bbf7d0' : variant === 'error' ? '#fca5a5' : '#bae6fd';
    this.accountFeedbackEl.style.color = color;
  }

  _setAccountFormDisabled(disabled) {
    const blocked = Boolean(disabled);
    if (this.accountNameInput) {
      this.accountNameInput.disabled = blocked;
    }
    if (this.accountCurrentInput) {
      this.accountCurrentInput.disabled = blocked;
    }
    if (this.accountPasswordInput) {
      this.accountPasswordInput.disabled = blocked;
    }
    if (this.accountConfirmInput) {
      this.accountConfirmInput.disabled = blocked;
    }
    if (this.accountSaveButton) {
      this.accountSaveButton.disabled = blocked;
    }
    if (this.accountCancelButton) {
      this.accountCancelButton.disabled = blocked;
    }
  }

  _handleAccountManage(event) {
    event?.preventDefault?.();
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this._showTransientMessage('Connect to the server before updating your account.');
      return;
    }
    this._showAccountOverlay();
  }

  _handleAccountSave(event) {
    event?.preventDefault?.();
    if (this.accountPending) return;
    const account = this.accountNameInput?.value?.trim?.() || '';
    const currentPassword = this.accountCurrentInput?.value || '';
    const newPassword = this.accountPasswordInput?.value || '';
    const confirmPassword = this.accountConfirmInput?.value || '';
    if (!account) {
      this._setAccountFeedback('Account name is required.', 'error');
      this.accountNameInput?.focus();
      return;
    }
    if (!ACCOUNT_NAME_PATTERN.test(account)) {
      this._setAccountFeedback('Use letters, numbers, underscores, or hyphens (3-32 chars).', 'error');
      this.accountNameInput?.focus();
      return;
    }
    const min = Number(this.authPolicy?.passwordMinLength) || PASSWORD_MIN_LENGTH;
    const max = Number(this.authPolicy?.passwordMaxLength) || PASSWORD_MAX_LENGTH;
    if (newPassword.length < min || newPassword.length > max) {
      this._setAccountFeedback(`Password must be ${min}-${max} characters.`, 'error');
      this.accountPasswordInput?.focus();
      return;
    }
    if (confirmPassword !== newPassword) {
      this._setAccountFeedback('Confirm password does not match.', 'error');
      this.accountConfirmInput?.focus();
      return;
    }
    const payload = {
      account,
      password: newPassword,
    };
    if (currentPassword) {
      payload.currentPassword = currentPassword;
    }
    this.accountPending = true;
    this._setAccountFormDisabled(true);
    this._setAccountFeedback('Saving password...', 'info');
    if (!this._sendAuthMessage('set-password', payload)) {
      this.accountPending = false;
      this._setAccountFormDisabled(false);
      this._setAccountFeedback('Unable to reach the server. Try again shortly.', 'error');
    }
  }

  _handleAccountCancel(event) {
    event?.preventDefault?.();
    if (this.accountPending) return;
    this._hideAccountOverlay(true);
  }

  _handleAccountInputKeydown(event) {
    if (!event) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleAccountSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._handleAccountCancel();
    }
  }

  _handleSignOut(event) {
    event?.preventDefault?.();
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this._showTransientMessage('You are already offline.');
      return;
    }
    if (!this._sendAuthMessage('logout')) {
      this._showTransientMessage('Unable to contact the server. Try again.');
      return;
    }
    this.expectingLogout = true;
    this._showTransientMessage('Signing out...');
  }

  _handleAuthEvent(data) {
    const event = data?.event;
    if (!event) return;

    if (event === 'error') {
      this.accountPending = false;
      this._setAccountFormDisabled(false);
      const message = data?.message || 'Unable to update account.';
      this._setAccountFeedback(message, 'error');
      const field = data?.field;
      if (field === 'account') {
        this.accountNameInput?.focus();
      } else if (field === 'currentPassword') {
        this.accountCurrentInput?.focus();
      } else if (field === 'password') {
        this.accountPasswordInput?.focus();
      } else if (field === 'confirmPassword') {
        this.accountConfirmInput?.focus();
      }
      return;
    }

    if (event === 'password-set') {
      this.accountPending = false;
      this._setAccountFormDisabled(false);
      const accountName = typeof data?.account?.name === 'string' ? data.account.name.trim() : this.accountName;
      this.accountName = accountName && accountName.length ? accountName : this.accountName;
      if (this.accountName) {
        this._persistAccountName(this.accountName);
      } else {
        this._clearStoredAccountName();
      }

      const sessionToken =
        typeof data?.sessionToken === 'string' && data.sessionToken.length ? data.sessionToken : null;
      if (sessionToken) {
        this.sessionToken = sessionToken;
        this._persistSessionToken(sessionToken);
        this._clearStoredProfileId();
      }

      this._updateSignOutVisibility();
      this._updateAccountDisplay();
      const feedback = data?.message || 'Account password updated.';
      this._setAccountFeedback(feedback, 'success');
      this._showTransientMessage(feedback, 3600);
      setTimeout(() => {
        this._hideAccountOverlay(true);
      }, 900);
      return;
    }

    if (event === 'logged-out') {
      this.accountPending = false;
      this.authPending = false;
      this.legacyPending = false;
      this.sessionToken = null;
      this._clearStoredSessionToken();
      this.profileId = null;
      this.pendingProfileId = null;
      this._clearStoredProfileId();
      this._setAccountFormDisabled(false);
      this._setAccountFeedback('', 'info');
      this._updateAccountDisplay();
      this._updateSignOutVisibility();
      this._hideAccountOverlay(true);
      this._hideLegacyOverlay();
      this._showAuthOverlay(this.accountName || '');
      this._showTransientMessage('Signed out.', 3200);
    }
  }

  _updateHeroIdDisplay() {
    if (!this.heroIdEl) return;
  this.heroIdEl.textContent = this.profileId || '—';
    this._updateHeroNameDisplay();
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

  _persistAccountName(name) {
    if (!name) {
      this._clearStoredAccountName();
      return;
    }
    try {
      window.localStorage?.setItem(ACCOUNT_STORAGE_KEY, name);
    } catch (err) {
      // ignore storage errors
    }
  }

  _clearStoredAccountName() {
    try {
      window.localStorage?.removeItem(ACCOUNT_STORAGE_KEY);
    } catch (err) {
      // ignore storage errors
    }
  }

  _persistSessionToken(token) {
    if (!token) {
      this._clearStoredSessionToken();
      return;
    }
    try {
      window.localStorage?.setItem(SESSION_STORAGE_KEY, token);
    } catch (err) {
      // ignore storage errors
    }
  }

  _clearStoredSessionToken() {
    try {
      window.localStorage?.removeItem(SESSION_STORAGE_KEY);
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

  _applyProfileSnapshot(profile) {
    if (!profile) return;
    const current = this.profileMeta || {};
    const name =
      profile.name !== undefined
        ? typeof profile.name === 'string' && profile.name.trim()
          ? profile.name.trim()
          : null
        : current.name || null;
    const tutorialCompleted =
      profile.tutorialCompleted !== undefined
        ? Boolean(profile.tutorialCompleted)
        : Boolean(current.tutorialCompleted);
    const isAdmin =
      profile.isAdmin !== undefined ? Boolean(profile.isAdmin) : Boolean(current.isAdmin);
    const banned = profile.banned !== undefined ? Boolean(profile.banned) : Boolean(current.banned);
    const createdAt = profile.createdAt ?? current.createdAt ?? null;
    const pvpOptIn =
      profile.pvpOptIn !== undefined ? Boolean(profile.pvpOptIn) : Boolean(current.pvpOptIn);
    const pvpCooldownEndsAt =
      profile.pvpCooldownEndsAt !== undefined
        ? Number(profile.pvpCooldownEndsAt) || 0
        : Number(current.pvpCooldownEndsAt) || 0;
    const pvpLastCombatAt =
      profile.pvpLastCombatAt !== undefined
        ? Number(profile.pvpLastCombatAt) || 0
        : Number(current.pvpLastCombatAt) || 0;

    this.profileMeta = {
      name,
      tutorialCompleted,
      isAdmin,
      banned,
      createdAt,
      pvpOptIn,
      pvpCooldownEndsAt,
      pvpLastCombatAt,
    };
    this._updateHeroNameDisplay();
    this._updateAdminButtonVisibility();
    this._updateSettingsState();
  }

  _updateHeroNameDisplay() {
    if (!this.heroNameEl) return;
    const name = this.profileMeta?.name;
    this.heroNameEl.textContent = name && name.length ? name : 'New Adventurer';
  }

  _updateAccountDisplay() {
    if (!this.heroAccountEl) return;
    if (this.accountName) {
      this.heroAccountEl.textContent = this.accountName;
    } else {
      this.heroAccountEl.textContent = 'Not linked';
    }
    if (this.accountManageButton) {
      if (this.accountName) {
        this.accountManageButton.removeAttribute('data-attention');
        this.accountManageButton.title = 'Manage your hero account';
      } else {
        this.accountManageButton.setAttribute('data-attention', 'true');
        this.accountManageButton.title = 'Link this hero to an account to play anywhere';
      }
    }
  }

  _updateSignOutVisibility() {
    if (!this.signOutButton) return;
    const show = Boolean(this.sessionToken);
    this.signOutButton.hidden = !show;
  }

  _updateAdminButtonVisibility() {
    if (!this.adminPanelButton) return;
    const isAdmin = Boolean(this.profileMeta?.isAdmin);
    this.adminPanelButton.hidden = !isAdmin;
    if (!isAdmin) {
      this._closeAdminPanel(false);
    }
  }

  _maybeStartOnboardingFlow(force = false) {
    if (!this.profileMeta) return;
    if (!this.profileMeta.name) {
      this._showOnboarding(force);
      return;
    }
    this._hideOnboarding(true);
    if (!this.profileMeta.tutorialCompleted) {
      this._startTutorialFlow(force);
    } else if (force) {
      this._closeTutorial(true);
    }
  }

  _showOnboarding(reset = false) {
    if (!this.onboardingOverlay) return;
    this.onboardingOverlay.hidden = false;
    if (reset && this.heroNameInput) {
      this.heroNameInput.value = '';
    }
    if (this.heroNameFeedback) {
      this.heroNameFeedback.textContent = '';
      this.heroNameFeedback.style.color = '#fca5a5';
    }
    this.heroNameSubmitButton?.removeAttribute('disabled');
    this.pendingNameRequest = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.heroNameInput?.focus();
        this.heroNameInput?.select?.();
      });
    });
  }

  _hideOnboarding(silent = false) {
    if (!this.onboardingOverlay) return;
    this.onboardingOverlay.hidden = true;
    if (this.heroNameInput) {
      this.heroNameInput.blur();
    }
    if (!silent && this.heroNameInput) {
      this.heroNameInput.value = '';
    }
    if (this.heroNameFeedback) {
      this.heroNameFeedback.textContent = '';
      this.heroNameFeedback.style.color = '#fca5a5';
    }
    this.pendingNameRequest = false;
    this.heroNameSubmitButton?.removeAttribute('disabled');
  }

  _handleHeroNameSubmit() {
    if (!this.heroNameInput) return;
    const value = this.heroNameInput.value.trim();
    if (!value) {
      if (this.heroNameFeedback) {
        this.heroNameFeedback.textContent = 'Please enter a name to continue.';
        this.heroNameFeedback.style.color = '#fca5a5';
      }
      this.heroNameInput.focus();
      return;
    }
    if (!this._sendProfileAction('set-name', { name: value })) {
      if (this.heroNameFeedback) {
        this.heroNameFeedback.textContent = 'Connection unavailable. Retry in a moment.';
        this.heroNameFeedback.style.color = '#fca5a5';
      }
      return;
    }
    this.pendingNameRequest = true;
    this.heroNameSubmitButton?.setAttribute('disabled', 'disabled');
    if (this.heroNameFeedback) {
      this.heroNameFeedback.textContent = 'Saving hero name...';
      this.heroNameFeedback.style.color = '#bae6fd';
    }
  }

  _handleHeroNameCancel() {
    const proceed = window.confirm('Leave without creating a hero? You can reconnect anytime.');
    if (!proceed) return;
    this._hideOnboarding(true);
    this._clearStoredProfileId();
    this.profileId = null;
    this.pendingProfileId = null;
    this._prepareForReconnect(null);
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      try {
        this.socket.close();
      } catch (err) {
        // ignore
      }
    }
    this.messageEl.textContent = 'Disconnected. Refresh when ready to play again.';
    this.messageEl.hidden = false;
  }

  _handleHeroNameInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleHeroNameSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._handleHeroNameCancel();
    }
  }

  _sendAuthMessage(action, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.socket.send(
        JSON.stringify({
          type: 'auth',
          action,
          ...payload,
        })
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  _sendProfileAction(action, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(
        JSON.stringify({
          type: 'profile',
          action,
          ...payload,
        })
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  _startTutorialFlow(force = false) {
    if (!this.tutorialOverlay || !Array.isArray(this.tutorialSteps) || !this.tutorialSteps.length) return;
    if (this.profileMeta?.tutorialCompleted && !force) return;
    this.tutorialActive = true;
    this.tutorialCompleting = false;
    if (force || this.currentTutorialStep < 0 || this.currentTutorialStep >= this.tutorialSteps.length) {
      this.currentTutorialStep = 0;
    }
    this._renderTutorialStep();
    this.tutorialOverlay.hidden = false;
  }

  _renderTutorialStep() {
    if (!this.tutorialBody || !Array.isArray(this.tutorialSteps) || !this.tutorialSteps.length) return;
    const maxIndex = this.tutorialSteps.length - 1;
    if (this.currentTutorialStep > maxIndex) {
      this.currentTutorialStep = maxIndex;
    }
    if (this.currentTutorialStep < 0) {
      this.currentTutorialStep = 0;
    }
    const step = this.tutorialSteps[this.currentTutorialStep];
    if (!step) return;
    this.tutorialBody.innerHTML = `
      <div>
        <h4>${this._escapeHtml(step.title || 'Tutorial')}</h4>
        <p>${step.body}</p>
        ${step.hint ? `<p><em>${step.hint}</em></p>` : ''}
      </div>
    `;
    if (this.tutorialProgress) {
      this.tutorialProgress.textContent = `Step ${this.currentTutorialStep + 1} of ${this.tutorialSteps.length}`;
    }
    if (this.tutorialBackButton) {
      this.tutorialBackButton.hidden = this.currentTutorialStep === 0;
      this.tutorialBackButton.disabled = this.tutorialCompleting;
    }
    if (this.tutorialNextButton) {
      this.tutorialNextButton.textContent =
        this.currentTutorialStep >= maxIndex ? 'Begin Adventure' : 'Next';
      this.tutorialNextButton.disabled = this.tutorialCompleting;
    }
    if (this.tutorialSkipButton) {
      this.tutorialSkipButton.disabled = this.tutorialCompleting;
    }
  }

  _handleTutorialNext() {
    if (this.tutorialCompleting) return;
    if (this.currentTutorialStep >= this.tutorialSteps.length - 1) {
      this._completeTutorial(false);
    } else {
      this.currentTutorialStep += 1;
      this._renderTutorialStep();
    }
  }

  _handleTutorialBack() {
    if (this.tutorialCompleting) return;
    if (this.currentTutorialStep > 0) {
      this.currentTutorialStep -= 1;
      this._renderTutorialStep();
    }
  }

  _handleTutorialSkip() {
    if (this.tutorialCompleting) return;
    this._completeTutorial(true);
  }

  _completeTutorial(skipped = false) {
    if (this.tutorialCompleting) return;
    this.tutorialCompleting = true;
    this.tutorialNextButton?.setAttribute('disabled', 'disabled');
    this.tutorialBackButton?.setAttribute('disabled', 'disabled');
    this.tutorialSkipButton?.setAttribute('disabled', 'disabled');
    if (!this._sendProfileAction('tutorial-complete', { skipped: Boolean(skipped) })) {
      this.tutorialCompleting = false;
      this._renderTutorialStep();
      if (this.tutorialProgress) {
        this.tutorialProgress.textContent = 'Unable to reach server. Try again once reconnects.';
      }
    }
  }

  _closeTutorial(force = false) {
    if (!this.tutorialOverlay) return;
    this.tutorialOverlay.hidden = true;
    this.tutorialActive = false;
    this.tutorialCompleting = false;
    this.tutorialNextButton?.removeAttribute('disabled');
    this.tutorialBackButton?.removeAttribute('disabled');
    this.tutorialSkipButton?.removeAttribute('disabled');
    if (force && this.tutorialProgress) {
      this.tutorialProgress.textContent = '';
    }
  }

  _handleProfileEvent(data) {
    const event = data?.event;
    if (!event) return;
    if (event === 'error') {
      if (data.field === 'name' && this.heroNameFeedback) {
        this.heroNameFeedback.textContent = data.message || 'Name rejected. Try another variation.';
        this.heroNameFeedback.style.color = '#fca5a5';
        this.heroNameSubmitButton?.removeAttribute('disabled');
        this.pendingNameRequest = false;
      } else if (data.field === 'pvp' && this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = data.message || 'Unable to change PvP status right now.';
        this.settingsFeedbackEl.style.color = '#fca5a5';
        this.settingsPvpPending = false;
        this._updateSettingsState();
      } else if (data.field === 'tutorial' && this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = data.message || 'Tutorial reset failed.';
        this.settingsFeedbackEl.style.color = '#fca5a5';
        this.settingsTutorialPending = false;
        this._updateSettingsState();
      } else if (this.adminFeedbackEl) {
        this.adminFeedbackEl.textContent = data.message || 'Profile action failed.';
        this.adminFeedbackEl.style.color = '#fca5a5';
      }
      return;
    }

    if (event === 'name-set') {
      this.pendingNameRequest = false;
      this.heroNameSubmitButton?.removeAttribute('disabled');
      if (this.heroNameFeedback) {
        this.heroNameFeedback.textContent = 'Name saved!';
        this.heroNameFeedback.style.color = '#bbf7d0';
      }
      this._applyProfileSnapshot({ name: data.name });
      setTimeout(() => {
        this._hideOnboarding(true);
        if (!this.profileMeta?.tutorialCompleted) {
          this._startTutorialFlow(true);
        }
      }, 1200);
      return;
    }

    if (event === 'pvp-updated') {
      this.settingsPvpPending = false;
      this._applyProfileSnapshot({
        pvpOptIn: Boolean(data.pvpOptIn),
        pvpCooldownEndsAt: Number(data.cooldownEndsAt) || 0,
        pvpLastCombatAt: Number(data.lastCombatAt) || 0,
      });
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = data.message || (data.pvpOptIn ? 'PvP enabled.' : 'PvP disabled.');
        this.settingsFeedbackEl.style.color = '#bbf7d0';
      }
      this._updateSettingsState();
      return;
    }

    if (event === 'tutorial-reset') {
      this.settingsTutorialPending = false;
      this._applyProfileSnapshot({ tutorialCompleted: false });
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = data.message || 'Tutorial reset. Walk through the steps again when ready!';
        this.settingsFeedbackEl.style.color = '#bbf7d0';
      }
      this._startTutorialFlow(true);
      return;
    }

    if (event === 'tutorial-complete') {
      this._applyProfileSnapshot({ tutorialCompleted: true });
      this._closeTutorial();
      if (this.messageEl) {
        this.messageEl.textContent = data.safeZone ? 'Safe zone unlocked!' : 'Tutorial complete!';
        this.messageEl.hidden = false;
        setTimeout(() => {
          this.messageEl.hidden = true;
        }, 2400);
      }
      return;
    }

    if (event === 'refresh') {
      this._applyProfileSnapshot(data.profile || {});
      this._maybeStartOnboardingFlow(true);
    }
  }

  _handleAdminEvent(data) {
    const { event } = data || {};
    if (!event) return;
    if (event === 'profiles') {
      this.adminProfiles = Array.isArray(data.profiles) ? data.profiles : [];
      this.adminSafeZone = data.safeZone || null;
      if (this.adminStatusEl) {
        const count = this.adminProfiles.length;
        if (this.adminSafeZone) {
          const { x, y, radius } = this.adminSafeZone;
          this.adminStatusEl.textContent = `Profiles: ${count} • Safe Zone (${x?.toFixed?.(1) ?? '─'}, ${y?.toFixed?.(1) ?? '─'}) r=${radius?.toFixed?.(1) ?? '─'}`;
        } else {
          this.adminStatusEl.textContent = `Profiles: ${count}`;
        }
      }
      this._renderAdminProfiles();
      return;
    }

    if (event === 'ok') {
      if (this.adminFeedbackEl) {
        const label = data.command ? data.command.replace(/-/g, ' ') : 'Action';
        this.adminFeedbackEl.textContent = `${label} applied.`;
        this.adminFeedbackEl.style.color = '#bbf7d0';
      }
      return;
    }

    if (event === 'error' && this.adminFeedbackEl) {
      this.adminFeedbackEl.textContent = data.message || 'Admin command failed.';
      this.adminFeedbackEl.style.color = '#fca5a5';
    }
  }

  _handleControlEvent(data) {
    const { event } = data || {};
    if (!event) return;
    if (event === 'auth-required') {
      const policy = data?.policy || {};
      this.authPolicy = {
        passwordMinLength: Number(policy.passwordMinLength) || PASSWORD_MIN_LENGTH,
        passwordMaxLength: Number(policy.passwordMaxLength) || PASSWORD_MAX_LENGTH,
      };
      this.sessionToken = null;
      this._clearStoredSessionToken();
      this._updateSignOutVisibility();
      this._updateAuthDescription();
      this.authPending = false;
      this.legacyPending = false;
      this._setAuthFormDisabled(false);
      this._setLegacyFormDisabled(false);
      this._setAuthFeedback('', 'info');
      this._setLegacyFeedback('', 'info');
      this._showAuthOverlay(this.accountName || '');
  this._hideIdentityOverlay();
      this._hideLegacyOverlay();
      this._hideAccountOverlay(false);
      if (this.messageEl) {
        this.messageEl.textContent = 'Sign in to continue your adventure.';
        this.messageEl.hidden = false;
      }
      return;
    }
    if (event === 'auth-error') {
      const field = data?.field;
      const message = data?.message || 'Authentication failed.';
      this.authPending = false;
      this.legacyPending = false;
      this._setAuthFormDisabled(false);
      this._setLegacyFormDisabled(false);
      if (field === 'profile') {
        this._showLegacyOverlay(this.legacyInput?.value || this.profileId || '');
        this._setLegacyFeedback(message, 'error');
        this.legacyInput?.focus();
      } else {
        const preset = this.authAccountInput?.value?.trim?.() || this.accountName || '';
        this._showAuthOverlay(preset);
        this._setAuthFeedback(message, 'error');
        if (field === 'password') {
          this.authPasswordInput?.focus();
        } else {
          this.authAccountInput?.focus();
        }
      }
      return;
    }
    if (event === 'forced-logout') {
      this._clearStoredProfileId();
      this.profileId = null;
      this.pendingProfileId = null;
      this.sessionToken = null;
      this._clearStoredSessionToken();
      this._updateSignOutVisibility();
      this._hideIdentityOverlay();
      this._showAuthOverlay(this.accountName || '');
      this._showTransientMessage(data.reason || 'Disconnected by server.', 4200);
      return;
    }
    if (event === 'teleport-safe') {
      this._showTransientMessage('Teleported to the safe zone by an admin.', 2800);
      return;
    }
    if (event === 'connection-rejected') {
      this._clearStoredProfileId();
      this.profileId = null;
      this.pendingProfileId = null;
      this.sessionToken = null;
      this._clearStoredSessionToken();
      this._updateSignOutVisibility();
      this._hideIdentityOverlay();
      this._showAuthOverlay(this.accountName || '');
      this._showTransientMessage(data.reason || 'Connection rejected.', 4200);
    }
  }

  _handleAdminToggle() {
    if (!this.profileMeta?.isAdmin) return;
    if (this.adminOverlay?.hidden === false) {
      this._closeAdminPanel();
    } else {
      this._openAdminPanel();
    }
  }

  _handleAdminClose() {
    this._closeAdminPanel();
  }

  _openAdminPanel() {
    if (!this.profileMeta?.isAdmin || !this.adminOverlay) return;
    this.adminOverlay.hidden = false;
    this.adminPanelOpen = true;
    if (this.adminFeedbackEl) {
      this.adminFeedbackEl.textContent = '';
      this.adminFeedbackEl.style.color = '#bae6fd';
    }
    if (this.adminStatusEl) {
      this.adminStatusEl.textContent = 'Fetching hero profiles...';
    }
    this._requestAdminProfiles();
  }

  _closeAdminPanel(silent = false) {
    if (!this.adminOverlay) return;
    this.adminOverlay.hidden = true;
    this.adminPanelOpen = false;
  this.settingsPanelOpen = false;
    if (!silent && this.adminFeedbackEl) {
      this.adminFeedbackEl.textContent = '';
    }
  }

  _requestAdminProfiles() {
    if (!this.profileMeta?.isAdmin) return;
    this._sendAdminCommand('list');
  }

  _handleAdminRefresh() {
    if (this.profileMeta?.isAdmin) {
      this._requestAdminProfiles();
    }
  }

  _escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char] || char));
  }

  _formatNumber(value) {
    if (!Number.isFinite(value)) return '0';
    try {
      return Number(value).toLocaleString();
    } catch (err) {
      return String(Math.floor(value));
    }
  }

  _renderAdminProfiles() {
    if (!this.adminContentEl) return;
    if (!Array.isArray(this.adminProfiles) || !this.adminProfiles.length) {
      this.adminContentEl.innerHTML = '<p>No hero profiles yet. Invite players to explore!</p>';
      return;
    }
    const html = this.adminProfiles.map((profile) => this._renderAdminProfile(profile)).join('');
    this.adminContentEl.innerHTML = html;
  }

  _renderAdminProfile(profile) {
    const profileId = typeof profile?.id === 'string' ? profile.id : '';
  const xp = profile?.xp || { melee: 0, ranged: 0, magic: 0 };
  const meleeXp = Number.isFinite(xp.melee) ? xp.melee : 0;
  const rangedXp = Number.isFinite(xp.ranged) ? xp.ranged : 0;
  const magicXp = Number.isFinite(xp.magic) ? xp.magic : 0;
    const stats = profile?.stats || {};
    const inventoryCoins = profile?.inventory?.currency ?? 0;
    const bankCoins = profile?.bank?.currency ?? 0;
    const badges = [];
    badges.push(profile.online ? 'Online' : 'Offline');
    if (profile.admin) badges.push('Admin');
    if (profile.banned) badges.push('Banned');
  badges.push(profile.pvpOptIn ? 'PvP on' : 'PvP off');
    badges.push(profile.tutorialCompleted ? 'Tutorial done' : 'Needs tutorial');
    const badgeHtml = badges
      .map((label) => `<span>${this._escapeHtml(label)}</span>`)
      .join('');
    const onlineDisabled = profile.online ? '' : 'disabled';
    const bannedAttr = profile.banned ? 'true' : 'false';
    const adminAttr = profile.admin ? 'true' : 'false';
    const tutorialAttr = profile.tutorialCompleted ? 'true' : 'false';
    const slug = profileId ? profileId.replace(/[^a-zA-Z0-9_-]/g, '').slice(-8) || 'hero' : 'hero';
    const renameLabelId = `admin-${slug}-rename`;
    const xpLabelId = `admin-${slug}-xp`;
    const currencyLabelId = `admin-${slug}-currency`;
    const actionsLabelId = `admin-${slug}-actions`;
    const position = profile?.position
      ? `(${profile.position.x?.toFixed?.(1) ?? '─'}, ${profile.position.y?.toFixed?.(1) ?? '─'})`
      : 'Unknown';
    return `
      <div class="admin-profile" data-profile-id="${this._escapeHtml(profileId)}">
        <header>
          <span>${this._escapeHtml(profile.name || 'Unnamed Hero')}</span>
          <span>${this._escapeHtml(profileId.slice(0, 12))}</span>
        </header>
        <div class="admin-flags">${badgeHtml}</div>
        <div class="admin-details">
          <div>Stats — STR ${this._formatNumber(stats.strength ?? 0)}, DEX ${this._formatNumber(stats.dexterity ?? 0)}, INT ${this._formatNumber(stats.intellect ?? 0)}</div>
          <div>XP — Melee ${this._formatNumber(meleeXp)}, Ranged ${this._formatNumber(rangedXp)}, Magic ${this._formatNumber(magicXp)}</div>
          <div>Coins — Inventory ${this._formatNumber(inventoryCoins)}, Bank ${this._formatNumber(bankCoins)}</div>
          <div>Location — ${this._escapeHtml(position)}</div>
        </div>
        <div class="admin-field">
          <span class="admin-field-label" id="${renameLabelId}">Rename Hero</span>
          <div class="admin-actions" role="group" aria-labelledby="${renameLabelId}">
            <input type="text" maxlength="24" data-admin-input="hero-name" placeholder="Hero name"
              aria-label="Hero name" value="${this._escapeHtml(profile.name || '')}" />
            <button type="button" data-admin-action="set-name" aria-label="Save hero name">Save Name</button>
          </div>
        </div>
        <div class="admin-field">
          <span class="admin-field-label" id="${xpLabelId}">Adjust Experience</span>
          <div class="admin-actions" role="group" aria-labelledby="${xpLabelId}">
            <input type="number" min="0" data-admin-input="xp-melee" placeholder="Melee XP"
              aria-label="Melee experience" value="${meleeXp}" />
            <input type="number" min="0" data-admin-input="xp-ranged" placeholder="Ranged XP"
              aria-label="Ranged experience" value="${rangedXp}" />
            <input type="number" min="0" data-admin-input="xp-magic" placeholder="Magic XP"
              aria-label="Magic experience" value="${magicXp}" />
            <button type="button" data-admin-action="set-xp" aria-label="Save experience values">Save Stats</button>
          </div>
        </div>
        <div class="admin-field">
          <span class="admin-field-label" id="${currencyLabelId}">Adjust Currency</span>
          <div class="admin-actions" role="group" aria-labelledby="${currencyLabelId}">
            <input type="number" data-admin-input="grant-inventory" placeholder="Inventory delta"
              aria-label="Inventory currency adjustment" value="0" />
            <input type="number" data-admin-input="grant-bank" placeholder="Bank delta"
              aria-label="Bank currency adjustment" value="0" />
            <button type="button" data-admin-action="grant-currency" aria-label="Apply currency changes">Apply Currency</button>
          </div>
        </div>
        <div class="admin-field">
          <span class="admin-field-label" id="${actionsLabelId}">Admin Actions</span>
          <div class="admin-actions" role="group" aria-labelledby="${actionsLabelId}">
            <button type="button" data-admin-action="teleport-safe" ${onlineDisabled} aria-label="Teleport hero to safe zone">Teleport Safe</button>
            <button type="button" data-admin-action="kick" ${onlineDisabled} aria-label="Force hero logout">Force Logout</button>
            <button type="button" data-admin-action="toggle-ban" data-current="${bannedAttr}" aria-label="${profile?.banned ? 'Unban hero' : 'Ban hero'}">${profile?.banned ? 'Unban' : 'Ban'}</button>
            <button type="button" data-admin-action="toggle-admin" data-current="${adminAttr}" aria-label="${profile?.admin ? 'Revoke admin status' : 'Grant admin status'}">${profile?.admin ? 'Revoke Admin' : 'Grant Admin'}</button>
            <button type="button" data-admin-action="toggle-tutorial" data-current="${tutorialAttr}" aria-label="${profile?.tutorialCompleted ? 'Reset tutorial progress' : 'Mark tutorial complete'}">${profile?.tutorialCompleted ? 'Reset Tutorial' : 'Mark Tutorial Done'}</button>
          </div>
        </div>
      </div>
    `;
  }

  _handleAdminContentClick(event) {
    const button = event.target.closest('[data-admin-action]');
    if (!button || !this.adminContentEl?.contains(button)) return;
    const action = button.dataset.adminAction;
    const card = button.closest('[data-profile-id]');
    if (!card) return;
    const profileId = card.dataset.profileId;
    if (!profileId) return;
    event.preventDefault();
    if (this.adminFeedbackEl) {
      this.adminFeedbackEl.textContent = '';
      this.adminFeedbackEl.style.color = '#bae6fd';
    }

    if (action === 'set-xp') {
      const melee = Number(card.querySelector('[data-admin-input="xp-melee"]')?.value ?? 0);
      const ranged = Number(card.querySelector('[data-admin-input="xp-ranged"]')?.value ?? 0);
      const magic = Number(card.querySelector('[data-admin-input="xp-magic"]')?.value ?? 0);
      if ([melee, ranged, magic].some((value) => !Number.isFinite(value) || value < 0)) {
        if (this.adminFeedbackEl) {
          this.adminFeedbackEl.textContent = 'XP values must be non-negative numbers.';
          this.adminFeedbackEl.style.color = '#fca5a5';
        }
        return;
      }
      this._sendAdminCommand('set-xp', {
        profileId,
        xp: {
          melee,
          ranged,
          magic,
        },
      });
      return;
    }

    if (action === 'set-name') {
      const input = card.querySelector('[data-admin-input="hero-name"]');
      const newName = input ? input.value.trim() : '';
      this._sendAdminCommand('set-meta', { profileId, meta: { name: newName } });
      return;
    }

    if (action === 'grant-currency') {
      const inventoryDelta = Number(card.querySelector('[data-admin-input="grant-inventory"]')?.value ?? 0);
      const bankDelta = Number(card.querySelector('[data-admin-input="grant-bank"]')?.value ?? 0);
      if (!inventoryDelta && !bankDelta) {
        if (this.adminFeedbackEl) {
          this.adminFeedbackEl.textContent = 'Set a positive or negative amount to adjust.';
          this.adminFeedbackEl.style.color = '#fca5a5';
        }
        return;
      }
      this._sendAdminCommand('grant-currency', { profileId, inventoryDelta, bankDelta });
      return;
    }

    if (action === 'teleport-safe') {
      this._sendAdminCommand('teleport-safe', { profileId });
      return;
    }

    if (action === 'kick') {
      this._sendAdminCommand('kick', { profileId });
      return;
    }

    if (action === 'toggle-ban') {
      const current = button.dataset.current === 'true';
      this._sendAdminCommand('set-meta', { profileId, meta: { banned: !current } });
      return;
    }

    if (action === 'toggle-admin') {
      const current = button.dataset.current === 'true';
      this._sendAdminCommand('set-meta', { profileId, meta: { admin: !current } });
      return;
    }

    if (action === 'toggle-tutorial') {
      const current = button.dataset.current === 'true';
      this._sendAdminCommand('set-meta', { profileId, meta: { tutorialCompleted: !current } });
    }
  }

    _handleSettingsToggle() {
      if (!this.settingsOverlay) return;
      if (this.settingsOverlay.hidden === false) {
        this._closeSettingsPanel();
      } else {
        this._openSettingsPanel();
      }
    }

    _handleSettingsClose() {
      this._closeSettingsPanel();
    }

    _openSettingsPanel() {
      if (!this.settingsOverlay) return;
      this.settingsOverlay.hidden = false;
      this.settingsPanelOpen = true;
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = '';
        this.settingsFeedbackEl.style.color = '#bae6fd';
      }
      this._updateSettingsState();
    }

    _closeSettingsPanel() {
      if (!this.settingsOverlay) return;
      this.settingsOverlay.hidden = true;
      this.settingsPanelOpen = false;
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = '';
      }
    }

    _handleSettingsPvpToggle() {
      const nextEnabled = !Boolean(this.profileMeta?.pvpOptIn);
      if (!this._sendProfileAction('toggle-pvp', { enabled: nextEnabled })) {
        if (this.settingsFeedbackEl) {
          this.settingsFeedbackEl.textContent = 'Connection unavailable. Retry in a moment.';
          this.settingsFeedbackEl.style.color = '#fca5a5';
        }
        return;
      }
      this.settingsPvpPending = true;
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = nextEnabled ? 'Enabling PvP...' : 'Requesting PvP disable...';
        this.settingsFeedbackEl.style.color = '#bae6fd';
      }
      this._updateSettingsState();
    }

    _handleSettingsResetTutorial() {
      if (!this._sendProfileAction('reset-tutorial')) {
        if (this.settingsFeedbackEl) {
          this.settingsFeedbackEl.textContent = 'Unable to reach server. Try again shortly.';
          this.settingsFeedbackEl.style.color = '#fca5a5';
        }
        return;
      }
      this.settingsTutorialPending = true;
      if (this.settingsFeedbackEl) {
        this.settingsFeedbackEl.textContent = 'Resetting tutorial...';
        this.settingsFeedbackEl.style.color = '#bae6fd';
      }
      this._updateSettingsState();
    }

    _updateSettingsState() {
      const meta = this.profileMeta || {};
      const now = Date.now();
      const pvpEnabled = Boolean(meta.pvpOptIn);
      const cooldownEndsAt = Number(meta.pvpCooldownEndsAt) || 0;
      const remainingMs = Math.max(0, cooldownEndsAt - now);
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      if (this.settingsPvpStatusEl) {
        let text = pvpEnabled
          ? 'PvP is currently ENABLED. You can both deal and receive player damage.'
          : 'PvP is currently DISABLED. Other heroes cannot damage you.';
        if (remainingMs > 0 && pvpEnabled) {
          text += ` You can disable PvP in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`;
        }
        this.settingsPvpStatusEl.textContent = text;
      }

      if (this.settingsPvpToggleButton) {
        this.settingsPvpToggleButton.textContent = pvpEnabled ? 'Disable PvP' : 'Enable PvP';
        if ((pvpEnabled && remainingMs > 0) || this.settingsPvpPending) {
          this.settingsPvpToggleButton.setAttribute('disabled', 'disabled');
        } else {
          this.settingsPvpToggleButton.removeAttribute('disabled');
        }
      }

      if (this.settingsResetTutorialButton) {
        if (this.settingsTutorialPending) {
          this.settingsResetTutorialButton.setAttribute('disabled', 'disabled');
        } else {
          this.settingsResetTutorialButton.removeAttribute('disabled');
        }
      }
    }

  _sendAdminCommand(command, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (this.adminFeedbackEl) {
        this.adminFeedbackEl.textContent = 'Socket offline. Reconnect to manage the server.';
        this.adminFeedbackEl.style.color = '#fca5a5';
      }
      return;
    }
    try {
      this.socket.send(
        JSON.stringify({
          type: 'admin',
          command,
          ...payload,
        })
      );
      if (this.adminFeedbackEl) {
        this.adminFeedbackEl.textContent = 'Sending command...';
        this.adminFeedbackEl.style.color = '#bae6fd';
      }
    } catch (err) {
      if (this.adminFeedbackEl) {
        this.adminFeedbackEl.textContent = 'Failed to send command.';
        this.adminFeedbackEl.style.color = '#fca5a5';
      }
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
    this._evaluateCompactLayout();
    this._syncCompactOverlayVisibility();
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
    this._evaluateCompactLayout();
    this._syncCompactOverlayVisibility();
  }

  _handleGlobalPointerDown(event) {
    if (this._isTouchLike(event)) {
      this.detectedTouch = true;
      this._enableTouchControls();
    }
    this._evaluateCompactLayout();
    this._syncCompactOverlayVisibility();
  }

  _isTouchLike(event) {
    if (!event) return false;
    const type = event.pointerType;
    return type === 'touch' || type === 'pen' || type === '' || type === undefined;
  }

  _isEditableTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const type = (target.type || '').toLowerCase();
      const bypass = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']);
      return !bypass.has(type);
    }
    return false;
  }

  _shouldIgnoreGlobalKey(event) {
    if (!event) return false;
    const target = event.target;
    const isChatInput = (node) => node === this.chatInput;

    const checkNode = (node) => {
      if (!node) return false;
      if (isChatInput(node)) {
        return false;
      }
      return this._isEditableTarget(node);
    };

    if (checkNode(target)) {
      return true;
    }

    const path = typeof event.composedPath === 'function' ? event.composedPath() : null;
    if (Array.isArray(path)) {
      for (const node of path) {
        if (isChatInput(node)) {
          return false;
        }
        if (this._isEditableTarget(node)) {
          return true;
        }
      }
    }

    const active = (this.shadowRoot && this.shadowRoot.activeElement) || (typeof document !== 'undefined' ? document.activeElement : null);
    if (checkNode(active)) {
      return true;
    }

    if (isChatInput(target) || (Array.isArray(path) && path.includes(this.chatInput)) || checkNode(this.chatInput)) {
      return false;
    }

    return false;
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

  _computeChargeState(localPlayer) {
    const serverCharging = Boolean(localPlayer?.charging);
    const localCharging = Boolean(this.activeAction);
    if (!serverCharging && !localCharging) {
      return null;
    }

    let ratio = serverCharging ? Math.max(0, Math.min(1, localPlayer?.chargeRatio ?? 0)) : 0;
    if (localCharging) {
      const baseCharge = this.localBonuses?.maxCharge ?? 0.5;
      const clampedBase = Math.max(0.5, Math.min(5, baseCharge));
      const maxDuration = Math.max(0.1, (clampedBase + CHARGE_TIME_BONUS) * 1000);
      const start = Number.isFinite(this.actionStart) ? this.actionStart : 0;
      const elapsed = start > 0 ? Date.now() - start : 0;
      const localRatio = Math.max(0, Math.min(1, maxDuration > 0 ? elapsed / maxDuration : 0));
      if (localRatio > ratio) {
        ratio = localRatio;
      }
    }

    if (ratio <= 0.0005) {
      return null;
    }

    let kind = localPlayer?.actionKind || this.activeAction || 'default';
    if (typeof kind !== 'string' || !kind) {
      kind = 'default';
    }

    let direction = null;
    if (localCharging && this.activeActionAim) {
      direction = this.activeActionAim;
    } else if (serverCharging && localPlayer?.actionAim) {
      direction = localPlayer.actionAim;
    } else if (serverCharging && localPlayer?.aim) {
      direction = localPlayer.aim;
    } else if (serverCharging && Number.isFinite(localPlayer?.aimX) && Number.isFinite(localPlayer?.aimY)) {
      direction = this._normalize({ x: localPlayer.aimX, y: localPlayer.aimY });
    }
    if (!direction) {
      direction = this._normalize(this.pointerAim || { x: 1, y: 0 });
    }
    const glow = CHARGE_GLOW_STYLE[kind] || CHARGE_GLOW_STYLE.default;
    const colorVec = this._cssColorToVec3(glow.stroke, [0.64, 0.76, 0.98]);

    return {
      active: true,
      ratio,
      kind,
      direction,
      color: colorVec,
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
    if (this.minimapFloating && this.minimapFloatPosition) {
      this._applyMinimapFloatPosition(this.minimapFloatPosition.left, this.minimapFloatPosition.top);
    }
    this._evaluateCompactLayout();
    this._syncCompactOverlayVisibility();
    this._syncMapOverlaySize();
  }
}

customElements.define('game-app', GameApp);

