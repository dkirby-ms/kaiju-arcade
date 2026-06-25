---
title: "Chaos Reconnect Test Scenarios"
description: "Unit-level chaos test scenarios for drain mode, reconnect handling, and capacity enforcement in MatchRoom."
---

## Overview

These scenarios validate the resilience contract for `MatchRoom` under adverse conditions:
drain mode, invalid reconnect tokens, and capacity overflow.
All scenarios run in-process using Jest with the Colyseus framework mocked.

Test file: `src/game/MatchRoom.test.ts` — `describe("MatchRoom drain and capacity resilience")`

## Scenario Matrix

| Scenario | Condition | Expected Outcome |
|---|---|---|
| New join during drain | `isDraining() === true`, no reconnect token | Client receives close code `1013`; not added to session map |
| Reconnect during drain | `isDraining() === true`, valid reconnect token provided | Reconnect succeeds; slot reclaimed |
| Room at capacity — kaiju overflow | All 4 kaiju slots taken | Client receives close code `1008`, "No kaiju slot available" |
| Room at capacity — commander overflow | Commander slot taken | Client receives close code `1008`, "Commander slot already taken" |
| Invalid/expired reconnect token | Non-matching token string | Player added as unassigned; no slot hijack; no crash |

## Scenario Details

### Scenario 1 — New join during drain (non-reconnect)

**Purpose:** Verify that the drain guard rejects new players during drain while not crashing.

**Setup:**

1. Create and initialize `MatchRoom`.
2. Call `startDrain(30_000)` to put the module into drain state.
3. Attempt `onJoin` with a new client (no `reconnectToken` in options).

**Assertions:**

- Client `leave` callback is called with code `1013` and a drain message.
- Client session ID is absent from `playerSessions`.

**Reset:** `resetDrainState()` is called in `afterEach`.

### Scenario 2 — Reconnect during drain

**Purpose:** Verify that players with valid reconnect tokens can resume their session even when the
server is draining.

**Setup:**

1. Create room; join commander and one kaiju player.
2. Kaiju player leaves abruptly (`code 1006`); grace window opens; reconnect token stored.
3. Call `startDrain(30_000)`.
4. New client attempts `onJoin` with the stored reconnect token.

**Assertions:**

- Kaiju leviathan slot `playerId` is updated to the new session ID.
- Slot `isAI` remains `false`.

### Scenario 3 — Rejects join when room is at capacity

**Purpose:** Verify application-level capacity enforcement for both roles.

**Setup:**

1. Create room; join 1 commander + 4 kaiju (fills all 5 slots, `maxClients = 5`).
2. Attempt two additional joins: one as `KAIJU`, one as `COMMANDER`.

**Assertions:**

- `playerSessions.size` stays at `5` after each overflow attempt.
- Kaiju overflow client: `leave(1008, "No kaiju slot available")`.
- Commander overflow client: `leave(1008, "Commander slot already taken")`.

### Scenario 4 — Expired/missing reconnect token falls back to new join

**Purpose:** Verify that an invalid or expired reconnect token does not crash the server and does
not allow slot hijacking.

**Setup:**

1. Create room; join a commander player.
2. Attempt `onJoin` with `reconnectToken: "invalid-token-xyz"`.

**Assertions:**

- No exception thrown.
- Client is added to `playerSessions` as an unassigned participant.
- No leviathan slot has `playerId` set to the new session.
- Commander `playerId` is unchanged.

## Running the Tests

```bash
cd /home/dakir/kaiju-arcade
npm test -- --testPathPattern=MatchRoom --runInBand
```

## State Isolation

Each test resets drain state via `resetDrainState()` in `beforeEach` and `afterEach`.
Fake timers (`jest.useFakeTimers()`) prevent real-time reconnect grace windows from interfering
with test execution.

## Extending These Scenarios

When adding new resilience tests:

- Call `resetDrainState()` in the test's own cleanup or rely on `afterEach`.
- Use `jest.advanceTimersByTime(ms)` to fast-forward grace window expiry.
- Mirror the `as unknown as never` client casting pattern used throughout `MatchRoom.test.ts`.
- Keep each test focused on a single failure mode.
