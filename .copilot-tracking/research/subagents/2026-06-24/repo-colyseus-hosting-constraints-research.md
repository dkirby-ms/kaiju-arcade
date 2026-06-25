---
title: Repository Colyseus Hosting Constraints Research
description: Hosting-relevant constraints for deploying the kaiju-arcade Colyseus multiplayer server on Azure
ms.date: 2026-06-24
---

## Research Scope

Topics investigated:

* Runtime architecture and deployment assumptions in server and client entry points
* Protocol requirements: WebSocket, HTTP endpoints, ports, affinity assumptions, state location
* Scale-sensitive characteristics in lobby and room handling
* Operational hosting constraints for Azure deployment choices

Primary files reviewed:

* package.json
* src/index.ts
* src/game/MatchRoom.ts
* src/schema/MatchSchema.ts
* public/common/colyseus-client.js
* docs/multiplayer-game-design.md
* COLYSEUS-LOBBY-RESEARCH.md

## Runtime Architecture And Deployment Assumptions

### Server shape

* Single Node.js process hosts both Express HTTP routes and Colyseus transport on the same HTTP server: src/index.ts:19-24.
* Colyseus room type `match` is registered with realtime listing enabled, which is the basis for LobbyRoom discovery: src/index.ts:71.
* Server binds to `process.env.PORT` and `process.env.HOST`, defaulting to `3000` and `localhost`: src/index.ts:26-28.
* Runtime scripts assume transpile-then-run or dev watch against `src/index.ts`: package.json:13-14.

### Frontend connection assumptions

* Browser client chooses WS endpoint from current origin and protocol, using `wss` under HTTPS and `ws` under HTTP: public/common/colyseus-client.js:12-15.
* Lobby discovery uses built-in Colyseus `lobby` room and message stream protocol (`rooms`, `+`, `-`): public/common/colyseus-client.js:23, public/common/colyseus-client.js:60, public/common/colyseus-client.js:77, public/common/colyseus-client.js:96.

### REST helper assumptions

* API exposes seat reservation workflows for match creation, listing, and kaiju join helpers:
  * `GET /api/matches/options`: src/index.ts:62.
  * `POST /api/matches`: src/index.ts:74.
  * `GET /api/matches`: src/index.ts:113.
  * `POST /api/matches/:roomId/kaiju-join`: src/index.ts:136.
* API responses include `processId`, `publicAddress`, and generated `wsEndpoint`: src/index.ts:94-98, src/index.ts:154-158.

## Protocol Requirements

### WebSocket requirements

* Colyseus transport is WebSocket over the shared HTTP server: src/index.ts:21-23.
* Match gameplay and lifecycle signaling are room broadcasts (`match.phase`, `match.start`, `match.result`, plus commander/kaiju event channels): src/game/MatchRoom.ts:795, src/game/MatchRoom.ts:813, src/game/MatchRoom.ts:1096.
* Client protocol explicitly expects LobbyRoom incremental update messages (`rooms`, `+`, `-`): public/common/colyseus-client.js:60, public/common/colyseus-client.js:77, public/common/colyseus-client.js:96.

### HTTP requirements

* Health and version probes exist for platform readiness/liveness usage: src/index.ts:52, src/index.ts:57.
* Static frontends and shared assets are served by Express (`/commander`, `/kaiju`, `/common`, root public): src/index.ts:32-41.
* REST match endpoints are coupled to matchmaker and intended as helper control plane for browser/mobile flows: src/index.ts:74-168.

### Port and endpoint assumptions

* Server listen port defaults to 3000 in code: src/index.ts:26.
* API emits `wsEndpoint` as `ws://{hostname}:{portNum}` using server-side host/port variables, not request headers: src/index.ts:97, src/index.ts:157.
* Browser-side default WS endpoint is same-origin derived (`location.host`), which can diverge from API-returned `wsEndpoint` if host config is wrong behind reverse proxy: public/common/colyseus-client.js:12-15, src/index.ts:97.

### Sticky session and process assumptions

* State is in-process room memory. Code has no Redis presence, no external room state adapter, and no cross-node session broker in the reviewed files.
* MatchRoom lifecycle and player session maps are local memory objects (`playerSessions`, reconnect maps): src/game/MatchRoom.ts:101-103.
* Project docs explicitly state in-process rooms and sticky session expectation for ACA: docs/multiplayer-game-design.md:228-229.

### In-memory state concerns

* Entire authoritative match state is Colyseus schema objects in memory (`MatchSchema` and nested arrays/maps): src/schema/MatchSchema.ts:290-311.
* Tick loop uses `setInterval` and mutable in-memory state updates at 20 Hz: src/game/MatchRoom.ts:770, src/schema/MatchSchema.ts:760-761.
* If process/replica dies, room state is lost. The code includes reconnect grace handling but no durable state restore path: src/game/MatchRoom.ts:679-725.

## Scale-Sensitive Characteristics For Lobby And Room Handling

### Room capacity and slot model

