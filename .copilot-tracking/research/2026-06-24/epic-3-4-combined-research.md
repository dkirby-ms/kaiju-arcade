<!-- markdownlint-disable-file -->
# Task Research: Epic 3 and Epic 4 Combined Build Plan

## Task Implementation Requests

* Plan work to build Epic 3 (Commander Dashboard) and Epic 4 (Kaiju Mobile Client).
* Use repository evidence to define scope, constraints, and implementation sequencing.

## Scope and Success Criteria

* Scope: Planning-ready synthesis for Epic 3 and Epic 4 implementation in the current repository.
* Success criteria:
  * Epic 3 and Epic 4 requirements are mapped to concrete files and runtime surfaces.
  * A phased implementation path is defined with parallelization where safe.
  * Known gaps and risks are captured for implementation and validation.

## Sources Reviewed

* ISSUE-PREVIEW.md (Epic 3 and 4 definitions)
* .copilot-tracking/implementation-tasks.md (task-level requirements)
* IMPLEMENTATION-GUIDE.md (Phase 2A gate criteria)
* docs/multiplayer-game-design.md (display and continue constraints)
* src/messages/protocol.ts (message/event contracts)
* src/game/MatchRoom.ts (broadcast and continue/spectator flows)
* src/schema/MatchSchema.ts (continue constants, signal timestamp fallback)
* public/commander/index.html
* public/commander/app.js
* public/commander/styles.css
* public/kaiju/index.html
* public/kaiju/app.js
* public/kaiju/styles.css
* .copilot-tracking/research/subagents/2026-06-24/epic-3-4-research.md
* .copilot-tracking/research/2026-06-24/epic-3-research.md
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md

## Key Findings

* Epic 3 and Epic 4 scope is explicitly documented in ISSUE-PREVIEW.md and .copilot-tracking/implementation-tasks.md.
* Core protocol and server event surfaces already exist for both epics:
  * commander.select, commander.dispatch, kaiju.move, kaiju.attack, kaiju.ability, kaiju.continue
  * signal.feed, commander.status, commander.dispatch.result, kaiju.contained, kaiju.spectator
* The largest remaining effort is UI/UX completion and acceptance alignment in public/commander and public/kaiju clients, with selective server updates only when needed.
* Continue-system behavior is already anchored by constants and tested flows; implementation should preserve these invariants.

## Constraints

* Epic 3 and 4 are Phase 2A work and should meet the gate that both clients are operational and synchronized.
* Continue behavior constraints (credits, 10-second window, respawn handling) must remain consistent with schema constants and room flow.
* Signal timestamp reliability and containment terminality regressions must remain covered by tests.

## Planning Risks and Gaps

* No separate canonical acceptance-criteria document was found beyond issue-preview and checklist artifacts.
* Potential drift exists between versioning completion claims and checklist state.
* Combo-related feed behavior boundary between Epic 3 (display) and Epic 5 (mechanics) requires explicit implementation guardrails.

## Recommended Implementation Direction

* Execute a dual-track UI-first implementation:
  * Track A: Epic 3 Commander dashboard closure
  * Track B: Epic 4 Kaiju mobile UX closure
* Keep shared protocol/server changes minimal and only introduce them for explicit requirement coverage.
* End with full integration validation across both clients and server tests.
