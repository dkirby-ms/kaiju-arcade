---
title: Unified Lobby Alternatives Research
description: Research assessment of implementation alternatives for resolving the matchmaking and lobby flow mismatch in Kaiju Arcade
author: GitHub Copilot
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - matchmaking
  - lobby
  - colyseus
  - architecture
  - research
estimated_reading_time: 8
---

## Scope

Status: Complete

Questions investigated:

* Which implementation alternative best fits the current server phases, messages, state, metadata, and client routing model
* How much frontend migration each alternative requires
* Where regressions are most likely
* Which option best matches the requested UX: one global matchmaking lobby, role-agnostic before joining a specific match room, role selection inside that room, then ready and start, then in-match role clients only

## Current Architecture Evidence

The current architecture already has the beginnings of the requested flow on the server, but the browser flow still hands control too early to role-specific pages.

Server evidence:

* The server exposes one shared entry lobby page at public/lobby.html through src/index.ts:47.
* The match room is registered with realtime listing enabled at src/index.ts:71, which fits a global room-discovery lobby.
* Seat reservations are already role-aware through src/index.ts:172, where POST /api/matches/:roomId/join forwards role, playerRole, and reconnectToken.
* Match state already includes a pre-game room phase model in src/schema/MatchSchema.ts:221 and src/schema/MatchSchema.ts:232, with WAITING, LOBBY, ACTIVE, and ENDED.
* The room transitions from WAITING to LOBBY only after both commander and at least one human kaiju exist in src/game/MatchRoom.ts:402.
* The commander can start the match only from LOBBY in src/game/MatchRoom.ts:388.
* Starting the match flips the room to ACTIVE and broadcasts both match.phase and match.start in src/game/MatchRoom.ts:782 and src/game/MatchRoom.ts:811.
* Room listing metadata already exposes commanderTaken and kaijuOpenSlots for lobby UI in src/game/MatchRoom.ts:795.

Client evidence:

* The shared lobby renders room discovery plus Join Commander and Join Kaiju buttons in public/lobby.html:334, public/lobby.html:343, and public/lobby.html:366.
* Joining from the shared lobby stores a pending seat reservation and immediately redirects to a role-specific page in public/lobby.html:245, public/lobby.html:379, public/lobby.html:382, public/lobby.html:404, and public/lobby.html:407.
* The redirect target is hard-coded to /commander/index.html or /kaiju/index.html in public/lobby.html:221.
* Session storage still persists role globally before entering the role page through public/common/session-manager.js:82, public/common/session-manager.js:131, and public/common/session-manager.js:173.
* The commander page still behaves as both join client and pre-match room client. It recreates or rejoins seats in public/commander/app.js:643 and public/commander/app.js:689, and owns the Start Match action in public/commander/app.js:811 and public/commander/app.js:817.
* The kaiju page still behaves as a join client, not only an in-match client, in public/kaiju/app.js:1089 and public/kaiju/app.js:1199.
* The shared Colyseus helper models the global lobby as a REST-polled discovery surface, while match join remains seat-reservation based in public/common/colyseus-client.js:93, public/common/colyseus-client.js:114, public/common/colyseus-client.js:197, and public/common/colyseus-client.js:215.

Conclusion from evidence:

* The backend model already supports a global lobby followed by a specific match room phase.
* The mismatch is mainly in the frontend handoff. The lobby decides role and immediately routes into role-specific apps that still own pre-match join and start responsibilities.

## Evaluation Criteria

The alternatives were assessed against four criteria:

* Fit with current server phases, messages, state, and metadata
* Frontend migration complexity
* Regression risk
* Alignment with the requested user experience

## Alternative 1

### Keep commander and kaiju pages after the shared lobby, but remove all match creation and join UI from those pages and treat them as per-match pre-game and in-match clients only

Fit with existing architecture:

* This fits the existing room state model reasonably well because WAITING, LOBBY, and ACTIVE already exist in src/schema/MatchSchema.ts:232 and src/game/MatchRoom.ts:402.
* It also fits the current message model because match.phase, match.start, commander.start, signal.feed, and commander.status already support pre-match and active transitions in src/game/MatchRoom.ts:388, src/game/MatchRoom.ts:811, src/messages/protocol.ts:69, src/messages/protocol.ts:77, and src/messages/protocol.ts:128.
* The problem is that role selection would still happen in the global lobby because the shared lobby currently joins with explicit role and then redirects by role in public/lobby.html:221 and public/lobby.html:366. That conflicts with the requested role-agnostic experience before entering a specific match room.

