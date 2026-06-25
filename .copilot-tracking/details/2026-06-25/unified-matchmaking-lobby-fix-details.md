<!-- markdownlint-disable-file -->
# Implementation Details: Unified Matchmaking Lobby Fix

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md, src/index.ts, src/game/MatchRoom.ts, src/schema/MatchSchema.ts, public/lobby.html, public/common/session-manager.js, public/commander/app.js, public/kaiju/app.js, /memories/repo/kaiju-arcade-notes.md.

## Implementation Phase 1: Stabilize Match Discovery and Lobby Entry Contract

<!-- parallelizable: false -->

### Step 1.1: Align the global lobby payload with server metadata

Extend the existing GET /api/matches response so the global lobby can render room phase and slot availability from a single authoritative payload.

Files:
* src/index.ts - Include room metadata fields already maintained by MatchRoom in the REST room listing response.
* src/game/MatchRoom.ts - Verify metadata updates stay current for status, commander occupancy, kaiju slots, and room labels.

Discrepancy references:
* Addresses DD-01.

Success criteria:
* GET /api/matches returns metadata required by public/lobby.html without client-side guessing.
* Returned metadata includes the room lifecycle state, commander availability, and remaining kaiju capacity.
* Existing create and join reservation endpoints remain backward compatible during the transition.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Current REST listing omissions and current room metadata behavior.

Dependencies:
* None.

### Step 1.2: Make the lobby entry flow role-agnostic

Remove role commitment from the global lobby create and join actions so the shared lobby only reserves entry into a specific match room.

Files:
* public/lobby.html - Stop storing selectedRole before redirect, stop routing directly to commander or kaiju pages, and redirect to a shared pre-match room page.
* public/common/session-manager.js - Add helpers for storing pending seat reservations and current room identity without requiring a chosen role.

Success criteria:
* Creating or joining from public/lobby.html stores room and reservation state without selecting commander or kaiju.
* The next route after lobby actions is a shared pre-match page rather than a role-specific gameplay page.
* Session storage retains only the values needed to consume the reserved seat and recover the current room.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Verified redirect mismatch in the current shared lobby flow.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Update the join reservation contract for role-agnostic room entry

Change the server join reservation path so clients can reserve a seat in a room without choosing commander or kaiju up front, while documenting backward compatibility for any legacy role-bearing requests.

Files:
* src/index.ts - Accept roleless join reservations for the shared pre-match flow, define how legacy role and playerRole inputs are handled during the transition, and preserve seat reservation responses.
* src/index.test.ts - Add or update endpoint tests for role-agnostic reservations and legacy compatibility behavior.

Success criteria:
* POST /api/matches/:roomId/join supports role-agnostic room entry for the shared pre-match flow.
* The implementation explicitly defines whether legacy role-bearing join payloads are ignored, deprecated, or translated during the migration.
* Targeted tests cover both the new role-agnostic contract and any retained backward-compatible behavior.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Current join endpoint role coupling and requested in-room role-selection timing.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate room discovery and lobby entry changes

Run focused checks before adding new in-room role selection behavior.

Validation commands:
* npm test -- --runInBand src/index.test.ts src/game/MatchRoom.test.ts
* npm run build

## Implementation Phase 2: Move Role Assignment and Readiness into MatchRoom

<!-- parallelizable: false -->

### Step 2.1: Replace join-time role assignment with in-room role claim

Refactor MatchRoom so joining reserves a player session without permanently assigning commander or kaiju. Add explicit messages for claiming and releasing roles inside the room.

Files:
* src/game/MatchRoom.ts - Introduce role-claim handling, role release behavior, validation for commander uniqueness and kaiju capacity, and role-aware metadata updates.
* src/messages/protocol.ts - Add or update protocol message types for role claim and role release.
* src/schema/MatchSchema.ts - Add any state fields required to represent claimed role and room-level presence before the match starts.

Success criteria:
* A player can join the match room without being forced into commander or kaiju during onJoin.
* The server enforces one commander slot and bounded kaiju slots when role claims occur.
* Room metadata reflects role occupancy after claims and releases.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Current onJoin role assignment conflict and recommended role-claim protocol.
* /memories/repo/kaiju-arcade-notes.md - Reconnect token and session identity constraints.

Dependencies:
* Step 1.3 completion.

### Step 2.2: Add readiness tracking and start gating in the room

Require players to claim a role and mark ready before the commander can start the match, then preserve the existing ACTIVE transition and broadcast model.

Files:
* src/game/MatchRoom.ts - Add ready-toggle handling, all-ready or minimum-ready validation, and start gating from the LOBBY phase.
* src/messages/protocol.ts - Add or update readiness message types.
* src/schema/MatchSchema.ts - Add readiness state fields required by the pre-match UI.

Success criteria:
* The room tracks each participant's claimed role and readiness in the pre-match phase.
* commander.start is rejected until role and readiness requirements are satisfied.
* The room transitions from LOBBY to ACTIVE only after successful validation and still emits match.phase and match.start events.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - LOBBY phase reuse and recommended ready-and-start contract.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate room protocol and lifecycle updates

Validation commands:
* npm test -- --runInBand src/game/MatchRoom.test.ts src/messages/protocol.test.ts src/schema/MatchSchema.test.ts
* npm run build

