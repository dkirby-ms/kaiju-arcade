# Colyseus Lobby Functionality & Player Lifecycle Research

**Date:** 2026-06-24  
**Source:** Official Colyseus Documentation (v0.17.x)  
**Context:** Research for kaiju-arcade game lobby architecture redesign

---

## 1. Colyseus Lobby Functionality

### 1.1 Built-in LobbyRoom Overview

Colyseus provides a **built-in `LobbyRoom`** feature that maintains a live listing of available rooms. It automatically updates whenever rooms are created, joined, left, or disposed.

**Key Characteristics:**
- Real-time room synchronization with clients
- Supports filtering by room name and metadata
- Uses message-based protocol: `"rooms"` (initial list), `"+"` (room added/updated), `"-"` (room removed)
- No custom room logic needed—completely managed by framework

### 1.2 Available APIs for Room Listing

#### **Option 1: Client-Side Lobby Room Connection** (Recommended)

Clients join the built-in `"lobby"` room to get live updates:

```typescript
import { Client, RoomAvailable } from "@colyseus/sdk";

const client = new Client("http://localhost:2567");
const lobby = await client.joinOrCreate("lobby");

let allRooms: RoomAvailable[] = [];

// Receive initial room list
lobby.onMessage("rooms", (rooms) => {
  allRooms = rooms;
  console.log("Available rooms:", allRooms);
});

// Room added or updated
lobby.onMessage("+", ([roomId, room]) => {
  const roomIndex = allRooms.findIndex((room) => room.roomId === roomId);
  if (roomIndex !== -1) {
    allRooms[roomIndex] = room;  // Update existing
  } else {
    allRooms.push(room);  // Add new
  }
});

// Room removed
lobby.onMessage("-", (roomId) => {
  allRooms = allRooms.filter((room) => room.roomId !== roomId);
});
```

**RoomAvailable Structure:**
```typescript
interface RoomAvailable {
  roomId: string;
  name: string;
  clients: number;           // Current player count
  maxClients: number;        // Room capacity
  locked: boolean;           // True if room is full/locked
  metadata?: Record<string, any>;
}
```

#### **Option 2: Direct matchMaker Query (Server-Side)**

For server-side room discovery or REST API endpoints:

```typescript
import { matchMaker } from "colyseus";

// Query rooms with conditions
const rooms = await matchMaker.query({ 
  name: "battle", 
  mode: "duo" 
});

console.log(rooms);
// Response:
// [
//   { roomId: "xxx", processId: "yyy", name: "battle", locked: false },
//   { roomId: "xxx", processId: "yyy", name: "battle", locked: false }
// ]
```

**Query Response Structure:**
```typescript
interface QueryRoomResponse {
  roomId: string;
  processId: string;        // Process hosting the room
  name: string;
  locked: boolean;
  metadata?: Record<string, any>;
}
```

#### **Option 3: Query with Sorting**

Sort results by player count, rating, or custom fields:

```typescript
// Sort by players descending (most full rooms first)
const rooms = await matchMaker.query(
  { name: "battle", mode: "duo" }, 
  { clients: -1 }  // -1 = descending, 1 = ascending
);
```

#### **Option 4: React Hook** (Framework-specific)

For React applications:

```tsx
import { useLobbyRoom } from "@colyseus/react";

function Lobby() {
  const { rooms, error, isConnecting } = useLobbyRoom(
    () => client.joinOrCreate("lobby")
  );

  if (isConnecting) return <p>Connecting...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {rooms.map((room) => (
        <li key={room.roomId}>
          {room.name} — {room.clients}/{room.maxClients} players
        </li>
      ))}
    </ul>
  );
}
```

### 1.3 Implementing a Lobby Room

#### **Server-Side Setup**

1. **Enable realtime listing for game rooms:**

```typescript
import { defineServer, defineRoom } from "colyseus";
import { MatchRoom } from "./rooms/MatchRoom";

const server = defineServer({
  rooms: {
    match: defineRoom(MatchRoom).enableRealtimeListing(),
    // Other rooms...
  }
});
```

