---
title: PixiJS Fit Analysis Subagent
description: Research assessment of whether kaiju-arcade should adopt PixiJS for kaiju/commander graphics, comparing current Leaflet + canvas overlays against hybrid and full replacement options.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - pixijs
  - leaflet
  - canvas
  - rendering
  - performance
  - accessibility
estimated_reading_time: 14
---

## Research Scope

This research evaluates whether kaiju-arcade should adopt PixiJS for client graphics in the kaiju and commander web clients.

Questions investigated:

* How well does current Leaflet tile + canvas overlay architecture serve the game?
* What are realistic technical paths to PixiJS adoption?
* What are the tradeoffs for migration complexity, mobile performance, accessibility, and testability?
* What should near-term and longer-term direction be?

Constraints:

* Research-only output, no product code edits.
* Focus on current web clients in public/kaiju and public/commander.

## Workspace Evidence

### Current rendering stack is Leaflet base map + HTML canvas overlay in both clients

* Commander imports Leaflet from CDN and places a Leaflet map div plus canvas overlay in the same map container:
  * public/commander/index.html:8
  * public/commander/index.html:9
  * public/commander/index.html:61
  * public/commander/index.html:62
  * public/commander/index.html:63
* Kaiju imports Leaflet and uses the same pattern for spectator tactical map:
  * public/kaiju/index.html:8
  * public/kaiju/index.html:9
  * public/kaiju/index.html:46
  * public/kaiju/index.html:47
  * public/kaiju/index.html:48

### Map projection coupling is explicit and central to current overlays

* Commander maps game-space coordinates to lat/lng bounds and then to pixels via Leaflet projection:
  * public/commander/app.js:33
  * public/commander/app.js:40
  * public/commander/app.js:60
  * public/commander/app.js:88
  * public/commander/app.js:95
  * public/commander/app.js:96
* Kaiju spectator map uses the same conversion strategy and draw loop:
  * public/kaiju/app.js:330
  * public/kaiju/app.js:344
  * public/kaiju/app.js:354
  * public/kaiju/app.js:386
  * public/kaiju/app.js:400

### Continuous redraw pattern is already animation-loop based

* Commander map uses requestAnimationFrame-driven rendering:
  * public/commander/app.js:254
  * public/commander/app.js:297
* Kaiju uses a UI animation tick and redraws tactical overlay when spectator map is ready:
  * public/kaiju/app.js:692
  * public/kaiju/app.js:695
  * public/kaiju/app.js:700

### Overlay layering and input model today

* Both overlays set pointer-events: none on canvas, so map/panel interactions remain DOM/Leaflet-driven, not canvas-hit-test-driven:
  * public/commander/styles.css:263
  * public/commander/styles.css:269
  * public/kaiju/styles.css:428
  * public/kaiju/styles.css:433
* Kaiju already depends on DOM accessibility cues (for example aria-live status regions), meaning rendering migration must preserve DOM accessibility affordances:
  * public/kaiju/index.html:54
  * public/kaiju/index.html:160

### Tooling/test baseline implies no existing frontend renderer test harness

* Tests run in Node environment and are rooted in src, not public browser code:
  * jest.config.js:3
  * jest.config.js:4
  * jest.config.js:2
* package.json currently has no PixiJS dependency:
  * package.json:31
  * package.json:38

## External Documentation Findings

### PixiJS interaction/event model (relevant for interactive map overlays)

Sources:

* https://pixijs.com/8.x/guides/components/events
* https://github.com/pixijs/pixijs/blob/dev/src/events/__docs__/events.md

Findings:

* PixiJS v8 uses eventMode (none/passive/auto/static/dynamic) instead of legacy interaction-only toggles.
* Pointer events are first-class (pointerdown/up/move/tap) and recommended for cross-device use.
* Global move behavior changed in v8; globalpointermove/globalmousemove/globaltouchmove must be used when needed.
* Hit-testing behavior and custom hit areas can materially affect performance and interaction semantics.

Implication for kaiju-arcade:

* Moving from pointer-events:none canvas overlays to interactive Pixi display objects is possible, but requires deliberate event architecture and eventMode tuning to avoid regressions.

### PixiJS performance and mobile guidance

Sources:

* https://pixijs.com/8.x/guides/concepts/performance-tips
* https://github.com/pixijs/pixijs/blob/dev/src/__docs__/concepts/performance-tips.md

Findings:

* Mobile-oriented guidance includes disabling antialiasing and opaque backgrounds where possible.
* Performance depends heavily on batching/draw order, minimizing expensive graphics changes, and texture strategy.
* Culling is not universally beneficial by default; CPU-bound scenes can regress if culling work outweighs render savings.
* Event-system traversal and hit areas affect runtime cost in interactive scenes.

Implication for kaiju-arcade:

* PixiJS can improve headroom for richer effects and more entities, but only if scene design follows batching/culling/event best practices.
* For current low-entity radar overlays, raw performance gains may be modest unless visual complexity increases.

### Map overlay integration evidence (Leaflet + Pixi)

Source:

* https://github.com/manubb/Leaflet.PixiOverlay

Findings:

* Leaflet.PixiOverlay provides a known integration pattern with draw callback, latLngToLayerPoint projection helpers, and renderer/container access.
* Plugin options explicitly expose redraw strategy, iOS-focused double buffering, forceCanvas fallback, and interaction-manager controls.
* Changelog indicates active maintenance through 2025, but README examples/documentation explicitly list support through Pixi v7 (not v8 wording in the examples section).

Implication for kaiju-arcade:

* A hybrid adoption path is practical and lower risk than replacing Leaflet outright.
* Version-fit validation is required for Pixi v8 usage if this plugin route is chosen.

