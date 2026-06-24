---
title: "Kaiju Arcade — Implementation Task Breakdown"
date: "2026-06-24"
---

# Kaiju Arcade — Implementation Task List

**Source**: Design Thinking Method 6 validation + detailed design spec  
**Format**: Epic > Feature > Task (for RPI agent dispatch)  
**Total Estimated Tasks**: 45+ (organized by major system)

---

## EPIC 1: Multiplayer Infrastructure & Networking

### FEATURE 1.1: Colyseus Server Setup
- [ ] **TASK 1.1.1** — Initialize Colyseus v0.17 project with TypeScript, Node.js 22 LTS
- [ ] **TASK 1.1.2** — Create `MatchSchema` (@Schema/@type decorators) for game state structure
- [ ] **TASK 1.1.3** — Implement `MatchRoom extends Room<MatchSchema>` with onCreate lifecycle
- [ ] **TASK 1.1.4** — Implement onJoin handler for role assignment (Commander vs. Kaiju)
- [ ] **TASK 1.1.5** — Implement onLeave handler with AI fallback for disconnected Kaiju

### FEATURE 1.2: Message Protocol & Validation
- [ ] **TASK 1.2.1** — Define client→server message types (commander.select, commander.dispatch, kaiju.move, kaiju.attack, kaiju.ability, kaiju.continue)
- [ ] **TASK 1.2.2** — Implement onMessage handlers for all client intents with server-side validation
- [ ] **TASK 1.2.3** — Implement server→client broadcast messages (state patches, signal events, match result, kaiju.contained)
- [ ] **TASK 1.2.4** — Implement message queueing/coalescing to handle simultaneous actions within tick window

### FEATURE 1.3: Game Loop & Tick Engine
- [ ] **TASK 1.3.1** — Implement setSimulationInterval(tick, 200ms) for 5 Hz server tick
- [ ] **TASK 1.3.2** — Implement deterministic world update function (position updates, damage resolution, state transitions)
- [ ] **TASK 1.3.3** — Implement client-side lerp for Kaiju position smoothing between server ticks
- [ ] **TASK 1.3.4** — Implement server tick profiling & timing validation (ensure consistent 200ms intervals under load)

---

## EPIC 2: Game State & Match Lifecycle

### FEATURE 2.1: Match Initialization
- [ ] **TASK 2.1.1** — Implement match creation with city base selection (from lastStandCities)
- [ ] **TASK 2.1.2** — Implement Kaiju slot allocation (up to 4 players + Commander, remainder AI)
- [ ] **TASK 2.1.3** — Implement initial Leviathan roster generation with player assignments
- [ ] **TASK 2.1.4** — Implement initial player credit assignment (CREDIT_COUNT = 3, configurable)
- [ ] **TASK 2.1.5** — Implement match start handshake (broadcast initial state to all clients)

### FEATURE 2.2: Match Outcome & Termination
- [ ] **TASK 2.2.1** — Implement win condition detection (all Kaiju contained OR city base HP ≤ 0 OR time limit expired)
- [ ] **TASK 2.2.2** — Implement match result artifact generation (outcome, summary, Commander score)
- [ ] **TASK 2.2.3** — Implement graceful match shutdown (kick clients, record stats, clean up room)
- [ ] **TASK 2.2.4** — Implement reconnect grace window (30s holdover for disconnected Kaiju with credits remaining)

### FEATURE 2.3: State Persistence & Serialization
- [ ] **TASK 2.3.1** — Extract shared game logic into transport-agnostic package (types, severity, leviathans, mitigation-resolution)
- [ ] **TASK 2.3.2** — Implement MatchSchema serialization/deserialization for state snapshots
- [ ] **TASK 2.3.3** — Implement Colyseus Monitor integration for debugging room state

---

## EPIC 3: Commander Player (Dashboard)

### FEATURE 3.1: Dashboard UI Components (Arcade Aesthetic)
- [ ] **TASK 3.1.1** — Apply CRT phosphor glow + scan-line overlay to CommandMap and feed panels
- [ ] **TASK 3.1.2** — Implement monochrome color scheme (amber-on-black nominal, green success, red threat)
- [ ] **TASK 3.1.3** — Implement uppercase condensed text for all UI labels (THREAT LEVEL DELTA, ASSET DEPLETED, VECTOR ACQUIRED)
- [ ] **TASK 3.1.4** — Implement typewriter/teletype effect on SignalFeed entries with blinking cursor
- [ ] **TASK 3.1.5** — Implement radar sweep animation on CommandMap for new Leviathan detection

