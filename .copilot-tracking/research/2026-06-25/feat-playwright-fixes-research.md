---
title: feat-playwright Fixes Research
description: Research scope and validation guidance for PR review fixes on branch feat-playwright
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - playwright
  - e2e
  - pr review
  - research
estimated_reading_time: 6
---

## Research Scope

* Investigate PR review fix scope for branch `feat-playwright`
* Focus only on these areas:
  * `tests/e2e/entry-lobby-smoke.spec.ts`
  * `tests/e2e/helpers/api.ts`
  * `playwright.config.ts`
  * `package.json` e2e-related scripts
  * `tests/e2e/helpers/multiplayer.ts`
  * `.github/workflows/e2e-playwright.yml`
* Identify the narrowest validation commands for likely touch points

## Status

* Complete

## Findings

### Entry Lobby Smoke

* `tests/e2e/entry-lobby-smoke.spec.ts` is a single-page smoke that starts at `/`, fills `Player Name`, clicks `Enter Lobby`, waits for lobby UI, clicks `create-match-button`, then expects `/match-room.html` and `match-room-phase` to be visible.
* The current poll assertion is:

```ts
await expect
  .poll(async () => page.getByTestId("lobby-room-list").locator("li").count(), {
    message: "expected lobby room list to render at least one list row",
  })
  .toBeGreaterThan(0);
```

* This assertion is likely flaky as a signal for real room availability because `public/lobby.html` always renders at least one `li` when there are zero rooms. The empty state row text is `No open matches yet. Create one to get started.`
* `public/lobby.html` renders that placeholder row in `renderRooms()` whenever `state.rooms.length === 0`. That means the smoke test can satisfy the `li.count() > 0` poll without any real room being created or discovered.
* The test itself does not create a room before the poll. Room creation only happens after the poll when it clicks `create-match-button`.
* The smoke test therefore checks that the room list UI renders at least one list item, not that the backend room list contains a real room.
* A narrower and less misleading assertion for this test slice would target lobby readiness or button enablement, not room row count.

### API Helper Timeout Scope

* `tests/e2e/helpers/api.ts` defines `postJson<TResponse>(baseURL, path, body)` as a thin `fetch()` wrapper with JSON body serialization, status checking, and JSON response parsing.
* Current behavior:
  * Always uses `method: "POST"`
  * Always sends `Content-Type: application/json`
  * Always sends `body: JSON.stringify(body)`
  * Throws `Error` with status and response text when `response.ok` is false
  * Returns `await response.json()` cast to `TResponse`
* There is no timeout, no `AbortController`, and no support for passing a `signal`.
* Minimal behavioral-change path:
  * Add an optional final parameter for timeout options instead of changing current call signatures at existing call sites.
  * Create an `AbortController` inside `postJson` only when a timeout is supplied.
  * Pass `signal` through to `fetch()`.
  * Clear the timeout in both success and failure paths.
  * Preserve the current error contract for HTTP failures.
  * For aborts, either rethrow the native abort error or wrap it in a targeted timeout message. Wrapping is the only observable behavior change and should be kept narrow if introduced.
* Lowest-risk API shapes:
  * `postJson<TResponse>(baseURL, path, body, options?: { timeoutMs?: number })`
  * Or an exported constant-based internal timeout with no call-site changes, if the review request only needs hanging protection for tests.
* Existing callers in scope are `createMatchReservation`, `joinMatchReservation`, and `joinKaijuReservation`, all in the same file.

### Playwright Config And Commands

* `playwright.config.ts` currently sets:
  * `testDir: "./tests/e2e"`
  * `fullyParallel: false`
  * `retries: process.env.CI ? 2 : 0`
  * `workers: process.env.CI ? 1 : undefined`
  * `reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list"`
* Parallelism implications:
  * Local runs use Playwright defaults for worker count because `workers` is `undefined` outside CI.
  * CI forces a single worker.
  * Test-level full parallel mode is disabled globally.
