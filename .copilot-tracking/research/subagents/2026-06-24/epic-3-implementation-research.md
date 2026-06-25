---
title: Epic 3 Implementation Research
description: Repository research mapping current Epic #3 (Commander Dashboard) implementation status, evidence, gaps, and implementation options
ms.date: 2026-06-24
ms.topic: reference
---

## Research Topics

* Determine Epic #3 goals from repository planning docs.
* Map current implementation status across src/game, src/schema, src/messages, src/utils, and relevant tests.
* Evaluate open gaps for Epic #3 completion.
* Include recent review context around CONTAINED terminal behavior and signal timestamp reliability.

## Epic #3 Scope Discovered

Epic #3 is defined as Commander dashboard delivery across four feature areas:

* FEATURE 3.1 Dashboard UI Components (arcade aesthetic)
* FEATURE 3.2 Commander Input and Asset Dispatch
* FEATURE 3.3 Commander Feedback and Status Display
* FEATURE 3.4 Signal Feed and Match Timeline

Evidence:

* ISSUE-PREVIEW.md:60
* ISSUE-PREVIEW.md:66
* ISSUE-PREVIEW.md:67
* ISSUE-PREVIEW.md:68
* ISSUE-PREVIEW.md:69
* .copilot-tracking/implementation-tasks.md:59
* .copilot-tracking/implementation-tasks.md:61
* .copilot-tracking/implementation-tasks.md:68
* .copilot-tracking/implementation-tasks.md:74
* .copilot-tracking/implementation-tasks.md:81

## Key Discoveries by Implementation Area

### Server Contract and Message Layer

Implemented:

* Commander message protocol includes commander.select and commander.dispatch.
  * src/messages/protocol.ts:15
  * src/messages/protocol.ts:22
  * src/messages/protocol.ts:199
  * src/messages/protocol.ts:203
* Commander dashboard event contracts exist for signal feed, commander status, and dispatch result.
  * src/messages/protocol.ts:66
  * src/messages/protocol.ts:74
  * src/messages/protocol.ts:87
* Match start event contract exists and is broadcast from room logic.
  * src/messages/protocol.ts:125
  * src/game/MatchRoom.ts:660

Test coverage:

* Commander select and backward-compatible field validation.
  * src/messages/protocol.test.ts:9
  * src/messages/protocol.test.ts:21

### Match Room Behavior (Epic 3.2, 3.3, 3.4 server side)

Implemented:

* Commander selection path updates selected target and rebroadcasts status.
  * src/game/MatchRoom.ts:326
  * src/game/MatchRoom.ts:331
* Commander dispatch validation and execution include:
  * targeted asset requirement for Scramble Jets and Deploy Mechs
  * cooldown checks
  * inventory depletion checks
  * dispatch record creation for delayed resolution
  * src/game/MatchRoom.ts:42
  * src/game/MatchRoom.ts:335
  * src/game/MatchRoom.ts:351
  * src/game/MatchRoom.ts:367
  * src/game/MatchRoom.ts:371
* Signal feed broadcasting and dispatch-correlated signal IDs are implemented.
  * src/game/MatchRoom.ts:723
  * src/game/MatchRoom.ts:758
* Commander status payload broadcasts include selected target, inventory, cooldown remaining/ready/progress, barriers, score, and city base HP.
  * src/game/MatchRoom.ts:777
* Dispatch result broadcasts are one-shot via applied flag.
  * src/game/MatchRoom.ts:811
* Containment event broadcasting is deduplicated per containment occurrence.
  * src/game/MatchRoom.ts:858
* Match start broadcast and initial commander status broadcast on match activation.
  * src/game/MatchRoom.ts:651
  * src/game/MatchRoom.ts:652
  * src/game/MatchRoom.ts:653

Test coverage:

* Dispatch validation for target and cooldown behavior.
  * src/game/MatchRoom.test.ts:291
* Commander status payload broadcasting.
  * src/game/MatchRoom.test.ts:575
* Dispatch result one-shot broadcasting and applied flag behavior.
  * src/game/MatchRoom.test.ts:607
* Signal feed dispatchId propagation.
  * src/game/MatchRoom.test.ts:641
* Contained event one-per-event semantics.
  * src/game/MatchRoom.test.ts:522

### Commander Frontend (Epic 3.1, 3.2, 3.3, 3.4 UI)

Implemented:

* Commander frontend is served and has dedicated route.
  * src/index.ts:33
  * src/index.test.ts:133
* UI sections exist for command status, map, dispatch, signal feed, dispatch results.
  * public/commander/index.html:34
  * public/commander/index.html:56
  * public/commander/index.html:64
  * public/commander/index.html:79
  * public/commander/index.html:84
* Arcade styling includes scan-line effect, amber/green/red palette, uppercase labeling, feed glow.
  * public/commander/styles.css:5
  * public/commander/styles.css:20
  * public/commander/styles.css:44
  * public/commander/styles.css:175
* Radar sweep and detection pulse rendering are implemented over map overlay.
  * public/commander/app.js:64
  * public/commander/app.js:91
  * public/commander/app.js:229
* Typewriter effect for signal feed entries is implemented.
  * public/commander/app.js:332
  * public/commander/app.js:344
* Commander UI receives room events and sends commander.select and commander.dispatch.
  * public/commander/app.js:458
  * public/commander/app.js:485
  * public/commander/app.js:488
* Commander status render updates base HP, score, active barriers, selected target, and cooldown readouts.
  * public/commander/app.js:363
  * public/commander/app.js:365
  * public/commander/app.js:374

