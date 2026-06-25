<!-- markdownlint-disable-file -->
---
title: Kaiju UI Overhaul Research Synthesis
description: Planning synthesis for kaiju client UI overhaul covering reconnect secrecy, WASD directional input, always-visible tactical map, and integrated layout.
author: GitHub Copilot Task Planner
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju
  - ui
  - input
  - tactical-map
  - reconnect
estimated_reading_time: 8
---

## Task Implementation Requests

* Start building an implementation plan for the kaiju UI overhaul.
* Include reconnect-token privacy, WASD movement, tactical map visibility, and integrated no-tab layout.

## Scope and Constraints

* Scope is centered on public/kaiju client files with minimal or no backend changes.
* Existing server movement contract should remain heading-based for this phase.
* Existing reconnect reclaim flow must continue to work through reconnectToken.
* Tactical map remains read-only, not click-to-move.

## Sources Consulted

* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md
* .copilot-tracking/research/2026-06-24/kaiju-client-ui-improvements-research.md
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md
* public/kaiju/index.html
* public/kaiju/styles.css
* public/kaiju/app.js
* src/messages/protocol.ts
* src/game/MatchRoom.ts
* src/game/GameLoop.ts

## Key Findings

* Reconnect token is currently displayed in visible UI input, but core reclaim logic already works through localStorage plus join options.
* Existing movement protocol accepts heading only; client-side vector-to-heading translation is viable without protocol changes.
* Tactical map rendering already exists and is driven by room state; visibility issue is mostly caused by tabbed context gating.
* Kaiju HUD can be modernized into an integrated layout while preserving current attack, ability, continue, containment, and spectator mechanics.

## Selected Implementation Direction

* Use client-side directional-vector translation to heading for WASD controls.
* Keep protocol and game loop unchanged for this implementation pass.
* Remove reconnect token from visible UI while preserving storage-backed reconnect behavior.
* Replace context tabs with integrated responsive layout showing map, status, controls, and feed concurrently.

## Risks and Mitigations

* Risk: Movement message chatter from key repeat or vector jitter.
  * Mitigation: Keep existing send throttle and add heading-change threshold.
* Risk: Integrated layout density on narrow screens.
  * Mitigation: Mobile-first stacking and prioritized panel order.
* Risk: Control regressions during spectator or contained states.
  * Mitigation: Preserve and reuse existing input lock checks and overlay state handling.

## Validation Targets

* Reconnect token never appears in kaiju UI.
* Reconnect still succeeds after reload with stored token.
* WASD and on-screen directional controls update movement heading correctly.
* Map remains visible during normal play and movement updates are visible continuously.
* Continue, spectator transition, and action cooldown behavior remain intact.
