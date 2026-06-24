# Kaiju Coordination Prototype: Combat Scenario

## Roster Quick Reference

| Role | Range | Attack Pattern | Damage Per Attack |
|------|-------|-----------------|-------------------|
| **Sniper** | Long | Single-target | 12 |
| **Dozer** | Short | Area cone | 8 (to all in cone) |

---

## Initial State: Phase 1 (0-15 seconds)

**Setup**: 4 kaiju attacking a fortified city
- **You**: Sniper-1 (ranged)
- **Simulated**: Sniper-2 (ranged)
- **Simulated**: Dozer-1 (short-range)
- **Simulated**: Dozer-2 (short-range)

**Commander Position**: Fortified center city  
**City Health**: 100 HP  
**Kaiju Positions**: All inbound, ~2 ranges out  
**Commander Resources**: 2 Barriers, 3 Jets ready

---

## Phase 1 Turn: What Do You Do?

**You are Sniper-1.** Other kaiju are waiting to see how you coordinate. You can:

- **Attack Target A** (focused fire on one point)
- **Attack Target B** (spread damage to different zone)
- **Move Closer** (position shift)

**What gets called out**:

```
Sniper-1 (You): [Your Action]
Sniper-2: [Auto-simulated: Attack Target A]
Dozer-1: [Auto-simulated: Move Closer]
Dozer-2: [Auto-simulated: Move Closer]
```

**What does Sniper-1 do?**

---

## Phase 1 Outcome (Once You Decide)

### Scenario A: "Sniper-1 + Sniper-2 Both Attack Target A" (Focused Fire)

**Damage Resolution**:
- Sniper-1: 12 damage to Target A
- Sniper-2: 12 damage to Target A (same target = combo amplification)
- **Combo Effect**: Damage pops bigger/bolder when both hit same target
- **Total Damage to Target A**: 28 (instead of 24 base)
- Dozer-1 & Dozer-2: Move closer (no damage yet, positioning)

**City Health**: 100 → 72 HP

**Commander Response**:
- Raises 1 Barrier over Target A
- Prepares Jets for next round

---

### Scenario B: "Sniper-1 Attacks Target A, Snipers Spread" (Distributed Fire)

**Damage Resolution**:
- Sniper-1: 12 damage to Target A
- Sniper-2: 12 damage to Target B (different target = no combo)
- Dozer-1 & Dozer-2: Move closer

**City Health**: 100 → 76 HP

**Commander Response**:
- Raises 1 Barrier (covers both zones loosely)
- Scrambles 1 Jet

---

## Key Observation Points

1. **Do you immediately focus-fire with Sniper-2, or spread damage?**
   - _Emergent Strategy Indicator: Concentration vs. distribution mindset_

2. **When Dozers "move closer," does that change your thinking about next round?**
   - _Emergent Strategy Indicator: Positioning awareness + support thinking_

3. **If focused fire deals more damage, do you call for it again, or try new tactics?**
   - _Emergent Strategy Indicator: Risk vs. exploration trade-off_

---

## Phase 2 Turn: Next Round

**Dozers are now in short range.** What do they do when they attack?

**You still have**: Sniper-1 (ranged, 12 damage single-target)

**What's your move for Phase 2?**

---

## Ready to Play?

Call out Sniper-1's action for Phase 1. I'll resolve the combo damage and see what strategy emerges.
