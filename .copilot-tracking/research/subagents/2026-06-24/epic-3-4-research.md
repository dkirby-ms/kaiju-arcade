---
title: Epic 3 and Epic 4 Planning Research
description: Consolidated implementation-planning research for Epic 3 Commander Dashboard and Epic 4 Kaiju Mobile Client.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju-arcade
  - epic-3
  - epic-4
  - planning
  - architecture
estimated_reading_time: 10
---

## Research Topics and Questions

1. Where are Epic 3 and Epic 4 defined in repository artifacts?
2. What is the exact scope, requirement list, acceptance surface, and constraints for both epics?
3. What existing architecture and components are relevant for implementation planning?
4. What existing .copilot-tracking artifacts already cover Epic 3 and Epic 4?

## Authoritative Epic Definitions

Primary definition sources:

- ISSUE-PREVIEW.md:60 defines EPIC 3 as Commander Player (Dashboard).
- ISSUE-PREVIEW.md:93 defines EPIC 4 as Kaiju Players (Mobile Client).
- .copilot-tracking/implementation-tasks.md:59 defines EPIC 3.
- .copilot-tracking/implementation-tasks.md:89 defines EPIC 4.

Epic feature boundaries:

- Epic 3 features:
  - ISSUE-PREVIEW.md:66 Feature 3.1 Dashboard UI Components (Arcade Aesthetic).
  - ISSUE-PREVIEW.md:67 Feature 3.2 Commander Input and Asset Dispatch.
  - ISSUE-PREVIEW.md:68 Feature 3.3 Commander Feedback and Status Display.
  - ISSUE-PREVIEW.md:69 Feature 3.4 Signal Feed and Match Timeline.
- Epic 4 features:
  - ISSUE-PREVIEW.md:99 Feature 4.1 Kaiju UI (Mobile-First, Arcade Aesthetic).
  - ISSUE-PREVIEW.md:100 Feature 4.2 Kaiju Abilities and Input.
  - ISSUE-PREVIEW.md:101 Feature 4.3 Kaiju State and Feedback.
  - ISSUE-PREVIEW.md:102 Feature 4.4 Continue System (INSERT COIN).

## Exact Scope and Requirements Extracted

Detailed task-level requirements are explicit in .copilot-tracking/implementation-tasks.md:

- Epic 3 task list spans .copilot-tracking/implementation-tasks.md:61-86.
  - 3.1 visual style requirements include CRT scan lines, monochrome scheme, uppercase condensed labels, typewriter feed, radar sweep.
  - 3.2 input requirements include target selection, asset dispatch controls, validation, and commander.select and commander.dispatch messages.
  - 3.3 status requirements include map threats, base HP, commander score, barriers/assets/cooldowns, and alert mode.
  - 3.4 feed/timeline requirements include signal history, signal generation classes, broadcast path, and timer display.
- Epic 4 task list spans .copilot-tracking/implementation-tasks.md:91-119.
  - 4.1 mobile aesthetic requirements include silhouette/vector style, segmented HP flicker, screen shake, neon outline UI.
  - 4.2 ability/input requirements include move, attack, archetype ability buttons, cooldown animations, and kaiju.move or kaiju.attack or kaiju.ability messages.
  - 4.3 feedback requirements include HP/hpMax, cooldown timers, damage pops, distance-to-base, and feedback animation.
  - 4.4 continue requirements include CONTAINED UX, INSERT COIN flashing, 10-second timer, continue action, credits, GAME OVER, spectator mode.

Parallel sequencing requirement context:

- IMPLEMENTATION-GUIDE.md:92-99 places Epic 3 and 4 in Phase 2A after Tier 1.
- QUICK-REFERENCE.md:20 places Epics 3-8 in Tier 2 gameplay.
- VERSIONING.md:75 claims EPIC 3-5 completion at v0.2.0.

## Acceptance Criteria and Constraints Evidence

No separate formal acceptance-criteria document for Epic 3 or 4 was found in this pass. Current acceptance surface is inferred from:

1. Epic task checklists in ISSUE-PREVIEW.md:71-119 and .copilot-tracking/implementation-tasks.md:61-119.
2. Phase gate criteria in IMPLEMENTATION-GUIDE.md:96-99:
   - Commander dashboard operational.
   - Kaiju client playable.
   - Both clients connect and show synchronized state.

Design constraints pulled from docs/multiplayer-game-design.md and schema constants:

- Commander display constraints: docs/multiplayer-game-design.md:28-37.
- Kaiju display constraints: docs/multiplayer-game-design.md:38-45.
- Continue system constraints: docs/multiplayer-game-design.md:46-57.
- Continue economy and timing: docs/multiplayer-game-design.md:50-53 and docs/multiplayer-game-design.md:248-250.
- Runtime constants: src/schema/MatchSchema.ts:757-759.

## Existing Architecture and Components Relevant to Epic 3 and 4

Server and protocol surfaces:

- Message contracts for commander and kaiju intents/events:
  - src/messages/protocol.ts:16-43 and src/messages/protocol.ts:62-111.
- Match room broadcasts used by both UI epics:
  - src/game/MatchRoom.ts:768 signal.feed.
  - src/game/MatchRoom.ts:797 commander.status.
  - src/game/MatchRoom.ts:821 commander.dispatch.result.
  - src/game/MatchRoom.ts:874 kaiju.contained.
  - src/game/MatchRoom.ts:914 kaiju.spectator.
- Continue-to-spectator transition and win conditions:
  - src/game/MatchRoom.ts:887-923 and src/game/MatchRoom.ts:925-940.

Schema and game-state helpers:

- Signal feed helper and timestamp fallback behavior: src/schema/MatchSchema.ts:332-347.
- Active/contained helper methods: src/schema/MatchSchema.ts:318-327.
- Continue constants: src/schema/MatchSchema.ts:757-759.

Epic 3 implementation surfaces:

- Commander UI composition: public/commander/index.html:19-84.
- Commander map rendering and radar behavior: public/commander/app.js:91-245.
- Commander signal feed/typewriter behavior: public/commander/app.js:332-351.
- Commander status and cooldown rendering: public/commander/app.js:363-383.
- Commander network wiring and dispatch sends:
  - public/commander/app.js:458-467.
  - public/commander/app.js:485-492.

Epic 4 implementation surfaces:

- Kaiju mobile UI composition including continue overlay and spectator panel: public/kaiju/index.html:19-151.
- Kaiju input cadence and cooldown loop:
  - public/kaiju/app.js:2-10 constants.
  - public/kaiju/app.js:551-590 cooldown rendering.
  - public/kaiju/app.js:773-819 move or attack or ability sends.
- Continue and spectator behavior:
  - public/kaiju/app.js:591-614 continue overlay/timer.
  - public/kaiju/app.js:718-739 contained/spectator message handlers.
  - public/kaiju/app.js:828-829 kaiju.continue send.
- Spectator command-view map panel: public/kaiju/app.js:294-443 and public/kaiju/app.js:528-549.

## Existing .copilot-tracking Artifacts Related to Epic 3 and 4

Found and relevant artifacts:

- .copilot-tracking/research/subagents/2026-06-24/epic-3-scope-research.md
- .copilot-tracking/research/subagents/2026-06-24/epic-3-implementation-research.md
- .copilot-tracking/research/subagents/2026-06-24/epic-4-kaiju-ux-subagent-research.md
- .copilot-tracking/research/2026-06-24/epic-3-research.md
- .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md
- .copilot-tracking/implementation-tasks.md
- .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/in-progress-review.md

Interpretation:

- Epic-specific research already exists for each epic independently.
- No prior consolidated Epic 3 and 4 subagent planning document at:
  - .copilot-tracking/research/subagents/2026-06-24/epic-3-4-research.md
  until this file was created.

## Unresolved Questions and Gaps

1. Formal acceptance criteria source gap:
   - Epic checklists exist, but no separate acceptance-criteria artifact (for example issue body canonicalization beyond ISSUE-PREVIEW) was verified in this pass.
2. Internal EPIC numbering vs GitHub issue numbering:
   - Existing research artifacts indicate potential ambiguity between EPIC 3 naming and issue number references.
3. Completion-state drift:
   - VERSIONING.md:75 claims EPIC 3-5 complete, but planning checklists in .copilot-tracking/implementation-tasks.md remain unchecked.
4. Scope boundary between Epic 3 and Epic 5 for combo-related signal behavior:
   - Epic 3 includes combo detection display requirements, while Epic 5 owns core combo mechanics implementation.

## Recommended Next Research

- [ ] Confirm canonical Epic 3 and Epic 4 issue records in GitHub and copy exact acceptance criteria text into planning docs.
- [ ] Build a requirements-to-code coverage matrix for all Epic 3 and Epic 4 tasks (implemented, partial, missing).
- [ ] Reconcile completion claims in VERSIONING.md with checklist and code-level evidence.
- [ ] Clarify ownership split for combo generation versus combo display across Epic 3 and Epic 5.

## Research Status

Complete for repository-local planning context requested in this task.
