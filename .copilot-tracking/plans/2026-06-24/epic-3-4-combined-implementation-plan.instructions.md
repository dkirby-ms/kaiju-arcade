---
applyTo: '.copilot-tracking/changes/2026-06-24/epic-3-4-combined-implementation-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Epic 3 and Epic 4 Combined Implementation

## Overview

Build Epic 3 Commander Dashboard and Epic 4 Kaiju Mobile Client to acceptance-ready quality by closing UI/UX feature gaps, preserving tested gameplay invariants, and validating synchronized multiplayer behavior end-to-end.

## Objectives

### User Requirements

* Plan out the work to build Epic 3 and Epic 4 — Source: user request in current conversation.

### Derived Objectives

* Produce a combined implementation plan with actionable phased steps and cross-file references — Derived from: Task Planner mode requirements.
* Prioritize parallel implementation for commander and kaiju client work while isolating shared-risk validation — Derived from: independent file ownership across public/commander and public/kaiju.
* Preserve reliability/correctness invariants around containment and signal timing during UI delivery — Derived from: existing test-backed behavior and recent review findings.

## Context Summary

### Project Files

* ISSUE-PREVIEW.md - Epic 3 and Epic 4 feature-level definitions.
* .copilot-tracking/implementation-tasks.md - detailed task checklist and requirement breakdown.
* IMPLEMENTATION-GUIDE.md - Phase 2A gate requiring both clients operational and synchronized.
* docs/multiplayer-game-design.md - display and continue-system constraints.
* src/messages/protocol.ts - commander/kaiju command and event contracts.
* src/game/MatchRoom.ts - authoritative broadcast and continue/spectator transition logic.
* src/schema/MatchSchema.ts - continue constants and signal helper behavior.
* public/commander/index.html - commander UI structure.
* public/commander/app.js - commander interaction and rendering logic.
* public/commander/styles.css - commander presentation and effects.
* public/kaiju/index.html - kaiju UI structure and overlays.
* public/kaiju/app.js - kaiju input, cooldown, continue, and spectator logic.
* public/kaiju/styles.css - kaiju presentation and responsive behavior.

### References

* .copilot-tracking/research/2026-06-24/epic-3-4-combined-research.md - combined planning research baseline.
* .copilot-tracking/research/subagents/2026-06-24/epic-3-4-research.md - consolidated subagent architecture/scope findings.
* .copilot-tracking/research/2026-06-24/epic-3-research.md - Epic 3 gap-focused implementation research.
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md - Epic 4 UX hierarchy and decluttering research.

### Acceptance Baseline

* ISSUE-PREVIEW.md sections for Epic 3 and Epic 4 features.
* .copilot-tracking/implementation-tasks.md task checklists for Epic 3 (3.1-3.4) and Epic 4 (4.1-4.4).
* IMPLEMENTATION-GUIDE.md Phase 2A gate requiring both clients operational and synchronized.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown authoring requirements for .md artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing style requirements for markdown content.

## Implementation Checklist

### [x] Implementation Phase 1: Shared Baseline and Contract Audit

<!-- parallelizable: false -->

* [x] Step 1.1: Build Epic 3 and Epic 4 requirement matrix against existing code
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 13-29)
* [x] Step 1.2: Lock non-negotiable invariants and regression checkpoints
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 31-48)
* [x] Step 1.3: Define explicit Epic 3 and 4 scope guardrail for combo feed behavior
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 50-64)
* [x] Step 1.4: Validate phase changes
  * Run lint and baseline test commands before implementation.

### [x] Implementation Phase 2: Epic 3 Commander Dashboard Completion

<!-- parallelizable: true -->

* [x] Step 2.1: Implement remaining commander UI, timeline, and alert-mode requirements
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 67-84)
* [x] Step 2.2: Add or update commander-side tests for changed behaviors
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 86-102)
* [x] Step 2.3: Validate phase changes
  * Run targeted commander-related tests.

### [x] Implementation Phase 3: Epic 4 Kaiju Mobile Client Completion

<!-- parallelizable: true -->

* [x] Step 3.1: Implement decluttered tactical kaiju HUD with progressive disclosure
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 115-133)
* [x] Step 3.2: Finalize continue/spectator UX and countdown clarity
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 135-153)
* [x] Step 3.3: Add or update kaiju-side behavioral tests
  * Details: .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md (Lines 155-169)
* [x] Step 3.4: Validate phase changes
  * Run targeted kaiju-related tests.

### [ ] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute all lint commands (`npm run lint`, language linters)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [ ] Step 4.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [x] Step 4.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See `.copilot-tracking/plans/logs/2026-06-24/epic-3-4-combined-implementation-log.md` for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm toolchain for project scripts.
* Existing Colyseus and TypeScript runtime in repository.
* Current protocol and room-state contract surfaces in src/messages and src/game.

## Success Criteria

* Epic 3 commander requirements and Epic 4 kaiju requirements are mapped and implemented with test-backed evidence — Traces to: .copilot-tracking/implementation-tasks.md.
* Both commander and kaiju clients are operational and synchronized with server state — Traces to: IMPLEMENTATION-GUIDE.md Phase 2A gate.
* Continue-system and signal/containment reliability invariants remain intact through final validation — Traces to: src/schema/MatchSchema.ts, src/game/GameLoop.ts, and associated tests.
