# Issue Preview — What Will Be Created

This document shows what the 12 Epic issues will look like once created via the scripts.

---

## ⚙️ EPIC 1: Multiplayer Infrastructure & Networking
**Label**: `epic`, `tier-1`, `infrastructure`, `multiplayer`

Build Colyseus server, message protocol, and game loop engine.

### Features
- FEATURE 1.1 — Colyseus Server Setup
- FEATURE 1.2 — Message Protocol & Validation
- FEATURE 1.3 — Game Loop & Tick Engine

### Implementation Tasks
- [ ] TASK 1.1.1 — Initialize Colyseus v0.17 project with TypeScript, Node.js 22 LTS
- [ ] TASK 1.1.2 — Create `MatchSchema` (@Schema/@type decorators) for game state structure
- [ ] TASK 1.1.3 — Implement `MatchRoom extends Room<MatchSchema>` with onCreate lifecycle
- [ ] TASK 1.1.4 — Implement onJoin handler for role assignment (Commander vs. Kaiju)
- [ ] TASK 1.1.5 — Implement onLeave handler with AI fallback for disconnected Kaiju
- [ ] TASK 1.2.1 — Define client→server message types (commander.select, commander.dispatch, kaiju.move, kaiju.attack, kaiju.ability, kaiju.continue)
- [ ] TASK 1.2.2 — Implement onMessage handlers for all client intents with server-side validation
- [ ] TASK 1.2.3 — Implement server→client broadcast messages (state patches, signal events, match result, kaiju.contained)
- [ ] TASK 1.2.4 — Implement message queueing/coalescing to handle simultaneous actions within tick window
- [ ] TASK 1.3.1 — Implement setSimulationInterval(tick, 200ms) for 5 Hz server tick
- [ ] TASK 1.3.2 — Implement deterministic world update function (position updates, damage resolution, state transitions)
- [ ] TASK 1.3.3 — Implement client-side lerp for Kaiju position smoothing between server ticks
- [ ] TASK 1.3.4 — Implement server tick profiling & timing validation (ensure consistent 200ms intervals under load)

---

## 🎮 EPIC 2: Game State & Match Lifecycle
**Label**: `epic`, `tier-1`, `infrastructure`, `multiplayer`

Implement match initialization, outcome detection, and state persistence.

### Features
- FEATURE 2.1 — Match Initialization
- FEATURE 2.2 — Match Outcome & Termination
- FEATURE 2.3 — State Persistence & Serialization

### Implementation Tasks
- [ ] TASK 2.1.1 — Implement match creation with city base selection (from lastStandCities)
- [ ] TASK 2.1.2 — Implement Kaiju slot allocation (up to 4 players + Commander, remainder AI)
- [ ] TASK 2.1.3 — Implement initial Leviathan roster generation with player assignments
- [ ] TASK 2.1.4 — Implement initial player credit assignment (CREDIT_COUNT = 3, configurable)
- [ ] TASK 2.1.5 — Implement match start handshake (broadcast initial state to all clients)
- [ ] TASK 2.2.1 — Implement win condition detection (all Kaiju contained OR city base HP ≤ 0 OR time limit expired)
- [ ] TASK 2.2.2 — Implement match result artifact generation (outcome, summary, Commander score)
- [ ] TASK 2.2.3 — Implement graceful match shutdown (kick clients, record stats, clean up room)
- [ ] TASK 2.2.4 — Implement reconnect grace window (30s holdover for disconnected Kaiju with credits remaining)
- [ ] TASK 2.3.1 — Extract shared game logic into transport-agnostic package (types, severity, leviathans, mitigation-resolution)
- [ ] TASK 2.3.2 — Implement MatchSchema serialization/deserialization for state snapshots
- [ ] TASK 2.3.3 — Implement Colyseus Monitor integration for debugging room state

---

## 👨‍💼 EPIC 3: Commander Player (Dashboard)
**Label**: `epic`, `tier-2`, `ui`, `gameplay`

Build Commander dashboard with arcade aesthetics and asset dispatch controls.

### Features
- FEATURE 3.1 — Dashboard UI Components (Arcade Aesthetic)
- FEATURE 3.2 — Commander Input & Asset Dispatch
- FEATURE 3.3 — Commander Feedback & Status Display
- FEATURE 3.4 — Signal Feed & Match Timeline

