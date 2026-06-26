---
applyTo: '.copilot-tracking/changes/2026-06-25/issue-22-playwright-test-coverage-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Issue 22 Playwright Test Coverage

## Overview

Implement deterministic Playwright end-to-end coverage for critical multiplayer browser flows by introducing a Chromium-first test harness, one merge-gating pure-UI happy-path flow, and API-assisted scenario expansion with CI diagnostics.

## Objectives

### User Requirements

* Plan the work needed to build Playwright test coverage. — Source: User request in this conversation
* Determine where Playwright fits in the existing test posture. — Source: .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md
* Include viable implementation approaches with a recommended path. — Source: .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md

### Derived Objectives

* Preserve existing Jest unit/integration tests and add Playwright as complementary browser-level validation. — Derived from: Research finding that current suite is Jest-only and misses client journey coverage.
* Implement a hybrid rollout (P0 pure UI gate + P1/P2 API-assisted scenarios) to balance confidence and reliability. — Derived from: Selected approach in research.
* Gate CI with deterministic settings (Chromium only, CI retries, trace on first retry, single worker) to reduce flake risk. — Derived from: Playwright CI best-practice findings in research.

## Context Summary

### Project Files

* package.json - Add Playwright dependency and e2e scripts
* playwright.config.ts - New Playwright test configuration with webServer and CI controls
* tests/e2e/entry-lobby-smoke.spec.ts - New P0 smoke coverage for entry and lobby routing
* tests/e2e/multiplayer-start.spec.ts - New P0 two-user multiplayer happy path
* tests/e2e/start-gating.spec.ts - New P1 API-assisted start gate behavior coverage
* public/lobby.html - Add stable data-testid hooks for lobby actions and match list assertions
* public/match-room.html - Add stable data-testid hooks for ready/start routing assertions
* public/commander/index.html - Add stable data-testid hooks for commander routing assertions
* public/kaiju/index.html - Add stable data-testid hooks for kaiju routing assertions
* .github/workflows/e2e-playwright.yml - Optional but recommended CI workflow for Playwright gate

### References

* .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md - Source analysis and selected hybrid approach
* docs/multiplayer-game-design.md - Multiplayer flow expectations to map to e2e assertions
* docs/operations/slo-policy.md - Reliability considerations for gating and diagnostics

### Standards References

* .github/copilot-instructions.md - Repository implementation conventions

## Implementation Checklist

### [x] Implementation Phase 1: Playwright Foundation Setup

<!-- parallelizable: false -->

* [x] Step 1.1: Add `@playwright/test` and e2e scripts to `package.json`
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 13-33)
* [x] Step 1.2: Create `playwright.config.ts` with deterministic local/CI settings and webServer health gating
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 37-62)
* [x] Step 1.3: Create `tests/e2e` scaffold and shared helpers for two-context multiplayer execution
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 63-82)
* [x] Step 1.4: Validate phase changes
  * Run dependency install and Playwright browser install for Chromium
  * Run config-level dry run (`npx playwright test --list`)

### [x] Implementation Phase 2: P0 Merge-Gating UI Journey Specs

<!-- parallelizable: false -->

* [x] Step 2.1: Implement `tests/e2e/entry-lobby-smoke.spec.ts` for entry to lobby path validation
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 93-114)
* [x] Step 2.2: Implement `tests/e2e/multiplayer-start.spec.ts` using isolated browser contexts for commander and kaiju
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 116-140)
* [x] Step 2.3: Harden UI selectors with `data-testid` attributes in lobby and match-room surfaces
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 142-163)
* [x] Step 2.4: Validate phase changes
  * Run `npx playwright test tests/e2e/entry-lobby-smoke.spec.ts`
  * Run `npx playwright test tests/e2e/multiplayer-start.spec.ts`

### [x] Implementation Phase 3: Optional P1 API-Assisted Coverage Expansion

<!-- parallelizable: true -->

* [x] Step 3.1: Optional - implement `tests/e2e/start-gating.spec.ts` with API-assisted room setup and ready-state assertions
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 175-195)
* [x] Step 3.2: Add optional `tests/e2e/continue-window.spec.ts` skeleton for P2 continuation and spectator transition
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 197-215)
* [x] Step 3.3: Add CI workflow `.github/workflows/e2e-playwright.yml` for deterministic execution artifacts
  * Details: .copilot-tracking/details/2026-06-25/issue-22-playwright-test-coverage-details.md (Lines 217-236)
* [x] Step 3.4: Validate phase changes
  * Run `npx playwright test tests/e2e/start-gating.spec.ts`
  * Run workflow YAML lint/validation if available

### [x] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute `npm test`
  * Execute `npm run test:e2e`
* [x] Step 4.2: Fix minor validation issues
  * Resolve straightforward selector, timeout, and assertion hardening issues
* [x] Step 4.3: Report blocking issues
  * Document unresolved flake sources or environment blockers requiring follow-on research

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/issue-22-playwright-test-coverage-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js toolchain and npm install permissions
* Playwright Chromium browser bundle (`npx playwright install --with-deps chromium`)
* Stable availability of `npm run dev` and `/health` endpoint for webServer gating

## Success Criteria

* Playwright tooling is configured and runnable locally with deterministic defaults. — Traces to: Research configuration guidance and user request
* At least one two-user pure-UI multiplayer happy-path spec runs and passes reliably. — Traces to: P0 coverage requirement
* Optional API-assisted expansion spec(s) are planned for start-gating/continuation behavior to extend coverage with lower setup fragility. — Traces to: Selected hybrid strategy
* CI can execute Playwright with retries and failure diagnostics (trace/screenshot/video) for merge safety. — Traces to: Research CI best-practice guidance
