<!-- markdownlint-disable-file -->
# Implementation Details: Kaiju UI Overhaul

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/kaiju-ui-overhaul-research.md, .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md, .copilot-tracking/research/2026-06-24/kaiju-client-ui-improvements-research.md, .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md.

## Implementation Phase 1: Integrated Kaiju Layout Baseline

<!-- parallelizable: false -->

### Step 1.1: Refactor kaiju HTML structure into integrated HUD

Replace context-switcher tabs and mutually hidden panels with a single integrated layout where map, status, controls, and feed are all present in one viewport structure.

Files:
* public/kaiju/index.html - Replace context switcher and panel grouping with integrated layout regions.

Success criteria:
* HTML no longer depends on session/map/feed context buttons for core workflow.
* Core gameplay regions are represented as persistent layout sections.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 24-33) - current tabbed architecture evidence.

Dependencies:
* None.

### Step 1.2: Remove visible reconnect token input from UI

Remove visible editable reconnect token controls and replace with user-facing copy that indicates reconnect is automatic for the active browser session.

Files:
* public/kaiju/index.html - Remove reconnect token label/input block.

Discrepancy references:
* Addresses DR-01 in planning log by implementing reconnect privacy without contract changes.

Success criteria:
* No reconnect token field is rendered in the kaiju UI.
* Session join controls remain usable.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 34-39) - token exposure evidence.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Implement integrated responsive CSS layout

Replace tab-visibility-centric CSS with integrated responsive grid styling that keeps tactical map visible and stacks sections effectively on small screens.

Files:
* public/kaiju/styles.css - Remove context-switching dependency and add integrated layout styles.

Success criteria:
* Map, feed, controls, and status are visible together on desktop layouts.
* Mobile layout keeps all core areas reachable without hidden tab switching.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 29-33) - existing hidden panel model.
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md (Lines 168-244) - progressive disclosure and hierarchy guidance.

Dependencies:
* Step 1.1 completion.

### Step 1.4: Validate phase changes

Run browser/manual checks to confirm integrated layout renders correctly.

Validation commands:
* npm test -- src/index.test.ts - baseline smoke path.

## Implementation Phase 2: WASD and Directional Input Model

<!-- parallelizable: false -->

### Step 2.1: Replace rotational controls with directional control surface

Introduce directional control buttons and add keyboard key-state management for WASD and optional arrows.

Files:
* public/kaiju/index.html - Replace move-left/move-right controls with four-direction cluster.
* public/kaiju/app.js - Replace button bindings with directional handlers and keydown/keyup listeners.

Success criteria:
* Directional controls are available via keyboard and touch/click controls.
* Existing attack/ability controls remain unchanged.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 40-48) - current movement control evidence.

Dependencies:
* Implementation Phase 1 completion.

### Step 2.2: Add vector-to-heading conversion and movement send gating

Compute directional vector from active key state, convert to heading, and send through existing throttled movement pathway with change threshold.

Files:
* public/kaiju/app.js - Add vector helper(s), heading normalization, and movement send thresholding.

Discrepancy references:
* Addresses DR-02 in planning log by selecting Alternative 2 without protocol change.

Success criteria:
* Cardinal and diagonal directional intent translate to stable heading updates.
* Movement send frequency remains bounded and does not spam server.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 86-132) - movement alternatives and selected approach.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Preserve lockouts for contained and spectator states

Ensure new input paths honor existing state gates so contained/spectator players cannot send movement control updates.

Files:
* public/kaiju/app.js - Apply lock checks in all new directional input code paths.

Success criteria:
* Contained and spectator lockouts remain behaviorally unchanged.
* Continue/spectator transitions still function correctly.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 69-77) - containment and movement constraints.

Dependencies:
* Step 2.2 completion.

### Step 2.4: Validate phase changes

Run movement-focused checks for directional control behavior.

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/game/GameLoop.test.ts - gameplay invariant checks for movement/containment-related behavior.

## Implementation Phase 3: Reconnect Privacy and Tactical Map Clarity

<!-- parallelizable: false -->

### Step 3.1: Decouple reconnect token handling from DOM inputs

Keep reconnect token entirely in storage/in-memory flow and continue auto-attach on join while removing any dependence on visible UI fields.

Files:
* public/kaiju/app.js - Remove reconnect input element references and use storage-backed token retrieval.

Discrepancy references:
* Addresses DR-01 in planning log by preserving reconnect functionality while removing exposure.

Success criteria:
* Reconnect token is persisted/consumed without visible editable UI exposure.
* Join flow still works with and without stored token present.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 34-39 and 151-164) - reconnect flow and targeted change regions.

Dependencies:
* Implementation Phase 1 completion.

### Step 3.2: Keep tactical map always visible and render-safe

Remove panel-toggling assumptions and ensure map resize/render loops are robust in always-visible mode.

Guardrail:
* Tactical map remains a read-only situational display. Do not add click-to-move or pointer-driven movement behavior in this phase.

Files:
* public/kaiju/app.js - Remove context panel toggling logic and map visibility gating.
* public/kaiju/styles.css - Ensure map container remains visible in integrated layout.

Success criteria:
* Tactical map is visible throughout normal play flow.
* Map resizing and draw loop continue functioning after layout changes.
* Pointer and click interactions do not issue movement commands.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 48-55 and 164-170) - map visibility and implementation regions.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Improve kaiju map movement readability

Port or adapt commander heading-indicator overlay treatment to kaiju map rendering to improve directional readability at a glance.

Files:
* public/kaiju/app.js - Extend map draw logic with heading indicators and labels where appropriate.
* public/commander/app.js - Reference-only source for style parity and implementation pattern.

Discrepancy references:
* Addresses DR-03 by implementing readability improvements without protocol expansion.

Success criteria:
* Player can visually infer kaiju heading/motion direction from map overlay.
* Rendering updates remain smooth and readable.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/kaiju-ui-improvements-subagent-research.md (Lines 56-64 and 170-173) - commander pattern reuse recommendation.

Dependencies:
* Step 3.2 completion.

### Step 3.4: Validate phase changes

Run reconnect/map-focused checks to validate behavior continuity.

Manual checks:
* Verify map interaction is read-only and does not alter movement intent.
* Verify attack and ability cooldown indicators progress and recover exactly as before refactor.

Validation commands:
* npm test -- src/messages/protocol.test.ts src/schema/MatchSchema.test.ts - protocol/schema regression checks.

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute full lint, build, and test validation after all kaiju overhaul changes.

### Step 4.2: Fix minor validation issues

Apply straightforward fixes for isolated issues discovered in lint/build/tests.

### Step 4.3: Report blocking issues

Document blockers requiring additional research or planning when fixes exceed minor scope.

## Dependencies

* Node.js and npm project toolchain.
* Browser manual QA for kaiju client UX behavior.

## Success Criteria

* Kaiju UI overhaul requirements are implemented through a validated phased workflow without breaking core gameplay invariants.
* Tactical map remains read-only while always visible in integrated layout.
* Attack and ability cooldown behavior remains continuous and functionally unchanged after overhaul changes.
