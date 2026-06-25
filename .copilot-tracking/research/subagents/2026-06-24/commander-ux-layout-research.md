---
title: Commander UX Layout Research
description: Evidence-based analysis of the current commander UX and implementation-ready options for a no-scroll, map-centered HUD.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju-arcade
  - commander
  - ux
  - layout
  - hud
estimated_reading_time: 10
---

## Scope

Research objective coverage:

1. Identify all commander UX-relevant files, including docs and tests.
2. Capture current layout structure and why it trends toward linear flow and vertical scrolling.
3. Locate feed panel, timeline panel, command status panel, and action wiring.
4. Determine current status metrics behavior, including why barriers has a count while others do not.
5. Propose implementation-ready no-scroll map-centered HUD changes with viable alternatives.
6. Identify risks/regressions and provide a quick validation checklist.

## Relevant Files

### Primary commander UX implementation

- public/commander/index.html
- public/commander/styles.css
- public/commander/app.js

### Server/state contracts that drive commander UX

- src/messages/protocol.ts
- src/game/MatchRoom.ts
- src/game/GameLoop.ts
- src/schema/MatchSchema.ts

### Tests/documents affecting commander UX behavior or acceptance

- src/index.test.ts
- src/game/MatchRoom.test.ts
- docs/multiplayer-game-design.md

## Current Layout Structure and Why It Causes Linear Flow Scrolling

### Structure today

Commander UI is one long document flow of panel sections in a 2-column grid:

```html
<main class="console-shell">
  <header class="console-header">...</header>
  <section class="panel controls-panel">...</section>
  <section class="panel status-panel">...</section>
  <section class="panel map-panel">...</section>
  <section class="panel dispatch-panel">...</section>
  <section class="panel feed-panel">...</section>
  <section class="panel feed-panel">...</section>
  <section class="panel feed-panel">...</section>
</main>
```

Evidence:

- `console-shell` contains all panels in sequence: public/commander/index.html:13-106
- Grid is `repeat(2, 1fr)` with normal document flow placement: public/commander/styles.css:31-37
- Map spans both columns but still occupies one row in flow: public/commander/styles.css:207-212
- Three feed-like panels are additional rows after map/dispatch: public/commander/index.html:82-105

### Why scrolling/linear scan emerges

1. Height stacking pressure:
   - Header + controls + status + map(420px) + dispatch + feed + timeline + dispatch results stack vertically in grid rows.
   - Map wrapper alone is fixed at 420px: public/commander/styles.css:232-236.
2. Every list has independent internal scrolling:
   - `ul { max-height: 220px; overflow: auto; }`: public/commander/styles.css:181-187.
   - This creates nested scroll containers while page itself can still overflow.
3. Mobile collapses to single column:
   - `@media (max-width: 880px) .console-shell { grid-template-columns: 1fr; }`: public/commander/styles.css:274-277.
   - All panels become a full linear column requiring substantial page scroll.
4. Timeline duplicates feed-like behavior and consumes full panel footprint:
   - `MATCH TIMELINE` section with elapsed/ETA and list: public/commander/index.html:87-100.

## Panel and Wiring Map

### Command status panel

HTML targets:

- `#cityBaseHp`, `#commanderScore`, `#activeBarriers`, `#selectedTarget`: public/commander/index.html:41-55

Rendered by JS:

```js
cityBaseHpEl.textContent = String(payload.cityBaseHp);
commanderScoreEl.textContent = String(payload.commanderScore);
activeBarriersEl.textContent = String(payload.activeBarriers);
selectedTargetEl.textContent = payload.selectedLeviathanId || "NONE";
```

Evidence: public/commander/app.js:470-476.

### Feed panel

HTML:

- `#signalFeed`: public/commander/index.html:82-85.

Wiring:

- Room message listener: `room.onMessage("signal.feed", ...)`: public/commander/app.js:589-591.
- Append flow with typewriter reveal and 40-entry cap:
  - prepend + trim: public/commander/app.js:443-446
  - typewriter: public/commander/app.js:447-455

### Timeline panel

HTML:

- `#matchElapsed`, `#etaToBase`, `#timelineFeed`: public/commander/index.html:91-100.

Wiring:

- Timer updates every second: public/commander/app.js:698-700.
- Timeline entries appended from multiple paths:
  - `appendTimelineEntry(...)`: public/commander/app.js:348-359
  - also called from `appendSignal`: public/commander/app.js:457
  - selection logs add `TARGET LOCK ...`: public/commander/app.js:529
  - match start logs: public/commander/app.js:601
- ETA is UI-side estimate from nearest non-contained leviathan distance, not server field:
  - `computeNearestThreatEtaSeconds()`: public/commander/app.js:361-387
  - consumed by `renderTimeline()`: public/commander/app.js:389-402

### Command actions (dispatch + targeting)

Action buttons and target selector:

