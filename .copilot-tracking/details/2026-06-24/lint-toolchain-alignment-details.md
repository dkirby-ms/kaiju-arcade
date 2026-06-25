<!-- markdownlint-disable-file -->
# Implementation Details: Lint Toolchain Alignment

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md, .copilot-tracking/research/subagents/2026-06-24/lint-toolchain-alignment-research.md, package.json, tsconfig.json, .eslintrc.json

## Implementation Phase 1: Baseline and Dependency Audit

<!-- parallelizable: false -->

### Step 1.1: Confirm exact toolchain baseline and lockfile state

Capture current declared and resolved versions for TypeScript, ESLint, parser/plugin, and test tooling before changes.

Files:
* package.json - version declarations and scripts
* package-lock.json - resolved dependency graph

Success criteria:
* Baseline versions are documented in the changes artifact.
* Baseline lint/test/build command outcomes are captured.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 25-40) - current evidence

Dependencies:
* None

### Step 1.2: Confirm parser-project configuration dependencies

Validate that `.eslintrc.json` parser options and tsconfig references are stable and should remain unchanged for this effort.

Files:
* .eslintrc.json - parser and typed-lint settings
* tsconfig.json - target/lib inputs consumed by parser

Success criteria:
* Scope confirms whether only dependency upgrades are required.
* No unnecessary config churn is introduced.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 31-40) - parser and tsconfig constraints

Dependencies:
* Step 1.1 completion

### Step 1.3: Validate phase changes

Run baseline commands to ensure change deltas are attributable:

Validation commands:
* npm run lint - baseline lint failure reproduction
* npm test -- --silent - baseline regression check
* npm run build - baseline compile check

## Implementation Phase 2: Dependency Alignment (Selected Path A)

<!-- parallelizable: false -->

### Step 2.1: Upgrade typescript-eslint parser and plugin to compatible major

Update devDependencies for `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` to latest stable 8.x line compatible with current TypeScript runtime.

Files:
* package.json - dependency version updates
* package-lock.json - regenerated lockfile entries

Discrepancy references:
* Addresses DR-01 by aligning actual compatibility with selected approach.

Success criteria:
* Dependency graph installs cleanly.
* Parser support warning against TypeScript 5.9.x is removed from lint output.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 42-58) - selected path details

Dependencies:
* Implementation Phase 1 completion

### Step 2.2: Preserve existing lint configuration surface

Keep `.eslintrc.json` and `tsconfig.json` unchanged unless upgrade requires minimal compatibility edits.

Files:
* .eslintrc.json - maintain legacy config in this phase
* tsconfig.json - preserve ES2024 target/lib

Success criteria:
* No migration to ESLint flat config in this task.
* Target/lib remain ES2024 unless blocker evidence requires re-plan.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 60-79) - constraints and non-goals

Dependencies:
* Step 2.1 completion

### Step 2.3: Validate phase changes

Run scope-focused validation after dependency updates.

Validation commands:
* npm run lint -- --max-warnings=0 - lint parser compatibility and rule validation
* npm test -- --silent - regression safety
* npm run build - compile safety

## Implementation Phase 3: Stabilization and Policy Guardrails

<!-- parallelizable: false -->

### Step 3.1: Document resolved root cause and version alignment decisions

Record final aligned versions and rationale in tracking artifacts.

Files:
* .copilot-tracking/changes/2026-06-24/lint-toolchain-alignment-changes.md - implementation outcomes
* .copilot-tracking/plans/logs/2026-06-24/lint-toolchain-alignment-log.md - deviations and follow-on items

Discrepancy references:
* Addresses DD-01 by documenting deferred ESLint 9 migration boundary.

Success criteria:
* Changelog captures exact versions and validation evidence.
* Planning log captures deferred migration tasks.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 60-88) - recommendation and open questions

Dependencies:
* Phase 2 completion

### Step 3.2: Add drift-prevention follow-on recommendation

Define a follow-on CI or dependency policy task to prevent future parser/TypeScript support divergence.

Files:
* .copilot-tracking/plans/logs/2026-06-24/lint-toolchain-alignment-log.md - follow-on item entries

Success criteria:
* Follow-on work item specifies owner-facing outcome and dependency ordering.

Context references:
* .copilot-tracking/research/2026-06-24/lint-toolchain-alignment-research.md (Lines 84-88) - open questions

Dependencies:
* Step 3.1 completion

### Step 3.3: Validate phase changes

Validation commands:
* npm run lint -- --max-warnings=0 - confirm no regression after final metadata/log updates

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands for the project:
* npm run lint -- --max-warnings=0
* npm test -- --silent
* npm run build

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 4.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* npm and node runtime matching repository engines
* Network access for dependency install/update

## Success Criteria

* Lint completes without parser compatibility errors.
* Tests and build remain green after dependency alignment.
* Deferred ESLint 9 migration is explicitly tracked as follow-on scope.