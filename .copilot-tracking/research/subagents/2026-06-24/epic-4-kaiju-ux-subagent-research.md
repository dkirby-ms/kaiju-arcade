---
title: Epic 4 Kaiju UX Subagent Research
description: Evidence-based UX research for Epic 4 kaiju player interface design focused on uncluttered, high-clarity gameplay.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju-arcade
  - ux
  - hud
  - cognitive-load
  - epic-4
estimated_reading_time: 12
---

## Scope

Research objective coverage:

1. Identify current UX surfaces and gameplay data sources across kaiju client, commander client, docs, schema, room, loop, and tests.
2. Infer kaiju player core tasks and decision loops from current behavior and contracts.
3. Identify clutter/confusion risks with line-cited evidence.
4. Gather external actionable UX principles for tactical/action HUDs and cognitive-load reduction.
5. Evaluate three Epic 4 approaches:
   - Minimal HUD with progressive disclosure.
   - Panel-heavy dashboard.
   - Mode-based context switcher.
6. Recommend one approach for anti-clutter, kaiju-first play.

Assumptions explicitly marked where code/docs do not fully specify product intent.

## Evidence Log

Primary in-repo evidence reviewed:

- public/kaiju/index.html:19-157
- public/kaiju/styles.css:1-516
- public/kaiju/app.js:1-895
- public/commander/index.html:19-85
- public/commander/styles.css:1-232
- public/commander/app.js:1-515
- docs/multiplayer-game-design.md:1-342
- src/schema/MatchSchema.ts:1-620, 746-798
- src/game/MatchRoom.ts:1-1120
- src/game/GameLoop.ts:1-458
- src/game/GameLoop.test.ts:1-129
- src/game/MatchRoom.test.ts:1-705
- src/schema/MatchSchema.test.ts:1-104
- src/messages/protocol.ts:1-258
- src/messages/protocol.test.ts:1-46

External guidance reviewed:

- NN/g: Progressive Disclosure
  - <https://www.nngroup.com/articles/progressive-disclosure/>
- NN/g: 10 Usability Heuristics
  - <https://www.nngroup.com/articles/ten-usability-heuristics/>
- NN/g: Minimize Cognitive Load
  - <https://www.nngroup.com/articles/minimize-cognitive-load/>
- W3C WCAG 2.2 Understanding SC 1.4.11 Non-text Contrast
  - <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
- W3C WCAG 2.2 Quick Reference (contrast/use-of-color/reflow/focus)
  - <https://www.w3.org/WAI/WCAG22/quickref/>
- Game Accessibility Guidelines (full list)
  - <https://gameaccessibilityguidelines.com/full-list/>

## Current UX Surfaces

### Kaiju pilot client

Primary UI blocks currently visible in one page:

- Session setup panel: pilot, room, reconnect token, refresh/join (public/kaiju/index.html:19-36).
- Tactical map panel with Leaflet + radar overlay (public/kaiju/index.html:38-44).
- Kaiju status panel with name/archetype/state/credits, HP segments, distance-to-base track (public/kaiju/index.html:46-84).
- Abilities panel with move/attack/ability buttons and cooldown meters plus cooldown list (public/kaiju/index.html:86-114).
- Spectator panel (conditionally shown) (public/kaiju/index.html:117-138).
- Pilot feed event log (public/kaiju/index.html:140-143).
- Continue overlay for containment countdown/credit spend (public/kaiju/index.html:145-151).

Behavioral drivers:

- Input cadence and loop constraints:
  - Move throttled to 120 ms send interval (public/kaiju/app.js:4, 781-789).
  - Attack cooldown set to 2s client-side (public/kaiju/app.js:3, 805-806).
  - Ability cooldowns by archetype 6-9s (public/kaiju/app.js:5-10, 817-819).
- Real-time render loop runs every animation frame and updates status, cooldowns, continue overlay, spectator panel (public/kaiju/app.js:617-624).
- Containment and spectator transitions are high-priority events for player role/state changes (public/kaiju/app.js:507-522, 591-614, 732-739).

Layout/visual characteristics:

- Two-column panel grid on desktop (public/kaiju/styles.css:34).
- Mobile collapses to one column at 880px (public/kaiju/styles.css:508-511).
- Repeated panel/list chrome and multiple meters in same viewport (public/kaiju/styles.css:38-40, 240-276, 330-352).

### Commander client (comparative reference)

Commander uses a visibly panel-heavy control-room UI:

- Session, status, map, dispatch, signal feed, dispatch results (public/commander/index.html:19-85).
- Typewriter feed effect and dedicated dispatch results log (public/commander/app.js:332-353, 458-467).
- Also two-column panel grid that collapses to single column at 880px (public/commander/styles.css:35, 229-231).

Comparative insight:

