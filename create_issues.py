#!/usr/bin/env python3
"""
Kaiju Arcade — GitHub Issue Creation Script
Creates 12 Epic issues from the implementation task breakdown.

Usage:
    python3 create_issues.py

Requirements:
    - gh CLI installed and authenticated
    - PyGithub (optional, falls back to subprocess `gh` calls)
"""

import subprocess
import json
from typing import Dict, List, Optional

# Epic definitions
EPICS = [
    {
        "num": 1,
        "title": "Multiplayer Infrastructure & Networking",
        "desc": """Build Colyseus server, message protocol, and game loop engine.

## Features
- FEATURE 1.1 — Colyseus Server Setup
- FEATURE 1.2 — Message Protocol & Validation
- FEATURE 1.3 — Game Loop & Tick Engine

## Key Tasks
- Initialize Colyseus v0.17 project with TypeScript
- Create MatchSchema (@Schema/@type decorators)
- Implement MatchRoom lifecycle (onCreate, onJoin, onLeave)
- Define and validate all message types
- Implement 5 Hz server tick with deterministic world updates
- Client-side lerp for smooth position interpolation
- Tick profiling and timing validation""",
        "tier": "1",
        "labels": ["epic", "tier-1", "infrastructure", "multiplayer"],
    },
    {
        "num": 2,
        "title": "Game State & Match Lifecycle",
        "desc": """Implement match initialization, outcome detection, and state persistence.

## Features
- FEATURE 2.1 — Match Initialization
- FEATURE 2.2 — Match Outcome & Termination
- FEATURE 2.3 — State Persistence & Serialization

## Key Tasks
- Match creation with city base selection
- Kaiju slot allocation (1 Commander + 1-4 Kaiju)
- Initial roster generation and player assignment
- Win/loss condition detection
- Graceful match shutdown and cleanup
- Reconnect grace window (30s for disconnected players)
- Shared game logic package extraction""",
        "tier": "1",
        "labels": ["epic", "tier-1", "infrastructure", "multiplayer"],
    },
    {
        "num": 3,
        "title": "Commander Player (Dashboard)",
        "desc": """Build Commander dashboard with arcade aesthetics and asset dispatch controls.

## Features
- FEATURE 3.1 — Dashboard UI Components (Arcade Aesthetic)
- FEATURE 3.2 — Commander Input & Asset Dispatch
- FEATURE 3.3 — Commander Feedback & Status Display
- FEATURE 3.4 — Signal Feed & Match Timeline

## Key Tasks
- Apply CRT phosphor glow and scan-line overlay
- Implement monochrome color scheme (amber/green/red)
- Uppercase condensed text throughout
- Typewriter effect on SignalFeed entries
- Radar sweep animation on new Leviathan detection
- Asset dispatch UI (Scramble Jets, Deploy Mechs, Raise Barrier, Evac Sector)
- Display Leviathan positions, base HP, score, cooldowns""",
        "tier": "2",
        "labels": ["epic", "tier-2", "ui", "gameplay"],
    },
    {
        "num": 4,
        "title": "Kaiju Players (Mobile Client)",
        "desc": """Build Kaiju mobile client with arcade UI, abilities, and continue system.

## Features
- FEATURE 4.1 — Kaiju UI (Mobile-First, Arcade Aesthetic)
- FEATURE 4.2 — Kaiju Abilities & Input
- FEATURE 4.3 — Kaiju State & Feedback
- FEATURE 4.4 — Continue System (INSERT COIN)

## Key Tasks
- Bold silhouette view rendering (Kaiju and city skyline)
- Segmented HP bar with flicker on damage
- Move, Attack, and Ability buttons
- Cooldown fill animations
- Screen shake on damage
- INSERT COIN continue mechanism (10s window, 3 credits)
- Spectator mode on credit exhaustion
- Damage feedback animation matching Commander display""",
        "tier": "2",
        "labels": ["epic", "tier-2", "ui", "gameplay"],
    },
    {
        "num": 5,
        "title": "Combat Resolution & Game Mechanics",
        "desc": """Implement damage calculation, combo detection, feedback, and mitigation resolution.

## Features
- FEATURE 5.1 — Damage Calculation & Hit Resolution
- FEATURE 5.2 — Combo Detection & Amplification
- FEATURE 5.3 — Damage Feedback (Visual & Audio)
- FEATURE 5.4 — Mitigation Resolution (Commander Asset Deployment)
- FEATURE 5.5 — Leviathan Position & Advancement

## Key Tasks
- Base damage calculation with severity/proximity/status adjustments
- Combo detection within 150ms window (validated constraint)
- Amplified damage feedback for synchronized attacks
- Combo counter for Commander score
- Damage sound effects and screen shake
- Asset delay modeling (1-5s, per design)
- Knockback and barrier mechanics
- Position updates and range calculations""",
        "tier": "2",
        "labels": ["epic", "tier-2", "gameplay"],
    },
    {
        "num": 6,
        "title": "Scoring & Outcome Systems",
        "desc": """Implement Commander scoring, leaderboard, and round loop mechanics.

## Features
- FEATURE 6.1 — Commander Scoring
- FEATURE 6.2 — Match Result & Leaderboard
- FEATURE 6.3 — Round Loop & Replayability

## Key Tasks
- Score increment on successful mitigation
- Combo multiplier tracking (consecutive mitigations on distinct Kaiju)
- Civilians saved bonus (Evac Sector)
- Score reveal animation on match end
- Commander initials entry screen
- Leaderboard persistence and display
- Play Again button with role-swap option
- Difficulty/preset selection""",
        "tier": "2",
        "labels": ["epic", "tier-2", "gameplay"],
    },
    {
        "num": 7,
        "title": "AI & NPC Behavior",
        "desc": """Implement AI Kaiju controller and fallback slot assignment.

## Features
- FEATURE 7.1 — AI Kaiju Controller
- FEATURE 7.2 — Fallback Slot Assignment

## Key Tasks
- AI Leviathan tick behavior (reuse existing logic)
- AI target selection
- AI ability usage
- AI formation heuristics
- Unclaimed slot detection
- AI promotion for disconnected players
- Reconnect claim with grace window
- Slot reset on timeout expiration""",
        "tier": "2",
        "labels": ["epic", "tier-2", "gameplay"],
    },
    {
        "num": 8,
        "title": "Attract Mode & Lobby",
        "desc": """Implement attract mode demo loop and lobby matchmaking.

## Features
- FEATURE 8.1 — Attract Mode Demo Loop
- FEATURE 8.2 — Lobby & Matchmaking

## Key Tasks
- Match tick-log recording for replay
- Idle timeout detection (30s)
- Attract mode playback loop
- PRESS START / INSERT COIN overlay
- Share-code lobby creation
- Role selection UI
- Ready-check before match start
- Lobby timeout with auto-start""",
        "tier": "2",
        "labels": ["epic", "tier-2", "multiplayer"],
    },
    {
        "num": 9,
        "title": "Audio & Visual Effects",
        "desc": """Implement audio cues, visual effects, and animations for arcade polish.

## Features
- FEATURE 9.1 — Audio Cues & Feedback
- FEATURE 9.2 — Visual Effects & Animations

## Key Tasks
- Damage sound effect library
- Ambient audio and match music
- INSERT COIN sound cue
- Match end fanfare
- Volume control and mute toggle
- Particle effects for mitigation impacts
- Explosion animations on base damage
- Kaiju silhouette shattering animation
- Screen shake implementation
- Flash/flicker effects for status changes""",
        "tier": "3",
        "labels": ["epic", "tier-3"],
    },
    {
        "num": 10,
        "title": "Deployment & Infrastructure",
        "desc": """Configure Docker, Azure Container Apps, monitoring, and observability.

## Features
- FEATURE 10.1 — Docker & Container Image
- FEATURE 10.2 — Azure Container Apps Configuration
- FEATURE 10.3 — Monitoring & Observability
- FEATURE 10.4 — Configuration & Secrets Management

## Key Tasks
- Create Dockerfile (Node.js 22 LTS alpine)
- Container image build and registry push
- Azure Container Registry (ACR) integration
- ACA sticky sessions (WebSocket affinity)
- ACA autoscaling (KEDA HTTP scaler, scale-to-zero)
- ACA ingress and port exposure (2567)
- Colyseus Monitor dashboard
- Server-side logging and profiling
- Application Insights integration
- Health check endpoint
- Environment-based configuration
- CORS and secret management""",
        "tier": "3",
        "labels": ["epic", "tier-3", "deployment", "infrastructure"],
    },
    {
        "num": 11,
        "title": "Testing & Validation",
        "desc": """Implement unit tests, integration tests, and user playtesting.

## Features
- FEATURE 11.1 — Unit Tests
- FEATURE 11.2 — Integration Tests
- FEATURE 11.3 — Playtesting & Validation

## Key Tasks
- Unit tests for damage calculation, combo detection, mitigation resolution
- Integration tests for Colyseus message flow
- Integration tests for match lifecycle
- Multi-client synchronization tests
- Playtests with 3-5 real players
- Validate 150ms combo window tuning
- Validate 1993 arcade aesthetic resonance
- Measure leaderboard engagement metrics
- Validate INSERT COIN UX and frustration reduction""",
        "tier": "3",
        "labels": ["epic", "tier-3", "testing"],
    },
    {
        "num": 12,
        "title": "Documentation & Knowledge Transfer",
        "desc": """Document architecture, design, and user guides.

## Features
- FEATURE 12.1 — API & Architecture Documentation
- FEATURE 12.2 — Design Documentation
- FEATURE 12.3 — Player Guides

## Key Tasks
- Colyseus message protocol documentation
- MatchSchema data structure reference
- Server tick loop documentation
- Deployment process guide
- Balance tuning parameter reference
- Commander strategy guide
- Kaiju strategy guide
- Commander quickstart guide
- Kaiju quickstart guide
- Leaderboard and scoring guide""",
        "tier": "3",
        "labels": ["epic", "tier-3", "docs"],
    },
]