### FEATURE 3.2: Commander Input & Asset Dispatch
- [ ] **TASK 3.2.1** — Implement Leviathan selection UI (click target on roster or map)
- [ ] **TASK 3.2.2** — Implement asset dispatch UI (buttons for Scramble Jets, Deploy Mechs, Raise Barrier, Evac Sector)
- [ ] **TASK 3.2.3** — Implement dispatch validation (asset cooldown, capacity limits, selected target required for some assets)
- [ ] **TASK 3.2.4** — Implement send commander.select and commander.dispatch messages to server

### FEATURE 3.3: Commander Feedback & Status Display
- [ ] **TASK 3.3.1** — Display Leviathan positions on CommandMap with threat severity indicators
- [ ] **TASK 3.3.2** — Display city base HP and damage state
- [ ] **TASK 3.3.3** — Display Commander score (mitigation points + combo multiplier)
- [ ] **TASK 3.3.4** — Display active barriers, remaining assets, cooldown timers
- [ ] **TASK 3.3.5** — Implement alert mode toggle (visual state feedback for high-threat scenarios)

### FEATURE 3.4: Signal Feed & Match Timeline
- [ ] **TASK 3.4.1** — Implement SignalFeed display with typewriter effect and scrollback history
- [ ] **TASK 3.4.2** — Implement signal event generation (mitigation success/failure, Kaiju respawn, combo detection, base damage)
- [ ] **TASK 3.4.3** — Implement server→client broadcast for signal events
- [ ] **TASK 3.4.4** — Implement match timer display (elapsed time, time to base arrival estimate)

---

## EPIC 4: Kaiju Players (Mobile Client)

### FEATURE 4.1: Kaiju UI (Mobile-First, Arcade Aesthetic)
- [ ] **TASK 4.1.1** — Implement bold silhouette view of Kaiju advancing on city skyline
- [ ] **TASK 4.1.2** — Implement chunky vector shape rendering for Kaiju and city base
- [ ] **TASK 4.1.3** — Implement segmented HP bar with flicker on damage
- [ ] **TASK 4.1.4** — Implement screen shake on heavy impact and city base damage
- [ ] **TASK 4.1.5** — Implement flat neon outline style for UI elements

### FEATURE 4.2: Kaiju Abilities & Input
- [ ] **TASK 4.2.1** — Implement Move button (heading control; advance toward base)
- [ ] **TASK 4.2.2** — Implement Attack button (deal damage to base when in range; cooldown-limited)
- [ ] **TASK 4.2.3** — Implement archetype-specific Ability buttons (e.g., Sniper: Submerge; Dozer: Roar; all creatures: one unique ability)
- [ ] **TASK 4.2.4** — Implement cooldown fill animations for all abilities
- [ ] **TASK 4.2.5** — Implement send kaiju.move, kaiju.attack, kaiju.ability messages to server

### FEATURE 4.3: Kaiju State & Feedback
- [ ] **TASK 4.3.1** — Display current Kaiju HP and hpMax
- [ ] **TASK 4.3.2** — Display ability cooldown timers
- [ ] **TASK 4.3.3** — Display damage taken (pops on screen when hit by mitigation)
- [ ] **TASK 4.3.4** — Display distance-to-base indicator (progress visualization)
- [ ] **TASK 4.3.5** — Implement damage pop animation matching Commander's visual feedback

### FEATURE 4.4: Continue System (INSERT COIN)
- [ ] **TASK 4.4.1** — Implement CONTAINED event handler (kaiju silhouette shatters, "CONTAINED" overlay)
- [ ] **TASK 4.4.2** — Implement INSERT COIN flashing overlay (2 Hz) with coin-drop sound cue
- [ ] **TASK 4.4.3** — Implement 10-second countdown timer display (CONTINUE_WINDOW_MS = 10000)
- [ ] **TASK 4.4.4** — Implement Continue button (sends kaiju.continue message; deducts 1 credit)
- [ ] **TASK 4.4.5** — Implement credit icon display (coin counters for remaining credits)
- [ ] **TASK 4.4.6** — Implement GAME OVER overlay on credit exhaustion (transition to spectator view)
- [ ] **TASK 4.4.7** — Implement spectator mode UI (watch match from Commander view, no input)

---

## EPIC 5: Combat Resolution & Game Mechanics

### FEATURE 5.1: Damage Calculation & Hit Resolution
- [ ] **TASK 5.1.1** — Implement base damage calculation (attacker archetype × target severity adjustment × proximity adjustment × status adjustment)
- [ ] **TASK 5.1.2** — Implement damage application to city base on Kaiju attack
- [ ] **TASK 5.1.3** — Implement damage application to Kaiju on Commander mitigation
- [ ] **TASK 5.1.4** — Implement damage value clamping (no negative damage, no overflow on large combos)