## Option Analysis

## Option 1: Stay on current Leaflet + Canvas overlay stack

What it means:

* Keep Leaflet tiles for geo-context and existing 2D canvas overlay rendering loops.
* Incrementally optimize current draw code and layering behavior.

Pros:

* Lowest migration risk and near-zero architectural churn.
* Preserves current coordinate projection path and map semantics.
* No new rendering dependency or bundling changes.
* Existing behavior already works on mobile-oriented layout paths.

Cons:

* Limited graphics pipeline for future richer VFX/UI animation compared to Pixi scene graph tooling.
* Manual canvas state management complexity grows as visuals become richer.
* Interaction upgrades (canvas-hit objects, complex pointer semantics) require custom code.

Assessment:

* Migration complexity: Low.
* Mobile performance: Adequate for current scope; may struggle if effect density rises.
* Accessibility: Better preserved because interaction/status is DOM-centric today.
* Testability: Similar to current state; frontend rendering remains largely untested via Jest.

## Option 2: Hybrid overlay (PixiJS over Leaflet map)

What it means:

* Keep Leaflet for tile map/projection controls.
* Replace custom canvas draw loops with Pixi stage/container drawing that is projection-synced to Leaflet.
* Use either direct integration logic or Leaflet.PixiOverlay-style adapter.

Pros:

* Retains existing map infrastructure while unlocking Pixi rendering ergonomics and performance tools.
* Lowest-risk on-ramp to Pixi with incremental migration per view (commander first, then kaiju spectator).
* Enables richer visual effects and cleaner object composition than immediate-mode canvas drawing.

Cons:

* Two-system coordination remains (Leaflet lifecycle + Pixi lifecycle).
* Event routing can become complex if Pixi interactivity is enabled over map interactions.
* Potential version compatibility work if relying on third-party Leaflet.PixiOverlay behavior with Pixi v8.

Assessment:

* Migration complexity: Medium.
* Mobile performance: Potentially improved for richer scenes; must tune renderer options and texture strategy.
* Accessibility: Manageable if major interactions stay DOM-based; Pixi accessibility system can supplement but adds integration work.
* Testability: Slightly harder than current due to renderer abstraction, still likely browser-E2E oriented.

## Option 3: Full PixiJS scene replacement (replace Leaflet map scene)

What it means:

* Remove Leaflet map layer dependency in gameplay views.
* Render all map/background, entities, overlays, and interactions entirely in Pixi.
* Recreate projection/zoom/navigation semantics or simplify away geographic semantics.

Pros:

* Single graphics/event stack with maximal control over rendering and interaction.
* Best long-term flexibility for stylized game-first visuals and animation systems.
* Avoids projection synchronization overhead between map and overlay engines.

Cons:

* Highest implementation and regression risk.
* Loss of immediate geospatial tile ecosystem and map controls unless rebuilt/replaced.
* Accessibility burden increases because more interaction moves off native DOM.
* Requires substantial UX and QA validation across devices.

Assessment:

* Migration complexity: High.
* Mobile performance: Can be strong with careful design; can regress badly if scene/event architecture is naive.
* Accessibility: Hardest path; requires deliberate AccessibilitySystem integration and fallback UX.
* Testability: Requires new browser-based visual and interaction test strategy.

## Cross-Cutting Evaluation

### Migration complexity

* Current architecture is already deeply tied to Leaflet projections in both clients (gameToLatLng and latLngToContainerPoint flows).
* A full replacement would re-open coordinate semantics and map UX assumptions in two separate clients.
* Hybrid allows phased migration and preserves production geometry logic while reducing immediate blast radius.

### Mobile performance

* Current overlays are lightweight and likely not GPU-bound at present entity scale.
* Pixi offers better scaling runway for denser scenes and effects, but only with disciplined batching/texture/event strategy.
* Hybrid is the safest way to validate real mobile gains before committing to full replacement.

### Accessibility implications

* Current UI semantics are largely DOM-native and include aria-live usage.
* Pixi accessibility is available but opt-in (requires accessibility module and object-level accessibility metadata).
* Full-canvas interaction-first designs can reduce native semantic discoverability if not carefully layered with DOM affordances.

### Testability

* Existing Jest setup is server/domain-focused and Node-based, not browser-renderer focused.
* Any Pixi adoption should pair with explicit browser-side test strategy (for example Playwright visual/state checks), regardless of hybrid or full replacement.
* Without this addition, migration risk increases because rendering regressions will be difficult to detect automatically.

## Recommendation

Near-term direction (decisive):

* Do not fully replace Leaflet now.
* Adopt a hybrid pilot only if there is a concrete need for richer effects or higher entity counts in commander/kaiju tactical overlays.
* If no immediate visual/performance pressure exists, remain on current stack and focus effort on gameplay and UX improvements first.

Longer-term direction (decisive):

* Use a staged strategy: current stack -> hybrid Pixi overlay in one client -> evaluate production metrics -> consider broader adoption.
* Revisit full Pixi replacement only after hybrid proves clear value on mobile frame stability, development velocity, and interaction requirements that Leaflet + canvas cannot meet.

Rationale for recommendation:

* The present implementation is stable, understandable, and aligned with current map-centric UI.
* Hybrid gives optional upside with bounded risk; full replacement is not justified by current evidence.
* Accessibility and testability readiness are not yet strong enough to support an all-in renderer rewrite.

## Follow-on Research Questions

* Confirm Pixi v8 compatibility strategy if selecting Leaflet.PixiOverlay (direct proof in target version matrix).
* Define measurable performance acceptance criteria (FPS/frame-time/memory) on representative mobile devices.
* Design a browser test harness baseline for rendering-state regressions before migration begins.
