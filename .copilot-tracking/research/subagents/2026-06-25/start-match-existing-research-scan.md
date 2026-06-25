---
title: Start Match Existing Research Scan
description: Consolidated, evidence-backed findings from existing 2026-06-25 research for the unified matchmaking lobby fix bug report
author: GitHub Copilot (Researcher Subagent)
ms.date: 2026-06-25
ms.topic: reference
keywords:
  - matchmaking
  - start-match
  - lobby
  - session-manager
  - regressions
estimated_reading_time: 4
---

## Scope

This document extracts only already-verified findings from:

* .copilot-tracking/research/2026-06-25/unified-matchmaking-lobby-research.md
* .copilot-tracking/research/subagents/2026-06-25/matchmaking-flow-research.md
* .copilot-tracking/research/subagents/2026-06-25/unified-lobby-alternatives-research.md
* .copilot-tracking/research/subagents/2026-06-25/repo-production-baseline-research.md

Focus areas requested:

* start match
* lobby slot controls
* session manager
* match-room page navigation
* known bugs/regressions

## Already Proven

### Start match behavior

* Match start is explicitly commander-triggered and phase-gated.
  * Evidence: src/game/MatchRoom.ts:388-399, src/game/MatchRoom.ts:780-787
* Room phase lifecycle is modeled and used: WAITING -> LOBBY -> ACTIVE -> ENDED.
  * Evidence: src/schema/MatchSchema.ts:232, src/game/MatchRoom.ts:402-415
* Start/phase broadcasts exist and are consumed by clients.
  * Evidence: src/game/MatchRoom.ts:811-842, public/commander/app.js:603-631, public/kaiju/app.js:1141-1158

### Lobby slot controls and role assignment

* Server metadata includes slot-awareness fields for discovery UIs.
  * Evidence: src/game/MatchRoom.ts:795-807 (commanderTaken, kaijuOpenSlots)
* Shared lobby UI is implemented with commander/kaiju role-specific join actions.
  * Evidence: public/lobby.html:334-360, public/lobby.html:366-407
* Role assignment currently occurs at join-time using join options (role/playerRole) with first-join fallback behavior.
  * Evidence: src/game/MatchRoom.ts:176-247

### Session manager handoff behavior

* Session storage is the core handoff mechanism across pages.
  * Evidence: public/common/session-manager.js:68-173
* The handoff includes role, current match ID, and pending seat reservation.
  * Evidence: public/common/session-manager.js:82-103, public/common/session-manager.js:131-140
* Reconnection token persistence is implemented in session/local storage model.
  * Evidence: public/common/session-manager.js:111-126, public/common/session-manager.js:142-169

### Match-room page navigation and architecture intent

* Existing research agrees there is a global lobby before per-match handling.
  * Evidence: public/index.html:134-140, src/index.ts:47
* Existing research confirms role-specific pages still contain room-entry logic (legacy overlap).
  * Evidence: public/commander/app.js:643-770, public/kaiju/app.js:1089-1236

## Known Bugs and Regression Risks Already Identified

* Duplicate/overlapping matchmaking surfaces on commander path.
  * Evidence: public/commander/index.html:28 and public/commander/app.js:643-687, public/commander/app.js:795-807
  * Proven impact: users can encounter a second commander-specific match-creation surface after shared-lobby create flow.
* Frontend flow mismatch: shared lobby creates/reserves seat, then redirects to role-specific clients that still act like matchmaking entry surfaces.
  * Evidence: public/lobby.html:221-223, public/lobby.html:377-407, public/commander/app.js:689-770, public/kaiju/app.js:1089-1236
* Lobby data contract mismatch risk: lobby UI expects metadata fields but REST list endpoint may omit metadata.
  * Evidence: public/lobby.html:319-327, src/game/MatchRoom.ts:795-807, src/index.ts:113-133
* Contract drift risk: match.phase is broadcast/consumed but not explicitly declared in protocol type definitions.
  * Evidence: src/game/MatchRoom.ts:811-824, public/commander/app.js:603-631, public/kaiju/app.js:1141-1158, src/messages/protocol.ts

## What Remains Unknown For The Current Bug Report

* Current live navigation target after create/join from shared lobby is inconsistent across research artifacts.
  * One evidence set reports redirect to /commander/index.html or /kaiju/index.html (public/lobby.html:221-223).
  * Another evidence set reports redirect to match-room.html (public/lobby.html:342-359).
  * Unknown: which behavior is present in the exact bug-report build.
* Whether match-room.html is a full shared pre-match implementation or still a placeholder in the current bug-report build.
  * Evidence noted as placeholder: public/match-room.html:93-109.
* Whether GET /api/matches currently returns enough metadata for slot-aware lobby controls in the deployed target.
  * Evidence conflict source: lobby expects metadata fields, endpoint mapping may drop them (src/index.ts:113-133).
* Whether the reported regression is strictly UI duplication, or also includes start gating/readiness failures during LOBBY -> ACTIVE transition.
  * Existing docs confirm start gate rules, but do not include reproduced failing run for this bug report.

## Bottom Line For Current Report

Already proven: server-side phase/start mechanics and slot metadata primitives exist; session handoff exists; frontend still shows overlapping/legacy room-entry responsibilities that can cause second-lobby behavior.

Still unknown: exact current navigation path and payload shape in the bug-report build, and whether start failures are part of this regression versus a separate issue.