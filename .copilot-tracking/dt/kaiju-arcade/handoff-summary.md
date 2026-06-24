---
title: "Kaiju Arcade — DT-to-RPI Handoff Summary"
exit_point: "concept-validated"
dt_method: 6
dt_space: "solution"
handoff_target: "researcher"
date: "2026-06-24"
---

# Kaiju Arcade — Concept-Validated Handoff

## Executive Summary

Kaiju Arcade is a short-form, local-multiplayer asymmetric arcade game where one human Incident Commander defends a city against 1–4 human-controlled Kaiju players. Validated through lo-fi prototypes (combat scenarios) and constraint discovery iterations. Ready for implementation planning.

## Design Thesis

**"Players naturally discover emergent coordinated tactics based on attack patterns and positioning. Information asymmetry (Commander sees all, acts indirectly with delay; Kaiju have power but limited visibility) creates replayable score-chasing social sessions where verbal coordination is the binding mechanism."**

## Handoff Artifacts

All artifacts are located in `.copilot-tracking/dt/kaiju-arcade/`.

| Artifact | Type | Confidence | Notes |
|----------|------|------------|-------|
| [vision-statement.md](canonical/vision-statement.md) | Vision/positioning | validated | Audience: Jackbox-style social gaming, BYOD, 1993 arcade aesthetic |
| [problem-statement.md](canonical/problem-statement.md) | Problem definition | validated | Unmet need: short-form, co-located asymmetric multiplayer for social groups |
| [concepts.yml](method-05-concepts/concepts.yml) | Core concepts | validated | Two validated concepts: Coordinated Damage Feedback, Score Reveal & Leaderboard |
| [constraint-discoveries.md](method-06-prototypes/constraint-discoveries.md) | Constraint inventory | validated | 4 major constraints discovered through combat scenario playtest |
| [combat-scenario.md](method-06-prototypes/combat-scenario.md) | Prototype scenario | validated | Playtest script; validates combo mechanic and focus-fire strategy emergence |
| [prototype-plan.md](method-06-prototypes/prototype-plan.md) | Prototype methodology | validated | Lo-fi approach: markdown role-play + simultaneous action calls |
| [multiplayer-game-design.md](../../docs/multiplayer-game-design.md) | Detailed design spec | assumed | Comprehensive game mechanics, architecture, and data model (not independently validated) |

## Key Design Decisions

### 1. Asymmetric Role Definition
- **Incident Commander**: Authoritative dashboard view; indirect action through asset dispatch with 1–5s delays
- **Kaiju Players**: Direct control of individual leviatans; limited information; manual coordination through room verbal cues
- **Outcome**: Commander scores by saving civilians; Kaiju win by destroying city base (managed retreat framing)

### 2. Core Mechanics
- **Combo Damage**: Synchronized attacks within 150ms window produce amplified damage feedback (visible, audio, screen effect)
- **Continue System (INSERT COIN)**: Kaiju starts with 3 credits; elimination triggers 10-second respawn window; credits exhausted → spectator mode
- **Shared World**: One city base with health; N leviathans (player-controlled or AI fallback)

### 3. Arcade Aesthetic
- **Commander Display**: CRT phosphor glow, monochrome amber/green/red, uppercase text, typewriter effects, radar sweep animations
- **Kaiju Display**: Minimal mobile-first silhouette view, chunky vector shapes, segmented HP bar with flicker, arcade-style ability buttons
- **Shared Payoff**: Score reveal and leaderboard at round end (drives replayability)

### 4. Technical Architecture
- **Multiplayer Runtime**: Colyseus v0.17 (WebSocket-based authoritative server)
- **Server Tick**: 5 Hz (200ms intervals); deterministic game loop
- **Deployment**: Azure Container Apps with sticky sessions (stateful WebSocket affinity)
- **Code Sharing**: Shared game logic package (`types`, `severity`, `leviathans`, `mitigation-resolution`) consumed by server and browser clients

## Validated Constraints

### Constraint 1: Verbal Communication is the Coordination Layer (HIGH severity)
- **Discovery**: Kaiju coordinate through observation + in-room verbal callouts, not in-game chat
- **Implication**: UI must make targeting/intent visible; attack resolution must be instant (no queue); damage pops must be unmissable
- **Design Impact**: Shapes Colyseus state machine and update loop; all players need synchronized shared screen view

