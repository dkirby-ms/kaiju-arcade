---
title: Lint Toolchain Alignment Research
description: Research findings on TypeScript/ESLint/@typescript-eslint version mismatch and remediation paths
ms.date: 2026-06-24
ms.topic: troubleshooting
---

## Summary

The current lint toolchain is mismatched:

* TypeScript is at 5.9.3 (package.json:52), while installed @typescript-eslint 7.18.0 reports support only for TypeScript >=4.7.4 <5.6.0 (captured from `npm run lint` output).
* tsconfig uses target/lib ES2024 (tsconfig.json:3-5).
* ESLint parsing fails with `Parsing error: Invalid value for lib provided: es2024` across all TypeScript files (captured from `npm run lint` output).

This is primarily an ESLint parser compatibility issue, not a TypeScript compiler issue. `npx tsc --noEmit` succeeds with current settings.

## Current State Evidence (with file paths and line references)

1. Dependency versions and scripts
* package.json:18 shows lint command: `eslint src --ext .ts`
* package.json:45 shows `@typescript-eslint/eslint-plugin`: `^7.0.0`
* package.json:46 shows `@typescript-eslint/parser`: `^7.0.0`
* package.json:47 shows `eslint`: `^8.57.0`
* package.json:48 shows `jest`: `^29.7.0`
* package.json:50 shows `ts-jest`: `^29.1.1`
* package.json:52 shows `typescript`: `^5.9.3`

2. Installed (resolved) versions from npm
* `npm ls @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint typescript ts-jest jest --depth=0`:
  * @typescript-eslint/eslint-plugin@7.18.0
  * @typescript-eslint/parser@7.18.0
  * eslint@8.57.1
  * jest@29.7.0
  * ts-jest@29.4.11
  * typescript@5.9.3

3. TypeScript compiler configuration
* tsconfig.json:3 sets `target` to `ES2024`
* tsconfig.json:5 sets `lib` to `["ES2024"]`

4. ESLint parser configuration
* .eslintrc.json:2 sets parser to `@typescript-eslint/parser`
* .eslintrc.json:6 sets parserOptions.project to `./tsconfig.json` (typed linting reads tsconfig)

5. Failure details from lint execution
* `npm run lint -- --max-warnings=0` reports:
  * Warning: supported TypeScript versions are `>=4.7.4 <5.6.0`
  * Current TypeScript version is `5.9.3`
  * Errors on all TS files: `Parsing error: Invalid value for lib provided: es2024`

6. Control check (compiler behavior)
* `npx tsc --noEmit` completes with no output, indicating TS compiler accepts current target/lib; failure is in lint parser/tooling path.

7. Prettier config signal
* No `eslint-config-prettier` entry in package.json devDependencies (package.json:38-53).
* No Prettier-related config references found by workspace search (`prettier|eslint-config-prettier`).

8. Jest/ts-jest relevance
* jest.config.js:2 uses `preset: "ts-jest"`
* jest.config.js:22-30 uses ts-jest transform for `.ts/.tsx`
* Current tests pass (`npm test -- --silent` exited 0 in session context), so the active breakage is isolated to linting.

## Path A / Path B comparison

### Path A: Upgrade @typescript-eslint stack forward to match current TypeScript and ES2024

Required file changes:

* package.json
  * Bump `@typescript-eslint/parser` to latest 8.x
  * Bump `@typescript-eslint/eslint-plugin` to latest 8.x
  * Keep `eslint` at >=8.57.x (or optionally move to 9.x in a separate step)
  * Keep `typescript` at 5.9.x
* package-lock.json
  * Regenerate via install
* .eslintrc.json
  * Likely no immediate changes required if staying on ESLint 8 + legacy config
  * Optional future migration to flat config if moving to ESLint 9

Expected risks:

* Medium
* Rule behavior changes in typescript-eslint 8 may introduce new lint findings.
* If ESLint is also bumped to 9 in same change, config migration risk increases. Keep ESLint 8 first to reduce risk.

Likely validation commands:

* `npm install`
* `npm run lint -- --max-warnings=0`
* `npm test -- --silent`
* `npm run build`

Pros:

* Aligns with modern TypeScript usage already present in repo.
* Preserves ES2024 target/lib intent.
* Better long-term maintainability with fewer forced downgrades later.

Cons:

* Potential lint churn due to changed rule implementations.

### Path B: Pin TypeScript/lib backward to fit current @typescript-eslint v7 support window

Required file changes:

* package.json
  * Pin `typescript` to a supported v7-compatible release (for example 5.5.x)
* tsconfig.json
  * Change `target` from `ES2024` to `ES2023` (or lower)
  * Change `lib` from `["ES2024"]` to `["ES2023"]` (or lower)
* package-lock.json
  * Regenerate via install

Expected risks:

* Low to Medium immediate change risk, higher medium-term maintenance risk.
* Immediate lint parser failure should clear.
* Build/runtime semantics may shift due to lowered target/lib, with subtle behavior or type lib differences.
* Creates technical debt by freezing compiler capability behind current ecosystem.

Likely validation commands:

* `npm install`
* `npm run lint -- --max-warnings=0`
* `npm test -- --silent`
* `npm run build`
* Optional behavior sanity check: `npm run dev` and smoke test commander/kaiju client flows

Pros:

* Fastest way to make current @typescript-eslint v7 parse tsconfig consistently.

Cons:

* Moves repo backward from its declared ES2024 + TS5.9 posture.
* Increases probability of another future toolchain realignment cycle.

## Recommendation

Select Path A (upgrade @typescript-eslint stack forward), with staged execution:

1. Upgrade only `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` to latest 8.x while keeping ESLint on 8.57.x.
2. Re-run lint/test/build.
3. Address any new lint findings.
4. Consider ESLint 9 + flat config migration later as a separate, scoped change.

Rationale (least-risk + maintainability):

* The repository already standardized on modern TypeScript/ES target (`typescript` 5.9.3 and `ES2024`).
* Downgrading TypeScript/lib solves the symptom but introduces backward drift.
* A parser/plugin upgrade addresses the root mismatch where lint parser support lags compiler settings.

## Open questions

* Do we want to keep legacy `.eslintrc.json` for now, or schedule a separate ESLint 9/flat-config migration milestone?
* Is there any runtime/platform reason to avoid ES2024 output target for deployment environments?
* Should CI add an explicit toolchain guard step (for example, fail when TypeScript is outside supported parser window) to prevent future drift?
* Are there team-preferred lint rule baselines to lock before/after typescript-eslint 8 rule behavior differences?
