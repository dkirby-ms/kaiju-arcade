/**
 * Kaiju Arcade Server
 *
 * Entry point for the multiplayer game server.
 * Sets up Colyseus, Express, and initializes the match room.
 */

import express from "express";
import { createServer } from "http";
import { Server as ColyseusServer } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MatchRoom } from "./game/MatchRoom";
import { getVersionInfo } from "./utils/version";

const app = express();
const httpServer = createServer(app);
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

const port = process.env.PORT || 3000;
const hostname = process.env.HOST || "localhost";

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: getVersionInfo() });
});

// Version endpoint
app.get("/version", (_req, res) => {
  res.json(getVersionInfo());
});

// Register match room
gameServer.define("match", MatchRoom);

// REST API: Create new match
app.post("/api/matches", (req, res) => {
  try {
    const options = req.body || {};
    res.json({
      message: "Match created. Connect via WebSocket to /match",
      options,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// REST API: List active matches
app.get("/api/matches", (_req, res) => {
  // Workaround for internal API access
  const matchRooms = (gameServer as any)["_roomsById"] as
    | Record<string, any>
    | undefined;

  const matches = matchRooms
    ? Object.values(matchRooms).map((room: any) => {
        return {
          roomId: room.roomId,
          name: room.name,
          clients: room.clients?.length || 0,
          maxClients: room.maxClients,
        };
      })
    : [];

  res.json({ matches, total: matches.length });
});

// Start server
const portNum = typeof port === "string" ? parseInt(port, 10) : port;
httpServer.listen(portNum, hostname as string, () => {
  const version = getVersionInfo();
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🦑 KAIJU ARCADE SERVER STARTED 🦑               ║
╠════════════════════════════════════════════════════════════╣
║ Version: ${version.version.padEnd(49)} ║
║ Host:    ${(`http://${hostname}:${portNum}`).padEnd(49)} ║
║ WS URL:  ${"ws://".concat(hostname, ":", portNum.toString()).padEnd(49)} ║
╠════════════════════════════════════════════════════════════╣
║ Health:  http://${hostname}:${portNum}/health              ║
║ API:     http://${hostname}:${portNum}/api/matches         ║
╚════════════════════════════════════════════════════════════╝
  `.trim());
  console.log("Ready for players to join!");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { app, gameServer };

