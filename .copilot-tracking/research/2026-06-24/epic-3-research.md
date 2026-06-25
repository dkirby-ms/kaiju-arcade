<!-- markdownlint-disable-file -->
# Task Research: Epic #3 Build Plan

Research and implementation guidance for building Epic #3 in the kaiju-arcade repository.

## Task Implementation Requests

* Identify what Epic #3 includes and how it maps to current repository artifacts.
* Produce an evidence-based build approach with alternatives, risks, and next implementation steps.

## Scope and Success Criteria

* Scope: Repository-internal research of Epic #3 definition, current implementation status, and concrete steps to close remaining gaps.
* Assumptions: Internal EPIC numbering and GitHub issue numbering may differ.
* Success Criteria:
  * Epic #3 scope is identified with explicit evidence references.
  * Current code and tests are mapped to Epic #3 feature areas.
  * Remaining gaps are prioritized with implementation-ready next steps.
  * One recommended approach is selected with rationale and alternatives are documented.

## Outline

1. Discover Epic #3 definition and acceptance criteria in planning documents.
2. Map criteria to existing code paths and tests.
3. Validate recent correctness/reliability review items for relevance to Epic #3 readiness.
4. Evaluate implementation alternatives and select approach.
5. Provide actionable implementation steps.

## Potential Next Research

* Confirm if GitHub issue #3 is canonical Epic #3 mapping.
  * Reasoning: Internal EPIC taxonomy and GitHub issue namespace are distinct systems.
  * Reference: .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/in-progress-review.md:15
* Confirm acceptance threshold for Epic completion.
  * Reasoning: Checklist-level completion may require all listed UI details, not only protocol and baseline UI delivery.
  * Reference: .copilot-tracking/implementation-tasks.md:61

## Research Executed

### File Analysis

* ISSUE-PREVIEW.md
  * Defines Epic #3 as Commander Player Dashboard and lists features 3.1-3.4.
* .copilot-tracking/implementation-tasks.md
  * Provides task-level Epic #3 checklist and feature decomposition.
* IMPLEMENTATION-GUIDE.md, QUICK-REFERENCE.md, DELIVERABLES.md, START-HERE.md, VERSIONING.md
  * Confirm sequencing, phase grouping, and versioning claims for Epic #3.
* src/messages/protocol.ts and src/messages/protocol.test.ts
  * Confirms commander command and event contracts used by dashboard.
* src/game/MatchRoom.ts and src/game/MatchRoom.test.ts
  * Confirms server behavior for commander selection, dispatch, signal feed, and status/results broadcast.
* public/commander/index.html, public/commander/app.js, public/commander/styles.css
  * Confirms implemented dashboard UI structure, interactions, and visual treatment.
* src/schema/MatchSchema.ts and src/schema/MatchSchema.test.ts
  * Confirms signal timestamp fallback behavior.
* src/game/GameLoop.ts and src/game/GameLoop.test.ts
  * Confirms containment terminal behavior and regression guard.

### Code Search Results

* Query: `EPIC 3|Commander Dashboard|Feature 3\.`
  * Matches in ISSUE-PREVIEW.md, IMPLEMENTATION-GUIDE.md, QUICK-REFERENCE.md, .copilot-tracking/implementation-tasks.md.
* Query: `commander.status|signal.feed|commander.dispatch.result`
  * Matches in src/messages/protocol.ts, src/game/MatchRoom.ts, public/commander/app.js.
* Query: `CONTAINED|statusEndTime|metadata.now|Date.now`
  * Matches in src/game/GameLoop.ts and src/schema/MatchSchema.ts with test coverage.

### External Research

* Not required. Repository artifacts were sufficient.

### Project Conventions

* Standards referenced: repository memory and existing test-first TypeScript patterns.
* Instructions followed: Task Researcher mode, consolidated research artifact workflow.

## Key Discoveries

### Project Structure

* Epic #3 is consistently defined as Commander Player Dashboard:
  * ISSUE-PREVIEW.md:60
  * IMPLEMENTATION-GUIDE.md:69
  * .copilot-tracking/implementation-tasks.md:59
  * QUICK-REFERENCE.md:36
* Epic #3 includes four feature groups:
  * 3.1 Dashboard UI Components
  * 3.2 Commander Input and Asset Dispatch
  * 3.3 Commander Feedback and Status Display
  * 3.4 Signal Feed and Match Timeline
* Delivery sequencing places Epic #3 in Tier 2 and Phase 2A with Epic #4:
  * QUICK-REFERENCE.md:20
  * IMPLEMENTATION-GUIDE.md:92
  * START-HERE.md:323

### Implementation Patterns

* Protocol-first event contracts are implemented and consumed by the Commander client:
  * src/messages/protocol.ts:66
  * src/messages/protocol.ts:74
  * src/messages/protocol.ts:87
  * public/commander/app.js:458
* MatchRoom performs validation-first command handling before side effects:
  * target requirement checks, cooldown checks, inventory checks, then dispatch record + feed/status updates.
