import {
  CommanderStateSchema,
  MatchSchema,
  LeviathanSchema,
  DispatchRecordSchema,
  BarrierSchema,
} from "./MatchSchema";

describe("CommanderStateSchema", () => {
  it("initializes commander assets with expected starting inventory", () => {
    const commander = new CommanderStateSchema();

    expect(commander.assetsRemaining.get("Scramble Jets")).toBe(5);
    expect(commander.assetsRemaining.get("Deploy Mechs")).toBe(3);
    expect(commander.assetsRemaining.get("Raise Barrier")).toBe(4);
    expect(commander.assetsRemaining.get("Evac Sector")).toBe(2);
  });

  it("serializes and deserializes snapshot state without data loss", () => {
    const state = new MatchSchema();
    state.metadata.matchId = "match-123";
    state.metadata.state = "ACTIVE";
    state.metadata.outcome = "";
    state.metadata.commanderScore = 420;
    state.metadata.comboPeak = 3;
    state.metadata.tickCount = 99;
    state.metadata.roundTimerMs = 600_000;
    state.metadata.now = 123_456;
    state.cityBase.id = "base-1";
    state.cityBase.cityName = "Neo Tokyo";
    state.cityBase.hp = 350;
    state.commander.playerId = "cmd-1";
    state.commander.playerName = "Commander";
    state.commander.selectedLeviathanId = "lev-1";
    state.commander.assetsRemaining.set("Scramble Jets", 2);

    const leviathan = new LeviathanSchema();
    leviathan.id = "lev-1";
    leviathan.name = "Sniper-AAA";
    leviathan.archetype = "Sniper";
    leviathan.hp = 70;
    leviathan.playerId = "kaiju-1";
    leviathan.playerName = "Kaiju";
    state.leviathans.push(leviathan);

    const dispatch = new DispatchRecordSchema();
    dispatch.id = "dispatch-1";
    dispatch.assetName = "Scramble Jets";
    dispatch.targetId = "lev-1";
    dispatch.outcome = "SUCCESS";
    state.dispatchHistory.push(dispatch);

    const barrier = new BarrierSchema();
    barrier.id = "barrier-1";
    barrier.createdAt = 100;
    barrier.expiresAt = 200;
    state.activeBarriers.push(barrier);

    state.addSignal("MATCH START", "nominal", "SYSTEM");

    const serialized = state.serializeSnapshot();
    const hydrated = MatchSchema.deserializeSnapshot(serialized);

    expect(hydrated.metadata.matchId).toBe("match-123");
    expect(hydrated.metadata.commanderScore).toBe(420);
    expect(hydrated.cityBase.cityName).toBe("Neo Tokyo");
    expect(hydrated.commander.playerName).toBe("Commander");
    expect(hydrated.commander.assetsRemaining.get("Scramble Jets")).toBe(2);
    expect(hydrated.leviathans.length).toBe(1);
    expect(hydrated.leviathans[0].id).toBe("lev-1");
    expect(hydrated.dispatchHistory.length).toBe(1);
    expect(hydrated.dispatchHistory[0].outcome).toBe("SUCCESS");
    expect(hydrated.activeBarriers.length).toBe(1);
    expect(hydrated.signalFeed.length).toBe(1);
    expect(hydrated.signalFeed[0].message).toBe("MATCH START");
  });
});
