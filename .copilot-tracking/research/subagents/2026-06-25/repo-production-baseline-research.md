---
title: Kaiju Arcade Repository Production Operations Baseline Research
description: Repository-specific production operations baseline for runtime architecture, operational risks, observability, and deployment assumptions.
ms.date: 2026-06-25
ms.topic: reference
---

## Research Status

- Status: Complete
- Scope date: 2026-06-25
- Research method: Workspace code and documentation inspection

## Research Questions

1. What is the runtime architecture (server entrypoints, lobby/match rooms, schemas, message protocols, static assets)?
2. What scripts/tests/build/start commands exist and which are production-relevant?
3. What operational risks are visible in code (state management, reconnection/session handling, game loop timing, capacity hotspots, error handling)?
4. What observability hooks are currently present or absent?
5. What deployment assumptions are implied by files/docs?

## Command Execution Summary

- `ls -la .copilot-tracking/research/subagents/2026-06-25` confirmed target directory exists and target file was not present.
- `nl -ba` commands were used to inspect code/docs with line-level evidence.
- Search operations used workspace search tools when `rg` was unavailable.
- No build/test command was run during this research pass.
- Existing session context indicates recent successful command executions:
  - `npm run test` exit code 0
  - `npm test -- --runInBand src/index.test.ts` exit code 0
  - `npm run build` exit code 0

## Findings 1: Runtime Architecture

### Server entrypoint and transport

- Express + Colyseus server are initialized in `src/index.ts` with HTTP server and WebSocket transport.
- Match room is registered as `match` and realtime-listed.

Evidence:
- `src/index.ts:18-24`
- `src/index.ts:71`

Snippet:

```ts
const app = express();
const httpServer = createServer(app);
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("match", MatchRoom).enableRealtimeListing();
```

### HTTP endpoints and static assets

- Static hosting maps:
  - `/commander` -> `public/commander`
  - `/kaiju` -> `public/kaiju`
  - `/common` -> `public/common`
  - root static -> `public`
- Operational endpoints:
  - `/health`
  - `/version`
  - `/api/matches/options`
  - `/api/matches` (create/list)
  - `/api/matches/:roomId/join`
  - `/api/matches/:roomId/kaiju-join`

Evidence:
- `src/index.ts:31-41`
- `src/index.ts:52-59`
- `src/index.ts:62-68`
- `src/index.ts:74-110`
- `src/index.ts:113-134`
- `src/index.ts:137-170`
- `src/index.ts:173-207`

### Match room lifecycle and phases

- `MatchRoom` is authoritative for player sessions, role claims, readiness, phase transitions, reconnect grace windows, and deterministic tick execution.
- Phases explicitly managed: `WAITING` -> `LOBBY` -> `ACTIVE` -> `ENDED`.
- Start gate requires commander present, at least one kaiju, all participants role-claimed and ready.

Evidence:
- `src/game/MatchRoom.ts:103-114`
- `src/game/MatchRoom.ts:123-186`
- `src/game/MatchRoom.ts:188-245`
- `src/game/MatchRoom.ts:393-411`
- `src/game/MatchRoom.ts:413-432`
- `src/game/MatchRoom.ts:510-537`
- `src/game/MatchRoom.ts:998-1011`

Snippet:

```ts
if (this.state.metadata.state !== "LOBBY") {
  this.emitSignal("MATCH START REJECTED - LOBBY PHASE REQUIRED", "alert", "SYSTEM");
  return;
}

const startCheck = this.validateStartRequirements();
if (!startCheck.valid) {
  this.emitSignal(startCheck.reason, "alert", "SYSTEM");
  return;
}

this.startMatch();
```

### Authoritative schema model

- Match state is Colyseus schema synchronized from server.
- Includes metadata, city base, commander state, participants, leviathans, dispatch history, ability results, signal feed, active barriers.

Evidence:
- `src/schema/MatchSchema.ts:312-339`
- `src/schema/MatchSchema.ts:224-251`
- `src/schema/MatchSchema.ts:14-92`
- `src/schema/MatchSchema.ts:368-386`

### Message protocol

- Client intents include commander select/dispatch and kaiju move/attack/ability/continue plus lobby role/ready messages.
- Server broadcasts include match start/result/phase, signal feed, commander status, dispatch result, ability result, reconnect token.
- Validation exists for each intent type.

Evidence:
- `src/messages/protocol.ts:15-71`
- `src/messages/protocol.ts:76-179`
- `src/messages/protocol.ts:184-237`
- `src/messages/protocol.ts:239-253`
- `src/messages/protocol.ts:255-319`
- `src/messages/protocol.ts:321-367`

