<!-- markdownlint-disable-file -->
# Task Research: Matchmaking Lobby Architecture

Separate matchmaking from game view into a dedicated lobby using Colyseus's built-in room discovery, allowing players to organize into matches, select roles (Commander vs Kaiju), and enter player names for leaderboard integration.

## Task Implementation Requests

* Implement a dedicated matchmaking lobby view (`/public/lobby.html`)
* Enable role selection (Commander vs Kaiju) with player name input
* Integrate Colyseus LobbyRoom for real-time match discovery
* Allow players to create and join matches from the lobby
* Separate player session flow: role selection → lobby → match → game
* Preserve player name through the full connection lifecycle
* Enable reconnection token handling across rooms

## Scope and Success Criteria

* **Scope:**
  - Separate UI: role selection entry point → dedicated lobby → game clients
  - Player name capture before lobby connection
  - Real-time match discovery via Colyseus LobbyRoom
  - Clean room transitions with proper event handler setup
  - Reconnection token management across lobby and match rooms
  - Support both Commander and Kaiju role flows
  - Maintain existing game loop and match mechanics

* **Assumptions:**
  - Colyseus 0.17.0 supports LobbyRoom with enableRealtimeListing()
  - Frontend is vanilla JavaScript (no framework)
  - MatchRoom capacity remains 5 (1 commander + 4 kaiju)
  - Player names should appear in state for future leaderboard integration
  - Role assignment pre-lobby vs post-lobby, with server validation

* **Success Criteria:**
  - Players can access lobby without game immediately starting
  - Lobby displays available matches with player count, mode, and status
  - Players can create new matches or join existing ones
  - Player names persist from entry through game launch
  - Reconnection works after temporary disconnect from game room
  - Match state transitions: WAITING → LOBBY → ACTIVE remain intact
  - Existing game mechanics (commander dispatch, kaiju movement) unchanged

## Outline

1. **Current State Analysis** — How matchmaking works today
2. **Player Lifecycle Flow** — Proposed entry → lobby → game path
3. **Colyseus Lobby Architecture** — LobbyRoom pattern and APIs
4. **Frontend Structure** — File organization and URL flow
5. **Backend Configuration** — MatchRoom metadata and Lobby setup
6. **Session Management** — sessionStorage and data flow
7. **Implementation Patterns** — Code examples for each component
8. **Integration Points** — Changes to existing files
9. **Testing Strategy** — Multi-room transitions, reconnection, role validation
10. **Alternatives Evaluated** — Why LobbyRoom vs polling/REST

## Potential Next Research

* Kaiju leaderboard integration (player name → API persistence)
  * Reasoning: Player names now captured; natural next step for scoring
  * Reference: MatchRoom already tracks commander score; extend to all players
* Multi-match spectator mode from lobby
  * Reasoning: Lobby is discovery point; can add spectate buttons
  * Reference: Current code has CommanderSchema but no spectator flow
* Lobby chat/pre-game communication
  * Reasoning: Players waiting for match start (WAITING/LOBBY phase)
  * Reference: Could add match.message broadcast during lobby phase

## Research Executed

### File Analysis

* **public/commander/app.js** (lines 1-80)
  * Current state: Assumes immediate game HUD rendering upon join
  * Issue: No lobby phase separation; directly renders tactical feedback

* **public/kaiju/app.js** (lines 1-50)
  * Current state: Hardcoded game constants; no role selection on join
  * Issue: No intermediate lobby UI; moves directly to game rendering

* **src/game/MatchRoom.ts** (lines 1-80+)
  * Current state: Handles both WAITING and ACTIVE phases inline
  * Opportunity: Can add LOBBY phase transition after player count reaches 2
  * State field: `MatchSchema.metadata.state` for phase tracking

* **src/schema/MatchSchema.ts**
  * Tracking: Commander and Leviathan (Kaiju) player state
  * Name storage: `commander.playerName` and `leviathan.playerName`
  * Phase field exists for state transitions

* **package.json**
  * Colyseus version: 0.17.0 ✅ (supports LobbyRoom)
  * Schema version: 4.0.26 ✅
  * Frontend: Vanilla JS, Leaflet 1.9.4, Colyseus.js 0.16.20

### External Research