- Commander dashboard is intentionally dense due strategic coordination role.
- Kaiju role is tactical-execution focused and likely needs lower concurrent information density than commander.

### Game/state contracts that drive what kaiju must perceive

- Message protocol includes kaiju move/attack/ability/continue and key server events for status and outcomes (src/messages/protocol.ts:29-43, 62-73, 97-111).
- Continue economy and timing constants are explicit: credit count 3, continue window 10s, respawn HP 0.6 (src/schema/MatchSchema.ts:757-759).
- Tick rate 200 ms and archetype ability timings shape urgency and cadence (src/schema/MatchSchema.ts:749, 784, 790-794).
- Room broadcasts commander status and signal feed, and one-time dispatch/ability/spectator events (src/game/MatchRoom.ts:768-773, 797-809, 811-831, 834-855, 914-920).

## Kaiju Player Jobs-to-be-Done

### Core jobs

1. Stay on target while moving toward base:
   - Adjust heading frequently; move intents are throttled but fast (public/kaiju/app.js:773-795).
2. Decide attack timing every ~2 seconds:
   - Attack button and cooldown are central cadence loop (public/kaiju/app.js:798-806, 551-583).
3. Trigger archetype ability when context justifies it:
   - Ability outcomes and cooldown windows vary by archetype (public/kaiju/app.js:5-10, 809-819; src/game/GameLoop.ts:249-313).
4. Monitor survivability and risk:
   - HP, status, incoming mitigation outcomes, containment events (public/kaiju/index.html:46-84, 140-151; public/kaiju/app.js:507-522).
5. Make continue decision under hard timer when contained:
   - 10s countdown, credit gate, failure to spectator/game-over path (public/kaiju/app.js:591-614, 822-829; src/game/MatchRoom.ts:451-479, 889-920).

### Decision loop inferred from code

Approximate short loop (1-3 seconds):

- Observe: status, HP, distance-to-base, cooldown states, latest feed events.
- Orient: am I contained/spectator, can I act, do I have attack or ability ready.
- Decide: adjust heading, attack now, ability now, hold.
- Act: send move/attack/ability.
- Verify: read immediate local feedback plus server events (ability result, signal feed, contained).

Evidence:

- Observe/verify channels: public/kaiju/app.js:120-128, 551-583, 702-756.
- Decide/act constraints: public/kaiju/app.js:493-505, 773-819.
- Continue branch decision: public/kaiju/app.js:591-614.

### What should remain persistently visible vs contextual

Persistently visible (high-frequency decisions):

- Role/state (active/contained/spectator).
- HP and immediate survivability indicators.
- Attack and ability readiness.
- Base pressure proxy (distance-to-base).
- Continue timer/credits only when contained.

Contextual/on-demand (lower-frequency):

- Session controls after successful join.
- Full event history (keep short live slice always visible, full history drawer optional).
- Full spectator telemetry while actively piloting.
- Detailed map overlays not required for immediate action choice.

Evidence basis: interaction frequency from loop/input/cooldown logic in public/kaiju/app.js:551-583, 773-819 and continue-critical path in public/kaiju/app.js:591-614.

## Clutter Risks

1. Too many simultaneously visible panels for a tactical role

- Kaiju screen shows session, map, status, action, spectator, feed, and continue overlay in one page structure (public/kaiju/index.html:19-151).
- Desktop uses two-column dense grid; many bordered panels compete equally (public/kaiju/styles.css:34, 38-40).

Risk:

- Attention split during short decision windows; essential controls and immediate status compete with setup/history/secondary telemetry.

2. Duplicate cooldown channels increase scan cost

- Cooldown represented by two meters and separate textual list of cooldowns (public/kaiju/index.html:96-114; public/kaiju/app.js:551-590).

Risk:

- Redundant signal sources for same concept increase extraneous cognitive load.

3. Feed can become noise relative to high-frequency actions

- Every move/attack/ability action appends feed entries, plus system/network events (public/kaiju/app.js:795, 806, 819, 844, 856, 702-756).
- Feed list retained up to 50 entries (public/kaiju/app.js:125-128).

Risk:

- Important events (contained, game over, reconnect) can be buried in high-churn log.

4. Spectator and pilot concerns coexist in same screen architecture

- Spectator panel toggles while pilot action panel hides, but same page keeps many pilot-oriented artifacts active in DOM and update loop (public/kaiju/app.js:528-549, 617-624; public/kaiju/index.html:86-138).

Risk:

- Mode ambiguity if not visually dominant enough; potential confusion over what actions are relevant now.

5. Continue overlay is critical but competes with full underlying HUD

- Continue decision is high stakes and timed, but overlay appears on top of still-present full UI (public/kaiju/index.html:145-151; public/kaiju/app.js:591-614).

Risk:

- Reduced clarity during the only hard-deadline decision for kaiju players.