### Frontend runtime flow

- Lobby uses shared `KaijuColyseusClient` and session helper.
- Lobby currently reserves seat via REST and redirects to `match-room.html`.
- `match-room.html` is presently a shared pre-match placeholder page, not full role gameplay orchestration.

Evidence:
- `public/lobby.html:179-181`
- `public/lobby.html:342-359`
- `public/common/colyseus-client.js:83-112`
- `public/common/colyseus-client.js:197-201`
- `public/match-room.html:93-109`
- `public/match-room.html:95-97`

## Findings 2: Scripts, Tests, Build, Start Commands

### Declared npm scripts

Evidence:
- `package.json:11-22`

Commands and operational relevance:

- `build` -> `tsc`: production-relevant, compiles to `dist`.
- `start` -> `node dist/index.js`: production-relevant runtime launch.
- `dev` -> `tsx watch src/index.ts`: development only.
- `clean` -> remove `dist`: CI/build hygiene.
- `test`, `test:watch`: quality gates, pre-production relevance.
- `lint`: pre-production static validation.
- `version:*`: release/versioning workflow support.

### Runtime output assumptions

- Package main points to `dist/index.js`.
- Engine constraints specify Node >=24 and npm >=11.

Evidence:
- `package.json:5`
- `package.json:7-10`

### Test harness and thresholds

- Jest with `ts-jest` and `node` environment.
- Coverage threshold configured at 50% global across statements/branches/functions/lines.

Evidence:
- `jest.config.js:1-5`
- `jest.config.js:12-19`

### Build configuration assumptions

- TypeScript target/lib set to ES2024, strict mode enabled, output to `dist`.

Evidence:
- `tsconfig.json:3-8`
- `tsconfig.json:18-24`

## Findings 3: Operational Risks Visible in Code

### State management and phase coordination risks

- Phase state relies on many conditional transitions in room methods, increasing risk of edge-case drift between `playerSessions`, `participants`, and schema state.
- Multiple data structures are updated per event (`playerSessions`, `participants`, leviathan slots, metadata), increasing consistency risk on unusual leave/rejoin paths.

Evidence:
- `src/game/MatchRoom.ts:108-114`
- `src/game/MatchRoom.ts:218-240`
- `src/game/MatchRoom.ts:278-281`
- `src/game/MatchRoom.ts:931-959`

### Reconnection and session handling risks

- Reconnect is token-based and implemented with grace windows per kaiju, but token lifecycles span server map state plus browser session/local storage.
- Token is persisted in browser localStorage, while other session context uses sessionStorage, which can diverge across tabs/browser lifecycle.

Evidence:
- `src/game/MatchRoom.ts:784-795`
- `src/game/MatchRoom.ts:836-886`
- `src/game/MatchRoom.ts:977-996`
- `public/common/session-manager.js:127-146`
- `public/kaiju/app.js:154-207`

### Game loop timing risks

- Tick loop uses `setInterval`, which can drift under load.
- Drift is detected and warned, but no adaptive correction/backpressure strategy is present.
- Tick comment and validation text have inconsistent tolerance wording (comment says 5 Hz in one place while configured as 20 Hz in current code path), indicating documentation/config drift risk.

Evidence:
- `src/game/MatchRoom.ts:1008-1011`
- `src/game/MatchRoom.ts:1067-1082`
- `src/game/GameLoop.ts:26-37`
- `src/game/GameLoop.ts:499-519`

### Capacity hotspots

- Room capacity is hard-coded to commander + 4 kaiju (`maxClients = 5`).
- Join rejection is immediate on capacity and broadcasts rejection telemetry, but no queue/waitlist behavior exists.

Evidence:
- `src/game/MatchRoom.ts:104-107`
- `src/game/MatchRoom.ts:169`
- `src/game/MatchRoom.ts:227-235`
- `src/game/MatchRoom.ts:296-312`

### Error handling risks

- API handlers return plain error messages directly from caught exceptions, which may leak internals.
- Message handler catches and logs errors, but there is no unified error taxonomy or structured fault envelope.

Evidence:
- `src/index.ts:107-109`
- `src/index.ts:131-133`
- `src/index.ts:167-169`
- `src/index.ts:204-206`
- `src/game/MatchRoom.ts:388-390`

### Transport and endpoint mismatch risk

- API responses include `wsEndpoint` based on `HOST`/`PORT`; frontend helper defaults to same-origin WS endpoint.
- Mixed endpoint logic can create mismatch if reverse proxy/host settings differ.

