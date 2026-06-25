<!-- markdownlint-disable-file -->
# Implementation Details: Matchmaking Lobby Architecture

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md, src/index.ts, src/game/MatchRoom.ts, src/schema/MatchSchema.ts, public/commander/app.js, public/kaiju/app.js, /memories/repo/kaiju-arcade-notes.md.

## Implementation Phase 1: Backend Lobby and Match Lifecycle Contract

<!-- parallelizable: false -->

### Step 1.1: Enable Colyseus realtime room listing and lobby compatibility

Update server room registration so match rooms are automatically visible to LobbyRoom clients, while keeping existing routes and room handlers working.

Files:
* src/index.ts - Enable realtime listing on MatchRoom and preserve existing route wiring.

Discrepancy references:
* Addresses DR-01 by implementing framework-native room discovery instead of polling-based alternatives.

Success criteria:
* MatchRoom registration includes realtime listing.
* Existing REST routes continue to function for backward compatibility.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 101-119) - recommended server configuration.

Dependencies:
* None.

### Step 1.2: Add explicit WAITING -> LOBBY -> ACTIVE phase transitions in MatchRoom

Introduce or normalize a dedicated lobby phase in the authoritative room lifecycle and ensure phase transitions are broadcast to clients.

Files:
* src/game/MatchRoom.ts - Lifecycle state transitions and match phase broadcasts.
* src/schema/MatchSchema.ts - Metadata/state fields if needed to represent lobby phase explicitly.

Discrepancy references:
* Addresses DR-02 by separating matchmaking and gameplay state.

Success criteria:
* Match enters WAITING when created, LOBBY when role minimum is met, ACTIVE only after commander start.
* Server emits consistent phase update messages consumable by both commander and kaiju clients.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 278-349) - phase transition pattern.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Persist player identity and role through room join and reconnection flows

Ensure playerName and role from client join options are validated, assigned to server-side session state, and represented in room metadata for lobby visibility.

Files:
* src/game/MatchRoom.ts - Option parsing, role slot checks, session storage, metadata updates.
* src/schema/MatchSchema.ts - Player identity fields as needed.

Discrepancy references:
* Addresses DR-03 by preserving player names and role identity end-to-end.

Success criteria:
* Commander uniqueness and kaiju capacity validation are enforced server-side.
* playerName is stored for commander and kaiju state entries.
* Lobby metadata reflects status and current player count.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 236-277) - metadata and validation pattern.
* /memories/repo/kaiju-arcade-notes.md (Lines 6, 37-39) - token-based reconnection and lifecycle guidance.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate backend phase changes

Run backend-focused checks before client implementation begins.

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/schema/MatchSchema.test.ts src/messages/protocol.test.ts - room lifecycle and protocol safety.
* npm run build - TypeScript compile verification for room/schema/index changes.

## Implementation Phase 2: Entry and Dedicated Lobby Client Flow

<!-- parallelizable: true -->

### Step 2.1: Build role and player-name entry page flow

Implement entry UI that captures role and player name before lobby connection, persists values in sessionStorage, and redirects into the dedicated lobby page.

Files:
* public/index.html - Entry form and role selection controls.
* public/common/session-manager.js - Helpers for role/name/reconnect token storage and validation.

Discrepancy references:
* Addresses DR-04 by creating clear role selection -> lobby flow.

Success criteria:
* Entry flow blocks navigation when player name is empty.
* Role and playerName are stored in sessionStorage and accessible from lobby/game pages.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 521-569) - entry form pattern.

Dependencies:
* Step 1.3 completion.

### Step 2.2: Implement dedicated lobby page with live room discovery and match actions

Create a dedicated lobby view that connects to Colyseus lobby, subscribes to room list updates, and supports match creation and joining.

Files:
* public/lobby.html - Lobby UI and room list rendering.
* public/common/colyseus-client.js - Shared same-origin Colyseus client initialization and reconnect helpers.
* src/index.ts - Optional route/static serving updates for lobby/common assets if required.

Discrepancy references:
* Addresses DR-01 and DR-02 by moving room discovery into LobbyRoom message flow.

Success criteria:
* Lobby shows initial room list and realtime add/remove updates.
* Player can create a match and join an existing match from lobby.
* currentMatchId and reconnectionToken are persisted on successful match join.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 190-234) - lobby message contract.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate lobby page behavior

Run focused checks to ensure server and lobby client remain interoperable.

Validation commands:
* npm test -- src/index.test.ts src/game/MatchRoom.test.ts - server registration and room lifecycle checks.
* npm run build - compile check for backend/client integration assets.

## Implementation Phase 3: Commander and Kaiju Client Transition to Lobby-Aware Match Join

<!-- parallelizable: false -->

### Step 3.1: Add lobby phase rendering and commander-controlled game start

Update commander and kaiju clients so they render a pre-game lobby phase and only transition to active gameplay when commander.start succeeds.

Files:
* public/commander/app.js - Lobby phase UI state and commander.start message emission.
* public/kaiju/app.js - Lobby waiting state and phase transition handling.
* public/commander/index.html - Commander lobby panel and start button UI.
* public/kaiju/index.html - Kaiju lobby waiting panel UI.

Discrepancy references:
* Addresses DR-05 by separating game HUD from pre-match organization.

Success criteria:
* Both clients show lobby-phase UI when room phase is LOBBY.
* Only commander can start the match.
* ACTIVE gameplay UI renders only after phase transitions to ACTIVE.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 393-519) - role-specific lobby phase UI.

Dependencies:
* Step 2.2 completion.

### Step 3.2: Implement robust reconnect token handling in commander and kaiju clients

Adopt token-based reconnect attempts in game clients, refresh tokens after successful reconnects, and route users back to lobby when reconnect cannot be restored.

Files:
* public/commander/app.js - reconnect attempt loop and handler reattachment.
* public/kaiju/app.js - reconnect attempt loop and handler reattachment.
* public/common/session-manager.js - token read/write/remove helpers.

Discrepancy references:
* Addresses DR-06 by hardening cross-room session continuity.

Success criteria:
* reconnectToken is captured after each successful join/reconnect.
* Clients attempt reconnect first when currentMatchId and token exist.
* Failed reconnects return users to lobby with recoverable session state.

Context references:
* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md (Lines 351-391) - reconnection strategy.
* /memories/repo/kaiju-arcade-notes.md (Lines 6, 39) - token lifecycle constraints.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Validate client transition and reconnection behavior

Run targeted tests and a scripted manual checklist for end-to-end role flow.

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/index.test.ts - server-side flow coverage.
* npm run build - final compile check.

Manual checks:
* Commander entry -> lobby -> create -> start path works.
* Kaiju entry -> lobby -> join path works.
* Temporary disconnect reconnects successfully within allowed window.
* Expired reconnect token returns player to lobby.

Dependencies:
* Step 3.2 completion.

## Implementation Phase 4: Full Validation and Delivery Readiness

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm test
* npm run build

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 4.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document affected files and failure mode.
* Provide next-step recommendation and follow-on planning items.
* Avoid broad refactors in this implementation pass.

## Dependencies

* Node.js and npm scripts defined in package.json.
* Colyseus 0.17 server APIs and Colyseus.js browser client compatibility.

## Success Criteria

* Dedicated lobby view exists and players can discover/create/join matches without immediate gameplay start.
* Player role and name persist from entry through lobby, match, and reconnect transitions.
* Match lifecycle explicitly supports WAITING, LOBBY, and ACTIVE transitions with commander-gated start.
* Existing combat/game-loop behavior remains intact while adding lobby flow.