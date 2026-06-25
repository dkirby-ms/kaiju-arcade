jest.mock("colyseus", () => {
  class MockRoom {
    public state: unknown;
    public maxClients = 0;
    public autoDispose = true;

    onMessage(_type: string, _handler: unknown): void {
      // no-op for unit tests
    }

    setMetadata(_metadata: unknown): void {
      // no-op for unit tests
    }

    disconnect(): void {
      // no-op for unit tests
    }
  }

  return {
    Room: MockRoom,
    Client: class {},
  };
});

import { MatchRoom } from "./MatchRoom";
import { lastStandCities } from "./lastStandCities";
import { LeviathanSchema } from "../schema/MatchSchema";
import { startDrain, resetDrainState } from "../ops/runtime-state";

function sendClientMessage(
  room: MatchRoom,
  sessionId: string,
  message: { type: string; [key: string]: unknown }
) {
  (room as unknown as {
    handleClientMessage: (client: { sessionId: string }, payload: { type: string; [key: string]: unknown }) => void;
  }).handleClientMessage({ sessionId }, message);
}

function claimRole(room: MatchRoom, sessionId: string, role: "COMMANDER" | "KAIJU") {
  sendClientMessage(room, sessionId, { type: "match.role.claim", role });
}

function setReady(room: MatchRoom, sessionId: string, ready = true) {
  sendClientMessage(room, sessionId, { type: "match.ready", ready });
}

function claimDefaultRoles(room: MatchRoom) {
  claimRole(room, "session-1", "COMMANDER");
  claimRole(room, "session-2", "KAIJU");
}

function claimAndReadyDefaultRoles(room: MatchRoom) {
  claimDefaultRoles(room);
  setReady(room, "session-1", true);
  setReady(room, "session-2", true);
}

