---
title: Start Match Client Flow Research
description: Investigation of Start Match refresh-to-matchmaking bug with request-path correlation and root-cause ranking
author: GitHub Copilot (Researcher Subagent)
ms.date: 2026-06-25
ms.topic: troubleshooting
keywords:
  - start-match
  - matchmaking
  - colyseus
  - reconnect
  - client-flow
estimated_reading_time: 7
---

## Research Scope

Requested investigation:

* Client-side Start Match flow in:
  * public/lobby.html
  * public/common/*.js
  * public/commander/app.js
  * public/kaiju/app.js
* Start-match handlers, navigation, and session persistence logic
* Correlation with server logs:
  * clients leave right after "Match starting..."
  * JSON parse error for body '""PY3mJEhpo""'
* Determine likely request details:
  * destination endpoint
  * HTTP method
  * body content
* Explain why the page appears to refresh and users return to matchmaking

## Evidence Collected

### 1. Start Match buttons are explicit click handlers, not form submit handlers

* Shared match room Start Match button has type=button:
  * public/match-room.html:255
* Commander Start Match button has type=button:
  * public/commander/index.html:29
* Shared flow sends a room message on click:
  * public/common/match-room-app.js:370-373
* Commander flow sends a room message on click:
  * public/commander/app.js:739-744

Conclusion: the Start Match click itself is not a browser form submit trigger and should not directly cause a full document reload.

### 2. Start Match causes an intentional page navigation to role-specific clients

* Shared match room transitions on phase/message and routes by role:
  * public/common/match-room-app.js:194-216
* Activation route target:
  * commander -> /commander/index.html
  * kaiju -> /kaiju/index.html
  * public/common/match-room-app.js:216
* Before navigating, shared room client explicitly leaves room:
  * public/common/match-room-app.js:207-211

Conclusion: users will see a page navigation immediately after start. This is expected behavior, but it must be followed by successful reconnect/join in the destination page.

### 3. Session handoff is persisted before navigation

* Active match session is stored with role, roomId, reconnectToken:
  * public/common/match-room-app.js:176-191
  * public/common/session-manager.js:150-189
* Current room context and tokens are persisted in sessionStorage:
  * public/common/session-manager.js:82-126
  * public/common/session-manager.js:226-239

Conclusion: Start Match handoff depends on session storage context being consumed correctly by destination pages.

### 4. Commander reconnect path uses shared client helper (safe pattern)

* Commander reconnect uses:
  * window.KaijuColyseusClient.joinMatchById(client, currentMatchId, { ... })
  * public/commander/app.js:685-691
* Shared helper joinMatchById uses REST seat reservation + consumeSeatReservation:
  * public/common/colyseus-client.js:109-116
  * public/common/colyseus-client.js:93-107

Conclusion: commander path is less likely to produce malformed matchmake request payloads.

### 5. Kaiju reconnect path uses direct Colyseus join with suspicious signature

* Kaiju reconnect uses direct call:
  * const room = await client.join("match", selectedRoomId, { ... })
  * public/kaiju/app.js:1220-1224
* This differs from the shared helper pattern and from Colyseus docs for join-by-id.

External doc evidence:

* Colyseus docs show join-by-room-id should use joinById(roomId, options), not join(roomName, roomId, options).
* Context7 reference (/colyseus/docs): joinById examples and matchmaker request schema.

Conclusion: kaiju reconnect call is likely passing arguments in a way that produces malformed HTTP matchmake payloads.

### 6. Kaiju failure path routes upstream to matchmaking pages

* During initialize, if reconnect fails, it calls routeUpstream(true):
  * public/kaiju/app.js:1657-1661
* routeUpstream navigates to /match-room.html or /lobby.html depending on context:
  * public/kaiju/app.js:248-268

Conclusion: when kaiju reconnect/join fails after Start Match navigation, users are bounced back upstream, perceived as "page refreshed and returned to matchmaking".

### 7. Server REST endpoints do not accept raw string body for join options

* Express JSON middleware is active:
  * src/index.ts:29
* Join endpoints expect object body with playerName/reconnectToken:
  * src/index.ts:164-172
  * src/index.ts:203-206

Conclusion: a body that is just a JSON string (e.g., '""PY3mJEhpo""') does not match server join option object expectations.

## Correlation to Log Symptom '""PY3mJEhpo""'

Observed server parse error body shape:

* '""PY3mJEhpo""' (double-quoted string literal as request body)

Most plausible production path from client code:

1. Commander clicks Start Match.
2. Shared room routes kaiju user to /kaiju/index.html (expected navigation).
3. Kaiju initialize calls reconnectActiveMatch().
4. reconnectActiveMatch uses client.join("match", selectedRoomId, options).
5. Colyseus matchmake request is constructed unexpectedly, with roomId being serialized as standalone string body (or otherwise malformed payload), producing parse/body-contract errors on server.
6. reconnectActiveMatch throws.
7. catch in initialize routes upstream to /match-room.html or /lobby.html.
8. Users perceive "refresh and return to matchmaking".

This also aligns with server logs that clients leave right after "Match starting..." because shared app intentionally leaves room before redirect, then destination kaiju join fails and does not reattach.

## Likely Request Details (Most Probable)

Based on code + Colyseus client behavior + log payload shape:

* Request origin: public/kaiju/app.js reconnect path
* Trigger function: reconnectActiveMatch()
* Client API call: client.join("match", selectedRoomId, { playerName, playerRole: "kaiju", reconnectToken })
* Likely destination endpoint: Colyseus matchmake join endpoint (HTTP), not custom /api/matches route
  * Typical path family: /matchmake/join/<roomName> or joinById equivalent handler in transport/router
* HTTP method: POST
* Likely malformed body content: roomId serialized as JSON string literal (example: ""PY3mJEhpo"") rather than object payload

Confidence is high on origin/callsite and fallback behavior, medium on exact final URL path string because that path is internal to Colyseus client transport routing.

## Ranked Hypotheses

1. Kaiju reconnect uses invalid Colyseus client join signature, producing malformed matchmake POST payload (most likely root cause)

* Evidence:
  * public/kaiju/app.js:1220-1224
  * public/kaiju/app.js:1657-1661
  * public/common/colyseus-client.js:109-116 (contrasting correct helper)
* Explains:
  * JSON parse/body anomaly with string payload
  * immediate reconnect failure after match start navigation
  * user bounce back to matchmaking (routeUpstream)

2. Start Match navigation race/leave behavior reveals latent reconnect bug (contributing factor)

* Evidence:
  * public/common/match-room-app.js:207-216
* Explains:
  * "clients leave right after Match starting..." in logs
* Not sufficient alone to explain malformed JSON body without reconnect call bug.

3. Form submit default action causes refresh (unlikely)

* Evidence against:
  * start buttons are type=button in both pages
  * no submit handlers around start actions in target files
  * public/match-room.html:255
  * public/commander/index.html:29

## Most Likely Root Cause

The Start Match click itself is not causing a native form refresh. Instead, Start Match triggers intentional navigation from shared pre-match to role-specific pages. On kaiju page load, reconnectActiveMatch() performs a direct Colyseus join call with an incorrect/unsafe argument pattern:

* client.join("match", selectedRoomId, options)

This likely generates a malformed HTTP matchmake request body (string-like roomId payload), matching the observed server parse error body '""PY3mJEhpo""'. The reconnect failure then triggers routeUpstream(), sending users back to /match-room.html or /lobby.html, which appears as a refresh-to-matchmaking regression.

## Clarifying Unknowns

* Exact raw network path emitted by this Colyseus client build for that join() call in-browser (requires devtools capture to pin exact URL).
* Whether all browsers/client versions reproduce identical malformed payload shape or only specific runtime combinations.

## Recommended Next Validation Step

Capture browser network logs during Start Match on kaiju client and confirm the failing request payload and URL from reconnectActiveMatch(), then switch kaiju reconnect path to the same helper used by commander (joinMatchById via REST reservation + consumeSeatReservation) or to explicit joinById(roomId, options) per Colyseus SDK contract.
