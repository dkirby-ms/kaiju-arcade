---
title: Colyseus Join and Lobby Flow Research
description: Bug-focused research of kaiju-arcade lobby, matchmaking, and room joining flow against native Colyseus 0.17 patterns
author: GitHub Copilot
ms.date: 2026-06-25
ms.topic: reference
---

## Scope

Research target:

1. Exact current client flow and server flow for lobby + matchmaking + room join
2. Mismatch against native Colyseus 0.17 patterns
3. Ranked root-cause hypotheses with evidence
4. Concrete proposed fixes (exact files/functions)
5. Quick validation plan

## 1) Exact Current Flow (Client + Server)

### Client flow (current implementation)

1. User opens shared lobby page and initializes lobby connection.
   - public/lobby.html:402
   - public/lobby.html:412
   - public/common/colyseus-client.js:280
   - public/common/colyseus-client.js:283

2. "Lobby" is not a Colyseus LobbyRoom connection. It is a REST polling wrapper over GET /api/matches.
   - public/common/colyseus-client.js:197
   - public/common/colyseus-client.js:226
   - public/common/colyseus-client.js:280

3. Create flow from lobby: call REST create reservation, store reservation in session state, redirect to shared match-room page.
   - public/lobby.html:367
   - public/lobby.html:378
   - public/lobby.html:247
   - public/lobby.html:220
   - public/lobby.html:221
   - public/lobby.html:383

4. Join flow from lobby: call REST join reservation, store reservation in session state, redirect to shared match-room page.
   - public/lobby.html:342
   - public/lobby.html:353
   - public/lobby.html:247
   - public/lobby.html:358

5. Shared pre-match room bootstraps and attempts room connection.
   - public/common/match-room-app.js:320
   - public/common/match-room-app.js:349
   - public/common/match-room-app.js:356
   - public/common/match-room-app.js:366

6. In shared pre-match room, players claim role and ready-up through messages, then transition to role-specific gameplay page after ACTIVE.
   - public/common/match-room-app.js:395
   - public/common/match-room-app.js:402
   - public/common/match-room-app.js:409
   - public/common/match-room-app.js:438
   - public/common/match-room-app.js:200
   - public/common/match-room-app.js:296

7. Reconnect paths in commander/kaiju use client.reconnect(reconnectToken).
   - public/commander/app.js:664
   - public/commander/app.js:703
   - public/kaiju/app.js:1226
   - public/kaiju/app.js:1254

### Server flow (current implementation)

1. Matchmaking middleware is enabled.
   - src/index.ts:39

2. Only one room type is defined for gameplay and realtime listing.
   - src/index.ts:104

3. Create reservation endpoint uses matchMaker.create("match", options).
   - src/index.ts:107
   - src/index.ts:128

4. Join reservation endpoints use matchMaker.joinById(roomId, options).
   - src/index.ts:181
   - src/index.ts:202
   - src/index.ts:226
   - src/index.ts:246

5. MatchRoom join lifecycle:
   - onJoin parses options.role/options.playerRole and optionally auto-claims role
     - src/game/MatchRoom.ts:184
     - src/game/MatchRoom.ts:209
     - src/game/MatchRoom.ts:223
   - phase transitions WAITING <-> LOBBY based on player count
     - src/game/MatchRoom.ts:476
   - onLeave invokes allowReconnection(client, 30) for non-consented disconnects
     - src/game/MatchRoom.ts:258
     - src/game/MatchRoom.ts:285
   - onReconnect restores participant state
     - src/game/MatchRoom.ts:306

## 2) Mismatch vs Native Colyseus 0.17 Patterns

### Mismatch A: Seat reservation shape conversion uses pre-0.17 nested room shape

Evidence in repo:

- Custom converter creates nested room object:
  - public/common/colyseus-client.js:135
- Consumption passes converted object into client.consumeSeatReservation(...):
  - public/common/colyseus-client.js:151
  - public/common/colyseus-client.js:153

Official 0.17 reference:

- 0.17 migration removed nested room object; reservation fields are flat (roomId/name/processId/publicAddress/sessionId)
  - <https://github.com/colyseus/docs/blob/master/pages/migrating/0.17.mdx>

