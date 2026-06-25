---
applyTo: '.copilot-tracking/changes/2026-06-24/lint-toolchain-alignment-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Lint Toolchain Alignment

## Overview

Align the lint toolchain with the repository's modern TypeScript configuration by upgrading parser compatibility and validating lint/test/build end-to-end.

## Objectives

### User Requirements

* Plan the lint toolchain alignment work - Source: user request in current conversation.

### Derived Objectives

* Eliminate parser compatibility failures caused by TypeScript 5.9.x and ES2024 with the current typescript-eslint major - Derived from: research evidence and lint output.
* Keep scope focused on blocker removal while avoiding ESLint 9 migration scope expansion - Derived from: risk-managed implementation strategy.
* Preserve TypeScript target/lib posture and avoid backward compiler drift - Derived from: current repository configuration and maintainability goals.

## Context Summary

### Project Files

* package.json - dependency versions and lint scripts.
* package-lock.json - resolved dependency graph used in actual tooling behavior.
* tsconfig.json - TypeScript target and lib consumed by parser project mode.
* .eslintrc.json - parser configuration and lint rule baseline.

### References

* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md - primary task research and recommended path.
* .copilot-tracking/research/subagents/2026-06-24/lint-toolchain-alignment-research.md - deep version and path comparison evidence.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md - markdown authoring requirements for tracking artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md - writing style requirements for markdown artifacts.

## Implementation Checklist

### [x] Implementation Phase 1: Baseline and Dependency Audit

<!-- parallelizable: false -->

* [x] Step 1.1: Confirm exact toolchain baseline and lockfile state
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 11-26)
* [x] Step 1.2: Confirm parser-project configuration dependencies
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 28-43)
* [x] Step 1.3: Validate phase changes
  * Run lint/test/build baseline commands.

### [x] Implementation Phase 2: Dependency Alignment (Selected Path A)

<!-- parallelizable: false -->

* [x] Step 2.1: Upgrade typescript-eslint parser and plugin to compatible major
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 61-80)
* [x] Step 2.2: Preserve existing lint configuration surface
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 82-99)
* [x] Step 2.3: Validate phase changes
  * Run lint/test/build validation after dependency alignment.

### [x] Implementation Phase 3: Stabilization and Policy Guardrails

<!-- parallelizable: false -->

* [x] Step 3.1: Document resolved root cause and version alignment decisions
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 113-133)
* [x] Step 3.2: Add drift-prevention follow-on recommendation
  * Details: .copilot-tracking/details/2026-06-24/lint-toolchain-alignment-details.md (Lines 134-149)
* [x] Step 3.3: Validate phase changes
  * Run lint command to confirm no regressions from final updates.

### [x] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute all lint commands (`npm run lint -- --max-warnings=0`)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [x] Step 4.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [x] Step 4.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See `.copilot-tracking/plans/logs/2026-06-24/lint-toolchain-alignment-log.md` for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm versions compatible with repository engines.
* Network access for dependency updates.
* Existing lint/test/build scripts in package.json.

## Success Criteria

* Lint no longer fails with parser compatibility errors related to ES2024 and TypeScript version support window - Traces to: lint-toolchain-alignment-research.md current-state evidence.
* TypeScript target/lib remain at ES2024 after alignment - Traces to: selected Path A recommendation.
* Test and build commands remain green after dependency alignment - Traces to: implementation phase validation steps.