import {
  isCommanderStatusEventModel,
  isKaijuAbilityResultEventModel,
  isSignalFeedEventModel,
} from "./types";

describe("Commander frontend event models", () => {
  it("accepts a valid commander.status payload", () => {
    const payload = {
      type: "commander.status",
      timestamp: Date.now(),
      selectedLeviathanId: "lev-1",
      assetsRemaining: { "Scramble Jets": 4 },
      assetCooldownsMsRemaining: { "Scramble Jets": 1200 },
      assetCooldownsReady: { "Scramble Jets": false },
      assetCooldownsProgress: { "Scramble Jets": 0.8 },
      activeBarriers: 1,
      commanderScore: 120,
      cityBaseHp: 450,
    };

    expect(isCommanderStatusEventModel(payload)).toBe(true);
  });

  it("rejects invalid commander.status payload", () => {
    const payload = {
      type: "commander.status",
      timestamp: Date.now(),
      selectedLeviathanId: "lev-1",
      assetsRemaining: { "Scramble Jets": "4" },
      assetCooldownsMsRemaining: { "Scramble Jets": 1200 },
      assetCooldownsReady: { "Scramble Jets": false },
      assetCooldownsProgress: { "Scramble Jets": 0.8 },
      activeBarriers: 1,
      commanderScore: 120,
      cityBaseHp: 450,
    };

    expect(isCommanderStatusEventModel(payload)).toBe(false);
  });

  it("accepts a valid signal.feed payload", () => {
    const payload = {
      type: "signal.feed",
      timestamp: Date.now(),
      message: "DISPATCH: Scramble Jets -> lev-1",
      severity: "nominal",
      dispatchId: "dispatch-1",
    };

    expect(isSignalFeedEventModel(payload)).toBe(true);
  });

  it("rejects invalid signal.feed payload", () => {
    const payload = {
      type: "signal.feed",
      timestamp: Date.now(),
      message: "DISPATCH FAILED",
      severity: "unknown",
    };

    expect(isSignalFeedEventModel(payload)).toBe(false);
  });

  it("accepts a valid kaiju.ability.result payload", () => {
    const payload = {
      type: "kaiju.ability.result",
      resultId: "ability-1",
      leviathanId: "lev-1",
      abilityId: "submerge",
      outcome: "APPLIED",
      message: "ABILITY APPLIED",
      resolvedAt: Date.now(),
    };

    expect(isKaijuAbilityResultEventModel(payload)).toBe(true);
  });

  it("rejects invalid kaiju.ability.result payload", () => {
    const payload = {
      type: "kaiju.ability.result",
      resultId: "ability-1",
      leviathanId: "lev-1",
      abilityId: "submerge",
      outcome: "UNKNOWN",
      message: "ABILITY APPLIED",
      resolvedAt: Date.now(),
    };

    expect(isKaijuAbilityResultEventModel(payload)).toBe(false);
  });
});
