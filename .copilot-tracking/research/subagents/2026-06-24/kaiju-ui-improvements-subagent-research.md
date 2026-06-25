---
title: Kaiju UI Improvements Subagent Research
description: Implementation-focused research on kaiju client UI/input architecture improvements for reconnect secrecy, WASD movement, tactical map visibility, and integrated layout.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju
  - ui
  - input
  - websocket
  - movement
estimated_reading_time: 12
---

## Scope

This note analyzes the kaiju client UI/input architecture and proposes implementation-ready improvements within current server contracts.

Assumptions:

* Research-only output for this pass. No product code changes are applied.
* Existing Colyseus room event names should remain stable unless explicitly versioned.
* Target behavior should preserve current containment, spectator, and continue mechanics.
* Tactical map remains a read-oriented situational view, not click-to-move.

## Research Questions

* Hide reconnect token from end-user while preserving reconnect capability.
* Replace turn-left/turn-right controls with WASD movement model.
* Ensure kaiju avatar movement is visible on tactical map/grid from kaiju client perspective.
* Eliminate context-tab switching between session/map/feed/details with a single integrated layout.

## Evidence Log

### Current frontend implementation

* Context-tab architecture is explicit in markup: separate Session, Map, Feed buttons and hidden panels.
  * public/kaiju/index.html:19-25
  * public/kaiju/index.html:44-50
  * public/kaiju/index.html:155-158
* Reconnect token is exposed as a visible editable input in Session panel.
  * public/kaiju/index.html:33-35
* Movement controls are two heading-delta buttons labeled Turn Left / Turn Right.
  * public/kaiju/index.html:100-103
* CSS enforces context-switcher tab strip and hidden-panel model.
  * public/kaiju/styles.css:51-71
  * public/kaiju/styles.css:386-388
  * public/kaiju/styles.css:639-644
* Kaiju app binds reconnect token input, context buttons, and panel references in top-level state wiring.
  * public/kaiju/app.js:48-57
  * public/kaiju/app.js:130-151
* Join flow reads reconnect token from visible input and submits it in join reservation payload.
  * public/kaiju/app.js:739-749
* Reconnect token is received from server and then both displayed in input and stored in localStorage.
  * public/kaiju/app.js:828-832
* On initialization, reconnect token is loaded from localStorage back into visible input.
  * public/kaiju/app.js:958-963
* Movement client model is heading-delta only: throttled sends with queued move delta and +-18 degree turns.
  * public/kaiju/app.js:4-5
  * public/kaiju/app.js:35-37
  * public/kaiju/app.js:838-872
  * public/kaiju/app.js:938-939
* Map rendering already exists in kaiju client and is fed by room state, but map panel is hidden unless selected via context tab.
  * public/kaiju/app.js:358-384
  * public/kaiju/app.js:386-447
  * public/kaiju/app.js:449-478
  * public/kaiju/app.js:692-700
  * public/kaiju/index.html:44-50
  * public/kaiju/styles.css:394-435

### Server/message constraints

* Join supports reconnectToken option for kaiju, used to reclaim grace window slot.
  * src/game/MatchRoom.ts:172-178
  * src/game/MatchRoom.ts:531-566
* Server issues reconnect tokens via kaiju.reconnect.token event.
  * src/game/MatchRoom.ts:632-644
  * src/messages/protocol.ts:138-143
* Kaiju movement message contract currently validates only numeric heading.
  * src/messages/protocol.ts:28-31
  * src/messages/protocol.ts:222-228
* MatchRoom applies kaiju.move by setting heading directly, with guardrails for spectator/contained.
  * src/game/MatchRoom.ts:294-297
  * src/game/MatchRoom.ts:379-383
* Actual server motion is heading-driven per tick (cos/sin integration), bounded to map limits.
  * src/game/GameLoop.ts:42-63
* Contained state blocks movement and status-expiry logic excludes CONTAINED from generic reset.
  * src/game/GameLoop.ts:46-48
  * src/game/GameLoop.ts:337-347
* Signal timestamps already have defensive fallback when metadata.now is zero.
  * src/schema/MatchSchema.ts:332-340

### Reusable commander map patterns