* Frontend uses event-driven rendering with compact dashboard sections and animated feed effects.
* Regression-sensitive gameplay invariants are test-covered (containment terminality and timestamp fallback).

### Complete Examples

```ts
// Commander status event contract (excerpt)
export interface CommanderStatusPayload {
  selectedLeviathanId?: string;
  availableAssets: {
    orbitalStrike: number;
    deployBarrier: number;
    scrambleJets: number;
    deployMechs: number;
  };
  cooldowns: {
    orbitalStrike: CooldownStatus;
    deployBarrier: CooldownStatus;
    scrambleJets: CooldownStatus;
    deployMechs: CooldownStatus;
  };
  activeBarriers: number;
  score: number;
  cityBaseHp: number;
}
```

### API and Schema Documentation

* Commander messages and dashboard events:
  * src/messages/protocol.ts:15
  * src/messages/protocol.ts:22
  * src/messages/protocol.ts:66
  * src/messages/protocol.ts:74
  * src/messages/protocol.ts:87
* Timestamp reliability fallback in signal serialization:
  * src/schema/MatchSchema.ts:339
* One-shot dispatch result application semantics:
  * src/game/MatchRoom.ts:811

### Configuration Examples

```json
{
  "epic3": {
    "featureGroups": [
      "3.1-dashboard-ui-components",
      "3.2-commander-input-dispatch",
      "3.3-feedback-status-display",
      "3.4-signal-feed-match-timeline"
    ],
    "status": "substantially-implemented-with-ui-closeout-gaps"
  }
}
```

## Technical Scenarios

### Epic #3 Delivery Strategy

Epic #3 is largely implemented server-side and partially complete client-side. Remaining risk is mostly acceptance mismatch for dashboard UX details and checklist drift.

**Requirements:**

* Preserve existing protocol contracts and tested room behavior.
* Close UI-specific Epic #3 checklist gaps with minimal server churn.
* Keep recent correctness/reliability fixes intact and regression-tested.

**Preferred Approach:**

* UI-first closeout using existing server contracts.
  * Add timeline panel + elapsed/ETA display in Commander UI.
  * Add alert mode toggle/state behavior.
  * Add map-click or roster-first targeting while retaining dropdown fallback.
  * Add focused UI tests for the new behaviors.

Rationale:

* Server contracts and behaviors already exist and are tested (MatchRoom/protocol).
* Two recent high-value risks (containment terminality, early timestamp reliability) are already addressed with regression tests.
* Fastest path to true Epic #3 acceptance is closing visible dashboard feature deltas.

```text
Likely file touch set for implementation:
- public/commander/index.html
- public/commander/app.js
- public/commander/styles.css
- src/game/MatchRoom.test.ts (if status payload extension needed)
- optional: new frontend test harness file(s)
```

**Implementation Details:**

1. Timeline UI closeout
   * Add elapsed timer element and ETA element.
   * Compute elapsed from match start event.
   * Use existing leviathan state/client calculations for approximate ETA.
2. Alert mode
   * Add manual toggle plus auto-alert rule (for example base HP threshold and nearby non-contained threats).
   * Reflect state via CSS class and signal-feed emphasis.
3. Targeting UX
   * Implement map click selection and optional roster item selection.
   * Keep select dropdown as compatibility fallback.
4. Verification
   * Add tests for non-regression of existing contracts.
   * Add tests for alert/timeline/targeting UI behavior where feasible.

```text
Validation checkpoints:
- Commander status still renders cooldown and inventory state.
- Dispatch flows still require target where expected.
- Contained leviathans remain terminally contained across ticks.
- Join/start/feed timestamps remain non-zero.
```

#### Considered Alternatives

* Server-telemetry-first
  * Rejected for immediate Epic #3 closure because dashboard acceptance gaps are primarily UI-oriented.
* Test-first minimal delta
  * Viable, but risks under-delivering UX quality unless paired with UI-first enhancements.
* Documentation-only completion
  * Rejected because checklist gaps appear to reflect real missing UI behavior, not only stale docs.

## Gap Summary (Evidence-Based)

* Likely missing match timeline UI (elapsed/ETA):
  * Planned: .copilot-tracking/implementation-tasks.md:85
  * Not clearly present in public/commander/index.html and public/commander/app.js.
* Likely missing alert mode toggle/state:
  * Planned: .copilot-tracking/implementation-tasks.md:79
* Targeting UX appears dropdown-first rather than map/roster-first:
  * public/commander/index.html:66
  * public/commander/app.js:383
* Potential checklist/versioning drift:
  * .copilot-tracking/implementation-tasks.md still unchecked for Epic #3 tasks.
  * VERSIONING.md:75 claims EPIC 3-5 completion.

## Open Questions

* Should Epic #3 be declared complete only after every 3.1-3.4 checklist item is implemented exactly?
* Is combo-feed integration required in Epic #3 or deferred to later combat-focused epic work?

## Selected Approach

UI-first Epic #3 closeout is the selected approach.

It minimizes risk by preserving the stable server/event layer, focuses effort on visible acceptance gaps, and aligns with current evidence that core backend and reliability fixes are already in place.
