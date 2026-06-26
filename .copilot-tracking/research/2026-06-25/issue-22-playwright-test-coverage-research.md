<!-- markdownlint-disable-file -->
# Task Research: Issue 22 Playwright Test Coverage

Research what is needed to build issue 22, focused on Playwright test coverage for the kaiju-arcade repository.

## Task Implementation Requests

* Determine current automated testing posture and where Playwright should fit.
* Identify the exact implementation work required to deliver issue 22.
* Evaluate viable approaches for Playwright coverage and recommend one.
* Provide concrete examples, file targets, and execution guidance.

## Scope and Success Criteria

* Scope: Repository-local analysis for current server/client architecture, existing test infrastructure, and operational requirements relevant to end-to-end Playwright coverage. Includes external Playwright documentation validation as needed.
* Assumptions:
  * Issue 22 refers to adding Playwright-based test coverage for critical multiplayer user flows.
  * Existing Jest tests remain and Playwright complements rather than replaces them.
  * CI and local developer workflows should support deterministic Playwright execution.
* Success Criteria:
  * Identify current gaps between existing tests and required browser-level validation.
  * Provide at least two implementation alternatives with trade-offs.
  * Select one recommended approach with evidence and rationale.
  * Include actionable file-level plan and runnable command examples.

## Outline

1. Current state and gap analysis.
2. Playwright architecture options.
3. Selected approach and implementation plan.
4. CI strategy and acceptance matrix.

## Potential Next Research

* Validate final issue acceptance criteria against Issue 22 ticket metadata.
  * Reasoning: Current repository references are in tracking/research artifacts, not primary root docs.
  * Reference: .copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md:2, ISSUE-PREVIEW.md
* Run a prototype spec to baseline flake rate and runtime.
  * Reasoning: CI retries should be tuned from observed behavior, not assumptions.
  * Reference: proposed tests/e2e/multiplayer-start.spec.ts

## Research Executed

### File Analysis

* package.json
  * Contains Jest-only scripts and no Playwright dependency or scripts.
* jest.config.js
  * Node environment, src-rooted test scope, unit/integration oriented.
* src/index.ts
  * Server health endpoints and startup behavior suitable for Playwright webServer.
* src/game/MatchRoom.ts
  * Start-gating rules, broadcasts, reconnect grace, and continuation/spectator transitions.
* public/index.html, public/lobby.html, public/match-room.html
  * Core browser journey and user interactions for lobby, room entry, and match start.
* public/commander/app.js, public/kaiju/app.js
  * Role-specific gameplay actions and UI updates tied to multiplayer flow assertions.
* docs/multiplayer-game-design.md, docs/operations/slo-policy.md
  * Vertical-slice expectations and existing observability gaps that affect assertion strategy.

### Code Search Results

* Playwright executable setup search
  * No active Playwright config/dependencies/specs in app execution path.
* Multiplayer flow touchpoints search
  * Create/join/start flow is split across lobby and match-room clients with server gating in MatchRoom.
* Reliability-sensitive paths search
  * Timeout, reconnect grace, and tick-driven progression identify major flake risks.

### External Research

* Playwright configuration and CI patterns
  * Findings: Use testDir, webServer, retries in CI, trace on first retry, CI-only worker reduction.
    * Source: https://github.com/microsoft/playwright/blob/main/docs/src/test-configuration-js.md
* Playwright best practices for wait/assertions
  * Findings: Prefer web-first assertions and auto-waiting; avoid fixed sleeps.
    * Source: https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md
* Browser context isolation
  * Findings: Multi-user scenarios should use separate browser contexts in one test.
    * Source: https://github.com/microsoft/playwright/blob/main/docs/src/browser-contexts.md

### Project Conventions

* Standards referenced: Existing Node/TypeScript/Jest workflow and operations docs in repository.
* Instructions followed: Task Researcher mode constraints; edits restricted to .copilot-tracking/research/.

## Key Discoveries

### Project Structure

* Current tests are Jest-only and server-side focused.
* Client-critical behavior (lobby, role claim, ready/start, routing) is not covered by browser automation.
* Match lifecycle complexity exists in both client and server; unit tests alone do not validate full-browser orchestration.

### Implementation Patterns

* Server preconditions for match start are explicit and deterministic in MatchRoom, making them suitable Playwright assertions.
* Client flow crosses multiple pages and sessions, requiring multi-context orchestration for realistic commander+kaiju interaction.
* Existing health endpoint enables reliable Playwright webServer readiness checks.

