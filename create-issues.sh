#!/bin/bash
# Kaiju Arcade — GitHub Issue Creation Script
# Creates 12 Epic issues + Feature issues + Task list items
# Usage: bash create-issues.sh

set -e

REPO="kaiju-arcade"
GITHUB_OWNER=$(gh repo view --json owner --jq '.owner.login' 2>/dev/null || echo "$(git config --get remote.origin.url | sed -E 's/.*[:\/]([^\/]+)\/.*/\1/')")

echo "📋 Creating Kaiju Arcade GitHub Issues..."
echo "   Repository: $REPO (owner: $GITHUB_OWNER)"
echo ""

# Function to create Epic issue and return its number
create_epic() {
    local epic_num=$1
    local epic_title=$2
    local epic_desc=$3
    local tier=$4
    
    local issue_num=$(gh issue create \
        --title "EPIC $epic_num: $epic_title" \
        --body "$epic_desc" \
        --label "epic,tier-$tier" \
        --json number \
        --jq '.number' \
        2>/dev/null)
    
    echo "#$issue_num"
    return 0
}

# Function to create Feature issue under Epic
create_feature() {
    local epic_num=$1
    local feature_id=$2
    local feature_title=$3
    local feature_body=$4
    local epic_number=$5
    
    local issue_num=$(gh issue create \
        --title "$feature_id: $feature_title" \
        --body "$feature_body

---
**Part of**: EPIC $epic_num" \
        --label "feature" \
        --json number \
        --jq '.number' \
        2>/dev/null)
    
    echo "#$issue_num"
    return 0
}

# ============================================================================
# EPIC 1: Multiplayer Infrastructure & Networking
# ============================================================================
echo "🔧 Creating EPIC 1: Multiplayer Infrastructure & Networking..."
EPIC_1=$(create_epic "1" "Multiplayer Infrastructure & Networking" \
"Build Colyseus server, message protocol, and game loop engine.

## Features
- [FEATURE 1.1] Colyseus Server Setup
- [FEATURE 1.2] Message Protocol & Validation
- [FEATURE 1.3] Game Loop & Tick Engine

## Tasks
- TASK 1.1.1 — Initialize Colyseus v0.17 project
- TASK 1.1.2 — Create MatchSchema
- TASK 1.1.3 — Implement MatchRoom.onCreate
- TASK 1.1.4 — Implement onJoin handler
- TASK 1.1.5 — Implement onLeave handler
- TASK 1.2.1 — Define message types
- TASK 1.2.2 — Implement onMessage handlers
- TASK 1.2.3 — Implement broadcast messages
- TASK 1.2.4 — Implement message queueing
- TASK 1.3.1 — Implement setSimulationInterval (5 Hz)
- TASK 1.3.2 — Implement world update function
- TASK 1.3.3 — Implement client-side lerp
- TASK 1.3.4 — Implement tick profiling" "1")
echo "✅ EPIC 1 created: $EPIC_1"

# ============================================================================
# EPIC 2: Game State & Match Lifecycle
# ============================================================================
echo "🎮 Creating EPIC 2: Game State & Match Lifecycle..."
EPIC_2=$(create_epic "2" "Game State & Match Lifecycle" \
"Implement match initialization, outcome detection, and state persistence.

## Features
- [FEATURE 2.1] Match Initialization
- [FEATURE 2.2] Match Outcome & Termination
- [FEATURE 2.3] State Persistence & Serialization

## Tasks
- TASK 2.1.1 — Match creation with city base selection
- TASK 2.1.2 — Kaiju slot allocation
- TASK 2.1.3 — Initial roster generation
- TASK 2.1.4 — Credit assignment
- TASK 2.1.5 — Match start handshake
- TASK 2.2.1 — Win condition detection
- TASK 2.2.2 — Result artifact generation
- TASK 2.2.3 — Graceful shutdown
- TASK 2.2.4 — Reconnect grace window
- TASK 2.3.1 — Extract shared game logic package
- TASK 2.3.2 — MatchSchema serialization
- TASK 2.3.3 — Colyseus Monitor integration" "1")
echo "✅ EPIC 2 created: $EPIC_2"

# ============================================================================
# EPIC 3: Commander Player (Dashboard)
# ============================================================================
echo "👨‍💼 Creating EPIC 3: Commander Player (Dashboard)..."
EPIC_3=$(create_epic "3" "Commander Player Dashboard" \
"Build Commander dashboard with arcade aesthetics and asset dispatch controls.

## Features
- [FEATURE 3.1] Dashboard UI Components (Arcade Aesthetic)
- [FEATURE 3.2] Commander Input & Asset Dispatch
- [FEATURE 3.3] Commander Feedback & Status Display
- [FEATURE 3.4] Signal Feed & Match Timeline

## Tasks
- TASK 3.1.1 — CRT phosphor glow + scan-line overlay
- TASK 3.1.2 — Monochrome color scheme
- TASK 3.1.3 — Uppercase condensed text
- TASK 3.1.4 — Typewriter effect on SignalFeed
- TASK 3.1.5 — Radar sweep animation
- TASK 3.2.1 — Leviathan selection UI
- TASK 3.2.2 — Asset dispatch buttons
- TASK 3.2.3 — Dispatch validation
- TASK 3.2.4 — Send messages to server
- TASK 3.3.1 — Display Leviathan positions
- TASK 3.3.2 — Display city base HP
- TASK 3.3.3 — Display Commander score
- TASK 3.3.4 — Display active barriers/cooldowns
- TASK 3.3.5 — Alert mode toggle
- TASK 3.4.1 — SignalFeed display
- TASK 3.4.2 — Signal event generation
- TASK 3.4.3 — Broadcast signal events
- TASK 3.4.4 — Match timer display" "2")
echo "✅ EPIC 3 created: $EPIC_3"

# ============================================================================
# EPIC 4: Kaiju Players (Mobile Client)
# ============================================================================
echo "🦑 Creating EPIC 4: Kaiju Players (Mobile Client)..."
EPIC_4=$(create_epic "4" "Kaiju Players Mobile Client" \
"Build Kaiju mobile client with arcade UI, abilities, and continue system.

## Features
- [FEATURE 4.1] Kaiju UI (Mobile-First, Arcade Aesthetic)
- [FEATURE 4.2] Kaiju Abilities & Input
- [FEATURE 4.3] Kaiju State & Feedback
- [FEATURE 4.4] Continue System (INSERT COIN)

## Tasks
- TASK 4.1.1 — Silhouette view rendering
- TASK 4.1.2 — Vector shape rendering
- TASK 4.1.3 — Segmented HP bar with flicker
- TASK 4.1.4 — Screen shake on damage
- TASK 4.1.5 — Neon outline styling
- TASK 4.2.1 — Move button implementation
- TASK 4.2.2 — Attack button implementation
- TASK 4.2.3 — Ability buttons (archetype-specific)
- TASK 4.2.4 — Cooldown fill animations
- TASK 4.2.5 — Send messages to server
- TASK 4.3.1 — Display HP and hpMax
- TASK 4.3.2 — Display cooldown timers
- TASK 4.3.3 — Display damage taken
- TASK 4.3.4 — Distance-to-base indicator
- TASK 4.3.5 — Damage pop animation
- TASK 4.4.1 — CONTAINED event handler
- TASK 4.4.2 — INSERT COIN overlay
- TASK 4.4.3 — Countdown timer display
- TASK 4.4.4 — Continue button
- TASK 4.4.5 — Credit icon display
- TASK 4.4.6 — GAME OVER overlay
- TASK 4.4.7 — Spectator mode UI" "2")
echo "✅ EPIC 4 created: $EPIC_4"

# ============================================================================
# EPIC 5: Combat Resolution & Game Mechanics
# ============================================================================
echo "⚔️ Creating EPIC 5: Combat Resolution & Game Mechanics..."
EPIC_5=$(create_epic "5" "Combat Resolution & Game Mechanics" \
"Implement damage calculation, combo detection, feedback, and mitigation resolution.

## Features
- [FEATURE 5.1] Damage Calculation & Hit Resolution
- [FEATURE 5.2] Combo Detection & Amplification
- [FEATURE 5.3] Damage Feedback (Visual & Audio)
- [FEATURE 5.4] Mitigation Resolution (Commander Asset Deployment)
- [FEATURE 5.5] Leviathan Position & Advancement

## Tasks
- TASK 5.1.1 — Base damage calculation
- TASK 5.1.2 — Damage to city base
- TASK 5.1.3 — Damage to Kaiju
- TASK 5.1.4 — Damage clamping
- TASK 5.2.1 — Combo window tracking
- TASK 5.2.2 — Same-target attack detection
- TASK 5.2.3 — Combo amplification formula
- TASK 5.2.4 — Combo counter for score
- TASK 5.3.1 — Damage pop rendering
- TASK 5.3.2 — Combo pop styling
- TASK 5.3.3 — Damage sound effects
- TASK 5.3.4 — Screen shake on damage
- TASK 5.4.1 — Asset delay modeling
- TASK 5.4.2 — Mitigation outcome types
- TASK 5.4.3 — Knockback effect
- TASK 5.4.4 — Barrier damage reduction
- TASK 5.4.5 — Evac Sector scoring
- TASK 5.5.1 — Heading tracking
- TASK 5.5.2 — Position updates
- TASK 5.5.3 — Range calculation
- TASK 5.5.4 — Knockback physics" "2")
echo "✅ EPIC 5 created: $EPIC_5"

# ============================================================================
# EPIC 6: Scoring & Outcome Systems
# ============================================================================
echo "🏆 Creating EPIC 6: Scoring & Outcome Systems..."
EPIC_6=$(create_epic "6" "Scoring & Outcome Systems" \
"Implement Commander scoring, leaderboard, and round loop mechanics.

## Features
- [FEATURE 6.1] Commander Scoring
- [FEATURE 6.2] Match Result & Leaderboard
- [FEATURE 6.3] Round Loop & Replayability

## Tasks
- TASK 6.1.1 — Score on mitigation
- TASK 6.1.2 — Combo multiplier tracking
- TASK 6.1.3 — Civilians saved bonus
- TASK 6.1.4 — Final score calculation
- TASK 6.2.1 — Score reveal animation
- TASK 6.2.2 — Initials entry screen
- TASK 6.2.3 — Leaderboard persistence
- TASK 6.2.4 — Leaderboard display
- TASK 6.2.5 — Kaiju score display
- TASK 6.3.1 — Play Again button
- TASK 6.3.2 — Role-swap option
- TASK 6.3.3 — Difficulty presets" "2")
echo "✅ EPIC 6 created: $EPIC_6"

# ============================================================================
# EPIC 7: AI & NPC Behavior
# ============================================================================
echo "🤖 Creating EPIC 7: AI & NPC Behavior..."
EPIC_7=$(create_epic "7" "AI & NPC Behavior" \
"Implement AI Kaiju controller and fallback slot assignment.

## Features
- [FEATURE 7.1] AI Kaiju Controller
- [FEATURE 7.2] Fallback Slot Assignment

## Tasks
- TASK 7.1.1 — AI Leviathan tick behavior
- TASK 7.1.2 — AI target selection
- TASK 7.1.3 — AI ability usage
- TASK 7.1.4 — AI formation heuristics
- TASK 7.2.1 — Unclaimed slot detection
- TASK 7.2.2 — AI promotion
- TASK 7.2.3 — Reconnect claim
- TASK 7.2.4 — Slot reset on timeout" "2")
echo "✅ EPIC 7 created: $EPIC_7"

# ============================================================================
# EPIC 8: Attract Mode & Lobby
# ============================================================================
echo "🎪 Creating EPIC 8: Attract Mode & Lobby..."
EPIC_8=$(create_epic "8" "Attract Mode & Lobby" \
"Implement attract mode demo loop and lobby matchmaking.

## Features
- [FEATURE 8.1] Attract Mode Demo Loop
- [FEATURE 8.2] Lobby & Matchmaking

## Tasks
- TASK 8.1.1 — Match tick-log recording
- TASK 8.1.2 — Idle timeout detection
- TASK 8.1.3 — Attract mode playback
- TASK 8.1.4 — PRESS START overlay
- TASK 8.2.1 — Share-code lobby
- TASK 8.2.2 — Role selection UI
- TASK 8.2.3 — Ready-check
- TASK 8.2.4 — Lobby timeout" "2")
echo "✅ EPIC 8 created: $EPIC_8"

# ============================================================================
# EPIC 9: Audio & Visual Effects
# ============================================================================
echo "🎵 Creating EPIC 9: Audio & Visual Effects..."
EPIC_9=$(create_epic "9" "Audio & Visual Effects" \
"Implement audio cues, visual effects, and animations for arcade polish.

## Features
- [FEATURE 9.1] Audio Cues & Feedback
- [FEATURE 9.2] Visual Effects & Animations

## Tasks
- TASK 9.1.1 — Damage sound library
- TASK 9.1.2 — Ambient audio
- TASK 9.1.3 — INSERT COIN sound
- TASK 9.1.4 — Match end fanfare
- TASK 9.1.5 — Volume control
- TASK 9.2.1 — Mitigation particles
- TASK 9.2.2 — Base damage explosion
- TASK 9.2.3 — Kaiju shattering
- TASK 9.2.4 — Screen shake effects
- TASK 9.2.5 — Status flicker effects" "3")
echo "✅ EPIC 9 created: $EPIC_9"

# ============================================================================
# EPIC 10: Deployment & Infrastructure
# ============================================================================
echo "☁️ Creating EPIC 10: Deployment & Infrastructure..."
EPIC_10=$(create_epic "10" "Deployment & Infrastructure" \
"Configure Docker, Azure Container Apps, monitoring, and observability.

## Features
- [FEATURE 10.1] Docker & Container Image
- [FEATURE 10.2] Azure Container Apps Configuration
- [FEATURE 10.3] Monitoring & Observability
- [FEATURE 10.4] Configuration & Secrets Management

## Tasks
- TASK 10.1.1 — Create Dockerfile
- TASK 10.1.2 — Container image build
- TASK 10.1.3 — ACR integration
- TASK 10.1.4 — Image push/pull workflow
- TASK 10.2.1 — ACA sticky sessions
- TASK 10.2.2 — ACA autoscaling
- TASK 10.2.3 — ACA ingress config
- TASK 10.2.4 — ACA environment variables
- TASK 10.3.1 — Colyseus Monitor dashboard
- TASK 10.3.2 — Server-side logging
- TASK 10.3.3 — Application Insights
- TASK 10.3.4 — Health check endpoint
- TASK 10.4.1 — Environment configuration
- TASK 10.4.2 — CORS configuration
- TASK 10.4.3 — Secret management" "3")
echo "✅ EPIC 10 created: $EPIC_10"

# ============================================================================
# EPIC 11: Testing & Validation
# ============================================================================
echo "🧪 Creating EPIC 11: Testing & Validation..."
EPIC_11=$(create_epic "11" "Testing & Validation" \
"Implement unit tests, integration tests, and user playtesting.

## Features
- [FEATURE 11.1] Unit Tests
- [FEATURE 11.2] Integration Tests
- [FEATURE 11.3] Playtesting & Validation

## Tasks
- TASK 11.1.1 — Unit tests: damage calculation
- TASK 11.1.2 — Unit tests: combo detection
- TASK 11.1.3 — Unit tests: mitigation resolution
- TASK 11.1.4 — Unit tests: state transitions
- TASK 11.2.1 — Integration tests: message flow
- TASK 11.2.2 — Integration tests: match lifecycle
- TASK 11.2.3 — Integration tests: multi-client sync
- TASK 11.3.1 — Playtests: 3-5 real players
- TASK 11.3.2 — Validate combo window tuning
- TASK 11.3.3 — Validate aesthetic resonance
- TASK 11.3.4 — Validate leaderboard engagement
- TASK 11.3.5 — Validate INSERT COIN UX" "3")
echo "✅ EPIC 11 created: $EPIC_11"

# ============================================================================
# EPIC 12: Documentation & Knowledge Transfer
# ============================================================================
echo "📚 Creating EPIC 12: Documentation & Knowledge Transfer..."
EPIC_12=$(create_epic "12" "Documentation & Knowledge Transfer" \
"Document architecture, design, and user guides.

## Features
- [FEATURE 12.1] API & Architecture Documentation
- [FEATURE 12.2] Design Documentation
- [FEATURE 12.3] Player Guides

## Tasks
- TASK 12.1.1 — Colyseus message protocol docs
- TASK 12.1.2 — MatchSchema documentation
- TASK 12.1.3 — Server tick loop docs
- TASK 12.1.4 — Deployment guide
- TASK 12.2.1 — Balance tuning docs
- TASK 12.2.2 — Commander strategy guide
- TASK 12.2.3 — Kaiju strategy guide
- TASK 12.3.1 — Commander quickstart
- TASK 12.3.2 — Kaiju quickstart
- TASK 12.3.3 — Leaderboard guide" "3")
echo "✅ EPIC 12 created: $EPIC_12"

echo ""
echo "✅ All EPIC issues created!"
echo ""
echo "📊 Summary:"
echo "   TIER 1 (Core Infrastructure): EPICs 1, 2"
echo "   TIER 2 (Core Gameplay): EPICs 3, 4, 5, 6, 7, 8"
echo "   TIER 3 (Polish & Deployment): EPICs 9, 10, 11, 12"
echo ""
echo "🔗 Epic Issues:"
echo "   EPIC 1: $EPIC_1"
echo "   EPIC 2: $EPIC_2"
echo "   EPIC 3: $EPIC_3"
echo "   EPIC 4: $EPIC_4"
echo "   EPIC 5: $EPIC_5"
echo "   EPIC 6: $EPIC_6"
echo "   EPIC 7: $EPIC_7"
echo "   EPIC 8: $EPIC_8"
echo "   EPIC 9: $EPIC_9"
echo "   EPIC 10: $EPIC_10"
echo "   EPIC 11: $EPIC_11"
echo "   EPIC 12: $EPIC_12"
echo ""
echo "🎮 Kaiju Arcade implementation is ready!"