## Implementation Phase 3: Add and Validate the Shared Pre-Match Room Experience

<!-- parallelizable: false -->

### Step 3.1: Create the shared pre-match room page and client controller

Introduce a new room page that consumes the pending seat reservation, attaches to the room, renders current roster and phase state, and owns the role-selection and readiness UI.

Files:
* public/match-room.html - New shared pre-match room shell for all players before match start.
* public/common/match-room-app.js - New shared browser controller for reservation consumption, room attachment, roster rendering, role claim, readiness, and start transition handling.
* src/index.ts - Serve the new static asset if route handling needs explicit coverage.

Success criteria:
* Players who create or join from the global lobby land in public/match-room.html.
* The page renders room state, participant list, available roles, readiness controls, and match start status.
* The page remains the only pre-match surface for both commander and kaiju players.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Recommended shared pre-match room architecture.

Dependencies:
* Step 2.2 completion.

### Step 3.2: Route from the shared pre-match room into active gameplay clients only after activation

Treat public/commander and public/kaiju as active-match clients that are entered after the server finalizes the player's claimed role and starts the match.

Files:
* public/common/match-room-app.js - Listen for match.phase and match.start updates and redirect into the correct gameplay client when the room becomes ACTIVE.
* public/common/session-manager.js - Persist finalized role and active-match reconnect context when the match starts.
* public/commander/app.js - Accept entry from the shared pre-match page and skip legacy create-flow assumptions.
* public/kaiju/app.js - Accept entry from the shared pre-match page and skip legacy join-flow assumptions.

Success criteria:
* Players are not redirected into commander or kaiju pages until the room becomes ACTIVE.
* Finalized role selection is persisted at activation time and reused by the active-match client.
* Active-match clients can reconnect to an existing active room without recreating matchmaking state.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Requested browser flow and gameplay-client reuse guidance.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Validate the shared pre-match room flow

Discrepancy references:
* Addresses DD-02.

Validation commands:
* npm test -- --runInBand src/index.test.ts src/game/MatchRoom.test.ts src/schema/MatchSchema.test.ts
* npm run build

Manual checks:
* Entry page to global lobby to shared pre-match room transition works.
* Refreshing the shared pre-match room before role claim restores the reserved seat or reconnect path.
* Refreshing the shared pre-match room after role claim preserves or rehydrates the claimed-room state correctly.
* Reservation consumption failure or stale session storage returns the player to the global lobby without silently entering a gameplay client.
* Starting a match from the shared pre-match room routes each player to the correct gameplay client.

## Implementation Phase 4: Reduce Legacy Matchmaking Behavior in Gameplay Clients

<!-- parallelizable: true -->

### Step 4.1: Remove commander-side duplicate matchmaking behavior

Strip create-match and fallback auto-create behavior from the commander client, leaving only active-match bootstrapping and reconnect-safe entry.

Files:
* public/commander/index.html - Remove visible Create Match control from the gameplay client.
* public/commander/app.js - Remove or guard createAndJoinAsCommander and any automatic fallback that creates a match when no room context exists.

Success criteria:
* The commander client no longer behaves as a second lobby or match-creation surface.
* Missing room context routes the player back to the correct upstream page rather than silently creating a match.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Duplicate commander-lobby behavior and fallback auto-create evidence.

Dependencies:
* Step 3.2 completion.
* Step 2.2 completion.

### Step 4.2: Remove kaiju-side duplicate join behavior

Strip direct join assumptions from the kaiju client so it only initializes from a valid active-match context or reconnect path.

Files:
* public/kaiju/app.js - Remove legacy join-only matchmaking behavior that belongs to the shared pre-match room.
* public/common/session-manager.js - Ensure expired or missing active-match context returns users to the global lobby or shared pre-match room appropriately.

Success criteria:
* The kaiju client no longer acts as a second pre-match join surface.
* Missing or stale room state routes the player back to the appropriate upstream page.

Context references:
* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md - Duplicate kaiju join behavior evidence.

Dependencies:
* Step 3.2 completion.
* Step 2.2 completion.

### Step 4.3: Validate gameplay-client cleanup

Validation commands:
* npm run build
* npm test -- --runInBand src/index.test.ts src/game/MatchRoom.test.ts

Manual checks:
* Visiting commander or kaiju pages directly without valid room context does not create or join a new match.
* Reconnect into an active match still works from both gameplay clients.

## Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm test
* npm run build

Known constraint:
* npm run lint may still be blocked by the existing TypeScript and @typescript-eslint environment mismatch documented in /memories/repo/kaiju-arcade-notes.md.

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 5.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend follow-on research if protocol or lifecycle assumptions prove incomplete.
* Avoid broad refactors inside the validation pass.

## Dependencies

* Node.js and npm scripts defined in package.json.
* Existing Colyseus seat-reservation flow and reconnect-token behavior.
* Browser assets under public/ remaining on the current vanilla JavaScript architecture.

## Success Criteria

* The shared global lobby remains the only discovery and room-entry surface.
* A new shared pre-match room handles roster display, role claim, readiness, and start transitions.
* MatchRoom becomes authoritative for in-room role claim and readiness rather than join-time role assignment.
* Commander and kaiju clients become active-match clients instead of duplicate matchmaking surfaces.
