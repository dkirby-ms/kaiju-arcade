---
title: Issue 22 Playwright Practices Research
description: Playwright test coverage implementation approach and CI/local setup best practices for kaiju-arcade websocket multiplayer flows
author: Researcher Subagent
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - playwright
  - websocket
  - e2e
  - ci
  - colyseus
estimated_reading_time: 12
---

## Research Scope

* Validate current Playwright docs and recommended config patterns relevant to this repository.
* Identify deterministic strategies for websocket and realtime game flow tests.
* Propose a minimal but production-credible CI strategy for Playwright in this repository.
* Provide concrete config and spec examples adapted to this repository.

## Repository Context Used

* Runtime is a Node + TypeScript Colyseus server with static client pages served from the same app.
* Development command is `npm run dev` (`tsx watch src/index.ts`).
* Health endpoints exist, including `/health` and `/health/ready`.
* Existing tests are Jest-based unit/integration tests, no current Playwright setup.
* Realtime multiplayer UI surfaces are in `public/lobby.html`, `public/match-room.html`, `public/commander/index.html`, and `public/kaiju/index.html` with client logic in `public/common/*.js`.

Evidence in workspace:

* `package.json`
* `src/index.ts`
* `public/lobby.html`
* `public/common/colyseus-client.js`
* `public/common/match-room-app.js`

## Current Playwright Documentation Findings

### Recommended Config Pattern (Directly applicable)

From Playwright docs, baseline recommended pattern for config includes:

* `testDir`
* `forbidOnly: !!process.env.CI`
* `retries: process.env.CI ? 2 : 0`
* `workers: process.env.CI ? 1 : undefined` (or reduced workers in CI)
* `use.baseURL`
* `use.trace: "on-first-retry"`
* `projects` for browser matrix
* `webServer` with `reuseExistingServer: !process.env.CI`

Trade-off for this repo:

* Chromium-only project is enough for first delivery because multiplayer websocket orchestration complexity is the risk center.
* Add Firefox/WebKit after stabilizing deterministic flow tests.

### Best Practice for Waiting and Flake Control

Playwright explicitly recommends web-first assertions and auto-waiting:

* Prefer `await expect(locator).toBeVisible()` over manual polling and immediate checks.
* Avoid fixed sleeps and rely on assertions and explicit event predicates.

For websocket game flows, this is critical because UI transitions depend on async room state and server events.

### Multi-user Pattern

Playwright docs recommend multi-context orchestration via `browser.newContext()` for independent users in one test.

This maps well to commander/kaiju dual-user flows:

* Context A = commander identity
* Context B = kaiju identity
* Independent storage/cookies/session and deterministic cross-observation of room state

### Storage State

Storage state is useful when authentication/login is expensive and repeated.

For this repo today:

* There is no heavyweight login flow.
* Session identity is app-managed (`window.KaijuSession`) rather than external auth.

Recommendation:

* Do not use storageState in initial implementation.
* Revisit only if identity bootstrap becomes expensive or external auth is introduced.

## Deterministic Websocket/Realtime Testing Strategies

### Strategy 1: Dual-context single-spec orchestration (recommended baseline)

Use one test to drive two players with separate contexts/pages:

1. Commander creates match from lobby.
2. Kaiju joins same match.
3. Both claim roles.
4. Commander starts match.
5. Both clients route to role-specific pages.

Determinism techniques:

* Wait on observable UI state transitions (`toContainText`, `toBeEnabled`, URL expectations).
* Use `Promise.all` around action + awaited state update when timing-sensitive.
* Prefer unique, stable selectors (`data-testid`) to avoid text/style fragility.
* Avoid `waitForTimeout` except temporary diagnostics.

### Strategy 2: API-assisted setup for speed and determinism (recommended for scale)

Because this app already has REST endpoints in `src/index.ts`:

* `POST /api/matches`
* `POST /api/matches/:roomId/join`

Use `request` fixture or `fetch` in test setup to create/join seats, then open pages already pointed at target room context.

Benefits:

* Reduces UI setup drift and test runtime.
* Keeps UI assertions focused on the behavior under test.

Trade-off:

* Slightly less full-stack UI fidelity for setup phase.

Recommended use:

* Keep at least one pure UI happy-path test.
* Use API-assisted setup for additional scenario coverage.

### Strategy 3: Instrumentation hooks for realtime checkpoints (optional hardening)

If flake appears in phase/role transitions, add non-production-impact test hooks behind env flags:

* Emit deterministic debug events on key transitions.
* Add lightweight `data-testid` attributes on critical controls and status nodes.

Benefits:

* Faster root-cause isolation when CI-only race issues occur.

Trade-off:

* Small code changes in client templates.

## Concrete Config Example Adapted to This Repo

Proposed `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/health",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  outputDir: "test-results/playwright",
});
```

Rationale for key choices:

* `fullyParallel: false` to avoid unintentional cross-test room interference early on.
* CI retries enabled with trace on first retry to make websocket flakes diagnosable.
* `webServer.url` points to health endpoint already present in server.
* Chromium-only first step lowers matrix noise while hardening flow correctness.

## Concrete Spec Pattern for Multiplayer Flow

