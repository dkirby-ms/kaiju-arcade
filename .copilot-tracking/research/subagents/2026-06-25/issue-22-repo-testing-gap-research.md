---
title: Issue 22 Repository Testing Gap Research
description: Repository investigation for implementing Issue 22 Playwright test coverage in kaiju-arcade
author: Researcher Subagent
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - issue-22
  - playwright
  - e2e
  - testing
  - colyseus
estimated_reading_time: 10
---

## Research Scope

Determine what is needed in this repository to implement Issue 22 Playwright test coverage, with evidence for:

* Issue 22 references in repository artifacts.
* Current test setup and tooling gaps.
* Critical multiplayer user flows to cover in browser e2e.
* Deterministic execution constraints and flaky-risk areas.
* A prioritized candidate Playwright matrix.

## Investigation Tasks and Findings

### 1) Issue 22 references in repository docs and tracking files

Issue 22 is explicitly documented in existing research artifacts, primarily under `.copilot-tracking`:

* `.copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md:2` contains heading `Task Research: Issue 22 Playwright Test Coverage`.
* `.copilot-tracking/research/2026-06-25/issue-22-playwright-test-coverage-research.md:4` states the objective: build issue 22 focused on Playwright coverage.
* `.copilot-tracking/research/subagents/2026-06-25/issue-22-playwright-practices-research.md:2` and `:3` contain a dedicated Playwright practices research artifact for issue 22.

No direct Issue 22 references were found in root delivery docs (`START-HERE.md`, `ISSUE-PREVIEW.md`), which indicates Issue 22 requirements are currently tracked in research artifacts rather than production-facing docs.

### 2) Current testing setup (scripts, Jest config, existing tests, e2e/browser automation)

#### Package scripts and runtime

Current executable scripts (from `package.json`):

* `package.json:12` `build: tsc`
* `package.json:13` `start: node dist/index.js`
* `package.json:14` `dev: tsx watch src/index.ts`
* `package.json:16` `test: jest`
* `package.json:17` `test:watch: jest --watch`
* `package.json:18` `lint: eslint src --ext .ts`

#### Jest posture

Jest is Node-centric and scoped to `src` TypeScript tests:

* `jest.config.js:2` preset `ts-jest`
* `jest.config.js:3` `testEnvironment: node`
* `jest.config.js:4` roots only `<rootDir>/src`
* `jest.config.js:5` test patterns `*.spec.ts` / `*.test.ts`
* `jest.config.js:12` coverage thresholds are global and currently low baseline (50)

#### Existing tests

Current suite consists of server/domain tests only:

* `src/index.test.ts`
* `src/game/MatchRoom.test.ts`
* `src/game/GameLoop.test.ts`
* `src/game/lastStandCities.test.ts`
* `src/schema/MatchSchema.test.ts`
* `src/messages/protocol.test.ts`
* `src/utils/types.test.ts`

#### Browser automation/e2e presence

There is no implemented Playwright setup in executable project config:

* No `playwright.config.*` file found.
* No `@playwright/test` dependency in `package.json`.
* No `tests/e2e` or `*.spec.ts` browser specs outside current Jest server tests.

Playwright references are currently only in research docs, not production test wiring:

* `.copilot-tracking/research/subagents/2026-06-25/issue-22-playwright-practices-research.md:151` proposes `playwright.config.ts` (proposal only).

### 3) Critical user flows and multiplayer scenarios that should be covered by Playwright

#### Entry -> lobby -> match-room -> role client routing

Flow and UI path evidence:

* `public/index.html:99` entry form persists player identity and routes to `/lobby.html`.
* `public/lobby.html:172` starts in `Connecting to lobby...` state.
* `public/lobby.html:421` connects lobby via `joinLobby(...)`.
* `public/lobby.html:386` creates match reservation via REST helper.
* `public/lobby.html:361` joins selected room reservation via REST helper.
* `public/match-room.html:216` shared pre-match role claim and ready/start UI.
* `public/common/match-room-app.js` drives claim/ready/start and redirects to role UIs on activation.

