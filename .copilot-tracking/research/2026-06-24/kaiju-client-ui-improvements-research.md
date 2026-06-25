<!-- markdownlint-disable-file -->
---
title: Kaiju Client UI Improvements Research
description: Research and recommended approach for hiding reconnect tokens, enabling WASD controls, showing live kaiju map movement, and replacing tab-switching with an integrated HUD.
author: GitHub Copilot Task Researcher
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju
  - ui
  - controls
  - colyseus
  - hud
estimated_reading_time: 10
---

## Task Implementation Requests

* Hide reconnect token from the kaiju player UI.
* Support kaiju control via WASD instead of turn-left/turn-right buttons.
* Make kaiju movement visible on the map grid in the kaiju UX.
* Show map and key details simultaneously without tab switching.

## Scope and Success Criteria

* Scope: Analyze current implementation and produce a decisive implementation path across kaiju web client and relevant server contracts.
* Assumptions:
  * Existing server movement contract remains heading-based unless a deliberate protocol change is approved.
  * Reconnect must continue to work with stored token flow.
  * Containment and spectator restrictions must remain unchanged.
* Success Criteria:
  * One selected approach with rationale and migration steps.
  * File-level change plan with concrete function/element targets.
  * Risks and validation checklist for implementation.

## Outline

1. Current-state evidence and constraints.
2. Alternatives analysis for WASD mapping.
3. Selected approach and implementation impact.
4. Validation and risk controls.

## Potential Next Research

* Validate browser-level key-input test strategy (unit-only vs browser integration).
  * Reasoning: Current repo tests are primarily server/core TypeScript tests.
  * Reference: src/game/GameLoop.test.ts
* Confirm mobile fallback preference for directional controls.
  * Reasoning: WASD keyboard support does not address touch-first players alone.
  * Reference: public/kaiju/index.html

## Research Executed

### File Analysis

* public/kaiju/index.html
  * Exposes reconnect token field directly in UI: lines 33-35.
  * Uses context tab buttons and panel switching model: lines 19-25, 44-50, 155-158.
  * Uses Turn Left / Turn Right controls: lines 100-103.
* public/kaiju/app.js
  * Reads reconnect token from visible input for join payload: lines 739-743.
  * Writes server-issued token back to visible input and localStorage: lines 828-832.
  * Restores token from localStorage into visible input on init: lines 958-963.
  * Movement path is heading delta and throttled send: lines 838-872, 938-939.
  * Map is already rendered from room state but hidden by panel context behavior: lines 130-151, 358-478, 692-700.
* public/kaiju/styles.css
  * Context switcher and hidden-panel patterns drive tabbed UX: lines 51-71, 386-388.
  * Existing map shell styles are already suitable for always-visible embedding: lines 394-435.
* src/messages/protocol.ts
  * kaiju.move contract validates numeric heading only: lines 28-31, 222-228.
* src/game/MatchRoom.ts
  * kaiju.move handler applies heading directly, with spectator/contained protections: lines 294-297, 379-383.
  * reconnectToken join option and reclaim flow are already supported: lines 172-178, 531-566.
* src/game/GameLoop.ts
  * Authoritative movement is heading-driven per tick using trig integration: lines 42-63.
* public/commander/app.js
  * Strong map rendering patterns reusable in kaiju HUD (projection, heading indicator, labels): lines 87-98, 183-233, 257-287.

### Project Conventions

* Repository memory confirms reconnect flow should stay token-based and not regress to player-name reclaim.
  * Source: /memories/repo/kaiju-arcade-notes.md:6

## Key Discoveries

### Project Structure

