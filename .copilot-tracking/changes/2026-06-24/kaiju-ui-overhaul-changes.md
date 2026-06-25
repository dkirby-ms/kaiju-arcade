<!-- markdownlint-disable-file -->
# Release Changes: Kaiju UI Overhaul

**Related Plan**: .copilot-tracking/plans/2026-06-24/kaiju-ui-overhaul-plan.instructions.md
**Implementation Date**: 2026-06-24

## Summary

Implemented kaiju UI overhaul phases for integrated HUD layout, reconnect token privacy, WASD directional controls, always-visible tactical map behavior, and map readability enhancements while preserving existing backend contracts.

## Changes

### Added

* None yet.

### Modified

* public/kaiju/index.html - Replaced tabbed context model with integrated HUD layout, removed visible reconnect token input, and introduced directional control cluster.
* public/kaiju/styles.css - Reworked layout to persistent responsive grid areas and added directional control cluster styling.
* public/kaiju/app.js - Removed context panel toggle dependencies, implemented storage-backed reconnect token helpers, added WASD/arrow directional input state with vector-to-heading conversion and send thresholding, preserved lockouts, and added map heading/label overlays.
* src/index.test.ts - Updated kaiju scaffold assertions to integrated HUD structure and directional-input/reconnect helper expectations.

### Removed

* None yet.

## Additional or Deviating Changes

* Validation required updating stale scaffold assertions in src/index.test.ts after intentional removal of tabbed kaiju UI artifacts.
	* Reason: tests still expected context-switcher and setContextPanel symbols removed by the planned UI redesign.
* Manual browser checks listed in phase validation steps were not executed in this implementation run.
	* Reason: implementation focused on code and automated validation commands defined in the plan.

## Release Summary

Phases completed: 4/4.

Validation results:
* npm test -- src/index.test.ts: PASS (13/13 tests).
* npm test -- src/game/MatchRoom.test.ts src/game/GameLoop.test.ts: PASS (25/25 tests).
* npm test -- src/messages/protocol.test.ts src/schema/MatchSchema.test.ts: PASS (7/7 tests).
* npm test -- --silent: PASS (57/57 tests, 7/7 suites).
* npm run lint: PASS.
* npm run build: PASS.

Files affected:
* Modified: public/kaiju/index.html, public/kaiju/styles.css, public/kaiju/app.js, src/index.test.ts.
* Added: none.
* Removed: none.

Deployment/runtime notes:
* No protocol or server contract changes were introduced.
* Reconnect reclaim remains token-based through storage-backed join options.
* Tactical map remains read-only and now includes directional readability overlays.
