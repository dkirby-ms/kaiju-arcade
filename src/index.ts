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
import { config } from "./ops/config";
import { isReady, isDraining, startDrain } from "./ops/runtime-state";
import { logger, requestLogger } from "./ops/logger";
import { incCounter, getMetricsText, observeHistogram } from "./ops/metrics";
import { startSpan } from "./ops/tracing";
import { joinRateLimiter, createMatchRateLimiter } from "./ops/rate-limit";

const app = express();
const httpServer = createServer(app);
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

const portNum = config.PORT;
const hostname = config.HOST;

// Middleware
app.use(express.json());
app.use(requestLogger);
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

// Health check endpoint (backwards-compatible)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: getVersionInfo() });
});

// Liveness probe: always returns 200 if the process can serve requests
app.get("/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

// Readiness probe: returns 503 while draining so load balancers stop routing here
app.get("/health/ready", (_req, res) => {
  if (isReady()) {
    res.json({ status: "ok" });
  } else {
    res.status(503).json({ status: "draining" });
  }
});

// Version endpoint
app.get("/version", (_req, res) => {
  res.json(getVersionInfo());
});

// Prometheus metrics endpoint
app.get("/metrics", (_req, res) => {
  if (config.METRICS_ENABLED) {
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(getMetricsText());
  } else {
    res.status(404).json({ error: "Metrics not enabled" });
  }
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
app.post("/api/matches", createMatchRateLimiter, async (req, res) => {
  if (isDraining()) {
    res.status(503).json({ error: "Server draining, please reconnect to another instance" });
    return;
  }
  const requestStart = Date.now();
  const span = startSpan("api.match.create");
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
    incCounter("kaiju_join_total", { outcome: "success", role: "commander" });
    observeHistogram("kaiju_join_latency_ms", Date.now() - requestStart, { outcome: "success" });

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
    span.end();
  } catch (error) {
    incCounter("kaiju_join_total", { outcome: "failure", role: "commander" });
    span.end(error as Error);
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
app.post("/api/matches/:roomId/kaiju-join", joinRateLimiter, async (req, res) => {
  if (isDraining()) {
    res.status(503).json({ error: "Server draining, please reconnect to another instance" });
    return;
  }
  const span = startSpan("api.match.kaiju-join", { roomId: req.params.roomId });
  try {
    const roomId = req.params.roomId;
    if (!roomId) {
      span.end();
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const options: Record<string, unknown> = {
      ...(typeof body.playerName === "string" ? { playerName: body.playerName } : {}),
      playerRole: "kaiju",
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
    span.end();
  } catch (error) {
    span.end(error as Error);
    res.status(400).json({ error: (error as Error).message });
  }
});

// REST API: Reserve seat for a specific room without committing to a role.
app.post("/api/matches/:roomId/join", joinRateLimiter, async (req, res) => {
  if (isDraining()) {
    res.status(503).json({ error: "Server draining, please reconnect to another instance" });
    return;
  }
  const span = startSpan("api.match.join", { roomId: req.params.roomId });
  try {
    const roomId = req.params.roomId;
    if (!roomId) {
      span.end();
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const options: Record<string, unknown> = {
      ...(typeof body.playerName === "string" ? { playerName: body.playerName } : {}),
      ...(typeof body.playerRole === "string" ? { playerRole: body.playerRole } : {}),
      ...(typeof body.reconnectToken === "string" ? { reconnectToken: body.reconnectToken } : {}),
    };

    console.log(`[TOKEN] /api/matches/join: roomId=${roomId}, playerRole=${body.playerRole || 'MISSING'}, reconnectToken from body=${body.reconnectToken ? String(body.reconnectToken).slice(0, 8) : 'MISSING'}`);

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
    span.end();
  } catch (error) {
    span.end(error as Error);
    res.status(400).json({ error: (error as Error).message });
  }
});

export function startServer() {
  return httpServer.listen(portNum, hostname as string, () => {
    const version = getVersionInfo();
    logger.info("server started", { host: hostname, port: portNum, version: version.version });
  });
}

if (require.main === module) {
  startServer();
}

// Graceful drain on SIGTERM (container shutdown, rolling deploys)
process.on("SIGTERM", () => {
  logger.info("sigterm received", { drainTimeoutMs: config.DRAIN_TIMEOUT_MS });
  startDrain(config.DRAIN_TIMEOUT_MS);
  setTimeout(() => {
    httpServer.close(() => {
      logger.info("server closed");
      process.exit(0);
    });
  }, config.DRAIN_TIMEOUT_MS);
});

// Graceful shutdown on SIGINT (local dev / ctrl-C)
process.on("SIGINT", () => {
  logger.info("sigint received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("server closed");
    process.exit(0);
  });
});

export { app, gameServer };

