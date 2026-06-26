<!-- markdownlint-disable-file -->
# Release Changes: Issue 22 Playwright Test Coverage

**Related Plan**: issue-22-playwright-test-coverage-plan.instructions.md
**Implementation Date**: 2026-06-25

## Summary

Implement deterministic Playwright end-to-end coverage for critical multiplayer browser flows with a Chromium-first harness, merge-gating P0 UI flows, optional API-assisted expansion, and CI diagnostics.

## Changes

### Added

* .github/workflows/e2e-playwright.yml - Deterministic Playwright CI workflow with Chromium install and failure artifact upload.
* playwright.config.ts - Playwright configuration with Chromium-first project, CI retries, trace/video/screenshot diagnostics, and webServer health gating.
* tests/e2e/continue-window.spec.ts - Deferred P2 continuation/spectator skeleton marked non-blocking.
* tests/e2e/entry-lobby-smoke.spec.ts - P0 entry-to-lobby smoke coverage validating create-match journey.
* tests/e2e/helpers/api.ts - API-assisted helper utilities for room reservation and join setup.
* tests/e2e/multiplayer-start.spec.ts - P0 pure-UI two-user happy-path commander/kaiju flow.
* tests/e2e/start-gating.spec.ts - P1 API-assisted start-gating behavior coverage.

### Modified

* package-lock.json - Dependency lock updates after adding Playwright tooling.
* package.json - Added `@playwright/test` and `test:e2e` script variants.
* public/commander/index.html - Added stable route markers via `data-testid` hooks.
* public/kaiju/index.html - Added stable route markers via `data-testid` hooks.
* public/lobby.html - Added test hooks for lobby root, room list, create action, and dynamic room-entry controls.
* public/match-room.html - Added stable test hooks for room root, phase/room labels, role claim, ready, and start controls.
* tests/e2e/helpers/multiplayer.ts - Added shared two-context setup/cleanup and session seed helper for API-assisted match-room bootstrap.

### Removed

* None

## Additional or Deviating Changes

* `npx playwright test --list` initially returned "No tests found" before Phase 2 specs were created.
	* This was resolved in the same implementation by adding P0/P1 specs; final discovery reports 4 tests across 4 files.
* Local `test-results/` and `playwright-report/` directories generated during validation were not retained as source changes.
	* These are transient artifacts and were removed from the working tree before consolidation.

## Release Summary

Implemented full Issue 22 Playwright coverage plan across four phases.

Validation summary:

* `npx playwright test --list` reports 4 tests in 4 files.
* `npm run test:e2e` passes with 3 passed and 1 skipped (deferred continuation skeleton).
* `npm test -- --runInBand --silent` passes with 7 suites and 84 tests.

Files affected:

* Added: 7 files
* Modified: 7 files
* Removed: 0 files

Outcome:

* Playwright tooling is configured with deterministic CI/local defaults.
* P0 pure-UI multiplayer coverage is present and passing.
* P1 API-assisted start-gating coverage is present and passing.
* Optional P2 continuation scenario is captured as deferred, non-blocking skeleton.
* CI workflow for Playwright execution and diagnostics is in place.