* Match capacity is fixed at 1 commander + 4 kaiju (`maxClients = 5`): src/game/MatchRoom.ts:97, src/game/MatchRoom.ts:157.
* Kaiju slots are pre-seeded in-memory on room creation and converted AI-to-player on join: src/game/MatchRoom.ts:616-618, src/game/MatchRoom.ts:621-637.
* Capacity overflow rejects join with WebSocket close code `1008`: src/game/MatchRoom.ts:99, src/game/MatchRoom.ts:239.

### Lobby listing dynamics

* Realtime listing metadata is updated from room state (`status`, `playerCount`, `maxPlayers`, `commanderName`): src/game/MatchRoom.ts:773-779.
* Match enters `LOBBY` phase only when commander and at least one human kaiju are present: src/game/MatchRoom.ts:384-392.
* Built-in lobby discovery pattern depends on `enableRealtimeListing()` and client consumption of incremental room-list messages: src/index.ts:71, public/common/colyseus-client.js:60-109.

### Reconnection and churn behavior

* Reconnect grace window is fixed at 30s and managed in memory per leviathan slot: src/game/MatchRoom.ts:98, src/game/MatchRoom.ts:679-725.
* On grace timeout, control is promoted back to AI. This protects gameplay continuity but does not preserve process crash scenarios: src/game/MatchRoom.ts:707-714.

### Tick and CPU sensitivity

* Tick rate is 20 Hz (`50ms`) and every active room executes deterministic server updates on each tick: src/schema/MatchSchema.ts:760-761, src/game/MatchRoom.ts:817-840.
* Broadcast fanout includes frequent status/signal updates, increasing outbound WS traffic with active rooms/players: src/game/MatchRoom.ts:848-850, src/game/MatchRoom.ts:915-962.

## Concrete Hosting Constraints For Azure Choice

Recommended operational constraints based on repository evidence:

1. Enforce WebSocket-capable ingress with affinity for session continuity.
   * Reason: room state and player sessions are process-local memory; no shared room backend.
   * Evidence: src/game/MatchRoom.ts:101-103, docs/multiplayer-game-design.md:228-229.

2. Treat this deployment as stateful-per-connection, not stateless HTTP.
   * Reason: Colyseus room actor state lives in memory and ticks continuously.
   * Evidence: src/schema/MatchSchema.ts:290-311, src/game/MatchRoom.ts:770.

3. Keep at least one warm replica during expected play windows.
   * Reason: cold starts delay WS join path and can degrade lobby UX.
   * Evidence: docs recommend scale-to-zero, but this is a tradeoff for real-time sessions: docs/multiplayer-game-design.md:238-239.

4. Validate externally visible WS endpoint strategy.
   * Reason: server-generated `wsEndpoint` may resolve to `localhost` if HOST is not set correctly, conflicting with client same-origin behavior.
   * Evidence: src/index.ts:27, src/index.ts:97, src/index.ts:157, public/common/colyseus-client.js:12-15.

5. Plan for replica restart match loss unless persistence/backplane is added.
   * Reason: reconnect grace handles transient client disconnect, not room rehydration after process death.
   * Evidence: src/game/MatchRoom.ts:679-725 and absence of persistent room store in reviewed runtime files.

6. Capacity planning should model per-room tick CPU plus broadcast traffic.
   * Reason: each active room has its own 20 Hz loop and frequent event broadcasts.
   * Evidence: src/game/MatchRoom.ts:770, src/game/MatchRoom.ts:845-962.

7. Preserve route compatibility for both static UI and REST control plane.
   * Reason: browser flows depend on static pages plus API helpers and WS.
   * Evidence: src/index.ts:32-41, src/index.ts:52-57, src/index.ts:62-168.

## Evidence Notes From Repository Docs

The repository docs align with the code-level constraints and explicitly call out Azure Container Apps with sticky sessions, in-process room behavior, scale rules, and monitoring controls:

* Hosting section: docs/multiplayer-game-design.md:213-216.
* In-process rooms and sticky sessions: docs/multiplayer-game-design.md:228-229.
* Scale profile examples: docs/multiplayer-game-design.md:238-239.
* Config examples (`COLYSEUS_PORT`, monitor toggle): docs/multiplayer-game-design.md:246, docs/multiplayer-game-design.md:251.
* `/colyseus` monitor mention: docs/multiplayer-game-design.md:256.

Related prior research in repo also documents LobbyRoom message protocol and `enableRealtimeListing()` usage:

* COLYSEUS-LOBBY-RESEARCH.md:18, COLYSEUS-LOBBY-RESEARCH.md:31-52, COLYSEUS-LOBBY-RESEARCH.md:152.

## Remaining Unknowns

* No infrastructure manifests were reviewed in this task (Dockerfile, ACA Bicep/Terraform, ingress config), so sticky affinity and probe configuration are not verified as implemented.
* No load-test artifacts were reviewed, so replica sizing and max concurrent room estimates remain unknown.
* No explicit global room presence/backplane setup was found in the reviewed runtime files.

## Status

Complete for repository-level hosting constraint identification from requested files and related hosting/lobby docs.