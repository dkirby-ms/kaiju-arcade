<!-- markdownlint-disable-file -->
# Implementation Details: Colyseus Lobby and Join Bug Fix

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md, public/common/colyseus-client.js, public/common/match-room-app.js, src/index.ts, src/game/MatchRoom.ts, /memories/repo/kaiju-arcade-notes.md.

## Implementation Phase 1: Correct Seat Reservation Consumption and Option Propagation

<!-- parallelizable: false -->

### Step 1.1: Replace legacy reservation-shape conversion with 0.17-native reservation handling

Update the seat reservation adapter so client reservation payloads stay in the shape expected by Colyseus 0.17 consumeSeatReservation.

Files:
* public/common/colyseus-client.js - Remove or replace toSeatReservation conversion logic that wraps reservation fields into nested room payloads.

Discrepancy references:
* Addresses DD-01.

Success criteria:
* consumeSeatReservation receives the same flat reservation structure returned by server endpoints.
* No conversion layer injects pre-0.17 room wrapper shape.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 34-36) - Reservation conversion mismatch evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 121-125) - 0.17 payload contract confirmation.

Dependencies:
* None.

### Step 1.2: Preserve join options on consume fallback paths

When consumeSeatReservation fails and a roomId fallback is used, keep player identity and role options instead of replacing with an empty object.

Files:
* public/common/colyseus-client.js - Update consumeSeatReservation fallback joinById(roomId, {}) to joinById(roomId, originalOptions).

Discrepancy references:
* Addresses DD-01.

Success criteria:
* Fallback joinById calls propagate playerName, role, and reconnect metadata consistently.
* onJoin receives consistent options regardless of whether consume or fallback path executes.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 35-36) - Option loss evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 163-176) - Target fallback pattern.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Validate reservation and fallback behavior

Validation commands:
* npm run build
* npm test -- --runInBand src/index.test.ts src/game/MatchRoom.test.ts

Manual checks:
* Create and join through lobby entry and verify playerName and role arrive in room state.
* Trigger consume fallback path and verify identity and role metadata remain intact.

## Implementation Phase 2: Adopt Native LobbyRoom As Primary Lobby Path

<!-- parallelizable: false -->

### Step 2.1: Define server-side native lobby room support

Register built-in LobbyRoom support while preserving existing match room listing and REST endpoints for compatibility fallback.

Files:
* src/index.ts - Add or update lobby room definition and keep realtime listing and /api/matches endpoints intact.

Discrepancy references:
* Addresses DD-02.

Success criteria:
* Server supports native lobby room subscription without removing existing REST matchmaking endpoints.
* Existing match room creation/join API behavior remains available for fallback and compatibility.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 52-53) - Missing lobby definition evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 127-128) - Canonical LobbyRoom usage.

Dependencies:
* Step 1.3 completion.

### Step 2.2: Make client lobby attach native-first with REST fallback

Change lobby attach flow to attempt joinOrCreate("lobby") first, and only use REST polling room when native lobby attach is unavailable.

Files:
* public/common/colyseus-client.js - Update joinLobby flow and fallback criteria.

Discrepancy references:
* Addresses DD-02.

Success criteria:
* Lobby clients use native realtime lobby as primary path.
* REST polling fallback remains available for endpoint or transport constraints.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 37-38) - Current synthetic lobby evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 127-128) - Native lobby contract.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate lobby attachment behavior

Validation commands:
* npm run build

Manual checks:
* Open two clients and verify lobby updates in realtime via native path.
* Force native lobby failure and verify REST fallback still renders room list updates.

## Implementation Phase 3: Unify Room Attach and Reconnect Contract

<!-- parallelizable: false -->

### Step 3.1: Remove or gate dead reconnect-token listeners in shared room app

Align client-side reconnect handling with the server's native allowReconnection and client.reconnect contract.

Files:
* public/common/match-room-app.js - Remove match.reconnect.token and kaiju.reconnect.token listeners, or gate behind an explicit feature flag if needed for compatibility.

Discrepancy references:
* Addresses DD-03.