### Implementation Tasks
- [ ] TASK 3.1.1 — Apply CRT phosphor glow + scan-line overlay to CommandMap and feed panels
- [ ] TASK 3.1.2 — Implement monochrome color scheme (amber-on-black nominal, green success, red threat)
- [ ] TASK 3.1.3 — Implement uppercase condensed text for all UI labels
- [ ] TASK 3.1.4 — Implement typewriter/teletype effect on SignalFeed entries with blinking cursor
- [ ] TASK 3.1.5 — Implement radar sweep animation on CommandMap for new Leviathan detection
- [ ] TASK 3.2.1 — Implement Leviathan selection UI (click target on roster or map)
- [ ] TASK 3.2.2 — Implement asset dispatch UI (buttons for Scramble Jets, Deploy Mechs, Raise Barrier, Evac Sector)
- [ ] TASK 3.2.3 — Implement dispatch validation (asset cooldown, capacity limits, selected target required)
- [ ] TASK 3.2.4 — Implement send commander.select and commander.dispatch messages to server
- [ ] TASK 3.3.1 — Display Leviathan positions on CommandMap with threat severity indicators
- [ ] TASK 3.3.2 — Display city base HP and damage state
- [ ] TASK 3.3.3 — Display Commander score (mitigation points + combo multiplier)
- [ ] TASK 3.3.4 — Display active barriers, remaining assets, cooldown timers
- [ ] TASK 3.3.5 — Implement alert mode toggle (visual state feedback for high-threat scenarios)
- [ ] TASK 3.4.1 — Implement SignalFeed display with typewriter effect and scrollback history
- [ ] TASK 3.4.2 — Implement signal event generation (mitigation success/failure, Kaiju respawn, combo detection, base damage)
- [ ] TASK 3.4.3 — Implement server→client broadcast for signal events
- [ ] TASK 3.4.4 — Implement match timer display (elapsed time, time to base arrival estimate)

---

## 🦑 EPIC 4: Kaiju Players (Mobile Client)
**Label**: `epic`, `tier-2`, `ui`, `gameplay`

Build Kaiju mobile client with arcade UI, abilities, and continue system.

### Features
- FEATURE 4.1 — Kaiju UI (Mobile-First, Arcade Aesthetic)
- FEATURE 4.2 — Kaiju Abilities & Input
- FEATURE 4.3 — Kaiju State & Feedback
- FEATURE 4.4 — Continue System (INSERT COIN)

### Implementation Tasks
- [ ] TASK 4.1.1 — Implement bold silhouette view of Kaiju advancing on city skyline
- [ ] TASK 4.1.2 — Implement chunky vector shape rendering for Kaiju and city base
- [ ] TASK 4.1.3 — Implement segmented HP bar with flicker on damage
- [ ] TASK 4.1.4 — Implement screen shake on heavy impact and city base damage
- [ ] TASK 4.1.5 — Implement flat neon outline style for UI elements
- [ ] TASK 4.2.1 — Implement Move button (heading control; advance toward base)
- [ ] TASK 4.2.2 — Implement Attack button (deal damage to base when in range; cooldown-limited)
- [ ] TASK 4.2.3 — Implement archetype-specific Ability buttons (Sniper: Submerge; Dozer: Roar)
- [ ] TASK 4.2.4 — Implement cooldown fill animations for all abilities
- [ ] TASK 4.2.5 — Implement send kaiju.move, kaiju.attack, kaiju.ability messages to server
- [ ] TASK 4.3.1 — Display current Kaiju HP and hpMax
- [ ] TASK 4.3.2 — Display ability cooldown timers
- [ ] TASK 4.3.3 — Display damage taken (pops on screen when hit by mitigation)
- [ ] TASK 4.3.4 — Display distance-to-base indicator (progress visualization)
- [ ] TASK 4.3.5 — Implement damage pop animation matching Commander's visual feedback
- [ ] TASK 4.4.1 — Implement CONTAINED event handler (kaiju silhouette shatters, "CONTAINED" overlay)
- [ ] TASK 4.4.2 — Implement INSERT COIN flashing overlay (2 Hz) with coin-drop sound cue
- [ ] TASK 4.4.3 — Implement 10-second countdown timer display (CONTINUE_WINDOW_MS = 10000)
- [ ] TASK 4.4.4 — Implement Continue button (sends kaiju.continue message; deducts 1 credit)
- [ ] TASK 4.4.5 — Implement credit icon display (coin counters for remaining credits)
- [ ] TASK 4.4.6 — Implement GAME OVER overlay on credit exhaustion (transition to spectator view)
- [ ] TASK 4.4.7 — Implement spectator mode UI (watch match from Commander view, no input)

