jest.mock("colyseus", () => {
  class MockRoom {
    public state: unknown;
    public maxClients = 0;
    public autoDispose = true;

    onMessage(_type: string, _handler: unknown): void {
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

describe("MatchRoom role assignment", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("assigns first join as COMMANDER and second as KAIJU", () => {
    const room = new MatchRoom();

    room.onCreate({ cityName: "Neo Tokyo" });

    room.onJoin(
      { id: "client-1", sessionId: "session-1" } as unknown as never,
      { playerName: "Commander One" }
    );

    expect(room.state.commander.playerId).toBe("session-1");
    expect(room.state.commander.playerName).toBe("Commander One");
    expect(room.state.leviathans.length).toBe(4);
    expect(room.state.leviathans.every((leviathan: LeviathanSchema) => leviathan.isAI)).toBe(true);

    room.onJoin(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    expect(room.state.leviathans.length).toBe(4);
    expect(room.state.leviathans.some((leviathan: LeviathanSchema) => leviathan.playerId === "session-2")).toBe(true);
    expect(room.state.leviathans.filter((leviathan: LeviathanSchema) => leviathan.isAI).length).toBe(3);
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
      { playerName: "Commander One" }
    );

    for (let i = 0; i < 4; i++) {
      room.onJoin(
        { id: `client-k-${i + 2}`, sessionId: `session-k-${i + 2}` } as unknown as never,
        { playerName: `Kaiju ${i + 1}` }
      );
    }

    const overflowLeave = jest.fn();
    room.onJoin(
      { id: "client-overflow", sessionId: "session-overflow", leave: overflowLeave } as unknown as never,
      { playerName: "Kaiju Overflow" }
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

  it("allows kaiju reconnect reclaim during grace window", () => {
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

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    expect(kaijuSlot?.isAI).toBe(false);
    expect(kaijuSlot?.playerId).toBe("");

    const reconnectToken = (
      room as unknown as { reconnectTokenByLeviathanId: Map<string, string> }
    ).reconnectTokenByLeviathanId.get(kaijuSlot?.id ?? "");
    expect(reconnectToken).toBeDefined();

    room.onJoin(
      { id: "client-3", sessionId: "session-3" } as unknown as never,
      { playerName: "Kaiju One", reconnectToken }
    );

    expect(kaijuSlot?.isAI).toBe(false);
    expect(kaijuSlot?.playerId).toBe("session-3");

    room.onDispose();
  });

  it("does not reclaim grace slot without reconnect token", () => {
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

    const kaijuSlot = room.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.playerId === "session-2"
    );
    expect(kaijuSlot).toBeDefined();

    room.onLeave(
      { id: "client-2", sessionId: "session-2" } as unknown as never,
      1006
    );

    room.onJoin(
      { id: "client-3", sessionId: "session-3" } as unknown as never,
      { playerName: "Kaiju One" }
    );

    expect(kaijuSlot?.playerId).toBe("");
    expect(kaijuSlot?.isAI).toBe(false);

    room.onDispose();
  });

  it("promotes disconnected kaiju to AI after grace window expires", () => {
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

  it("broadcasts signal feed events for commander and kaiju joins", () => {
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
});
