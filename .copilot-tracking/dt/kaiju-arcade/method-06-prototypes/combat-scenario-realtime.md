# Kaiju Coordination Prototype: Real-Time Combat Scenario

## Roster Quick Reference

| Role | Range | Attack Pattern | Damage Per Attack |
|------|-------|-----------------|-------------------|
| **Sniper** | Long | Single-target | 12 |
| **Dozer** | Short | Area cone | 8 (to all in cone) |

---

## Match Start: 0:00 — Initial State

**Setup**: 4 kaiju vs. 1 Commander defending a city
- **You**: Sniper-1
- **Sniper-2**: Approaching from north
- **Dozer-1**: Approaching from west  
- **Dozer-2**: Approaching from south

**City Health**: 100 HP  
**Commander Resources**: 2 Barriers, 3 Jets  
**Kaiju Position**: All ~2 ranges out, inbound  

**The clock is running. 90 seconds to breach.**

---

## Decision Moment 1: 0:15 — First Contact

All kaiju now within attack range. Commander hasn't committed defense yet.

**Simultaneous Call**:

```
Sniper-1 (You):   [DECIDE]
Sniper-2:         Attack Target A
Dozer-1:          Move Closer
Dozer-2:          Move Closer  
```

**What does Sniper-1 do?**

- **Attack Target A** (coordinate with Sniper-2 for combo damage)
- **Attack Target B** (probe different defense zone)
- **Hold fire** (wait and see)

---

## Decision Moment 2: 0:35 — Dozers Engage

You attacked Target A at 0:15. The combo damage was visible. Commander raised a Barrier there.

Now **Dozers are in close range** and ready to attack. Sniper-2 is still attacking Target A.

**Simultaneous Call**:

```
Sniper-1 (You):   [DECIDE]
Sniper-2:         Attack Target A (again)
Dozer-1:          Attack (area cone, hits nearby targets)
Dozer-2:          Attack (area cone, hits nearby targets)
```

**What does Sniper-1 do?**

- **Stick with Target A** (pile on with the Snipers through the barrier)
- **Shift to Target B** (let the Dozers hit Target A with their area damage, you hit elsewhere)
- **Support the Dozers** (move to protect them, stop attacking)

---

## Decision Moment 3: 0:55 — End Game

30 seconds left. Commander is depleted: 1 Barrier gone, 2 Jets used up, 1 Barrier remaining.

**Simultaneous Call**:

```
Sniper-1 (You):   [DECIDE]
Sniper-2:         Attack Target A (final push)
Dozer-1:          Attack Target A (moving into melee range)
Dozer-2:          Attack Target A (supporting Dozer-1)
```

All kaiju are now converging on the same target. The city is weakening.

**What does Sniper-1 do?**

- **All-in on Target A** (finish the breach together)
- **Attack the Commander's last Barrier** (try to break it before Target A falls)
- **Hold position** (let the close-range kaiju finish)

---

## After All 3 Moments: Reflection

Once you call all three moments, we'll pause and analyze:

1. **What patterns emerged from your decisions?** (Concentrated? Adaptive? Experimental?)
2. **Which kaiju felt "sticky" together?** (Did you naturally protect/support anyone?)
3. **What did you *want* to communicate to Sniper-2 and the Dozers but couldn't?**
4. **Did the coordinated damage feel rewarding when it happened?**

---

## Ready to Go?

**Decision Moment 1 at 0:15**: Sniper-1 is in range. First contact with the city.

Choose one:

- **Attack Target A** (focus-fire with Sniper-2)
- **Attack Target B** (spread)
- **Hold fire** (wait and see)

What's your call?