describe("MatchRoom role assignment", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("keeps joins unassigned until players claim roles and ready up", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );

    expect(room.state.commander.playerId).toBe("");
    expect(room.state.commander.playerName).toBe("");
    expect(room.state.leviathans.length).toBe(4);
    expect(room.state.leviathans.every((leviathan: LeviathanSchema) => leviathan.isAI)).toBe(true);
    expect(room.state.participants[0]?.claimedRole).toBe("");

    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    expect(room.state.metadata.state).toBe("LOBBY");
    expect(room.state.leviathans.every((leviathan: LeviathanSchema) => leviathan.isAI)).toBe(true);

    claimDefaultRoles(room);

    expect(room.state.commander.playerId).toBe("session-1");
    expect(room.state.commander.playerName).toBe("Commander One");
    expect(room.state.leviathans.length).toBe(4);
    expect(room.state.leviathans.some((leviathan: LeviathanSchema) => leviathan.playerId === "session-2")).toBe(true);
    expect(room.state.leviathans.filter((leviathan: LeviathanSchema) => leviathan.isAI).length).toBe(3);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(room.state.metadata.state).toBe("LOBBY");

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(room.state.metadata.state).toBe("ACTIVE");

    room.onDispose();
  });

  it("selects random city when none is provided", () => {
    const room = new MatchRoom();

    room.onCreate({});

    expect(lastStandCities).toContain(room.state.cityBase.cityName as (typeof lastStandCities)[number]);

    room.onDispose();
  });

  it("rejects join attempts beyond kaiju capacity", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );

    for (let i = 0; i < 4; i++) {
      room.onJoin(
        { id: `client-k-${i + 2}`, sessionId: `session-k-${i + 2}` } as unknown as never,
        { playerName: `Kaiju ${i + 1}`, playerRole: "KAIJU" }
      );
    }

    const overflowLeave = jest.fn();
    room.onJoin(
      { id: "client-overflow", sessionId: "session-overflow", leave: overflowLeave } as unknown as never,
      { playerName: "Kaiju Overflow", playerRole: "KAIJU" }
    );

    const sessions = (room as unknown as { playerSessions: Map<string, unknown> }).playerSessions;
    expect(sessions.size).toBe(5);
    expect(sessions.has("session-overflow")).toBe(false);
    expect(overflowLeave).toHaveBeenCalledWith(1008, "No kaiju slot available");
    expect(room.state.leviathans.filter((leviathan: LeviathanSchema) => !leviathan.isAI).length).toBe(4);
    expect(broadcast).toHaveBeenCalledWith(
      "match.join.rejected",
      expect.objectContaining({
        type: "match.join.rejected",
        reason: "capacity",
        sessionId: "session-overflow",
      })
    );
    expect(
      room.state.signalFeed.some(
        (signal: { message: string }) => signal.message === "JOIN REJECTED - MATCH AT CAPACITY"
      )
    ).toBe(true);

    room.onDispose();
  });

  it("allows kaiju reconnect within reconnection window", async () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    const allowReconnectionMock = jest.fn().mockResolvedValue(undefined);
    (room as unknown as { allowReconnection: typeof allowReconnectionMock }).allowReconnection =
      allowReconnectionMock;

    await room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    expect(kaijuSlot?.isAI).toBe(false);
    expect(kaijuSlot?.playerId).toBe("session-2");
    expect(allowReconnectionMock).toHaveBeenCalled();

    room.onReconnect(
      { id: "client-2", sessionId: "session-2" } as unknown as never
    );

    expect(kaijuSlot?.isAI).toBe(false);
    expect(kaijuSlot?.playerId).toBe("session-2");

    room.onDispose();
  });

  it("allows commander reconnect within reconnection window", async () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );

    const allowReconnectionMock = jest.fn().mockResolvedValue(undefined);
    (room as unknown as { allowReconnection: typeof allowReconnectionMock }).allowReconnection =
      allowReconnectionMock;

    await room.onLeave(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      1006
    );

    expect(allowReconnectionMock).toHaveBeenCalled();
    expect(room.state.commander.playerId).toBe("session-1");

    room.onReconnect(
      { id: "client-1", sessionId: "session-1" } as unknown as never
    );

    expect(room.state.commander.playerId).toBe("session-1");
    expect(room.state.commander.playerName).toBe("Commander One");

    room.onDispose();
  });

  it("cleans up kaiju claim when reconnection window expires", async () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    const allowReconnectionMock = jest.fn().mockRejectedValue(new Error("timeout"));
    (room as unknown as { allowReconnection: typeof allowReconnectionMock }).allowReconnection =
      allowReconnectionMock;

    await room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    expect(kaijuSlot?.playerId).toBe("");
    expect(kaijuSlot?.isAI).toBe(true);

    room.onDispose();
  });

  it("promotes disconnected kaiju to AI after grace window expires", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    jest.advanceTimersByTime(30_000);

    expect(kaijuSlot?.isAI).toBe(true);
    expect(kaijuSlot?.playerId).toBe("");

    room.onDispose();
  });

  it("broadcasts signal feed events for commander and kaiju claims", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimDefaultRoles(room);

    expect(broadcast).toHaveBeenCalledWith(
      "signal.feed",
      expect.objectContaining({
        type: "signal.feed",
        message: "COMMANDER COMMANDER ONE ONLINE",
        severity: "nominal",
      })
    );
    expect(broadcast).toHaveBeenCalledWith(
      "signal.feed",
      expect.objectContaining({
        type: "signal.feed",
        message: expect.stringContaining("PILOT ENGAGED"),
        severity: "nominal",
      })
    );

    room.onDispose();
  });

  it("records non-zero timestamps for commander join and match start signals", () => {
    const room = new MatchRoom();

    jest.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );

    claimRole(room, "session-1", "COMMANDER");

    const commanderOnlineSignal = room.state.signalFeed.find(
      (signal: { message: string }) => signal.message === "COMMANDER COMMANDER ONE ONLINE"
    );
    expect(commanderOnlineSignal?.timestamp).toBeGreaterThan(0);

    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimRole(room, "session-2", "KAIJU");
    setReady(room, "session-1", true);
    setReady(room, "session-2", true);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const matchStartSignal = room.state.signalFeed.find(
      (signal: { message: string }) => signal.message === "MATCH START"
    );
    expect(matchStartSignal?.timestamp).toBeGreaterThan(0);

    room.onDispose();
  });

  it("validates commander dispatch target and cooldown before consuming assets", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const targetLeviathan = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(targetLeviathan).toBeDefined();

    const initialJetCount = room.state.commander.assetsRemaining.get("Scramble Jets");

    (room as unknown as {
      handleCommanderDispatch: (assetName: string, targetId: string) => void;
    }).handleCommanderDispatch("Scramble Jets", "missing-target");

    expect(room.state.commander.assetsRemaining.get("Scramble Jets")).toBe(initialJetCount);
    expect(
      room.state.signalFeed.some(
        (signal: { message: string }) => signal.message === "DISPATCH FAILED: Scramble Jets TARGET INVALID"
      )
    ).toBe(true);

    (room as unknown as {
      handleCommanderDispatch: (assetName: string, targetId: string) => void;
    }).handleCommanderDispatch("Scramble Jets", targetLeviathan?.id ?? "");

    expect(room.state.dispatchHistory.length).toBe(1);
    expect(room.state.dispatchHistory[0].assetName).toBe("Scramble Jets");
    expect(room.state.commander.assetsRemaining.get("Scramble Jets")).toBe((initialJetCount ?? 0) - 1);

    (room as unknown as {
      handleCommanderDispatch: (assetName: string, targetId: string) => void;
    }).handleCommanderDispatch("Scramble Jets", targetLeviathan?.id ?? "");

    expect(room.state.dispatchHistory.length).toBe(1);
    expect(room.state.commander.assetsRemaining.get("Scramble Jets")).toBe((initialJetCount ?? 0) - 1);
    expect(
      room.state.signalFeed.some(
        (signal: { message: string }) => signal.message.includes("DISPATCH FAILED: Scramble Jets COOLDOWN")
      )
    ).toBe(true);

    room.onDispose();
  });

  it("handles kaiju move and ability client messages", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju).toBeDefined();

    (room as unknown as {
      handleClientMessage: (
        client: { sessionId: string },
        message: { type: string; heading?: number; moveX?: number; moveY?: number; abilityId?: string }
      ) => void;
    }).handleClientMessage(
      { sessionId: "session-2" },
      { type: "kaiju.move", moveX: 0, moveY: 1 }
    );

    expect(kaiju?.heading).toBe(90);
    expect(kaiju?.moveX).toBe(0);
    expect(kaiju?.moveY).toBe(1);

    kaiju!.archetype = "Sniper";
    (room as unknown as {
      handleClientMessage: (
        client: { sessionId: string },
        message: { type: string; heading?: number; moveX?: number; moveY?: number; abilityId?: string }
      ) => void;
    }).handleClientMessage(
      { sessionId: "session-2" },
      { type: "kaiju.ability", abilityId: "submerge" }
    );

    (room as unknown as { tick: () => void }).tick();

    expect(broadcast).toHaveBeenCalledWith(
      "kaiju.ability.result",
      expect.objectContaining({
        type: "kaiju.ability.result",
        leviathanId: kaiju?.id,
        abilityId: "submerge",
      })
    );

    room.onDispose();
  });

  it("allows kaiju continue inside the continue window", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju).toBeDefined();

    kaiju!.status = "CONTAINED";
    kaiju!.containedAt = Date.now();
    kaiju!.hp = 0;
    const creditsBefore = kaiju!.credits;

    (room as unknown as {
      handleClientMessage: (
        client: { sessionId: string },
        message: { type: string }
      ) => void;
    }).handleClientMessage(
      { sessionId: "session-2" },
      { type: "kaiju.continue" }
    );

    expect(kaiju?.status).toBe("ACTIVE");
    expect(kaiju?.hp).toBeGreaterThan(0);
    expect(kaiju?.credits).toBe((creditsBefore ?? 0) - 1);

    room.onDispose();
  });

  it("rejects kaiju continue after continue window expires", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju).toBeDefined();

    kaiju!.status = "CONTAINED";
    kaiju!.containedAt = Date.now() - 11_000;
    kaiju!.hp = 0;
    kaiju!.credits = 0;
    const creditsBefore = kaiju!.credits;

    (room as unknown as {
      handleClientMessage: (
        client: { sessionId: string },
        message: { type: string }
      ) => void;
    }).handleClientMessage(
      { sessionId: "session-2" },
      { type: "kaiju.continue" }
    );

    expect(kaiju?.status).toBe("CONTAINED");
    expect(kaiju?.credits).toBe(creditsBefore);

    (room as unknown as { tick: () => void }).tick();

    expect(kaiju?.isSpectator).toBe(true);

    room.onDispose();
  });

  it("broadcasts kaiju.spectator exactly once when continue window expires", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju).toBeDefined();

    kaiju!.status = "CONTAINED";
    kaiju!.containedAt = Date.now() - 11_000;
    kaiju!.credits = 0;

    (room as unknown as { tick: () => void }).tick();

    expect(broadcast).toHaveBeenCalledWith(
      "kaiju.spectator",
      expect.objectContaining({
        type: "kaiju.spectator",
        leviathanId: kaiju?.id,
        reason: "continue-window-expired",
      })
    );

    const firstSpectatorCalls = broadcast.mock.calls.filter((call: unknown[]) => call[0] === "kaiju.spectator").length;
    (room as unknown as { tick: () => void }).tick();
    const secondSpectatorCalls = broadcast.mock.calls.filter((call: unknown[]) => call[0] === "kaiju.spectator").length;
    expect(secondSpectatorCalls).toBe(firstSpectatorCalls);

    room.onDispose();
  });

  it("broadcasts kaiju.contained once per containment event", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju).toBeDefined();

    kaiju!.status = "CONTAINED";
    kaiju!.containedAt = Date.now() - 1_000;

    (room as unknown as { tick: () => void }).tick();

    expect(broadcast).toHaveBeenCalledWith(
      "kaiju.contained",
      expect.objectContaining({
        type: "kaiju.contained",
        leviathanId: kaiju?.id,
        leviathanName: kaiju?.name,
        creditsRemaining: kaiju?.credits,
      })
    );

    const firstContainedCalls = broadcast.mock.calls.filter((call: unknown[]) => call[0] === "kaiju.contained").length;

    (room as unknown as { tick: () => void }).tick();
    const secondContainedCalls = broadcast.mock.calls.filter((call: unknown[]) => call[0] === "kaiju.contained").length;
    expect(secondContainedCalls).toBe(firstContainedCalls);

    kaiju!.status = "ACTIVE";
    kaiju!.containedAt = 0;
    (room as unknown as { tick: () => void }).tick();

    kaiju!.status = "CONTAINED";
    kaiju!.containedAt = Date.now();
    (room as unknown as { tick: () => void }).tick();

    const thirdContainedCalls = broadcast.mock.calls.filter((call: unknown[]) => call[0] === "kaiju.contained").length;
    expect(thirdContainedCalls).toBe(firstContainedCalls + 1);

    room.onDispose();
  });

  it("broadcasts commander status payload with cooldown and score state", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(broadcast).toHaveBeenCalledWith(
      "commander.status",
      expect.objectContaining({
        type: "commander.status",
        selectedLeviathanId: "",
        assetsRemaining: expect.objectContaining({ "Scramble Jets": 5 }),
        assetCooldownsMsRemaining: expect.any(Object),
        assetCooldownsReady: expect.any(Object),
        assetCooldownsProgress: expect.any(Object),
        commanderScore: 0,
        cityBaseHp: expect.any(Number),
      })
    );

    room.onDispose();
  });

  it("broadcasts commander dispatch results once and marks records applied", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });

    const dispatch = room.state.createDispatchRecord("Deploy Mechs", "lev-1", Date.now());
    dispatch.outcome = "SUCCESS";
    dispatch.resolvedAt = Date.now();
    dispatch.applied = false;
    room.state.dispatchHistory.push(dispatch);

    (room as unknown as { broadcastDispatchResults: () => void }).broadcastDispatchResults();

    expect(broadcast).toHaveBeenCalledWith(
      "commander.dispatch.result",
      expect.objectContaining({
        type: "commander.dispatch.result",
        dispatchId: dispatch.id,
        outcome: "SUCCESS",
      })
    );
    expect(room.state.dispatchHistory[0].applied).toBe(true);

    const callCountAfterFirstBroadcast = broadcast.mock.calls.length;
    (room as unknown as { broadcastDispatchResults: () => void }).broadcastDispatchResults();
    expect(broadcast.mock.calls.length).toBe(callCountAfterFirstBroadcast);

    room.onDispose();
  });

  it("includes dispatchId in signal.feed payload when signal is dispatch-correlated", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });

    (room as unknown as {
      emitSignal: (message: string, severity: "nominal" | "alert" | "critical", source: string, dispatchId?: string) => void;
    }).emitSignal("DISPATCH: TEST", "nominal", "COMMANDER", "dispatch-xyz");

    expect(broadcast).toHaveBeenCalledWith(
      "signal.feed",
      expect.objectContaining({
        type: "signal.feed",
        message: "DISPATCH: TEST",
        dispatchId: "dispatch-xyz",
      })
    );

    room.onDispose();
  });

  it("broadcasts normalized result outcomes for all terminal paths", () => {
    const scenarios = [
      { rawOutcome: "KAIJU_VICTORY", expected: "kaiju-victory" },
      { rawOutcome: "COMMANDER_VICTORY", expected: "commander-victory" },
      { rawOutcome: "TIME_LIMIT", expected: "time-limit" },
      { rawOutcome: "ABORTED", expected: "aborted" },
    ] as const;

    for (const scenario of scenarios) {
      const room = new MatchRoom();
      const broadcast = jest.fn();
      (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;
      (room as unknown as { clients: Array<{ leave: () => void }> }).clients = [];

      room.onCreate({ cityName: "Neo Tokyo" });
      room.state.metadata.startedAt = Date.now() - 5_000;
      room.state.metadata.outcome = scenario.rawOutcome;

      (room as unknown as { endMatch: () => void }).endMatch();

      expect(broadcast).toHaveBeenCalledWith(
        "match.result",
        expect.objectContaining({
          type: "match.result",
          outcome: scenario.expected,
          summary: expect.objectContaining({
            baseHPRemaining: expect.any(Number),
            commanderScore: expect.any(Number),
            comboPeak: expect.any(Number),
            duration: expect.any(Number),
          }),
        })
      );

      room.onDispose();
    }
  });

  it("enters LOBBY before ACTIVE and broadcasts match phase transitions", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    expect(room.state.metadata.state).toBe("LOBBY");
    expect(broadcast).toHaveBeenCalledWith(
      "match.phase",
      expect.objectContaining({
        type: "match.phase",
        phase: "LOBBY",
      })
    );

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(room.state.metadata.state).toBe("LOBBY");

    setReady(room, "session-1", true);
    setReady(room, "session-2", true);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(room.state.metadata.state).toBe("ACTIVE");
    expect(broadcast).toHaveBeenCalledWith(
      "match.phase",
      expect.objectContaining({
        type: "match.phase",
        phase: "ACTIVE",
      })
    );

    room.onDispose();
  });

  it("stores player role and name from join options when metadata updates", () => {
    const room = new MatchRoom();
    const setMetadata = jest.fn();
    (room as unknown as { setMetadata: typeof setMetadata }).setMetadata = setMetadata;

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    expect(room.state.commander.playerName).toBe("Commander One");
    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    expect(kaiju?.playerName).toBe("Kaiju One");
    expect(setMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "lobby",
        playerCount: 2,
        commanderName: "Commander One",
      })
    );

    room.onDispose();
  });

  it("releases a claimed role and clears readiness state", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimAndReadyDefaultRoles(room);
    sendClientMessage(room, "session-2", { type: "match.role.release" });

    const kaiju = room.state.leviathans.find((leviathan: LeviathanSchema) => leviathan.playerId === "session-2");
    const releasedParticipant = room.state.participants.find(
      (participant: { sessionId: string; claimedRole: string; ready: boolean }) => participant.sessionId === "session-2"
    );

    expect(kaiju).toBeUndefined();
    expect(releasedParticipant?.claimedRole).toBe("");
    expect(releasedParticipant?.ready).toBe(false);

    room.onDispose();
  });

  it("rejects match start until all claimed players are ready", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    claimDefaultRoles(room);
    setReady(room, "session-1", true);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart(
      { sessionId: "session-1" },
    );

    expect(room.state.metadata.state).toBe("LOBBY");
    expect(
      room.state.signalFeed.some(
        (signal: { message: string }) => signal.message === "MATCH START REJECTED - ALL PLAYERS MUST BE READY"
      )
    ).toBe(true);

    room.onDispose();
  });
});