Success criteria:
* Shared room app no longer depends on token events that server does not emit.
* Reconnect behavior is driven by room.reconnectionToken and client.reconnect usage.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 47-48) - Dead listener evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 130-131) - Native reconnect contract.

Dependencies:
* Step 2.3 completion.

### Step 3.2: Ensure deterministic room attach order in shared browser flow

Consolidate attach logic so reservation consumption is canonical when reservation exists, then one explicit join fallback path with options preserved.

Files:
* public/common/match-room-app.js - Simplify attach sequencing and fallback path.
* public/common/colyseus-client.js - Ensure helper signatures support deterministic call order and option propagation.

Discrepancy references:
* Addresses DD-01.

Success criteria:
* One canonical attach sequence is used across browser flows.
* Attach failures surface clear errors instead of silently switching to metadata-dropping paths.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 40-41) - Split attach behavior evidence.
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 140-156) - Preferred implementation approach.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Validate reconnect and room attach behavior

Validation commands:
* npm run build
* npm test -- --runInBand src/game/MatchRoom.test.ts

Manual checks:
* Disconnect and reconnect within grace window using two browsers.
* Verify reconnect restores role and session state without requiring custom token messages.

### Step 3.4: Add automated regression tests for reservation and attach contracts

Add or update tests that specifically prove reservation payload handling, option-preserving fallback behavior, and deterministic attach/reconnect sequencing.

Files:
* src/index.test.ts - Add coverage for reservation payload usage and join endpoint compatibility expectations.
* src/game/MatchRoom.test.ts - Add coverage for option propagation impact at join and reconnect boundaries.
* src/utils/client.ts - Add or update helper test hooks only if required to validate deterministic attach flow.

Discrepancy references:
* Addresses DD-01 and DD-03 validation debt.

Success criteria:
* Automated tests fail when legacy reservation-shape conversion or empty-option fallback behavior is reintroduced.
* Automated tests verify reconnect and attach paths preserve expected metadata.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 204-206) - Regression test requirement.

Dependencies:
* Step 3.3 completion.

## Implementation Phase 4: Observability and Rollout Safeguards

<!-- parallelizable: false -->

### Step 4.1: Add metrics for seat consume fallback and lobby path selection

Add telemetry for consume fallback execution and native-vs-REST lobby path to quantify behavior after deployment.

Files:
* public/common/colyseus-client.js - Emit counters or events for consume fallback and lobby path selection.
* src/ops/metrics.ts - Add metric names and registration if server-observed metrics are required.

Discrepancy references:
* Addresses DD-02 rollout observability requirements.

Success criteria:
* Fallback rate and lobby path split are observable in logs or metric streams.
* Metrics can be used to drive deprecation timing for REST polling fallback.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 24-26) - Fallback metric research gap.

Dependencies:
* Step 3.3 completion.

### Step 4.2: Validate compatibility for REST-only clients during native lobby rollout

Run compatibility checks for clients that may rely on REST listing-only behavior before turning native lobby path to required.

Files:
* src/index.ts - Keep REST endpoints active and documented for fallback clients.
* docs/operations/runbooks/join-failure.md - Document fallback behavior and rollout guardrails if operational docs are updated.

Discrepancy references:
* Addresses DD-02 compatibility-risk mitigation.

Success criteria:
* REST-only clients continue to discover and join matches during rollout.
* Rollout checklist explicitly covers fallback compatibility and rollback trigger.

Context references:
* .copilot-tracking/research/2026-06-25/colyseus-lobby-join-bug-research.md (Lines 21-23) - Mobile compatibility research gap.

Dependencies:
* Step 4.1 completion.

## Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm test
* npm run build

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 5.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research for unresolved contract mismatches.
* Avoid broad refactors inside this phase.

## Dependencies

* Node.js and npm scripts defined in package.json.
* Colyseus 0.17 server and browser SDK contract.
* Existing REST endpoints for compatibility fallback.

## Success Criteria

* Seat reservation consumption and fallback preserve Colyseus 0.17 payload and join options.
* Lobby behavior is native-first with deterministic REST fallback.
* Shared room attach and reconnect flow aligns with native reconnection semantics.
* Rollout includes compatibility and observability safeguards for fallback deprecation.