* Commander map has robust projection/render loop: MAP_BOUNDS, gameToLatLng/gameToPixel, requestAnimationFrame radar loop.
  * public/commander/app.js:33-63
  * public/commander/app.js:87-98
  * public/commander/app.js:100-255
* Commander map draws richer leviathan visualization than kaiju map, including heading indicator and labels.
  * public/commander/app.js:183-233
* Commander map state refresh on room state change keeps display in sync without extra message type.
  * public/commander/app.js:257-287
  * public/commander/app.js:581-587

## Architectural Analysis

### Reconnect token exposure

Current behavior reveals the reconnect token in plain text and keeps it user-editable. This is high-friction UX and leaks a session recovery artifact in normal UI flow.

Key observation: recovery already works through localStorage + join payload; visible input is not required for the core mechanism.

### Movement model mismatch

Current UI is rotational (left/right heading increments), while requested UX is directional (WASD). Because server simulation consumes heading and performs forward integration each tick, any WASD model must map to heading and potentially autopilot forward intent.

### Tactical visibility

Kaiju map is implemented but hidden behind tab context switching. Visibility issue is primarily layout and activation, not missing data plumbing.

### Context-switching overhead

Session/Map/Feed are mutually exclusive context panels. For an action loop, this imposes avoidable mode switches and hides map/feed at decision points.

## Movement Input Alternatives

### Alternative 1: Heading-based only (WASD as rotate/advance aliases, no protocol change)

Design:

* Map `A` to `sendMove(-step)` and `D` to `sendMove(+step)`.
* Map `W` to resend current heading at throttle interval (maintain forward intent semantics on client side only).
* Map `S` to optional no-op or reduced send cadence (cannot move backward under current protocol without additional rules).

Pros:

* Zero protocol/server changes.
* Fastest implementation and lowest regression risk.
* Preserves current anti-spam throttle path.

Cons:

* Not true directional WASD. Still rotational model under the hood.
* `S` semantics are weak or unintuitive.
* User expectation mismatch remains for cardinal-direction control.

### Alternative 2: Directional-vector translation to heading (client translation, no protocol change)

Design:

* Track key state for `W/A/S/D`.
* Build vector $(x, y)$ from pressed keys each animation frame.
* Convert vector to heading with $\theta = \mathrm{atan2}(y, x)$ and send normalized degrees via existing `kaiju.move` heading contract.
* Send only when heading changes beyond threshold or heartbeat interval.

Pros:

* Preserves current server contract (`heading: number`).
* Delivers intuitive directional feel from player perspective.
* Supports diagonals naturally.

Cons:

* Still no explicit backward/strafe semantics server-side; all motion remains forward along heading.
* Requires careful debouncing to avoid chatty move traffic.
* Needs clear UX messaging for keyboard hold behavior.

### Alternative 3: Server protocol extension (directional intent message)

Design:

* Extend protocol to accept directional intent payload such as `{ moveX, moveY }` or `{ direction, magnitude }`.
* Update validator and MatchRoom handler to compute heading/speed or direct displacement.
* Optionally maintain backward-compatible handling for legacy heading messages.

Pros:

* Clean semantic model for true WASD intent.
* Enables richer movement features later (strafe, analog, accessibility remaps).
* Explicit contract reduces client-side inference hacks.

Cons:

* Highest complexity and migration risk.
* Requires coordinated updates across protocol types, validators, server handlers, and tests.
* Potential replay/determinism considerations if movement semantics evolve beyond heading.

## Recommendation

Choose Alternative 2 now: directional-vector translation to heading, with no protocol change.

Rationale:

* It satisfies the WASD requirement with meaningful directional control behavior while staying within current authoritative server model.
* It avoids cross-layer contract churn, enabling rapid rollout and easier rollback.
* It keeps deterministic server tick behavior untouched.

Secondary recommendation:

* Keep protocol extension (Alternative 3) as phase-2 only if playtesting shows directional fidelity gaps that cannot be solved with client translation and heading-rate tuning.

## Migration Steps

1. Remove reconnect token visibility from session UI while preserving localStorage and auto-attach on join.
2. Replace turn-left/turn-right buttons with WASD-oriented control surface (onscreen + keyboard listeners).
3. Implement vector-to-heading translation in kaiju client and route through existing `sendMove` throttle path.
4. Convert tabbed context panels into integrated dashboard layout where map, status, feed, and controls are simultaneously visible.
5. Ensure tactical map starts visible on load and always updates from `onStateChange`.
6. Reuse commander heading-indicator overlay style on kaiju map for clearer self/others movement readability.