* The required UX improvements are primarily client-side in public/kaiju/*.
* Server-side movement and reconnect contracts already support a robust implementation without required backend protocol changes.

### Implementation Patterns

* Kaiju movement is currently rotational input mapped to heading updates.
* Map rendering already reflects true state positions; visibility issue is layout/context gating rather than data synchronization.
* Reconnect token lifecycle already works silently via localStorage and join options if UI coupling is removed.

### API and Schema Documentation

* Existing kaiju movement wire format: `kaiju.move` with `{ heading: number }`.
* Existing reconnect flow: `kaiju.reconnect.token` message and join option `reconnectToken`.

## Technical Scenarios

### Scenario 1: WASD As Rotation Aliases (Not Selected)

Map keys to current turn model (`A`/`D` rotate heading, `W` resend heading).

Requirements:

* No server changes.
* Minimal UI refactor.

Preferred Approach:

* Rejected.

Implementation Details:

* Very low risk but preserves the awkward rotational feel the request explicitly wants to replace.
* `S` key remains ambiguous and user expectations are not met.

#### Considered Alternatives

* Rejected due to poor UX fidelity to directional WASD intent.

### Scenario 2: Client Vector-to-Heading Translation (Selected)

Track pressed keys (`W/A/S/D`), compute direction vector, convert to heading, and send heading through existing protocol.

Requirements:

* Keep `kaiju.move` payload shape unchanged.
* Preserve existing movement throttling and contained/spectator blocks.
* Provide both keyboard and touch-friendly directional controls.

Preferred Approach:

* Selected.

```text
public/kaiju/index.html
public/kaiju/styles.css
public/kaiju/app.js
```

Implementation Details:

* Replace turn buttons with directional controls and keyboard listeners.
* Refactor movement sender to accept absolute heading input derived from key vector.
* Continue using existing send interval (`MOVE_SEND_INTERVAL_MS`) and queued behavior.
* Keep server untouched because it already consumes heading deterministically.

#### Considered Alternatives

* Outperforms rotation-alias approach on UX quality while keeping backend risk low.

### Scenario 3: Protocol Extension For Directional Intent (Not Selected For Now)

Extend protocol and server handler to accept explicit directional vectors.

Requirements:

* Update protocol validators, server handlers, and tests.
* Maintain backward compatibility during transition.

Preferred Approach:

* Deferred.

Implementation Details:

* Architecturally clean for long-term movement richness.
* Higher complexity and rollout risk than needed for immediate UX goals.

#### Considered Alternatives

* Keep as phase-2 option if playtesting shows heading translation is insufficient.

## Selected Approach and Rationale

Select Scenario 2: client-side directional-vector translation to heading, plus integrated HUD layout and hidden reconnect token UX.

Rationale:

* Delivers requested UX behavior quickly.
* Avoids cross-layer protocol churn.
* Leverages existing authoritative server movement model.
* Preserves reconnect reliability while removing sensitive/irrelevant user-facing token display.

## Concrete Change Plan By File

* public/kaiju/index.html
  * Remove reconnect token input block.
  * Remove tab context switcher UI.
  * Replace `moveLeftButton`/`moveRightButton` with directional button cluster (`moveUpButton`, `moveDownButton`, `moveWestButton`, `moveEastButton`) while preserving attack/ability controls.
  * Keep map panel present in always-visible layout.
* public/kaiju/styles.css
  * Remove tabbed-context dependency for primary flow.
  * Define integrated grid layout that shows map, status, controls, and feed concurrently.
  * Keep responsive behavior for small screens by stacking panels rather than hiding map/feed.
* public/kaiju/app.js
  * Replace reconnect token DOM dependency with storage-backed hidden flow.
  * Remove context panel switching logic and map-only toggles.
  * Add key-state manager for WASD (optionally arrows).
  * Add `computeHeadingFromVector()` and call `sendMoveHeading(heading)` through existing throttle window.
  * Optionally reuse commander map heading-line drawing in kaiju map overlay for clearer movement feedback.
* src/messages/protocol.ts
  * No required change for selected approach.
* src/game/MatchRoom.ts
  * No required change for selected approach.

## Validation Checklist

* Reconnect token is not visible anywhere in kaiju UI.
* Join still reuses token from storage when available.
* WASD changes movement direction as expected across cardinal and diagonal presses.
* Inputs remain blocked in `CONTAINED` and spectator modes.
* Kaiju avatar position visibly updates on map while moving.
* Map, status, controls, and feed are simultaneously visible without tab switching.
* Existing attack, ability, continue flows are unchanged.
* Mobile layout remains usable with on-screen directional controls.

## Risks

* Keyboard repeat jitter can over-send movement updates if thresholding is not tuned.
* Directional interpretation may feel inconsistent if diagonals are not normalized.
* Denser integrated layout can reduce readability on narrow viewports.

## Graphics Library Decision (PixiJS)

Question: Should this project adopt a graphics library like PixiJS for the tactical graphics layer?

### Evidence From Current Codebase

* Both clients already use a stable Leaflet + Canvas overlay model.
  * Commander map + overlay wiring: public/commander/index.html:8-9, public/commander/index.html:61-63.
  * Kaiju map + overlay wiring: public/kaiju/index.html:8-9, public/kaiju/index.html:46-48.
* Both implementations are explicitly tied to Leaflet projection helpers (`gameToLatLng`, `latLngToContainerPoint`).
  * Commander projection path: public/commander/app.js:87-98.
  * Kaiju projection path: public/kaiju/app.js:330-354.
* Rendering is already frame-loop driven and workable for current entity scale.
  * Commander loop: public/commander/app.js:100-255.
  * Kaiju loop: public/kaiju/app.js:386-447 and public/kaiju/app.js:692-700.
* Frontend rendering has limited automated browser test coverage today.
  * Jest config is Node-focused: jest.config.js:2-4.
* PixiJS is not currently a dependency.
  * package.json:31-38.

### Evaluated Options

1. Stay on current Leaflet + Canvas overlays.
2. Hybrid model: Leaflet base map with PixiJS rendering overlay.
3. Full PixiJS replacement for map and overlay scene.

### Option Assessment

1. Stay current stack
* Pros: Lowest risk, zero migration overhead, preserves current map/projection behavior.
* Cons: Less ergonomic path for richer VFX and complex sprite composition over time.

2. Hybrid Leaflet + PixiJS
* Pros: Incremental adoption, better rendering headroom, keeps current map foundation.
* Cons: Medium complexity from running two rendering lifecycles and event models.

3. Full PixiJS scene replacement
* Pros: Maximum long-term rendering flexibility in one engine.
* Cons: Highest risk and cost now, requires rebuilding map semantics and stronger browser-level testing.

### Recommendation

Do not adopt a full PixiJS rewrite right now.

For this repo's immediate goals (WASD controls, integrated kaiju HUD, visible movement on map, hidden reconnect token), stay on the current Leaflet + Canvas stack. It is already sufficient and has a lower delivery risk.

If later gameplay needs demand richer effects or significantly more entities, run a small hybrid PixiJS pilot first in one tactical view and decide based on measured outcomes (mobile frame time, implementation complexity, and maintainability).

### Decision Summary

* Near term: keep current graphics stack.
* Mid term: consider hybrid PixiJS pilot only when there is a measurable rendering need.
* Long term: consider full PixiJS only after hybrid evidence shows clear value.

## Implementation Guidance

Proceed with a client-first implementation in public/kaiju/* using Scenario 2. Keep protocol/server untouched for this iteration. After release, evaluate whether explicit directional protocol support is needed based on playtesting feedback.
