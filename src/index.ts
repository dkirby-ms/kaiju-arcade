/**
 * Kaiju Arcade Server
 *
 * Entry point for the multiplayer game server.
 * Sets up Colyseus, Express, and initializes the match room.
 */

import express from "express";
import { createServer } from "http";
import path from "path";
import { Server as ColyseusServer } from "colyseus";
import { matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MatchRoom } from "./game/MatchRoom";
import { getAvailableCities, normalizeRequestedCityName } from "./game/lastStandCities";
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
const portNum = typeof port === "string" ? parseInt(port, 10) : port;

// Middleware
app.use(express.json());
app.use(
  "/commander",
  express.static(path.resolve(__dirname, "../public/commander"))
);
app.use(
  "/kaiju",
  express.static(path.resolve(__dirname, "../public/kaiju"))
);
app.use("/common", express.static(path.resolve(__dirname, "../public/common")));
app.use(express.static(path.resolve(__dirname, "../public")));

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/index.html"));
});

app.get("/lobby", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/lobby.html"));
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: getVersionInfo() });
});

// Version endpoint
app.get("/version", (_req, res) => {
  res.json(getVersionInfo());
});

// REST API: Match creation options for clients (city dropdown data)
app.get("/api/matches/options", (_req, res) => {
  const cities = getAvailableCities();
  res.json({
    cityOptions: cities,
    defaultCity: cities[0],
  });
});

// Register match room with realtime listing so LobbyRoom clients can discover updates.
gameServer.define("match", MatchRoom).enableRealtimeListing();

// REST API: Create new match
app.post("/api/matches", async (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const normalizedCityName = normalizeRequestedCityName(
      typeof body.cityName === "string" ? body.cityName : undefined
    );
    const options: Record<string, unknown> = {
      ...body,
      ...(normalizedCityName ? { cityName: normalizedCityName } : {}),
    };

    if (!normalizedCityName) {
      delete options.cityName;
    }

    const reservation = await matchMaker.create("match", options as Record<string, unknown>);

    res.json({
      roomName: "match",
      sessionId: reservation.sessionId,
      roomId: reservation.roomId,
      processId: reservation.processId,
      publicAddress: reservation.publicAddress,
      wsEndpoint: `ws://${hostname}:${portNum}`,
      reconnect: {
        enabled: true,
        tokenRequired: true,
        graceWindowMs: 30_000,
        optionKey: "reconnectToken",
      },
      cityOptions: getAvailableCities(),
      message: "Match created with seat reservation. Join by roomId/sessionId via Colyseus client.",
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// REST API: List active matches
app.get("/api/matches", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({
      name: "match",
      private: false,
      locked: false,
    });

    const matches = rooms.map((room) => ({
      roomId: room.roomId,
      name: room.name,
      clients: room.clients,
      maxClients: room.maxClients,
      locked: room.locked,
      metadata: (room as { metadata?: Record<string, unknown> }).metadata || {},
    }));

    res.json({ matches, total: matches.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// REST API: Reserve Kaiju seat for a specific room (mobile-friendly join helper)
app.post("/api/matches/:roomId/kaiju-join", async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (!roomId) {
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const options: Record<string, unknown> = {
      ...(typeof body.playerName === "string" ? { playerName: body.playerName } : {}),
      ...(typeof body.reconnectToken === "string" ? { reconnectToken: body.reconnectToken } : {}),
    };

    const reservation = await matchMaker.joinById(roomId, options);
    res.json({
      roomName: "match",
      sessionId: reservation.sessionId,
      roomId: reservation.roomId,
      processId: reservation.processId,
      publicAddress: reservation.publicAddress,
      wsEndpoint: `ws://${hostname}:${portNum}`,
      reconnect: {
        enabled: true,
        tokenRequired: true,
        graceWindowMs: 30_000,
        optionKey: "reconnectToken",
      },
      message: "Kaiju seat reserved. Join with consumeSeatReservation.",
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// REST API: Reserve seat for a specific room without committing to a role.
app.post("/api/matches/:roomId/join", async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (!roomId) {
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const options: Record<string, unknown> = {
      ...(typeof body.playerName === "string" ? { playerName: body.playerName } : {}),
      ...(typeof body.reconnectToken === "string" ? { reconnectToken: body.reconnectToken } : {}),
    };

    const reservation = await matchMaker.joinById(roomId, options);

    res.json({
      roomName: "match",
      sessionId: reservation.sessionId,
      roomId: reservation.roomId,
      processId: reservation.processId,
      publicAddress: reservation.publicAddress,
      wsEndpoint: `ws://${hostname}:${portNum}`,
      reconnect: {
        enabled: true,
        tokenRequired: true,
        graceWindowMs: 30_000,
        optionKey: "reconnectToken",
      },
      message: "Seat reserved. Join with consumeSeatReservation.",
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export function startServer() {
  return httpServer.listen(portNum, hostname as string, () => {
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
}

if (require.main === module) {
  startServer();
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { app, gameServer };

