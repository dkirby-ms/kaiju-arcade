<!-- markdownlint-disable-file -->
# Release Changes: Start Match Bounce Fix

**Related Plan**: start-match-bounce-fix-plan.instructions.md
**Implementation Date**: 2026-06-25

## Summary

Fixed kaiju reconnect after Start Match by replacing an invalid three-argument Colyseus join call with the shared REST-backed room-id join helper, preventing malformed JSON join requests that caused fallback routing to matchmaking/lobby.
Follow-up fix: prevented premature `MatchRoom` disposal during intentional Start Match handoff disconnects by preserving active rooms while reconnect windows are pending.

## Changes

### Added

* None

### Modified

* public/kaiju/app.js - Updated reconnectActiveMatch() to require KaijuColyseusClient helper, construct client via createClient(), and join via joinMatchById(client, roomId, options)
* src/game/MatchRoom.ts - Disabled implicit auto-dispose for match rooms; added idle-disconnect guard that only disposes when no sessions and no pending reconnect windows exist; treated ACTIVE-phase normal closes as reconnect-eligible for commander/kaiju handoff
* src/game/MatchRoom.test.ts - Added regression test covering Start Match handoff disconnect behavior so room is not disposed immediately while reconnect windows are active
* .copilot-tracking/plans/2026-06-25/start-match-bounce-fix-plan.instructions.md - Marked completed implementation and validation checklist steps
* .copilot-tracking/plans/logs/2026-06-25/start-match-bounce-fix-log.md - Recorded implementation-time deviation and added follow-on work for pending manual browser verification

### Removed

* None

## Additional or Deviating Changes

* Manual browser verification from Step 1.3 remains pending
  * Local execution environment here validated via lint/tests and static code inspection, but not via live browser/devtools flow

## Release Summary

5 files modified, 0 files added, 0 files removed.

Production-impacting code change:
* public/kaiju/app.js - reconnect path now uses the same shared seat-reservation join flow already used by commander, eliminating malformed request body risk from incorrect client.join signature usage.
* src/game/MatchRoom.ts - room lifecycle now keeps active matches alive through intentional client transitions, preventing immediate disposal between Start Match redirect and reconnect.

Validation:
* npm run lint: passed
* npm test: passed (7 suites, 82 tests)

Deployment notes:
* No dependency changes.
* No infrastructure/config changes.
* Commander reconnect behavior unchanged (no commander files modified).