* **Colyseus Documentation (0.17.x)**
  * LobbyRoom: Built-in room automatically maintains live list
  * APIs: joinOrCreate("lobby"), onMessage("rooms"/"+""-"), enableRealtimeListing()
  * Client-side options: `client.joinOrCreate(roomName, options)` passes options to server
  * Reconnection: `room.reconnectionToken` auto-generated, `client.reconnect(token)` restores
  * Room metadata: Set immutable in onCreate(), update mutable fields with setMetadata()

* **Multi-Room Patterns**
  * Clean transitions: Leave old room → join new → reattach handlers
  * Session storage: Store playerName/role before lobby, pass in options chain
  * Room discovery: LobbyRoom broadcasts changes; clients listen to "+"/"-" messages
  * Lifecycle: onJoin() → discovery → gameplay → onLeave() → cleanup

### Project Conventions

* **Message Protocol:** [src/messages/protocol.ts](src/messages/protocol.ts)
  * Uses ClientMessage discriminated unions
  * Validation functions: validateCommanderSelect(), validateKaijuMove()
  * Establish lobby message types (e.g., "lobby.ready", "commander.start")

* **Schema Design:** [src/schema/MatchSchema.ts](src/schema/MatchSchema.ts)
  * MatchSchema has MatchMetadata for tracking state
  * Extend metadata with: gameMode, createdAt, isReady (boolean for commander start)
  * Player state via PlayerSession interface in MatchRoom.ts

* **Game Loop:** [src/game/GameLoop.ts](src/game/GameLoop.ts)
  * 20 Hz tick rate (50ms); no changes needed
  * Validation functions available for messages

* **Existing Endpoints:** [src/index.ts](src/index.ts)
  * REST API: POST /api/matches, POST /api/matches/{roomId}/kaiju-join
  * Can keep for backwards compatibility, but lobby flow replaces

## Key Discoveries

### Current Matchmaking Flow

```
Entry (/index.html via role selection)
  ↓
Player stored via sessionStorage (or not at all)
  ↓
REST API: POST /api/matches (commander) or POST /api/matches/{roomId}/kaiju-join (kaiju)
  ↓
client.joinOrCreate("match", options) or client.join("match", options)
  ↓
MatchRoom.onJoin() → immediately renders game HUD
  ↓
State transition: WAITING → ACTIVE when players >= 2
  ↓
Game starts automatically; no explicit lobby phase
```

**Issues:**
- No intermediate lobby for match organization
- No player name capture on entry
- No match discovery/browsing (forced to specific match or create new)
- Game HUD renders immediately; no "waiting for players" experience
- Commander has no manual trigger to start game

### Proposed Architecture

```
Entry: Role Selection (/index.html or /role-select.html)
  ├─ Capture player name
  ├─ Select role (Commander or Kaiju)
  └─ Store in sessionStorage
  ↓
Lobby Room Connection (/lobby.html)
  ├─ Connect to Colyseus LobbyRoom
  ├─ Display available matches (real-time)
  ├─ Show metadata: player count, status, game mode
  └─ Option: Create new match or join existing
  ↓
Match Room Join
  ├─ Leave lobby room cleanly
  ├─ Join selected match with playerName + role in options
  ├─ Server validates role availability
  └─ Store reconnectionToken in sessionStorage
  ↓
Lobby Phase (WAITING → LOBBY transition)
  ├─ Both roles now in room; render role-specific lobby UI
  ├─ Display other players + their names
  ├─ Commander has "START GAME" button
  └─ Kaiju wait for commander signal
  ↓
Active Phase (LOBBY → ACTIVE transition)
  ├─ Commander sends message to trigger startMatch()
  ├─ MatchRoom broadcasts match.start
  ├─ Render game HUD (tactical view for commander, map for kaiju)
  ├─ Execute 20 Hz game loop
  └─ Normal gameplay proceeds
  ↓
End: Reconnect Dialog or Return to Lobby
```

