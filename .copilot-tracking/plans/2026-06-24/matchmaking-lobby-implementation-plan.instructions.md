---
applyTo: '.copilot-tracking/changes/2026-06-24/matchmaking-lobby-implementation-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Matchmaking Lobby Architecture

## Overview

Implement a dedicated matchmaking lobby flow that captures role and player name before game join, enables live room discovery via Colyseus LobbyRoom, and transitions players into match gameplay through explicit WAITING -> LOBBY -> ACTIVE phases.

## Objectives

### User Requirements

* Build a plan to implement the lobby architecture — Source: user request in current conversation.
* Implement dedicated matchmaking lobby with role selection and player naming flow — Source: .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md.
* Preserve player identity and support reconnection across lobby/match rooms — Source: .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md.

### Derived Objectives

* Minimize migration risk by introducing lobby-first flow without breaking existing match APIs — Derived from: existing REST endpoints and current project behavior.
* Keep server authoritative for role validation and phase transitions while clients remain presentation-focused — Derived from: existing MatchRoom architecture.
* Validate correctness through staged backend tests, integration checks, and final full validation — Derived from: repository testing maturity and planning quality constraints.

## Context Summary

### Project Files

* src/index.ts - Colyseus room registration and API route surface.
* src/game/MatchRoom.ts - Authoritative join, role validation, phase transitions, and broadcast behavior.
* src/schema/MatchSchema.ts - Match/player metadata and lifecycle state.
* public/index.html - Entry role selection and player naming page.
* public/lobby.html - Dedicated lobby room discovery and join/create actions.
* public/common/session-manager.js - Shared browser storage helpers for role/name/match/token.
* public/common/colyseus-client.js - Shared Colyseus client initialization and reconnect helpers.
* public/commander/index.html - Commander pre-match and in-match UI structure.
* public/commander/app.js - Commander lobby phase and gameplay flow.
* public/kaiju/index.html - Kaiju pre-match and in-match UI structure.
* public/kaiju/app.js - Kaiju lobby phase and gameplay flow.

### References

* .copilot-tracking/research/2026-06-24/matchmaking-lobby-architecture-research.md - primary architecture and scenario research baseline.
* /memories/repo/kaiju-arcade-notes.md - reconnection token and Colyseus behavior constraints.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown formatting guidance for plan artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing-style guidance for plan artifacts.

## Implementation Checklist

### [x] Implementation Phase 1: Backend Lobby and Lifecycle Foundations

<!-- parallelizable: false -->

* [x] Step 1.1: Enable MatchRoom realtime listing for LobbyRoom discovery
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 11-28)
* [x] Step 1.2: Implement authoritative WAITING -> LOBBY -> ACTIVE phase transitions
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 30-48)
* [x] Step 1.3: Enforce role and player identity persistence on join and metadata updates
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 50-70)
* [x] Step 1.4: Validate backend phase changes
  * Run targeted tests and compile checks for room/schema/index updates.

### [x] Implementation Phase 2: Entry and Lobby Client Experience

<!-- parallelizable: true -->

* [x] Step 2.1: Implement entry page role and player name capture flow
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 79-96)
* [x] Step 2.2: Build dedicated lobby view with realtime room list and create/join controls
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 98-118)
* [x] Step 2.3: Validate lobby page behavior against server changes
  * Run focused index/match tests and compile validation.

### [x] Implementation Phase 3: Lobby-Aware Game Client Transitions

<!-- parallelizable: false -->

* [x] Step 3.1: Add lobby-phase rendering and commander-gated match start in both clients
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 127-146)
* [x] Step 3.2: Implement reconnect token lifecycle handling in commander and kaiju clients
  * Details: .copilot-tracking/details/2026-06-24/matchmaking-lobby-implementation-details.md (Lines 148-168)
* [x] Step 3.3: Validate transition and reconnection behavior
  * Run targeted tests and manual multi-client flow checklist.

### [x] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute all lint commands (`npm run lint`, language linters)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [x] Step 4.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [x] Step 4.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See .copilot-tracking/plans/logs/2026-06-24/matchmaking-lobby-implementation-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm scripts from package.json.
* Colyseus 0.17.0 server room APIs.
* Colyseus.js browser client compatibility with existing frontend pages.

## Success Criteria

* Players can select role and enter player name before joining a dedicated lobby page — Traces to: research entry flow requirements.
* Lobby displays real-time match discovery and supports create/join actions — Traces to: research LobbyRoom message contract.
* Match lifecycle supports WAITING, LOBBY, and ACTIVE with commander-controlled start — Traces to: research phase-transition requirements.
* Reconnection token flow works across room transitions without identity loss — Traces to: research reconnection and memory notes.