### FEATURE 5.2: Combo Detection & Amplification
- [ ] **TASK 5.2.1** — Implement combo window tracking (150ms per validated constraint; configurable COMBO_WINDOW_MS)
- [ ] **TASK 5.2.2** — Implement same-target attack detection (are multiple attacks hitting same entity in combo window?)
- [ ] **TASK 5.2.3** — Implement combo damage amplification formula (validated: synchronized hits = larger damage pop)
- [ ] **TASK 5.2.4** — Implement combo counter for Commander score (track combo peak per round)

### FEATURE 5.3: Damage Feedback (Visual & Audio)
- [ ] **TASK 5.3.1** — Implement damage pop number rendering (position, size, color, duration)
- [ ] **TASK 5.3.2** — Implement combo damage pop styling (larger font, bolder weight, different color or effect)
- [ ] **TASK 5.3.3** — Implement damage sound effects (base hit, Kaiju hit, combo confirmation)
- [ ] **TASK 5.3.4** — Implement screen shake on large damage events (intensity scales with combo)

### FEATURE 5.4: Mitigation Resolution (Commander Asset Deployment)
- [ ] **TASK 5.4.1** — Implement asset delay modeling (1–5s delay between dispatch and resolution, per design spec)
- [ ] **TASK 5.4.2** — Implement mitigation outcome types (success/partial/failed/unverified with probabilities)
- [ ] **TASK 5.4.3** — Implement knockback/repel effect on successful mitigation (moves Kaiju away from base)
- [ ] **TASK 5.4.4** — Implement Raise Barrier base damage reduction (barrier absorbs damage for configured duration)
- [ ] **TASK 5.4.5** — Implement Evac Sector civilian save (no knockback, contributes to Commander score)

### FEATURE 5.5: Leviathan Position & Advancement
- [ ] **TASK 5.5.1** — Implement heading/direction tracking for each Kaiju
- [ ] **TASK 5.5.2** — Implement Leviathan position update (advance toward city base on each tick)
- [ ] **TASK 5.5.3** — Implement range calculation (distance to base, distance to other Kaiju for Dozer area effects)
- [ ] **TASK 5.5.4** — Implement knockback physics (apply repel vector, lerp back to course)

---

## EPIC 6: Scoring & Outcome Systems

### FEATURE 6.1: Commander Scoring
- [ ] **TASK 6.1.1** — Implement score increment on successful mitigation (base points per asset type)
- [ ] **TASK 6.1.2** — Implement combo multiplier tracking (consecutive mitigations on distinct Kaiju within 5s)
- [ ] **TASK 6.1.3** — Implement civilians saved bonus (per Evac Sector deployment)
- [ ] **TASK 6.1.4** — Implement final score calculation on match end (total mitigation score + combo peak + civilian bonus)

### FEATURE 6.2: Match Result & Leaderboard
- [ ] **TASK 6.2.1** — Implement score reveal animation on match end (display "HUMANS SAVED: NN")
- [ ] **TASK 6.2.2** — Implement Commander initials entry screen (name the player for leaderboard)
- [ ] **TASK 6.2.3** — Implement leaderboard persistence (store to backend/database)
- [ ] **TASK 6.2.4** — Implement leaderboard display (show top 10 runs, sorted by Commander score)
- [ ] **TASK 6.2.5** — Implement Kaiju player score display (damage dealt to base; secondary ranking)

### FEATURE 6.3: Round Loop & Replayability
- [ ] **TASK 6.3.1** — Implement "Play Again" button (reset match state, reassign roles, restart)
- [ ] **TASK 6.3.2** — Implement role-swap option (Commander becomes Kaiju, Kaiju swap positions)
- [ ] **TASK 6.3.3** — Implement difficulty/preset selection (easy/normal/hard via tunable parameters)

---

## EPIC 7: AI & NPC Behavior

### FEATURE 7.1: AI Kaiju Controller
- [ ] **TASK 7.1.1** — Implement AI Leviathan tick behavior (reuse existing `tickLeviathans` logic)
- [ ] **TASK 7.1.2** — Implement AI target selection (which base/entity to attack)
- [ ] **TASK 7.1.3** — Implement AI ability usage (when to use archetype-specific abilities)
- [ ] **TASK 7.1.4** — Implement AI formation heuristics (loose grouping for coordinated feel, but not perfectly synchronized)

