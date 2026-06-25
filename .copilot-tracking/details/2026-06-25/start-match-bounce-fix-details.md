<!-- markdownlint-disable-file -->
# Implementation Details: Start Match Bounce Fix

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/start-match-bounce-root-cause-research.md, public/kaiju/app.js (lines 1198–1228), public/common/colyseus-client.js (lines 20, 215), public/commander/app.js (lines 700–709)

---

## Implementation Phase 1: Fix kaiju reconnect call site

<!-- parallelizable: false -->

### Step 1.1: Replace incorrect join call and client construction

**What and why:**

The `reconnectActiveMatch()` function in `public/kaiju/app.js` currently:

1. Constructs a Colyseus client directly via `new window.Colyseus.Client(endpoint)`.
2. Calls `client.join("match", selectedRoomId, options)` — a three-argument form that does not exist in Colyseus 0.16.x. In 0.16.x the signature is `client.join(roomName, options)`. The room ID string (`selectedRoomId`) is therefore received as `options`, and the actual options object is silently dropped. Colyseus serialises the bare string as the HTTP/WS body, producing the malformed JSON (`"PY3mJEhpo"`) that Express rejects with `SyntaxError` because its `json()` middleware runs in strict mode (objects/arrays only).

**Current code (lines ~1198–1228 of public/kaiju/app.js):**

```javascript
async function reconnectActiveMatch() {
  const selectedRoomId = roomIdEl.value;
  if (!selectedRoomId) {
    routeUpstream(true);
    return;
  }

  updateConnectionState("CONNECTING", "alert");

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const endpoint = `${wsProtocol}//${window.location.host}`;
  const client = new window.Colyseus.Client(endpoint);

  const playerName = (pilotNameEl.value || "Kaiju Pilot").trim();
  const reconnectToken =
    (window.KaijuSession && window.KaijuSession.getReconnectionToken()) || readStoredReconnectToken();

  if (!reconnectToken) {
    routeUpstream(false);
    return;
  }

  const room = await client.join("match", selectedRoomId, {
    playerName: playerName,
    playerRole: "kaiju",
    reconnectToken,
  });
  bindRoom(room);
}
```

**Replacement code:**

```javascript
async function reconnectActiveMatch() {
  const selectedRoomId = roomIdEl.value;
  if (!selectedRoomId) {
    routeUpstream(true);
    return;
  }

  if (!window.KaijuColyseusClient) {
    throw new Error("KaijuColyseusClient helper is not loaded.");
  }

  updateConnectionState("CONNECTING", "alert");

  const client = window.KaijuColyseusClient.createClient();

  const playerName = (pilotNameEl.value || "Kaiju Pilot").trim();
  const reconnectToken =
    (window.KaijuSession && window.KaijuSession.getReconnectionToken()) || readStoredReconnectToken();

  if (!reconnectToken) {
    routeUpstream(false);
    return;
  }

  const room = await window.KaijuColyseusClient.joinMatchById(client, selectedRoomId, {
    playerName: playerName,
    playerRole: "kaiju",
    reconnectToken,
  });
  bindRoom(room);
}
```

**Key changes:**
* Guard clause for `window.KaijuColyseusClient` availability added at top of function.
* `new window.Colyseus.Client(endpoint)` → `window.KaijuColyseusClient.createClient()` (removes duplicate endpoint construction logic).
* `client.join("match", selectedRoomId, options)` → `window.KaijuColyseusClient.joinMatchById(client, selectedRoomId, options)`.
  * `joinMatchById` calls `joinMatchViaRest` → `POST /api/matches/{roomId}/kaiju-join` with proper JSON object body → `consumeSeatReservation`.
  * This is the same path commander uses (lines 703–709 of public/commander/app.js).

Files:
* public/kaiju/app.js — Replace `reconnectActiveMatch()` body as shown above

Discrepancy references:
* Addresses DD-01 (direct join call bypasses shared helper)

Success criteria:
* No `SyntaxError` in server logs when kaiju reconnect fires after Start Match
* `bindRoom(room)` is reached and kaiju enters gameplay HUD

Context references:
* public/kaiju/app.js (Lines 1198–1228) — current broken reconnect function
* public/common/colyseus-client.js (Lines 215–220) — `joinMatchById` implementation
* public/common/colyseus-client.js (Lines 20–23) — `createClient` implementation
* public/commander/app.js (Lines 700–709) — reference implementation of correct pattern

Dependencies:
* `colyseus-client.js` loaded before `app.js` in public/kaiju/index.html (existing, no change needed)

---

### Step 1.2: Validate `window.KaijuColyseusClient` guard

The guard added in Step 1.1 (`if (!window.KaijuColyseusClient) { throw new Error(...); }`) surfaces a misconfiguration loudly rather than silently falling through to `routeUpstream`. The existing `try/catch` in `initialize()` will catch this throw and show a feed error before routing upstream. No additional changes are required beyond what Step 1.1 introduces.

Files:
* public/kaiju/app.js — guard is part of Step 1.1 replacement block

Success criteria:
* If `colyseus-client.js` fails to load, kaiju app displays `INIT ERROR: KaijuColyseusClient helper is not loaded.` in the feed rather than a silent bounce

Dependencies:
* Step 1.1 completion

---

## Implementation Phase 2: Validation

<!-- parallelizable: false -->

### Step 2.1: Run full project validation

Validation commands:
* `npm run lint` — ESLint across src/ and public/; should exit 0
* `npm test` — Jest suite; should exit 0

### Step 2.2: Fix minor validation issues

Iterate on lint errors or test failures caused by the edit. The change is a two-line diff inside a JS function; no new symbols, types, or exports are introduced so failures are expected to be cosmetic (whitespace, quote style).

### Step 2.3: Report blocking issues

If tests fail due to schema or server-side contract changes unrelated to this fix, document the issue and surface to the user rather than attempting large-scale fixes inline.

---

## Dependencies

* Colyseus 0.16.x browser client (CDN) — already in place
* public/common/colyseus-client.js — already loaded before app.js

## Success Criteria

* `npm run lint` exits 0
* `npm test` exits 0
* No `SyntaxError` in server logs during kaiju reconnect after Start Match
* Kaiju enters gameplay HUD after Start Match without routing to lobby/matchmaking
