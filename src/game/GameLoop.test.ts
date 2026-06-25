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
  leviathan.moveX = Math.SQRT1_2;
  leviathan.moveY = Math.SQRT1_2;
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
    expect(validateTickTiming(50).isValid).toBe(true);
    expect(validateTickTiming(35).isValid).toBe(true);
    expect(validateTickTiming(80).isValid).toBe(false);
  });

  it("limits heading turn rate to keep movement smooth", () => {
    const state = buildState();
    const leviathan = state.leviathans[0];

    leviathan.heading = 0;
    leviathan.moveX = 0;
    leviathan.moveY = 1;

    executeTick({ state, deltaMs: 50, tickCount: 1, now: 50 });

    expect(leviathan.heading).toBe(13);
    expect(leviathan.y).toBeGreaterThan(10);
  });

  it("applies archetype-specific turn rates", () => {
    const state = buildState();
    const leviathan = state.leviathans[0];

    leviathan.archetype = "Sniper";
    leviathan.heading = 0;
    leviathan.moveX = 0;
    leviathan.moveY = 1;

    executeTick({ state, deltaMs: 50, tickCount: 2, now: 100 });
    const sniperHeading = leviathan.heading;

    leviathan.archetype = "Tank";
    leviathan.heading = 0;
    executeTick({ state, deltaMs: 50, tickCount: 3, now: 150 });
    const tankHeading = leviathan.heading;

    expect(sniperHeading).toBe(23);
    expect(tankHeading).toBe(11.5);
    expect(sniperHeading).toBeGreaterThan(tankHeading);
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

  it("resolves sniper submerge ability and emits an ability result", () => {
    const state = buildState();
    state.leviathans[0].archetype = "Sniper";
    state.leviathans[0].pendingAbilityId = "submerge";

    executeTick({ state, deltaMs: 200, tickCount: 4, now: 6_000 });

    expect(state.leviathans[0].status).toBe("SUBMERGED");
    expect(state.leviathans[0].abilityCooldownEndsAt).toBeGreaterThan(6_000);
    expect(state.kaijuAbilityResults.length).toBe(1);
    expect(state.kaijuAbilityResults[0].outcome).toBe("APPLIED");
  });

  it("applies reduced mitigation damage to fortified leviathans", () => {
    const state = buildState();
    const target = state.leviathans[0];
    target.status = "FORTIFIED";
    target.hp = 100;

    const dispatch = state.createDispatchRecord("Deploy Mechs", target.id, 8_000);
    dispatch.delayMs = 0;
    state.dispatchHistory.push(dispatch);

    executeTick({ state, deltaMs: 200, tickCount: 5, now: 8_200 });

    if (["SUCCESS", "PARTIAL"].includes(state.dispatchHistory[0].outcome)) {
      expect(target.hp).toBeGreaterThanOrEqual(76);
    }
  });
});
