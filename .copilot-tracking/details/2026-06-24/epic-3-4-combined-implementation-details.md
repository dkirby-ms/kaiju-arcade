<!-- markdownlint-disable-file -->
# Implementation Details: Epic 3 and Epic 4 Combined Implementation

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/epic-3-4-combined-research.md, .copilot-tracking/research/subagents/2026-06-24/epic-3-4-research.md, ISSUE-PREVIEW.md, .copilot-tracking/implementation-tasks.md, docs/multiplayer-game-design.md.

## Implementation Phase 1: Shared Baseline and Contract Audit

<!-- parallelizable: false -->

### Step 1.1: Confirm current client/server behavior against Epic 3 and 4 requirement matrix

Create a requirement-to-implementation matrix and mark each task as implemented, partial, or missing based on code evidence.

Files:
* .copilot-tracking/implementation-tasks.md - Source requirement checklist for Epic 3 and Epic 4.
* src/messages/protocol.ts - Command/event contract baseline.
* src/game/MatchRoom.ts - Broadcast and state transition baseline.
* src/schema/MatchSchema.ts - Continue and signal helper invariants.

Discrepancy references:
* Addresses DR-01 by explicitly mapping practical acceptance to implemented behaviors.

Success criteria:
* Every Epic 3 and Epic 4 task has a status and evidence note.
* Contract gaps requiring server work are explicitly isolated.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/epic-3-4-research.md (Lines 43-113) - requirements and architecture surfaces.

Dependencies:
* None.

### Step 1.2: Lock integration invariants and regression checkpoints

Define non-negotiable invariants to preserve during UI work: continue-window timing, contained terminal behavior, and signal timestamp validity.

Files:
* src/game/GameLoop.test.ts - Containment terminal regression target.
* src/schema/MatchSchema.test.ts - Signal timestamp fallback validation target.
* src/game/MatchRoom.test.ts - Continue/spectator transition validation target.

Success criteria:
* Invariant checklist is documented in implementation PR notes.
* Existing tests for invariants are identified and scheduled in validation phases.

Context references:
* .copilot-tracking/research/2026-06-24/epic-3-4-combined-research.md (Lines 48-59) - constraints and risks.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Define Epic 3 and Epic 4 combo scope guardrail

Create an explicit scope note used during implementation and code review: Epic 3 and Epic 4 may consume and display combo-related signals, but must not introduce or alter combo-mechanics generation, combo-window logic, or damage amplification formulas owned by Epic 5.

Files:
* .copilot-tracking/implementation-tasks.md - Source boundary between Epic 3 feed display tasks and Epic 5 combo mechanics tasks.
* public/commander/app.js - Allowed area for display-only combo representation.
* public/kaiju/app.js - Allowed area for display-only prioritization.

Discrepancy references:
* Addresses DR-03 by preventing scope bleed into Epic 5 mechanics.

Success criteria:
* Guardrail note is included in implementation notes and PR checklist.
* No Epic 5 mechanic files are modified unless explicitly re-planned.

Context references:
* .copilot-tracking/research/2026-06-24/epic-3-4-combined-research.md (Lines 53-55) - acceptance/gap context.
* .copilot-tracking/implementation-tasks.md (Lines 61-119) - Epic 3/4 tasks.
* .copilot-tracking/implementation-tasks.md (Lines 149-166) - Epic 5 combo tasks.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate phase changes

Run baseline validation before any functional changes.

Validation commands:
* npm run lint - repository lint scope (if script exists).
* npm test - baseline unit/integration test scope.

### Phase 1 Execution Record (2026-06-24)

#### Epic 3 and Epic 4 Requirement Matrix

