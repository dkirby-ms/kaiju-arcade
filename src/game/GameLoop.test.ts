import { executeTick, validateTickTiming } from "./GameLoop";
import { MatchSchema, LeviathanSchema } from "../schema/MatchSchema";

function buildState(): MatchSchema {
  const state = new MatchSchema();
  state.metadata.state = "ACTIVE";
  state.metadata.startedAt = 1;
  state.metadata.now = 1;
  state.cityBase.x = 50;
  state.cityBase.y = 50;
  state.cityBase.hp = 500;

  const leviathan = new LeviathanSchema();
  leviathan.id = "lev-1";
  leviathan.name = "Leviathan-1";
  leviathan.archetype = "Dozer";
  leviathan.x = 10;
  leviathan.y = 10;
  leviathan.heading = 45;
  leviathan.speed = 1;
  leviathan.status = "ACTIVE";
  leviathan.lastAttackTime = 0;

  state.leviathans.push(leviathan);
  return state;
}

describe("GameLoop determinism", () => {
  it("produces the same state transition for the same input", () => {
    const stateA = buildState();
    const stateB = buildState();

    const input = {
      deltaMs: 200,
      tickCount: 1,
      now: 200,
    };

    executeTick({ state: stateA, ...input });
    executeTick({ state: stateB, ...input });

    expect(stateA.leviathans[0].x).toBe(stateB.leviathans[0].x);
    expect(stateA.leviathans[0].y).toBe(stateB.leviathans[0].y);
    expect(stateA.cityBase.hp).toBe(stateB.cityBase.hp);
    expect(stateA.metadata.state).toBe(stateB.metadata.state);
  });

  it("validates tick timing with expected tolerance", () => {
    expect(validateTickTiming(200).isValid).toBe(true);
    expect(validateTickTiming(180).isValid).toBe(true);
    expect(validateTickTiming(230).isValid).toBe(false);
  });

  it("resolves pending dispatches when delay elapses", () => {
    const state = buildState();
    const target = state.leviathans[0];
    target.hp = 100;

    const dispatch = state.createDispatchRecord("Deploy Mechs", target.id, 1_000);
    dispatch.delayMs = 0;
    state.dispatchHistory.push(dispatch);

    executeTick({ state, deltaMs: 200, tickCount: 1, now: 1_200 });

    expect(state.dispatchHistory[0].resolvedAt).toBe(1_200);
    expect(["SUCCESS", "PARTIAL", "FAILED", "UNVERIFIED"]).toContain(state.dispatchHistory[0].outcome);
    expect(state.signalFeed.length).toBeGreaterThan(0);
  });

  it("creates barrier when Raise Barrier dispatch resolves", () => {
    const state = buildState();
    const dispatch = state.createDispatchRecord("Raise Barrier", "city-base", 2_000);
    dispatch.delayMs = 0;
    state.dispatchHistory.push(dispatch);

    executeTick({ state, deltaMs: 200, tickCount: 2, now: 2_200 });

    expect(state.dispatchHistory[0].outcome).toBe("SUCCESS");
    expect(state.activeBarriers.length).toBe(1);
    expect(state.activeBarriers[0].expiresAt).toBe(10_200);
  });

  it("keeps contained leviathans contained across ticks", () => {
    const state = buildState();
    state.leviathans[0].status = "CONTAINED";
    state.leviathans[0].statusEndTime = 1;

    executeTick({ state, deltaMs: 200, tickCount: 3, now: 5_000 });

    expect(state.leviathans[0].status).toBe("CONTAINED");
  });
});
