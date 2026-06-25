<!-- markdownlint-disable-file -->
# Task Research: Epic 4 Kaiju Player UX

Research deepens Epic 4 UX decisions to ensure gameplay-facing interfaces are intuitive for kaiju players, support rapid decision making, and avoid visual clutter.

## Task Implementation Requests

* Research Epic 4 UX requirements for kaiju players in this repository.
* Identify a UI information hierarchy that minimizes clutter while preserving critical tactical visibility.
* Evaluate alternatives and recommend one UX approach for Epic 4 implementation.
* Provide implementation-oriented examples tied to current files.

## Scope and Success Criteria

* Scope: Gameplay UX for kaiju-facing screens and interactions, with emphasis on cognitive load, readability, and signal-to-noise. Includes analysis of current web clients and game state/event surfaces. Excludes full visual redesign assets.
* Assumptions:
  * Epic 4 introduces or expands player-facing UX features rather than backend-only mechanics.
  * Kaiju players need real-time situational awareness and clear action affordances under time pressure.
  * Existing public clients and docs provide enough context for an evidence-based direction.
* Success Criteria:
  * Identifies concrete clutter risks in current implementation paths.
  * Defines a prioritized information architecture for kaiju players.
  * Recommends one UX direction with rationale and trade-offs.
  * Includes file-level references and practical implementation guidance.

## Outline

1. Gather current-state evidence from docs and code (kaiju + commander clients, game state schema, signaling/events).
2. Derive kaiju player tasks and decision cadence.
3. Evaluate UX alternatives focused on de-cluttering patterns.
4. Select one approach and map to implementation changes.

## Potential Next Research

* Validate Epic 4 acceptance criteria source (issue/spec) if available.
  * Reasoning: Could tighten constraints beyond inferred requirements.
  * Reference: Pending discovery.
* Validate target mobile viewport support and orientation policy.
  * Reasoning: Information hierarchy decisions differ significantly by vertical space.
  * Reference: public/kaiju/styles.css:508-511
* Confirm whether kaiju and commander must keep visual parity.
  * Reasoning: Parity constraints could limit kaiju-first simplification.
  * Reference: public/commander/index.html:19-85

## Research Executed

### File Analysis

* public/kaiju/index.html
  * Kaiju surface currently co-locates session controls, map, status, actions, spectator panel, feed, and continue overlay.
  * Evidence: public/kaiju/index.html:19-151
* public/kaiju/app.js
  * Kaiju decision loop is high frequency: heading actions, attack/ability readiness, containment/continue transitions.
  * Evidence: public/kaiju/app.js:492-505, public/kaiju/app.js:551-589, public/kaiju/app.js:773-829
* src/schema/MatchSchema.ts
  * Continue economy/timing is strict and central to containment UX.
  * Evidence: src/schema/MatchSchema.ts:757-759
* src/game/MatchRoom.ts and src/game/MatchRoom.test.ts
  * Containment, continue, spectator transitions are stable and tested.
  * Evidence: src/game/MatchRoom.ts:451-479, src/game/MatchRoom.ts:889-920, src/game/MatchRoom.test.ts:401-517
* src/messages/protocol.ts
  * Existing protocol already exposes kaiju action events and key state transitions; baseline UX improvements can be client-side.
  * Evidence: src/messages/protocol.ts:29-43, src/messages/protocol.ts:97-111

### Code Search Results

* Search theme: cooldown presentation
  * Duplicate cooldown surfaces are present in primary HUD (meters + list).
  * Evidence: public/kaiju/index.html:96-114
* Search theme: feed behavior
  * Feed prepends frequent events and retains 50 entries.
  * Evidence: public/kaiju/app.js:120-128, public/kaiju/app.js:795, public/kaiju/app.js:806, public/kaiju/app.js:819
* Search theme: mode transition
  * Spectator/contained flow handled via state-driven class toggles and overlays.
  * Evidence: public/kaiju/app.js:528-549, public/kaiju/app.js:591-614

### External Research

