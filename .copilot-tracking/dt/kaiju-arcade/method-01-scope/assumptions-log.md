# Method 01 — Assumptions Log

> Known facts vs. things we're assuming but haven't validated. 2026-06-23.

## Known Facts

- Existing codebase has: `CommandMap`, `LeviathanRoster`, `DispatchPanel`, `SignalFeed`, `mitigation-resolution.ts`, `leviathans.ts`, `severity.ts`, `lastStandCities.ts`, `LastStandScene.tsx`
- Colyseus v0.17 selected for multiplayer architecture — `Room`/`Schema` model maps onto match structure
- Azure Container Apps selected for hosting with sticky sessions
- `Evac Sector` dispatch already yields no knockback — maps cleanly to evacuation-focused reuse
- `Raise Barrier` currently only contributes knockback — needs new base-damage-reduction effect
- Design doc Section 10 vertical slice already scopes to 1 kaiju + 1 credit for first milestone
- Kaiju always win (established in scope conversation — not in original design doc)

## Assumptions to Validate

| Assumption | Confidence | How to validate |
|---|---|---|
| 90 seconds feels right for a round | Low — gut feel only | Playtest with real players; time a manual walkthrough |
| Unlimited kaiju respawns don't break game balance | Low | Playtesting; Commander may feel helpless without some respawn cost |
| BYOD local is the primary play mode | Medium | Talk to potential players; check if anyone would play this remotely |
| First responders are a natural audience | **Resolved — not the primary target** | General social gaming audience. First responders may enjoy it but require no special design consideration. |
| Rocket launches as active mechanic adds tension (not busywork) | Low | Playtest; may feel like too many things to manage in 90 seconds |
| High score leaderboard drives replayability | Medium | Arcade precedent is strong; still needs a target score to feel meaningful |
| The "managed retreat" framing is legible to players without explanation | Low | First-time players may expect to win as Commander |
