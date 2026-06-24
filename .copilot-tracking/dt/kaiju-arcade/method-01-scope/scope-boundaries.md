# Method 01 — Scope Boundaries

> Rough capture. Conversational, not a requirements doc. 2026-06-23.

## In Scope

- **BYOD local co-located multiplayer** — everyone in the same room, own devices, join via code (Jackbox model)
- **90-second match rounds** — short, high-energy, arcade-paced
- **Asymmetric roles** — 1 Commander vs. 1–4 Kaiju players
- **Kaiju always win eventually** — Commander scores by evacuating humans, not by defeating kaiju
- **Commander triage loop** — balance defensive dispatches vs. triggering rocket launches
- **Rocket launches as active Commander mechanic** — not passive; Commander decides when to launch and bears the risk/opportunity cost
- **INSERT COIN as death flash + respawn** — unlimited kaiju respawns, no credit management, press key to return
- **Commander plays the full match** — no respawns, no second chances
- **High score leaderboard** — evacuation count persists via Azure Table Storage; player enters initials on score screen (classic arcade entry); cloud-backed across sessions
- **Arcade aesthetic** — 1993 quarter-muncher vibe; phosphor/CRT on Commander screen, chunky vector kaiju on mobile
- **Attract mode** — idle lobby replays last match as silent demo loop

## Out of Scope (first cut)

- Online async matchmaking — share-code lobbies only for now
- Commander co-op (multiple operators) — open question, not yet decided
- Per-archetype kaiju abilities — deferred; AI/tuning first
- Reconnect grace window / Redis room migration — infrastructure complexity, defer
- Colyseus multi-replica room discovery — single-replica-per-room sufficient at target scale initially
- Full combo/multiplier score system — defer; evacuation count is the primary score

## Open Questions

1. **What constrains rocket launches?** Options: kaiju can threaten the launch site; spool-up window (commit 10–15s in advance); limited launch slots per match. Not yet decided.
2. **Co-op Commander?** Multiple operators sharing the dashboard — changes who the game is for significantly.
3. **How many kaiju slots?** 1–4 per design doc; balance implications for 90-second rounds not yet tested.
4. **INSERT COIN on same archetype or new pick?** Simplified to press-to-respawn but archetype choice on continue is still unresolved.
5. ~~**Leaderboard scope**~~ — **Resolved**: Azure Table Storage, cloud-backed, persistent across sessions. Player enters initials on the score screen (classic arcade entry).
