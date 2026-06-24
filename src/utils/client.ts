/**
 * Client-side Utilities
 *
 * Helpers for client applications (Commander dashboard and Kaiju mobile clients)
 * Includes lerping, color utilities, UI helpers, etc.
 */

/**
 * Linear interpolation between two values
 * Used for smooth position interpolation between server ticks
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Interpolate between two 2D points
 */
export interface Point {
  x: number;
  y: number;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

/**
 * Ease-out quadratic (deceleration)
 * Good for motion feeling natural
 */
export function easeOutQuad(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return 1 - (1 - t) * (1 - t);
}

/**
 * Ease-in-out quadratic
 */
export function easeInOutQuad(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Convert heading (degrees) to radians
 */
export function headingToRadians(heading: number): number {
  return (heading * Math.PI) / 180;
}

/**
 * Convert radians to heading (degrees)
 */
export function radiansToHeading(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate angle between two points
 */
export function calculateAngle(from: Point, to: Point): number {
  const dy = to.y - from.y;
  const dx = to.x - from.x;
  return Math.atan2(dy, dx);
}

/**
 * Calculate heading (0-360) between two points
 */
export function calculateHeading(from: Point, to: Point): number {
  const angle = calculateAngle(from, to);
  let heading = radiansToHeading(angle);
  if (heading < 0) {
    heading += 360;
  }
  return heading;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeHeading(heading: number): number {
  let h = heading % 360;
  if (h < 0) {
    h += 360;
  }
  return h;
}

/**
 * Calculate shortest rotation direction and angle
 * Returns: { direction: 1 | -1, angle: number }
 */
export function calculateShortestRotation(
  fromHeading: number,
  toHeading: number
): { direction: 1 | -1; angle: number } {
  fromHeading = normalizeHeading(fromHeading);
  toHeading = normalizeHeading(toHeading);

  let diff = toHeading - fromHeading;

  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  return {
    direction: diff > 0 ? 1 : -1,
    angle: Math.abs(diff),
  };
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a unique ID for client-side entities
 */
export function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a timestamp as HH:MM:SS
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Color utilities for arcade aesthetic
 */
export interface ArcadeColor {
  nominal: string;
  alert: string;
  critical: string;
}

export const ARCADE_COLORS: ArcadeColor = {
  nominal: "#FFAA00", // Amber
  alert: "#00FF00", // Green
  critical: "#FF0000", // Red
};

export function getSeverityColor(severity: "nominal" | "alert" | "critical"): string {
  return ARCADE_COLORS[severity];
}

/**
 * Damage pop animation context
 * For rendering damage numbers that float up and fade
 */
export interface DamagePopContext {
  damage: number;
  x: number;
  y: number;
  createdAt: number;
  isCombo: boolean;
  multiplier: number;
}

export function createDamagePop(
  damage: number,
  x: number,
  y: number,
  isCombo: boolean = false,
  multiplier: number = 1.0
): DamagePopContext {
  return {
    damage: Math.round(damage * multiplier),
    x,
    y,
    createdAt: Date.now(),
    isCombo,
    multiplier,
  };
}

/**
 * Calculate pop animation progress (0-1, then fades at end)
 */
export function getDamagePopProgress(
  pop: DamagePopContext,
  durationMs: number = 1500
): number {
  const age = Date.now() - pop.createdAt;
  return Math.max(0, 1 - age / durationMs);
}

/**
 * Storage helpers for client preferences
 */
export function savePlayerName(name: string): void {
  try {
    const storage = (globalThis as any).localStorage;
    if (storage) {
      storage.setItem("kaiju_arcade_player_name", name);
    }
  } catch {
    // Storage may not be available
  }
}

export function loadPlayerName(): string | null {
  try {
    const storage = (globalThis as any).localStorage;
    if (storage) {
      return storage.getItem("kaiju_arcade_player_name");
    }
  } catch {
    // Storage may not be available
  }
  return null;
}
