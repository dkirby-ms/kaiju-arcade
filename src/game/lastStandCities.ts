export const lastStandCities = [
  "Neo Tokyo",
  "New Avalon",
  "Port Helios",
  "Glasspoint",
  "Cinder Bay",
] as const;

const cityLookup: Map<string, string> = new Map(
  lastStandCities.map((city) => [city.toLowerCase(), city])
);

export function getAvailableCities(): readonly string[] {
  return lastStandCities;
}

export function normalizeRequestedCityName(requestedCityName?: string): string | undefined {
  if (!requestedCityName || requestedCityName.trim().length === 0) {
    return undefined;
  }

  const normalized = requestedCityName.trim().toLowerCase();
  return cityLookup.get(normalized);
}

export function selectCityBase(requestedCityName?: string): string {
  const canonicalCityName = normalizeRequestedCityName(requestedCityName);
  if (canonicalCityName) {
    return canonicalCityName;
  }

  const randomIndex = Math.floor(Math.random() * lastStandCities.length);
  return lastStandCities[randomIndex];
}