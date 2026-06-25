---
applyTo: '.copilot-tracking/changes/2026-06-25/colyseus-lobby-join-bug-fix-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Colyseus Lobby and Join Bug Fix

## Overview

Align lobby, seat reservation consumption, and reconnect behavior with native Colyseus 0.17 flows while preserving compatibility fallbacks for constrained clients.

## Objectives

### User Requirements

* Build a plan to fix the bug already researched in this workspace — Source: user request in current conversation.
* Resolve room-join and lobby failures using Colyseus 0.17-native semantics — Source: .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md.

### Derived Objectives

* Prioritize reservation payload correctness and option propagation before larger flow refactors — Derived from: highest-confidence root cause ranking in research.
* Adopt native LobbyRoom as primary behavior without removing REST fallback in the same iteration — Derived from: rollout-risk constraints and research alternatives.
* Standardize reconnect and room-attach sequencing to one deterministic flow — Derived from: evidence of duplicate and dead listener logic in shared browser code.

## Context Summary

### Project Files

* public/common/colyseus-client.js - Reservation conversion, seat consume fallback, and lobby attach behavior.
* src/index.ts - Match room definitions, lobby room registration target, and REST fallback endpoints.
* public/common/match-room-app.js - Shared room attach and reconnect handling.
* src/game/MatchRoom.ts - Server-side onJoin and allowReconnection semantics consumed by client flow.
* src/ops/metrics.ts - Telemetry definitions for rollout observability.

### References

* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md - Primary research and root-cause evidence.
* .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md - Implementation step specification.
* /memories/repo/kaiju-arcade-notes.md - Prior reconnect-related constraints and validation history.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — Markdown artifact requirements.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — Writing style conventions.

## Implementation Checklist

### [ ] Implementation Phase 1: Correct Reservation Contract and Fallback Option Propagation

<!-- parallelizable: false -->

* [ ] Step 1.1: Replace legacy reservation conversion with native 0.17 payload handling
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 12-31)
* [ ] Step 1.2: Preserve join options in consume fallback calls
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 33-52)
* [ ] Step 1.3: Validate reservation and fallback behavior
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 54-62)

### [ ] Implementation Phase 2: Adopt Native LobbyRoom Primary Path

<!-- parallelizable: false -->

* [ ] Step 2.1: Register server-side LobbyRoom support while preserving REST endpoints
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 68-87)
* [ ] Step 2.2: Make client lobby attach native-first with REST fallback
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 89-108)
* [ ] Step 2.3: Validate lobby attachment behavior
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 110-117)

### [ ] Implementation Phase 3: Unify Shared Room Attach and Reconnect Contract

<!-- parallelizable: false -->

* [ ] Step 3.1: Remove or gate dead reconnect-token listeners in shared room app
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 123-142)
* [ ] Step 3.2: Consolidate to one deterministic room attach sequence
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 144-164)
* [ ] Step 3.3: Validate reconnect and room attach behavior
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 166-174)
* [ ] Step 3.4: Add automated regression tests for reservation and attach contracts
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 176-196)

### [ ] Implementation Phase 4: Add Rollout Observability and Compatibility Safeguards

<!-- parallelizable: false -->

* [ ] Step 4.1: Add metrics for consume fallback and lobby path selection
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 202-221)
* [ ] Step 4.2: Validate REST-only compatibility during native lobby rollout
  * Details: .copilot-tracking/details/2026-06-25/colyseus-lobby-join-bug-fix-details.md (Lines 223-242)

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full project validation
  * Execute all lint commands (`npm run lint`)
  * Execute build scripts for all modified components (`npm run build`)
  * Run full test suites (`npm test`)
* [ ] Step 5.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply direct fixes where scope is straightforward
* [ ] Step 5.3: Report blocking issues
  * Document blockers requiring additional research
  * Provide recommended follow-on planning for unresolved contract gaps

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/colyseus-lobby-join-bug-fix-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm scripts from package.json.
* Colyseus 0.17 server and browser client APIs.
* Existing REST matchmaking endpoints maintained during transition.

## Success Criteria

* Seat reservation handling no longer mutates native 0.17 payload shape and fallback preserves options — Traces to: research root cause item 1.
* Lobby attach path is native-first with deterministic REST fallback and no hidden divergence — Traces to: research root cause item 2.
* Shared room reconnect and attach flow no longer depends on dead custom token events — Traces to: research root cause item 3.
* Rollout readiness includes compatibility checks and telemetry for fallback deprecation decisions — Traces to: DD-02 and WI-01 in planning log.