6. Color and motion dependence needs stronger non-text/state redundancy

- UI uses nominal/alert/critical color classes and multiple animation effects (public/kaiju/styles.css:344-352, 404-408).

Risk:

- If color/motion is primary state cue, readability and state discrimination degrade for some players.
- External standards caution against relying on color alone and require adequate component contrast.

External corroboration:

- WCAG 2.2 SC 1.4.11 and 1.4.1 guidance for non-text contrast and non-color-only status communication.

7. Session setup remains visually prominent during active play

- Session controls remain first substantive panel after join (public/kaiju/index.html:19-36).

Risk:

- Non-gameplay controls occupy prime viewport and mental budget during active match.

## External Principles

Only actionable principles relevant to tactical/action HUD design are summarized.

1. Progressive disclosure for feature-rich interfaces

- Show core options first, defer advanced/rare options until requested.
- Primary/secondary split quality is critical: frequent tasks must remain upfront.
- More than two disclosure levels often harms usability.

Source:

- NN/g Progressive Disclosure: <https://www.nngroup.com/articles/progressive-disclosure/>

2. Minimize extraneous cognitive load

- Remove visual clutter and non-essential choices from main decision loop.
- Build on existing mental models and offload memory burden with visible state.

Source:

- NN/g Minimize Cognitive Load: <https://www.nngroup.com/articles/minimize-cognitive-load/>

3. Heuristic fit for fast tactical UIs

- Visibility of system status.
- Recognition over recall.
- Aesthetic and minimalist design.
- Error prevention and recovery.

Source:

- NN/g 10 Usability Heuristics: <https://www.nngroup.com/articles/ten-usability-heuristics/>

4. Contrast and non-color-only state signaling

- Text contrast baseline (typically 4.5:1 for normal text under WCAG 1.4.3).
- Non-text UI/state indicators need at least 3:1 against adjacent colors (WCAG 1.4.11).
- State should not rely on hue changes alone.

Source:

- W3C WCAG Quickref and Understanding 1.4.11:
  - <https://www.w3.org/WAI/WCAG22/quickref/>
  - <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>

5. Game-specific accessibility principles that also reduce clutter/confusion

- Keep interactive controls large and well-spaced, especially on small/touch screens.
- Keep essential temporary information within eye-line.
- Allow reminders of controls/objectives during gameplay.
- Ensure essential information is not conveyed by color alone.

Source:

- Game Accessibility Guidelines full list: <https://gameaccessibilityguidelines.com/full-list/>

## Alternatives

### Alternative A: Minimal HUD with progressive disclosure

Summary:

- Keep one compact always-visible action strip and status strip.
- Move session controls, deep feed history, and extended map details to drawers/sheets.
- Escalate only critical events to interruptive overlays.

Benefits:

- Lowest scan time for the 1-3 second kaiju decision loop.
- Strong anti-clutter alignment and reduced cognitive load.
- Clear role-state transitions (pilot vs contained vs spectator) by changing one dominant layout.

Drawbacks:

- Less always-visible telemetry may bother power users.
- Requires careful thresholding of what is always visible.

Implementation complexity (this codebase): Medium

- Mostly client-side composition and visibility logic in public/kaiju/index.html and public/kaiju/app.js.
- Reuses existing event contracts and state data; no server protocol changes required for baseline.

Alignment with current code: High

- Existing state already computes action readiness and role transitions centrally (public/kaiju/app.js:461-624).

### Alternative B: Panel-heavy dashboard

Summary:

- Keep and expand current all-at-once panel model (pilot parity with commander density).

Benefits:

- Max telemetry visible for advanced players and observers.
- Lowest risk of hidden information.

Drawbacks:

- Highest clutter and scan cost for fast action decisions.
- Greater risk of burying critical continue/survivability cues.
- Weaker anti-clutter objective fit.

Implementation complexity (this codebase): Low-Medium

- Minimal restructuring needed; can be achieved by incremental additions.

Alignment with current code: High (structural), Low (goal fit)

- Matches current page composition but conflicts with stated anti-clutter/high-clarity goal.

### Alternative C: Mode-based context switcher (combat map / operations / history)

Summary:

- Three explicit modes with one active at a time:
  - Combat map (moment-to-moment piloting).
  - Operations (ability details, tactical statuses).
  - History (full feed and event review).

Benefits:

- Strong focus per task mode, less simultaneous clutter.
- Good mobile fit where single-mode occupancy is clearer.

Drawbacks:

- Mode-switch overhead can hurt split-second decisions.
- Risk of hiding needed context at wrong time unless sticky mini-indicators remain global.

Implementation complexity (this codebase): Medium-High

- Requires robust mode state machine in public/kaiju/app.js and explicit persistence of cross-mode critical indicators.

Alignment with current code: Medium

- Existing code already has implicit mode shifts (spectator/pilot/contained), but not explicit user-driven mode navigation.