| Epic | Task | Status | Evidence |
| --- | --- | --- | --- |
| 3 | 3.1.1 CRT phosphor + scan-line overlay | implemented | public/commander/styles.css (scan-line body background), public/commander/app.js (scan-line/radar overlay draw loop) |
| 3 | 3.1.2 Monochrome amber/green/red command palette | implemented | public/commander/styles.css (`--amber`, `--green`, `--red`, panel and signal styles) |
| 3 | 3.1.3 Uppercase condensed command labels | partial | public/commander/styles.css (`text-transform: uppercase`), but wording examples like THREAT LEVEL DELTA are not standardized everywhere |
| 3 | 3.1.4 Typewriter feed with blinking cursor | partial | public/commander/app.js (`appendSignal` typewriter reveal) without blinking cursor state |
| 3 | 3.1.5 Radar sweep animation for detection | implemented | public/commander/app.js (`drawCommandMap` sweep arc/trail and pulse blips) |
| 3 | 3.2.1 Leviathan selection via roster/map click | partial | public/commander/index.html + public/commander/app.js target select dropdown exists; direct map/roster click targeting is not wired |
| 3 | 3.2.2 Dispatch UI buttons for four assets | implemented | public/commander/index.html dispatch buttons + public/commander/app.js send handler |
| 3 | 3.2.3 Dispatch validation (cooldown/capacity/target) | implemented | src/game/MatchRoom.ts (`handleCommanderDispatch`) |
| 3 | 3.2.4 Send `commander.select` and `commander.dispatch` | implemented | public/commander/app.js send path in `sendDispatch` |
| 3 | 3.3.1 CommandMap positions with threat indicators | partial | public/commander/app.js renders leviathan blips and status colors; explicit severity-driven threat badges not present |
| 3 | 3.3.2 City base HP and damage state | partial | public/commander/app.js + index display base HP; explicit base damage state descriptor is missing |
| 3 | 3.3.3 Commander score including combo multiplier | partial | commander score shown via `commander.status`; combo multiplier display is not surfaced in commander UI |
| 3 | 3.3.4 Active barriers, assets, cooldown timers | implemented | src/game/MatchRoom.ts (`broadcastCommanderStatus`) + public/commander/app.js (`renderCommanderStatus`) |
| 3 | 3.3.5 Alert mode toggle visual feedback | missing | no alert-mode toggle control or state wiring in commander client |
| 3 | 3.4.1 SignalFeed typewriter + scrollback history | implemented | public/commander/app.js (`appendSignal`, capped history) |
| 3 | 3.4.2 Signal generation (mitigation/respawn/combo/base damage) | partial | src/game/MatchRoom.ts and src/game/GameLoop.ts emit multiple signal classes; combo-focused feed semantics remain incomplete |
| 3 | 3.4.3 Server broadcast of signal events | implemented | src/game/MatchRoom.ts (`broadcastSignalEntry`, `broadcastSignalsSince`) |
| 3 | 3.4.4 Match timer display and ETA-to-base | missing | no timer/ETA UI element in public/commander/index.html or render path in public/commander/app.js |
| 4 | 4.1.1 Bold silhouette kaiju skyline view | partial | kaiju UI uses tactical map and HUD styling, but no dedicated silhouette skyline scene |
| 4 | 4.1.2 Chunky vector kaiju/city rendering | partial | map and HUD markers exist; dedicated chunky vector scene renderer is not present |
| 4 | 4.1.3 Segmented HP bar with flicker on damage | partial | segmented HP bar exists in public/kaiju/app.js + styles; flicker-specific damage animation is not explicit |
| 4 | 4.1.4 Screen shake for heavy impact/base damage | implemented | public/kaiju/app.js (`triggerScreenShake`, commander-status delta trigger) + styles keyframes |
| 4 | 4.1.5 Flat neon outline style | implemented | public/kaiju/styles.css neon palette, borders, and glow style |
| 4 | 4.2.1 Move heading controls | implemented | public/kaiju/index.html move buttons + public/kaiju/app.js (`sendMove`) |
| 4 | 4.2.2 Attack button with cooldown | implemented | public/kaiju/app.js (`sendAttack`, attack cooldown state + meters) |
| 4 | 4.2.3 Archetype-specific ability button | implemented | public/kaiju/app.js (`ABILITY_BY_ARCHETYPE`, `setAbilityLabel`, `sendAbility`) |
| 4 | 4.2.4 Cooldown fill animations | implemented | public/kaiju/styles.css meter transitions + public/kaiju/app.js cooldown progress updates |
| 4 | 4.2.5 Send move/attack/ability messages | implemented | public/kaiju/app.js (`sendMove`, `sendAttack`, `sendAbility`) |
| 4 | 4.3.1 Display HP and max HP | implemented | public/kaiju/app.js (`renderStatus`, HP text + segmented bar) |
| 4 | 4.3.2 Display ability cooldown timers | implemented | public/kaiju/app.js (`renderCooldowns`) |
| 4 | 4.3.3 Damage taken pop feedback | implemented | public/kaiju/app.js (`spawnDamagePop`) + public/kaiju/styles.css damage-pop keyframes |
| 4 | 4.3.4 Distance-to-base indicator | implemented | public/kaiju/app.js (`calculateDistance`, distance text/fill) |
| 4 | 4.3.5 Damage pop style parity with commander feedback | partial | kaiju has damage pop animation; explicit cross-client parity contract is not codified |
| 4 | 4.4.1 CONTAINED handler with shatter overlay | implemented | public/kaiju/app.js (`playContainmentFx`) + public/kaiju/styles.css shatter animation |
| 4 | 4.4.2 INSERT COIN flashing + coin-drop cue | implemented | public/kaiju/index.html overlay text + public/kaiju/styles.css flash animation + audio cue in app.js |
| 4 | 4.4.3 10-second continue countdown | implemented | public/kaiju/app.js (`CONTINUE_WINDOW_MS`, `renderContinueOverlay`) |
| 4 | 4.4.4 Continue button message and credit consumption | partial | client sends `kaiju.continue` (public/kaiju/app.js), server consumes credit (src/game/MatchRoom.ts) |
| 4 | 4.4.5 Credit icon counter display | partial | numeric credits displayed (`kaijuCredits`); iconographic counters are not implemented |
| 4 | 4.4.6 GAME OVER overlay on exhausted credits | partial | game-over feed and spectator transition exist; dedicated GAME OVER overlay treatment is limited |
| 4 | 4.4.7 Spectator mode commander-style view with input lock | implemented | src/game/MatchRoom.ts emits `kaiju.spectator`; public/kaiju/app.js toggles spectator panel and disables input |

