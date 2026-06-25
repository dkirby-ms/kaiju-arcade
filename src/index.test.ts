import request from "supertest";
import fs from "fs";
import path from "path";
import vm from "vm";

const mockDefine = jest.fn();
const mockEnableRealtimeListing = jest.fn();
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
  createNodeMatchmakingMiddleware: jest.fn().mockImplementation(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  Room: class {
    onMessage(_type: string, _handler: unknown): void {
      // no-op for unit tests
    }
  },
  LobbyRoom: class {},
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
    mockDefine.mockReturnValue({
      enableRealtimeListing: mockEnableRealtimeListing,
    });
  });

  it("registers match and lobby rooms with realtime listing enabled for match", async () => {
    await import("./index");

    expect(mockDefine).toHaveBeenCalledWith("match", expect.any(Function));
    expect(mockDefine).toHaveBeenCalledWith("lobby", expect.any(Function));
    expect(mockEnableRealtimeListing).toHaveBeenCalledTimes(1);
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
    expect(response.text).toContain("class=\"panel session-panel\"");
    expect(response.text).toContain("class=\"panel tactical-hud\"");
    expect(response.text).toContain("class=\"panel map-panel\"");
    expect(response.text).toContain("class=\"panel dispatch-panel\"");
    expect(response.text).toContain("class=\"panel signal-feed-panel\"");
    expect(response.text).toContain("id=\"targetId\"");
    expect(response.text).toContain("id=\"signalFeed\"");
    expect(response.text).toContain("id=\"alertModeToggle\"");
    expect(response.text).toContain("id=\"activeBarriers\"");
    expect(response.text).toContain("id=\"assetStatus\"");
    expect(response.text).toContain("id=\"dispatchResults\"");
  });

  it("serves the kaiju pilot HUD scaffold", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/kaiju/index.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("KAIJU PILOT HUD");
    expect(response.text).toContain("class=\"panel session-panel\"");
    expect(response.text).toContain("class=\"panel map-panel\"");
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

  it("serves entry page at root route", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Kaiju Arcade Entry");
    expect(response.text).toContain("id=\"entryForm\"");
    expect(response.text).toContain("/common/session-manager.js");
  });

  it("serves dedicated lobby page", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/lobby");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Matchmaking Lobby");
    expect(response.text).toContain("id=\"roomList\"");
    expect(response.text).toContain("/common/colyseus-client.js");
  });

  it("serves shared pre-match room page", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/match-room.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Shared Match Room");
    expect(response.text).toContain("id=\"reservationState\"");
    expect(response.text).toContain("id=\"participantList\"");
    expect(response.text).toContain("/common/match-room-app.js");
    expect(response.text).toContain("/common/session-manager.js");
  });

  it("serves shared pre-match room controller", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/common/match-room-app.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("attachMatchRoomApp");
    expect(response.text).toContain("match.role.claim");
    expect(response.text).toContain("match.start");
  });

  it("serves shared session manager helper", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/common/session-manager.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("global.KaijuSession");
  });

  it("serves shared colyseus client helper", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/common/colyseus-client.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("global.KaijuColyseusClient");
    expect(response.text).toContain("client.joinOrCreate(\"lobby\"");
    expect(response.text).toContain("client.joinById(roomId, joinOptions)");
    expect(response.text).not.toContain("client.joinById(roomId, {})");
  });

  it("serves shared room app without deprecated reconnect token listeners", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/common/match-room-app.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("consumeSeatReservation(client, reservation, joinOptions)");
    expect(response.text).not.toContain("match.reconnect.token");
    expect(response.text).not.toContain("kaiju.reconnect.token");
  });

  it("serves lobby slot controls helper", async () => {
    const { app } = await import("./index");

    const response = await request(app).get("/common/lobby-slot-controls.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("deriveSlotButtonState");
  });

  it("computes slot button states from lobby metadata", () => {
    const helperPath = path.resolve(__dirname, "../public/common/lobby-slot-controls.js");
    const helperSource = fs.readFileSync(helperPath, "utf8");
    const context = {
      window: {},
    } as {
      window: {
        KaijuLobbySlots?: {
          deriveSlotButtonState?: (room: { metadata?: { commanderTaken?: boolean; kaijuOpenSlots?: number } }, isBusy: boolean) => {
            commanderAvailable: boolean;
            kaijuAvailable: boolean;
            kaijuOpenSlots: number;
            joinCommanderDisabled: boolean;
            joinKaijuDisabled: boolean;
          };
        };
      };
    };

    vm.runInNewContext(helperSource, context);

    const deriveSlotButtonState = context.window.KaijuLobbySlots?.deriveSlotButtonState;
    expect(typeof deriveSlotButtonState).toBe("function");

    const openSlots = deriveSlotButtonState?.(
      {
        metadata: {
          commanderTaken: false,
          kaijuOpenSlots: 2,
        },
      },
      false
    );
    expect(openSlots).toEqual({
      commanderAvailable: true,
      kaijuOpenSlots: 2,
      kaijuAvailable: true,
      joinCommanderDisabled: false,
      joinKaijuDisabled: false,
    });

    const noCommanderSlot = deriveSlotButtonState?.(
      {
        metadata: {
          commanderTaken: true,
          kaijuOpenSlots: 1,
        },
      },
      false
    );
    expect(noCommanderSlot?.joinCommanderDisabled).toBe(true);
    expect(noCommanderSlot?.joinKaijuDisabled).toBe(false);

    const noKaijuSlots = deriveSlotButtonState?.(
      {
        metadata: {
          commanderTaken: false,
          kaijuOpenSlots: 0,
        },
      },
      false
    );
    expect(noKaijuSlots?.joinCommanderDisabled).toBe(false);
    expect(noKaijuSlots?.joinKaijuDisabled).toBe(true);

    const busyState = deriveSlotButtonState?.(
      {
        metadata: {
          commanderTaken: false,
          kaijuOpenSlots: 3,
        },
      },
      true
    );
    expect(busyState?.joinCommanderDisabled).toBe(true);
    expect(busyState?.joinKaijuDisabled).toBe(true);
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
    expect(appSource).toContain("function bindDirectionalKeyboardControls()");
    expect(appSource).toContain("function readStoredReconnectToken()");
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
        metadata: {
          state: "LOBBY",
          cityName: "Neo Tokyo",
          commanderTaken: true,
          kaijuOpenSlots: 3,
        },
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
      metadata: {
        state: "LOBBY",
        cityName: "Neo Tokyo",
        commanderTaken: true,
        kaijuOpenSlots: 3,
      },
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
      playerRole: "kaiju",
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

  it("reserves a seat via generic join endpoint without role selection", async () => {
    mockJoinById.mockResolvedValue({
      sessionId: "sess-g-1",
      roomId: "room-2",
      processId: "proc-2",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches/room-2/join")
      .send({ playerName: "Commander", reconnectToken: "reco-2" });

    expect(response.status).toBe(200);
    expect(response.body.roomName).toBe("match");
    expect(response.body.roomId).toBe("room-2");
    expect(response.body.sessionId).toBe("sess-g-1");
    expect(mockJoinById).toHaveBeenCalledWith("room-2", {
      playerName: "Commander",
      reconnectToken: "reco-2",
    });
  });

  it("ignores legacy role-bearing payload fields on generic join endpoint", async () => {
    mockJoinById.mockResolvedValue({
      sessionId: "sess-g-2",
      roomId: "room-3",
      processId: "proc-3",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches/room-3/join")
      .send({
        playerName: "Legacy Player",
        role: "commander",
        playerRole: "kaiju",
        reconnectToken: "reco-3",
      });

    expect(response.status).toBe(200);
    expect(mockJoinById).toHaveBeenCalledWith("room-3", {
      playerName: "Legacy Player",
      reconnectToken: "reco-3",
    });
  });

  it("returns 400 when generic join reservation fails", async () => {
    mockJoinById.mockRejectedValue(new Error("generic join failed"));

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches/room-2/join")
      .send({ playerName: "Commander", role: "commander" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("generic join failed");
  });

  it("returns 500 when listing fails", async () => {
    mockQuery.mockRejectedValue(new Error("query failed"));

    const { app } = await import("./index");

    const response = await request(app).get("/api/matches");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("query failed");
  });
});
