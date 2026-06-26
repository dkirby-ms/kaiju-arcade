<!-- markdownlint-disable-file -->
# Implementation Details: Feat Playwright Review Fixes

## Context Reference

Sources: .copilot-tracking/pr/review/feat-playwright/handoff.md, .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md, tests/e2e/entry-lobby-smoke.spec.ts, tests/e2e/helpers/api.ts, tests/e2e/helpers/multiplayer.ts, playwright.config.ts, .github/workflows/e2e-playwright.yml, package.json, public/lobby.html

## Implementation Phase 1: Reliability fixes for local and CI execution

<!-- parallelizable: false -->

### Step 1.1: Remove the misleading lobby room-count poll from the smoke spec

Update tests/e2e/entry-lobby-smoke.spec.ts so the smoke test proves lobby readiness through stable UI state rather than room-list population. Keep the existing path focused on entry load, lobby navigation, visible lobby shell, and enabled create-match action. Do not seed a room in this smoke path because that would broaden the test from smoke validation into setup-heavy behavior.

Files:
* tests/e2e/entry-lobby-smoke.spec.ts - Replace the room-list li-count poll with the already-supported readiness assertions

Success criteria:
* The smoke test no longer depends on pre-existing rooms or placeholder list rows
* The smoke test still verifies entry to lobby to create-match reachability

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 32-49) - Placeholder lobby row makes li-count a misleading signal
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 16-37) - Review finding and suggested direction

Dependencies:
* None

### Step 1.2: Add a 10-second abort-backed timeout to API test helpers

Update tests/e2e/helpers/api.ts to give postJson a 10-second bounded execution window. Prefer a minimal API surface change by adding optional timeout configuration or an internal default timeout, while preserving existing helper call sites and HTTP error formatting. Ensure timers are always cleared and timeout failures are legible during CI triage.

Files:
* tests/e2e/helpers/api.ts - Add AbortController timeout handling inside postJson

Success criteria:
* API helper calls fail quickly on hung requests instead of waiting for job timeout
* Existing helper exports continue to work without broad caller rewrites

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 51-71) - Current fetch wrapper behavior and lowest-risk timeout shape
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 39-73) - Review finding and suggested implementation

Dependencies:
* None

### Step 1.3: Serialize local Playwright execution to match shared-server assumptions

Update playwright.config.ts so local runs use a single worker, matching CI behavior and avoiding cross-spec interference against the shared Colyseus server started by the Playwright webServer configuration. Keep fullyParallel false and existing retry settings unless validation reveals a separate issue.

Files:
* playwright.config.ts - Set workers to 1 for local and CI runs

Success criteria:
* Spec files do not run concurrently by default on local machines
* Existing CI behavior remains unchanged in effect

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 73-95) - Current config and concurrency behavior
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 75-95) - Review finding and rationale

Dependencies:
* None

### Step 1.4: Validate reliability changes

Run the narrowest validations that exercise the touched reliability surface without widening scope.

Validation commands:
* npx playwright test tests/e2e/entry-lobby-smoke.spec.ts
* npx playwright test tests/e2e/start-gating.spec.ts
* npx playwright test --list

## Implementation Phase 2: Helper API cleanup and type tightening

<!-- parallelizable: false -->

### Step 2.1: Remove or explicitly defer the unused gotoLobby helper

Update tests/e2e/helpers/multiplayer.ts to remove the exported gotoLobby helper if it remains unused by executable tests. If implementation discovers an immediate near-term use in the skipped continuation-window spec, document that in code or planning, but default to removing the dead export to keep the helper surface accurate.

Files:
* tests/e2e/helpers/multiplayer.ts - Remove unused gotoLobby export and any now-unused related types/imports

Success criteria:
* The helper module exports only currently supported utilities
* No test imports break after removing the dead export

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 97-113) - Export usage findings
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 97-113) - Review finding and suggested direction

Dependencies:
* None

### Step 2.2: Replace unknown reservation typing with ApiSeatReservation

Tighten MatchRoomSessionSeed in tests/e2e/helpers/multiplayer.ts by importing ApiSeatReservation from tests/e2e/helpers/api.ts and using that type for the optional reservation field. Keep the rest of the session seeding behavior unchanged.

