---
title: Matchmaking Flow Research
description: Research findings for the current matchmaking and lobby flow in kaiju-arcade
author: GitHub Copilot
ms.date: 2026-06-25
ms.topic: reference
---

## Research Scope

Questions investigated:

1. What is the current user flow from initial entry pages through lobby pages into a match room?
2. Which frontend files/pages decide the transition from the initial lobby into commander/kaiju specific experiences?
3. Which server endpoints or Colyseus room handlers create/join matches, and how are roles assigned?
4. Where exactly is the mismatch that causes a player who creates a match from the initial lobby to land in a commander-specific lobby that can create another match?
5. What existing room state, metadata, or messages already support a unified pre-match room?

## Executive Summary

The current architecture has two overlapping matchmaking flows.

The new shared flow is:

* `public/index.html` captures player identity and redirects to `public/lobby.html`
* `public/lobby.html` lists matches, creates or joins a match reservation, stores that reservation in session storage, and then redirects to either `public/commander/index.html` or `public/kaiju/index.html`

The older role-specific flow still exists inside the commander and kaiju clients:

* `public/commander/app.js` can still create a match itself and auto-create one when no `currentMatchId` is present
* `public/kaiju/app.js` can still list rooms and join directly from a room picker

The user-visible mismatch is on the commander path. A player who creates a match in `public/lobby.html` is redirected into `public/commander/index.html`, which still exposes a standalone `Create Match` control and fallback logic that can create a second match. The result is that the creator lands in a commander-specific pre-match screen instead of a unified shared pre-match room.

## Current User Flow

### Entry to Shared Lobby

Evidence:

* `public/index.html:134` stores the player name with `window.KaijuSession.setPlayerName(...)`
* `public/index.html:140` redirects to `/lobby.html`
* `public/common/session-manager.js:68` defines `setPlayerName(...)`
* `public/common/session-manager.js:173` defines `getEntrySession()`

Current flow:

1. User opens `/` which serves `public/index.html` via `src/index.ts:43`
2. User enters a player name
3. The name is stored in session storage
4. The browser redirects to `/lobby.html`

### Shared Lobby to Role-Specific Client

Evidence:

* `src/index.ts:47` serves `/lobby` as `public/lobby.html`
* `public/lobby.html:366` defines `joinMatch(roomId, role)`
* `public/lobby.html:377` uses `window.KaijuColyseusClient.joinMatchReservationViaRest(...)`
* `public/lobby.html:391` defines `createMatch()`
* `public/lobby.html:402` uses `window.KaijuColyseusClient.createMatchReservationViaRest(...)`
* `public/lobby.html:221` defines `redirectToRoleClient(role)`
* `public/lobby.html:382` redirects after join
* `public/lobby.html:407` redirects after create
* `public/common/session-manager.js:82` defines `setRole(...)`
* `public/common/session-manager.js:96` defines `setCurrentMatchId(...)`
* `public/common/session-manager.js:131` defines `setPendingSeatReservation(...)`

Current flow:

1. `public/lobby.html` shows a shared match list and a `Create Match` button
2. `Create Match` always uses role `commander`
3. `Join Match` uses the selected role button, either `commander` or `kaiju`
4. The lobby stores three pieces of handoff state in session storage:
   * role
   * currentMatchId
   * pending seat reservation
5. The lobby leaves its own lobby connection and redirects to a role-specific page:
   * commander -> `/commander/index.html`
   * kaiju -> `/kaiju/index.html`

### Commander Client Join Flow

Evidence:

* `public/commander/index.html:28` renders a `Create Match` button inside the commander console
* `public/commander/app.js:643` defines `createAndJoinAsCommander()`
* `public/commander/app.js:689` defines `reconnectOrJoinFromSession()`
* `public/commander/app.js:714` consumes a pending seat reservation
* `public/commander/app.js:736` auto-creates a match when `currentMatchId` is missing
* `public/commander/app.js:745` rejoins by `currentMatchId`
* `public/commander/app.js:795` wires the visible `Create Match` button
* `public/commander/app.js:875` runs `reconnectOrJoinFromSession()` on startup

Current flow:

1. Commander page loads
2. It first tries to consume `pendingSeatReservation` for `currentMatchId`
3. If no pending reservation is usable but `currentMatchId` exists, it rejoins that room
4. If no `currentMatchId` exists, it creates a brand new match from the commander page
5. Regardless of how the room was joined, the commander page still shows its own `Create Match` UI

### Kaiju Client Join Flow

Evidence:

* `public/kaiju/index.html:26` renders a room picker and `Join Match` button
* `public/kaiju/app.js:1065` defines `refreshMatches()`
* `public/kaiju/app.js:1089` defines `joinMatch()`
* `public/kaiju/app.js:1110` consumes a pending seat reservation when one exists
* `public/kaiju/app.js:1197` directly calls `client.join("match", selectedRoomId, ...)`

Current flow:

1. Kaiju page loads
2. It can consume a pending reservation passed from `public/lobby.html`
3. It also still has its own room picker and direct join flow
4. Unlike commander, it does not expose a second match creation button

