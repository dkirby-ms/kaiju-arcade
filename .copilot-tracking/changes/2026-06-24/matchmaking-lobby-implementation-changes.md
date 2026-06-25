<!-- markdownlint-disable-file -->
# Release Changes: Matchmaking Lobby Architecture

**Related Plan**: matchmaking-lobby-implementation-plan.instructions.md
**Implementation Date**: 2026-06-24

## Summary

Implement dedicated matchmaking lobby architecture with role/name capture, realtime room discovery, explicit WAITING -> LOBBY -> ACTIVE lifecycle, and reconnect continuity across lobby and match flows.

## Changes

### Added

* public/index.html - Added dedicated entry page for role and player-name capture before matchmaking.
* public/lobby.html - Added dedicated lobby UI with realtime room discovery and create/join actions.
* public/common/session-manager.js - Added shared session helpers for role/name/currentMatchId/reconnectionToken lifecycle.
* public/common/colyseus-client.js - Added shared Colyseus client and lobby list subscription helpers.
* .copilot-tracking/plans/logs/2026-06-24/matchmaking-lobby-implementation-log.md - Added discrepancy and follow-on planning log.

### Modified

* src/index.ts - Enabled realtime room listing and served root/lobby/common static assets for new lobby flow.
* src/game/MatchRoom.ts - Added WAITING -> LOBBY -> ACTIVE lifecycle, match.phase broadcasts, commander.start gating, and room metadata refresh updates.
* src/schema/MatchSchema.ts - Updated lifecycle state semantics to include LOBBY.
* src/index.test.ts - Added assertions for realtime listing and new entry/lobby/common routes.
* src/game/MatchRoom.test.ts - Updated lifecycle tests for LOBBY gating and commander-start activation behavior.
* public/commander/index.html - Added lobby-phase commander controls and active-UI gating hooks.
* public/commander/app.js - Added reconnect-first join flow, lobby phase rendering, commander.start send, and lobby fallback behavior.
* public/kaiju/index.html - Added lobby-phase waiting panel and active-UI gating hooks.
* public/kaiju/app.js - Added reconnect-first join flow, lobby phase rendering, and lobby fallback behavior.
* .copilot-tracking/plans/2026-06-24/matchmaking-lobby-implementation-plan.instructions.md - Marked all phases and steps complete.

### Removed

* (none)

## Additional or Deviating Changes

* Manual multi-client browser validation checklist was not executed during this implementation pass.
	* Automated lint/test/build validation completed successfully; manual E2E follow-up captured in planning log.
* Existing unrelated workspace modifications were left intact and not reverted.
	* Preserved user changes outside matchmaking scope.

## Release Summary

Phases completed: 4/4.

Validation results:
* npm test -- src/game/MatchRoom.test.ts src/schema/MatchSchema.test.ts src/messages/protocol.test.ts: PASS.
* npm test -- src/index.test.ts src/game/MatchRoom.test.ts: PASS.
* npm run lint: PASS.
* npm test: PASS.
* npm run build: PASS.

Files affected:
* Added: public/index.html, public/lobby.html, public/common/session-manager.js, public/common/colyseus-client.js, .copilot-tracking/plans/logs/2026-06-24/matchmaking-lobby-implementation-log.md.
* Modified: src/index.ts, src/game/MatchRoom.ts, src/schema/MatchSchema.ts, src/index.test.ts, src/game/MatchRoom.test.ts, public/commander/index.html, public/commander/app.js, public/kaiju/index.html, public/kaiju/app.js, .copilot-tracking/plans/2026-06-24/matchmaking-lobby-implementation-plan.instructions.md.
* Removed: none.

Deployment/runtime notes:
* Match room registration now uses realtime listing for LobbyRoom discovery.
* Browser flow is now entry -> lobby -> match role client with session-backed role/name/match/reconnect continuity.
* Match gameplay transitions are phase-gated (WAITING/LOBBY/ACTIVE) with commander-controlled start.