2. **LobbyRoom is built-in** — no custom implementation needed. It automatically:
   - Listens to room creation, join, leave events
   - Maintains live room state
   - Filters by name and metadata
   - Broadcasts to all connected clients

#### **Client-Side Connection**

```typescript
const client = new Client("ws://localhost:2567");
const lobby = await client.joinOrCreate("lobby");

lobby.onMessage("rooms", (rooms) => {
  console.log("Initial room list:", rooms);
});

// Store reference for later joining
let selectedRoom: RoomAvailable;

// User selects a room, then join it
const room = await client.join("match", { roomId: selectedRoom.roomId });
```

### 1.4 Example: Creating Matches with Metadata

**Server-side room creation with queryable metadata:**

```typescript
import { Room, Client } from "colyseus";
import { MapSchema, Schema, type } from "@colyseus/schema";

class MatchRoom extends Room {
  onCreate(options: any) {
    // Set queryable metadata on room creation
    this.setMetadata({
      gameMode: options.gameMode || "casual",
      map: options.map || "default",
      difficulty: options.difficulty || "normal",
      currentPlayers: 0,
      maxPlayers: 5
    });

    // Initialize room state
    this.setState(new MatchState());
  }

  onJoin(client: Client, options: any) {
    // Update player count in metadata
    this.setMetadata({ 
      currentPlayers: this.clients.length 
    });
  }

  onLeave(client: Client) {
    // Update player count when someone leaves
    this.setMetadata({ 
      currentPlayers: Math.max(0, this.clients.length - 1)
    });
  }
}
```

**Client-side: Querying matches with metadata filters**

```typescript
// Join with filtering criteria
const room = await client.joinOrCreate("match", {
  gameMode: "deathmatch",
  difficulty: "hard",
  map: "arena"
});
```

Or **dynamic lobby filtering:**

```typescript
const lobby = await client.joinOrCreate("lobby");

// Dynamically filter lobby display
lobby.send("filter", {
  metadata: {
    gameMode: "deathmatch",
    difficulty: "hard"
  }
});
```

---

## 2. Lobby Room Architecture Pattern

### 2.1 Should Lobby Be a Colyseus Room?

**Answer: YES — Use the built-in LobbyRoom**

**Reasons:**
- ✅ Automatic real-time synchronization of room list
- ✅ Handles room discovery lifecycle (creation, updates, removal)
- ✅ Supports filtering by name and metadata
- ✅ No custom server logic needed
- ✅ Built for performance (only broadcasts room changes, not full state)
- ✅ Separates concerns: game state vs. room discovery

**Alternative (Not Recommended):** Client-side polling
- ❌ Less efficient (repeated HTTP requests)
- ❌ Stale data (delay between polls)
- ❌ Higher server load
- ❌ Poor UX (UI lag)

### 2.2 Room Discovery and Joining Flow

```typescript
// === CLIENT SIDE ===

// Step 1: Connect to lobby and get available rooms
const client = new Client("ws://localhost:2567");
const lobby = await client.joinOrCreate("lobby");

let availableRooms: RoomAvailable[] = [];

lobby.onMessage("rooms", (rooms) => {
  availableRooms = rooms;
  renderRoomList(rooms);  // Update UI
});

lobby.onMessage("+", ([roomId, room]) => {
  const index = availableRooms.findIndex(r => r.roomId === roomId);
  if (index !== -1) {
    availableRooms[index] = room;
  } else {
    availableRooms.push(room);
  }
});

lobby.onMessage("-", (roomId) => {
  availableRooms = availableRooms.filter(r => r.roomId !== roomId);
});

// Step 2: User selects a room from list
async function joinSelectedRoom(selectedRoomId: string) {
  try {
    const room = await client.join("match", { 
      roomId: selectedRoomId 
    });
    
    room.state.players.onAdd((player, sessionId) => {
      console.log(sessionId, "joined:", player);
    });
    
    room.onMessage("game.start", () => {
      // Game loop started
    });
  } catch (error) {
    console.error("Failed to join room:", error);
  }
}

// === SERVER SIDE ===

// Lobby room automatically maintains list
// No server-side logic needed for basic discovery

// But you can query on-demand via REST API or internal server logic:
import { matchMaker } from "colyseus";

app.get("/api/available-matches", async (req, res) => {
  const matches = await matchMaker.query({ 
    name: "match" 
  });
  res.json(matches);
});
```