## Frontend Files That Decide the Transition

The transition from the shared lobby into role-specific experiences is decided by the following files.

### Entry and Session Handoff

* `public/index.html:134-140` captures player name and redirects to `/lobby.html`
* `public/common/session-manager.js:68-173` persists player name, role, current match ID, reconnection token, and pending seat reservation

### Shared Lobby Routing

* `public/lobby.html:221-223` maps `commander` to `/commander/index.html` and `kaiju` to `/kaiju/index.html`
* `public/lobby.html:366-382` joins an existing match, stores pending reservation, and redirects
* `public/lobby.html:391-407` creates a match, stores pending reservation, and redirects

### Role-Specific Client Startup

* `public/commander/app.js:689-770` decides whether to consume a pending reservation, rejoin an existing room, or create a brand new one
* `public/kaiju/app.js:1089-1236` decides whether to consume a pending reservation or directly join a selected room

## Server Endpoints and Room Handlers

### HTTP Endpoints

Evidence from `src/index.ts`:

* `src/index.ts:74-110` `POST /api/matches` creates a seat reservation with `matchMaker.create("match", options)`
* `src/index.ts:113-133` `GET /api/matches` lists active matches with `matchMaker.query(...)`
* `src/index.ts:136-169` `POST /api/matches/:roomId/kaiju-join` reserves a kaiju seat with `matchMaker.joinById(roomId, options)`
* `src/index.ts:172-207` `POST /api/matches/:roomId/join` reserves a seat using explicit role-aware options with `matchMaker.joinById(roomId, options)`
* `src/index.ts:71` registers `gameServer.define("match", MatchRoom).enableRealtimeListing()`

### Role Assignment in MatchRoom

Evidence from `src/game/MatchRoom.ts`:

* `src/game/MatchRoom.ts:176-197` reads `options.role` or `options.playerRole`, normalizes them, and computes `assignCommander` or `assignKaiju`
* `src/game/MatchRoom.ts:220-228` assigns commander state when commander is selected
* `src/game/MatchRoom.ts:230-247` claims or reclaims a kaiju slot when kaiju is selected
* `src/game/MatchRoom.ts:196-197` preserves the implicit fallback: first joiner becomes commander, later joiners become kaiju when no explicit role is provided

Current role rules:

* Explicit commander request is allowed only if commander slot is open
* Explicit kaiju request claims a kaiju slot
* Invalid explicit roles are rejected
* If no role is provided, the first player becomes commander and later players become kaiju

## Exact Mismatch Causing the Duplicate Commander Lobby

The mismatch is a frontend architecture mismatch, not a server-side role assignment bug.

### What the Shared Lobby Assumes

`public/lobby.html` assumes that after creating or reserving a seat, the next page is a role-specific gameplay client that will only attach to the already-created room.

Evidence:

* `public/lobby.html:402-407` creates the reservation, stores it, and immediately redirects to `/commander/index.html`
* `public/lobby.html:377-382` does the same for joining an existing room

### What the Commander Page Still Does

`public/commander/index.html` and `public/commander/app.js` still behave like a standalone match-creation surface.

Evidence:

* `public/commander/index.html:28` shows a `Create Match` button in the session panel
* `public/commander/app.js:643-687` defines `createAndJoinAsCommander()` which calls `POST /api/matches` and consumes the new reservation
* `public/commander/app.js:795-807` wires the visible button so the commander can create another match manually
* `public/commander/app.js:736` falls back to `createAndJoinAsCommander()` when `currentMatchId` is absent

### Resulting User Experience

A player who creates a match from `public/lobby.html` lands in the commander page, but that page is still a commander-specific pre-match screen with its own match creation path. That is why the user appears to move from the initial shared lobby into another commander-only lobby that can create another match.

### Secondary Mismatch That Matters for Redesign

The shared lobby expects room metadata such as state, commander occupancy, kaiju slots, and city name, but the REST list endpoint does not currently return any of that metadata.

Evidence:

* `public/lobby.html:319-327` renders `room.metadata.state`, `room.metadata.cityName`, `commanderAvailable`, and `kaijuOpenSlots`
* `src/game/MatchRoom.ts:795-807` does publish `commanderTaken` and `kaijuOpenSlots` via room metadata
* `src/index.ts:113-133` maps the query result to only `roomId`, `name`, `clients`, `maxClients`, and `locked`, dropping `metadata`

Implication:

* The server already computes useful lobby metadata
* The current REST lobby discovery path does not expose it
* Any redesign that depends on slot-aware or phase-aware shared lobby UI needs either true Colyseus lobby updates or a richer REST payload

## Existing Support for a Unified Pre-Match Room

The codebase already contains most of the server-side primitives needed for a unified pre-match room.

### Match Phase State

Evidence:

* `src/schema/MatchSchema.ts:232` defines `metadata.state` with `WAITING`, `LOBBY`, `ACTIVE`, `ENDED`
* `src/game/MatchRoom.ts:125` initializes the room in `WAITING`
* `src/game/MatchRoom.ts:402-415` transitions `WAITING` -> `LOBBY` when commander and at least one non-AI kaiju are present
* `src/game/MatchRoom.ts:388-399` lets the commander send `commander.start` to enter `ACTIVE`
* `src/game/MatchRoom.ts:780-787` performs the `ACTIVE` transition

This is already the server-side backbone of a unified pre-match room.

### Room Metadata for Lobby Discovery

Evidence:

* `src/game/MatchRoom.ts:113` wraps `setMetadata(...)`
* `src/game/MatchRoom.ts:126-131` sets initial room listing metadata
* `src/game/MatchRoom.ts:795-807` refreshes metadata with:
  * `status`
  * `playerCount`
  * `maxPlayers`
  * `commanderName`
  * `commanderTaken`
  * `kaijuOpenSlots`

This is already enough to drive slot-aware shared lobby controls if surfaced consistently to clients.

### Shared Room State Suitable for a Lobby Roster

Evidence:

* `src/schema/MatchSchema.ts:79-82` each leviathan tracks `playerId` and `playerName`
* `src/schema/MatchSchema.ts:73` each leviathan tracks whether it is AI-controlled
* `src/schema/MatchSchema.ts:256-259` commander state tracks `playerId` and `playerName`
* `public/commander/app.js:375-397` already renders a lobby roster from commander plus non-AI leviathans

This means a shared pre-match room can render a roster without inventing new server state.

### Existing Messages Already Useful for a Unified Lobby

Evidence:

* `src/game/MatchRoom.ts:811-824` broadcasts `match.phase`
* `src/game/MatchRoom.ts:827-842` broadcasts `match.start`
* `src/messages/protocol.ts:128` defines `match.start`
* `src/messages/protocol.ts` contains no dedicated `match.phase` type declaration, but both clients already consume the event from room broadcasts
* `public/commander/app.js:603-631` reacts to `match.phase` and `match.start`
* `public/kaiju/app.js:1141-1158` and `public/kaiju/app.js:1223-1240` react to `match.phase` and `match.start`

There is already a clear event contract for pre-match to active-match transitions.

### Existing Handoff and Recovery Support

Evidence:

* `public/common/session-manager.js:96-169` stores `currentMatchId`, `reconnectionToken`, and `pendingSeatReservation`
* `src/messages/protocol.ts:141` defines `kaiju.reconnect.token`
* `public/commander/app.js:689-770` and `public/kaiju/app.js:1089-1236` already consume session handoff state

This storage model can support a shared pre-match page that later hands off to in-match clients, or a single room UI that changes phase in place.

## Architecture Constraints for a Redesign

### Constraint 1

The current role-specific pages are both doing two jobs:

* pre-match joining/creation
* in-match gameplay or command UI

A unified pre-match room should separate those responsibilities or explicitly gate which controls remain visible before a room is joined.

### Constraint 2

The lobby discovery implementation is REST-poll based, not a real Colyseus `LobbyRoom` client, even though realtime listing is enabled server-side.

Evidence:

* `public/common/colyseus-client.js:143` polls `GET /api/matches`
* `public/common/colyseus-client.js:198-201` explicitly avoids `/matchmake/joinOrCreate/lobby`
* `src/index.ts:71` still enables realtime listing on the room definition

This means the current shared lobby is not actually using the richer realtime listing features directly.

### Constraint 3

The REST list payload currently omits room metadata that the lobby UI expects.

This must be addressed before a shared lobby can reliably show phase, city, commander occupancy, or kaiju slot availability.

### Constraint 4

The commander page has strong assumptions about owning room creation.

Evidence:

* visible `Create Match` UI in `public/commander/index.html:28`
* startup fallback to auto-create in `public/commander/app.js:736`

Any redesign must either remove that responsibility from the commander client or make the commander client strictly attach-only when entered from the shared lobby.

## Open Gaps

The main research questions are answered. Remaining uncertainty is limited to design intent, not code location.

Open gaps:

* There is no dedicated unified pre-match page after room reservation yet. The intended future target could be a revised `public/lobby.html`, a new shared room page, or phase-gated commander/kaiju pages.
* `match.phase` is implemented in `MatchRoom` and consumed by clients, but it is not declared in `src/messages/protocol.ts`. That is a contract documentation gap rather than a flow blocker.

## Recommended Next Research

* Compare current tests in `src/game/MatchRoom.test.ts` against the desired unified pre-match behavior to identify which expectations already exist and which are missing.
* Trace whether any non-browser consumers depend on the current `GET /api/matches` minimal payload before widening it to include metadata.
* Decide whether the redesign should keep separate commander and kaiju pages after room join, or unify pre-match and in-match phases within one shared room page.
* Verify whether the direct `client.join("match", selectedRoomId, ...)` usage in `public/kaiju/app.js:1197` matches the intended Colyseus client API shape in this repo, since most newer flows use reservation consumption instead.

## Status

Research status: Complete
