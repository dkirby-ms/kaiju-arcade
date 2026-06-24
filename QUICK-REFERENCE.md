# ⚡ Kaiju Arcade — Quick Reference Card

## 🚀 Get Started in 5 Minutes

### 1. Create GitHub Issues (Pick One)
```bash
# Bash
./create-issues.sh

# Python
python3 create_issues.py
```

### 2. Review Issues
- Go to GitHub → Issues tab
- Filter by label: `epic`, `tier-1`, `tier-2`, `tier-3`

### 3. Assign Work
- Tier 1 (Infrastructure): EPIC 1 + 2 → Backend Team
- Tier 2 (Gameplay): EPIC 3-8 → UI + Gameplay Teams (parallel)
- Tier 3 (Polish): EPIC 9-12 → DevOps + QA Teams (parallel)

---

## 📋 Epic Overview (12 Total)

### Tier 1: Infrastructure (Week 1-2)
| Epic | Title | Focus | Tasks |
|------|-------|-------|-------|
| **1** | Multiplayer Infrastructure | Colyseus server, messages, 5 Hz tick | 13 |
| **2** | Game State & Lifecycle | Match init, outcomes, persistence | 12 |

### Tier 2: Gameplay (Week 2-5, parallel after Tier 1)
| Epic | Title | Focus | Tasks |
|------|-------|-------|-------|
| **3** | Commander Dashboard | CRT aesthetic, asset dispatch | 18 |
| **4** | Kaiju Mobile Client | Silhouettes, abilities, INSERT COIN | 22 |
| **5** | Combat & Mechanics | Damage, combos, mitigation | 21 |
| **6** | Scoring & Outcomes | Commander score, leaderboard | 12 |
| **7** | AI & NPC Behavior | AI Kaiju, slot fallback | 8 |
| **8** | Attract Mode & Lobby | Demo loop, matchmaking | 8 |

### Tier 3: Polish & Deploy (Week 4-8, parallel)
| Epic | Title | Focus | Tasks |
|------|-------|-------|-------|
| **9** | Audio & Visual Effects | Sounds, particles, screen shake | 10 |
| **10** | Deployment & Infrastructure | Docker, Azure Container Apps | 15 |
| **11** | Testing & Validation | Unit, integration, playtests | 12 |
| **12** | Documentation | Guides, runbooks, onboarding | 10 |

**Total**: 12 Epics, 12 Features, 45+ Tasks

---

## 🎮 Game Mechanics at a Glance

### Roles
- **1 Commander** (Dashboard): Indirect control, sees all, acts with 1-5s delay
- **1-4 Kaiju** (Mobile): Direct control, limited info, power but fragile

### Core Loop
1. Kaiju advance on city base
2. Commander dispatches assets (Scramble Jets, Deploy Mechs, Raise Barrier, Evac Sector)
3. Assets hit Kaiju with delay + uncertainty
4. Kaiju take damage, knockback; base takes damage
5. **Synchronized attacks = combo = amplified damage** (150ms window) ← **KEY MECHANIC**
6. Kaiju eliminated → INSERT COIN (10s window, 3 credits) → respawn or spectate
7. Match ends: Base destroyed (Kaiju win) OR all Kaiju contained (Commander wins)
8. Score reveal → Leaderboard → Play Again

### Validated Constraints
✅ Verbal communication is enough (no in-game chat needed)  
✅ Combo feedback self-teaches (150ms window works)  
✅ Players focus-fire by default (may need balance tuning)  
✅ Support plays are rewarding (social mechanic works)  

---

## 🏗️ Architecture Summary

### Tech Stack
- **Server**: Colyseus v0.17, Node.js 22 LTS, WebSocket
- **Clients**: Commander (React/Web), Kaiju (Mobile-friendly Web)
- **Infrastructure**: Azure Container Apps, Container Registry
- **Database**: (TBD - leaderboard persistence)

### Data Model
```
MatchSchema
├── CityBase { hp, hpMax, position }
├── Leviathan[] { hp, position, heading, claimedBy, credits }
├── CommanderScore { mitigations, combos, score }
├── Signals[] { timestamp, event }
└── Outcome? { 'kaiju' | 'commander' | 'indeterminate' }
```

### Message Types
| Direction | Messages |
|-----------|----------|
| Client → Server | commander.select, commander.dispatch, kaiju.move, kaiju.attack, kaiju.ability, kaiju.continue |
| Server → Client | State patches, signal events, match.result, kaiju.contained |

---

## 📊 Timeline

| Phase | Week(s) | Focus | Epics | Gate |
|-------|---------|-------|-------|------|
| 1 | 1-2 | Infrastructure | 1, 2 | Colyseus server running, 5 concurrent clients |
| 2A | 2-4 | Player UIs | 3, 4 | Both clients connected, state synced |
| 2B | 2-3 | Combat/Scoring | 5, 6 | Combat resolution working, combos validated |
| 3 | 4-5 | AI/Effects | 7, 8, 9 | Full game loop, internal playtest ready |
| 4 | 6-7 | Deploy/Test | 10, 11 | Production ready, load tested, monitored |
| 5 | 7-8 | Docs | 12 | Onboarding material complete |