### 2.3 Data Structure for Player Selection

Store player metadata **before** joining match room:

```typescript
// === CLIENT SIDE ===

// Global player session state (before joining any room)
interface PlayerSession {
  role: "commander" | "kaiju";
  playerName: string;
  characterClass?: string;  // e.g., "sniper", "tank"
  reconnectionToken?: string;
}

let playerSession: PlayerSession;

// Step 1: Role & Name Selection (Entry Point)
function showRoleSelection() {
  document.querySelector("#role-commander").addEventListener("click", () => {
    playerSession = {
      role: "commander",
      playerName: prompt("Enter your commander name")
    };
    connectToLobby();
  });

  document.querySelector("#role-kaiju").addEventListener("click", () => {
    playerSession = {
      role: "kaiju",
      playerName: prompt("Enter your kaiju name"),
      characterClass: selectCharacterClass()
    };
    connectToLobby();
  });
}

// Step 2: Connect to Lobby with player info
async function connectToLobby() {
  const client = new Client("ws://localhost:2567");
  
  // Pass player info in joinOrCreate options
  const lobby = await client.joinOrCreate("lobby", {
    playerName: playerSession.playerName,
    role: playerSession.role
  });
  
  // Render lobby UI with available matches
}

// Step 3: Join match room with player data
async function joinMatch(matchId: string) {
  const room = await client.join("match", {
    roomId: matchId,
    playerName: playerSession.playerName,
    role: playerSession.role,
    characterClass: playerSession.characterClass
  });

  // Server receives these options and stores in player state
  room.state.players.onAdd((player, sessionId) => {
    console.log(`${player.playerName} (${player.role}) joined`);
  });
}
```

**Server-side storage:**

```typescript
class MatchRoom extends Room {
  onJoin(client: Client, options: any) {
    // Extract player info from options
    const player = new PlayerState();
    player.playerName = options.playerName;
    player.role = options.role;
    player.characterClass = options.characterClass;
    player.connected = true;

    this.state.players.set(client.sessionId, player);
    
    console.log(`${player.playerName} (${player.role}) joined as ${client.sessionId}`);
  }
}
```

### 2.4 Metadata Best Practices for Queryable Match Rooms