Example `tests/e2e/multiplayer-start.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("commander + kaiju can start a match and route to role clients", async ({ browser }) => {
  const commanderContext = await browser.newContext();
  const kaijuContext = await browser.newContext();

  const commander = await commanderContext.newPage();
  const kaiju = await kaijuContext.newPage();

  await commander.goto("/lobby");
  await expect(commander.getByText("Matchmaking Lobby")).toBeVisible();

  await commander.getByRole("button", { name: "Create Match" }).click();
  await expect(commander.getByText(/Match\s+/)).toBeVisible();

  const roomLabel = commander.locator("li strong").first();
  const roomText = (await roomLabel.textContent()) || "";
  const roomId = roomText.replace("Match", "").trim();
  expect(roomId).not.toBe("");

  await kaiju.goto("/lobby");
  await expect(kaiju.getByText(new RegExp(`Match\\s+${roomId}`))).toBeVisible();

  await Promise.all([
    commander.getByRole("button", { name: "Enter Match Room" }).first().click(),
    kaiju.getByRole("button", { name: "Enter Match Room" }).first().click(),
  ]);

  await expect(commander).toHaveURL(/match-room\.html/);
  await expect(kaiju).toHaveURL(/match-room\.html/);

  await commander.getByRole("button", { name: "Claim Commander" }).click();
  await kaiju.getByRole("button", { name: "Claim Kaiju" }).click();

  await commander.getByRole("button", { name: "Mark Ready" }).click();
  await kaiju.getByRole("button", { name: "Mark Ready" }).click();

  await commander.getByRole("button", { name: "Start Match" }).click();

  await Promise.race([
    expect(commander).toHaveURL(/commander\/index\.html/),
    expect(commander).toHaveURL(/kaiju\/index\.html/),
  ]);
  await Promise.race([
    expect(kaiju).toHaveURL(/commander\/index\.html/),
    expect(kaiju).toHaveURL(/kaiju\/index\.html/),
  ]);

  await commanderContext.close();
  await kaijuContext.close();
});
```

Notes:

* This should be improved with explicit `data-testid` selectors in UI markup for long-term stability.
* Role routing assertions can be tightened as role binding invariants are fully deterministic in UI.

## Minimal Production-Credible CI Strategy

### Target outcome

* Keep CI cost low.
* Make failures diagnosable.
* Gate merges on at least one deterministic multiplayer flow.

### Recommended phased CI plan

Phase 1 (immediate):

* Run Playwright on Ubuntu with Chromium only.
* Trigger on PR and main branch pushes.
* Upload HTML report + traces/videos on failure.
* Use retries in CI and single worker.

Phase 2 (after stability):

* Add second browser project (Firefox).
* Split smoke vs full e2e jobs if runtime increases.

### Example GitHub Actions workflow

```yaml
name: e2e-playwright

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        env:
          CI: true
        run: npx playwright test

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report
            test-results/playwright
```

Trade-offs:

* Chromium-only first reduces variability and speeds feedback.
* Retries can mask flaky tests if overused; keep retries low and enforce flake triage.

## Proposed Local Developer Workflow

1. Add scripts:
   * `test:e2e`: `playwright test`
   * `test:e2e:ui`: `playwright test --ui`
   * `test:e2e:headed`: `playwright test --headed`
   * `test:e2e:debug`: `playwright test --debug`
2. Ensure `playwright.config.ts` uses `reuseExistingServer: !process.env.CI`.
3. Encourage running one spec while developing:
   * `npx playwright test tests/e2e/multiplayer-start.spec.ts --headed`

## Implementation Decisions and Trade-offs Summary

* Browser matrix now: Chromium only.
  * Why: fastest path to stable websocket flow coverage.
* Realtime user simulation: dual browser contexts in single test.
  * Why: proper session isolation for commander/kaiju interactions.
* Waiting strategy: web-first assertions only, no fixed sleeps.
  * Why: deterministic behavior and lower flake.
* Storage state: defer for now.
  * Why: no heavyweight auth flow in current app.
* CI workers: 1 in CI initially.
  * Why: avoid cross-test interference in realtime room scenarios.

## Sources

* Playwright test configuration examples and CI-oriented options: <https://github.com/microsoft/playwright/blob/main/docs/src/test-configuration-js.md>
* Playwright Test config API (`timeout`, `testDir`, `reporter`, `expect`): <https://github.com/microsoft/playwright/blob/main/docs/src/test-api/class-testconfig.md>
* Playwright projects guidance: <https://github.com/microsoft/playwright/blob/main/docs/src/test-projects-js.md>
* Playwright best practices and web-first assertions: <https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md>
* Auto-waiting and web-first assertions (README): <https://github.com/microsoft/playwright/blob/main/README.md>
* Browser contexts and multi-user testing: <https://github.com/microsoft/playwright/blob/main/docs/src/browser-contexts.md>
* Authentication and storageState patterns: <https://github.com/microsoft/playwright/blob/main/docs/src/auth.md>

## Key Recommendations

* Start with one high-value deterministic multiplayer e2e test in Chromium.
* Add `data-testid` attributes to critical controls/status fields before expanding test volume.
* Use CI retries + trace on first retry, but treat any retry pass as flake debt to fix.
* Add API-assisted setup tests after the first pure UI happy-path is stable.

## Unresolved Questions

* Which exact flow(s) should be merge-blocking for Issue 22 besides start-match happy path?
* Should reconnect behavior be part of initial Playwright scope or a follow-up issue?
* Is GitHub Actions the definitive CI target for this repository, or is another pipeline system required?