* Nielsen Norman Group: progressive disclosure and cognitive load reduction for feature-rich interfaces.
  * Findings:
    * Keep frequent actions and state always visible.
    * Move setup/history/rare controls into secondary layers.
    * Avoid extra disclosure levels and redundant representations.
  * Source: [NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
  * Source: [NN/g Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)
  * Source: [NN/g 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
* W3C WCAG 2.2 guidance:
  * Findings:
    * Avoid color-only state signaling.
    * Maintain sufficient text and non-text contrast for status and controls.
  * Source: [WCAG 2.2 Contrast Minimum 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  * Source: [WCAG 2.2 Non-text Contrast 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
* Game Accessibility Guidelines:
  * Findings:
    * Keep essential tactical information within immediate eye-line.
    * Use clear, large, well-spaced controls.
  * Source: [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)

### Project Conventions

* Standards referenced: Existing kaiju and commander client architecture in public/* and protocol/state contracts in src/*.
* Instructions followed: Task Researcher mode constraints and `.copilot-tracking` research document requirements.

## Key Discoveries

### Project Structure

* Kaiju UI currently prioritizes broad visibility over task-priority hierarchy.
* Commander UI is intentionally panel-heavy for strategic operations, and should not be mirrored 1:1 for kaiju tactical play.
* Existing room/protocol contracts already support a de-cluttered kaiju UX without backend/schema refactor.

### Implementation Patterns

* High-frequency kaiju tasks are attack cadence, ability timing, heading adjustment, and containment decisions.
* Current UI duplicates key state channels (cooldowns, feed density), increasing scan time.
* Continue flow is already event- and overlay-driven, enabling clean priority escalation.

### Complete Examples

```text
Recommended primary HUD hierarchy (active kaiju mode):

Level 0 (always visible):
- Status chip (ACTIVE / CONTAINED / SPECTATOR)
- HP compact meter
- Attack ready/cooldown
- Ability ready/cooldown
- Distance-to-base
- Credits (and continue timer when contained)
- Core actions (left, right, attack, ability)

Level 1 (quick reveal drawer/tabs, one active at a time):
- Map
- Events (top prioritized recent events)
- Session controls

Level 2 (interruptive overlays):
- Continue countdown overlay
- Match result / spectator transition overlays
- Critical reconnect guidance
```

### API and Schema Documentation

* Kaiju commands: `kaiju.move`, `kaiju.attack`, `kaiju.ability`, `kaiju.continue`.
  * Reference: src/messages/protocol.ts:29-43
* Core kaiju/server events: `match.start`, `signal.feed`, `kaiju.contained`, `kaiju.spectator`, `match.result`.
  * Reference: src/messages/protocol.ts:97-111
* Continue constraints: 3 credits, 10s window, 60% respawn HP.
  * Reference: src/schema/MatchSchema.ts:757-759

### Configuration Examples

```text
No protocol or schema changes required for baseline Epic 4 UX de-clutter.

Primary implementation files:
- public/kaiju/index.html  (layout hierarchy)
- public/kaiju/styles.css  (visual density, hierarchy, contrast)
- public/kaiju/app.js      (disclosure state, event prioritization)

Optional future extension:
- src/messages/protocol.ts (event severity metadata, only if needed)
```

## Technical Scenarios

### Scenario A: Minimal HUD with Progressive Disclosure

Kaiju gameplay is fast and repetitive, so the HUD should optimize immediate action readiness and survivability first, while deferring lower-frequency controls and full logs.

**Requirements:**

* Preserve always-visible tactical essentials.
* Reduce simultaneous panel competition.
* Keep containment/continue decisions dominant when active.
* Avoid protocol/schema changes unless strictly necessary.

**Preferred Approach:**

* Use a compact persistent tactical layer and progressive disclosure for map/session/history.
* Treat continue and match-result states as exclusive overlays.
* Tier event visibility: critical inline, full details in history.

```text
Target UI structure:

Kaiju Shell
|- Tactical Bar (persistent)
|  |- State + HP
|  |- Attack/Ability readiness
|  |- Distance + Credits
|  |- Core action controls
|- Context Region (single active view)
|  |- Map | Events | Session
|- Overlay Layer (conditional)
   |- Continue overlay
   |- Match result / reconnect overlay
```

**Implementation Details:**

* Move session controls behind default-collapsed context tab after successful join.
  * Reference: public/kaiju/index.html:19-36
* Keep only one cooldown representation in primary layer (button-level readiness), move verbose details to Events or tooltip.
  * Reference: public/kaiju/index.html:96-114
* Add event prioritization in kaiju feed renderer:
  * Critical: contained, continue expiry imminent, match result, disconnect.
  * Normal: move confirmations and low-impact logs.
  * Reference: public/kaiju/app.js:120-128
* Strengthen mode transitions with explicit state badge and aria labels for active/spectator/contained.
  * Reference: public/kaiju/app.js:528-549, public/kaiju/app.js:591-614
* Enforce non-color-only state indicators and contrast-safe controls.
  * Reference: public/kaiju/styles.css:190-209, public/kaiju/styles.css:344-352

```text
Implementation sequence (low risk):
1) Layout refactor in public/kaiju/index.html (no behavior change)
2) CSS hierarchy + spacing + contrast update in public/kaiju/styles.css
3) Disclosure state and event-tiering in public/kaiju/app.js
4) Continue overlay prominence tuning in public/kaiju/app.js
5) Optional protocol severity extension only if event-tiering needs server hints
```

#### Considered Alternatives

* Alternative 1: Panel-heavy dashboard
  * Benefit: lowest immediate engineering effort.
  * Rejected because: maintains current clutter and scan burden, weak fit for kaiju action cadence.
* Alternative 2: Full mode-based context switcher (Combat / Operations / History)
  * Benefit: hard separation and strong conceptual framing.
  * Rejected because: adds navigation overhead during split-second decisions unless supported by persistent mini-indicators.
* Selected: Minimal HUD with progressive disclosure
  * Why selected: best balance of anti-clutter goal, player decision speed, and low backend risk.

## Selected Approach and Rationale

Selected approach: Minimal HUD with progressive disclosure for Epic 4 kaiju UX.

Rationale summary:

* Aligns with kaiju decision loop frequency and containment urgency.
* Removes redundant or low-frequency information from primary scan path.
* Preserves all critical state visibility and continue flow salience.
* Can be implemented mainly in client files with existing protocol/state contracts.

## Actionable Next Steps

* Build a clickable low-fidelity wire in the existing kaiju client shell for three states: active, contained, spectator.
* Run a quick internal timing test on 3-5 tasks (attack-ready recognition, continue decision speed, spectator transition clarity).
* Lock event severity taxonomy before coding full event-tiering behavior.
* Confirm mobile viewport constraints and parity expectations with product/design stakeholders.
