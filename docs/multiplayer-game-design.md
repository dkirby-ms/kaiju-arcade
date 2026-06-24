# Multiplayer Game Design — Kaiju vs. Command

> Status: Draft / concept. Asymmetric real-time multiplayer evolution of the
> Apex Dynamics Response Systems command-center prototype.

## 1. Concept

An asymmetric multiplayer game built on the existing command-center prototype.
The current dashboard (`CommandMap`, `LeviathanRoster`, `DispatchPanel`,
`SignalFeed`) becomes the **Incident Commander's** screen. A new lightweight
client gives each **Kaiju** player control of a single leviathan advancing on
the city.

- **1 Incident Commander** (human) — coordinates response assets to eliminate
  every kaiju before the city base falls.
- **N Kaiju players** (humans, ~1–4) — each pilots one leviathan toward the
  **city base** and attacks it. They win collectively by destroying the base.

The fantasy is the **information/force asymmetry**: the Commander sees
everything and coordinates, but acts only indirectly through dispatched assets
with delay and uncertainty. The Kaiju have raw power and initiative but are
individually fragile and must coordinate timing and targets.

## 2. Arcade Identity & Aesthetic

The aesthetic is a quarter-muncher from an alternate 1993 where kaiju attacks were a municipal planning problem — not a polished esports title. The information asymmetry should *feel* visceral, not just mechanical.

### 2.1 Commander display

The existing vector-graphics dashboard is already close to the right aesthetic. Codify it:

* Phosphor glow and CRT scan-line overlay on the map and feed panels.
* Monochrome palette: amber-on-black for nominal state, green for success, red for threat. No pastel gradients.
* All text uppercase and condensed — `THREAT LEVEL DELTA`, `ASSET DEPLETED`, `VECTOR ACQUIRED`.
* Typewriter/teletype effect on `SignalFeed` entries; blinking block cursor between updates.
* Radar sweep animation on `CommandMap` when a new leviathan is detected.

### 2.2 Kaiju display

New minimal mobile client to match the cabinet energy:

* Bold silhouette view: kaiju as a chunky vector shape advancing on a city skyline rendered in flat neon outlines.
* HP as a segmented bar with flicker when hit; screen shakes on heavy impact and when the city base takes damage.
* Ability buttons styled as chunky arcade panel inputs with cooldown fill animations.

### 2.3 INSERT COIN — the continue system

The continue system is the defining arcade mechanic. It gives kaiju players drama on elimination and a meaningful decision, while handing the Commander a brief window to press the advantage.

* Each kaiju player starts with **3 credits** (`CREDIT_COUNT`, configurable).
* When kaiju HP reaches 0 → `CONTAINED` event fires. The kaiju silhouette shatters. `CONTAINED` stencils across the screen in red.
* **INSERT COIN** flashes at 2 Hz with a coin-drop sound cue. A 10-second countdown begins (`CONTINUE_WINDOW_MS = 10000`).
* Pressing continue within the window deducts one credit and respawns the kaiju at the map edge with `RESPAWN_HP_FRACTION` (default `0.6`) of max HP.
* If the countdown expires or credits are exhausted, the slot transitions to AI control (`tickLeviathans`) and the player enters spectator view labelled **GAME OVER — PLAYER N**.
* Credit count renders as coin icons in the kaiju HUD; losing the last one triggers a full-screen **GAME OVER** overlay before the spectator transition.
* The Commander sees a `SignalFeed` entry on respawn: `KAIJU [NAME] RESPAWNING — CREDIT USED`.

### 2.4 Score & combos

* Commander earns score for each successful mitigation.
* Chaining mitigations on multiple distinct kaiju within 5 seconds triggers a **THREAT NEUTRALIZED ×N** combo display with multiplier.
* Final score and combo peak appear on `LastStandScene`.

### 2.5 Attract mode

If the lobby is idle for 30 seconds, replay the last match tick-log as a silent demo loop on the Commander screen with a **PRESS START / INSERT COIN** overlay pulsing at center.

## 3. Win / Loss Conditions

| Condition | Trigger | Outcome |
| --- | --- | --- |
| Kaiju victory | City base HP reaches 0 | Kaiju team wins |
| Commander victory | All kaiju `status === 'CONTAINED'` (HP 0) | Commander wins |
| Time-limit (optional) | Round timer expires with base alive | Commander wins (city survived) |
| Indeterminate | Disconnect / abort | No result; maps to existing "Scenario Closure" outcome class |

