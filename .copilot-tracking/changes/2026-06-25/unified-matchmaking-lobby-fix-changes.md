<!-- markdownlint-disable-file -->
# Release Changes: Unified Matchmaking Lobby Fix

**Related Plan**: unified-matchmaking-lobby-fix-plan.instructions.md
**Implementation Date**: 2026-06-25

## Summary

Implement the shared matchmaking flow that keeps one global lobby, introduces a shared pre-match room, and limits commander and kaiju clients to active-match gameplay.

## Changes

### Added

* public/match-room.html - Added a temporary shared pre-match handoff page so the lobby can redirect to a role-agnostic room surface before full pre-match behavior is implemented.
* public/common/match-room-app.js - Added the shared pre-match room controller for reservation consumption, roster rendering, role claim, readiness, and activation routing.

### Modified

* src/index.ts - Exposed room metadata in the REST match listing and made generic room seat reservations role-agnostic.
* src/index.test.ts - Updated API coverage for richer match listings, role-agnostic join reservations, and the shared pre-match route.
* src/game/MatchRoom.ts - Kept room listing metadata aligned with the global lobby payload expected by the shared lobby.
* src/game/MatchRoom.ts - Replaced join-time-only role assignment with in-room role claim, role release, and readiness gating while preserving the ACTIVE lifecycle and legacy join-option compatibility.
* src/messages/protocol.ts - Added protocol messages and validators for role claim, role release, and readiness updates.
* src/messages/protocol.test.ts - Added targeted protocol coverage for the shared pre-match message contract.
* src/schema/MatchSchema.ts - Added participant, claimed-role, and readiness state needed for the shared pre-match room.
* src/schema/MatchSchema.test.ts - Updated schema tests for participant and readiness state.
* src/game/MatchRoom.test.ts - Added room lifecycle coverage for explicit role claims, readiness, and start gating.
* public/lobby.html - Removed early role commitment and redirected all create and join actions into the shared pre-match room.
* public/common/session-manager.js - Added room-context helpers so matchmaking state can persist without a chosen gameplay role.
* public/common/session-manager.js - Added active-match session persistence for role-finalized activation routing into gameplay clients.
* public/common/colyseus-client.js - Reused the reservation flow for the shared pre-match room and active-client reattachment.
* public/match-room.html - Replaced the placeholder route target with a real shared pre-match room UI.
* public/commander/app.js - Accepted activation-time handoff from the shared pre-match room and reused active-match session context.
* public/commander/app.js - Removed local match-creation fallback behavior so missing context routes upstream instead of creating a new match.
* public/commander/index.html - Removed commander-side duplicate match-creation UI from the active-match client shell.
* public/kaiju/app.js - Accepted activation-time handoff from the shared pre-match room and reused active-match session context.
* public/kaiju/app.js - Reduced the kaiju client to reconnect-only active-match entry and routed stale contexts upstream.
* public/kaiju/index.html - Removed duplicate room-selection and join controls from the active-match client shell.

### Removed

## Additional or Deviating Changes

* Added a minimal shared pre-match shell earlier than the full pre-match controller planned for Phase 3.
	* Reason: Phase 1 needed a concrete role-agnostic route target so the new lobby entry flow could be implemented and validated without pulling the full room UX forward.
* Preserved legacy join payload handling in MatchRoom while introducing explicit in-room role claim.
	* Reason: Existing browser flows still pass `role` or `playerRole` during join, and removing that compatibility before Phase 3 would have broken the transition path.
* Extended reconnect-style handoff support for commander activation routing.
	* Reason: Redirecting from the shared pre-match room into the commander gameplay page would otherwise terminate the active room session during page transition.
* Did not change the shared session manager during Phase 4.
	* Reason: Existing room-context and active-match session helpers were already sufficient once the gameplay clients stopped treating missing context as permission to create or join locally.

## Release Summary

Implemented the unified matchmaking lobby flow end to end.

Files added:
* public/match-room.html - Shared pre-match room page for all players before activation.
* public/common/match-room-app.js - Shared room controller for reservation consumption, role claim, readiness, and activation routing.

Files modified:
* src/index.ts - Match listing metadata and role-agnostic room entry reservation contract.
* src/index.test.ts - API and route coverage for shared lobby and match-room entry behavior.
* src/game/MatchRoom.ts - MatchRoom-authoritative role claim, readiness, reconnect-safe activation, and metadata updates.
* src/game/MatchRoom.test.ts - Room lifecycle coverage for claims, readiness, reconnect, and activation behavior.
* src/messages/protocol.ts - Shared pre-match message contract for role claim, role release, and readiness.
* src/schema/MatchSchema.ts - Participant, claimed-role, and readiness state for the shared pre-match experience.
* public/lobby.html - Single global lobby flow with role-agnostic routing into the shared pre-match room.
* public/common/session-manager.js - Room-context and active-match session persistence across page transitions.
* public/common/colyseus-client.js - Shared reservation and reconnect helpers reused by lobby, match-room, and gameplay clients.
* public/commander/index.html - Removed duplicate commander-side matchmaking entry controls.
* public/commander/app.js - Reduced commander flow to active-match reconnect and upstream routing.
* public/kaiju/index.html - Removed duplicate kaiju-side matchmaking entry controls.
* public/kaiju/app.js - Reduced kaiju flow to active-match reconnect and upstream routing.

Validation:
* `npm run lint` - Passed.
* `npm test` - Passed (`7` suites, `77` tests).
* `npm run build` - Passed.

Follow-on notes:
* Manual browser checks for refresh behavior, stale reservation recovery, and direct-page-entry reconnect remain recommended follow-on validation.