#### Shared room readiness and start gating

Server-side start preconditions should be e2e validated:

* `src/game/MatchRoom.ts:570` minimum player requirement.
* `src/game/MatchRoom.ts:575` all players must claim role.
* `src/game/MatchRoom.ts:579` commander required.
* `src/game/MatchRoom.ts:586` kaiju required.
* `src/game/MatchRoom.ts:591` all players ready.
* `src/game/MatchRoom.ts:932` match start path.
* `src/game/MatchRoom.ts:983` `match.start` broadcast.

#### Commander core interactions

* `public/commander/app.js:595` commander target selection message.
* `public/commander/app.js:726` commander dispatch message.
* `public/commander/app.js:738` commander start signal.
* `public/commander/app.js:636` signal feed subscription.
* `public/commander/app.js:653` dispatch result subscription.

#### Kaiju core interactions and continue flow

* `public/kaiju/app.js:1437` kaiju movement send.
* `public/kaiju/app.js:1549` kaiju attack send.
* `public/kaiju/app.js:1589` kaiju ability send.
* `public/kaiju/app.js:1601` kaiju continue send.
* `public/kaiju/app.js:1178` contained event handling.
* `public/kaiju/app.js:1191` spectator event handling.
* `src/game/MatchRoom.ts:1205` server broadcasts `kaiju.contained`.
* `src/game/MatchRoom.ts:1245` server broadcasts `kaiju.spectator` when continue window/credits exhausted.

#### Multiplayer design intent and vertical slice priorities

* `docs/multiplayer-game-design.md:310` defines the first playable vertical slice.
* `docs/multiplayer-game-design.md:314` requires authoritative `MatchRoom` tick.
* `docs/multiplayer-game-design.md:320` requires win/loss broadcast.
* `docs/multiplayer-game-design.md:50` and `:52` define credit and continue window behavior.

### 4) Technical constraints for deterministic e2e tests

#### Server startup and port/runtime constraints

* `src/index.ts:34` and `:35` derive runtime from `config.PORT`/`config.HOST`.
* `src/index.ts:62` exposes `/health` for webServer readiness checks.
* `src/index.ts:39` matchmaking middleware order is explicit and sensitive for Colyseus flow.
* `src/index.ts:356` and `:388` provide start/export points suitable for webServer orchestration.
* `src/ops/config.ts:69-86` enforces fail-fast production requirements for `PORT` and `HOST`.

Deterministic Playwright implication:

* Use fixed local host+port and `webServer.url` health check.
* Prefer single-worker execution initially to avoid room-state cross-talk.

#### WebSocket/Colyseus timing and flaky hotspots

* `public/common/colyseus-client.js:4` lobby join timeout is `12000ms`.
* `public/common/colyseus-client.js:165` uses `joinOrCreate("lobby")` with timeout race.
* `public/common/colyseus-client.js:106` consume-seat reservation path has fallback behavior.
* `src/game/MatchRoom.ts:285` reconnect grace uses `allowReconnection(client, 30)`.
* `src/game/MatchRoom.ts:943` game loop runs via `setInterval(..., GAME_CONSTANTS.TICK_MS)`.

Deterministic Playwright implication:

* Assertions must be event/state based; avoid fixed sleeps.
* Reconnect tests should use explicit wait windows aligned with grace period behavior.
* Start with Chromium-only and serial suite.

#### Operational observability gap relevant to e2e assertions

* `docs/operations/slo-policy.md:138-141` explicitly states end-to-end join-to-ready metric is a follow-on instrumentation gap.

Deterministic Playwright implication:

* For Issue 22, assert user-visible state transitions and room events instead of relying on a complete join-to-ready metric signal.

#### Resilience scenarios already recognized in docs/tests

* `docs/operations/chaos-reconnect-tests.md:96` uses targeted run-in-band MatchRoom tests.
* `docs/operations/runbooks/match-start-deadlock.md` and `docs/operations/runbooks/reconnect-storm.md` document known failure classes that should influence e2e scenario prioritization.