## Recommended Approach

Recommendation: Alternative A, minimal HUD with progressive disclosure.

Rationale:

1. Best matches kaiju decision cadence and anti-clutter objective

- Kaiju loop is quick and repetitive (heading, attack, ability, survive), making dense multi-panel scanning costly.
- Current code already centralizes these decisions into a few state variables and readiness checks (public/kaiju/app.js:493-505, 551-583, 773-819).

2. Supports critical overlays without crowding base HUD

- Continue flow is already overlay-driven and time critical (public/kaiju/app.js:591-614; src/schema/MatchSchema.ts:758).
- Progressive disclosure can preserve this as a dedicated high-priority state.

3. Requires least risky change to server/domain logic

- Existing server broadcasts and schema already provide all required decision data (src/messages/protocol.ts:62-111; src/game/MatchRoom.ts:768-809).
- UX gains can be achieved largely on kaiju client layout and prioritization.

4. Backed by external principles

- Progressive disclosure and minimalist design directly reduce extraneous cognitive load in feature-rich interfaces (NN/g).
- WCAG and game accessibility guidance support clearer state cues, contrast, and non-color-only signaling.

## Implementation Notes

### Implementation-ready information hierarchy

Level 0: Always visible, compact tactical bar (persistent)

- Left: Kaiju state chip (ACTIVE/SUBMERGED/CONTAINED/SPECTATOR) and HP compact meter.
- Center: Attack + Ability readiness with numeric remaining seconds when not ready.
- Right: Distance-to-base and credits.

Level 1: Context panel (single expanded area below tactical bar)

- Default in pilot mode: tactical map with minimal overlays.
- Quick toggle tabs (single row): Map | Events | Session.
- Only one tab expanded at a time.

Level 2: Interruptive overlays (full attention)

- Contained/continue overlay (already present) becomes exclusive foreground state.
- Game-over/spectator transition overlays.
- Critical network error overlay for reconnect instructions.

### Implementation-ready interaction flow

Flow A: Active pilot loop

1. Player joins match.
2. HUD collapses session tab by default after successful join.
3. Player sees tactical bar + map.
4. Player taps move/attack/ability.
5. Cooldown numbers update inline on buttons.
6. Critical events show toast/chip; full details go to Events tab.

Flow B: Contained/continue branch

1. Server emits kaiju.contained.
2. UI enters overlay-priority state.
3. Show countdown, credits left, Continue CTA, Spectate fallback message.
4. If continue success, return to Active pilot loop with short recovery highlight.
5. If timer expires/no credits, transition to spectator layout and auto-open Events tab once.

Flow C: Spectator mode

1. Action buttons hidden.
2. Tactical bar persists with spectator badge.
3. Context panel defaults to commander telemetry snapshot.
4. Player can switch between map and events without action controls.

### Concrete code touchpoints for Epic 4 implementation

- public/kaiju/index.html
  - Restructure panel order into tactical bar + context panel + overlays.
- public/kaiju/styles.css
  - Reduce simultaneous panel chrome; define compact tactical bar styles.
- public/kaiju/app.js
  - Add disclosure state (activeTab, collapsedSession).
  - Route feed items into tiered display (critical inline, full list in Events tab).
  - Keep existing action readiness functions as source of truth.

Low-risk sequence:

1. Introduce layout containers without changing message handling.
2. Move existing sections into disclosure tabs.
3. Add event-tiering.
4. Tune overlay dominance for contained flow.

## Open Questions

1. Should map be default always, or should default context panel be action-centric status at very small mobile heights?
2. Do we want a player option to pin full feed (power-user mode), or keep feed progressive-disclosure only?
3. Should heading controls stay as two turn buttons or shift to drag/joystick input for faster pathing (with accessibility fallback)?
4. Should continue overlay permit one-tap spectate explicitly before timer expiry?
5. Are there planned Epic 4 features that increase always-visible tactical requirements (for example, squad coordination cues) and would alter minimal HUD scope?
6. Should color/theme contrast tuning be user-configurable at launch, or deferred to later accessibility pass?

Assumptions:

- Assumed Epic 4 allows client-UX refactor without requiring protocol/schema changes.
- Assumed anti-clutter objective prioritizes kaiju pilot play efficacy over always-visible telemetry completeness.
---
title: Epic 4 Kaiju UX Subagent Research
description: Evidence-backed UX research for Epic 4 kaiju player interface design, focused on uncluttered and high-clarity gameplay.
author: GitHub Copilot Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju
  - ux
  - hud
  - cognitive load
  - epic 4
estimated_reading_time: 15
---

## Scope

Research scope and objectives covered in this document:

* Identify all relevant current UX surfaces and gameplay data sources in kaiju UI, commander UI (comparative), docs, schema, room logic, game loop, and tests.
* Infer kaiju player core tasks and decision loops from evidence.
* Identify clutter and confusion risks with exact file and line references.
* Gather external, authoritative UX guidance for action HUDs and cognitive-load reduction.
* Propose three viable Epic 4 UX approaches:
* Minimal HUD with progressive disclosure
* Panel-heavy dashboard
* Mode-based context switcher (combat map / operations / history)
* Recommend one approach for kaiju players and anti-clutter goals.
* Provide implementation-ready information hierarchy and interaction flow.

Assumptions explicitly marked as ASSUMPTION where direct evidence is unavailable.

## Evidence Log

Code and docs reviewed:

* public/kaiju/index.html:19-155
* public/kaiju/styles.css:1-520
* public/kaiju/app.js:1-894
* public/commander/index.html:19-88
* public/commander/styles.css:1-232
* public/commander/app.js:1-515
* docs/multiplayer-game-design.md:1-341
* src/schema/MatchSchema.ts:1-798
* src/game/MatchRoom.ts:1-1016
* src/game/GameLoop.ts:1-510
* src/messages/protocol.ts:1-260
* src/game/GameLoop.test.ts:1-132
* src/game/MatchRoom.test.ts:1-697
* src/messages/protocol.test.ts:1-43
* src/schema/MatchSchema.test.ts:1-118

External sources reviewed:

* NN/g Progressive Disclosure: <https://www.nngroup.com/articles/progressive-disclosure/>
* NN/g 10 Usability Heuristics: <https://www.nngroup.com/articles/ten-usability-heuristics/>
* NN/g Minimize Cognitive Load: <https://www.nngroup.com/articles/minimize-cognitive-load/>
* W3C WCAG 2.2 Contrast Minimum (1.4.3): <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
* W3C WCAG 2.2 Non-text Contrast (1.4.11): <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
* Game Accessibility Guidelines Full List: <https://gameaccessibilityguidelines.com/full-list/>

## Current UX Surfaces

### Kaiju pilot surface

Primary kaiju HUD is currently all-panels-on-screen:

* Session controls panel: pilot, room, reconnect token, refresh, join at public/kaiju/index.html:19-36.
* Tactical map panel with Leaflet map and radar canvas at public/kaiju/index.html:38-44.
* Kaiju status panel with name/archetype/state/credits, HP bar, and distance-to-base bar at public/kaiju/index.html:46-84.
* Abilities panel with four action buttons and two cooldown meters, plus textual cooldown list at public/kaiju/index.html:86-114.
* Spectator panel toggled in spectator mode at public/kaiju/index.html:117-138.
* Pilot feed panel with event list at public/kaiju/index.html:140-142.
* Continue overlay for containment countdown and Continue action at public/kaiju/index.html:145-151.

Behavioral update loop and data rendering:

* `uiTick()` renders status, map, cooldowns, continue overlay, spectator panel every animation frame at public/kaiju/app.js:616-625.
* Attack, ability, and move interaction cadence defined by constants at public/kaiju/app.js:3-16.
* Input lock and actability logic based on `status !== "CONTAINED"` and spectator mode at public/kaiju/app.js:492-501.
* Continue overlay shown only when contained and non-spectator at public/kaiju/app.js:591-614.
* Signal feed prepends timestamped events and caps at 50 entries at public/kaiju/app.js:120-128.

Layout and density:

* Two-column desktop grid for the overall shell at public/kaiju/styles.css:34.
* Mobile collapses to one column only below 880px at public/kaiju/styles.css:508-511.
* Multiple always-visible panel sections and list surfaces (`ul`, `li`) at public/kaiju/styles.css:330-352.

### Commander surface for comparative patterns

Commander console splits concerns into explicit panels:

* Session, status, map, dispatch, signal feed, dispatch results at public/commander/index.html:19-85.
* Separate feed and dispatch-result lists at public/commander/index.html:78-85.
* Commander status is pushed via dedicated message and rendered into an explicit status grid at public/commander/app.js:363-381 and public/commander/app.js:462-463.
* Signal feed uses typewriter reveal at public/commander/app.js:332-351.

Comparative pattern observed:

* Commander UI has clear role-specific separation between operational action (dispatch), world awareness (map), and historical outcomes (results). Kaiju HUD blends immediate controls, telemetry, and history into one continuous high-density screen.

### Authoritative game-state and event sources