**Queryable metadata should be:**
- Stable and immutable (don't change after room creation)
- Relevant for filtering/discovery
- Used for matchmaking conditions

```typescript
class MatchRoom extends Room {
  onCreate(options: any) {
    // GOOD: Immutable metadata set once
    this.setMetadata({
      // Core identifiers
      name: options.matchName || `Match ${Date.now()}`,
      
      // Game configuration (immutable)
      gameMode: options.gameMode || "standard",
      difficulty: options.difficulty || "normal",
      map: options.map || "default_map",
      timeLimit: options.timeLimit || 3600,
      
      // Matchmaking criteria
      minPlayers: options.minPlayers || 2,
      maxPlayers: 5,
      
      // Status tracking (use setMetadata for updates)
      status: "waiting",  // waiting, in_progress, finished
      createdAt: Date.now(),
      season: options.season || 1
    });

    this.setState(new MatchState());
  }

  onJoin(client: Client, options: any) {
    // Update ONLY mutable metadata
    const playerCount = this.clients.length;
    const isFull = playerCount >= 5;
    
    this.setMetadata({
      status: playerCount >= 2 ? "in_progress" : "waiting",
      isFull: isFull
    });
  }

  startMatch() {
    // Update status when game starts
    this.setMetadata({ status: "in_progress" });
  }

  endMatch() {
    this.setMetadata({ status: "finished" });
  }
}
```

**Client-side querying examples:**

```typescript
// Query for casual matches
const casualMatches = await matchMaker.query({ 
  gameMode: "casual" 
});

// Query for specific difficulty
const hardMatches = await matchMaker.query({ 
  difficulty: "hard",
  status: "waiting"
});

// Query with sorting (most players first)
const activeMatches = await matchMaker.query(
  { status: "in_progress" },
  { clients: -1 }
);

// Filter in lobby room
lobby.send("filter", {
  metadata: {
    gameMode: "competitive",
    difficulty: "normal"
  }
});
```

---

## 3. Player Lifecycle Flow

### 3.1 Current vs. Proposed Architecture

**Current State (No Lobby):**
```
Entry Point (Role/Name) 
  ↓
Vanilla JS Selection (/index.html)
  ↓
Direct to MatchRoom (client.joinOrCreate/join)
  ↓
Game Starts Immediately
```

**Proposed State (With Lobby):**
```
Entry Point (Role/Name Selection)
  ↓
Player Session Created (role, playerName stored locally)
  ↓
Lobby Room Connection (discovers available matches)
  ↓
Match Room Selection (display, filter, join)
  ↓
Role/Character Confirmation
  ↓
Match Room Join
  ↓
Game Starts
```

### 3.2 Passing Player Name Through Lifecycle

**Phase 1: Entry Point (Role Selection)**

```html
<!-- public/index.html or public/role-selection.html -->
<div id="role-selection">
  <input type="text" id="player-name" placeholder="Enter your name">
  
  <button id="commander-btn">Play as Commander</button>
  <button id="kaiju-btn">Play as Kaiju</button>
</div>

<script>
// Store player info in sessionStorage (persists across redirects)
document.getElementById("commander-btn").addEventListener("click", () => {
  const playerName = document.getElementById("player-name").value;
  if (!playerName) {
    alert("Please enter a name");
    return;
  }
  
  sessionStorage.setItem("playerRole", "commander");
  sessionStorage.setItem("playerName", playerName);
  
  window.location.href = "/lobby.html";
});

document.getElementById("kaiju-btn").addEventListener("click", () => {
  const playerName = document.getElementById("player-name").value;
  if (!playerName) {
    alert("Please enter a name");
    return;
  }
  
  sessionStorage.setItem("playerRole", "kaiju");
  sessionStorage.setItem("playerName", playerName);
  
  window.location.href = "/lobby.html";
});
</script>
```

**Phase 2: Lobby Connection**

```javascript
// public/lobby.js

const client = new Colyseus.Client("ws://localhost:2567");

// Retrieve stored player info
const playerRole = sessionStorage.getItem("playerRole");
const playerName = sessionStorage.getItem("playerName");

// Connect to lobby with player info
async function connectLobby() {
  try {
    const lobby = await client.joinOrCreate("lobby", {
      playerName: playerName,
      role: playerRole
    });

    // Listen for room updates
    let availableMatches = [];

    lobby.onMessage("rooms", (rooms) => {
      availableMatches = rooms;
      renderMatchList(rooms);
    });

    lobby.onMessage("+", ([roomId, room]) => {
      const index = availableMatches.findIndex(r => r.roomId === roomId);
      if (index !== -1) {
        availableMatches[index] = room;
      } else {
        availableMatches.push(room);
      }
      renderMatchList(availableMatches);
    });

    lobby.onMessage("-", (roomId) => {
      availableMatches = availableMatches.filter(r => r.roomId !== roomId);
      renderMatchList(availableMatches);
    });

    return lobby;
  } catch (error) {
    console.error("Failed to join lobby:", error);
  }
}

// Render UI
function renderMatchList(matches) {
  const matchList = document.getElementById("match-list");
  matchList.innerHTML = matches
    .map(match => `
      <div class="match-card">
        <h3>${match.name}</h3>
        <p>Players: ${match.clients}/${match.maxClients}</p>
        <p>Mode: ${match.metadata?.gameMode || "unknown"}</p>
        <button onclick="joinMatch('${match.roomId}')">Join</button>
      </div>
    `)
    .join("");
}

// Phase 3: Join match room
async function joinMatch(roomId) {
  try {
    const room = await client.join("match", {
      roomId: roomId,
      playerName: playerName,
      role: playerRole
    });

    // Store match info and reconnection token
    sessionStorage.setItem("currentMatchId", room.roomId);
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);

    // Transition to game UI
    window.location.href = playerRole === "commander" 
      ? "/commander/app.html" 
      : "/kaiju/app.html";
  } catch (error) {
    console.error("Failed to join match:", error);
    alert("Could not join match: " + error.message);
  }
}

connectLobby();
```

**Phase 4: Game Room Connection**

```javascript
// public/commander/app.js or public/kaiju/app.js

const client = new Colyseus.Client("ws://localhost:2567");

// Retrieve connection info
const matchId = sessionStorage.getItem("currentMatchId");
const playerName = sessionStorage.getItem("playerName");
const playerRole = sessionStorage.getItem("playerRole");
const reconnectionToken = sessionStorage.getItem("reconnectionToken");

async function reconnectToGame() {
  try {
    let room;

    // Try reconnection first (if token exists)
    if (reconnectionToken) {
      try {
        room = await client.reconnect(reconnectionToken);
        console.log("Reconnected successfully");
      } catch (error) {
        console.log("Reconnection failed, joining fresh:", error);
        // Fall through to fresh join
      }
    }

    // Fresh join if no reconnection token or reconnection failed
    if (!room) {
      room = await client.join("match", {
        roomId: matchId,
        playerName: playerName,
        role: playerRole
      });
    }

    // Listen for game state
    room.state.players.onAdd((player, sessionId) => {
      console.log(`${player.playerName} (${player.role}) is in game`);
      if (playerRole === "commander") {
        renderCommanderHUD(room.state);
      } else {
        renderKaijuHUD(room.state);
      }
    });

    room.onMessage("game.start", () => {
      console.log("Game started!");
      startGameLoop(room);
    });

    return room;
  } catch (error) {
    console.error("Failed to connect to game:", error);
    // Return to role selection
    window.location.href = "/";
  }
}

reconnectToGame();
```

### 3.3 Role Selection in Lobby

**Two Approaches:**

#### **Approach 1: Role Selection Before Lobby (Recommended)**
- Pro: Clear player intent before lobby connection
- Pro: Server can optimize room discovery for role
- Pro: Separate UI flow for each role

```javascript
// Players select role → stored in sessionStorage → passed to lobby → passed to match
const playerRole = sessionStorage.getItem("playerRole");
const playerName = sessionStorage.getItem("playerName");

const lobby = await client.joinOrCreate("lobby", {
  role: playerRole,
  playerName: playerName
});

const room = await client.join("match", {
  roomId: selectedMatch,
  role: playerRole,
  playerName: playerName
});
```

#### **Approach 2: Character/Role Selection in Lobby UI**
- Pro: More flexible, can change mind
- Con: Extra step before game
- Con: Server must validate role availability

```javascript
// Role selected in lobby UI
let selectedRole = null;

function selectCharacter(role) {
  selectedRole = role;
}

async function confirmAndJoin(matchId) {
  const room = await client.join("match", {
    roomId: matchId,
    role: selectedRole,
    playerName: sessionStorage.getItem("playerName")
  });
}
```

**Server-side role enforcement:**

```typescript
class MatchRoom extends Room {
  onJoin(client: Client, options: any) {
    const requestedRole = options.role;

    // Validate role availability
    if (requestedRole === "commander") {
      // Only allow one commander
      if (this.state.commander) {
        throw new Error("Commander slot already taken");
      }
      const commander = new Commander();
      commander.playerName = options.playerName;
      this.state.commander = commander;
    } else if (requestedRole === "kaiju") {
      // Allow up to 4 kaiju
      if (this.state.kaiju.length >= 4) {
        throw new Error("All kaiju slots full");
      }
      const kaiju = new Kaiju();
      kaiju.playerName = options.playerName;
      this.state.kaiju.push(kaiju);
    }
  }
}
```

---

## 4. Colyseus Multi-Room Pattern

### 4.1 Client Transitions Between Rooms (Lobby → Match)

**Clean Room Transition Pattern:**

```typescript
class GameClient {
  private client: Colyseus.Client;
  private currentRoom: Colyseus.Room | null = null;
  
  constructor(serverUrl: string) {
    this.client = new Colyseus.Client(serverUrl);
  }

  // Transition: Role Selection → Lobby
  async enterLobby(playerName: string, role: string): Promise<Colyseus.Room> {
    // Store player info
    sessionStorage.setItem("playerName", playerName);
    sessionStorage.setItem("playerRole", role);

    // Leave previous room if exists
    if (this.currentRoom) {
      this.currentRoom.leave();
    }

    // Join lobby
    this.currentRoom = await this.client.joinOrCreate("lobby", {
      playerName,
      role
    });

    this.setupLobbyHandlers();
    return this.currentRoom;
  }

  private setupLobbyHandlers() {
    if (!this.currentRoom) return;

    let availableMatches = [];

    this.currentRoom.onMessage("rooms", (rooms) => {
      availableMatches = rooms;
      console.log("Lobby: received room list", rooms);
    });

    this.currentRoom.onMessage("+", ([roomId, room]) => {
      const index = availableMatches.findIndex(r => r.roomId === roomId);
      if (index !== -1) {
        availableMatches[index] = room;
      } else {
        availableMatches.push(room);
      }
      console.log("Lobby: room updated", roomId, room);
    });

    this.currentRoom.onMessage("-", (roomId) => {
      availableMatches = availableMatches.filter(r => r.roomId !== roomId);
      console.log("Lobby: room removed", roomId);
    });

    window.getAvailableMatches = () => availableMatches;
  }

  // Transition: Lobby → Match Room
  async joinMatch(matchRoomId: string): Promise<Colyseus.Room> {
    const playerName = sessionStorage.getItem("playerName") || "";
    const playerRole = sessionStorage.getItem("playerRole") || "kaiju";

    // Leave lobby
    if (this.currentRoom) {
      this.currentRoom.leave();
    }

    // Join match room
    this.currentRoom = await this.client.join("match", {
      roomId: matchRoomId,
      playerName,
      role: playerRole
    });

    // Store reconnection info
    sessionStorage.setItem("currentMatchId", this.currentRoom.roomId);
    sessionStorage.setItem("reconnectionToken", this.currentRoom.reconnectionToken);

    this.setupMatchHandlers();
    return this.currentRoom;
  }

  private setupMatchHandlers() {
    if (!this.currentRoom) return;

    this.currentRoom.state.players.onAdd((player, sessionId) => {
      console.log("Match: player added", sessionId, player);
    });

    this.currentRoom.onMessage("game.start", () => {
      console.log("Match: game started");
    });

    this.currentRoom.onLeave((code) => {
      console.log(`Left match room (code: ${code})`);
      this.currentRoom = null;
    });
  }

  // Return to Lobby (after match ends)
  async returnToLobby(): Promise<Colyseus.Room> {
    if (this.currentRoom?.name === "match") {
      this.currentRoom.leave();
    }
    const playerName = sessionStorage.getItem("playerName") || "";
    const playerRole = sessionStorage.getItem("playerRole") || "kaiju";
    
    return this.enterLobby(playerName, playerRole);
  }

  // Get current room
  getCurrentRoom(): Colyseus.Room | null {
    return this.currentRoom;
  }
}
```

### 4.2 Reconnection Tokens and Session Persistence

**Token Generation & Storage:**

```typescript
// === CLIENT SIDE ===

let room = await client.join("match", options);

// Colyseus automatically generates reconnection token
const reconnectionToken = room.reconnectionToken;
console.log("Reconnection token:", reconnectionToken);

// Store for later use
sessionStorage.setItem("reconnectionToken", reconnectionToken);
localForage.setItem("backupReconnectionToken", reconnectionToken);  // Persistent
```

**Reconnection Process:**

```typescript
// On page reload or reconnection attempt
async function attemptReconnection() {
  const reconnectionToken = 
    sessionStorage.getItem("reconnectionToken") ||
    await localForage.getItem("backupReconnectionToken");

  if (!reconnectionToken) {
    // No token available, go to role selection
    window.location.href = "/";
    return;
  }

  try {
    const room = await client.reconnect(reconnectionToken);
    console.log("Reconnected successfully");
    return room;
  } catch (error) {
    console.error("Reconnection failed:", error);
    
    // Check if game ended
    if (error.code === "RECONNECT_TIMEOUT") {
      alert("Match has ended, returning to lobby...");
      return await client.joinOrCreate("lobby", {
        playerName: sessionStorage.getItem("playerName"),
        role: sessionStorage.getItem("playerRole")
      });
    }
    
    // Other errors: return to role selection
    window.location.href = "/";
  }
}

// Reattach event listeners after reconnection
room.state.players.onAdd((player, sessionId) => {
  console.log("Player added:", player);
});

room.onMessage("game.state", (data) => {
  console.log("Game state update:", data);
});
```

**Token Lifecycle:**

```typescript
// === SERVER SIDE ===

class MatchRoom extends Room {
  onJoin(client: Client, options: any) {
    console.log(`Client ${client.sessionId} joined`);
    console.log(`Reconnection token: ${client.reconnectionToken}`);
    
    // Create player state
    const player = new Player();
    player.playerName = options.playerName;
    this.state.players.set(client.sessionId, player);
  }

  onDrop(client: Client, code: number) {
    console.log(`Client ${client.sessionId} dropped (code: ${code})`);
    
    // Allow reconnection window (30 seconds)
    this.allowReconnection(client, 30000);
    
    // Mark as disconnected
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
    }
  }

  onReconnect(client: Client) {
    console.log(`Client ${client.sessionId} reconnected`);
    
    // NEW reconnection token generated
    console.log(`New reconnection token: ${client.reconnectionToken}`);
    
    // Restore player state
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = true;
    }
    
    // The old reconnection token is INVALID after reconnection
    // Client must cache the new token
  }

  onLeave(client: Client, code: number) {
    console.log(`Client ${client.sessionId} left permanently`);
    
    // Clean up player state
    this.state.players.delete(client.sessionId);
  }
}
```

**Important:** After `onReconnect`, the client receives a NEW `reconnectionToken`. The old token becomes invalid.

### 4.3 Room Lifecycle Management

**Complete Room Lifecycle:**

```typescript
// === ROOM CREATION ===
// Server side:
this.setMetadata({
  status: "waiting",
  createdAt: Date.now()
});

// === ROOM DISCOVERY ===
// Clients connect to lobby
const lobby = await client.joinOrCreate("lobby");

// Lobby broadcasts room creation
// Client receives in onMessage("rooms", ...) or onMessage("+", ...)

// === ROOM JOINING ===
const room = await client.join("match", {
  roomId: roomId,
  playerName: playerName
});

room.state.onChange((state) => {
  // Room state updated
});

// === ACTIVE GAMEPLAY ===
room.send("player.move", { x: 10, y: 20 });
room.onMessage("game.update", (data) => {
  // Handle server messages
});

// === TEMPORARY DISCONNECT ===
// Client drops/reconnects
room.onLeave((code) => {
  if (code === CloseCode.FAILED_TO_RECONNECT) {
    // Reconnection retry exhausted
    console.log("Permanently left room");
  }
});

// === RECONNECTION ===
// Client uses reconnection token
const reconnectedRoom = await client.reconnect(token);

// === GRACEFUL LEAVE ===
room.leave();

// === ROOM DESTRUCTION ===
// Server side:
this.disconnect();
// Triggers onLeave for all clients
// Broadcasts room removal to lobby
```

**State Transitions:**

```typescript
// === SERVER SIDE: Metadata-driven state transitions ===

class MatchRoom extends Room {
  private currentPhase = "waiting";  // waiting → lobby → active → finished

  onCreate(options: any) {
    this.setState(new MatchState());
    this.setMetadata({ status: this.currentPhase });
  }

  onJoin(client: Client, options: any) {
    const playerCount = this.clients.length;
    
    if (playerCount >= 2 && this.currentPhase === "waiting") {
      this.transitionToLobby();
    }
  }

  private transitionToLobby() {
    this.currentPhase = "lobby";
    this.setMetadata({ status: "lobby" });
    this.broadcast("phase.changed", { phase: "lobby" });
  }

  startMatch() {
    this.currentPhase = "active";
    this.setMetadata({ status: "active" });
    this.broadcast("phase.changed", { phase: "active" });
  }

  endMatch() {
    this.currentPhase = "finished";
    this.setMetadata({ status: "finished" });
    this.broadcast("phase.changed", { phase: "finished" });
    
    // Schedule room cleanup
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 10000);  // Wait 10s before destroying room
  }
}
```

**Client-side room lifecycle handling:**

```typescript
let room = await client.join("match", options);

room.onMessage("phase.changed", (data) => {
  console.log("Room phase changed to:", data.phase);
  
  switch (data.phase) {
    case "lobby":
      renderLobbyUI(room.state);
      break;
    case "active":
      startGameLoop(room);
      break;
    case "finished":
      showGameResults(room.state);
      break;
  }
});

room.onLeave((code) => {
  console.log("Left room with code:", code);
  
  // Redirect appropriately
  if (code === CloseCode.NORMAL) {
    window.location.href = "/lobby.html";
  } else {
    showErrorMessage("Connection lost. Attempting to reconnect...");
  }
});
```

---

## Summary: Key Takeaways

| Aspect | Implementation |
|--------|-----------------|
| **Lobby Pattern** | Use built-in `LobbyRoom` with `enableRealtimeListing()` |
| **Room Discovery** | Client joins `"lobby"` room, listens to `"rooms"`, `"+"`, `"-"` messages |
| **Queryable Metadata** | Set immutable metadata in `onCreate()`, update mutable fields with `setMetadata()` |
| **Player Name** | Store in `sessionStorage` before joining, pass in options, server stores in state |
| **Role Selection** | Store role in `sessionStorage` at entry point, pass through options chain |
| **Room Transitions** | Leave old room → join new room → setup event handlers |
| **Reconnection** | Cache `room.reconnectionToken`, use `client.reconnect()` on disconnect |
| **Token Expiry** | Old token invalid after successful reconnection; store new token |
| **Lifecycle** | `onCreate()` → discovery → `onJoin()` → active gameplay → `onLeave()` → cleanup |

---

## Code Example: Complete End-to-End Flow

```typescript
// === 1. ENTRY POINT ===
sessionStorage.setItem("playerName", "John");
sessionStorage.setItem("playerRole", "commander");
window.location.href = "/lobby.html";

// === 2. LOBBY ===
const client = new Colyseus.Client("ws://localhost:2567");
const lobby = await client.joinOrCreate("lobby", {
  playerName: sessionStorage.getItem("playerName"),
  role: sessionStorage.getItem("playerRole")
});

const availableMatches = [];
lobby.onMessage("rooms", (rooms) => {
  availableMatches.push(...rooms);
  renderMatches(rooms);
});

// === 3. MATCH JOIN ===
async function playMatch() {
  const selectedMatch = availableMatches[0];
  const room = await client.join("match", {
    roomId: selectedMatch.roomId,
    playerName: sessionStorage.getItem("playerName"),
    role: sessionStorage.getItem("playerRole")
  });
  
  // Save reconnection token
  sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
  
  // Handle game
  room.state.players.onAdd((player) => {
    console.log(player.playerName, "joined game");
  });
}

// === 4. RECONNECTION ===
async function reconnectIfNeeded() {
  const token = sessionStorage.getItem("reconnectionToken");
  if (!token) return;
  
  try {
    const room = await client.reconnect(token);
    console.log("Reconnected!");
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
  } catch (error) {
    console.error("Reconnection failed:", error);
  }
}
```