### Schema and Shared Types

Implemented:

* Signal feed timestamps now fallback to Date.now when metadata.now is zero.
  * src/schema/MatchSchema.ts:339
* Snapshot serialization/deserialization for match state exists.
  * src/schema/MatchSchema.ts:508
  * src/schema/MatchSchema.ts:632
* Shared client event models and runtime guards for commander status and signal feed exist.
  * src/utils/types.ts:65
  * src/utils/types.ts:73
  * src/utils/types.ts:121
  * src/utils/types.ts:144

Test coverage:

* Signal timestamp fallback test exists.
  * src/schema/MatchSchema.test.ts:86

## Review-Context Findings Verification

### Containment Non-Terminal Regression Risk

Status: addressed in current code.

Evidence:

* Status expiry logic excludes CONTAINED from automatic reset.
  * src/game/GameLoop.ts:340
* Containment writes statusEndTime to Number.MAX_SAFE_INTEGER for terminal semantics.
  * src/game/GameLoop.ts:390
  * src/game/GameLoop.ts:394
* Regression test verifies contained leviathans stay contained across ticks.
  * src/game/GameLoop.test.ts:83

### Timestamp Reliability Risk for Early Signals

Status: addressed in current code.

Evidence:

* Signal timestamp fallback from metadata.now to Date.now.
  * src/schema/MatchSchema.ts:339
* metadata.now is updated each tick.
  * src/game/MatchRoom.ts:685
* Join/start signal timestamps tested as non-zero.
  * src/game/MatchRoom.test.ts:263
* Fallback behavior tested directly.
  * src/schema/MatchSchema.test.ts:86

## Gap List for Epic #3 Completion

### Confirmed Gaps

* Match timeline UI appears missing in Commander client:
  * No explicit elapsed timer display, no time-to-base ETA element, and no timeline panel logic in public/commander app and markup.
  * This maps to TASK 3.4.4 in planning docs.
  * Evidence of planned task: .copilot-tracking/implementation-tasks.md:85
* Alert mode toggle UI/state appears missing:
  * No alert-mode control or state toggle found in Commander markup/styles/script.
  * This maps to TASK 3.3.5.
  * Evidence of planned task: .copilot-tracking/implementation-tasks.md:79
* Commander target selection is dropdown-based, not click-on-map or roster-first as described in task text:
  * Target selection exists via select element and pre-dispatch commander.select send.
  * No map click hit-testing or roster component behavior found.
  * Evidence:
    * public/commander/index.html:66
    * public/commander/app.js:383
    * public/commander/app.js:485
  * Planned task text: .copilot-tracking/implementation-tasks.md:69
* Combo-related feed/timeline integration is partial:
  * Combo helper exists in GameLoop but no visible invocation in executeTick path.
  * No explicit combo signal emission found from tick flow.
  * Evidence:
    * src/game/GameLoop.ts:494
    * src/game/GameLoop.ts:31
    * src/game/GameLoop.ts:35

### Likely Documentation Drift

* Epic 3 task checklist remains unchecked in planning docs despite substantial implementation in server, schema, and commander client.
  * .copilot-tracking/implementation-tasks.md:61
* VERSIONING claims EPIC 3-5 complete at v0.2.0, which may overstate remaining Epic 3 UI/timeline gaps.
  * VERSIONING.md:75

## Recommended Implementation Approach Options

### Option A: UI-First Epic 3 Closeout (recommended)

1. Add explicit Commander timeline UI widgets (elapsed time and ETA) and wire to commander.status plus local calculations from leviathan trajectories.
2. Add alert mode state model and toggle behavior driven by threat conditions (for example: base HP threshold, number of non-contained leviathans in danger radius).
3. Upgrade targeting UX to include map click selection and optional leviathan roster while keeping dropdown as fallback.
4. Add UI tests for new timeline and alert mode rendering paths.

Why this option:

* Server-side eventing and dispatch mechanics are already present and tested.
* Highest remaining Epic 3 risk is perceived completeness of Commander dashboard UX, not protocol maturity.

### Option B: Server-Telemetry Completion First

1. Wire combo detection into active tick path and emit explicit combo feed events.
2. Extend commander.status payload with precomputed timeline/threat metrics.
3. Implement thin frontend rendering for new fields.

Trade-off:

* Stronger authoritative backend semantics, but delays visible UX closure for Epic 3 checklist items.

### Option C: Test-First Hardening and Minimal Feature Delta

1. Add failing tests for alert mode, timer/ETA, and map-click targeting behavior.
2. Implement minimal code changes to satisfy tests and mark Epic 3 checklist completion criteria.

Trade-off:

* Fastest route to confidence and checklist updates, but may under-invest in UX polish.

## Clarifying Questions

* Should Epic #3 be considered complete when server contracts and basic Commander UI are delivered, or only when all UI-detail tasks (including alert mode and timeline ETA) are implemented exactly as listed?
* Is combo detection and combo feed signaling intended to be in Epic #3 scope, or deferred to Epic #5 while only displaying available score data in Epic #3?

## Recommended Next Research

* Validate if any hidden acceptance criteria exist in PR/issue artifacts for Epic #3 beyond .copilot-tracking/implementation-tasks.md.
* Confirm if .copilot-tracking/implementation-tasks.md checkboxes should be updated from current implementation evidence.
* Verify whether planned map-click targeting UX is intentionally deferred to later Epic or milestone.

## Research Status

Complete for requested repository-deep implementation mapping and gap analysis against discovered Epic #3 goals.