---

## ⚔️ EPIC 5: Combat Resolution & Game Mechanics
**Label**: `epic`, `tier-2`, `gameplay`

Implement damage calculation, combo detection, feedback, and mitigation resolution.

### Features
- FEATURE 5.1 — Damage Calculation & Hit Resolution
- FEATURE 5.2 — Combo Detection & Amplification
- FEATURE 5.3 — Damage Feedback (Visual & Audio)
- FEATURE 5.4 — Mitigation Resolution (Commander Asset Deployment)
- FEATURE 5.5 — Leviathan Position & Advancement

### Implementation Tasks
- [ ] TASK 5.1.1 — Implement base damage calculation (attacker archetype × target severity)
- [ ] TASK 5.1.2 — Implement damage application to city base on Kaiju attack
- [ ] TASK 5.1.3 — Implement damage application to Kaiju on Commander mitigation
- [ ] TASK 5.1.4 — Implement damage value clamping (no negative damage, no overflow)
- [ ] TASK 5.2.1 — Implement combo window tracking (150ms per validated constraint)
- [ ] TASK 5.2.2 — Implement same-target attack detection
- [ ] TASK 5.2.3 — Implement combo damage amplification formula
- [ ] TASK 5.2.4 — Implement combo counter for Commander score
- [ ] TASK 5.3.1 — Implement damage pop number rendering (position, size, color, duration)
- [ ] TASK 5.3.2 — Implement combo damage pop styling (larger font, bolder weight, different color)
- [ ] TASK 5.3.3 — Implement damage sound effects (base hit, Kaiju hit, combo confirmation)
- [ ] TASK 5.3.4 — Implement screen shake on large damage events
- [ ] TASK 5.4.1 — Implement asset delay modeling (1–5s delay between dispatch and resolution)
- [ ] TASK 5.4.2 — Implement mitigation outcome types (success/partial/failed/unverified)
- [ ] TASK 5.4.3 — Implement knockback/repel effect on successful mitigation
- [ ] TASK 5.4.4 — Implement Raise Barrier base damage reduction
- [ ] TASK 5.4.5 — Implement Evac Sector civilian save
- [ ] TASK 5.5.1 — Implement heading/direction tracking for each Kaiju
- [ ] TASK 5.5.2 — Implement Leviathan position update (advance toward city base)
- [ ] TASK 5.5.3 — Implement range calculation (distance to base, distance to other Kaiju)
- [ ] TASK 5.5.4 — Implement knockback physics (apply repel vector, lerp back to course)

---

*[EPICs 6-12 follow the same format, with all tasks listed as checkboxes]*

---

## Summary

When you run the script, you'll get:

✅ **12 Epic issues** in GitHub, each containing:
- Clear description of the system
- List of Features (FEATURE {N.N})
- Clickable task checklist (TASK {N.N.N})
- Appropriate labels (tier, category)

✅ **Organized by Tier**:
- **Tier 1** (Infrastructure): 2 Epics, 14 tasks — blocks everything
- **Tier 2** (Gameplay): 6 Epics, 24 tasks — can parallelize after Tier 1
- **Tier 3** (Polish): 4 Epics, 15 tasks — can parallelize with Tier 2 completion

✅ **Ready for RPI Dispatch**:
- Each Epic can be assigned to a Phase Implementor
- Tasks are small enough for sprint-level planning
- Progress is tracked via GitHub issue checkboxes

---

## Next Command

```bash
# Run one of these from /home/dakir/kaiju-arcade:
./create-issues.sh              # Bash version
# or
python3 create_issues.py        # Python version
```

Both will create the same 12 Epic issues and print their numbers when done.
