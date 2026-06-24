import {
  validateCommanderSelect,
  getCommanderSelectLeviathanId,
  CommanderSelectMessage,
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
});