- Buttons: `button[data-asset]` in dispatch panel: public/commander/index.html:73-78
- Target select: `#targetId`: public/commander/index.html:70-72

Wiring:

- Button clicks call `sendDispatch(button.dataset.asset)`: public/commander/app.js:649-653
- `sendDispatch` emits:
  - optional `commander.select`: public/commander/app.js:622-625
  - `commander.dispatch`: public/commander/app.js:627-630
- Dropdown target change calls `selectTarget(..., "dropdown")`: public/commander/app.js:655-660
- Map click near blip calls `selectTarget(..., "map")`: public/commander/app.js:662-686

## Status Metrics Behavior and Barrier Count Explanation

### Commander status payload contract

Protocol defines only these top-level metrics:

- `selectedLeviathanId`
- `assetsRemaining`
- `assetCooldownsMsRemaining`
- `assetCooldownsReady`
- `assetCooldownsProgress`
- `activeBarriers`
- `commanderScore`
- `cityBaseHp`

Evidence: src/messages/protocol.ts:74-85.

### Why barriers has a count while others do not

Server computes `activeBarriers` from current barrier entities:

```ts
activeBarriers: this.state.activeBarriers.length
```

Evidence: src/game/MatchRoom.ts:805.

Barrier lifecycle is explicit, countable, and time-bounded:

- Created only by `Raise Barrier` resolve path:
  - `const barrier = state.createBarrier(now, now + 8_000);`
  - `state.activeBarriers.push(barrier);`
  - src/game/GameLoop.ts:190-193
- Expired barriers removed each tick:
  - remove when `now >= barrier.expiresAt`
  - src/game/GameLoop.ts:350-362

By contrast:

- `commanderScore` is scalar aggregate, not inventory.
- `selectedLeviathanId` is single target id.
- Other assets are represented as per-asset maps (`assetsRemaining`, cooldown maps), rendered in dispatch status list, not as one summary count:
  - public/commander/app.js:477-488.

### Current inconsistency perception source

User-visible status grid mixes one aggregate counter (`BARRIERS`) with unrelated scalar/context fields (`BASE HP`, `SCORE`, `SELECTED TARGET`) while deeper asset data appears separately in list format. This split creates a semantic mismatch in the "COMMAND STATUS" pane.

Evidence:

- status grid fields: public/commander/index.html:39-55
- per-asset details in separate `#assetStatus`: public/commander/index.html:79 and public/commander/app.js:477-488

## Implementation-Ready No-Scroll Map-Centered HUD Proposals

Target intent:

- Map remains central visual anchor.
- Controls move to corners/bottom around map frame.
- Feed becomes map overlay.
- Timeline removed from user-facing layout.
- Status pane uses consistent semantics.

### Alternative A: Absolute-overlay HUD around a fixed map viewport (recommended)

Concept:

- Convert main shell to full-viewport container with one map stage.
- Place HUD cards as absolute overlays anchored to corners and bottom strip.
- Keep only one page-level viewport (`height: 100dvh; overflow: hidden`) and move list scrolling to bounded overlay internals.

Implementation sketch:

1. HTML restructure in public/commander/index.html:
   - Create `section.map-stage` as primary container.
   - Move `#leafletMap` and `#radarOverlay` inside.
   - Add overlay groups:
     - top-left: session/connect compact card
     - top-right: command status card
     - bottom-right: dispatch buttons + target select
     - bottom-left: signal feed overlay
   - Remove timeline section from DOM (or hide behind debug flag).
2. CSS in public/commander/styles.css:
   - `.console-shell` -> `height: 100dvh; width: 100vw; margin: 0; overflow: hidden;`
   - `.map-stage` -> `position: relative; height: 100%;`
   - `.hud-card` -> `position: absolute; backdrop-filter + translucency`
   - mobile breakpoints keep overlays docked but compact (collapsible rows).
3. JS in public/commander/app.js:
   - Keep existing listeners; no protocol changes needed.
   - Remove timeline append side-effects:
     - stop calling `appendTimelineEntry(...)` in `appendSignal` and target select.
   - Keep elapsed/ETA optionally as tiny inline status if desired.
4. Tests updates:
   - `src/index.test.ts` currently asserts `id="timelineFeed"` exists: src/index.test.ts:143.
   - Update assertion to new expected structure/ids.

Pros:

- Strongly map-centered and no-scroll by construction.
- Minimum backend change risk.
- Retains current event wiring and contracts.

Cons:

- Requires careful responsive tuning for smaller screens.
- Overlay density can occlude map if card sizing is not controlled.

### Alternative B: CSS grid "frame" layout (map center area + fixed side/bottom rails)

Concept:

- Use CSS grid template areas with center map and surrounding rails.
- Example areas: `status map dispatch` on first row, `feed map controls` on second.
- Timeline removed from primary grid.

Implementation sketch:

