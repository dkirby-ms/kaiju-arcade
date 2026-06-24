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
});