Matrix summary:
* Implemented: 22
* Partial: 16
* Missing: 2

Contract gaps requiring planned work in later phases:
* Commander alert-mode toggle and timer/ETA display are still missing.
* Several aesthetic and parity items are partial and should be closed in Epic 3 and Epic 4 UI phases.

#### Integration Invariants and Regression Checkpoints

Invariant 1: Continue timing remains authoritative and fixed at a 10-second window.
* Rule: Continue requests must succeed only while `now - containedAt < CONTINUE_WINDOW_MS` and credits remain.
* Source checkpoints: src/schema/MatchSchema.ts (`CONTINUE_WINDOW_MS`), src/game/MatchRoom.ts (`handleKaijuContinue`, `transitionExpiredContinuedKaijuToSpectators`).
* Regression tests: src/game/MatchRoom.test.ts (`allows kaiju continue inside the continue window`, `rejects kaiju continue after continue window expires`, `broadcasts kaiju.spectator exactly once when continue window expires`).

Invariant 2: Contained terminal behavior must not auto-expire back to ACTIVE by generic status expiry.
* Rule: `CONTAINED` is terminal until explicit continue logic restores ACTIVE.
* Source checkpoints: src/game/GameLoop.ts (status processing skips/guards contained entities), src/game/MatchRoom.ts (only `handleKaijuContinue` reactivates).
* Regression tests: src/game/GameLoop.test.ts (`keeps contained leviathans contained across ticks`) and contained-event ledger assertions in src/game/MatchRoom.test.ts (`broadcasts kaiju.contained once per containment event`).

Invariant 3: Signal timestamps are always non-zero, including pre-first-tick events.
* Rule: Signal entries must use `metadata.now` when initialized, otherwise fallback to wall-clock time.
* Source checkpoints: src/schema/MatchSchema.ts (`addSignal` timestamp fallback), src/game/MatchRoom.ts (`emitSignal` usage for join/start and status events).
* Regression tests: src/schema/MatchSchema.test.ts (`falls back to Date.now for signal timestamps before first tick`) and src/game/MatchRoom.test.ts (`records non-zero timestamps for commander join and match start signals`).

Regression execution checkpoint list for remaining phases:
* src/game/GameLoop.test.ts
* src/schema/MatchSchema.test.ts
* src/game/MatchRoom.test.ts

#### Epic 3 and Epic 4 Combo Guardrail (Epic 5 Boundary)

Guardrail statement:
* Epic 3 and Epic 4 scope is limited to consuming and presenting combo-related signals and score artifacts.
* Epic 3 and Epic 4 must not introduce or alter combo generation mechanics, combo-window logic, combo amplification formulas, or combat-resolution scoring formulas.
* Combo mechanics ownership remains in Epic 5 surfaces such as `GAME_CONSTANTS.COMBO_WINDOW_MS`, combo detection state in `src/game/GameLoop.ts`, and damage/scoring formulas in server-side combat logic.

