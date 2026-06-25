<!-- markdownlint-disable-file -->
# Task Research: Lint Toolchain Alignment

## Task Implementation Requests

* Plan lint toolchain alignment for the repository.
* Resolve ESLint parser failures caused by TypeScript and lib target mismatch with parser support.

## Scope and Success Criteria

* Scope: planning-only artifact set for lint toolchain alignment.
* Success criteria:
  * Identify root cause and affected files.
  * Evaluate at least two viable implementation paths.
  * Select one path with rationale and validation sequence.
  * Produce implementation-ready plan and details artifacts.

## Sources Reviewed

* .copilot-tracking/research/subagents/2026-06-24/lint-toolchain-alignment-research.md
* package.json
* tsconfig.json
* .eslintrc.json
* .copilot-tracking/plans/2026-06-24/epic-3-4-combined-implementation-plan.instructions.md
* .copilot-tracking/plans/logs/2026-06-24/epic-3-4-combined-implementation-log.md

## Current State Evidence

* package.json declares modern TypeScript and older lint parser stack:
  * `typescript`: `^5.9.3`
  * `@typescript-eslint/parser`: `^7.0.0`
  * `@typescript-eslint/eslint-plugin`: `^7.0.0`
  * `eslint`: `^8.57.0`
* tsconfig.json uses modern language target:
  * `target`: `ES2024`
  * `lib`: `["ES2024"]`
* .eslintrc.json is configured for typed linting with parser project:
  * `parser`: `@typescript-eslint/parser`
  * `parserOptions.project`: `./tsconfig.json`
* Lint failure observed in validation runs:
  * parser error `Invalid value for lib provided: es2024`
  * typescript-eslint warning indicating support window below TypeScript 5.9.x.

## Path Options

### Path A: Upgrade typescript-eslint stack forward

* Keep TypeScript at 5.9.x and keep `ES2024` target/lib.
* Upgrade `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` to compatible 8.x versions.
* Keep ESLint at 8.57.x in this phase to avoid flat-config migration scope growth.

Benefits:
* Preserves existing modern TypeScript posture.
* Addresses root compatibility issue at parser/plugin layer.
* Lower long-term maintenance debt.

Risks:
* Possible new lint findings due to rule behavior changes in v8.

### Path B: Downgrade compiler/lib to parser support window

* Pin TypeScript to v5.5.x (or other parser-supported release).
* Downgrade `target`/`lib` from ES2024 to ES2023 (or lower).

Benefits:
* Potentially fast path to parser compatibility without plugin major upgrade.

Risks:
* Regresses language level and creates technical debt.
* Increases chance of follow-up migration churn.

## Recommendation

Select Path A: forward-align `@typescript-eslint` parser/plugin to 8.x while preserving TypeScript 5.9.x and ES2024.

Rationale:
* The repository already intentionally uses modern TypeScript features and target settings.
* Compatibility issue is parser support drift, not compiler invalidity.
* Path A fixes root cause with lower long-term risk and keeps implementation scope focused.

## Constraints and Assumptions

* This plan does not include ESLint 9 + flat config migration.
* Existing lint rules are retained unless changed by upstream defaults in parser/plugin upgrade.
* Validation success is defined as lint pass plus no regressions in tests/build.

## Open Questions

* Should ESLint 9 migration be explicitly deferred as a separate work item?
* Is CI expected to hard-fail on future TypeScript/parser support-window drift?
* Should we pin exact versions (no caret) for parser/plugin after alignment?