* Match constants and player-facing timings live in schema constants (`CREDIT_COUNT`, `CONTINUE_WINDOW_MS`, `RESPAWN_HP_FRACTION`, `TICK_MS`, ability cooldowns) at src/schema/MatchSchema.ts:746-794.
* Kaiju message contract (`kaiju.move`, `kaiju.attack`, `kaiju.ability`, `kaiju.continue`) at src/messages/protocol.ts:29-43.
* Commander status event includes cooldown readiness and progress for assets at src/messages/protocol.ts:67-76.
* Match room publishes `signal.feed`, `match.start`, `commander.status`, `commander.dispatch.result`, `kaiju.contained`, `kaiju.spectator`, `match.result` at src/game/MatchRoom.ts:768-773, 662-675, 797-809, 821-827, 861-874, 914-920, 965-972.
* Game loop enforces deterministic movement, attack range/cooldown, mitigation effects, status expiry, and win/loss checks at src/game/GameLoop.ts:42-445.

### Tests that define expected player/commander UX flows

* Contained state persistence verified across ticks at src/game/GameLoop.test.ts:85-94.
* Continue-in-window succeeds and consumes credits at src/game/MatchRoom.test.ts:401-437.
* Continue after window expiry rejected and transitions to spectator on tick at src/game/MatchRoom.test.ts:439-476.
* `kaiju.spectator` is emitted once for expiration event at src/game/MatchRoom.test.ts:481-517.
* `kaiju.contained` broadcast once per containment event at src/game/MatchRoom.test.ts:522-572.
* Commander dispatch validation, cooldown gate, and target validation tested at src/game/MatchRoom.test.ts:292-341.
* Commander status payload and dispatch result event contract tested at src/game/MatchRoom.test.ts:575-636.
* Signal timestamps non-zero for early commander join and match start at src/game/MatchRoom.test.ts:263-289.

## Kaiju Player Jobs-to-be-Done

Derived from docs plus runtime logic.

### Core jobs every few seconds

* Maintain direction toward strategic objective (base approach vs repositioning) by issuing heading changes at public/kaiju/app.js:773-795 and docs/multiplayer-game-design.md:99-101.
* Fire attack when in range and off cooldown at public/kaiju/app.js:798-806 and src/game/GameLoop.ts:88-97.
* Trigger ability when timing and archetype context are favorable, respecting cooldown and status windows at public/kaiju/app.js:809-819 and src/game/GameLoop.ts:248-316.
* Monitor survival and risk state via HP, status effects, and containment transitions at public/kaiju/app.js:461-527 and src/game/GameLoop.ts:373-395.
* Decide whether to spend scarce credit in the continue window during containment at public/kaiju/app.js:591-614, src/game/MatchRoom.ts:451-477, docs/multiplayer-game-design.md:46-56.

### Information that must remain continuously visible

High-priority (persistent):

* Own HP and status at public/kaiju/index.html:63-74 and public/kaiju/app.js:484-490.
* Attack and ability readiness at public/kaiju/index.html:96-113 and public/kaiju/app.js:551-589.
* Distance-to-base progress at public/kaiju/index.html:76-84 and public/kaiju/app.js:487-490.
* Continue countdown and credits when contained at public/kaiju/index.html:145-151 and public/kaiju/app.js:602-614.

Contextual (on-demand or transient):

* Full event history (`signalFeed`) beyond most recent few critical events at public/kaiju/index.html:140-142 and public/kaiju/app.js:120-128.
* Session/join controls after connected state at public/kaiju/index.html:19-36 and public/kaiju/app.js:688-760.
* Commander telemetry details in spectator mode only at public/kaiju/index.html:117-138 and public/kaiju/app.js:528-549.

ASSUMPTION: During active kaiju control, map detail is less decision-critical than immediate action readiness and survival telemetry because movement input is heading-based and target objective is singular (city base). This is supported indirectly by heading-only move command contract in src/messages/protocol.ts:29-31.

## Clutter Risks

Evidence-backed clutter/confusion risks in current or likely Epic 4 paths.

1. Too many simultaneously visible panels for active play.

* Active HUD can show session panel, map, status, abilities/cooldowns list, feed, and overlay layers, creating high visual competition: public/kaiju/index.html:19-151.
* NN/g warns each extra information unit competes with core signal visibility (Aesthetic and Minimalist Design heuristic): <https://www.nngroup.com/articles/ten-usability-heuristics/>.

2. Redundant cooldown representations increase scan cost.

* Cooldowns are shown as meter rows and duplicated as text list items: public/kaiju/index.html:96-114 and public/kaiju/app.js:551-589.
* This increases extraneous cognitive load per NN/g guidance on avoiding unnecessary clutter: <https://www.nngroup.com/articles/minimize-cognitive-load/>.

3. Session controls stay in primary viewport after connection.

* Join/room/token controls remain top-level panel while match is active: public/kaiju/index.html:19-36.
* Progressive disclosure guidance recommends frequently used controls in primary layer and secondary tasks deferred: <https://www.nngroup.com/articles/progressive-disclosure/>.

4. Feed can dominate attention due to prepend behavior and frequent event generation.

* Feed prepends every event, including low-criticality updates (heading changes, ability active events), up to 50 entries: public/kaiju/app.js:120-128, 795, 524.
* Rapidly changing logs can steal attention from tactical controls in real-time play.

