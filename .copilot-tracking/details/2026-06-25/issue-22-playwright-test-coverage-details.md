<!-- markdownlint-disable-file -->
# Implementation Details: Issue 22 Playwright Test Coverage

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md, package.json, src/index.ts, src/game/MatchRoom.ts, public/lobby.html, public/match-room.html, public/commander/index.html, public/kaiju/index.html, docs/multiplayer-game-design.md

## Implementation Phase 1: Playwright Foundation Setup

<!-- parallelizable: false -->

### Step 1.1: Add Playwright dependencies and scripts in package.json

Update `package.json` to include `@playwright/test` in `devDependencies` and add scripts:
* `test:e2e`: `playwright test`
* `test:e2e:headed`: `playwright test --headed`
* `test:e2e:ui`: `playwright test --ui`
* `test:e2e:debug`: `playwright test --debug`

Files:
* package.json - Add dependency and scripts

Discrepancy references:
* Addresses DD-01 by making CI-ready e2e execution explicit instead of optional

Success criteria:
* `npm run test:e2e -- --list` discovers Playwright specs
* Existing `npm test` scripts remain unchanged and functional

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 31-39) - Existing Jest-only posture
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 212-218) - Script guidance

Dependencies:
* npm install permissions

### Step 1.2: Create playwright.config.ts with deterministic defaults

Create `playwright.config.ts` with:
* `testDir: "./tests/e2e"`
* Chromium-only project
* `retries: 2` in CI, `0` locally
* `workers: 1` in CI
* `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"`
* `webServer` command `npm run dev`, URL `http://127.0.0.1:3000/health`, `reuseExistingServer: !process.env.CI`

Files:
* playwright.config.ts - New root config file

Success criteria:
* `npx playwright test --list` completes using configured directory
* `npx playwright test --project=chromium --list` resolves project and specs

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 53-63) - Playwright config patterns
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 144-166) - Candidate baseline config

Dependencies:
* Step 1.1 completion
* Existing `npm run dev` server startup with health endpoint

### Step 1.3: Create tests/e2e scaffolding and helpers

Create initial test directory and helper module for multi-user setup:
* `tests/e2e/helpers/multiplayer.ts` for context creation, navigation, and cleanup
* `tests/e2e/helpers/api.ts` for optional API-assisted room setup calls

Files:
* tests/e2e/helpers/multiplayer.ts - New helper utility
* tests/e2e/helpers/api.ts - New helper utility

Success criteria:
* Helper imports resolve in specs
* Shared cleanup path exists for all multiplayer tests

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 64-68) - Separate browser contexts requirement

Dependencies:
* Step 1.2 completion

### Step 1.4: Validate phase changes

Validation commands:
* npm install
* npx playwright install --with-deps chromium
* npx playwright test --list

## Implementation Phase 2: P0 Merge-Gating UI Journey Specs

<!-- parallelizable: false -->

### Step 2.1: Implement entry-lobby-smoke.spec.ts

Add a smoke spec to assert:
* `/` loads and presents entry CTA
* navigation to `/lobby` succeeds
* create-match interaction is reachable and match listing appears

Files:
* tests/e2e/entry-lobby-smoke.spec.ts - New P0 smoke spec
* public/index.html - Optional test hooks only if needed
* public/lobby.html - Stable test selectors for lobby list and CTA

Success criteria:
* Smoke spec passes headless Chromium locally
* No fixed sleeps used; assertions are web-first

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 182-185) - P0 candidate matrix
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 57-60) - Web-first assertion guidance

Dependencies:
* Phase 1 completion

### Step 2.2: Implement multiplayer-start.spec.ts with two isolated users

Build pure-UI happy path for commander + kaiju:
* Commander creates match
* Kaiju discovers and joins same match
* Both enter match-room
* Ready/start preconditions are met
* Role routing asserts to commander and kaiju UIs

Files:
* tests/e2e/multiplayer-start.spec.ts - New two-user happy path spec
* public/match-room.html - Test selectors for ready/start controls and room status
* public/commander/index.html - Selector hooks for commander route assertions
* public/kaiju/index.html - Selector hooks for kaiju route assertions

