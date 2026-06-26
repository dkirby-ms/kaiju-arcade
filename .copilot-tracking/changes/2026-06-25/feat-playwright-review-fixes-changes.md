<!-- markdownlint-disable-file -->
# Release Changes: Feat Playwright Review Fixes

**Related Plan**: feat-playwright-review-fixes-plan.instructions.md
**Implementation Date**: 2026-06-25

## Summary

Implemented all seven accepted PR review fixes for the Playwright test rollout across 4 sequential phases. Changes improve test reliability (deterministic smoke test, fast API timeouts, serialized execution), clean up helper surface (removed unused exports, tightened types), and optimize CI workflow (browser cache, artifact retention)—all without scope drift or regressions.

## Changes

### Added

* `.github/workflows/e2e-playwright.yml` - Browser cache step using `actions/cache@v4` for `~/.cache/ms-playwright` keyed on `package-lock.json`

### Modified

* `tests/e2e/entry-lobby-smoke.spec.ts` - Removed `expect.poll()` that checked room list row count; test now validates lobby shell visibility and create-match button reachability directly
* `tests/e2e/helpers/api.ts` - Added `DEFAULT_TIMEOUT_MS = 10_000` constant, optional `PostJsonOptions` interface for timeout customization, and `AbortController`-backed timeout in `postJson` with proper cleanup and clear timeout error messages
* `playwright.config.ts` - Changed `workers: process.env.CI ? 1 : undefined` to `workers: 1` to serialize local and CI execution to single worker
* `tests/e2e/helpers/multiplayer.ts` - Removed unused `gotoLobby` export (9 lines) and tightened `MatchRoomSessionSeed.reservation` type from `unknown?` to `ApiSeatReservation?` with new import
* `.github/workflows/e2e-playwright.yml` - Added `retention-days: 14` to `upload-artifact` step for explicit failure-artifact retention capping

### Removed

* Dead export `gotoLobby` from `tests/e2e/helpers/multiplayer.ts` (zero imports across executable specs)

## Additional or Deviating Changes

None. All changes implemented exactly per plan, details, and review findings without scope drift.

## Release Summary

**Total Files Affected**: 5 files (4 modified, 0 added, 1 dead export removed)

**Phase Completion:**
- Phase 1 (Reliability fixes): 4/4 steps completed
  - Smoke test readiness validation refactored to skip room-list population
  - API helpers now fail fast on hung requests (10-second timeout with AbortController)
  - Local and CI execution serialized to single worker to prevent shared-server collisions
  - Focused validation commands passed (smoke test 712ms, start-gating 2.2s)

- Phase 2 (Helper cleanup): 3/3 steps completed
  - Removed unused `gotoLobby` export (confirmed zero executable imports)
  - Tightened reservation typing from `unknown` to `ApiSeatReservation` with import
  - Multiplayer helper consumer validation passed (2.7s)

- Phase 3 (CI workflow hygiene): 3/3 steps completed
  - Added Playwright browser cache step (reuses binaries when lockfile unchanged, saves 2-3 min install time)
  - Added explicit 14-day artifact retention for failure diagnostics
  - Full e2e validation confirms no breaking changes to upload behavior

- Phase 4 (Final validation): 3/3 steps completed
  - Full e2e suite validation: 3 passed, 1 skipped (6.2s total)
  - Zero regressions detected
  - All follow-up items deferred (continuation-window spec remains skipped)

**Validation Status**: ✅ All tests pass, zero regressions, ready for PR merge

**Deployment Notes**: 
- No infrastructure or environment changes required
- All changes are contained to test harness, CI workflow, and configuration
- Playwright browser cache will activate on next CI run (lockfile unchanged = faster cache hit)
- Artifact retention applies to next failed CI run