1. Keep most existing sections but assign area classes.
2. Define fixed viewport grid in CSS with `height: 100dvh` and `overflow: hidden`.
3. Constrain feed/dispatch internals with `max-height` and internal scroll.
4. Keep map always occupying central area.

Pros:

- Easier maintainability than absolute coordinates.
- Better deterministic placement and less overlap risk.

Cons:

- Less visually "overlay"/diegetic than map-HUD style.
- On narrow widths, still likely to degrade into stacked rails unless aggressively redesigned.

### Recommendation

Recommend Alternative A (absolute-overlay HUD).

Rationale:

1. Best fit for requested "map central, controls corner/bottom, feed overlay" behavior.
2. Can be implemented with mostly front-end-only changes and minimal contract churn.
3. Lets timeline be removed cleanly without affecting server message contracts.
4. Preserves existing map interactions (click-to-target) and dispatch wiring as-is.

## Suggested Status Pane Clarification

To fix consistency mismatch:

Option 1 (preferred): rename and normalize as "TACTICAL STATUS" with only scalar tactical snapshot fields:

- `BASE HP`
- `COMMANDER SCORE`
- `ACTIVE BARRIERS`
- `CURRENT TARGET`

Keep per-asset inventory/cooldowns exclusively in "DISPATCH CONTROL" card.

Option 2: include unified "ASSETS READY / TOTAL" aggregate in status pane and keep detailed asset list in collapsible drawer.

No protocol changes are required for either option.

## Risks and Regressions

1. Test regression:
   - `src/index.test.ts` currently requires timeline ids in HTML: src/index.test.ts:141-143.
2. Information loss risk:
   - Timeline currently receives entries from multiple actions/signals; removing it without preserving key events in feed may reduce operator auditability.
   - Evidence: public/commander/app.js:348-359, 457, 529, 601.
3. Overlay collision risk on small viewports:
   - Absolute cards can overlap map markers and each other if not breakpoint-tuned.
4. Accessibility risk:
   - Feed/status overlays on map background can reduce readability/contrast if opacity is too low.
5. Behavior coupling risk:
   - `appendSignal` currently writes to both feed and timeline. If timeline is removed, code path must avoid orphan calls.

## Quick Validation Checklist

1. Layout and scroll
   - Page uses one viewport, no body scroll at 1280x720 and 1920x1080.
   - Mobile (<=880px) remains usable without long vertical stacking.
2. Map interactions
   - Click-near-blip target selection still works.
   - Radar overlay still sizes correctly on resize.
3. Status correctness
   - `BASE HP`, `SCORE`, `ACTIVE BARRIERS`, `CURRENT TARGET` update from `commander.status`.
   - `ACTIVE BARRIERS` increments after `Raise Barrier` resolves and decrements after ~8s expiry.
4. Feed and dispatch behavior
   - `signal.feed` messages continue with severity classes and typewriter effect.
   - `commander.dispatch.result` entries still appear once per resolved dispatch.
5. Regression tests
   - Update/replace timeline scaffold assertions in `src/index.test.ts`.
   - Keep `src/game/MatchRoom.test.ts` commander status and dispatch-result contract tests passing.

## Open Questions

1. Should timeline be fully removed from DOM, or retained behind a debug toggle for operators/developers?
2. For mobile commander use, should overlays collapse to tabs/drawer, or remain always visible with compact cards?
3. Do you want to keep elapsed/ETA metrics in a compact status line, or remove them entirely from user-facing UI?

## Key Evidence Snippets

### Status and action wiring

```js
room.onMessage("signal.feed", (payload) => {
  appendSignal(payload);
});

room.onMessage("commander.status", (payload) => {
  renderCommanderStatus(payload);
});

document.querySelectorAll("[data-asset]").forEach((button) => {
  button.addEventListener("click", () => {
    sendDispatch(button.dataset.asset);
  });
});
```

Source: public/commander/app.js:589-595, 649-653.

### Timeline side effects

```js
appendTimelineEntry(entry.message);
```

Source: public/commander/app.js:457.

### Barrier count source

```ts
activeBarriers: this.state.activeBarriers.length,
```

Source: src/game/MatchRoom.ts:805.

### Barrier lifecycle

```ts
const barrier = state.createBarrier(now, now + 8_000);
state.activeBarriers.push(barrier);
```

Source: src/game/GameLoop.ts:191-192.

```ts
if (now >= barrier.expiresAt) {
  barriersToRemove.push(i);
}
...
state.activeBarriers.splice(barriersToRemove[i], 1);
```

Source: src/game/GameLoop.ts:354-355, 361.

### Test coupling to timeline scaffold

```ts
expect(response.text).toContain("id=\"matchElapsed\"");
expect(response.text).toContain("id=\"etaToBase\"");
expect(response.text).toContain("id=\"timelineFeed\"");
```

Source: src/index.test.ts:141-143.
