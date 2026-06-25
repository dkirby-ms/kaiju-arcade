---
applyTo: '.copilot-tracking/changes/2026-06-24/kaiju-ui-overhaul-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Kaiju UI Overhaul

## Overview

Implement a kaiju-client-first UI overhaul that hides reconnect tokens, introduces WASD directional controls, makes the tactical map always visible, and replaces tabbed context switching with an integrated responsive HUD.

## Objectives

### User Requirements

* Start building the implementation plan for the kaiju UI overhaul — Source: user request in current conversation.
* Hide reconnect token from kaiju player-visible UI while keeping reconnect capability — Source: attached kaiju UI research and user request context.
* Replace turn-left/turn-right interaction model with WASD directional movement behavior — Source: attached kaiju UI research and user request context.
* Keep kaiju movement visible on tactical map without requiring tab switching — Source: attached kaiju UI research and user request context.
* Eliminate context tab switching by using an integrated layout that shows map, status, controls, and feed together — Source: attached kaiju UI research and user request context.

### Derived Objectives

* Preserve existing server movement and reconnect contracts while delivering requested UX changes — Derived from: research findings and current room/protocol architecture.
* Keep containment, continue, and spectator transitions behaviorally unchanged during UI refactor — Derived from: existing gameplay invariants and tests.
* Provide a phased implementation path with explicit validation and rollback-safe boundaries — Derived from: Task Planner mode requirements.

## Context Summary

### Project Files

* public/kaiju/index.html - Kaiju UI structure, current tabbed panels, and current movement control buttons.
* public/kaiju/styles.css - Kaiju layout, panel visibility behavior, and responsive styles.
* public/kaiju/app.js - Reconnect handling, movement input logic, map rendering, and panel toggling.
* public/commander/app.js - Reusable heading indicator and tactical overlay rendering patterns.
* src/messages/protocol.ts - Current heading-only kaiju movement message contract.
* src/game/MatchRoom.ts - Server handling for kaiju movement and reconnect token reclaim.
* src/game/GameLoop.ts - Authoritative heading-driven kaiju movement integration.

### References

* .copilot-tracking/research/2026-06-24/kaiju-ui-overhaul-research.md - Planning synthesis for the overhaul.
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md - Subagent deep research baseline.
* .copilot-tracking/research/2026-06-24/kaiju-client-ui-improvements-research.md - Implementation-focused kaiju client findings.
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md - UX hierarchy and decluttering guidance.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown authoring requirements for .md artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing style requirements for markdown content.

### Scope Guardrails

* Tactical map remains read-only for this overhaul; no click-to-move or map-driven movement interaction is introduced.
* Kaiju action cooldown behavior must remain continuous and functionally unchanged after UI/input refactor.

## Implementation Checklist

### [x] Implementation Phase 1: Integrated Kaiju Layout Baseline

<!-- parallelizable: false -->

* [x] Step 1.1: Refactor kaiju HTML structure from tabbed panels to integrated HUD containers
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 11-28)
* [x] Step 1.2: Remove visible reconnect token input and replace with passive session guidance copy
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 30-45)
* [x] Step 1.3: Implement responsive grid and always-visible tactical map/feed/status zones in kaiju CSS
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 47-66)
* [x] Step 1.4: Validate phase changes
  * Run focused checks for kaiju page render, panel visibility, and layout responsiveness.

### [x] Implementation Phase 2: WASD and Directional Input Model

<!-- parallelizable: false -->

* [x] Step 2.1: Replace turn-left/turn-right controls with directional control cluster and key-state handlers
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 71-92)
* [x] Step 2.2: Add vector-to-heading conversion and heading-send thresholding via existing throttled send path
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 94-114)
* [x] Step 2.3: Preserve spectator and contained input-lock behavior for keyboard and touch paths
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 116-132)
* [x] Step 2.4: Validate phase changes
  * Run manual movement tests for cardinal and diagonal directional inputs.

### [x] Implementation Phase 3: Reconnect Privacy and Tactical Map Clarity

<!-- parallelizable: false -->

* [x] Step 3.1: Decouple reconnect token flow from visible input while preserving storage-backed join behavior
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 137-158)
* [x] Step 3.2: Ensure tactical map is always active and resize/render paths assume visible map state
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 160-177)
* [x] Step 3.3: Add heading indicator and map readability enhancements borrowed from commander map pattern
  * Details: .copilot-tracking/details/2026-06-24/kaiju-ui-overhaul-details.md (Lines 179-196)
* [x] Step 3.4: Validate phase changes
  * Run manual checks for reconnect, map update visibility, movement readability, and read-only map behavior.

### [x] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute lint commands.
  * Execute build scripts.
  * Run tests covering affected behavior.
* [x] Step 4.2: Fix minor validation issues
  * Iterate on straightforward lint and test failures caused by the overhaul changes.
* [x] Step 4.3: Report blocking issues
  * Capture unresolved blockers and recommend follow-on planning if fixes exceed minor scope.

## Planning Log

See .copilot-tracking/plans/logs/2026-06-24/kaiju-ui-overhaul-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm for test and build execution.
* Existing Colyseus room and protocol contracts in src/messages and src/game.
* Browser manual QA coverage for kaiju controls and responsive layout behavior.

## Success Criteria

* Kaiju UI no longer exposes reconnect token in visible editable controls while reconnect remains functional — Traces to: .copilot-tracking/research/2026-06-24/kaiju-ui-overhaul-research.md.
* WASD plus on-screen directional controls produce intuitive directional movement using existing heading protocol contract — Traces to: .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md.
* Tactical map, status, feed, and controls are visible in a single integrated layout without context tab switching — Traces to: .copilot-tracking/research/2026-06-24/kaiju-client-ui-improvements-research.md.
* Tactical map remains read-only with no map-driven movement semantics introduced — Traces to: .copilot-tracking/research/2026-06-24/kaiju-ui-overhaul-research.md.
* Attack and ability cooldown behavior remains continuous and functionally correct after input/layout refactor — Traces to: .copilot-tracking/research/2026-06-24/kaiju-ui-overhaul-research.md.
* Existing containment, continue, and spectator behaviors remain intact after validation — Traces to: src/game/MatchRoom.ts and test suite coverage.