Evidence:
- `src/index.ts:26-29`
- `src/index.ts:97`
- `src/index.ts:158`
- `src/index.ts:195`
- `public/common/colyseus-client.js:15-23`

## Findings 4: Observability Hooks Present and Absent

### Present hooks

- Health check and version endpoints for basic uptime/version probing.
- Console logs/warnings for lifecycle and timing drift.
- In-band gameplay telemetry events broadcast to clients (`signal.feed`, `commander.status`, `match.join.rejected`, dispatch and ability results).

Evidence:
- `src/index.ts:52-59`
- `src/index.ts:209-225`
- `src/game/MatchRoom.ts:124-125`
- `src/game/MatchRoom.ts:189`
- `src/game/MatchRoom.ts:1077-1081`
- `src/game/MatchRoom.ts:1132-1168`
- `src/game/MatchRoom.ts:1170-1217`
- `src/game/MatchRoom.ts:296-312`

### Absent hooks

- No metrics instrumentation (latency, room counts, tick lag histogram, reconnect success rate) exposed in code.
- No distributed tracing or correlation IDs for API-to-room operations.
- No structured logging framework or sink integration (only raw console logging).
- No explicit readiness endpoint distinct from liveness.

Evidence:
- `src/index.ts:52-59` (health/version only)
- `src/game/MatchRoom.ts:1077-1081` (drift warning only)
- `src/index.ts:107-109` and related handlers (error response without telemetry envelope)

## Findings 5: Deployment Assumptions Implied by Files and Docs

### Runtime and host assumptions

- Default host/port are `localhost:3000`, with WS endpoint composed from these values.
- Startup banner assumes direct host/port reachability.

Evidence:
- `src/index.ts:26-29`
- `src/index.ts:97`
- `src/index.ts:210-223`

### Build artifact assumption

- Production entrypoint is compiled `dist/index.js`; deployment must run build before start.

Evidence:
- `package.json:5`
- `package.json:12-13`
- `tsconfig.json:6-7`

### Node version assumption mismatch in repository docs

- Package engines require Node >=24.
- Design document still references Node.js 22 LTS and Colyseus/ACA assumptions from draft architecture.

Evidence:
- `package.json:7-10`
- `docs/multiplayer-game-design.md:147`
- `docs/multiplayer-game-design.md:220`

### Production architecture assumptions in docs vs implemented code

- Design doc describes Colyseus authoritative room model and ACA deployment concepts, but current repository has planning/implementation-package docs that include aspirational content and mixed maturity.
- `match-room.html` currently states role claim/readiness deferred to next phase, indicating partial implementation state for full match UX.

Evidence:
- `docs/multiplayer-game-design.md:141-153`
- `docs/multiplayer-game-design.md:213-233`
- `START-HERE.md:5`
- `START-HERE.md:193-196`
- `public/match-room.html:95-97`

## Recommended Operational Implications

- Add a formal production runbook aligned to current implementation, not conceptual docs.
- Introduce structured logging with request/room/session correlation IDs.
- Add metrics for tick drift, room occupancy, join rejection reasons, reconnect attempts/successes, and dispatch latency.
- Add a readiness endpoint that validates room registration and matchmaking dependencies.
- Standardize WS endpoint strategy behind reverse proxy headers and remove ambiguous host composition paths.
- Treat token persistence strategy as a security and reliability decision: unify storage policy and add expiry/rotation validation on client side.
- Add load tests around max room occupancy and reconnection storms to validate grace-window behavior.
- Resolve Node runtime version inconsistency across docs and package metadata.

## Unresolved Gaps

- No explicit deployment manifests were inspected in this pass (for example Dockerfile, ACA YAML, IaC), so production infra reality could not be validated against docs.
- No runtime metrics backend or log sink configuration was found in the inspected files.
- No explicit SLO/SLA targets or on-call operational thresholds were found.
- Match-room UX appears intentionally transitional; exact cutover path from shared pre-match to role-specific gameplay orchestration is not documented in a single authoritative operations runbook.

## Key Discoveries Summary

- Runtime core is operationally centered on `src/index.ts` + `MatchRoom` with Colyseus schema synchronization and a 20 Hz authoritative loop.
- Production-critical commands are straightforward (`build`, `start`), and recent session context shows tests/build passing.
- Main operational risks are phase/state consistency complexity, reconnect token lifecycle across mixed storage, and limited observability depth.
- Health/version endpoints exist, but production telemetry, tracing, and readiness sophistication are currently absent.
- Deployment assumptions in docs are partly aspirational and contain version drift relative to package runtime constraints.
