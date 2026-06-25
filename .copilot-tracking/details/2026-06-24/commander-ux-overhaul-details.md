<!-- markdownlint-disable-file -->
# Implementation Details: Commander UX Overhaul

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md, .copilot-tracking/research/subagents/2026-06-24/commander-ux-layout-research.md, public/commander/index.html, public/commander/styles.css, public/commander/app.js, src/index.test.ts.

## Implementation Phase 1: Baseline and UX Contract Lock

<!-- parallelizable: false -->

### Step 1.1: Confirm acceptance baseline and front-end contract boundary

Lock implementation scope to commander front-end restructure while preserving server and protocol contracts unless a blocker is discovered.

Files:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md - Acceptance baseline and recommended implementation path.
* src/messages/protocol.ts - Verify commander status and dispatch contracts remain unchanged.
* src/game/MatchRoom.ts - Verify activeBarriers and status broadcast semantics are stable.

Discrepancy references:
* Addresses DR-01 by ensuring no accidental backend contract churn is introduced by UX work.

Success criteria:
* Scope note explicitly states front-end-only change boundary.
* No planned edits to protocol or room state contracts for core UX overhaul.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 13-25)

Dependencies:
* None.

### Step 1.2: Define timeline-removal and feed parity guardrail

Document the rule that timeline is removed from player-facing UI while key event visibility remains in signal feed.

Files:
* public/commander/index.html - Timeline section removal target.
* public/commander/app.js - Timeline side-effect removal target.

Discrepancy references:
* Addresses DR-02 by preserving event auditability in feed after timeline removal.

Success criteria:
* Guardrail is recorded in implementation notes and code review checklist.
* All timeline-driven event messages remain observable through feed pathway.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 163-181)

Dependencies:
* Step 1.1 completion.

### Step 1.3: Validate baseline before layout refactor

Run baseline validations to ensure pre-change behavior is known.

Validation commands:
* npm test -- src/index.test.ts - current commander scaffold assertions.
* npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts - contract stability baseline.

## Implementation Phase 2: Map-Stage HUD Layout Refactor

<!-- parallelizable: false -->

### Step 2.1: Rebuild commander markup into map-stage and HUD cards

Replace sequential grid flow with map-stage-first structure and map-anchored tactical cards.

Files:
* public/commander/index.html - Introduce map-stage wrapper, HUD anchors, feed overlay card, status card, dispatch card, and compact session card.

Discrepancy references:
* Addresses DR-03 by selecting Alternative A overlay architecture from research.

Success criteria:
* Commander main layout uses one map-stage container.
* Timeline section is removed from player-facing markup.
* Existing target selector and dispatch controls remain present in new HUD card locations.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 103-131)

Dependencies:
* Implementation Phase 1 completion.

### Step 2.2: Replace styles with viewport-locked overlay HUD system

Implement 100dvh no-scroll shell and responsive HUD card positioning around the map.

Files:
* public/commander/styles.css - Replace panel-grid stacking with map-stage relative positioning, card anchoring, card max-size constraints, and mobile compact behavior.

Success criteria:
* Desktop layouts (1280x720 and 1920x1080) avoid body/page scroll during normal operation.
* Feed overlay, status card, and dispatch controls remain readable and actionable without overlapping critical map content at supported breakpoints.
* Mobile breakpoint behavior avoids long linear stack.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 44-57)
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 196-214)

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate phase changes

Run targeted validation for new layout shell and page structure.

Validation commands:
* npm test -- src/index.test.ts - ensures scaffold remains valid after markup rewrite.

Manual validation checklist:
* 1280x720: confirm no document/body scroll during target selection, dispatch, and feed review interactions.
* 1920x1080: confirm no document/body scroll during target selection, dispatch, and feed review interactions.
* <=880 viewport width: confirm compact overlays remain operable without long linear panel stack.

## Implementation Phase 3: Commander UI Logic and Semantics Cleanup

<!-- parallelizable: true -->

