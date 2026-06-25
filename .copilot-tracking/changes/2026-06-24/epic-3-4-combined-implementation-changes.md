<!-- markdownlint-disable-file -->
# Release Changes: Epic 3 and Epic 4 Combined Implementation

**Related Plan**: epic-3-4-combined-implementation-plan.instructions.md
**Implementation Date**: 2026-06-24

## Summary

Phases 1-3 complete: established Epic 3 and Epic 4 requirement/invariant guardrails, then delivered commander dashboard closure and kaiju UX closure with passing targeted validation suites.

## Changes

### Added

* None.

### Modified

* .copilot-tracking/details/2026-06-24/epic-3-4-combined-implementation-details.md
* .copilot-tracking/plans/2026-06-24/epic-3-4-combined-implementation-plan.instructions.md
* .copilot-tracking/plans/logs/2026-06-24/epic-3-4-combined-implementation-log.md
* .copilot-tracking/changes/2026-06-24/epic-3-4-combined-implementation-changes.md
* public/commander/index.html - Added commander alert controls and timeline panel structure.
* public/commander/styles.css - Added styling for alert mode and timeline/ETA presentation.
* public/commander/app.js - Added alert state handling, timeline/ETA rendering, and map-click targeting parity.
* public/kaiju/index.html - Added progressive-disclosure context switcher and continue/spectator clarity structure.
* public/kaiju/styles.css - Added styling updates for context switching and clearer continue overlay messaging.
* public/kaiju/app.js - Added context switcher behavior and explicit continue/spectator UX messaging updates.
* src/index.test.ts - Added/updated scaffold assertions for new commander and kaiju UI wiring.

### Removed

* None.

## Additional or Deviating Changes

* Baseline lint failed with a pre-existing tooling compatibility error (`Invalid value for lib provided: es2024`) and was documented as an environment blocker for implementation phases that require lint green.
* Commander alert severity remained client-interpreted using current event surfaces instead of introducing new protocol enum fields.
	* This kept shared contract churn out of scope while still satisfying Epic 3 UI closure requirements.
* Kaiju UX test updates remained in existing scaffold coverage (`src/index.test.ts`) rather than adding a new frontend harness.
	* This minimized scope and matched current repository testing patterns.

## Validation Evidence

* Phase 2 targeted validation passed:
	* `npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts`
	* `npm test -- src/index.test.ts`
* Phase 3 targeted validation passed:
	* `npm test -- src/game/MatchRoom.test.ts src/schema/MatchSchema.test.ts`
	* `npm test -- src/index.test.ts`
* Phase 4 full validation results:
	* `npm run lint` failed with 17 parsing errors (`Invalid value for lib provided: es2024`) and unsupported TypeScript version warning from `@typescript-eslint`.
	* `npm test -- --silent` passed (7/7 suites, 57/57 tests).
	* `npm run build` passed (`tsc`).

## Release Summary

Phases 1-3 deliverables are complete. Phase 4 validation has been executed and blocker reporting is complete.

Files affected so far:
* Tracking artifacts updated for planning, logging, and change capture under `.copilot-tracking/`.
* Commander client updates delivered in `public/commander/` for alert mode, timeline, ETA, and map targeting interaction parity.
* Kaiju client updates delivered in `public/kaiju/` for progressive disclosure, mode clarity, and continue overlay messaging.
* Acceptance-facing scaffold assertions updated in `src/index.test.ts`.

Validation status so far:
* Baseline `npm test` previously passed.
* Phase 2 and Phase 3 targeted test suites passed.
* Full-suite tests pass (`7/7` suites, `57/57` tests).
* Build passes (`tsc`).
* Lint remains blocked by known environment/tooling mismatch (`Invalid value for lib provided: es2024`).

Outstanding blocker: align TypeScript/eslint toolchain versions before lint-gate enforcement.
