---
applyTo: '.copilot-tracking/changes/2026-06-24/commander-ux-overhaul-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Commander UX Overhaul

## Overview

Redesign the commander experience into a no-scroll, map-centered HUD with overlay feed, corner and bottom tactical controls, and a simplified status model while preserving current server contracts and gameplay behavior.

## Objectives

### User Requirements

* Start building the plan for the commander UX overhaul with a concrete implementation path. Source: user request in this conversation.
* Make the commander UI map-centered and no-scroll, with controls around the map and feed as overlay, and remove timeline from player-facing UX. Source: .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md

### Derived Objectives

* Minimize regression risk by keeping protocol and server-state contracts unchanged while refactoring commander HTML/CSS/JS. Derived from: .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md
* Update scaffold tests that currently assert timeline IDs so the new HUD structure remains test-backed. Derived from: src/index.test.ts and research findings.
* Preserve tactical clarity by normalizing status semantics and keeping inventory and cooldown detail in dispatch controls. Derived from: status inconsistency analysis in research.

## Context Summary

### Project Files

* public/commander/index.html - Commander page markup to be restructured into a map-stage HUD shell.
* public/commander/styles.css - Existing stacked grid styles to be replaced with viewport-locked overlay HUD rules.
* public/commander/app.js - Event wiring and UI rendering logic; timeline side-effects must be removed or gated.
* src/index.test.ts - Entry-point scaffold assertions currently coupled to timeline IDs.

### References

* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md - Primary implementation research and recommended alternative.
* .copilot-tracking/research/subagents/2026-06-24/commander-ux-layout-research.md - Supporting deep evidence and implementation options.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md - markdown authoring constraints for planning artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md - markdown writing style requirements.

## Implementation Checklist

### [x] Implementation Phase 1: Baseline and UX Contract Lock

<!-- parallelizable: false -->

* [x] Step 1.1: Confirm commander UX acceptance baseline and preserve front-end-only contract boundary
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 13-30)
* [x] Step 1.2: Define timeline-removal policy and feed parity guardrail for player-facing UX
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 32-50)
* [x] Step 1.3: Validate baseline before layout refactor
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 52-61)

### [x] Implementation Phase 2: Map-Stage HUD Layout Refactor

<!-- parallelizable: false -->

* [x] Step 2.1: Replace sequential commander panel flow with map-stage and four HUD cards
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 66-87)
* [x] Step 2.2: Rebuild commander styles for 100dvh no-scroll viewport and responsive overlay behavior
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 89-110)
* [x] Step 2.3: Validate phase changes
  * Run targeted commander view checks and page scaffold tests.
  * Execute viewport acceptance checks at 1280x720, 1920x1080, and <=880 for no-scroll and operable overlay behavior.

### [x] Implementation Phase 3: Commander UI Logic and Semantics Cleanup

<!-- parallelizable: true -->

* [x] Step 3.1: Remove timeline append side-effects and keep feed as primary event stream
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 115-134)
* [x] Step 3.2: Normalize tactical status labels and keep asset inventory detail in dispatch controls
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 136-156)
* [x] Step 3.3: Validate phase changes
  * Run focused tests and manual interaction checks for status, dispatch, and targeting.
  * Validate map click targeting updates selected target correctly and dispatches against expected target.
  * Validate active barrier count increments on barrier deployment and decays after expiry window.

### [x] Implementation Phase 4: Test and Regression Updates

<!-- parallelizable: true -->

* [x] Step 4.1: Update HTML scaffold assertions for new commander HUD anchors
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 161-176)
* [x] Step 4.2: Validate commander contract behavior in existing game and protocol tests
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 178-193)
* [x] Step 4.3: Validate tactical status semantics communication
  * Ensure commander UI communicates why ACTIVE BARRIERS is an active-entity count and where other mitigation inventory/cooldowns are represented.
  * Details: .copilot-tracking/details/2026-06-24/commander-ux-overhaul-details.md (Lines 136-156)

### [x] Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation
  * Execute lint, build, and tests for all modified code paths.
* [x] Step 5.2: Fix minor validation issues
  * Apply straightforward corrections discovered in validation.
* [x] Step 5.3: Report blocking issues
  * Document blockers requiring additional research or separate planning.

## Planning Log

See .copilot-tracking/plans/logs/2026-06-24/commander-ux-overhaul-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm project scripts.
* Existing Colyseus commander message contracts and room broadcast behavior.
* Commander front-end files under public/commander/.

## Success Criteria

* Commander UI is map-centered and playable without page scroll at standard desktop resolutions. Traces to: commander UX research acceptance intent.
* Viewport acceptance checks pass at 1280x720, 1920x1080, and <=880 with no body scroll in primary flow and operable overlays. Traces to: .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md validation checklist.
* Timeline panel is removed from player-facing commander layout without breaking status, dispatch, and feed behavior. Traces to: .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md.
* Status semantics are consistent and asset lifecycle visibility remains actionable in dispatch controls. Traces to: commander UX research status inconsistency findings.
* Status card includes explicit semantic cue that ACTIVE BARRIERS represents live barrier entities while non-barrier mitigations are tracked in dispatch inventory and cooldown rows. Traces to: commander UX research status metrics analysis.
* Tests updated for new HUD structure pass alongside existing commander/game contract tests. Traces to: src/index.test.ts and existing server/message test suites.