## Exact Commands Currently Used or Feasible in This Repo

Current (implemented) commands:

* `npm run dev`
* `npm test`
* `npm test -- --testPathPattern=MatchRoom --runInBand`
* `npm run lint`
* `npm run build`

Feasible commands for Issue 22 once Playwright is added (already proposed in repo research artifacts):

* `npx playwright install --with-deps chromium`
* `npx playwright test`
* `npx playwright test tests/e2e/multiplayer-start.spec.ts --headed`

Reference for the proposed Playwright command set:

* `.copilot-tracking/research/subagents/2026-06-25/issue-22-playwright-practices-research.md:311-343`

## Recommended Prioritized Playwright Candidate Matrix for Issue 22

Priority labels:

* `P0` merge-blocking
* `P1` high-value follow-up in same issue if time allows
* `P2` next issue/backlog

### P0

1. `entry-to-lobby-smoke`

* Validate entry name set, lobby load, connected status.
* Evidence paths: `public/index.html`, `public/lobby.html:417-437`.

2. `commander-creates-match-and-sees-listing`

* Commander creates match from lobby, room appears in room list.
* Evidence paths: `public/lobby.html:386`, `public/lobby.html:303-355`.

3. `commander-plus-kaiju-start-happy-path`

* Two contexts: claim roles, ready, start, route to role clients.
* Evidence paths: `public/match-room.html`, `src/game/MatchRoom.ts:570-596`, `:932-996`.

### P1

4. `start-rejected-until-all-ready`

* Verify start button/action does not progress when requirements unmet.
* Evidence paths: `src/game/MatchRoom.ts:570-591`.

5. `commander-dispatch-feedback-loop`

* Commander selects target and dispatches asset; signal/dispatch results visible.
* Evidence paths: `public/commander/app.js:595`, `:726`, `:653`; `src/game/MatchRoom.ts:667-728`, `:1133-1165`.

6. `kaiju-contained-to-continue-overlay`

* Validate contained event handling and continue request path.
* Evidence paths: `public/kaiju/app.js:1178`, `:1601`; `src/game/MatchRoom.ts:1205-1213`.

### P2

7. `continue-window-expiry-to-spectator`

* Validate spectator transition after continue window with exhausted credits.
* Evidence paths: `src/game/MatchRoom.ts:1222-1252`, `public/kaiju/app.js:1191`.

8. `reconnect-grace-rejoin-flow`

* Validate reconnection path under grace period.
* Evidence paths: `src/game/MatchRoom.ts:285`, `public/common/colyseus-client.js` reconnect behavior.

9. `lobby-timeout-and-recovery-observability`

* Validate user-visible behavior when lobby join timeout path occurs.
* Evidence paths: `public/common/colyseus-client.js:4`, `:165-177`; `public/lobby.html:437`.

## Implementation Gaps to Close for Issue 22

1. Add Playwright tooling and configuration

* Add `@playwright/test` dev dependency.
* Add `playwright.config.ts` with local webServer and CI-safe defaults.

2. Add e2e directory structure and first spec set

* Create `tests/e2e/` with P0 specs first.

3. Stabilize selectors for long-term reliability

* Add explicit `data-testid` to critical controls/status elements in:
  * `public/lobby.html`
  * `public/match-room.html`
  * `public/commander/index.html`
  * `public/kaiju/index.html`

4. Add npm scripts and CI wiring

* Add `test:e2e` scripts and CI artifact upload for reports/traces.

5. Keep deterministic scope bounded initially

* Chromium-only, serial workers, no visual-diff burden initially.

## Clarifying Questions Requiring User/Product Input

1. Which scenarios must be merge-blocking for Issue 22: only P0, or P0+P1?
2. Should reconnect and continue-window expiry be inside Issue 22 scope or a follow-up issue?
3. Is mobile viewport coverage required in Issue 22, or desktop Chromium is sufficient for first delivery?

## Research Status

Status: Complete

The requested repository investigation is complete, and evidence-backed recommendations are documented above for implementation planning.