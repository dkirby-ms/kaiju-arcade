import request from "supertest";
import fs from "fs";
import path from "path";

const mockDefine = jest.fn();
const mockCreate = jest.fn();
const mockQuery = jest.fn();
const mockJoinById = jest.fn();

jest.mock("@colyseus/ws-transport", () => ({
  WebSocketTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("colyseus", () => ({
  Server: jest.fn().mockImplementation(() => ({
    define: mockDefine,
  })),
  Room: class {
    onMessage(_type: string, _handler: unknown): void {
      // no-op for unit tests
    }
  },
  Client: class {},
  matchMaker: {
    create: mockCreate,
    query: mockQuery,
    joinById: mockJoinById,
  },
}));

describe("API /api/matches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a match and returns reservation metadata", async () => {
    mockCreate.mockResolvedValue({
      sessionId: "sess-1",
      roomId: "room-1",
      processId: "proc-1",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "Neo Tokyo" });

    expect(response.status).toBe(200);
    expect(response.body.roomName).toBe("match");
    expect(response.body.sessionId).toBe("sess-1");
    expect(response.body.roomId).toBe("room-1");
    expect(response.body.processId).toBe("proc-1");
    expect(response.body).toHaveProperty("wsEndpoint");
    expect(response.body.reconnect).toEqual({
      enabled: true,
      tokenRequired: true,
      graceWindowMs: 30_000,
      optionKey: "reconnectToken",
    });
    expect(response.body.cityOptions).toEqual([
      "Neo Tokyo",
      "New Avalon",
      "Port Helios",
      "Glasspoint",
      "Cinder Bay",
    ]);
    expect(mockCreate).toHaveBeenCalledWith("match", { cityName: "Neo Tokyo" });
  });

  it("normalizes valid city names before creating matches", async () => {
    mockCreate.mockResolvedValue({
      sessionId: "sess-1",
      roomId: "room-1",
      processId: "proc-1",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "  new avalon  " });

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith("match", { cityName: "New Avalon" });
  });

  it("drops invalid cityName and relies on curated fallback behavior", async () => {
    mockCreate.mockResolvedValue({
      sessionId: "sess-1",
      roomId: "room-1",
      processId: "proc-1",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "Unknownopolis" });

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith("match", {});
    expect(response.body.cityOptions).toEqual([
      "Neo Tokyo",
      "New Avalon",
      "Port Helios",
      "Glasspoint",
      "Cinder Bay",
    ]);
  });

  it("returns match creation options for city dropdowns", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/api/matches/options");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      cityOptions: [
        "Neo Tokyo",
        "New Avalon",
        "Port Helios",
        "Glasspoint",
        "Cinder Bay",
      ],
      defaultCity: "Neo Tokyo",
    });
  });

  it("serves the commander console scaffold", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/commander/index.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("COMMANDER CONSOLE");
    expect(response.text).toContain("id=\"alertModeToggle\"");
    expect(response.text).toContain("id=\"matchElapsed\"");
    expect(response.text).toContain("id=\"etaToBase\"");
    expect(response.text).toContain("id=\"timelineFeed\"");
  });

  it("serves the kaiju pilot HUD scaffold", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/kaiju/index.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("KAIJU PILOT HUD");
    expect(response.text).toContain("class=\"panel context-switcher\"");
    expect(response.text).toContain("id=\"modeBadge\"");
    expect(response.text).toContain("id=\"primaryAlert\"");
    expect(response.text).toContain("id=\"continueCredits\"");
    expect(response.text).toContain("id=\"continueHint\"");
  });

  it("includes kaiju spectator map and cooldown fill scaffolding", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/kaiju/index.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("id=\"spectatorLeafletMap\"");
    expect(response.text).toContain("id=\"spectatorRadarOverlay\"");
    expect(response.text).toContain("id=\"attackCooldownFill\"");
    expect(response.text).toContain("id=\"abilityCooldownFill\"");
  });

  it("wires continue FX and spectator map handlers in kaiju client script", () => {
    const appJsPath = path.resolve(__dirname, "../public/kaiju/app.js");
    const appSource = fs.readFileSync(appJsPath, "utf8");

    expect(appSource).toContain("function playContainmentFx()");
    expect(appSource).toContain("function playCoinDropCue()");
    expect(appSource).toContain("function initializeSpectatorMap()");
    expect(appSource).toContain("function drawSpectatorMap()");
    expect(appSource).toContain("room.onMessage(\"kaiju.contained\"");
    expect(appSource).toContain("attackCooldownFillEl.style.width");
    expect(appSource).toContain("abilityCooldownFillEl.style.width");
    expect(appSource).toContain("function setContextPanel(panelName)");
    expect(appSource).toContain("function setPrimaryAlert(text, className)");
  });

  it("returns 400 when create fails", async () => {
    mockCreate.mockRejectedValue(new Error("create failed"));

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "Neo Tokyo" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("create failed");
  });

  it("lists active matches", async () => {
    mockQuery.mockResolvedValue([
      {
        roomId: "room-a",
        name: "match",
        clients: 2,
        maxClients: 5,
        locked: false,
      },
    ]);

    const { app } = await import("./index");

    const response = await request(app).get("/api/matches");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.matches[0]).toEqual({
      roomId: "room-a",
      name: "match",
      clients: 2,
      maxClients: 5,
      locked: false,
    });
    expect(mockQuery).toHaveBeenCalledWith({
      name: "match",
      private: false,
      locked: false,
    });
  });

  it("reserves a kaiju seat via join helper endpoint", async () => {
    mockJoinById.mockResolvedValue({
      sessionId: "sess-k-1",
      roomId: "room-1",
      processId: "proc-1",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches/room-1/kaiju-join")
      .send({ playerName: "Kaiju Pilot", reconnectToken: "reco-1" });

    expect(response.status).toBe(200);
    expect(response.body.roomName).toBe("match");
    expect(response.body.sessionId).toBe("sess-k-1");
    expect(response.body.roomId).toBe("room-1");
    expect(mockJoinById).toHaveBeenCalledWith("room-1", {
      playerName: "Kaiju Pilot",
      reconnectToken: "reco-1",
    });
  });

  it("returns 400 when kaiju seat reservation fails", async () => {
    mockJoinById.mockRejectedValue(new Error("join failed"));

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches/room-1/kaiju-join")
      .send({ playerName: "Kaiju Pilot" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("join failed");
  });

  it("returns 500 when listing fails", async () => {
    mockQuery.mockRejectedValue(new Error("query failed"));

    const { app } = await import("./index");

    const response = await request(app).get("/api/matches");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("query failed");
  });
});
