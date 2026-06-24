export const lastStandCities = [
  "Neo Tokyo",
  "New Avalon",
  "Port Helios",
  "Glasspoint",
  "Cinder Bay",
] as const;

export function selectCityBase(requestedCityName?: string): string {
  if (requestedCityName && requestedCityName.trim().length > 0) {
    return requestedCityName;
  }

  const randomIndex = Math.floor(Math.random() * lastStandCities.length);
  return lastStandCities[randomIndex];
}