## Concrete Code-Change Plan

### public/kaiju/index.html

* Remove or replace visible reconnect token label/input block.
  * Current block: lines 33-35.
* Replace context switcher section with integrated layout containers.
  * Current section: lines 19-23.
* Replace `moveLeftButton` / `moveRightButton` controls with directional buttons.
  * Current controls: lines 101-103.
* Keep existing map container IDs (`spectatorLeafletMap`, `spectatorRadarOverlay`) to minimize JS churn.

### public/kaiju/styles.css

* Remove reliance on `.context-switcher`, `.context-button`, `.hidden` for primary workflow.
  * Existing: 51-71, 386-388, 639-644.
* Create integrated responsive grid zones for:
  * always-on tactical map
  * status + controls
  * live feed
* Retain existing map shell and overlay styles as base.
  * Existing: 394-435.

### public/kaiju/app.js

* Reconnect handling:
  * Remove dependency on visible `reconnectTokenEl` DOM input.
  * Continue reading/writing `kaijuReconnectToken` in localStorage.
  * Update `joinOptions` assembly to use stored token (and optional in-memory token) without exposing it in UI.
  * Affected regions: 48-57, 739-743, 828-832, 958-963.
* Input model:
  * Replace `moveLeftButtonEl` / `moveRightButtonEl` bindings with WASD key state manager.
  * Add `keydown`/`keyup` listeners and directional button handlers for touch.
  * Add `computeHeadingFromInputVector()` helper.
  * Route calculated heading into existing `sendMove(heading)` path refactor.
  * Affected regions: 71-73, 849-872, 938-939.
* Map visibility:
  * Remove context panel toggling or make it no-op under integrated layout.
  * Ensure `resizeSpectatorMap()` and render loop run under always-visible conditions.
  * Affected regions: 130-151, 692-700, 944-949, 966-970.
* Map rendering upgrade:
  * Port commander-style heading indicator line and labels into kaiju draw loop.
  * Current kaiju map loop location: 386-447.
  * Reuse pattern source: public/commander/app.js:183-233.

### src/messages/protocol.ts

* No required change for recommended approach (Alternative 2).
* Optional future extension path for Alternative 3:
  * Extend `KaijuMoveMessage` and validator (`validateKaijuMove`) while preserving backward compatibility.
  * Current constraints: 28-31, 222-228.

### src/game/MatchRoom.ts

* No required change for recommended approach.
* Preserve existing heading assignment handler.
  * 379-383.

### src/game/GameLoop.ts

* No required change for recommended approach.
* Existing movement integration remains authoritative.
  * 42-63.

## Risks And Validation

### Risks

* Input flood risk from key repeat or vector jitter causing excessive `kaiju.move` traffic.
* Directional feel mismatch if heading update threshold too coarse.
* Mobile control discoverability regressions if keyboard-first implementation is not mirrored with touch controls.
* Integrated layout may increase visual density on small screens if hierarchy is not tuned.

### Manual QA checklist

* Reconnect token is never shown in visible kaiju UI.
* Refresh/reload still reconnects using persisted token path.
* Join flow succeeds with and without token present in storage.
* `W/A/S/D` control updates movement intent; heading changes match directional expectation.
* Existing attack/ability/continue interactions remain functional.
* Tactical map is visible without tab switching and shows live kaiju movement.
* Feed remains visible concurrently with map and controls.
* Spectator transition still locks inputs and updates spectator panel state.
* Mobile viewport layout remains usable with integrated panel arrangement.

### Suggested automated tests

* Client unit tests for input translation:
  * vector-to-heading conversion edge cases (cardinal + diagonal).
  * send throttling behavior under sustained keydown.
* Protocol contract tests (if Alternative 3 is later implemented):
  * validator compatibility for old heading-only payload and new directional payload.
* Integration test around reconnect token UX:
  * token persisted and consumed without being rendered in editable form.

## Decisive Implementation Direction

Implement Alternative 2 with integrated layout modernization and hidden reconnect token management. This delivers the requested UX outcomes with minimal backend risk and a clear incremental path to protocol evolution if future playtesting warrants it.
