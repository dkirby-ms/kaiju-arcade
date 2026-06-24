import { lastStandCities, selectCityBase } from "./lastStandCities";

describe("lastStandCities", () => {
  it("returns the requested city when provided", () => {
    expect(selectCityBase("Neo Tokyo")).toBe("Neo Tokyo");
  });

  it("returns one of the known cities when no city is provided", () => {
    const selectedCity = selectCityBase();

    expect(lastStandCities).toContain(selectedCity as (typeof lastStandCities)[number]);
  });
});