Code review checkpoint for guardrail enforcement:
* Allowed in Epic 3 and Epic 4: UI display/render logic in public/commander/* and public/kaiju/*, protocol consumption in existing event handlers.
* Disallowed without re-plan: mechanic changes to combo timing/formulas in src/game/GameLoop.ts and src/schema/MatchSchema.ts.

## Implementation Phase 2: Epic 3 Commander Dashboard Completion

<!-- parallelizable: true -->

### Step 2.1: Implement remaining Commander UI visual and interaction requirements

Close feature-level gaps in the Commander dashboard including map/roster targeting parity, alert mode toggle behavior, and timeline visibility.

Files:
* public/commander/index.html - Add/adjust structural elements for alert/timeline/controls.
* public/commander/styles.css - Visual states, emphasis, and animation tuning.
* public/commander/app.js - State rendering, interaction wiring, feed/timeline behavior.

Discrepancy references:
* Addresses DR-01 by making acceptance-visible features explicit.

Success criteria:
* Epic 3 tasks 3.1.x to 3.4.x are marked implemented or intentionally deferred with rationale.
* Commander UI can select targets and dispatch assets with clear status feedback.
* Timeline/alert states are visible and behaviorally correct.

Context references:
* .copilot-tracking/implementation-tasks.md (Lines 61-86) - Epic 3 task requirements.
* .copilot-tracking/research/2026-06-24/epic-3-research.md (Lines 176-214) - gap and approach evidence.

Dependencies:
* Implementation Phase 1 completion.

### Step 2.2: Add or update Commander-focused tests where behavior changed

Update tests for any changed behavior and add coverage for new Commander UX/state logic where testable.

Files:
* src/game/MatchRoom.test.ts - Event/status behavior assertions if server payload behavior changes.
* src/messages/protocol.test.ts - Contract assertions if protocol updates are introduced.

Discrepancy references:
* Supports DR-03 by validating display-only changes without mechanic-layer drift.

Success criteria:
* Changed Commander behaviors are covered by deterministic tests.
* No unintended protocol contract drift.

Context references:
* src/messages/protocol.ts (Lines 62-111) - commander event contract surface.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate phase changes

Run targeted validation for Commander changes.

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/messages/protocol.test.ts - server/message regression checks.
* npm test -- src/index.test.ts - entry-point smoke path.

## Implementation Phase 3: Epic 4 Kaiju Mobile Client Completion

<!-- parallelizable: true -->

### Step 3.1: Implement kaiju HUD information hierarchy and decluttered tactical UI

Refine mobile-first kaiju interface to prioritize immediate tactical actions and critical state while progressively disclosing lower-priority panels.

Files:
* public/kaiju/index.html - Primary tactical layout and disclosure structure.
* public/kaiju/styles.css - Hierarchy, spacing, contrast, and mobile behavior.
* public/kaiju/app.js - Disclosure state logic and prioritized event rendering.

Discrepancy references:
* Supports DR-03 by keeping event prioritization display-focused.

Success criteria:
* Kaiju active-state UI keeps attack/ability/cooldown/HP/distance/credits in primary view.
* Non-critical panels are accessible but no longer competing with core controls.

Context references:
* .copilot-tracking/implementation-tasks.md (Lines 91-110) - Epic 4 feature 4.1-4.3 requirements.
* .copilot-tracking/research/2026-06-24/epic-4-kaiju-ux-research.md (Lines 168-244) - selected decluttering approach.

Dependencies:
* Implementation Phase 1 completion.

### Step 3.2: Finalize continue/spectator UX and credit countdown clarity

Ensure contained state transitions and continue interactions are highly visible and align with runtime rules.

Files:
* public/kaiju/index.html - Continue and spectator overlays/panels.
* public/kaiju/app.js - Countdown updates, continue action path, spectator lockout behavior.
* src/game/MatchRoom.ts - Only if additional event hooks are required for clarity.

Discrepancy references:
* Addresses DR-01 practical acceptance through explicit contained/continue behavior.

Success criteria:
* Continue countdown and credit consumption behavior are clear and consistent.
* GAME OVER and spectator transition are deterministic and non-interactive for kaiju controls.

Context references:
* docs/multiplayer-game-design.md (Lines 46-57) - continue constraints.
* src/schema/MatchSchema.ts (Lines 757-759) - continue constants.
* src/game/MatchRoom.ts (Lines 887-940) - continue/spectator transitions.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Add or update kaiju-side behavioral tests and validations

Add/update tests that validate continue/spectator transitions and any protocol-side assumptions introduced by UI changes.

Files:
* src/game/MatchRoom.test.ts - continue/spectator message behavior.
* src/schema/MatchSchema.test.ts - signal/timing edge validations if touched.

Success criteria:
* Continue/spectator regressions are covered.
* Existing invariants remain intact.

Context references:
* src/game/MatchRoom.test.ts (Lines 401-517) - existing continue/spectator coverage baseline.

Dependencies:
* Step 3.2 completion.

### Step 3.4: Validate phase changes

Run targeted validation for Kaiju-focused changes.

Validation commands:
* npm test -- src/game/MatchRoom.test.ts src/schema/MatchSchema.test.ts - continue and schema invariants.
* npm test -- src/index.test.ts - integration smoke.

## Implementation Phase 4: Full Integration and Release Readiness Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm test
* npm run build

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply direct fixes when isolated and low-risk.

### Step 4.3: Report blocking issues

When failures require larger architecture changes, document blockers and produce follow-on planning rather than broad in-phase refactors.

## Dependencies

* Node.js and npm tooling compatible with repository scripts.
* Existing Colyseus and TypeScript project setup.

## Success Criteria

* Epic 3 and Epic 4 requirement matrices show implementation-complete or explicitly deferred items with rationale.
* Commander and Kaiju clients both run with synchronized server state and preserve gameplay invariants.
* Full lint, test, and build validation passes for merged changes.