Frontend impact and migration complexity:

* Moderate.
* The commander and kaiju pages would need to stop creating or joining rooms directly. The code paths at public/commander/app.js:643, public/commander/app.js:689, and public/kaiju/app.js:1089 would need to become pure consume-existing-seat flows.
* The shared lobby would still need to own seat reservation and role choice, so the current public/lobby.html logic could mostly stay in place.
* The remaining complexity is cleaning duplicate join logic out of both role pages and making them tolerate LOBBY as a first-class pre-game phase.

Risk of regressions:

* Medium.
* This option keeps two separate clients alive across both pre-match and in-match phases. Any pre-match UI change must be implemented twice.
* Divergence risk is high because commander and kaiju pages already react differently to room state and messages. That split remains.
* Reconnection complexity stays spread across three surfaces: global lobby, commander page, and kaiju page.

Alignment with the user request:

* Partial only.
* It preserves one global matchmaking lobby.
* It does not naturally support role-agnostic entry into a specific match room because the role is still selected before the redirect from the shared lobby.
* It can be bent into compliance only if the shared lobby joins a match first without role, then the role-specific page selects role after load. That becomes awkward because the current routing model is role-driven before page load.

Assessment:

* This is an incremental cleanup, not a clean resolution of the stated UX.

## Alternative 2

### Add a new shared pre-match room page that all players enter after the global lobby; role selection and ready and start happen there, then transition into commander and kaiju in-match pages only when the match phase becomes active

Fit with existing architecture:

* This is the best fit with the current server model.
* The global lobby already exists as room discovery and creation in public/lobby.html:168 and public/common/colyseus-client.js:197.
* The match room already exposes exactly the pre-match lifecycle needed for a shared pre-match room: WAITING, LOBBY, ACTIVE, room metadata, and commander.start in src/game/MatchRoom.ts:388, src/game/MatchRoom.ts:402, src/game/MatchRoom.ts:795, and src/game/MatchRoom.ts:811.
* The missing piece is not a new server concept. It is a dedicated browser page that stays inside the specific match room during WAITING and LOBBY.
* This alternative does require one server-side semantic change if the user request is interpreted strictly: role selection should happen inside the match room, but the current room assigns roles at join time from options.role or playerRole in src/game/MatchRoom.ts:177 through src/game/MatchRoom.ts:204. That means the room likely needs a separate role-claim or seat-selection message instead of only join-time assignment.
* Even with that adjustment, the current architecture is still close because room metadata already tracks open commander and kaiju capacity in src/game/MatchRoom.ts:795.

Frontend impact and migration complexity:

* Moderate to high, but well-bounded.
* A new shared pre-match page would take over these responsibilities:
  * consume the seat reservation created from the global lobby
  * render match-room roster and slot availability
  * let users claim commander or kaiju inside the room
  * let players ready up and let commander start
  * route to /commander/index.html or /kaiju/index.html only after ACTIVE
* The existing global lobby can simplify to create or join specific match rooms without making role decisions.
* The existing role-specific pages can simplify substantially. Their join and creation paths at public/commander/app.js:643, public/commander/app.js:689, and public/kaiju/app.js:1089 can be reduced to in-match attach or reconnection behavior.
* This option localizes pre-match UX into one place instead of duplicating it across role pages.

Risk of regressions:

* Medium, but lower than Alternative 3.
* The largest change is introducing a new page and slightly reshaping role assignment semantics.
* The in-match commander and kaiju pages can remain focused on their current active-phase experiences, which lowers gameplay regression risk.
* This option separates concerns cleanly: global lobby for discovery, pre-match room for role and readiness, role-specific pages for active gameplay.
* Existing phase messages and metadata can be reused rather than replaced.

Alignment with the user request:

* Strong.
* This exactly matches the requested flow:
  * one global matchmaking lobby
  * role agnostic before joining a specific match room
  * role selection inside that room
  * ready and start inside that room
  * commander and kaiju pages only once the match becomes ACTIVE

Assessment:

* This is the best architectural match to both the existing backend and the requested UX.

## Alternative 3

### Collapse everything into a single shared client page for both pre-match and in-match states

Fit with existing architecture:

* This can fit the server lifecycle because the room already publishes phases and state transitions in src/game/MatchRoom.ts:402, src/game/MatchRoom.ts:782, and src/game/MatchRoom.ts:811.
* It does not fit the current frontend architecture well because the commander and kaiju gameplay clients are intentionally different applications with different controls, rendering, and responsibilities.
* Commander uses a tactical map, dispatch controls, selection state, and command feeds in public/commander/app.js:1 onward, while kaiju uses movement controls, combat cooldowns, spectator mode, and different HUD behavior in public/kaiju/app.js:1 onward.

Frontend impact and migration complexity:

* Very high.
* This requires merging two specialized SPAs into one stateful shell with conditional rendering for role, match phase, reconnect state, and spectator behavior.
* All join, reconnect, phase, and gameplay handling would need consolidation.
* The amount of code movement is large even if the final product could be cleaner long term.

Risk of regressions:

* High.
* The merge would touch almost every frontend responsibility at once: routing, state management, event wiring, map rendering, commander dispatch, kaiju movement, continue flow, and reconnect behavior.
* Testing burden is largest here because both role experiences would be refactored during the same change.

Alignment with the user request:

* Strong in UX terms.
* Weak in implementation pragmatism for the current codebase.
* It would satisfy the requested role-agnostic and room-centric flow, but only through the most invasive rewrite.

Assessment:

* This is viable as a long-term product simplification, but it is not the best implementation alternative for the current architecture.

## Comparison Summary

| Alternative | Server fit | Frontend change size | Regression risk | UX alignment | Overall |
| --- | --- | --- | --- | --- | --- |
| 1. Keep role-specific pages and strip join UI | Good for current phases, weak for role-agnostic room entry | Moderate | Medium | Partial | Incremental but not fully aligned |
| 2. Add shared pre-match room page | Strong | Moderate to high | Medium | Strong | Best fit |
| 3. Single shared client page | Acceptable on server, poor fit for current client split | Very high | High | Strong | Too invasive now |

## Recommended Approach

Recommended approach: Alternative 2, a shared pre-match room page between the global lobby and the role-specific in-match pages.

Why this is the best option:

* It matches the current server lifecycle instead of fighting it. WAITING, LOBBY, ACTIVE, commander.start, room metadata, and seat reservations already exist and point toward a room-centric pre-match experience.
* It preserves the current commander and kaiju gameplay pages, which limits regression risk in the most specialized parts of the product.
* It removes the current architectural mismatch, where the shared lobby is global but role-specific pages still behave like room-entry and pre-match pages.
* It matches the requested mental model exactly: global lobby first, then a specific room where players choose role and ready up, then role-specific gameplay surfaces only after activation.

Recommended implementation direction implied by this research:

* Keep public/lobby.html focused on discovery and match creation only.
* Add a dedicated shared pre-match room page that consumes the pending seat reservation and remains in the match room during WAITING and LOBBY.
* Move role selection out of public/lobby.html and into the new pre-match room page.
* Simplify public/commander/app.js and public/kaiju/app.js so they are active-match clients first, not primary entry points.
* Consider replacing join-time role assignment in src/game/MatchRoom.ts with an in-room role-claim message if strict role-agnostic room entry is required.

## Gaps And Follow-On Questions

Gaps identified during research:

* The current room assigns roles during onJoin in src/game/MatchRoom.ts:177 through src/game/MatchRoom.ts:204. A strict implementation of the requested UX likely needs a new in-room role-claim protocol, which does not exist yet.
* There is no ready-state model in MatchSchema or protocol yet. The requested ready and start flow implies new room state or metadata for readiness tracking.
* The current room metadata uses status in listing metadata at src/game/MatchRoom.ts:802, while the shared lobby UI reads room.metadata.state in public/lobby.html:318. That mismatch should be clarified during implementation because it can create confusing lobby badges.
* The global lobby currently uses REST-polling rather than a joined Colyseus LobbyRoom in public/common/colyseus-client.js:114 and public/common/colyseus-client.js:197. That is not a blocker for Alternative 2, but it affects how live room updates are presented.

Clarifying questions that research alone cannot settle:

* Should players enter the specific match room before role assignment as true unassigned participants, or is reserving a neutral seat outside commander and kaiju capacity acceptable
* Should readiness be tracked per player only, or per slot plus player identity
* Should the commander remain the only player allowed to trigger start, or should start require all occupied slots to be ready first

## Bottom Line

The current server design already supports a room-centric pre-match phase. The mismatch comes from the frontend redirecting into role-specific clients too early. Alternative 2 resolves that mismatch with the smallest architectural correction that fully honors the requested lobby flow.