### Complete Examples

```ts
import { test, expect } from "@playwright/test";

test("commander + kaiju can start a match", async ({ browser }) => {
  const commanderContext = await browser.newContext();
  const kaijuContext = await browser.newContext();

  const commander = await commanderContext.newPage();
  const kaiju = await kaijuContext.newPage();

  await commander.goto("/lobby");
  await commander.getByRole("button", { name: "Create Match" }).click();
  await expect(commander.getByText(/Match\s+/)).toBeVisible();

  await kaiju.goto("/lobby");
  await expect(kaiju.getByText(/Match\s+/)).toBeVisible();

  await Promise.all([
    commander.getByRole("button", { name: "Enter Match Room" }).first().click(),
    kaiju.getByRole("button", { name: "Enter Match Room" }).first().click(),
  ]);

  await expect(commander).toHaveURL(/match-room\.html/);
  await expect(kaiju).toHaveURL(/match-room\.html/);
});
```

### API and Schema Documentation

* Server readiness endpoint for webServer gating: src/index.ts:62
* Match creation/join REST APIs for potential API-assisted setup: src/index.ts:172, src/index.ts:228
* Match start preconditions and broadcast: src/game/MatchRoom.ts:570, src/game/MatchRoom.ts:932, src/game/MatchRoom.ts:983

### Configuration Examples

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/health",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Technical Scenarios

### Baseline Playwright Coverage for Issue 22

Issue 22 can be delivered in two credible ways. Both are viable; one is recommended for initial merge reliability.

**Requirements:**

* Validate browser journey: entry -> lobby -> create/join -> role claim -> ready/start -> role routing.
* Cover at least one multiplayer flow with two isolated users.
* Integrate into CI with diagnostics on failure.
* Keep execution deterministic and low-flake for merge gating.

**Preferred Approach:**

* Hybrid rollout:
  * Use one pure-UI happy-path end-to-end spec as merge gate (P0).
  * Use API-assisted setup for follow-up scenarios (P1/P2) to improve speed/stability while preserving one full-journey guardrail.

Rationale:
* Pure UI gate ensures true user-path coverage.
* API-assisted setup reduces repetitive setup fragility and runtime for additional scenario coverage.
* This aligns with current repo architecture that already exposes match create/join APIs.

```text
Add:
- playwright.config.ts
- tests/e2e/multiplayer-start.spec.ts
- tests/e2e/start-gating.spec.ts (optional P1)
- tests/e2e/continue-window.spec.ts (optional P2)

Update:
- package.json (Playwright dependency + scripts)
- public/lobby.html (data-testid hardening)
- public/match-room.html (data-testid hardening)
- public/commander/index.html (data-testid hardening)
- public/kaiju/index.html (data-testid hardening)

Optional CI:
- .github/workflows/e2e-playwright.yml
```

**Implementation Details:**

* P0 candidate matrix (merge-blocking)
  * entry-to-lobby-smoke
  * commander-creates-match-and-listing-visible
  * commander-plus-kaiju-start-happy-path
* P1 candidates
  * start-rejected-until-all-ready
  * commander-dispatch-feedback-loop
  * kaiju-contained-to-continue-overlay
* P2 candidates
  * continue-window-expiry-to-spectator
  * reconnect-grace-rejoin-flow

Execution commands:
* npm run dev
* npm test
* npx playwright install --with-deps chromium
* npx playwright test
* npx playwright test tests/e2e/multiplayer-start.spec.ts --headed

Determinism guardrails:
* Chromium-only initially.
* workers=1 in CI.
* retries in CI with trace on first retry.
* Prefer state/assertion waits; avoid fixed timeout sleeps.

```ts
// package.json script additions (example)
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

#### Considered Alternatives

Alternative A: Pure UI for all Playwright specs from day one
* Benefits: Maximum user-path fidelity.
* Rejected for initial scope because setup repetition increases flake risk and runtime before selectors/harness mature.

Alternative B: API-assisted setup only, no pure UI journey
* Benefits: Faster and often more deterministic test setup.
* Rejected as sole strategy because it can miss regressions in lobby/room navigation and user-visible interactions.

Selected: Hybrid (one pure UI P0 gate + API-assisted expansion)
* Best balance of confidence, speed, and maintainability for issue 22.