**Benefits:**
- Clear separation of concerns: discovery vs. gameplay
- Players can organize; not forced into specific match
- Commander has explicit control over match start
- Player names persist for leaderboard integration
- Cleaner error handling (join failures don't reach game HUD)

### Frontend File Structure (Proposed)

```
public/
├── index.html                    # Entry: Role selection, player name input
├── lobby.html                    # Lobby: Match discovery, create/join
├── common/
│   ├── colyseus-client.js       # Shared client initialization
│   └── session-manager.js        # sessionStorage helpers
├── commander/
│   ├── app.html                  # Game HUD (no changes)
│   └── app.js                    # Game rendering (no changes)
└── kaiju/
    ├── app.html                  # Game HUD (no changes)
    └── app.js                    # Game rendering (no changes)
```

**Key Files to Create:**
- `public/index.html` — Role selection + player name input
- `public/lobby.html` — Match discovery UI
- `public/common/colyseus-client.js` — Reusable connection logic
- `public/common/session-manager.js` — localStorage/sessionStorage management

### Backend Configuration (Proposed)

```typescript
// src/index.ts changes

// 1. Enable lobby room with real-time listing
defineRoom(MatchRoom).enableRealtimeListing();

// 2. No custom LobbyRoom needed; built-in handles discovery
// (LobbyRoom automatically created by Colyseus)

// 3. MatchRoom metadata for lobby display
setMetadata({
  gameMode: options.gameMode || "standard",
  createdAt: Date.now(),
  status: "waiting",                        // Add to existing
  commanderName: options.playerName || "",  // For lobby list
  playerCount: 0
});
```

**Changes to MatchRoom:**
- Extract playerName from options in onJoin()
- Add LOBBY phase handler between WAITING and ACTIVE
- Add commander.start message handler
- Validate role availability (only 1 commander)
- Broadcast match.lobby and match.active messages

### Session Management (Data Flow)

**sessionStorage Schema:**

```javascript
{
  // Role selection (set at entry point)
  playerRole: "commander" | "kaiju",
  playerName: "John Doe",

  // After lobby connection (optional, for recovery)
  currentMatchId: "match-uuid",

  // After match join
  reconnectionToken: "token-abc123",

  // Additional metadata
  entryTimestamp: 1719255600000
}
```

**Data Flow Through Options:**

```javascript
// Entry point
sessionStorage.setItem("playerRole", "commander");
sessionStorage.setItem("playerName", "John");

// → Lobby connection
const lobby = await client.joinOrCreate("lobby", {
  playerRole: sessionStorage.getItem("playerRole"),
  playerName: sessionStorage.getItem("playerName")
});

// → Match join
const room = await client.join("match", {
  roomId: selectedMatch.roomId,
  playerRole: sessionStorage.getItem("playerRole"),
  playerName: sessionStorage.getItem("playerName")
});

// Server-side MatchRoom.onJoin() receives these options
onJoin(client, options) {
  const player = new PlayerState();
  player.playerName = options.playerName;
  player.role = options.playerRole;
  this.state.players.set(client.sessionId, player);
}
```

## Implementation Patterns

### Pattern 1: LobbyRoom Setup (Server)

```typescript
// src/index.ts
import { defineServer, defineRoom } from "colyseus";
import { MatchRoom } from "./game/MatchRoom";

export default defineServer({
  rooms: {
    // Built-in LobbyRoom handles "lobby" automatically
    match: defineRoom(MatchRoom).enableRealtimeListing()
  }
});

// MatchRoom now broadcasts to lobby when created/updated
```

### Pattern 2: Lobby Connection (Client)

```javascript
// public/lobby.html
const client = new Colyseus.Client("ws://localhost:2567");
const playerName = sessionStorage.getItem("playerName");
const playerRole = sessionStorage.getItem("playerRole");

async function connectToLobby() {
  const lobby = await client.joinOrCreate("lobby", {
    playerName: playerName,
    role: playerRole
  });

  let availableMatches = [];

  lobby.onMessage("rooms", (rooms) => {
    availableMatches = rooms;
    renderMatchList(rooms);
  });

  lobby.onMessage("+", ([roomId, room]) => {
    const idx = availableMatches.findIndex(r => r.roomId === roomId);
    if (idx !== -1) availableMatches[idx] = room;
    else availableMatches.push(room);
    renderMatchList(availableMatches);
  });

  lobby.onMessage("-", (roomId) => {
    availableMatches = availableMatches.filter(r => r.roomId !== roomId);
    renderMatchList(availableMatches);
  });

  return { client, lobby, availableMatches };
}
```

### Pattern 3: Match Join from Lobby (Client)

```javascript
// public/lobby.html
async function joinMatch(roomId) {
  try {
    // Leave lobby cleanly
    lobby.leave();

    // Join match with player info
    const room = await client.join("match", {
      roomId: roomId,
      playerName: sessionStorage.getItem("playerName"),
      role: sessionStorage.getItem("playerRole")
    });

    // Store reconnection token
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);

    // Redirect to game UI
    const gameUrl = sessionStorage.getItem("playerRole") === "commander"
      ? "/commander/app.html"
      : "/kaiju/app.html";
    window.location.href = gameUrl;

  } catch (error) {
    console.error("Failed to join match:", error);
    alert("Could not join match. Please try again.");
  }
}
```

### Pattern 4: Match Metadata for Lobby Display

```typescript
// src/game/MatchRoom.ts
onCreate(options: any) {
  // Set immutable metadata
  this.setMetadata({
    gameMode: options.gameMode || "standard",
    difficulty: options.difficulty || "normal",
    createdAt: Date.now(),
    status: "waiting",
    map: options.map || "seattle"
  });

  this.setState(new MatchSchema());
}

onJoin(client: Client, options: any) {
  // Store player info
  const player = new PlayerSession();
  player.clientId = client.sessionId;
  player.playerName = options.playerName || "Anonymous";
  player.role = options.role;

  if (player.role === "commander") {
    if (this.playerSessions.some(p => p.role === "commander")) {
      throw new Error("Commander slot already taken");
    }
    this.state.commander.playerName = player.playerName;
  } else if (player.role === "kaiju") {
    if (this.playerSessions.length >= 5) {
      throw new Error("Match full");
    }
    // Assign to available leviathan
    const unoccupied = this.state.leviathans.find(l => !l.occupied);
    if (unoccupied) {
      unoccupied.playerName = player.playerName;
      player.leviathanId = unoccupied.id;
    }
  }

  this.playerSessions.push(player);

  // Update lobby metadata with player count
  this.setMetadata({
    currentPlayers: this.playerSessions.length,
    status: this.playerSessions.length >= 2 ? "lobby" : "waiting"
  });

  // Broadcast to all clients in match
  this.broadcast("match.lobby", {
    players: this.playerSessions.map(p => ({
      playerName: p.playerName,
      role: p.role
    }))
  });
}
```

### Pattern 5: LOBBY Phase Transition

```typescript
// src/game/MatchRoom.ts

private currentPhase: "WAITING" | "LOBBY" | "ACTIVE" | "FINISHED" = "WAITING";

onJoin(client: Client, options: any) {
  // ... player setup ...

  // Check if we should transition to LOBBY
  if (this.playerSessions.length >= 2 && this.currentPhase === "WAITING") {
    this.transitionToLobby();
  }
}

private transitionToLobby() {
  this.currentPhase = "LOBBY";
  
  this.setMetadata({ status: "lobby" });
  
  // Broadcast to all players in match
  this.broadcast("match.phase", { phase: "LOBBY" });

  // Update game state schema
  this.state.matchState = "LOBBY";

  console.log(`Match ${this.roomId} transitioned to LOBBY phase`);
}

// Commander message handler to start game
onMessage(client: Client, type: string, message: any) {
  // ... existing handlers ...

  if (type === "commander.start" && this.currentPhase === "LOBBY") {
    this.validateCommanderDispatch(client);
    this.startMatch();
  }
}

private startMatch() {
  this.currentPhase = "ACTIVE";
  this.setMetadata({ status: "active" });
  this.broadcast("match.start");
  this.state.matchState = "ACTIVE";

  // Reset game loop timing
  this.matchStartedAt = Date.now();
  console.log(`Match ${this.roomId} started!`);
}
```

### Pattern 6: Game Client Reconnection

```javascript
// public/commander/app.js
async function initializeGame() {
  const client = new Colyseus.Client("ws://localhost:2567");
  const reconnectionToken = sessionStorage.getItem("reconnectionToken");

  let room;

  // Attempt reconnection if token exists
  if (reconnectionToken) {
    try {
      room = await client.reconnect(reconnectionToken);
      console.log("Reconnected to match");
      sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
    } catch (error) {
      console.log("Reconnection failed, joining fresh:", error);
    }
  }

  // Fresh join if no token or reconnection failed
  if (!room) {
    const matchId = sessionStorage.getItem("currentMatchId");
    room = await client.join("match", {
      roomId: matchId,
      playerName: sessionStorage.getItem("playerName"),
      role: "commander"
    });
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
  }

  // Setup game handlers
  room.state.matchState.onChange(() => {
    // Update HUD based on state
  });

  return room;
}
```

## Technical Scenarios

### Scenario 1: Happy Path — New Match Creation and Join

**Flow:**
1. Player navigates to `/index.html`
2. Enters name "Commander Bob" and selects "Commander"
3. Redirected to `/lobby.html`
4. Sees available matches; clicks "Create New Match"
5. New match room created with player as commander
6. Match transitions to LOBBY state (waiting for kaiju)
7. Another player joins as kaiju
8. Commander sees kaiju in lobby, clicks "START GAME"
9. Match transitions to ACTIVE; game begins

**Requirements:**
- Entry point captures name and role
- Lobby displays create button with metadata
- Server validates commander uniqueness
- Phase transition logic in place
- Commander can trigger start

**Preferred Approach:**
- REST endpoint or direct client.create("match", options) for new matches
- Colyseus automatically adds to LobbyRoom
- Client.joinOrCreate("match") simplified if only 1 match at a time (not needed)
- Server-side option.gameMode determines map/difficulty

**Implementation Details:**

File: `public/index.html`
```html
<form id="entry-form">
  <input type="text" id="player-name" required placeholder="Enter your name">
  <button type="button" id="commander-btn">Play as Commander</button>
  <button type="button" id="kaiju-btn">Play as Kaiju</button>
</form>

<script>
document.getElementById("commander-btn").addEventListener("click", () => {
  const name = document.getElementById("player-name").value;
  if (!name) { alert("Please enter a name"); return; }
  sessionStorage.setItem("playerRole", "commander");
  sessionStorage.setItem("playerName", name);
  window.location.href = "/lobby.html";
});

document.getElementById("kaiju-btn").addEventListener("click", () => {
  const name = document.getElementById("player-name").value;
  if (!name) { alert("Please enter a name"); return; }
  sessionStorage.setItem("playerRole", "kaiju");
  sessionStorage.setItem("playerName", name);
  window.location.href = "/lobby.html";
});
</script>
```

File: `public/lobby.html`
```html
<div id="match-list"></div>
<button id="create-match-btn">Create New Match</button>

<script>
// ... connectToLobby() code ...

document.getElementById("create-match-btn").addEventListener("click", async () => {
  try {
    // Create new match via REST API
    const response = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: sessionStorage.getItem("playerName"),
        gameMode: "standard",
        difficulty: "normal"
      })
    });
    const data = await response.json();
    // Colyseus automatically adds to lobby; UI updates via lobby messages
  } catch (error) {
    console.error("Failed to create match:", error);
  }
});
</script>
```

#### Considered Alternatives

**Alternative 1: Server-side match creation endpoint**
- Pros: Clean separation; server controls match params
- Cons: Extra API roundtrip; not immediate in lobby view
- **Rationale for rejection:** LobbyRoom broadcasts new matches in real-time; API approach adds latency

**Alternative 2: Pre-generated matches waiting in lobby**
- Pros: No creation overhead; instant join
- Cons: Server-side resource waste; unclear match lifecycle
- **Rationale for rejection:** On-demand creation more efficient; Colyseus handles lifecycle

---

### Scenario 2: Mid-Game Reconnection After Network Failure

**Flow:**
1. Commander in-game; network drops
2. Browser shows "Lost Connection" overlay
3. Auto-retry using stored reconnectionToken
4. Successfully reconnect to room
5. Game state restored; HUD re-renders
6. Continue gameplay

**Requirements:**
- Store reconnectionToken after join
- Client detects disconnect
- Retry logic with backoff
- Restore event listeners after reconnection
- Handle token expiry (> 30s disconnect)

**Preferred Approach:**
- Use Colyseus's built-in reconnection: `client.reconnect(token)`
- Store new token after successful reconnection
- 30-second reconnection window on server
- After timeout: return to lobby, not to match

**Implementation Details:**

File: `public/commander/app.js` (new section)
```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 1000;

async function attemptReconnection() {
  const token = sessionStorage.getItem("reconnectionToken");
  if (!token) {
    console.log("No reconnection token, returning to lobby");
    window.location.href = "/lobby.html";
    return;
  }

  try {
    const client = new Colyseus.Client("ws://localhost:2567");
    const room = await client.reconnect(token);

    console.log("Reconnected successfully");
    reconnectAttempts = 0;

    // Store new token
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
    sessionStorage.setItem("currentMatchId", room.roomId);

    // Reattach event listeners
    setupRoomHandlers(room);

  } catch (error) {
    console.error("Reconnection failed:", error);

    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1);
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(attemptReconnection, delay);
    } else {
      console.log("Max reconnection attempts reached");
      alert("Connection lost. Returning to lobby...");
      window.location.href = "/lobby.html";
    }
  }
}

function setupRoomHandlers(room) {
  room.state.commander.onChange((changes) => {
    // Re-render HUD
    updateCommanderDisplay(room.state);
  });

  room.onMessage("signal.feed", (update) => {
    // Update signal feed
  });

  room.onMessage("commander.dispatch.result", (result) => {
    // Update dispatch results
  });
}

// Initialize or reconnect
window.addEventListener("load", async () => {
  const currentMatchId = sessionStorage.getItem("currentMatchId");
  if (currentMatchId) {
    await attemptReconnection();
  }
});
```

#### Considered Alternatives

**Alternative 1: Manual reconnect button**
- Pros: Player controls timing; clear user action
- Cons: UX friction; requires player awareness
- **Rationale for rejection:** Auto-retry standard in modern games; better UX

**Alternative 2: Force return to lobby on any disconnect**
- Pros: Simpler; no state recovery issues
- Cons: Poor UX; frustrating for temporary blips
- **Rationale for rejection:** Colyseus supports reconnection; use it

---

### Scenario 3: Lobby Phase UI — Players Waiting for Commander Start

**Flow:**
1. Match has 2+ players (commander + ≥1 kaiju)
2. Server broadcasts "match.phase" with phase="LOBBY"
3. Both roles render lobby-specific UI
4. Commander sees: player list, "START GAME" button
5. Kaiju see: player list, "Waiting for commander..." message
6. Commander clicks "START GAME"
7. Match transitions to ACTIVE

**Requirements:**
- Separate HTML/CSS for lobby phase vs. active phase
- Role-specific UI rendering
- "Commander start" message validation
- Phasechange broadcast

**Preferred Approach:**
- Use `room.state.matchState` or dedicated schema field for phase
- Broadcast `"match.phase"` message when transitioning
- Client renders UI based on phase value
- Commander-only button shows conditionally

**Implementation Details:**

File: `public/commander/app.html`
```html
<div id="lobby-phase" style="display:none;">
  <h2>Match Lobby</h2>
  <div id="lobby-players"></div>
  <button id="start-game-btn">START GAME</button>
</div>

<div id="active-phase" style="display:none;">
  <!-- Existing tactical HUD -->
</div>

<script>
const room = await initializeGame();

function renderLobbyPhase() {
  document.getElementById("lobby-phase").style.display = "block";
  document.getElementById("active-phase").style.display = "none";

  // Render player list
  const players = Array.from(room.state.players.values());
  const playerHtml = players.map(p => `
    <div>${p.playerName} (${p.role})</div>
  `).join("");

  document.getElementById("lobby-players").innerHTML = playerHtml;
}

function renderActivePhase() {
  document.getElementById("lobby-phase").style.display = "none";
  document.getElementById("active-phase").style.display = "block";
  // Existing game HUD rendering
}

// Listen for phase changes
room.onMessage("match.phase", (data) => {
  if (data.phase === "LOBBY") {
    renderLobbyPhase();
  } else if (data.phase === "ACTIVE") {
    renderActivePhase();
  }
});

// Commander start button
document.getElementById("start-game-btn").addEventListener("click", () => {
  room.send("commander.start", {});
});

// Initial phase
if (room.state.matchState === "LOBBY") {
  renderLobbyPhase();
} else if (room.state.matchState === "ACTIVE") {
  renderActivePhase();
}
</script>
```

File: `public/kaiju/app.html`
```html
<div id="lobby-phase" style="display:none;">
  <h2>Match Lobby</h2>
  <div id="lobby-players"></div>
  <p>Waiting for commander to start the match...</p>
</div>

<div id="active-phase" style="display:none;">
  <!-- Existing game map and HUD -->
</div>

<script>
// Similar setup; no "START GAME" button for kaiju
const room = await initializeGame();

function renderLobbyPhase() {
  // ... render player list ...
}

room.onMessage("match.phase", (data) => {
  if (data.phase === "LOBBY") {
    renderLobbyPhase();
  } else if (data.phase === "ACTIVE") {
    renderActivePhase();
  }
});
</script>
```

#### Considered Alternatives

**Alternative 1: Auto-start when all players ready**
- Pros: No manual step required
- Cons: Requires "ready" button; more complexity
- **Rationale for rejection:** Commander explicit control simpler for asymmetric game

**Alternative 2: Time-based auto-start after X seconds**
- Pros: No commander action required
- Cons: Confusing if commander not ready
- **Rationale for rejection:** Commander should control pacing

---

## Integration Points

### Changes to Existing Files

**1. src/index.ts**
- Enable LobbyRoom: `defineRoom(MatchRoom).enableRealtimeListing()`
- No other backend changes required

**2. src/game/MatchRoom.ts**
- Extract `playerName` and `role` from options in `onJoin()`
- Add phase transition logic: `WAITING` → `LOBBY` when 2+ players
- Add `commander.start` message handler
- Validate role availability (1 commander max)
- Broadcast `match.phase` and `match.lobby` messages

**3. public/commander/app.html** and **public/kaiju/app.html**
- Add lobby phase UI (conditional display)
- Add reconnection logic on load
- Add phase change message listener
- Store/restore reconnectionToken

**4. public/commander/app.js** and **public/kaiju/app.js**
- No changes needed to game loop
- Extract common client init to helper
- Add phase listeners

### Files to Create

**1. public/index.html**
- Role selection form
- Player name input
- Buttons: "Play as Commander", "Play as Kaiju"
- Store in sessionStorage, redirect to /lobby.html

**2. public/lobby.html**
- Connect to Colyseus LobbyRoom
- Display match list (real-time updates)
- Show player count, game mode, status
- "Create New Match" button
- "Join" button per match
- Handle leave/join transitions

**3. public/common/session-manager.js**
- Helpers: getPlayerName(), setPlayerName(), getRole(), setRole()
- Storage keys: "playerRole", "playerName", "reconnectionToken", etc.
- validateSession() function

**4. Tests (if adding to existing suite)**
- Lobby room listing tests
- Player name persistence tests
- Role validation tests (commander uniqueness, kaiju capacity)
- Phase transition tests (WAITING → LOBBY → ACTIVE)
- Reconnection tests

## Testing Strategy

### Unit Tests (Existing Structure)

**MatchRoom Role Validation**
- Test: Commander slot enforced (only 1)
- Test: Kaiju capacity enforced (max 4)
- Test: Phase transition logic (WAITING → LOBBY on 2nd join)
- Test: Player name stored in state

### Integration Tests

**Lobby Room Discovery**
- Test: Client joins lobby, receives room list
- Test: Client receives "+" message when new match created
- Test: Client receives "-" message when match ends
- Test: Match metadata filters correctly

**Multi-Room Transitions**
- Test: Client leaves lobby, joins match successfully
- Test: Reconnection token stored after join
- Test: Client can reconnect using token

**Phase Transitions**
- Test: Match starts in WAITING state
- Test: Transitions to LOBBY when 2nd player joins
- Test: Transitions to ACTIVE on commander.start message
- Test: Non-commanders cannot trigger start

### Manual / E2E Testing

**Scenario 1: Complete Flow**
1. Browser 1: Navigate to /index.html, enter name, select Commander
2. Browser 2: Navigate to /index.html, enter name, select Kaiju
3. Verify: Both in /lobby.html
4. Browser 1: Click "Create New Match"
5. Verify: Match appears in both browsers' lobby lists
6. Browser 2: Click "Join"
7. Verify: Browser 2 redirected to /kaiju/app.html
8. Verify: Match state is LOBBY
9. Browser 1: See kaiju player in lobby UI
10. Browser 1: Click "START GAME"
11. Verify: Both browsers transition to ACTIVE (game UI renders)

**Scenario 2: Reconnection**
1. In-game (either role): Throttle network (dev tools) or kill connection
2. Verify: "Lost Connection" overlay shows
3. Verify: Auto-retry attempts
4. Restore network
5. Verify: Reconnection succeeds within 30 seconds
6. Verify: Game state restored; gameplay continues

**Scenario 3: Lobby Real-Time Updates**
1. Browser 1 (Lobby): Watch match list
2. Browser 2: Create new match
3. Verify: New match appears in Browser 1 list within <1 second
4. Browser 3: Join match in Browser 2
5. Verify: Player count updates in Browser 1 list

## Alternatives Evaluated

### Approach 1: Custom Client-Side Match Discovery (Polling)
**Concept:** JavaScript setInterval() polling REST API for match list

**Pros:**
- Works with older Colyseus versions
- Simpler for small player bases

**Cons:**
- ❌ Polling overhead (repeated HTTP requests every 1-2 seconds)
- ❌ Stale data (delay between server update and client refresh)
- ❌ Higher server load
- ❌ Poor UX (UI lags behind reality)
- ❌ Not scalable to many players/matches

**Why Rejected:** LobbyRoom is built for this; why reinvent?

---

### Approach 2: Hybrid Approach (Static Match List + REST API)
**Concept:** Pre-create N matches; list via REST GET /api/matches; join via existing endpoint

**Pros:**
- Minimal backend changes
- Matches existing REST pattern

**Cons:**
- ❌ Static match lifecycle (don't auto-cleanup)
- ❌ No real-time updates (clients don't see new matches)
- ❌ Doesn't use Colyseus strengths (real-time sync)
- ❌ Player name flow still needs fixing

**Why Rejected:** Defeats purpose of dedicated lobby; no real-time discovery

---

### Approach 3: Dedicated Lobby Room (Custom Implementation)
**Concept:** Implement custom LobbyRoom with game-specific logic

**Pros:**
- Maximum control over matching logic
- Can add rating-based matchmaking

**Cons:**
- ❌ Duplicates Colyseus built-in functionality
- ❌ More code to maintain and test
- ❌ Unnecessary complexity for this scope

**Why Rejected:** Built-in LobbyRoom already does what we need

---

### Approach 4: Recommended — Built-in Colyseus LobbyRoom with enableRealtimeListing()

**Concept:** Use Colyseus framework feature; automatic room discovery via real-time messages

**Pros:**
- ✅ Zero custom server code
- ✅ Real-time updates (<100ms latency)
- ✅ Automatic cleanup (rooms disappear when disposed)
- ✅ Supports filtering by name and metadata
- ✅ Scales to 100s of matches
- ✅ Battle-tested Colyseus pattern

**Cons:**
- None identified for this use case

**Why Selected:** Cleanest, most maintainable, least code

---

### Player Name Lifecycle: Entry vs. Lobby Selection

**Approach A: Role + Name at Entry (Recommended)**
- User provides name → Select role → Redirect to lobby
- sessionStorage stores both immediately
- Passed through options to both lobby and match

**Pros:**
- Clear intent upfront
- Role determines initial UI (commander vs. kaiju)
- Name available for leaderboard integration
- Single point of input

**Cons:**
- One less point to change mind

**Approach B: Role at Entry, Name at Lobby**
- Select role → Redirect to lobby → Prompt for name in lobby
- sessionStorage updated after name entry

**Pros:**
- Name selection can be deferred

**Cons:**
- Extra step in flow
- More complex state management
- Less certain for leaderboard

**Why Approach A Selected:** Simpler, cleaner, matches game genre (asymmetric; role choice is identity)

---

## Summary: Key Takeaways

| Aspect | Implementation |
|--------|-----------------|
| **Lobby Pattern** | Built-in Colyseus LobbyRoom with `enableRealtimeListing()` |
| **Discovery** | Client joins `"lobby"`, listens to `"rooms"`, `"+"`, `"-"` messages |
| **Player Name** | Captured at /index.html, stored in sessionStorage, passed through options |
| **Role Selection** | At entry point; stored in sessionStorage; validated server-side |
| **Room Metadata** | gameMode, status (waiting/lobby/active), createdAt, difficulty |
| **Phase Transitions** | WAITING → LOBBY (when 2+ players) → ACTIVE (on commander.start) |
| **File Structure** | /index.html (entry) → /lobby.html (discovery) → /commander/app.html or /kaiju/app.html (game) |
| **Reconnection** | Auto-retry with token; 30s window; new token on successful reconnect |
| **Match Metadata** | Queryable in lobby; used for filtering and display |
| **Backend Change** | Minimal: add enableRealtimeListing(), extract playerName in onJoin(), add LOBBY phase |

