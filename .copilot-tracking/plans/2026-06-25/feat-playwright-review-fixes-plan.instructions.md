---
applyTo: '.copilot-tracking/changes/2026-06-25/feat-playwright-review-fixes-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Feat Playwright Review Fixes

## Overview

Implement the seven accepted PR review fixes for the Playwright rollout by tightening smoke-test determinism, bounding helper request time, serializing local execution, trimming dead helper surface, and improving CI workflow efficiency without reopening the broader e2e design.

## Objectives

### User Requirements

* Plan the work to implement the submitted Playwright review fixes. — Source: User request in this conversation
* Cover the seven findings documented in the PR review handoff. — Source: .copilot-tracking/pr/review/feat-playwright/handoff.md

### Derived Objectives

* Keep the smoke test focused on lobby readiness rather than room population so it remains deterministic on empty environments. — Derived from: Research showing the lobby always renders a placeholder row when no rooms exist.
* Preserve the existing helper API shape as much as possible while adding a 10-second bounded failure path for hung setup requests. — Derived from: Research identifying a minimal-risk timeout path in tests/e2e/helpers/api.ts.
* Align local Playwright worker behavior with CI to avoid shared-server collisions across spec files. — Derived from: Research on current Playwright worker settings.
* Limit workflow improvements to cache and retention changes so the review-fix plan stays narrowly scoped. — Derived from: Review findings and planning log path selection.

## Context Summary

### Project Files

* tests/e2e/entry-lobby-smoke.spec.ts - Remove the unreliable room-list population poll from the smoke path
* tests/e2e/helpers/api.ts - Add timeout and abort handling to postJson
* playwright.config.ts - Force single-worker local execution for shared-server safety
* tests/e2e/helpers/multiplayer.ts - Remove unused gotoLobby export and tighten reservation typing
* .github/workflows/e2e-playwright.yml - Add browser cache and explicit artifact retention
* tests/e2e/multiplayer-start.spec.ts - Primary consumer validation for multiplayer helper cleanup
* tests/e2e/start-gating.spec.ts - Primary consumer validation for API helper and serialized execution
* package.json - Source of current e2e scripts and validation limits

### References

* .copilot-tracking/pr/review/feat-playwright/handoff.md - Review findings, severity, and suggested changes
* .copilot-tracking/research/2026-06-25/feat-playwright-fixes-research.md - Verified code-path findings and validation commands
* .copilot-tracking/plans/logs/2026-06-25/feat-playwright-review-fixes-log.md - Discrepancies, selected path, and follow-on work

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — Markdown rules for planning artifacts
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — Writing conventions for markdown planning artifacts

## Implementation Checklist

### [x] Implementation Phase 1: Reliability fixes for test execution

<!-- parallelizable: false -->

* [x] Step 1.1: Remove the misleading room-list poll from the smoke test
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 12-28)
* [x] Step 1.2: Add a 10-second abort-backed timeout to postJson in the API helper
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 30-46)
* [x] Step 1.3: Set Playwright workers to one for local and CI-safe execution
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 48-64)
* [x] Step 1.4: Validate reliability changes
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 66-73)

### [x] Implementation Phase 2: Helper cleanup and type tightening

<!-- parallelizable: false -->

* [x] Step 2.1: Remove the unused gotoLobby helper export unless implementation proves an immediate consumer
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 79-95)
* [x] Step 2.2: Replace reservation unknown typing with ApiSeatReservation
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 97-113)
* [x] Step 2.3: Validate helper cleanup changes
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 115-121)

### [x] Implementation Phase 3: CI workflow hygiene improvements

<!-- parallelizable: false -->

* [x] Step 3.1: Cache Playwright browser binaries in GitHub Actions
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 127-146)
* [x] Step 3.2: Add explicit failure-artifact retention days
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 148-164)
* [x] Step 3.3: Validate workflow changes with available runtime checks
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 166-172)

### [x] Implementation Phase 4: Final validation and follow-up capture

<!-- parallelizable: false -->

* [x] Step 4.1: Run focused and full e2e validation for the review-fix slice
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 178-184)
* [x] Step 4.2: Fix only localized regressions exposed by validation
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 186-188)
* [x] Step 4.3: Record blocked follow-up items instead of widening scope
  * Details: .copilot-tracking/details/2026-06-25/feat-playwright-review-fixes-details.md (Lines 190-192)

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/feat-playwright-review-fixes-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm matching the repository toolchain
* Existing Playwright Chromium installation path and npm run dev server startup
* package-lock.json present for GitHub Actions cache keying

## Success Criteria

* The smoke spec becomes independent of pre-existing lobby rooms. — Traces to: Review Comment 1 and research findings on placeholder rows
* Hung helper POST requests fail within a 10-second timeout window. — Traces to: Review Comment 2 and API helper research
* Playwright spec files run serially by default in local environments. — Traces to: Review Comment 3 and config research
* Multiplayer helper exports and typing match current usage. — Traces to: Review Comments 4 and 5 and helper usage research
* The e2e workflow reuses browser cache when possible and caps failure-artifact retention. — Traces to: Review Comments 6 and 7