def run_gh_command(args: List[str]) -> Optional[str]:
    """Run GitHub CLI command and return JSON output."""
    try:
        result = subprocess.run(
            ["gh", "issue", "create"] + args,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0:
            # Try to parse as JSON if it's --json output
            try:
                data = json.loads(result.stdout)
                return data.get("number") or result.stdout.strip()
            except json.JSONDecodeError:
                # If not JSON, try to extract issue number from URL
                return result.stdout.strip()
        else:
            print(f"❌ Error running gh command: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Exception running gh command: {e}")
        return None


def create_epic(epic: Dict) -> Optional[str]:
    """Create an Epic issue and return its number."""
    num = epic["num"]
    title = epic["title"]
    desc = epic["desc"]
    labels = epic["labels"]

    args = [
        "--title",
        f"EPIC {num}: {title}",
        "--body",
        desc,
        "--label",
        ",".join(labels),
        "--json",
        "number",
        "--jq",
        ".number",
    ]

    print(f"📝 Creating EPIC {num}: {title}...", end=" ")
    issue_num = run_gh_command(args)
    if issue_num:
        print(f"✅ #{issue_num}")
        return issue_num
    else:
        print("❌ Failed")
        return None


def main():
    """Create all Epic issues."""
    print("🎮 Kaiju Arcade — GitHub Issue Creation")
    print("=" * 60)
    print()

    created_epics = {}
    tier_counts = {"1": 0, "2": 0, "3": 0}

    for epic in EPICS:
        issue_num = create_epic(epic)
        if issue_num:
            created_epics[epic["num"]] = issue_num
            tier_counts[epic["tier"]] += 1

    print()
    print("=" * 60)
    print("✅ Issue Creation Summary")
    print("=" * 60)
    print()

    print(f"Tier 1 (Infrastructure): {tier_counts['1']} issues")
    print(f"Tier 2 (Gameplay): {tier_counts['2']} issues")
    print(f"Tier 3 (Polish & Deploy): {tier_counts['3']} issues")
    print()

    print("🔗 Created Epic Issues:")
    for num in sorted(created_epics.keys()):
        issue_num = created_epics[num]
        epic_title = next((e["title"] for e in EPICS if e["num"] == num), "Unknown")
        print(f"   EPIC {num}: #{issue_num} — {epic_title}")

    print()
    print("📊 Next Steps:")
    print("   1. Review Epic issues on GitHub")
    print("   2. Assign teams to Tier 1 (Infrastructure) to start")
    print("   3. Tier 2 (Gameplay) can start after Tier 1 is complete")
    print("   4. Tier 3 (Polish) starts after Tier 2 stabilizes")
    print()
    print("🎮 Implementation ready!")


if __name__ == "__main__":
    main()
