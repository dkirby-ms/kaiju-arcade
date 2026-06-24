/**
 * Colyseus Schema definitions for Kaiju Arcade
 *
 * Defines the authoritative game state structure using Colyseus @Schema decorators.
 * All fields are synchronized automatically from server to clients.
 */

import { Schema, type, ArraySchema } from "@colyseus/schema";

/**
 * Leviathan / Kaiju entity
 * Represents a single kaiju controlled by a player or AI
 */
export class LeviathanSchema extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  name: string = "";

  @type("string")
  archetype: string = ""; // "Sniper", "Dozer", etc.

  @type("number")
  hp: number = 100;

  @type("number")
  hpMax: number = 100;

  @type("number")
  x: number = 0; // Position X on map

  @type("number")
  y: number = 0; // Position Y on map

  @type("number")
  heading: number = 0; // Direction (0-360 degrees)

  @type("number")
  speed: number = 1; // Movement speed multiplier

  @type("string")
  status: string = "ACTIVE"; // ACTIVE, SUBMERGED, STUNNED, CONTAINED, etc.

  @type("number")
  statusEndTime: number = 0; // Timestamp when status effect expires

  @type("number")
  lastAttackTime: number = 0; // Timestamp of last attack (for cooldown)

  @type("number")
  credits: number = 3; // INSERT COIN system - credits remaining

  @type("boolean")
  isAI: boolean = false; // Is this an AI-controlled kaiju?

  @type("string")
  playerId: string = ""; // Session ID of controlling player (empty if AI)

  @type("string")
  playerName: string = ""; // Display name of player

  @type("number")
  damageDealt: number = 0; // Total damage dealt this match

  @type("number")
  damageReceived: number = 0; // Total damage received this match
}

/**
 * City Base / Defended Target
 * The objective that Kaiju must destroy and Commander must defend
 */
export class CityBaseSchema extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  cityName: string = "";

  @type("number")
  hp: number = 500;

  @type("number")
  hpMax: number = 500;

  @type("number")
  x: number = 0; // Position on map

  @type("number")
  y: number = 0;

  @type("number")
  damageLastTick: number = 0; // Damage taken in current tick (for feedback)

  @type("number")
  totalDamage: number = 0; // Cumulative damage
}

/**
 * Active Barrier / Mitigation Effect
 * Represents a deployed Raise Barrier asset
 */
export class BarrierSchema extends Schema {
  @type("string")
  id: string = "";

  @type("number")
  createdAt: number = 0;

  @type("number")
  expiresAt: number = 0; // When this barrier ends

  @type("number")
  damageAbsorbed: number = 0; // How much damage this barrier has taken
}

/**
 * Dispatch Record / Command History
 * Tracks a deployed asset for logging and validation
 */
export class DispatchRecordSchema extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  assetName: string = ""; // "Scramble Jets", "Deploy Mechs", "Raise Barrier", "Evac Sector"

  @type("string")
  targetId: string = ""; // Leviathan ID

  @type("number")
  dispatchedAt: number = 0; // Server timestamp

  @type("number")
  resolvedAt: number = 0; // When mitigation resolved (0 = pending)

  @type("string")
  outcome: string = "PENDING"; // PENDING, SUCCESS, PARTIAL, FAILED, UNVERIFIED

  @type("number")
  delayMs: number = 0; // 1-5s delay as per design spec

  @type("boolean")
  applied: boolean = false; // Whether effects have been applied
}

/**
 * Signal Feed Entry
 * Event log entry displayed to Commander
 */
export class SignalFeedEntrySchema extends Schema {
  @type("number")
  timestamp: number = 0;

  @type("string")
  message: string = "";

  @type("string")
  severity: string = "nominal"; // "nominal", "alert", "critical"

  @type("string")
  source: string = ""; // "SYSTEM", "KAIJU_NAME", etc.
}

/**
 * Match Metadata
 * Current state and configuration of the match
 */
export class MatchMetadataSchema extends Schema {
  @type("string")
  matchId: string = "";

  @type("number")
  startedAt: number = 0;

  @type("number")
  now: number = 0; // Current server timestamp (synced each tick)

  @type("string")
  state: string = "WAITING"; // WAITING, ACTIVE, ENDED

  @type("string")
  outcome: string = ""; // KAIJU_VICTORY, COMMANDER_VICTORY, TIME_LIMIT, ABORTED