Success criteria:
* Spec passes with one worker and without fixed sleeps
* Failure artifacts include trace/screenshot/video on retry/failure

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 95-121) - Two-context example
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 130-141) - Start-gating preconditions

Dependencies:
* Step 2.1 completion

### Step 2.3: Harden UI selectors across lobby/match/role pages

Add deterministic `data-testid` values where role/text selectors are fragile due to copy or layout changes.
Use semantic roles first; add `data-testid` only where needed for stability.

Files:
* public/lobby.html - Add IDs for match list, create button, and enter-match action
* public/match-room.html - Add IDs for ready/start controls and room phase status
* public/commander/index.html - Add route-loaded marker element
* public/kaiju/index.html - Add route-loaded marker element

Discrepancy references:
* Addresses DR-02 by reducing flake susceptibility prior to CI gating

Success criteria:
* P0 specs pass with stable selectors across multiple runs

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 205-210) - Determinism guardrails

Dependencies:
* Steps 2.1 and 2.2 completion

### Step 2.4: Validate phase changes

Validation commands:
* npx playwright test tests/e2e/entry-lobby-smoke.spec.ts
* npx playwright test tests/e2e/multiplayer-start.spec.ts

## Implementation Phase 3: P1 API-Assisted Coverage Expansion

<!-- parallelizable: true -->

### Step 3.1: Implement start-gating.spec.ts using API-assisted setup

Use existing APIs to set up room state and focus assertions on behavior under test:
* start blocked until all required players are ready
* start succeeds when readiness criteria are met
* user-visible gating feedback appears in match-room

Files:
* tests/e2e/start-gating.spec.ts - New P1 behavioral spec
* tests/e2e/helpers/api.ts - Extend setup primitives as needed

Success criteria:
* Spec validates start rejection/acceptance transitions deterministically
* Setup time lower than full UI build-up path

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 174-180) - Hybrid approach rationale
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 186-188) - P1 candidate matrix

Dependencies:
* Phase 2 completion

### Step 3.2: Add continue-window.spec.ts skeleton for P2

Create a deferred scenario skeleton for continuation and spectator transition to capture scope for follow-on execution.
Keep this initially marked non-blocking in CI until flake baseline is measured.

Files:
* tests/e2e/continue-window.spec.ts - New P2 skeleton

Discrepancy references:
* Captures DR-01 for future issue alignment and continuation-window hardening

Success criteria:
* Skeleton compiles and is tagged/skipped according to policy

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 189-191) - P2 candidate matrix

Dependencies:
* Step 3.1 completion

### Step 3.3: Add CI workflow for e2e gate and artifacts

Create `.github/workflows/e2e-playwright.yml` with:
* Node setup and dependency cache
* Playwright browser install (Chromium)
* `npm run test:e2e` execution
* Trace/video/screenshot artifact upload on failure

Files:
* .github/workflows/e2e-playwright.yml - New CI workflow

Success criteria:
* Workflow validates in PR checks
* Failed runs produce downloadable diagnostics

Context references:
* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md (Lines 53-60) - CI retries and diagnostics

Dependencies:
* Step 1.2 completion

### Step 3.4: Validate phase changes

Validation commands:
* npx playwright test tests/e2e/start-gating.spec.ts
* npm run test:e2e

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands:
* npm test
* npm run test:e2e

### Step 4.2: Fix minor validation issues

Apply minor assertion and selector fixes only (timeout tuning, route wait hardening, flaky locator replacement).
Avoid large structural rewrites in this phase.

### Step 4.3: Report blocking issues

Document blocking failures that need additional research:
* unresolved CI environment instability
* unanticipated server timing dependencies
* acceptance criteria mismatch with Issue 22 ticket metadata

## Dependencies

* Node.js/npm toolchain
* Chromium browser package for Playwright
* Existing server startup and health endpoint behavior

## Success Criteria

* P0 pure-UI journey coverage is merge-gating and stable
* P1 API-assisted coverage exists for start-gating behavior
* CI can execute e2e suite with diagnostics and deterministic settings
