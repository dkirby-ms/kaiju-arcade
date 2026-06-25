<!-- markdownlint-disable-file -->
---
title: Unified Matchmaking Lobby Research
description: Research on the current matchmaking and lobby flow mismatch and the recommended single global lobby architecture.
author: GitHub Copilot
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - matchmaking
  - lobby
  - colyseus
  - role selection
estimated_reading_time: 8
---

## Task Research: Unified Matchmaking Lobby

Research the current matchmaking flow in kaiju-arcade, identify why players creating a match from the initial lobby are redirected into a commander-specific secondary lobby, and define the recommended architecture for a single global matchmaking lobby that remains role-agnostic until players enter an individual pre-match room.

## Task Implementation Requests

* Document the current frontend and server control flow for matchmaking and lobby transitions
* Identify the exact mismatch causing a second commander-only lobby/create step
* Evaluate implementation approaches for one global matchmaking lobby with role selection inside each match room
* Recommend one approach with concrete implementation impact

## Scope and Success Criteria

* Scope: Matchmaking entry, room creation and join paths, lobby page flow, room metadata/state transitions, and role selection timing. Excludes detailed combat and gameplay behavior except where it constrains lobby design.
* Assumptions:
  * The existing app uses Colyseus-backed rooms plus browser-based static lobby pages.
  * The desired UX is one global lobby before entering an individual match room.
  * Role selection should happen inside a per-match room, not at the global lobby level.
* Success Criteria:
  * The current flow is traced with file-level evidence.
  * The root mismatch is explained in concrete terms.
  * Viable alternatives are evaluated.
  * One recommended architecture is selected with implementation guidance.

## Outline

* Gather current code flow evidence from frontend entry pages, shared client helpers, and server room logic
* Consolidate the current mismatch and architecture constraints
* Evaluate alternatives for a unified global lobby and pre-match room role selection
* Select one implementation approach and describe impact

## Potential Next Research

* Define the in-room role-claim and readiness protocol needed for strict role-agnostic room entry
  * Reasoning: Current role assignment happens during join, which conflicts with the requested pre-match experience.
  * Reference: src/game/MatchRoom.ts

* Confirm whether GET /api/matches can safely expose room metadata without breaking any existing consumers
  * Reasoning: The shared lobby already renders metadata fields that the REST listing currently drops.
  * Reference: src/index.ts

## Research Executed

### File Analysis

* public/index.html
  * Stores player name and redirects into the shared lobby flow
  * Evidence: public/index.html:134-140

* public/lobby.html
  * Implements the global lobby UI, room list, room creation, role-specific join buttons, and redirect into commander or kaiju pages
  * Evidence: public/lobby.html:221-223, public/lobby.html:319-360, public/lobby.html:366-407

* public/commander/index.html
  * Still renders a standalone Create Match control after the shared lobby has already created a room
  * Evidence: public/commander/index.html:28

* public/commander/app.js
  * Still contains match creation and room-entry logic, including a fallback auto-create path and a visible Create Match action
  * Evidence: public/commander/app.js:643-687, public/commander/app.js:689-770, public/commander/app.js:795-807, public/commander/app.js:875

* public/kaiju/app.js
  * Still contains direct room join behavior and acts as a second room-entry surface instead of an active-match-only client
  * Evidence: public/kaiju/app.js:1089-1236

* public/common/session-manager.js
  * Persists player name, selected role, currentMatchId, reconnection token, and pending seat reservation across page transitions
  * Evidence: public/common/session-manager.js:68-173

* src/index.ts
  * Serves the shared lobby page, exposes match creation and join reservation endpoints, and lists matches via matchMaker.query(...)
  * Evidence: src/index.ts:47, src/index.ts:74-207

* src/game/MatchRoom.ts
  * Assigns commander or kaiju roles during onJoin, transitions room state from WAITING to LOBBY to ACTIVE, handles commander.start, and publishes room metadata used for discovery
  * Evidence: src/game/MatchRoom.ts:176-247, src/game/MatchRoom.ts:388-415, src/game/MatchRoom.ts:780-842

