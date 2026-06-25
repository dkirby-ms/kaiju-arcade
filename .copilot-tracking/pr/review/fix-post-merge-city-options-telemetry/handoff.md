<!-- markdownlint-disable-file -->
# PR Review Handoff: fix-post-merge-city-options-telemetry

## PR Overview

Review completed for PR #16 with two actionable findings approved for comment submission.

* Branch: fix/post-merge-city-options-telemetry
* Base Branch: main
* Total Files Changed: 14
* Total Review Comments: 2

## PR Comments Ready for Submission

### File: src/game/GameLoop.ts

#### Comment 1 (Lines 220 through 223 and 257 through 258)

* Category: Functional correctness
* Severity: High

Containment appears to be non-terminal right now. The mitigation path marks a Leviathan as CONTAINED and sets statusEndTime to now, but updateStatusEffects resets any non-ACTIVE status when now >= statusEndTime. On the next tick this can reactivate previously contained Leviathans and destabilize victory conditions.

Suggested Change

```ts
// Exclude terminal containment from generic expiry reset.
if (
  leviathan.status !== "ACTIVE" &&
  leviathan.status !== "CONTAINED" &&
  now >= leviathan.statusEndTime
) {
  leviathan.status = "ACTIVE";
}
```

Additional test guidance: add a regression test proving contained Leviathans remain contained over subsequent ticks.

### File: src/schema/MatchSchema.ts and src/game/MatchRoom.ts

#### Comment 2 (MatchSchema.ts line 290; MatchRoom.ts lines 586 through 592 and 658 through 665)

* Category: Reliability and observability
* Severity: Medium

Signal timestamps currently come from metadata.now. Before the first game tick, metadata.now is still 0, so early events like COMMANDER ONLINE and MATCH START can emit epoch or stale timestamps in the commander feed, which harms telemetry ordering.

Suggested Change

```ts
// In addSignal, fallback to wall-clock time when metadata.now has not been initialized.
entry.timestamp = this.metadata.now > 0 ? this.metadata.now : Date.now();
```

Alternative: set this.state.metadata.now = Date.now() immediately before out-of-tick emitSignal calls in join/start paths.

Additional test guidance: add a test asserting non-zero timestamps for join/start signal events.

## Review Summary by Category

* Security Issues: 0
* Code Quality: 1
* Convention Violations: 0
* Documentation: 0
* Reliability and Observability: 1

## Instruction Compliance

* ✅ /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md: Tracking and handoff markdown files include required lint disable header and maintain markdown structure.
* ✅ /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md: Content uses clear, direct, and actionable reviewer language.

## Outstanding Risks

* Runtime type guards introduced in src/utils/types.ts are not yet consumed by the plain JS commander scaffold in public/commander/app.js. This is acceptable for scaffold scope but should be revisited if untrusted payload sources are introduced.