### FEATURE 7.2: Fallback Slot Assignment
- [ ] **TASK 7.2.1** — Implement unclaimed Leviathan detection (Kaiju slots with no active client)
- [ ] **TASK 7.2.2** — Implement AI promotion (unclaimed slots become AI-controlled)
- [ ] **TASK 7.2.3** — Implement reconnect claim (client rejoins, takes back AI-controlled slot within grace window)
- [ ] **TASK 7.2.4** — Implement slot reset on grace window expiration (slot locked to AI, cannot be reclaimed)

---

## EPIC 8: Attract Mode & Lobby

### FEATURE 8.1: Attract Mode Demo Loop
- [ ] **TASK 8.1.1** — Implement match tick-log recording (save sequence of game states for replay)
- [ ] **TASK 8.1.2** — Implement idle timeout detection (30s with no active clients → trigger attract mode)
- [ ] **TASK 8.1.3** — Implement attract mode playback (replay last match tick-log silently on Commander screen)
- [ ] **TASK 8.1.4** — Implement PRESS START / INSERT COIN overlay (pulsing at 1 Hz, centered)

### FEATURE 8.2: Lobby & Matchmaking
- [ ] **TASK 8.2.1** — Implement share-code lobby (matchMakeById with room ID)
- [ ] **TASK 8.2.2** — Implement role selection UI (choose Commander or Kaiju on join)
- [ ] **TASK 8.2.3** — Implement ready-check (wait for all players before match start)
- [ ] **TASK 8.2.4** — Implement lobby timeout (auto-start after 60s, fill remaining slots with AI)

---

## EPIC 9: Audio & Visual Effects

### FEATURE 9.1: Audio Cues & Feedback
- [ ] **TASK 9.1.1** — Implement damage hit sound effect library (damage pop, combo hit, base impact, mitigation success, mitigation failure)
- [ ] **TASK 9.1.2** — Implement ambient audio (match background, alert escalation)
- [ ] **TASK 9.1.3** — Implement INSERT COIN sound cue (coin drop on continue prompt)
- [ ] **TASK 9.1.4** — Implement match end fanfare (victory/defeat music stings)
- [ ] **TASK 9.1.5** — Implement volume control & mute toggle

### FEATURE 9.2: Visual Effects & Animations
- [ ] **TASK 9.2.1** — Implement particle effects for mitigation impacts (Barrier, Mech deploy, etc.)
- [ ] **TASK 9.2.2** — Implement explosion animation on city base damage
- [ ] **TASK 9.2.3** — Implement Kaiju silhouette shattering animation (CONTAINED state)
- [ ] **TASK 9.2.4** — Implement screen shake implementation (horizontal + vertical jitter, configurable intensity)
- [ ] **TASK 9.2.5** — Implement flash/flicker effects for status changes (hit, submerged, roar buff, etc.)

---

## EPIC 10: Deployment & Infrastructure

### FEATURE 10.1: Docker & Container Image
- [ ] **TASK 10.1.1** — Create Dockerfile (Node.js 22 LTS alpine, copy shared game logic + Colyseus server)
- [ ] **TASK 10.1.2** — Configure container image build (exposes port 2567)
- [ ] **TASK 10.1.3** — Implement container registry integration (Azure Container Registry ACR)
- [ ] **TASK 10.1.4** — Implement container image push/pull workflow

### FEATURE 10.2: Azure Container Apps Configuration
- [ ] **TASK 10.2.1** — Configure ACA sticky sessions (stickySessions: true for WebSocket affinity)
- [ ] **TASK 10.2.2** — Configure ACA autoscaling rules (KEDA HTTP scaler, scale-to-zero policy)
- [ ] **TASK 10.2.3** — Implement ACA ingress & port exposure (2567 for Colyseus)
- [ ] **TASK 10.2.4** — Implement ACA environment variable configuration (COLYSEUS_PORT, CREDIT_COUNT, CONTINUE_WINDOW_MS, etc.)

### FEATURE 10.3: Monitoring & Observability
- [ ] **TASK 10.3.1** — Implement Colyseus Monitor dashboard (/colyseus endpoint for room inspection)
- [ ] **TASK 10.3.2** — Implement server-side logging (match lifecycle, errors, performance metrics)
- [ ] **TASK 10.3.3** — Implement Azure Application Insights integration (request tracing, exception tracking)
- [ ] **TASK 10.3.4** — Implement health check endpoint (liveness probe for ACA)

### FEATURE 10.4: Configuration & Secrets Management
- [ ] **TASK 10.4.1** — Implement environment-based configuration (dev/staging/prod)
- [ ] **TASK 10.4.2** — Implement CORS origin configuration (restrict allowed client origins)
- [ ] **TASK 10.4.3** — Implement secret management (if needed for auth/logging services)

---

## EPIC 11: Testing & Validation