describe("MatchRoom drain and capacity resilience", () => {
  beforeEach(() => {
    resetDrainState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    resetDrainState();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("rejects new join during drain (non-reconnect)", () => {
    const room = new MatchRoom();
    room.onCreate({ cityName: "Neo Tokyo" });

    startDrain(30_000);

    const leaveCall = jest.fn();
    room.onJoin(
      { id: "client-1", sessionId: "session-1", leave: leaveCall } as unknown as never,
      { playerName: "New Player" }
    );

    const sessions = (room as unknown as { playerSessions: Map<string, unknown> }).playerSessions;
    expect(sessions.has("session-1")).toBe(false);
    expect(leaveCall).toHaveBeenCalledWith(1013, expect.any(String));

    room.onDispose();
  });

  it("allows reconnect during drain", async () => {
    const room = new MatchRoom();
    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    const allowReconnectionMock = jest.fn().mockResolvedValue(undefined);
    (room as unknown as { allowReconnection: typeof allowReconnectionMock }).allowReconnection =
      allowReconnectionMock;

    await room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    startDrain(30_000);

    room.onReconnect(
      { id: "client-2", sessionId: "session-2" } as unknown as never
    );

    expect(kaijuSlot?.playerId).toBe("session-2");
    expect(kaijuSlot?.isAI).toBe(false);

    room.onDispose();
  });

  it("rejects join when room is at capacity", () => {
    const room = new MatchRoom();
    const broadcast = jest.fn();
    (room as unknown as { broadcast: typeof broadcast }).broadcast = broadcast;

    room.onCreate({ cityName: "Neo Tokyo" });

    // Fill commander and all 4 kaiju slots (maxClients = 5)
    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    for (let i = 0; i < 4; i++) {
      room.onJoin(
        { id: `client-k-${i + 2}`, sessionId: `session-k-${i + 2}` } as unknown as never,
        { playerName: `Kaiju ${i + 1}`, playerRole: "KAIJU" }
      );
    }

    const sessions = (room as unknown as { playerSessions: Map<string, unknown> }).playerSessions;
    expect(sessions.size).toBe(5);

    // Attempt to join as kaiju when all slots are full
    const kaijuOverflowLeave = jest.fn();
    room.onJoin(
      { id: "client-overflow", sessionId: "session-overflow", leave: kaijuOverflowLeave } as unknown as never,
      { playerName: "Overflow Kaiju", playerRole: "KAIJU" }
    );
    expect(sessions.size).toBe(5);
    expect(sessions.has("session-overflow")).toBe(false);
    expect(kaijuOverflowLeave).toHaveBeenCalledWith(1008, "No kaiju slot available");

    // Attempt to join as commander when slot is already taken
    const commanderOverflowLeave = jest.fn();
    room.onJoin(
      { id: "client-overflow-2", sessionId: "session-overflow-2", leave: commanderOverflowLeave } as unknown as never,
      { playerName: "Overflow Commander", playerRole: "COMMANDER" }
    );
    expect(sessions.size).toBe(5);
    expect(sessions.has("session-overflow-2")).toBe(false);
    expect(commanderOverflowLeave).toHaveBeenCalledWith(1008, "Commander slot already taken");

    room.onDispose();
  });

  it("expired/missing reconnect token falls back to new join", () => {
    const room = new MatchRoom();
    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );

    // Attempt reconnect with an invalid token; should not crash
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Returning Player", reconnectToken: "invalid-token-xyz" }
    );

    const sessions = (room as unknown as { playerSessions: Map<string, unknown> }).playerSessions;

    // Player is added as an unassigned participant (no crash, no bad state)
    expect(sessions.has("session-2")).toBe(true);

    // No kaiju slot was claimed via the invalid token
    const anySlotClaimed = room.state.leviathans.some(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(anySlotClaimed).toBe(false);

    // Commander slot was not hijacked by invalid token
    expect(room.state.commander.playerId).toBe("session-1");

    room.onDispose();
  });

  it("keeps active room alive during start-match handoff disconnects", () => {
    const room = new MatchRoom();
    const disconnectSpy = jest.fn();
    (room as unknown as { disconnect: typeof disconnectSpy }).disconnect = disconnectSpy;

    const pendingReconnect = new Promise<void>(() => {
      // Intentionally unresolved: simulates grace window still open.
    });
    const allowReconnectionMock = jest.fn().mockReturnValue(pendingReconnect);
    (room as unknown as { allowReconnection: typeof allowReconnectionMock }).allowReconnection =
      allowReconnectionMock;

    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One", playerRole: "COMMANDER" }
    );
    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One", playerRole: "KAIJU" }
    );

    setReady(room, "session-1", true);
    setReady(room, "session-2", true);

    (room as unknown as {
      handleCommanderStart: (client: { sessionId: string }) => void;
    }).handleCommanderStart({ sessionId: "session-1" });

    expect(room.state.metadata.state).toBe("ACTIVE");

    // Simulate abrupt handoff disconnects while role pages reconnect.
    room.onLeave(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      1006
    );
    room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    const sessions = (room as unknown as { playerSessions: Map<string, unknown> }).playerSessions;
    expect(allowReconnectionMock).toHaveBeenCalledTimes(2);
    expect(sessions.size).toBe(2);
    expect(disconnectSpy).not.toHaveBeenCalled();

    room.onDispose();
  });
});