### Step 3.1: Remove timeline side-effects and preserve feed-driven event visibility

Refactor commander client logic so signal processing no longer appends timeline entries while retaining feed reveal, severity classes, and dispatch-result visibility.

Files:
* public/commander/app.js - Remove or gate timeline append calls and associated references not needed in player-facing mode.

Discrepancy references:
* Addresses DR-02 by reducing behavior coupling risk from timeline removal.

Success criteria:
* `appendSignal` no longer writes to timeline containers.
* No orphan timeline DOM lookups remain that can throw errors.
* Signal feed behavior (typewriter, severity styling, capped history) remains intact.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 73-91)
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 163-169)

Dependencies:
* Implementation Phase 2 completion.

### Step 3.2: Normalize status semantics and labels

Align status card to tactical scalar fields and keep asset inventory details in dispatch card.

Files:
* public/commander/index.html - Update labels and status card structure.
* public/commander/app.js - Keep render mapping aligned to BASE HP, COMMANDER SCORE, ACTIVE BARRIERS, and CURRENT TARGET.

Success criteria:
* Status fields match tactical snapshot model without mixing inventory semantics.
* Dispatch asset status list remains authoritative for per-asset remaining/cooldown details.
* Commander UI includes explicit semantics cue (microcopy or tooltip) that ACTIVE BARRIERS reflects live barrier entities while other mitigation availability appears in dispatch inventory and cooldown rows.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 93-102)
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 140-158)

Dependencies:
* Step 3.1 completion.

### Step 3.3: Validate phase changes

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts - confirm commander contract behaviors remain intact.

Manual validation checklist:
* Select target from map and confirm selected target state reflects the intended leviathan id.
* Dispatch to selected target and confirm dispatch result/feed messaging references expected target context.
* Trigger barrier deployment and confirm active barrier count increments.
* Wait through barrier expiry window and confirm active barrier count decays back down.

## Implementation Phase 4: Test and Regression Updates

<!-- parallelizable: true -->

### Step 4.1: Update scaffold assertions to new commander HUD anchors

Replace timeline-id checks with HUD-structure checks aligned to refactored commander markup.

Files:
* src/index.test.ts - Update commander page assertions to new stable IDs/classes (map-stage and HUD card anchors).

Discrepancy references:
* Addresses DR-04 by removing test coupling to deleted timeline scaffold.

Success criteria:
* Tests no longer assert `matchElapsed`, `etaToBase`, or `timelineFeed` IDs.
* Tests assert new commander HUD structure and still verify serving route correctness.

Context references:
* .copilot-tracking/research/2026-06-24/commander-ux-layout-research.md (Lines 177-181)

Dependencies:
* Implementation Phase 2 completion.

### Step 4.2: Validate commander regression coverage

Validation commands:
* npm test -- src/index.test.ts src/game/MatchRoom.test.ts src/messages/protocol.test.ts

### Step 4.3: Validate tactical status semantics communication

Confirm status card and dispatch card messaging make metric ownership explicit.

Files:
* public/commander/index.html - Status card microcopy/tooltip target.
* public/commander/styles.css - Assistive visual treatment for semantics cue if required.

Success criteria:
* ACTIVE BARRIERS metric meaning is visible in-player without reading external docs.
* Commander can identify where non-barrier mitigation inventory and cooldown details live.

## Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for modified code paths and global project health:
* npm run lint
* npm run build
* npm test -- --silent

### Step 5.2: Fix minor validation issues

Apply straightforward corrections for isolated lint/test/build issues caused by the commander overhaul.

### Step 5.3: Report blocking issues

When failures require large structural changes or unrelated toolchain upgrades, document blockers and recommend follow-on planning rather than broad inline refactors.

## Dependencies

* Node.js and npm toolchain.
* Existing commander front-end architecture in public/commander.

## Success Criteria

* Commander map-stage HUD is implemented with no-scroll primary UX.
* Timeline is absent from player-facing commander layout without contract regressions.
* Updated tests and final validation confirm behavior stability.