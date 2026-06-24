import {
  lastStandCities,
  selectCityBase,
  normalizeRequestedCityName,
  getAvailableCities,
} from "./lastStandCities";

describe("lastStandCities", () => {
  it("returns the requested city when provided", () => {
    expect(selectCityBase("Neo Tokyo")).toBe("Neo Tokyo");
  });

  it("matches city names case-insensitively and trims whitespace", () => {
    expect(selectCityBase("  neo tokyo  ")).toBe("Neo Tokyo");
  });

  it("falls back to a known city when requested city is unknown", () => {
    const selectedCity = selectCityBase("Unknownopolis");

    expect(lastStandCities).toContain(selectedCity as (typeof lastStandCities)[number]);
  });

  it("returns one of the known cities when no city is provided", () => {
    const selectedCity = selectCityBase();

    expect(lastStandCities).toContain(selectedCity as (typeof lastStandCities)[number]);
  });

  it("normalizes known city names and rejects unknown names", () => {
    expect(normalizeRequestedCityName("new avalon")).toBe("New Avalon");
    expect(normalizeRequestedCityName("  Cinder Bay ")).toBe("Cinder Bay");
    expect(normalizeRequestedCityName("Unknownopolis")).toBeUndefined();
  });

  it("returns available city list for clients", () => {
    expect(getAvailableCities()).toEqual(lastStandCities);
  });
});
