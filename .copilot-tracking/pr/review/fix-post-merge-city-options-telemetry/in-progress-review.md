<!-- markdownlint-disable-file -->
# PR Review Status: fix-post-merge-city-options-telemetry

## Review Status

* Phase: Phase 4 Complete
* Last Updated: 2026-06-24
* Summary: Review completed. RI-1 and RI-2 approved for PR comments and handoff generated.

## Branch and Metadata

* Normalized Branch: fix-post-merge-city-options-telemetry
* Source Branch: fix/post-merge-city-options-telemetry
* Base Branch: main
* Linked Work Items: Closes #3 (from PR body)
* PR: #16 Epic 3: commander dashboard events, dispatch telemetry, and client scaffold

## Command and Parsing Log

* Created tracking directory at .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry
* Generated .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/pr-reference.xml from git history and git diff against main
* Generated .copilot-tracking/pr/review/fix-post-merge-city-options-telemetry/diff-map.txt using git diff -U0 parsing
* Extracted changed files, hunk line anchors, and patch coverage from diff output
* Loaded instruction files:
  * /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md
  * /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md

## Diff Mapping

| File | Type | New Lines | Old Lines | Notes |
|---|---|---|---|---|
| public/commander/app.js | Added | 1-189 | n/a | Commander UI integration and room event handlers |
| public/commander/index.html | Added | 1-81 | n/a | Commander scaffold markup |
| public/commander/styles.css | Added | 1-166 | n/a | Commander console theme and layout |
| src/game/GameLoop.test.ts | Modified | 53-81 | 52-52 | Dispatch resolution and barrier tests |
| src/game/GameLoop.ts | Modified | 33, 119-210, 241-274 | 32, 118-149, 241-241 | Dispatch resolution pipeline and mitigation effects |
| src/game/MatchRoom.test.ts | Modified | 228-403 | 227-227 | Broadcast telemetry, cooldown validation, dispatch result tests |
| src/game/MatchRoom.ts | Modified | 38-748 (multiple hunks) | scattered | Cooldowns, signal broadcasting, dispatch result events |
| src/index.test.ts | Modified | 129-137 | 128-128 | Static commander route test |
| src/index.ts | Modified | 10, 32-35 | 9, 30-30 | Static route mount for commander assets |
| src/messages/protocol.ts | Modified | 68-90, 132-133 | 67-67, 108-108 | New server event contracts |
| src/schema/MatchSchema.test.ts | Modified | 17-83 (multiple hunks) | scattered | Snapshot coverage for cooldown and signal dispatch ID |
| src/schema/MatchSchema.ts | Modified | 164-608 (multiple hunks) | scattered | Signal dispatch IDs, cooldown map, dispatch/barrier builders |
| src/utils/types.test.ts | Added | 1-63 | n/a | Runtime event guard tests |
| src/utils/types.ts | Modified | 62-151 | 61-61 | Runtime guard implementations for commander payloads |

## Instruction Files Reviewed

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md: Applied to tracking markdown artifact formatting.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md: Applied to wording and structure of tracking markdown artifacts.

## Review Plan Coverage

* [x] public/commander/app.js reviewed
* [x] public/commander/index.html reviewed
* [x] public/commander/styles.css reviewed
* [x] src/game/GameLoop.test.ts reviewed
* [x] src/game/GameLoop.ts reviewed
* [x] src/game/MatchRoom.test.ts reviewed
* [x] src/game/MatchRoom.ts reviewed
* [x] src/index.test.ts reviewed
* [x] src/index.ts reviewed
* [x] src/messages/protocol.ts reviewed
* [x] src/schema/MatchSchema.test.ts reviewed
* [x] src/schema/MatchSchema.ts reviewed
* [x] src/utils/types.test.ts reviewed
* [x] src/utils/types.ts reviewed

## Review Items

### 🔍 In Review

* None

### ✅ Approved for PR Comment

#### RI-1: Contained Leviathans Reactivate on Next Tick

* File: src/game/GameLoop.ts
* Lines: 220-223, 257-258
* Category: Functional correctness
* Severity: High

Comment Draft:
Containment appears to be non-terminal right now. The mitigation path marks a Leviathan as CONTAINED and sets statusEndTime to now, but updateStatusEffects resets any non-ACTIVE status when now >= statusEndTime. On the next tick this can reactivate previously contained Leviathans. Consider excluding CONTAINED from status expiry, or handling containment as a terminal status that never auto-expires.

Suggested change:
Update the status-expiry guard to skip CONTAINED and add a regression test proving contained Leviathans stay contained across subsequent ticks.

Applicable instructions:
* PR review mode: validate functional correctness and behavioral regressions against intended gameplay outcome.

User Decision: Approved

Follow-up Notes: Include regression test coverage for containment persistence.

#### RI-2: Signal Feed Uses Zero or Stale Timestamps Outside Tick Loop

* File: src/schema/MatchSchema.ts, src/game/MatchRoom.ts
* Lines: MatchSchema.ts 290, MatchRoom.ts 586-592, 658-665
* Category: Reliability and observability
* Severity: Medium

Comment Draft:
Signal timestamps currently come from metadata.now. Before the first tick, metadata.now is still 0, so early events like COMMANDER ONLINE and MATCH START can emit epoch/stale timestamps in the commander feed. Consider setting metadata.now immediately before out-of-tick emitSignal calls, or adding a fallback in addSignal to Date.now() when metadata.now is 0.

Suggested change:
Ensure out-of-tick signal events receive non-zero current timestamps and add a regression test for join/start signal timestamps.

Applicable instructions:
* PR review mode: evaluate observability and user-facing operational correctness.

User Decision: Approved

Follow-up Notes: Add test coverage for non-zero signal timestamps before first tick.

### ❌ Rejected / No Action

* None yet

## Risks and Open Questions

* No performance regressions were found in the new commander payload shaping paths.
* Runtime guard models were added and tested, but the plain JS commander scaffold does not consume those guards directly. This is acceptable for scaffold scope, but integration risk remains if untrusted payload channels are introduced.

## Next Steps

* [x] Complete Phase 1 initialization artifacts
* [x] Complete Phase 2 analysis and file-to-instruction mapping
* [x] Confirm user decision on RI-1
* [x] Confirm user decision on RI-2
* [x] Move approved items to PR-ready comments and generate handoff.md