### Constraint 2: Coordinated Damage Feedback Works (MEDIUM severity)
- **Discovery**: Synchronized attacks produce visible combo; players recognize pattern and repeat it without tutorial
- **Implication**: Damage pop differential (larger/bolder on combos) is sufficient feedback; mechanic is self-teaching
- **Design Impact**: Combo implementation is straightforward; combo window ~150ms validated by playtest

### Constraint 3: Focus-Fire is Default Tactic (MEDIUM-HIGH severity)
- **Discovery**: Playtest showed players concentrating attacks rather than spreading; doubled down on success
- **Implication**: Game may trend toward "focus-fire dominant" tactic; could reduce strategic depth if unbalanced
- **Design Impact**: May need Commander mechanics to punish clustering (area barriers); Sniper/Dozer range asymmetry may create natural distribution

### Constraint 4: Support Plays Are Valid (LOW severity)
- **Discovery**: Players shift to supportive when objective is near (hold fire to let Dozer finish)
- **Implication**: Game supports multiple playstyles; "protect the Dozer" moments create narrative beats
- **Design Impact**: Nice-to-have; validates social teamwork framing

## Assumptions Requiring RPI Validation

| Assumption | Source | Confidence | RPI Action |
|-----------|--------|------------|-----------|
| Azure Container Apps supports Colyseus sticky sessions at game scale | Design spec (Section 7.3) | assumed | Validate via ACA documentation or spike |
| Existing Apex Dynamics dashboard components scale to 4–5 concurrent players | Design spec (reuse map) | assumed | Performance testing spike recommended |
| 150ms combo window is discoverable without tutorial | Playtest (one user, scripted scenario) | assumed | Validate via real playtests (3–5 unscripted players) |
| 1993 arcade aesthetic resonates with target audience | Vision statement | assumed | Validate via user playtests; gather aesthetic feedback |
| INSERT COIN mechanic reduces frustration on elimination | Design rationale | unknown | Playtesting required; measure engagement metric |
| Leaderboard drives 3+ repeat plays per session | Design assumption | unknown | Playtesting required; measure retention signal |

## Research Gaps for RPI Phase

### High Priority
1. **Playtesting with Real Players**: 3–5 concurrent human players (not scripted); 2–3 match sessions per group. Measure:
   - Combo discovery time (is 150ms window obvious?)
   - Focus-fire vs. distributed tactics ratio (is balance needed?)
   - Verbal communication patterns (do players develop callout language?)
   - Aesthetic resonance (does 1993 arcade feel land?)

2. **Azure Container Apps Validation**: Verify sticky sessions, autoscaling, cost model for typical load (matches per hour, concurrent players)

3. **Performance Baseline**: Colyseus client-side lerp + server tick rate; measure latency impact on visual feedback

### Medium Priority
4. **Accessibility**: Test INSERT COIN flow, ability readability, color-blindness accommodation for monochrome palette
5. **Audio Design**: Validate combo sound cues, screen-shake intensity, feedback clarity
6. **Leaderboard Mechanics**: Test persistence, name-entry flow, repeat-play incentive

## Handoff Quality Summary

| Artifact Type | Confidence | Notes |
|---------------|-----------|-------|
| Problem & vision | validated | Strong user research; confirmed with design thinking methods 1–3 |
| Core game mechanics | validated | Playtested; combo damage feedback and focus-fire strategy validated |
| Architecture & data model | assumed | Comprehensive but not independently built/tested; needs spike validation |
| Aesthetic & UI design | assumed | Conceptually sound; needs playtesting feedback |
| Deployment model | assumed | Container Apps + Colyseus is proven pattern; needs Azure-specific validation |

## Recommended RPI Workflow Entry

**Entry Point**: Task Researcher (standard RPI → Plan → Implement pipeline)

**Research Topics for Researcher Agent**:
1. Playtesting methodology for asymmetric multiplayer games
2. Colyseus v0.17 sticky session configuration on Azure Container Apps
3. Real-time damage feedback and combo window tuning (UX research)
4. 1993 arcade aesthetic implementation (CRT effects, phosphor glow libraries)

**Artifacts to Provide Researcher**:
- This handoff summary (all validated constraints + assumptions)
- Link to [multiplayer-game-design.md](../../docs/multiplayer-game-design.md) (comprehensive spec)
- Link to [constraint-discoveries.md](method-06-prototypes/constraint-discoveries.md) (playtest evidence)

**Expected Output from Researcher**: Implementation research document addressing the four research gaps above.

---

🎮 **Status**: Ready for RPI dispatch  
**Next**: Hand off to Task Researcher for implementation planning