Impact:

- Conversion can break native consumeSeatReservation expectations and force fallback join path.

### Mismatch B: Fallback path drops join options entirely

Evidence in repo:

- On consume failure, code falls back to joinById(roomId, {}), dropping playerName/reconnect metadata.
  - public/common/colyseus-client.js:164

Native 0.17 expectation:

- joinById accepts options, and those options are part of join flow to onJoin/onAuth context.
  - <https://github.com/colyseus/docs/blob/master/pages/sdk.mdx>

Impact:

- Player metadata can be lost or replaced by defaults, and reconnect intent options are ignored.

### Mismatch C: Lobby flow bypasses native LobbyRoom pattern

Evidence in repo:

- Server comment says realtime listing supports LobbyRoom discovery:
  - src/index.ts:103
- But no lobby room definition exists; client joinLobby explicitly avoids /matchmake/joinOrCreate/lobby and uses REST polling.
  - src/index.ts:104
  - public/common/colyseus-client.js:280
  - public/common/colyseus-client.js:281
  - public/common/colyseus-client.js:283

Native 0.17 pattern:

- Define LobbyRoom and connect via client.joinOrCreate("lobby").
  - <https://github.com/colyseus/docs/blob/master/pages/room/built-in/lobby.mdx>
  - <https://github.com/colyseus/docs/blob/master/pages/server.mdx>

Impact:

- Loses native lobby semantics and can diverge from room listing behavior/events expected by Colyseus clients.

### Mismatch D: Reconnect token contract drift and dead token message listeners

Evidence in repo:

- API responses advertise reconnect option key as reconnectToken.
  - src/index.ts:143
  - src/index.ts:214
  - src/index.ts:259
- 0.17 SDK reconnect expects roomId:token string in room.reconnectionToken and client.reconnect(token).
  - public/vendor/colyseus-sdk-0.17.js:7743
  - public/vendor/colyseus-sdk-0.17.js:7747
- Shared match-room listens for match.reconnect.token and kaiju.reconnect.token events.
  - public/common/match-room-app.js:272
  - public/common/match-room-app.js:284
- Server room implementation does not emit those message types.
  - src/game/MatchRoom.ts (no match.reconnect.token/kaiju.reconnect.token broadcast)

Official 0.17 reference:

- Reconnection should use room.reconnectionToken + client.reconnect(...), with allowReconnection on server.
  - <https://github.com/colyseus/docs/blob/master/pages/room/reconnection.mdx>
  - <https://github.com/colyseus/docs/blob/master/pages/faq.mdx>

Impact:

- Confusing reconnect semantics and stale listener code increase chance of token handling regressions.

## 3) Root-Cause Hypotheses (Ranked)

1. High confidence: reservation conversion + fallback path causes non-native joins and option loss.
   - Evidence: public/common/colyseus-client.js:135, public/common/colyseus-client.js:153, public/common/colyseus-client.js:164.
   - Why likely: conversion encodes old shape while 0.17 consumeSeatReservation expects flat payload; fallback then strips options.

2. High confidence: lobby discovery intentionally bypasses native LobbyRoom and therefore cannot fully align with Colyseus lobby lifecycle.
   - Evidence: public/common/colyseus-client.js:280-283 behavior (REST lobby), src/index.ts defines only match room.
   - Why likely: direct divergence from official lobby pattern means subtle behavior drift is expected.

3. Medium confidence: reconnect key naming and dead token listeners produce fragile reconnect/session transitions.
   - Evidence: src/index.ts reconnect metadata key vs 0.17 SDK reconnectionToken semantics, listeners in public/common/match-room-app.js with no matching server emit.
   - Why likely: partially overlapping token models encourage inconsistent handoff logic.

4. Medium confidence: duplicated join paths (reservation consume, direct joinById, REST fallback) can create inconsistent participant identity and state.
   - Evidence: public/common/match-room-app.js:349 and public/common/match-room-app.js:356 plus colyseus-client fallback behavior.
   - Why likely: multiple connection paths with different option propagation rules increase edge-case divergence.

