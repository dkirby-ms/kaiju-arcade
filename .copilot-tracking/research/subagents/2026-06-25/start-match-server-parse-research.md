---
title: Start Match Server Parse Research
description: Investigation of kaiju-arcade server-side match start handling and JSON body parsing behavior for malformed token payloads
author: GitHub Copilot
ms.date: 2026-06-25
ms.topic: troubleshooting
---

## Research Scope

Questions investigated:

1. How is match start handled server-side, and is it HTTP or websocket-driven?
2. Which HTTP endpoints use JSON body parsing and may receive session or reconnection tokens?
3. What payload shape does the server parser and endpoint logic expect?
4. How could payload ""PY3mJEhpo"" trigger SyntaxError Unexpected token '"'?
5. Which endpoint is the most likely failure point for that payload?

## Executive Summary

Match start is not an HTTP route in this codebase. It is a room websocket message path: clients send commander.start to MatchRoom, and MatchRoom validates lobby-phase and readiness requirements before transitioning to ACTIVE.

HTTP JSON parsing is global via express.json() and applies to all POST /api/matches* endpoints.

A body of ""PY3mJEhpo"" is malformed JSON for application/json. It fails before endpoint handler logic, in the JSON parser middleware, with a 400 parse error. Reproduction confirms the parser failure shape: Unexpected token '"', """PY3mJEhpo""" is not valid JSON.

Most likely failing endpoint is POST /api/matches/:roomId/join (or fallback POST /api/matches/:roomId/kaiju-join), because these are the only token-relevant HTTP endpoints that accept reconnectToken in the request body.

## Server-Side Match Start Handling

Evidence:

- src/game/MatchRoom.ts:182-191 registers a wildcard room message handler and special-cases commander.start.
- src/game/MatchRoom.ts:408-426 handleCommanderStart verifies caller role and state before calling startMatch().
- src/game/MatchRoom.ts:414-416 rejects start outside LOBBY phase.
- src/game/MatchRoom.ts:419-423 rejects if start requirements are not met.
- src/game/MatchRoom.ts:428-446 reconcileLobbyPhase manages WAITING and LOBBY transitions.

Observed behavior:

- Start command path is websocket message based, not REST.
- The payload for commander.start is not JSON-parsed by Express middleware.
- Therefore, JSON parse errors with raw body content cannot come from the match-start command path itself.

## HTTP Endpoints With JSON Body Parsing

Evidence:

- src/index.ts:31 configures app.use(express.json()) globally.
- src/index.ts:74-110 POST /api/matches reads req.body, merges cityName, and calls matchMaker.create.
- src/index.ts:137-170 POST /api/matches/:roomId/kaiju-join reads req.body.playerName and req.body.reconnectToken.
- src/index.ts:173-207 POST /api/matches/:roomId/join reads req.body.playerName and req.body.reconnectToken.

Parser and handler expectations:

- Parser expectation for application/json: syntactically valid JSON document.
- Endpoint logic expectation after parsing: object-like body with optional string fields.
- For join endpoints specifically, expected body shape is JSON object, for example:
  - {"playerName":"Kaiju Pilot","reconnectToken":"PY3mJEhpo"}

## Client-Side Body Construction in First-Party Flow

Evidence:

- public/common/colyseus-client.js:46-53 postJson() always sends body: JSON.stringify(payload || {}).
- public/common/colyseus-client.js:93-106 joinMatchReservationViaRest() posts an object payload to /join, fallback to /kaiju-join for kaiju role.
- public/lobby.html:352-354 calls joinMatchReservationViaRest(roomId, joinOptions).
- public/lobby.html:377-379 calls createMatchReservationViaRest(joinOptions).
- public/lobby.html:213-218 getJoinOptions() returns object with playerName.

Implication:

- First-party browser code in this repository sends JSON objects to /api/matches* endpoints.
- A raw top-level token string body is likely from an external/manual client, an interceptor/proxy mutation, or a caller not using this helper.

## Token Paths Relevant to Reconnection

Evidence:

- src/game/MatchRoom.ts:230-233 reads reconnectToken from Colyseus join options (websocket join options).
- src/game/MatchRoom.ts:799-809 uses reconnectToken to reclaim kaiju session.
- public/kaiju/app.js:1212-1224 reconnects via websocket join("match", roomId, { playerRole, reconnectToken }).

Important distinction:

- Reconnection token is consumed in both HTTP helper joins and websocket join options.
- The JSON parse error in question can only occur on HTTP routes guarded by express.json().
- Websocket join option handling in MatchRoom is not affected by Express JSON body parsing.

## Why ""PY3mJEhpo"" Throws Unexpected Token

Given payload (wire body):

- ""PY3mJEhpo""

Actual parser expectation:

- Valid JSON for Content-Type: application/json.

What this payload is:

- Invalid JSON syntax with doubled outer quotes.
- It starts with a quote, then immediately another quote, then unescaped content, then two trailing quotes.

Resulting behavior:

- express.json() rejects at middleware stage with status 400 before route handler body logic runs.
- Reproduction result in Node/Express:
  - status 400
  - error: Unexpected token '"', """PY3mJEhpo""" is not valid JSON
  - type: entity.parse.failed

Parser expectation vs actual value summary:

- Expected request body for reconnect token: {"reconnectToken":"PY3mJEhpo"}
- Actual sent body: ""PY3mJEhpo""
- Outcome: parse failure, handler not executed.

## Most Likely Failing Endpoint

Primary candidate:

- POST /api/matches/:roomId/join

Reasoning:

- It is the default join reservation endpoint invoked by client helper.
- It accepts reconnectToken in req.body and is used for role-agnostic join attempts.
- Any malformed JSON payload fails here at express.json() before joinById.

Secondary candidate:

- POST /api/matches/:roomId/kaiju-join

Reasoning:

- It is fallback path for kaiju role in client helper and also consumes reconnectToken from req.body.
- It has identical parser exposure and would fail the same way with malformed body.

Lower likelihood:

- POST /api/matches could fail parsing with same malformed body, but it is not the reconnection token path in normal flow.

## Additional Evidence From Tests

Evidence:

- src/index.test.ts:463-495 validates /api/matches/:roomId/join with object body including reconnectToken.
- src/index.test.ts:426-441 validates /api/matches/:roomId/kaiju-join with object body including reconnectToken.

Gap identified:

- No test currently asserts middleware behavior for malformed JSON body on /api/matches/:roomId/join or /api/matches/:roomId/kaiju-join.

## Clarifying Questions

1. Where was payload ""PY3mJEhpo"" observed (browser devtools request payload, server logs, reverse proxy logs, or test harness)?
2. Was Content-Type explicitly set to application/json by the failing caller?
3. Is the failing caller first-party browser code in this repo, or an external/mobile/test client that may send raw strings?
4. Is there any proxy/rewrite layer that could double-quote token values before forwarding?

## Recommended Next Research

- [ ] Capture one failing HTTP request/response pair including headers and raw body bytes for /api/matches/:roomId/join.
- [ ] Add targeted API test coverage for malformed JSON body handling on /api/matches/:roomId/join and /api/matches/:roomId/kaiju-join.
- [ ] Correlate server access logs with user action timeline to determine whether /join or /kaiju-join failed first.
- [ ] Verify whether any non-browser client bypasses public/common/colyseus-client.js and sends hand-built JSON.