* src/schema/MatchSchema.ts
  * Defines the room phase model through metadata.state with WAITING, LOBBY, ACTIVE, and ENDED
  * Evidence: src/schema/MatchSchema.ts:221-240

### Code Search Results

* Search target: redirectToRoleClient
  * Match in public/lobby.html shows the global lobby hard-codes the next page to /commander/index.html or /kaiju/index.html before the player is inside a shared pre-match room.

* Search target: createAndJoinAsCommander
  * Match in public/commander/app.js shows the commander experience still owns room creation logic even after the shared lobby path was introduced.

* Search target: matchMaker.create("match"
  * Match in src/index.ts shows REST-backed match creation now happens centrally through the server, while the commander client still triggers it indirectly through its own UI flow.

* Search target: metadata.state
  * Matches in MatchSchema and MatchRoom confirm the server already models a distinct LOBBY phase suitable for a pre-match room.

### External Research

* None required
  * Findings were fully derived from the local codebase and repository memory.

### Project Conventions

* Standards referenced: markdown.instructions.md, writing-style.instructions.md
* Instructions followed: Task Researcher mode constraints, markdownlint-disable-file requirement

## Key Discoveries

### Project Structure

The current application has three user-facing matchmaking layers:

* An identity entry page at public/index.html
* A shared global matchmaking lobby at public/lobby.html
* Two role-specific clients at public/commander/index.html and public/kaiju/index.html

The intended layering is already visible in the frontend structure, but responsibilities are split incorrectly. The shared lobby owns discovery and initial room reservation, while the role-specific pages still own room-entry and pre-match behavior. That overlap is the source of the user-facing mismatch.

### Implementation Patterns

The current matchmaking flow uses seat reservations and session storage handoff rather than a single persistent SPA route.

Observed pattern:

* The shared lobby calls REST endpoints to create or reserve a seat in a Colyseus room.
* The resulting seat reservation is stored in session storage as pendingSeatReservation.
* The browser then redirects into a role-specific page.
* That page consumes the reservation and binds room handlers.

This handoff pattern is viable, but the global lobby makes the role decision too early and the commander page still exposes match creation. The server side is less of a problem: MatchRoom already exposes room phases, room metadata, and start controls that fit a pre-match room model.

### Complete Examples

```text
Current flow:

public/index.html
  -> player name captured
  -> public/lobby.html
  -> POST /api/matches or POST /api/matches/:roomId/join
  -> sessionStorage: currentMatchId + pendingSeatReservation + role
  -> /commander/index.html or /kaiju/index.html
  -> consumeSeatReservation(...)

Requested flow:

public/index.html
  -> public/lobby.html
  -> create or join specific match room without committing to commander or kaiju
  -> shared pre-match room page
  -> choose role inside that room
  -> ready up
  -> commander starts once requirements are satisfied
  -> route into commander or kaiju active-match page only when phase becomes ACTIVE
```

### API and Schema Documentation

Current API and schema behavior relevant to the redesign:

* POST /api/matches in src/index.ts:74-110 creates a new match room and returns a seat reservation.
* GET /api/matches in src/index.ts:113-133 returns a basic room list, but it currently omits metadata that the shared lobby already wants to display.
* POST /api/matches/:roomId/join in src/index.ts:172-207 accepts playerName plus role or playerRole, which means role is currently chosen before room attachment is complete.
* MatchSchema metadata.state in src/schema/MatchSchema.ts:232 is the canonical phase field, with values WAITING, LOBBY, ACTIVE, and ENDED.
* MatchRoom transitions to LOBBY in src/game/MatchRoom.ts:402-415 and to ACTIVE in src/game/MatchRoom.ts:780-787.
* MatchRoom broadcasts match.phase in src/game/MatchRoom.ts:811-824 and match.start in src/game/MatchRoom.ts:827-842.
* MatchRoom listing metadata includes commanderTaken and kaijuOpenSlots in src/game/MatchRoom.ts:795-807.

### Configuration Examples

```text
Current REST listing payload shape from src/index.ts:

{
  roomId,
  name,
  clients,
  maxClients,
  locked
}

Current lobby UI expectations from public/lobby.html:

room.metadata.state
room.metadata.gameMode
room.metadata.cityName
derived commander availability
derived kaiju open slots

Current room listing metadata written by MatchRoom:

{
  status,
  playerCount,
  maxPlayers,
  commanderName,
  commanderTaken,
  kaijuOpenSlots
}
```

## Technical Scenarios

### Single Global Lobby With Per-Match Role Selection

The verified problem is not that the server lacks a lobby lifecycle. The problem is that the frontend transitions out of the shared lobby too early and into role-specific pages that still behave like matchmaking and pre-match surfaces.

Evidence summary:

* public/lobby.html creates or joins a room and immediately redirects by role.
* public/commander/app.js still creates matches and can fall back to auto-creating one if no currentMatchId is present.
* public/kaiju/app.js still behaves as a join client instead of an active-match-only client.
* MatchRoom already models WAITING, LOBBY, and ACTIVE and already exposes the messages and metadata needed to support a real pre-match room.

This means the recommended architecture is to preserve the single global lobby, then add a shared room-level pre-match page before entering either role-specific gameplay client.

**Requirements:**

* One global matchmaking lobby
* No commander-specific intermediate lobby
* Role selection occurs inside a specific match room
* Match starts only when required players are ready

**Preferred Approach:**

* Add a shared pre-match room page between public/lobby.html and the commander or kaiju gameplay pages.
* Keep public/lobby.html focused on room discovery and creation only.
* Move role selection and readiness into the match room itself.
* Enter public/commander/index.html or public/kaiju/index.html only after the room reaches ACTIVE and the player's role has been finalized.

```text
Recommended browser flow:

public/index.html
  -> public/lobby.html
  -> reserve seat in specific match room
  -> public/match-room.html (new shared pre-match page)
     -> render roster and room state
     -> choose commander or kaiju inside room
     -> mark ready
     -> start when ready requirements are satisfied
  -> public/commander/index.html or public/kaiju/index.html when ACTIVE
```

**Implementation Details:**

Implementation implications derived from the current codebase:

* The shared lobby should stop storing role before redirecting. It should only store the target room and the pending reservation needed to consume that seat.
* The redirect function in public/lobby.html should target a shared pre-match page instead of commander or kaiju pages.
* The visible Create Match control and createAndJoinAsCommander() path in public/commander/app.js should be removed or reduced to a reconnect-only path.
* The direct join UI in public/kaiju/app.js should be removed or reduced to a reconnect-only path.
* GET /api/matches should expose metadata that matches the shared lobby UI needs, or the lobby should move to a true Colyseus lobby-room subscription.
* MatchRoom currently assigns roles during onJoin. To fully satisfy the requested flow, MatchRoom likely needs a new in-room role-claim message rather than relying only on join-time role assignment.
* The current commander.start gate already requires the LOBBY phase in src/game/MatchRoom.ts:388-399, which is a strong fit for a ready-and-start model once readiness state is added.

```text
Server behaviors that can be reused:

* metadata.state lifecycle: WAITING -> LOBBY -> ACTIVE
* room discovery metadata: commanderTaken, kaijuOpenSlots
* start transition: commander.start -> startMatch()
* room broadcasts: match.phase, match.start

Server behaviors likely needed:

* role.claim or seat.claim message
* ready.toggle message
* readiness state in schema or room-managed session state
* optional all-ready validation before startMatch()
```

#### Considered Alternatives

Alternative 1: Keep role-specific pages after the shared lobby, but strip duplicate match-creation and join logic from them.

* Benefit: Smaller incremental cleanup.
* Rejection reason: It still leaves role choice outside the specific room unless the routing model becomes awkward. That does not fully meet the requested role-agnostic-before-room behavior.

Alternative 2: Add a shared pre-match room page, then route to role-specific gameplay pages only after ACTIVE.

* Benefit: Best fit with the existing WAITING, LOBBY, ACTIVE lifecycle and lowest risk to the specialized gameplay clients.
* Selected because it directly matches the requested UX while reusing the current server design.

Alternative 3: Collapse commander and kaiju into one fully shared client.

* Benefit: Clean long-term UI model.
* Rejection reason: Too invasive for the current codebase. It would merge two specialized apps and carry the highest regression risk.