### FEATURE 11.1: Unit Tests
- [ ] **TASK 11.1.1** — Implement unit tests for damage calculation logic
- [ ] **TASK 11.1.2** — Implement unit tests for combo detection
- [ ] **TASK 11.1.3** — Implement unit tests for mitigation resolution
- [ ] **TASK 11.1.4** — Implement unit tests for game state transitions

### FEATURE 11.2: Integration Tests
- [ ] **TASK 11.2.1** — Implement integration tests for Colyseus message flow (client → server → state patch)
- [ ] **TASK 11.2.2** — Implement integration tests for match lifecycle (create, join, play, end)
- [ ] **TASK 11.2.3** — Implement integration tests for multi-client synchronization

### FEATURE 11.3: Playtesting & Validation
- [ ] **TASK 11.3.1** — Conduct internal playtests (3–5 real players, 2–3 matches per group)
- [ ] **TASK 11.3.2** — Validate combo window tuning (is 150ms discoverable? is balance correct?)
- [ ] **TASK 11.3.3** — Validate aesthetic resonance (does arcade 1993 feel land? gather feedback)
- [ ] **TASK 11.3.4** — Validate leaderboard engagement (do players replay? do initials persist?)
- [ ] **TASK 11.3.5** — Validate INSERT COIN UX (is continue flow intuitive? is frustration reduced?)

---

## EPIC 12: Documentation & Knowledge Transfer

### FEATURE 12.1: API & Architecture Documentation
- [ ] **TASK 12.1.1** — Document Colyseus message protocol (all client→server and server→client types)
- [ ] **TASK 12.1.2** — Document MatchSchema data structure (all fields, types, ranges)
- [ ] **TASK 12.1.3** — Document server tick loop (timing, update phases, determinism)
- [ ] **TASK 12.1.4** — Document deployment process (build, push, ACA configuration)

### FEATURE 12.2: Design Documentation
- [ ] **TASK 12.2.1** — Document balance tuning parameters (damage values, cooldowns, asset success rates)
- [ ] **TASK 12.2.2** — Document Commander strategy guide (asset prioritization, timing considerations)
- [ ] **TASK 12.2.3** — Document Kaiju strategy guide (coordination patterns, ability usage)

### FEATURE 12.3: Player Guides
- [ ] **TASK 12.3.1** — Create Commander quickstart guide (dashboard overview, key controls)
- [ ] **TASK 12.3.2** — Create Kaiju quickstart guide (mobile client overview, key controls)
- [ ] **TASK 12.3.3** — Create leaderboard & scoring guide (how score is calculated, tips for top runs)

---

## Summary by Complexity Tier

### Tier 1: Core Infrastructure (Foundation)
**Must complete first; blocks everything else**
- Colyseus server setup & MatchSchema (Epic 1.1, 1.2)
- Game loop & tick engine (Epic 1.3)
- Match lifecycle (Epic 2)
- Shared game logic package (Epic 2.3)

**Estimated Tasks**: 14 tasks

### Tier 2: Core Gameplay (Mechanics)
**Can start after Tier 1; enables playtesting**
- Combat resolution & damage calculation (Epic 5)
- Combo detection & feedback (Epic 5.2, 5.3)
- Commander asset dispatch (Epic 3.2)
- Kaiju input & abilities (Epic 4.2)
- Scoring system (Epic 6)

**Estimated Tasks**: 18 tasks

### Tier 3: Polish & Deployment (Release)
**Completes after Tier 1 & 2; enables production**
- Arcade aesthetics & animations (Epic 3.1, 4.1, 9)
- Audio effects (Epic 9.1)
- Container & ACA deployment (Epic 10)
- Monitoring & observability (Epic 10.3)

**Estimated Tasks**: 13 tasks

---

## Recommended RPI Breakdown

**Each RPI agent (Implementor) handles 1 EPIC or FEATURE at a time:**

1. **Phase 1 (Core Infrastructure)**: Assign Epic 1 + Epic 2 to initial Implementor
2. **Phase 2 (Combat & Scoring)**: Assign Epic 5 + Epic 6 to Implementor(s) in parallel
3. **Phase 3 (UI & Input)**: Assign Epic 3 + Epic 4 in parallel
4. **Phase 4 (Effects & Audio)**: Assign Epic 9 in parallel
5. **Phase 5 (Deployment)**: Assign Epic 10 after Phase 1 complete
6. **Phase 6 (Testing & Docs)**: Assign Epic 11 + Epic 12 throughout

---

**Generated**: 2026-06-24  
**Source**: `.copilot-tracking/dt/kaiju-arcade/handoff-summary.md`  
🎮 Ready for Issue Creation
