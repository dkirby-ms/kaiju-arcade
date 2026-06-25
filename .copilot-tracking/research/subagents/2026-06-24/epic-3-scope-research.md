---
title: Epic 3 Scope Research
description: Repository evidence to determine what Epic #3 refers to in kaiju-arcade.
author: Researcher Subagent
ms.date: 2026-06-24
ms.topic: reference
keywords:
  - kaiju-arcade
  - epic-3
  - planning
  - scope
estimated_reading_time: 8
---

## Research Questions

1. What does Epic #3 refer to in this repository?
2. Is Epic #3 an internal planning label or a specific GitHub issue number?
3. What scope is included under Epic #3 according to planning artifacts?

## Scope and Method

Focused repository research on planning and documentation artifacts:

- DELIVERABLES.md
- ISSUE-PREVIEW.md
- IMPLEMENTATION-GUIDE.md
- START-HERE.md
- QUICK-REFERENCE.md
- VERSIONING.md
- docs/multiplayer-game-design.md
- .copilot-tracking/implementation-tasks.md
- .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/in-progress-review.md
- .copilot-tracking/research/2026-06-24/epic-3-research.md

Used code/file search and targeted line reads for evidence.

## Key Findings

### 1) Epic #3 is consistently defined as Commander Player (Dashboard)

Primary definition appears in multiple top-level planning artifacts:

- ISSUE-PREVIEW.md:60 defines "EPIC 3: Commander Player (Dashboard)"
- IMPLEMENTATION-GUIDE.md:69 defines "EPIC 3: Commander Player (Dashboard)"
- .copilot-tracking/implementation-tasks.md:59 defines "EPIC 3: Commander Player (Dashboard)"
- QUICK-REFERENCE.md:36 lists Epic 3 as "Commander Dashboard"

Interpretation: In repo planning language, Epic #3 refers to the Commander-facing dashboard system.

### 2) Epic #3 scope includes four feature groups and detailed task breakdown

Detailed Epic #3 feature taxonomy is explicit in ISSUE-PREVIEW and implementation task planning:

- Feature 3.1 Dashboard UI Components (Arcade Aesthetic): ISSUE-PREVIEW.md:66, .copilot-tracking/implementation-tasks.md:61
- Feature 3.2 Commander Input & Asset Dispatch: ISSUE-PREVIEW.md:67, .copilot-tracking/implementation-tasks.md:68
- Feature 3.3 Commander Feedback & Status Display: ISSUE-PREVIEW.md:68, .copilot-tracking/implementation-tasks.md:74
- Feature 3.4 Signal Feed & Match Timeline: ISSUE-PREVIEW.md:69, .copilot-tracking/implementation-tasks.md:81

Representative task evidence:

- CRT and scan-line visual style: ISSUE-PREVIEW.md:72, .copilot-tracking/implementation-tasks.md:62
- Asset dispatch controls and validation: ISSUE-PREVIEW.md:78-80, .copilot-tracking/implementation-tasks.md:70-72
- Status/score/cooldown display: ISSUE-PREVIEW.md:81-85, .copilot-tracking/implementation-tasks.md:75-79
- Signal feed and timer: ISSUE-PREVIEW.md:86-89, .copilot-tracking/implementation-tasks.md:82-85

Interpretation: Epic #3 covers Commander UX aesthetics, commander command inputs, tactical feedback/status, and timeline/signal feed behavior.

### 3) Execution planning places Epic #3 in Tier 2 gameplay and parallel UI work

Cross-document sequencing is consistent:

- QUICK-REFERENCE.md:20 places EPIC 3-8 in Tier 2 Gameplay
- IMPLEMENTATION-GUIDE.md:92-93 schedules EPIC 3 + 4 in Phase 2A
- DELIVERABLES.md:83 and DELIVERABLES.md:87 schedule planning/start for EPIC 3 + 4
- START-HERE.md:323 calls out parallel UI planning for EPIC 3 + 4
- VERSIONING.md:75 includes EPIC 3 in v0.2.0 completion band (EPIC 3-5)

Interpretation: Epic #3 is not an isolated workstream; it is grouped with Epic #4 as player-system UI implementation after Tier 1 infrastructure.

### 4) Evidence of implementation alignment exists, but issue-number identity remains partly ambiguous

PR review artifact indicates explicit Epic 3 implementation intent:

- .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/in-progress-review.md:16
  - "PR: #16 Epic 3: commander dashboard events, dispatch telemetry, and client scaffold"

Same artifact also records:

- .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/in-progress-review.md:15
  - "Linked Work Items: Closes #3 (from PR body)"

Interpretation: There is likely a GitHub issue #3 linked to Epic 3 work, but this repository evidence does not prove that GitHub issue number #3 is always equivalent to internal "EPIC 3" in all contexts.

## Ambiguities and Numbering Risks

1. Internal epic numbering vs GitHub issue numbering
- Internal docs use EPIC 1..12 as a planning taxonomy (for example IMPLEMENTATION-GUIDE.md:63-80).
- PR metadata references "Closes #3" (issue number), which may coincide with EPIC 3 but is a different namespace.
- Without live GitHub issue list in this research pass, exact one-to-one mapping cannot be guaranteed.

2. Script/document drift
- Several docs reference create-issues.sh/create_issues.py workflows, but those files are not present in current workspace root listing.
- This prevents direct verification (from scripts) of how EPIC labels map to concrete GitHub issue numbers.

3. Existing prior research artifact is incomplete
- .copilot-tracking/research/2026-06-24/epic-3-research.md includes placeholders and an explicit unresolved question about epic numbering (line 29).
- This supports that numbering identity had not yet been fully resolved earlier.

## Conclusion

In this repository, "Epic #3" refers to Commander Player (Dashboard), a Tier 2 gameplay/UI epic with four feature areas:

- Dashboard arcade UI
- Commander input and asset dispatch
- Commander feedback/status visualization
- Signal feed and match timeline

The only unresolved nuance is namespace ambiguity between internal EPIC numbering and GitHub issue numbers (for example "Closes #3").

## Recommended Next Research

1. Query GitHub issues for this repository to confirm whether issue #3 is the canonical EPIC 3 ticket and capture its title/body labels.
2. Locate or recover missing issue-creation script artifacts (if intentionally removed, document replacement source of truth).
3. Reconcile IMPLEMENTATION-GUIDE/DELIVERABLES references to missing scripts with current operational workflow.
4. Validate current code-to-epic traceability by mapping public/commander and src/game signal/dispatch paths to EPIC 3 tasks.

## Clarifying Questions That Need External Input

1. Should "Epic #3" in your process always mean internal planning epic number, or should it always mean GitHub issue number #3?
2. Were issue-creation scripts intentionally removed from this branch, or is the workspace missing onboarding/setup artifacts?
3. Do you want this research expanded into a code-level implementation coverage matrix for EPIC 3 tasks?