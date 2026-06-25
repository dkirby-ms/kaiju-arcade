---
applyTo: '.copilot-tracking/changes/2026-06-25/unified-matchmaking-lobby-fix-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Unified Matchmaking Lobby Fix

## Overview

Unify matchmaking around one global lobby and one shared pre-match room, then defer role-specific commander and kaiju clients until the server activates the match.

## Objectives

### User Requirements

* Build a plan to fix the matchmaking issues using the attached research — Source: user request in current conversation.
* Eliminate the commander-specific secondary lobby behavior after match creation — Source: .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md.
* Keep one global lobby and move role selection into the match room itself — Source: .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md.

### Derived Objectives

* Prefer the current REST seat-reservation architecture over a larger LobbyRoom migration in this implementation pass — Derived from: lower-risk path identified in research and existing server/client flow.
* Make MatchRoom authoritative for pre-match role claim and readiness instead of assigning roles during onJoin — Derived from: current mismatch between requested UX and server join semantics.
* Reduce commander and kaiju pages to active-match clients so duplicate matchmaking surfaces cannot reappear — Derived from: duplicated create/join behavior documented in research.

## Context Summary

### Project Files

* src/index.ts - Match listing, seat reservation endpoints, and static page routing.
* src/game/MatchRoom.ts - Current room lifecycle, role assignment, metadata, and start behavior.
* src/schema/MatchSchema.ts - Match phase and any new readiness or claimed-role state.
* src/messages/protocol.ts - Client/server message contract for role claim and readiness.
* public/lobby.html - Shared global lobby that currently redirects too early into role-specific pages.
* public/common/session-manager.js - Browser storage for player identity, room context, reservations, and reconnect data.
* public/commander/index.html - Commander client shell with duplicate pre-match controls.
* public/commander/app.js - Commander client flow, including current create-match fallback behavior.
* public/kaiju/app.js - Kaiju client flow with current direct join assumptions.
* public/match-room.html - New shared pre-match page to add in this implementation.
* public/common/match-room-app.js - New shared pre-match controller to add in this implementation.

### References

* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Primary research baseline for the mismatch and recommended architecture.
* /memories/repo/kaiju-arcade-notes.md - Colyseus, reconnect token, and environment constraints already verified in prior work.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown artifact requirements.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing guidance for plan artifacts.

## Implementation Checklist

### [x] Implementation Phase 1: Stabilize Global Lobby Entry and Discovery

<!-- parallelizable: false -->

* [x] Step 1.1: Expand the REST room listing to expose lifecycle and slot metadata needed by the global lobby
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 12-33)
* [x] Step 1.2: Remove role commitment from public/lobby.html and route all room entry through a shared pre-match page
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 35-55)
* [x] Step 1.3: Update the join reservation contract so room entry is role-agnostic before players enter the shared pre-match room
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 57-77)
* [x] Step 1.4: Validate room discovery and entry-contract changes
  * Run focused tests and build checks for src/index.ts and MatchRoom metadata behavior

### [x] Implementation Phase 2: Move Role Claim and Readiness Into MatchRoom

<!-- parallelizable: false -->

* [x] Step 2.1: Replace join-time role assignment with explicit in-room role claim semantics
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 91-113)
* [x] Step 2.2: Add readiness tracking and commander start gating inside the LOBBY phase
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 115-136)
* [x] Step 2.3: Validate room protocol and lifecycle updates
  * Run targeted MatchRoom, protocol, and schema tests before end-to-end client validation

### [x] Implementation Phase 3: Add the Shared Pre-Match Room Layer

<!-- parallelizable: false -->

* [x] Step 3.1: Create the shared pre-match page and browser controller for reservation consumption, roster rendering, role claim, and readiness
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 148-169)
* [x] Step 3.2: Route from the shared pre-match room into commander or kaiju gameplay only after the room becomes ACTIVE
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 171-193)
* [x] Step 3.3: Validate the shared pre-match room flow
  * Run focused tests, build checks, and manual transition verification covering refresh, stale context, and activation routing

### [x] Implementation Phase 4: Clean Up Legacy Matchmaking in Gameplay Clients

<!-- parallelizable: true -->

* [x] Step 4.1: Remove commander-side match creation and fallback lobby behavior
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 212-232)
* [x] Step 4.2: Remove kaiju-side duplicate join behavior and route stale contexts upstream
  * Details: .copilot-tracking/details/2026-06-25/unified-matchmaking-lobby-fix-details.md (Lines 234-254)
* [x] Step 4.3: Validate gameplay-client cleanup
  * Run build and focused tests plus direct-page-entry manual checks

### [x] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation
  * Execute all lint commands (`npm run lint`)
  * Execute build scripts for modified components (`npm run build`)
  * Run project tests (`npm test`)
  * Note the known lint/toolchain blocker if `npm run lint` still fails for the documented TypeScript and @typescript-eslint environment mismatch
* [x] Step 5.2: Fix minor validation issues
  * Iterate on lint errors, build warnings, and test failures that stay within the planned slice
* [x] Step 5.3: Report blocking issues
  * Document protocol or lifecycle gaps that require more research rather than widening scope during validation

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/unified-matchmaking-lobby-fix-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm scripts defined in package.json.
* Existing Colyseus REST seat-reservation and reconnect-token flow.
* Current vanilla JavaScript browser architecture under public/.
* Current lint environment may still require separate dependency alignment before Phase 5 can pass cleanly.

## Success Criteria

* The shared global lobby remains the only place where players discover or create matches — Traces to: research requested UX and current-flow mismatch.
* Players enter a shared pre-match room before choosing commander or kaiju — Traces to: research recommended architecture.
* MatchRoom becomes authoritative for role claim, readiness, and start gating in the LOBBY phase — Traces to: research implementation implications.
* Commander and kaiju pages no longer expose duplicate matchmaking behavior — Traces to: research evidence in public/commander/app.js and public/kaiju/app.js.