This reuses the PRD backlog item **FR-009 Scenario Closure** (run completion
criteria, outcome class, summary artifact) from issue #1.

## 4. Roles & Mechanics

### 4.1 Incident Commander
Drives the existing dashboard, largely unchanged in spirit:
- Selects a target leviathan (`selectedId`) and deploys assets via
  `dispatchUnit(name)`.
- Assets and capacities reuse `INITIAL_DISPATCH`:
  `Scramble Jets`, `Deploy Mechs`, `Raise Barrier`, `Evac Sector`.
- Each dispatch becomes a `CommandRecord` resolved asynchronously by
  `resolveMitigation(...)` — success/partial/failed/unverified with a
  1–5s delay. This **delay + uncertainty is the Commander's core handicap**
  and is preserved as-is.
- `Raise Barrier` should also reduce incoming **base damage** for a window
  (new effect; today it only contributes knockback).
- `Evac Sector` reduces civilian-casualty score but yields no knockback
  (already modeled: `ASSET_KNOCKBACK['Evac Sector'] = 0`).

### 4.2 Kaiju player
A new minimal client (mobile-friendly). Each kaiju controls one `Leviathan`:
- **Move** — set/adjust `heading` toward the base; advance along an inbound
  track (today's `from`/`to`/`range`/`speed` already model this).
- **Attack base** — when within attack range of the base, deal damage to
  base HP on a cooldown.
- **Ability** (archetype-flavored) — e.g. *Submerge* (`SUBMERGED` status →
  harder to target, `statusAdjustment = 0.6`), *Surface charge*, *Roar*
  (buffs nearby kaiju). Abilities exploit the existing
  `statusAdjustment`/`severityAdjustment` levers.
- **Damage feedback** — successful Commander mitigations apply `repel`
  (knockback) and reduce kaiju `hp`; at `hp <= 0` the kaiju triggers the
  **INSERT COIN** continue flow (see Section 2.3).
- **Credits** — each player starts with `CREDIT_COUNT` credits. Continuing
  respawns the kaiju at the map edge; credits exhausted → spectator mode.

### 4.3 Shared world
- **City base** — new entity with `hp`/`hpMax`, position, attack radius.
  Anchored on the existing map (`lastStandCities` provides candidate cities).
- **Leviathans** — promoted from mock-generated (`createRoster()`) to
  **player-controlled**, but the `Leviathan` shape is unchanged. AI fills any
  unclaimed kaiju slots (reuse `tickLeviathans`).

## 5. Asymmetry & Balancing Levers

Existing tunables already provide most of the knobs:

| Lever | Source | Effect |
| --- | --- | --- |
| Asset base success | `ASSET_BASE_SUCCESS` | Commander power |
| Severity penalty | `severityAdjustment` | Stronger kaiju are harder to stop |
| Proximity penalty | `proximityAdjustment` | Near-base kaiju are very hard to repel (0.4) → rewards Kaiju pushing in |
| Status penalty | `statusAdjustment` | `SUBMERGED` evasion is a real ability |
| Repeated-use penalty | `repeatedUsePenalty` | Discourages spamming one asset |
| Resolution delay | `ASSET_DELAY` | Commander reaction lag |
| Knockback | `ASSET_KNOCKBACK` / `repel` | Pushback vs. kaiju advance |
| Capacity | `INITIAL_DISPATCH` | Commander economy |

New levers to add: base HP/`hpMax`, kaiju attack damage + cooldown, kaiju
ability cooldowns, round timer, `CREDIT_COUNT`, `CONTINUE_WINDOW_MS`,
`RESPAWN_HP_FRACTION`.

## 6. Architecture

Today everything is client-side mock (`useCommandState`, `seedrandom`). True
multiplayer uses **Colyseus v0.17** as the authoritative game server — its
`Room`/`Schema` model maps cleanly onto the match structure.

```
                 ┌────────────────────────────────────────────┐
                 │   Colyseus Game Server (Node.js 22 LTS)     │
                 │   MatchRoom extends Room<MatchSchema>        │
                 │   - onCreate: seed world, start tick loop   │
                 │   - onJoin: assign role / claim kaiju slot  │
                 │   - onMessage: validate & enqueue intents   │
                 │   - onLeave: slot → AI fallback             │
                 │   setSimulationInterval(tick, 200ms / 5 Hz) │
                 └───────────────────┬────────────────────────┘
                                     │ Colyseus WebSocket transport
        ┌────────────────────────────┼──────────────────────────────┐
        │                            │                              │
 ┌──────▼──────┐              ┌──────▼───────┐              ┌───────▼───────┐
 │  Commander  │              │  Kaiju #1    │     ...      │   Kaiju #N    │
 │  dashboard  │              │  controller  │              │  controller   │
 │  (Colyseus  │              │  (Colyseus   │              │  (Colyseus    │
 │   client)   │              │   client)    │              │   client)     │
 └─────────────┘              └──────────────┘              └───────────────┘
```

- **`MatchRoom extends Room<MatchSchema>`** — Colyseus `@Schema` / `@type`
  decorators on `MatchSchema` replace manual snapshot diffs; the framework
  patches only changed fields over the wire automatically.
- **Tick loop**: `this.setSimulationInterval(tick, 200)` — 5 Hz server tick
  drives world state. Kaiju position lerps client-side between ticks for
  visual smoothness; the Commander dashboard updates panels on each patch.
- **Room lifecycle**:
  - `onCreate(options)` — seed `MatchSchema`, start tick, set
    `this.maxClients = 5` (1 commander + 4 kaiju).
  - `onJoin(client, options)` — assign role from `options.role`; if `'kaiju'`,
    claim the first unclaimed `Leviathan` slot and initialise
    `credits = CREDIT_COUNT`.
  - `onMessage` handlers — validate intent messages, enqueue for next tick.
  - `onLeave(client, consented)` — if a kaiju disconnected mid-match with
    credits remaining and `consented === false`, hold the slot for a 30s
    reconnect grace window before handing to AI.
- **Matchmaking**: `matchMakeById(roomId, {})` for share-code lobbies (first
  cut); `client.joinOrCreate('match', { role })` for open matchmaking later.
- **Shared model**: extract `types.ts`, `severity.ts`, `leviathans.ts`, and
  `mitigation-resolution.ts` into a transport-agnostic package consumed by
  both the Colyseus server and browser clients — they are already
  pure/deterministic, ideal for sharing.

### 6.1 Message types

Client → Server intents (validated server-side before applying):

| Message | Payload | Sender |
| --- | --- | --- |
| `commander.select` | `{ leviathanId \| null }` | Commander |
| `commander.dispatch` | `{ assetName, targetId? }` | Commander |
| `commander.alert` | `{ active }` | Commander |
| `kaiju.move` | `{ leviathanId, heading }` | Kaiju |
| `kaiju.attack` | `{ leviathanId }` | Kaiju |
| `kaiju.ability` | `{ leviathanId, ability }` | Kaiju |
| `kaiju.continue` | `{ leviathanId }` | Kaiju (INSERT COIN) |

Server → Client (Colyseus state patches + broadcast messages):

| Message | Payload |
| --- | --- |
| Schema patch | Auto-diffed `MatchSchema` fields |
| `state.command` | `CommandRecord` phase transitions |
| `state.signal` | `SignalEvent` for `SignalFeed` |
| `match.result` | `{ outcome, summary, commanderScore }` |
| `kaiju.contained` | `{ leviathanId, creditsRemaining }` (triggers INSERT COIN UI) |

## 7. Hosting — Azure Container Apps

The Colyseus server is a stateful WebSocket process. Azure Container Apps
(ACA) supports this with sticky sessions and KEDA-based autoscaling.

### 7.1 Container image

* `Dockerfile` — Node.js 22 LTS alpine; copies shared game logic and Colyseus
  server; exposes port 2567.
* Image stored in **Azure Container Registry (ACR)**; ACA pulls on deploy.
* A single image serves all room types — room class registration distinguishes
  match rooms from lobby rooms at runtime.

### 7.2 Session affinity

Colyseus rooms are in-process. ACA ingress sticky sessions
(`stickySessions: true`) ensure all WebSocket messages from a given client
reach the same replica for the lifetime of a match. Rooms do not migrate
between replicas — a replica failure ends in-progress matches; the INSERT COIN
respawn window limits frustration for affected kaiju players.

### 7.3 Scaling

| Rule | Trigger | Action |
| --- | --- | --- |
| Scale to zero | No active rooms for 5 min | 0 replicas (cost saving) |
| Scale up | HTTP upgrade requests > threshold | +1 replica (KEDA HTTP scaler) |
| Steady-state minimum | Scheduled match hours | ≥1 replica to avoid cold start |

### 7.4 Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `COLYSEUS_PORT` | WebSocket listen port | `2567` |
| `MATCH_TICK_MS` | Simulation interval (ms) | `200` |
| `CREDIT_COUNT` | Kaiju starting credits | `3` |
| `CONTINUE_WINDOW_MS` | INSERT COIN countdown (ms) | `10000` |
| `RESPAWN_HP_FRACTION` | HP fraction on continue (0–1) | `0.6` |
| `COLYSEUS_MONITOR_ENABLED` | Enable `/colyseus` dashboard | `false` |
| `CORS_ORIGIN` | Allowed client origins | — |

### 7.5 Colyseus Monitor

The built-in `/colyseus` dashboard is deployed alongside the server for room
inspection and debugging. It is disabled in production unless
`COLYSEUS_MONITOR_ENABLED=true`.

## 8. Data Model Deltas

Net-new on top of existing types:

```ts
interface CityBase {
  id: string
  name: string             // reuse lastStandCities
  lng: number; lat: number
  hp: number; hpMax: number
  attackRadiusKm: number   // kaiju must be within to damage
}

interface KaijuSlot {
  clientId:    string
  leviathanId: string
  credits:     number      // INSERT COIN remaining (see CREDIT_COUNT)
  score:       number      // damage dealt to base
}

interface MatchState {
  id: string
  base: CityBase
  leviathans: Leviathan[]  // player-claimed where claimedBy set
  slots: KaijuSlot[]
  commanderScore: number
  outcome?: 'kaiju' | 'commander' | 'indeterminate'
  startedAt: number
  endsAt?: number
}
```

`Leviathan` gains an optional `claimedBy?: string` (player id); unclaimed
leviathans fall back to `tickLeviathans` AI.

## 9. Reuse Map (what already exists)

| Game need | Existing asset |
| --- | --- |
| Map + threat markers | `CommandMap.tsx` |
| Kaiju roster/telemetry | `LeviathanRoster.tsx`, `types.ts` |
| Dispatch UI + economy | `DispatchPanel.tsx`, `INITIAL_DISPATCH` |
| Event log | `SignalFeed.tsx`, `feed.ts` |
| Combat resolution | `mitigation-resolution.ts` |
| Advance/knockback sim | `leviathans.ts` (`tickLeviathans`, `repel`) |
| Threat scaling | `severity.ts` |
| Candidate cities | `lastStandCities.ts` |
| End-of-round screen | `LastStandScene.tsx` |
| Backlog scaffolding | issue #1 (mission state, dispatch lifecycle, scenario closure) |

## 10. Vertical Slice (first milestone)

Smallest end-to-end playable proving the asymmetry and arcade identity:

1. Colyseus `MatchRoom` with one kaiju slot; authoritative tick at 200ms.
2. Commander dashboard wired to Colyseus state patches; dispatch resolves
   server-side.
3. One kaiju controller: move toward base + attack on cooldown.
4. INSERT COIN flow: kaiju starts with 1 credit; continue screen fires on
   containment; credits exhausted → spectator.
5. Win/loss resolved in `MatchRoom` tick; broadcast `match.result`.
6. `LastStandScene` shows result + commander score.

Deploy target: Colyseus server on Azure Container Apps; Commander and kaiju
clients as static web apps.

Defer: multiple kaiju, abilities, matchmaking/lobbies, reconnect grace window,
full score/combo system, attract mode, persistence.

## 11. Open Questions

* Kaiju count and whether the Commander seat can be co-op (multiple operators)?
* Real-time movement granularity vs. the 200ms Colyseus tick — is client-side
  position lerp sufficient, or do kaiju need a faster server tick?
* Lobby/matchmaking vs. shareable room code for a first cut?
* Are abilities per-archetype, or a shared kit?
* Persistence / leaderboards, or ephemeral matches only?
* Does INSERT COIN respawn always use the same archetype, or can the player
  pick a new one on continue? New archetype adds strategy but slows the flow.
* Azure Container Apps sticky session failure: if the hosting replica restarts
  mid-match, is match-abort + rejoin acceptable, or do we need external state
  (Redis) to support room migration?
* Should the Colyseus `MatchRoom` use a presence/Redis adapter for multi-replica
  room discovery, or is single-replica-per-room sufficient at target scale?