* The relevant `webServer` behavior is also part of validation scope:
  * `command: "npm run dev"`
  * `url: "http://127.0.0.1:3000/health"`
  * `reuseExistingServer: !process.env.CI`
  * `timeout: 120000`
* `package.json` scripts relevant to e2e validation are:
  * `npm run test:e2e` -> `playwright test`
  * `npm run test:e2e:headed` -> `playwright test --headed`
  * `npm run test:e2e:ui` -> `playwright test --ui`
  * `npm run test:e2e:debug` -> `playwright test --debug`
* There is no existing narrower package script for a single spec or grep-targeted run. Narrow validation therefore needs to use direct Playwright CLI arguments.

### Multiplayer Helper Scope

* `tests/e2e/helpers/multiplayer.ts` currently exports:
  * `MultiplayerPages`
  * `MatchRoomSessionSeed`
  * `createMultiplayerPages()`
  * `gotoLobby()`
  * `cleanupMultiplayerPages()`
  * `seedMatchRoomSession()`
* `gotoLobby()` appears unused in the executable workspace code under `tests/e2e/**`. Search results only found it in `tests/e2e/helpers/multiplayer.ts` and a commented/planning mention in `.copilot-tracking/pr/review/feat-playwright/handoff.md`.
* `createMultiplayerPages()`, `cleanupMultiplayerPages()`, and `seedMatchRoomSession()` are actively used by:
  * `tests/e2e/multiplayer-start.spec.ts`
  * `tests/e2e/start-gating.spec.ts`
* `MatchRoomSessionSeed.reservation` is currently typed as `unknown`.
* The seeded reservation is serialized directly into session storage as `pendingSeatReservation`.
* Based on current test helpers, the closest concrete type for `reservation` is `ApiSeatReservation` from `tests/e2e/helpers/api.ts`.
* If review fixes tighten typing, the minimal scope is to import and use that interface rather than broadening the helper API.

### GitHub Actions Workflow

* `.github/workflows/e2e-playwright.yml` currently installs browser dependencies with:

```yaml
- name: Install Playwright Chromium
  run: npx playwright install --with-deps chromium
```

* The workflow uploads artifacts only on failure:

```yaml
- name: Upload Playwright artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-failure-artifacts
    path: |
      playwright-report/
      test-results/
    if-no-files-found: ignore
```

* There is currently no explicit `retention-days` setting. Artifact retention therefore falls back to the repository or organization default configured in GitHub Actions.
* The workflow does not upload artifacts on success.

### Recommended Validation Commands

* Narrowest spec-level validations for likely touched files:
  * `npx playwright test tests/e2e/entry-lobby-smoke.spec.ts`
  * `npx playwright test tests/e2e/start-gating.spec.ts`
  * `npx playwright test tests/e2e/multiplayer-start.spec.ts`
* Narrowest named-test variants if only one test body changes:
  * `npx playwright test tests/e2e/entry-lobby-smoke.spec.ts -g "loads entry, navigates to lobby, and reaches create match action"`
  * `npx playwright test tests/e2e/start-gating.spec.ts -g "blocks start until all players are ready, then allows start"`
  * `npx playwright test tests/e2e/multiplayer-start.spec.ts -g "commander and kaiju can start and route to role clients"`
* Narrowest non-execution validation for config or helper-only edits:
  * `npx playwright test --list`
  * `npm run test:e2e -- --list`
* Broadest relevant end-to-end validation for this scope:
  * `npm run test:e2e`
* There is no dedicated lint or typecheck script for `tests/e2e/**` in `package.json`. The closest repository-level compile check would be `npm run build`, but that is wider than necessary for review-fix iteration.

## Open Questions

* None so far

## Concrete File Paths

* `tests/e2e/entry-lobby-smoke.spec.ts`
* `tests/e2e/helpers/api.ts`
* `tests/e2e/helpers/multiplayer.ts`
* `tests/e2e/start-gating.spec.ts`
* `tests/e2e/multiplayer-start.spec.ts`
* `playwright.config.ts`
* `package.json`
* `public/lobby.html`
* `.github/workflows/e2e-playwright.yml`
