import {
  validateCommanderSelect,
  getCommanderSelectLeviathanId,
  CommanderSelectMessage,
  validateKaijuAbility,
  validateKaijuContinue,
} from "./protocol";

describe("Commander select protocol", () => {
  it("accepts the canonical leviathanId field", () => {
    const msg = {
      type: "commander.select",
      leviathanId: "lev-123",
    };

    expect(validateCommanderSelect(msg)).toBe(true);

    const typed = msg as CommanderSelectMessage;
    expect(getCommanderSelectLeviathanId(typed)).toBe("lev-123");
  });

  it("accepts legacy leviathonId for backward compatibility", () => {
    const msg = {
      type: "commander.select",
      leviathonId: "legacy-456",
    };

    expect(validateCommanderSelect(msg)).toBe(true);

    const typed = msg as CommanderSelectMessage;
    expect(getCommanderSelectLeviathanId(typed)).toBe("legacy-456");
  });

  it("validates kaiju.ability messages", () => {
    expect(validateKaijuAbility({ type: "kaiju.ability", abilityId: "submerge" })).toBe(true);
    expect(validateKaijuAbility({ type: "kaiju.ability", abilityId: "" })).toBe(false);
    expect(validateKaijuAbility({ type: "kaiju.ability" })).toBe(false);
  });

  it("validates kaiju.continue messages", () => {
    expect(validateKaijuContinue({ type: "kaiju.continue" })).toBe(true);
    expect(validateKaijuContinue({ type: "kaiju.attack" })).toBe(false);
  });
});
