---
applyTo: '.copilot-tracking/changes/2026-06-25/start-match-bounce-fix-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Start Match Bounce Fix

## Overview

Replace the incorrect three-argument `client.join()` call in the kaiju reconnect path with the shared `window.KaijuColyseusClient.joinMatchById()` helper to stop malformed JSON requests and the resulting lobby bounce after Start Match.

## Objectives

### User Requirements

* Fix the bug where clicking Start Match sends players back to matchmaking/lobby instead of entering gameplay. — Source: User report + research file .copilot-tracking/research/2026-06-25/start-match-bounce-root-cause-research.md

### Derived Objectives

* Replace incorrect Colyseus join call signature with the established REST-backed shared helper already used by commander. — Derived from: Research identifies `client.join("match", roomId, options)` as the malformed-request source; shared helper `joinMatchById` uses REST + `consumeSeatReservation` and is proven in the commander reconnect path.
* Use `window.KaijuColyseusClient.createClient()` for kaiju client construction to align with shared helper contract. — Derived from: Shared helper expects a client created via `createClient()`; consistency removes a second divergence point.

## Context Summary

### Project Files

* public/kaiju/app.js - Kaiju SPA; `reconnectActiveMatch()` contains the broken join call at lines 1198–1228
* public/common/colyseus-client.js - Shared helper; `joinMatchById()` at line 215 and `createClient()` at line 20 are the correct replacements
* public/commander/app.js - Reference implementation; uses `window.KaijuColyseusClient.joinMatchById` correctly at lines 703–709

### References

* .copilot-tracking/research/2026-06-25/start-match-bounce-root-cause-research.md — Root cause analysis; Scenario A confirmed as primary defect

### Standards References

* .github/copilot-instructions.md — Project conventions for vanilla JS frontend, REST seat-reservation fallback pattern

## Implementation Checklist

### [ ] Implementation Phase 1: Fix kaiju reconnect call site

<!-- parallelizable: false -->

* [x] Step 1.1: Replace `client.join("match", roomId, options)` with `window.KaijuColyseusClient.joinMatchById(client, roomId, options)` and replace local Colyseus client construction with `window.KaijuColyseusClient.createClient()`
  * Details: .copilot-tracking/details/2026-06-25/start-match-bounce-fix-details.md (Lines 18–75)
* [x] Step 1.2: Validate that `window.KaijuColyseusClient` is available before calling helpers; throw a clear error if not
  * Details: .copilot-tracking/details/2026-06-25/start-match-bounce-fix-details.md (Lines 76–95)
* [ ] Step 1.3: Validate phase changes
  * Open browser devtools, reproduce Start Match, confirm no SyntaxError in server logs
  * Confirm kaiju lands on gameplay HUD rather than bouncing to lobby

### [x] Implementation Phase 2: Validation

<!-- parallelizable: false -->

* [x] Step 2.1: Run full project validation
  * `npm run lint` — verify no new lint errors
  * `npm test` — confirm existing test suite passes
* [x] Step 2.2: Fix minor validation issues
  * Iterate on any lint warnings introduced by the edit
* [x] Step 2.3: Report blocking issues
  * Document issues requiring additional research; avoid large-scale fixes in this phase

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/start-match-bounce-fix-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* public/common/colyseus-client.js must be loaded before public/kaiju/app.js (already the case per public/kaiju/index.html script order)
* Colyseus 0.16.x browser client (CDN)

## Success Criteria

* No `SyntaxError: Unexpected token` in server logs after Start Match. — Traces to: research root cause (malformed JSON body from wrong join signature)
* Kaiju client enters gameplay HUD after Start Match without routing to lobby. — Traces to: User requirement
* Commander reconnect behavior unchanged. — Traces to: Derived objective (only kaiju file modified)
* `npm run lint` and `npm test` exit 0. — Traces to: Project quality gate