  @type("number")
  commanderScore: number = 0;

  @type("number")
  comboPeak: number = 0; // Highest combo multiplier achieved

  @type("number")
  tickCount: number = 0; // Number of server ticks since start

  @type("number")
  roundTimerMs: number = 0; // Time limit in milliseconds (0 = no limit)
}

/**
 * Commander State
 * Tracks selection and dispatch state for the Commander player
 */
export class CommanderStateSchema extends Schema {
  @type("string")
  playerId: string = "";

  @type("string")
  playerName: string = "";

  @type("string")
  selectedLeviathanId: string = ""; // Currently selected kaiju for dispatch
}

/**
 * Main Match Schema
 * Root Colyseus schema - this is what gets synchronized
 */
export class MatchSchema extends Schema {
  @type(MatchMetadataSchema)
  metadata: MatchMetadataSchema = new MatchMetadataSchema();

  @type(CityBaseSchema)
  cityBase: CityBaseSchema = new CityBaseSchema();

  @type(CommanderStateSchema)
  commander: CommanderStateSchema = new CommanderStateSchema();

  @type([LeviathanSchema])
  leviathans: ArraySchema<LeviathanSchema> = new ArraySchema();

  @type([DispatchRecordSchema])
  dispatchHistory: ArraySchema<DispatchRecordSchema> = new ArraySchema();

  @type([SignalFeedEntrySchema])
  signalFeed: ArraySchema<SignalFeedEntrySchema> = new ArraySchema();

  @type([BarrierSchema])
  activeBarriers: ArraySchema<BarrierSchema> = new ArraySchema();

  /**
   * Helper: Get leviathan by ID
   */
  getLeviathan(id: string): LeviathanSchema | undefined {
    return this.leviathans.find((l: LeviathanSchema) => l.id === id);
  }

  /**
   * Helper: Get all active (non-contained) leviathans
   */
  getActiveLeviathans(): LeviathanSchema[] {
    return this.leviathans.filter((l) => l.status !== "CONTAINED");
  }

  /**
   * Helper: Check if all leviathans are contained
   */
  areAllLeviathansCaught(): boolean {
    return this.leviathans.every((l) => l.status === "CONTAINED");
  }

  /**
   * Helper: Add signal feed entry
   */
  addSignal(message: string, severity: string = "nominal", source: string = "SYSTEM"): void {
    const entry = new SignalFeedEntrySchema();
    entry.timestamp = this.metadata.now;
    entry.message = message;
    entry.severity = severity;
    entry.source = source;
    this.signalFeed.push(entry);

    // Keep signal feed bounded (max 100 entries)
    if (this.signalFeed.length > 100) {
      this.signalFeed.shift();
    }
  }
}

/**
 * Game Constants
 * Centralized configuration for all game mechanics
 */
export const GAME_CONSTANTS = {
  // Tick engine
  TICK_RATE_HZ: 5, // 5 Hz = 200ms per tick
  TICK_MS: 200,

  // Combo system
  COMBO_WINDOW_MS: 150, // 150ms window for combo detection
  COMBO_MULTIPLIER_BASE: 1.0,
  COMBO_MULTIPLIER_PER_HIT: 0.2, // Each additional hit = +20% damage

  // Credits / Continue system
  CREDIT_COUNT: 3, // Starting credits per kaiju
  CONTINUE_WINDOW_MS: 10000, // 10s to continue after CONTAINED
  RESPAWN_HP_FRACTION: 0.6, // Respawn at 60% HP

  // Assets
  ASSET_DELAY_RANGE_MS: [1000, 5000], // 1-5s delay
  ASSET_BASE_SUCCESS: 0.6, // 60% base success chance
  ASSET_KNOCKBACK: {
    "Scramble Jets": 0.4,
    "Deploy Mechs": 0.3,
    "Raise Barrier": 0.0,
    "Evac Sector": 0.0,
  },

  // Damage & severity
  DAMAGE_BASE: 10,
  SEVERITY_ADJUSTMENT: {
    WEAK: 1.2,
    NORMAL: 1.0,
    STRONG: 0.8,
  },

  // Match
  DEFAULT_ROUND_TIMER_MS: 600000, // 10 minutes default (0 = no limit)
  CITY_BASE_HP: 500,

  // Status effects
  SUBMERGED_DURATION_MS: 5000,
  SUBMERGED_DAMAGE_ADJUSTMENT: 0.6,
};