Files:
* tests/e2e/helpers/multiplayer.ts - Import ApiSeatReservation and apply it to MatchRoomSessionSeed.reservation

Success criteria:
* Reservation payloads get editor and compile-time shape checking
* Seeded sessionStorage behavior remains unchanged

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 107-113) - Current unknown typing and nearest concrete type
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 114-132) - Review finding and suggested type import

Dependencies:
* None

### Step 2.3: Validate helper cleanup changes

Use the narrowest execution-based validation available for helper consumers, then fall back to a broader e2e run only if targeted checks expose issues outside the touched helper slice.

Validation commands:
* npx playwright test tests/e2e/multiplayer-start.spec.ts
* npx playwright test tests/e2e/start-gating.spec.ts

## Implementation Phase 3: CI workflow efficiency and artifact hygiene

<!-- parallelizable: false -->

### Step 3.1: Cache Playwright browser binaries in GitHub Actions

Update .github/workflows/e2e-playwright.yml to add a dedicated cache for ~/.cache/ms-playwright keyed from package-lock.json before the browser install step. Preserve the existing npm cache from actions/setup-node and keep the current Chromium-only installation path.

Files:
* .github/workflows/e2e-playwright.yml - Add Playwright browser cache step ahead of browser installation

Success criteria:
* Workflow reuses cached Playwright browser binaries when the lockfile has not changed
* Browser install step remains compatible with ubuntu-latest runners

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 115-139) - Current workflow behavior
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 133-155) - Review finding and suggested cache step

Dependencies:
* package-lock.json remains the authoritative dependency cache key input

### Step 3.2: Reduce failure-artifact retention in the CI workflow

Update the upload-artifact step in .github/workflows/e2e-playwright.yml to set retention-days to 14 while leaving current failure-only upload behavior and artifact paths intact.

Files:
* .github/workflows/e2e-playwright.yml - Add artifact retention-days setting

Success criteria:
* Failure artifacts continue to upload on failed runs
* Artifact retention is explicitly capped for short-lived diagnostics

Context references:
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md (Lines 124-139) - Current artifact upload behavior
* .copilot-tracking/pr/review/feat-playwright/handoff.md (Lines 157-180) - Review finding and suggested retention change

Dependencies:
* None

### Step 3.3: Validate workflow changes at the narrowest available scope

Because no dedicated workflow linter is defined in package.json, use Playwright discovery plus a full e2e run as the executable validation pair for changes that should not alter runtime semantics but can still impact CI assumptions.

Validation commands:
* npx playwright test --list
* npm run test:e2e

## Implementation Phase 4: Final validation and follow-up capture

<!-- parallelizable: false -->

### Step 4.1: Run full validation for the review-fix slice

Execute all focused commands after implementation completes:
* npx playwright test tests/e2e/entry-lobby-smoke.spec.ts
* npx playwright test tests/e2e/multiplayer-start.spec.ts
* npx playwright test tests/e2e/start-gating.spec.ts
* npm run test:e2e

### Step 4.2: Fix minor regressions exposed by validation

Address only localized issues directly related to the review fixes, such as timeout cleanup mistakes, stale helper imports, or adjusted readiness assertions. Avoid widening into unrelated Playwright feature work.

### Step 4.3: Capture blocked follow-up items

If validation exposes gaps that exceed small review-fix edits, record them for follow-on work instead of broadening the implementation. The existing continuation-window TODO and any need for a dedicated CI reproduction script belong in follow-up, not this fix set.

## Dependencies

* Node.js and npm compatible with the repository toolchain
* Existing Playwright installation and Chromium browser bundle
* npm run dev and /health remaining available for Playwright webServer orchestration

## Success Criteria

* The smoke test no longer relies on room-list population as a readiness signal
* API setup helpers fail fast on hung requests
* Local and CI Playwright runs use single-worker execution by default
* Helper typing and export surface are tightened without breaking current specs
* CI workflow retains its current behavior while improving cache reuse and artifact retention hygiene
