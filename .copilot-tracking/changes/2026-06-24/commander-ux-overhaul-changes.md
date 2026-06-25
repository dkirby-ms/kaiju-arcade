<!-- markdownlint-disable-file -->
# Release Changes: Commander UX Overhaul

**Related Plan**: .copilot-tracking/plans/2026-06-24/commander-ux-overhaul-plan.instructions.md
**Implementation Date**: 2026-06-24

## Summary

Implemented commander UX overhaul through all planned phases: map-stage HUD conversion, timeline removal from player-facing UX, feed-first event parity, status semantics normalization, scaffold test updates, and full validation.

## Changes

### Added

* None.

### Modified

* .copilot-tracking/plans/2026-06-24/commander-ux-overhaul-plan.instructions.md
	* Marked all implementation phases and steps complete.
* .copilot-tracking/changes/2026-06-24/commander-ux-overhaul-changes.md
	* Recorded end-to-end implementation outputs, validations, and release summary.
* .copilot-tracking/plans/logs/2026-06-24/commander-ux-overhaul-log.md
	* Logged implementation deviations and follow-on work discovered during execution.
* public/commander/index.html
	* Replaced stacked panel flow with map-stage HUD structure and four overlay cards (session, status, dispatch, feed).
	* Removed player-facing timeline section.
	* Added status semantic cue clarifying ACTIVE BARRIERS meaning and dispatch ownership for non-barrier inventory/cooldowns.
* public/commander/styles.css
	* Rebuilt layout to viewport-locked `100dvh` no-scroll shell and responsive overlay HUD behavior.
	* Added card anchoring, bounded list heights, and mobile compact layout behavior.
	* Added visual treatment for status semantic cue microcopy.
* public/commander/app.js
	* Removed timeline DOM dependencies and periodic timeline render loop.
	* Removed timeline side-effect coupling and preserved feed as canonical event stream.
	* Routed local commander notices (target lock, match start, alert-mode transitions) into signal feed pathway.
* src/index.test.ts
	* Updated commander scaffold assertions to new HUD anchors and removed timeline ID expectations.

### Removed

* None yet.

## Phase 1 Scope Lock

### Front-end-only contract boundary

Phase 1 confirms that commander UX work remains constrained to front-end surfaces unless a blocker is found.

Verified stable contract sources:

* src/messages/protocol.ts
	* Commander message and event contracts remain unchanged (`commander.select`, `commander.dispatch`, `commander.status`, `commander.dispatch.result`, and `signal.feed`).
* src/game/MatchRoom.ts
	* Commander status broadcast semantics remain unchanged, including `activeBarriers` sourced from live entities (`this.state.activeBarriers.length`) and existing dispatch/result broadcast behavior.

Contract impact decision:

* No protocol, schema, or server-room contract changes are included in Phase 1.
* Commander UX overhaul continues as a front-end-only refactor path for phases that follow.

### Timeline-removal and feed parity guardrail

Player-facing UX rule for this implementation stream:

* Timeline will be removed from player-facing commander layout.
* Any timeline-visible operational event needed for player decisions must remain visible through the signal feed path.

Guardrail checklist for upcoming implementation/review:

* Remove player-facing timeline markup and timeline append side-effects.
* Preserve feed severity classes and event visibility for dispatch outcomes, targeting context, and high-priority alerts.
* Treat feed as the canonical player-visible event stream after timeline removal.

## Validation Results

Baseline validation commands executed before layout refactor:

* `npm test -- src/index.test.ts`
	* Result: PASS
	* Summary: 1 suite passed, 13 tests passed.
* `npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts`
	* Result: PASS
	* Summary: 2 suites passed, 22 tests passed.
	* Note: Existing `console.warn` timing-drift logs were observed during `MatchRoom` tests and did not fail tests.

## Additional or Deviating Changes

* Phase 2 validation against `src/index.test.ts` failed initially due to intentional timeline ID removal before planned Phase 4 assertion updates.
	* Reason: expected sequencing dependency between layout rewrite and scaffold test modernization.
* Manual viewport checks at 1280x720, 1920x1080, and <=880 were not executed in this implementation run.
	* Reason: implementation run focused on code changes plus automated lint/build/test validations.

## Release Summary

Phases completed: 5/5.

Validation results:
* `npm test -- src/index.test.ts`: PASS (13/13 tests).
* `npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts`: PASS (22/22 tests).
* `npm test -- src/index.test.ts src/game/MatchRoom.test.ts src/messages/protocol.test.ts`: PASS (35/35 tests).
* `npm run lint`: PASS.
* `npm run build`: PASS.
* `npm test -- --silent`: PASS (57/57 tests, 7/7 suites).

Files affected:
* Modified: public/commander/index.html, public/commander/styles.css, public/commander/app.js, src/index.test.ts, .copilot-tracking/plans/2026-06-24/commander-ux-overhaul-plan.instructions.md, .copilot-tracking/plans/logs/2026-06-24/commander-ux-overhaul-log.md, .copilot-tracking/changes/2026-06-24/commander-ux-overhaul-changes.md.
* Added: none.
* Removed: none.

Contract and deployment notes:
* No protocol, schema, or server-room contract changes were introduced.
* Commander feed is the canonical player-visible event stream after timeline removal.
