---
title: "Use Case — Kaiju Combo Attack"
---

### Use Case Description

Two or more kaiju players coordinate their attacks in real time — verbally, in the room — to trigger a combo that amplifies damage beyond what any single kaiju could deal alone.

### Use Case Overview

During a match, kaiju players in the same physical space recognize an opportunity to combine their abilities. One player may have a buff/debuff ability active (e.g. Roar, Submerge), while another is positioned to strike the city base or a Commander asset. Without any in-game tutorial, the combo emerges from verbal negotiation: "I'm using Roar — everyone hit it now." The game detects the sequenced or simultaneous inputs and applies an amplified damage event.

### Business Value

Combo mechanics transform kaiju from independent attackers into a coordinated team without requiring complex UI or pre-game tutorials. They make the physical co-location of players a mechanical advantage — a feature that online play cannot replicate. Combos create the game's most memorable moments: the room erupts when one lands.

### Primary User

Kaiju players — 2 to 4 in the same room, coordinating verbally.

### Secondary User

Spectators — eliminated players and observers who witness the combo result on screen and react in the room. Commander — receives the amplified threat event and must respond.

### Preconditions

- At least two kaiju players are active (not in spectator mode)
- At least one kaiju has an ability with combo potential available (not on cooldown)
- Players are in physical proximity and can communicate verbally

### Steps

1. Kaiju Player A activates a buff/setup ability (e.g. Roar — buffs nearby kaiju attack)
2. Player A calls out verbally: "I'm buffed — everyone attack!"
3. Kaiju Players B (and C) trigger their attacks within the combo window
4. Server detects combo condition (simultaneous or sequenced inputs within threshold)
5. Amplified damage event fires on city base or target
6. Kaiju screens show a distinct visual feedback for the combo landing (flash, shockwave, screen shake)
7. Commander's `SignalFeed` receives a notable event entry
8. Room reacts to the spectacle

### Data Requirements

- Per-kaiju ability state (active, cooldown, type)
- Combo detection window (time threshold for sequenced inputs)
- Amplification multiplier per combo type
- Combo event broadcast to all clients for visual feedback

### Equipment Requirements

- Each kaiju player: phone or tablet running the kaiju client
- Physical co-location: players must be able to hear each other without in-game voice chat

### Operating Environment

Same room as Commander and other players. Noise is expected and desirable. No internet voice channel required — verbal coordination is the mechanic.

### Success Criteria

- A first-time player discovers a combo exists within their first match without reading instructions
- The combo landing produces a visible, audible, and social moment in the room
- Commander acknowledges the threat visually — the combo registers as a meaningful escalation

### Pain Points

- If combo windows are too short, verbal coordination can't keep up in real time
- If kaiju ability icons are unclear, players won't know when a combo opportunity exists
- If the combo feedback is too subtle, the room won't react and the moment is lost

### Extensions

- **Three-kaiju combo**: all three active kaiju land attacks within a single window — maximum amplification tier
- **Interrupted combo**: Commander deploys Raise Barrier or Scramble Jets mid-window, partially negating the combo — rewards good Commander reads
- **Failed coordination**: players call for a combo but miss the window — creates a funny failure moment rather than frustration

### Evidence

- Source: Method 3 synthesis (2026-06-23)
- Kaiju cooperative mechanics confirmed in synthesis; verbal in-room coordination identified as the coordination layer
- Roar ability in design doc Section 4.2 already seeds combo potential (`buffs nearby kaiju`)
- Theme 2 (Room Is the Third Mechanic) and HMW-04 directly inform this use case
