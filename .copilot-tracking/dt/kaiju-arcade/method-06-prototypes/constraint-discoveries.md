# Method 6: Constraint Discoveries

## Prototype 1: Real-Time Coordination (Combat Scenario)

**Date**: 2026-06-24  
**Participants**: Solo playthrough (Sniper-1), simulated team  
**Assumption Tested**: "Players will discover emergent coordinated tactics through positioning and multi-pattern attacks"

---

## Constraint Discovery 1: Verbal Communication is the Coordination Layer

**Observation**: User clarified that kaiju coordinate through:
1. **Observation** of the screen (reading what other kaiju are doing)
2. **In-room verbal callouts** ("Attack now!", "Focus fire!", etc.)

**Implication**: No in-game chat/comms system needed. The shared physical space + screen view = the communication medium.

**Design Impact**:
- UI must make targeting/intent visible so players can read each other's moves
- Attack resolution must be instant (no queue, no lag) so verbal callouts sync with button presses
- Damage pops must be unmissable (bigger numbers, audio burst, visual effect) so coordinated hits are immediately obvious
- All players need the same visual frame of reference (shared screen, synchronized state)

**Severity**: HIGH — This shapes the entire Colyseus state machine and update loop

---

## Constraint Discovery 2: Coordinated Damage Feedback Works

**Observation**: In the playthrough, synchronized attacks on the same target produced amplified damage (combo).
- 0:15: Two Snipers hit Target A = visible damage pop (28 vs. 24 base)
- 0:35: Two Snipers + Two Dozers converge = Barrier broken in one round

**Player Response**: Recognized the pattern, committed fully, piled on in round 2.

**Implication**: The combo mechanic *teaches itself* through visual feedback. No tutorial needed.

**Design Impact**:
- Damage pop differential (bigger/bolder on combos) is sufficient feedback
- Players naturally repeat what worked
- Multi-pattern attacks (Sniper single-target + Dozer cone) converging on same target = memorable payoff

**Severity**: MEDIUM — Validates the core reward mechanism; implementation is straightforward

---

## Constraint Discovery 3: Concentration Over Distribution is Default Tactic

**Observation**: Across all three decision moments (0:15, 0:35, 0:55), the player chose concentrated fire, never spread.

**Pattern**:
1. Test concentration (0:15)
2. Double down on what worked (0:35)
3. Trust the team to finish (0:55)

**Implication**: Players naturally *cluster* attacks rather than spread. This suggests:
- The game will trend toward "all focus one target" rather than distributed pressure
- This might create strategic depth (do Dozers need to position defensively to spread aggro?)
- Or it might create a dominant tactic (concentration always wins)

**Design Impact**:
- Watch for "focus-fire dominance" when real playtesters arrive
- May need Commander defensive mechanics to punish clustering (e.g., area barriers that reward spreading)
- Sniper vs. Dozer range difference might naturally create distribution (Snipers focus from distance, Dozers spread area damage)

**Severity**: MEDIUM-HIGH — Requires playtesting with real humans to validate balance

---

## Constraint Discovery 4: Supporting Other Kaiju is a Valid Tactic

**Observation**: At 0:55, the player chose to "Hold Fire" and let the Dozers deliver the final blow.

**Implication**: Players will naturally shift from aggressive to supportive when the goal is near.

**Design Impact**:
- The game supports multiple playstyles (not just damage-dealing)
- "Protect the Dozer" or "let them finish" moments create narrative beats
- Consider reward mechanics for support plays (assists, shared score?)

**Severity**: LOW — Nice-to-have, validates social teamwork

---

## Method 6b: Feedback Planning

### Next Prototype: Real Players (Playtest)

**Objective**: Validate constraint discoveries with 1-2 actual players

**Test Scenario**: 3-4 person playtest with simplified attack mechanics (paper cards or clickable board)

**Observation Points**:
1. How quickly do new players discover the combo reward?
2. Does verbal communication ("attack now!") sync with simultaneous presses?
3. Do they naturally focus-fire, or do they spread? Why?
4. What communication breaks down? (What do they *want* to say but can't?)
5. Does the in-room atmosphere feel social/fun (Jackbox model), or tense/chaotic?

**Feedback Capture**: Observation notes + post-game debrief on clarity and satisfaction

---

## Handoff to Method 7

**Locked Constraints**:
- Communication layer: Observation + verbal callouts (not UI)
- Attack feedback must be instant and obvious (no lag)
- Damage pop differential teaches combo reward

**Design Risks to Mitigate**:
- Focus-fire dominance (watch for "just pile on one target" metagame)
- Verbal callout timing (latency between intention and button press could break sync)
- Screen visibility in group setting (all players need same visual frame)

**Implementation Priorities** (for Method 7):
1. Colyseus tick rate + client-side prediction for instant feedback
2. Damage number styling (size/color/font distinction on combos)
3. Real players playtesting to validate "focus-fire" balance
