# Explore RPG Prototype

A lightweight multiplayer top-down exploration sandbox built with pure Node.js, vanilla HTML/CSS, and Web Components. Players share a procedurally generated world, experiment with melee, ranged, and spell attacks, and watch their attributes grow based on playstyle.

## Features

- **Server-authoritative world** &mdash; deterministic terrain generation keeps every client in sync without external libraries.
- **WebSocket networking from scratch** &mdash; handcrafted handshake and framing using built-in `http` and `crypto` modules.
- **Adaptive progression** &mdash; actions feed strength, dexterity, and intellect, unlocking cross-attribute bonuses.
- **Charge-based combat** &mdash; hold mouse inputs to amplify melee swings, arrows, or spells.
- **Modular UI** &mdash; Web Components power the HUD, stat display, and charge meter.
- **Procedural soundtrack** &mdash; a native Web Audio score and responsive effects you can toggle on the fly.
- **Persistent heroes** &mdash; each browser stores a hero ID locally while the server tracks stats and XP for that ID.
- **Server-spawned foes** &mdash; cooperative enemy waves (including elite dungeon variants) roam the map so every hero shares the same PvE encounters.
- **Procedurally generated strongholds** &mdash; shimmering gateways whisk heroes into harder, instanced arenas brimming with tougher enemies and richer rewards.
- **Dynamic dungeon atmospherics** &mdash; animated lava pools, obsidian corridors, and exit sigils add tension without sacrificing performance.
- **Live minimap HUD** &mdash; a top-right tactical map tracks heroes, portals, and the shimmering safe zone so you always know where to head next.
- **Portal compass & collapsible minimap** &mdash; follow the HUD arrow and nearest-portals hint, or tuck the minimap away when you want an unobstructed view.
- **Ambient recovery with safe haven boosts** &mdash; health slowly returns anywhere in the wild, but stepping into the safe zone accelerates regeneration about a thousand-fold.
- **Battle Momentum streaks** &mdash; chain takedowns to ignite short-lived boosts to power, speed, and XP, all tracked right on your stat panel.
- **Touch-first controls** &mdash; a virtual joystick, ability palette, chat toggle, and quick HUD hide button keep tablets and phones fully playable without a keyboard or mouse.

## Getting started

### Prerequisites

- [Node.js 18+](https://nodejs.org/) (pure runtime, no package manager needed)

### Run the prototype

```powershell
cd e:\Code\Playgrounds\explore-rpg
node .\server\server.js
```

Open your browser at [http://localhost:8080](http://localhost:8080) and load the page in multiple tabs or devices on the same network to see multiplayer sync in action.

### Optional: run deterministic terrain self-test

```powershell
cd e:\Code\Playgrounds\explore-rpg
node .\server\server.js --self-test
```

## Controls

- **WASD** to move
- **Left click** for melee swings (strength growth)
- **Right click** for charged arrow shots (dexterity growth)
- **Space bar** or **Left + Right click together** for spellcasting (intellect growth)
- Hold any action to charge; release to unleash more powerful attacks.
- **E key** gathers nearby resources/loot or activates portals and exit sigils when you are within their glow.
- **M key or Music button** toggles the procedural soundtrack.
- **Shift + N** starts a fresh hero (copy your Hero ID first if you want to return later).
- **Minimap Toggle** button collapses or reopens the tactical map, and your choice sticks between sessions.
- Watch for the on-screen portal prompt; when it lights up, press **E** to jump through a gateway or exit a dungeon.
- Down enemies together to earn bonus XP aligned with the finishing attack type.
- Chain kills quickly to build **Battle Momentum** for stacked speed, damage, and XP bonuses before the timer expires.
- Keep an eye on the top-right minimap (or its HUD arrow when hidden): cyan rings mark the bank's safe zone, gold diamonds mark gateways, and orange dots show nearby allies.
- **Touch devices:** drag the left pad to move, tap Slash/Volley/Spell to attack (hold to overcharge), press HUD to hide or reveal the panels, and hit Interact to gather, loot, or traverse portals. Tap the minimap or music buttons in the HUD as needed, and Chat to talk.

## Save & Continue

- Your current hero ID lives in the lower-left HUD; use the **Copy ID** button to back it up.
- The game saves stats/XP to the server automatically after each action, keyed by that ID.
- To resume on another device or browser, choose **Use Hero ID**, paste the value, and reconnect.
- Want a clean slate? Remove the saved ID with **Start New Hero** (or press `Shift + N`) and a new one is minted.

## Project structure

```
server/         # Node.js server with networking & world simulation
public/
  index.html    # Web Components entry point
  styles.css    # Global look & feel
  game.js       # Browser module bootstrap
  components/   # HUD and gameplay components
README.md       # This file
```

## How it works

- **Procedural terrain** is generated via a seeded value-noise sampler so every session is identical across clients.
- **Networking** relies on a handcrafted WebSocket implementation (handshake + frame encoder/decoder) to avoid external packages.
- **Game loop** runs server-side: movement, combat, attribute updates, and effect resolution happen authoritatively.
- **Client rendering** uses a canvas-based renderer with a stateless camera, plus Web Components for UI panels.

## Next steps

- Enrich terrain with points of interest and interactive props.
- Add cooperative objectives and enemy encounters.
- Layer in audio cues and particle effects for stronger feedback.
- Harden networking (lag compensation, reconciliation) for production use.