**Critical Path**: ~8 weeks with parallel teams. 14+ weeks of task hours distributed.

---

## 🎯 Success Criteria by Phase

### Phase 1 ✅
- [ ] Colyseus server initialized
- [ ] MatchSchema defined
- [ ] 5 Hz tick loop stable
- [ ] Multi-client connections work
- [ ] All message types routed correctly

### Phase 2 ✅
- [ ] Commander sees all game state
- [ ] Kaiju client responsive to input
- [ ] Damage calculation correct
- [ ] Combo window (150ms) fires correctly
- [ ] Commander score increments
- [ ] INSERT COIN respawn works
- [ ] All players see synchronized state

### Phase 3 ✅
- [ ] AI fills empty slots
- [ ] Lobby accepts share-code joins
- [ ] Audio feedback plays
- [ ] Visual effects render
- [ ] Internal playtest: mechanics work, aesthetic resonates

### Phase 4 ✅
- [ ] Deployed to Azure Container Apps
- [ ] Handles 4 concurrent matches
- [ ] Monitoring active
- [ ] Health check functional

### Phase 5 ✅
- [ ] All systems documented
- [ ] Onboarding < 4 hours
- [ ] Deployment runbook complete

---

## 🚀 RPI Handoff

**When to hand off to Researcher**: After DT complete (now!)
**What to give**: 
- `.copilot-tracking/dt/kaiju-arcade/handoff-summary.md`
- `.copilot-tracking/implementation-tasks.md`
- `docs/multiplayer-game-design.md` (reference)

**Researcher Output**: Phase 1 implementation research  
**Planner Input**: Use research + tasks + game design to create sprint plan  
**Implementor Input**: Use plan + GitHub issues to build

---

## 🔧 Configuration Defaults

```javascript
CREDIT_COUNT = 3                    // Respawn attempts per player
CONTINUE_WINDOW_MS = 10000          // 10 second respawn decision window
RESPAWN_HP_FRACTION = 0.6           // 60% health on respawn
COMBO_WINDOW_MS = 150               // Milliseconds to detect simultaneous hits
MATCH_TICK_MS = 200                 // 5 Hz server tick
ASSET_DELAY_MS = [1000, 5000]       // 1-5 second asset resolution delay
MAX_PLAYERS = 5                     // 1 Commander + 4 Kaiju max
IDLE_TIMEOUT_MS = 30000             // 30 seconds to attract mode
```

All configurable via environment variables.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `IMPLEMENTATION-COMPLETE.md` | Full package summary (READ FIRST) |
| `DELIVERABLES.md` | Checklist of what's been built |
| `IMPLEMENTATION-GUIDE.md` | How to coordinate teams |
| `.copilot-tracking/implementation-tasks.md` | Full task breakdown |
| `.copilot-tracking/dt/kaiju-arcade/handoff-summary.md` | RPI handoff artifact |
| `docs/multiplayer-game-design.md` | Full design specification |
| `create-issues.sh` / `create_issues.py` | GitHub issue creator |

---

## 💡 Pro Tips

1. **Start small**: Tier 1 is the critical path. Get infrastructure solid before gameplay.
2. **Parallelize**: Tier 2 can start planning while Tier 1 builds.
3. **Playtest early**: Internal playtest scheduled for end of Phase 3. Validate mechanics + aesthetic.
4. **Automate deploys**: Tier 3 includes Docker + ACA setup. Make it repeatable.
5. **Track balance**: 150ms combo window is validated but may need tuning. Leaderboard data will show if mechanics are balanced.

---

## ❓ FAQ

**Q: Can I skip Tier 1 and start gameplay?**  
A: No. Tier 1 (infrastructure) is blocking. You need the Colyseus server before anything multiplayer works.

**Q: When can I do playtesting?**  
A: Internal playtest scheduled end of Phase 3 (week 5). This validates mechanics + aesthetic. Public testing later.

**Q: What if the 1993 arcade aesthetic doesn't work?**  
A: It was validated through Design Thinking method 5 (concepts). Playtest will confirm. If pivot needed, that's a research gap for Phase 3.

**Q: How many people do I need?**  
A: ~2 backend (Phase 1), ~2 frontend (Phase 2A), ~1 gameplay (Phase 2B), ~1 DevOps (Phase 4). Can be done with 5 people, stretches over 14 weeks. Or 10 people in parallel, 8 weeks.

**Q: What's the budget for Azure?**  
A: See `docs/multiplayer-game-design.md` Section 7.3. Scale-to-zero means ~$0 idle cost. Running 24/7 with 1 replica estimated $150-200/month. Autoscaling adds ~$50/month monitoring.

---

## 🎮 Let's Go!

```bash
cd /home/dakir/kaiju-arcade
./create-issues.sh     # Create GitHub issues
# Then assign Tier 1 to team and start Phase 1 sprint!
```

---

**Quick Links**
- 📖 Read this: `IMPLEMENTATION-COMPLETE.md`
- 📋 Review: `.copilot-tracking/implementation-tasks.md`
- 🎮 Design: `docs/multiplayer-game-design.md`
- 🚀 Run: `./create-issues.sh`

---

Generated: 2026-06-24  
Status: ✅ Ready to build