5. Color/status signaling may rely too heavily on color and fine visual distinctions.

* Multiple state cues use color classes (`nominal/alert/critical`) and gradient bars/segments: public/kaiju/styles.css:190-209, 344-352.
* WCAG requires not relying on color alone and sufficient contrast for text and graphical indicators (1.4.1, 1.4.3, 1.4.11): <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>, <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>.

6. Spectator and active-player concerns share one page, increasing mode ambiguity risk.

* Spectator panel and action panel are toggled by class but share overall HUD framework: public/kaiju/app.js:528-549 and public/kaiju/index.html:86-138.
* Mode transitions are event-driven (`kaiju.spectator`, contained transitions), so weak visual mode distinction can cause confusion during stress transitions.

7. Potential map-vs-controls priority conflict on small screens.

* Mobile collapses to one column only; all sections become vertical stack: public/kaiju/styles.css:508-511.
* Without explicit information hierarchy for active phases, critical controls may be pushed below fold on some devices.

## External Principles

Actionable principles selected for this codebase.

1. Progressive disclosure for complex feature sets.

* Show only core, frequent controls first; hide secondary controls/history until requested.
* Keep progression to secondary layer obvious and clearly labeled.
* Source: NN/g Progressive Disclosure (<https://www.nngroup.com/articles/progressive-disclosure/>).

2. Visibility of system status with fast, comprehensible feedback.

* Immediate response after action dispatch; clear state and consequences.
* Already partially aligned by signal feed and cooldown meters; needs prioritization to avoid noise.
* Source: NN/g Heuristic #1 (<https://www.nngroup.com/articles/ten-usability-heuristics/>).

3. Recognition over recall and cognitive-load minimization.

* Keep objective, controls, and key state visible so players do not memorize hidden state.
* Remove duplicate/non-essential signals from primary view.
* Source: NN/g Heuristic #6 and cognitive-load article (<https://www.nngroup.com/articles/ten-usability-heuristics/>, <https://www.nngroup.com/articles/minimize-cognitive-load/>).

4. Aesthetic minimalist design for signal salience.

* Every permanent element must justify real-time value.
* Move setup/admin/history into secondary surfaces.
* Source: NN/g Heuristic #8 (<https://www.nngroup.com/articles/ten-usability-heuristics/>).

5. Contrast and non-color redundancy for state cues.

* Text contrast target at least 4.5:1 for normal text.
* UI components and state indicators need at least 3:1 non-text contrast.
* Avoid color-only status coding; add icon/shape/label reinforcement.
* Sources: W3C WCAG 2.2 1.4.3 and 1.4.11 (<https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>, <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>).

6. Game accessibility practical rules relevant to tactical HUDs.

* Large, well-spaced touch targets.
* No essential info outside eye-line.
* No essential information by color alone.
* Optional reduction of background movement/noise.
* Sources: Game Accessibility Guidelines full list and linked items (<https://gameaccessibilityguidelines.com/full-list/>).

## Alternatives

### Approach A: Minimal HUD with progressive disclosure

Summary:

* Always-visible strip/card for only immediate combat decisions.
* Secondary drawers/tabs for map detail, operations/setup, and full history.

Primary surface contents:

* HP and status.
* Distance-to-base.
* Attack and ability readiness.
* Credits and continue timer (when relevant).
* Left/right/attack/ability controls.

Secondary surfaces:

* Map detail panel.
* Feed/history panel.
* Session/settings panel.

Benefits:

* Strong anti-clutter fit.
* Maximizes recognition for highest-frequency choices.
* Supports mobile-first constraints.
* Closest to NN/g progressive disclosure best fit for feature-rich interfaces.

Drawbacks:

* Requires careful prioritization and event severity design.
* Advanced users may need one extra tap for secondary details.

Implementation complexity:

* Medium.
* Mostly front-end restructuring in public/kaiju/index.html and public/kaiju/app.js with minimal server contract change.

Alignment with codebase:

* High.
* Existing mode toggles, class-based hide/show, and event bus already support this pattern (public/kaiju/app.js:528-549, 591-614).

### Approach B: Panel-heavy dashboard

Summary:

* Keep most existing panels visible simultaneously, improve spacing/visual hierarchy only.

Benefits:

* Lowest short-term code churn.
* Familiar if team wants parity with commander layout style.

Drawbacks:

* High clutter risk remains.
* Mobile one-column stack likely still overloaded.
* Duplicated representations (meters + list + feed) still compete for attention.

Implementation complexity:

* Low to medium.
* Mostly CSS and minor panel ordering updates.

Alignment with codebase:

* Medium.
* Matches current architecture but conflicts with explicit anti-clutter objective.

### Approach C: Mode-based context switcher (Combat / Operations / History)

Summary:

* Explicit top-level modes.
* Combat mode focuses on action and survival.
* Operations mode for map/session/meta data.
* History mode for event feed and result context.

Benefits:

* Hard separation reduces cognitive interference.
* Clear mental model for novice and expert players.

Drawbacks:

* Mode-switching can hide critical info if not mirrored in persistent mini-strip.
* Risks increased navigation overhead in fast gameplay moments.

Implementation complexity:

* Medium to high.
* Requires robust mode-state orchestration and guardrails.

Alignment with codebase:

* Medium-high.
* Existing spectator toggle indicates viability, but active combat mode orchestration is not yet present.

## Recommended Approach

Recommended: Approach A, minimal HUD with progressive disclosure.

Rationale:

* Best fit for explicit Epic 4 goal: uncluttered high-clarity kaiju gameplay UX.
* Most aligned with observed kaiju decision cadence (heading, attack timing, ability timing, continue decision) at public/kaiju/app.js:773-829.
* Removes primary source of extraneous cognitive load without changing gameplay logic contracts.
* Preserves critical status visibility and supports accessibility principles for contrast, target salience, and non-color redundancy.
* Gives a practical migration path from current implementation using existing hide/show and message-driven state updates.

Counter-evidence considered:

* Panel-heavy approach is easier to ship short-term but does not solve the identified density problem.
* Mode-based switcher is powerful but adds interaction overhead and hidden-state risk unless carefully designed.

## Implementation Notes

### Implementation-ready information hierarchy

Level 0 (always visible during active kaiju control):

* Objective and risk:
* Distance-to-base (numeric + bar)
* HP and status badge/icon
* Action readiness:
* Attack ready/cooldown
* Ability ready/cooldown with ability label
* Immediate actions:
* Turn left
* Turn right
* Attack
* Ability
* Critical economy:
* Credits
* Continue timer only when contained

Level 1 (quick reveal drawer, one tap):

* Compact tactical map with only essential overlays.
* Top 3 priority feed messages (critical first).

Level 2 (secondary tabs or modal):

* Full history/feed.
* Session/reconnect/room controls.
* Optional diagnostics and tutorial/reminders.

Priority rules:

* Critical events preempt with short-lived banners (contained, continue expiring, match result).
* Non-critical feed items are aggregated and moved to history.
* Color is never the sole state channel; pair with text/icon shape.

### Implementation-ready interaction flow

Flow A: Active combat loop

1. Player sees Level 0 HUD with objective, HP/status, and cooldown readiness.
2. Player taps heading control; transient heading confirmation appears near controls, not in full feed.
3. Player attacks or uses ability when readiness indicator reaches ready state.
4. If damage spikes or status changes, a single high-priority banner appears for 1-2 seconds.
5. Player opens Level 1 drawer only when needing map or recent event context.

Flow B: Containment and continue decision

1. On containment event (`kaiju.contained`), gameplay controls are disabled and full-screen continue overlay appears.
2. Overlay shows credits remaining, countdown, and clear single primary action: Continue.
3. If continue succeeds, return directly to Level 0 HUD with respawn confirmation banner.
4. If window expires and credits exhausted, transition to spectator mode with explicit mode label and operations-focused view.

### File-level implementation map (if Epic 4 chooses recommendation)

* public/kaiju/index.html: split primary combat strip from secondary drawers; move session controls to collapsed operations panel.
* public/kaiju/styles.css: implement clear hierarchy tokens for priority levels, target sizes, and contrast-safe state treatments.
* public/kaiju/app.js: add view-model prioritization layer for feed severities and transient banners; remove duplicate cooldown list from primary layer.
* src/messages/protocol.ts: optional addition of feed severity categories if finer ranking needed (ASSUMPTION; not required initially).
* src/game/MatchRoom.ts: no required contract changes for core recommendation; existing events already sufficient.
* Tests: add front-end behavioral tests (if test harness exists) for panel visibility by mode and event severity ordering (ASSUMPTION: current repo lacks browser UI tests).

## Open Questions

1. Should tactical map remain visible in active combat by default, or move entirely to Level 1 drawer?
2. Is quick heading adjustment expected to be high-frequency enough to justify gesture controls, or should it stay button-only for clarity and accessibility?
3. Should the pilot feed in active mode show only critical+alert by default, with nominal events silently logged to history?
4. Should commander-style typewriter feed effects be reused for kaiju, or would that increase distraction in fast combat?
5. Are there product requirements for parity between commander and kaiju visual language, or can kaiju diverge strongly for cognitive clarity?
6. What is the minimum supported mobile viewport width and orientation policy for Epic 4?
7. Should continue overlay permit a short post-failure review state before spectator transition, or remain immediate?
8. Should players be allowed to customize HUD density (compact vs expanded) as an accessibility option in Epic 4?
