---
title: "Use Case — Commander Triage: Defense vs. Evacuation"
---

### Use Case Description

The Incident Commander manages two competing priorities in real time: dispatching defensive assets to slow kaiju advancement and triggering rocket launches to evacuate humans. Every decision has an opportunity cost.

### Use Case Overview

During a 90-second match, the Commander operates a dashboard showing leviathan positions, asset availability, and rocket launch readiness. They must continuously decide whether to spend their action window on a defensive dispatch (slow a kaiju, reduce base damage) or a rocket launch (bank evacuees directly). Kaiju threatening the launch site may suppress or cancel an in-progress launch, forcing the Commander to clear threats first.

### Business Value

This is the game's core design tension. Without a genuine tradeoff between defense and evacuation, the Commander's role collapses into one-dimensional button-pressing. The dual-priority loop is what makes the Commander feel like an incident commander rather than a tower defense operator.

### Primary User

The Incident Commander — solo player, no respawns, full match duration.

### Secondary User

Kaiju players — their aggression directly drives the urgency of the Commander's decisions. Spectators — watching the Commander's triage choices is part of the social experience.

### Preconditions

- Match has started; at least one kaiju is active and advancing
- Commander dashboard is live with asset economy and rocket launch UI visible
- City base HP is above zero

### Steps

1. Commander scans `CommandMap` for active leviathan positions and base threat level
2. Commander assesses asset availability in `DispatchPanel`
3. Commander evaluates rocket launch readiness (cooldown / launch window)
4. Commander decides: dispatch defensive asset targeting a specific leviathan, OR trigger a rocket launch
5. If dispatching: selects leviathan, selects asset; `CommandRecord` queues with 1–5s resolution delay
6. If launching: triggers launch; spool-up window begins; `SignalFeed` confirms launch queued
7. `SignalFeed` reports resolution outcome (success / partial / failed / unverified) for dispatches
8. Evacuation count increments on successful launch; Commander sees updated score
9. Loop repeats until city base HP reaches 0 or 90 seconds elapses

### Data Requirements

- Real-time leviathan positions, HP, and status
- Asset availability and cooldown state
- Rocket launch readiness and cooldown
- City base HP
- Current evacuation count / score
- `SignalFeed` event stream for resolution feedback

### Equipment Requirements

- Commander: laptop or desktop with the dashboard open in a browser
- Network: local Wi-Fi or hotspot; all players on the same session via room code

### Operating Environment

Co-located social setting — bar, home, event space. Ambient noise is expected and normal. Commander screen may be visible to spectators. Match duration is 90 seconds; the environment should support rapid round turnover.

### Success Criteria

- Commander made at least one meaningful triage decision (chose launch over defense or vice versa) and can articulate why
- Evacuation count reflects the Commander's choices — high score feels earned, not random
- Commander wants to immediately play another round to improve their score

### Pain Points

- If rocket launches are too easy (no risk, no constraint), the triage decision disappears
- If the dashboard is too information-dense for a 90-second match, the Commander spends more time parsing than deciding
- If `SignalFeed` resolution feedback is too slow or buried, the Commander can't learn from failed dispatches

### Extensions

- **Launch site threatened**: a kaiju within attack range of the launch site suppresses the launch; Commander must dispatch a defensive asset first
- **Multiple simultaneous kaiju breakthroughs**: Commander must triage which threat to address, accepting some base damage
- **Final seconds**: with base HP critically low, Commander may abandon defense entirely and spam launches to maximize evacuation count before city falls

### Evidence

- Source: Method 1 scope conversation (2026-06-23)
- Rocket launches as active Commander mechanic confirmed in scope
- Triage tension (defense vs. evacuation) identified as the game's core design heart
- 90-second match length confirmed as target