## 4) Proposed Fixes (Exact Files/Functions)

### Fix 1: Use native 0.17 seat reservation payload directly

Files/functions:

- public/common/colyseus-client.js
  - function toSeatReservation (line ~135)
  - async function consumeSeatReservation (line ~151)

Changes:

- Stop converting to nested room shape.
- Pass server reservation payload directly to client.consumeSeatReservation(reservation).
- Keep roomId/name/processId/publicAddress/sessionId flat as-is.

### Fix 2: Preserve options when fallback joinById is used

Files/functions:

- public/common/colyseus-client.js
  - async function consumeSeatReservation (line ~151)

Changes:

- Replace client.joinById(roomId, {}) with client.joinById(roomId, originalOptions).
- Ensure original options include playerName and any reconnect-related metadata used by app flow.

### Fix 3: Align lobby implementation with native Colyseus LobbyRoom

Files/functions:

- src/index.ts
  - room definitions near gameServer.define("match", MatchRoom).enableRealtimeListing()
- public/common/colyseus-client.js
  - async function joinLobby (line ~280)
  - bindLobbyRoomListHandlers (line ~292)

Changes:

- Define LobbyRoom on server and keep match room realtime listing enabled.
- Switch joinLobby to client.joinOrCreate("lobby") or client.join("lobby").
- Keep REST polling only as explicit fallback mode, not default path.

### Fix 4: Normalize reconnect contract to Colyseus-native token usage

Files/functions:

- src/index.ts
  - API reconnect metadata blocks (lines ~143/~214/~259)
- public/common/match-room-app.js
  - token message listeners at lines 272 and 284
- public/commander/app.js and public/kaiju/app.js
  - reconnect paths already using client.reconnect(...)

Changes:

- Use one canonical naming model around room.reconnectionToken.
- Remove or implement server emitters for match.reconnect.token/kaiju.reconnect.token (prefer removal if redundant).
- Keep allowReconnection + client.reconnect as primary reconnection path.

### Fix 5: Reduce duplicated connection paths in shared match room

Files/functions:

- public/common/match-room-app.js
  - async function connectToRoom (line ~320)

Changes:

- Prefer one deterministic connection path for initial attach.
- Use reservation consume first (fixed per Fix 1), then one clear fallback with preserved options.

## 5) Quick Validation Plan

### Manual validation

1. Create match from lobby and ensure reservation consumption succeeds without fallback warning.
2. Join existing match from second browser tab and verify playerName is preserved in roster.
3. Force network drop during pre-match and during active match; confirm reconnect via client.reconnect(room.reconnectionToken).
4. Verify lobby room list updates in realtime through native lobby connection (+/- events) when matches are created/closed.
5. Confirm no dead listener warnings/logs for match.reconnect.token/kaiju.reconnect.token.

### Automated validation

1. Add unit tests for reservation payload handling in public/common/colyseus-client.js:
   - accepts flat 0.17 reservation
   - no nested room conversion
   - fallback preserves options
2. Add integration tests for lobby flow in src/index.test.ts:
   - lobby list updates with metadata
   - create/join reservation to shared match-room attach
3. Add reconnect scenario tests in src/game/MatchRoom.test.ts:
   - allowReconnection path
   - reconnect token roundtrip validation

## External Sources

1. Colyseus 0.17 migration (seat reservation shape)
   - <https://github.com/colyseus/docs/blob/master/pages/migrating/0.17.mdx>
2. Colyseus server and lobby realtime listing
   - <https://github.com/colyseus/docs/blob/master/pages/server.mdx>
   - <https://github.com/colyseus/docs/blob/master/pages/room/built-in/lobby.mdx>
3. Colyseus SDK matchmaking methods
   - <https://github.com/colyseus/docs/blob/master/pages/sdk.mdx>
4. Colyseus reconnection flow and allowReconnection
   - <https://github.com/colyseus/docs/blob/master/pages/room/reconnection.mdx>
   - <https://github.com/colyseus/docs/blob/master/pages/room.mdx>
   - <https://github.com/colyseus/docs/blob/master/pages/faq.mdx>