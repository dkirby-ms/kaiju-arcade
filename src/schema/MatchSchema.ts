/**
 * Colyseus Schema definitions for Kaiju Arcade
 *
 * Defines the authoritative game state structure using Colyseus @Schema decorators.
 * All fields are synchronized automatically from server to clients.
 */

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

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
  moveX: number = 0; // Normalized movement vector X (-1 to 1)

  @type("number")
  moveY: number = 0; // Normalized movement vector Y (-1 to 1)

  @type("number")
  speed: number = 1; // Movement speed multiplier

  @type("string")
  status: string = "ACTIVE"; // ACTIVE, SUBMERGED, STUNNED, CONTAINED, etc.

  @type("number")
  statusEndTime: number = 0; // Timestamp when status effect expires

  @type("number")
  containedAt: number = 0; // Timestamp when CONTAINED was applied

  @type("number")
  lastAttackTime: number = 0; // Timestamp of last attack (for cooldown)

  @type("number")
  abilityCooldownEndsAt: number = 0; // Timestamp when ability can be used again

  @type("string")
  pendingAbilityId: string = ""; // Ability requested by client, resolved on next tick

  @type("number")
  pendingAbilityRequestedAt: number = 0;

  @type("number")
  credits: number = 3; // INSERT COIN system - credits remaining

  @type("boolean")
  isAI: boolean = false; // Is this an AI-controlled kaiju?

  @type("boolean")
  isSpectator: boolean = false; // True when continue window expires with no credits

  @type("string")
  playerId: string = ""; // Session ID of controlling player (empty if AI)

  @type("string")
  playerName: string = ""; // Display name of player

  @type("boolean")
  ready: boolean = false;

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
 * Kaiju Ability Result Record
 * Tick-resolved ability outcomes for client feedback
 */
export class KaijuAbilityResultSchema extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  leviathanId: string = "";

  @type("string")
  abilityId: string = "";

  @type("string")
  outcome: string = ""; // APPLIED, REJECTED, UNVERIFIED

  @type("string")
  message: string = "";

  @type("number")
  resolvedAt: number = 0;

  @type("boolean")
  applied: boolean = false;
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

  @type("string")
  dispatchId: string = "";
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
  state: string = "WAITING"; // WAITING, LOBBY, ACTIVE, ENDED

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

  @type("boolean")
  ready: boolean = false;

  @type("string")
  selectedLeviathanId: string = ""; // Currently selected kaiju for dispatch

  @type({ map: "number" })
  assetsRemaining = new MapSchema<number>();

  @type({ map: "number" })
  assetCooldowns = new MapSchema<number>();

  constructor() {
    super();

    this.assetsRemaining.set("Scramble Jets", 5);
    this.assetsRemaining.set("Deploy Mechs", 3);
    this.assetsRemaining.set("Raise Barrier", 4);
    this.assetsRemaining.set("Evac Sector", 2);

    this.assetCooldowns.set("Scramble Jets", 0);
    this.assetCooldowns.set("Deploy Mechs", 0);
    this.assetCooldowns.set("Raise Barrier", 0);
    this.assetCooldowns.set("Evac Sector", 0);
  }
}

export class MatchParticipantSchema extends Schema {
  @type("string")
  sessionId: string = "";

  @type("string")
  playerName: string = "";

  @type("string")
  claimedRole: string = "";

  @type("boolean")
  ready: boolean = false;

  @type("string")
  leviathanId: string = "";
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

  @type([MatchParticipantSchema])
  participants: ArraySchema<MatchParticipantSchema> = new ArraySchema();

  @type([LeviathanSchema])
  leviathans: ArraySchema<LeviathanSchema> = new ArraySchema();

  @type([DispatchRecordSchema])
  dispatchHistory: ArraySchema<DispatchRecordSchema> = new ArraySchema();

  @type([KaijuAbilityResultSchema])
  kaijuAbilityResults: ArraySchema<KaijuAbilityResultSchema> = new ArraySchema();

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

  getParticipant(sessionId: string): MatchParticipantSchema | undefined {
    return this.participants.find((participant: MatchParticipantSchema) => participant.sessionId === sessionId);
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
  addSignal(
    message: string,
    severity: string = "nominal",
    source: string = "SYSTEM",
    dispatchId: string = ""
  ): void {
    const entry = new SignalFeedEntrySchema();
    entry.timestamp = this.metadata.now > 0 ? this.metadata.now : Date.now();
    entry.message = message;
    entry.severity = severity;
    entry.source = source;
    entry.dispatchId = dispatchId;
    this.signalFeed.push(entry);

    // Keep signal feed bounded (max 100 entries)
    if (this.signalFeed.length > 100) {
      this.signalFeed.shift();
    }
  }

  /**
   * Build a dispatch record with a randomized server-side resolution delay.
   */
  createDispatchRecord(assetName: string, targetId: string, dispatchedAt: number): DispatchRecordSchema {
    const delayMin = GAME_CONSTANTS.ASSET_DELAY_RANGE_MS[0];
    const delayMax = GAME_CONSTANTS.ASSET_DELAY_RANGE_MS[1];
    const delayMs = delayMin + Math.floor(Math.random() * (delayMax - delayMin + 1));

    const record = new DispatchRecordSchema();
    record.id = `${assetName.toLowerCase().replace(/\s+/g, "-")}-${dispatchedAt}-${targetId}`;
    record.assetName = assetName;
    record.targetId = targetId;
    record.dispatchedAt = dispatchedAt;
    record.resolvedAt = 0;
    record.outcome = "PENDING";
    record.delayMs = delayMs;
    record.applied = false;

    return record;
  }

  /**
   * Create a barrier instance for Raise Barrier mitigation effects.
   */
  createBarrier(createdAt: number, expiresAt: number): BarrierSchema {
    const barrier = new BarrierSchema();
    barrier.id = `barrier-${createdAt}`;
    barrier.createdAt = createdAt;
    barrier.expiresAt = expiresAt;
    barrier.damageAbsorbed = 0;
    return barrier;
  }

  /**
   * Create and append a Kaiju ability result record for client-facing feedback.
   */
  addKaijuAbilityResult(
    leviathanId: string,
    abilityId: string,
    outcome: string,
    message: string,
    resolvedAt: number
  ): KaijuAbilityResultSchema {
    const result = new KaijuAbilityResultSchema();
    result.id = `ability-${leviathanId}-${resolvedAt}-${abilityId}`;
    result.leviathanId = leviathanId;
    result.abilityId = abilityId;
    result.outcome = outcome;
    result.message = message;
    result.resolvedAt = resolvedAt;
    result.applied = false;
    this.kaijuAbilityResults.push(result);

    if (this.kaijuAbilityResults.length > 100) {
      this.kaijuAbilityResults.shift();
    }

    return result;
  }

  /**
   * Serialize the current match state into a JSON-safe snapshot.
   */
  toSnapshot(): MatchSnapshot {
    return {
      metadata: {
        matchId: this.metadata.matchId,
        startedAt: this.metadata.startedAt,
        now: this.metadata.now,
        state: this.metadata.state,
        outcome: this.metadata.outcome,
        commanderScore: this.metadata.commanderScore,
        comboPeak: this.metadata.comboPeak,
        tickCount: this.metadata.tickCount,
        roundTimerMs: this.metadata.roundTimerMs,
      },
      cityBase: {
        id: this.cityBase.id,
        cityName: this.cityBase.cityName,
        hp: this.cityBase.hp,
        hpMax: this.cityBase.hpMax,
        x: this.cityBase.x,
        y: this.cityBase.y,
        damageLastTick: this.cityBase.damageLastTick,
        totalDamage: this.cityBase.totalDamage,
      },
      commander: {
        playerId: this.commander.playerId,
        playerName: this.commander.playerName,
        ready: this.commander.ready,
        selectedLeviathanId: this.commander.selectedLeviathanId,
        assetsRemaining: Object.fromEntries(this.commander.assetsRemaining),
        assetCooldowns: Object.fromEntries(this.commander.assetCooldowns),
      },
      participants: this.participants.map((participant: MatchParticipantSchema) => ({
        sessionId: participant.sessionId,
        playerName: participant.playerName,
        claimedRole: participant.claimedRole,
        ready: participant.ready,
        leviathanId: participant.leviathanId,
      })),
      leviathans: this.leviathans.map((leviathan: LeviathanSchema) => ({
        id: leviathan.id,
        name: leviathan.name,
        archetype: leviathan.archetype,
        hp: leviathan.hp,
        hpMax: leviathan.hpMax,
        x: leviathan.x,
        y: leviathan.y,
        heading: leviathan.heading,
        moveX: leviathan.moveX,
        moveY: leviathan.moveY,
        speed: leviathan.speed,
        status: leviathan.status,
        statusEndTime: leviathan.statusEndTime,
        containedAt: leviathan.containedAt,
        lastAttackTime: leviathan.lastAttackTime,
        abilityCooldownEndsAt: leviathan.abilityCooldownEndsAt,
        pendingAbilityId: leviathan.pendingAbilityId,
        pendingAbilityRequestedAt: leviathan.pendingAbilityRequestedAt,
        credits: leviathan.credits,
        isAI: leviathan.isAI,
        isSpectator: leviathan.isSpectator,
        playerId: leviathan.playerId,
        playerName: leviathan.playerName,
        ready: leviathan.ready,
        damageDealt: leviathan.damageDealt,
        damageReceived: leviathan.damageReceived,
      })),
      dispatchHistory: this.dispatchHistory.map((dispatch: DispatchRecordSchema) => ({
        id: dispatch.id,
        assetName: dispatch.assetName,
        targetId: dispatch.targetId,
        dispatchedAt: dispatch.dispatchedAt,
        resolvedAt: dispatch.resolvedAt,
        outcome: dispatch.outcome,
        delayMs: dispatch.delayMs,
        applied: dispatch.applied,
      })),
      kaijuAbilityResults: this.kaijuAbilityResults.map((result: KaijuAbilityResultSchema) => ({
        id: result.id,
        leviathanId: result.leviathanId,
        abilityId: result.abilityId,
        outcome: result.outcome,
        message: result.message,
        resolvedAt: result.resolvedAt,
        applied: result.applied,
      })),
      signalFeed: this.signalFeed.map((signal: SignalFeedEntrySchema) => ({
        timestamp: signal.timestamp,
        message: signal.message,
        severity: signal.severity,
        source: signal.source,
        dispatchId: signal.dispatchId,
      })),
      activeBarriers: this.activeBarriers.map((barrier: BarrierSchema) => ({
        id: barrier.id,
        createdAt: barrier.createdAt,
        expiresAt: barrier.expiresAt,
        damageAbsorbed: barrier.damageAbsorbed,
      })),
    };
  }

  /**
   * Serialize snapshot as a string for persistence.
   */
  serializeSnapshot(): string {
    return JSON.stringify(this.toSnapshot());
  }

  /**
   * Build schema state from a previously serialized snapshot object.
   */
  static fromSnapshot(snapshot: MatchSnapshot): MatchSchema {
    const state = new MatchSchema();

    state.metadata.matchId = snapshot.metadata.matchId;
    state.metadata.startedAt = snapshot.metadata.startedAt;
    state.metadata.now = snapshot.metadata.now;
    state.metadata.state = snapshot.metadata.state;
    state.metadata.outcome = snapshot.metadata.outcome;
    state.metadata.commanderScore = snapshot.metadata.commanderScore;
    state.metadata.comboPeak = snapshot.metadata.comboPeak;
    state.metadata.tickCount = snapshot.metadata.tickCount;
    state.metadata.roundTimerMs = snapshot.metadata.roundTimerMs;

    state.cityBase.id = snapshot.cityBase.id;
    state.cityBase.cityName = snapshot.cityBase.cityName;
    state.cityBase.hp = snapshot.cityBase.hp;
    state.cityBase.hpMax = snapshot.cityBase.hpMax;
    state.cityBase.x = snapshot.cityBase.x;
    state.cityBase.y = snapshot.cityBase.y;
    state.cityBase.damageLastTick = snapshot.cityBase.damageLastTick;
    state.cityBase.totalDamage = snapshot.cityBase.totalDamage;

    state.commander.playerId = snapshot.commander.playerId;
    state.commander.playerName = snapshot.commander.playerName;
    state.commander.ready = snapshot.commander.ready;
    state.commander.selectedLeviathanId = snapshot.commander.selectedLeviathanId;
    state.commander.assetsRemaining.clear();
    for (const [assetName, count] of Object.entries(snapshot.commander.assetsRemaining)) {
      state.commander.assetsRemaining.set(assetName, count);
    }
    state.commander.assetCooldowns.clear();
    for (const [assetName, cooldownAt] of Object.entries(snapshot.commander.assetCooldowns)) {
      state.commander.assetCooldowns.set(assetName, cooldownAt);
    }

    state.participants.clear();
    for (const participantSnapshot of snapshot.participants) {
      const participant = new MatchParticipantSchema();
      participant.sessionId = participantSnapshot.sessionId;
      participant.playerName = participantSnapshot.playerName;
      participant.claimedRole = participantSnapshot.claimedRole;
      participant.ready = participantSnapshot.ready;
      participant.leviathanId = participantSnapshot.leviathanId;
      state.participants.push(participant);
    }

    state.leviathans.clear();
    for (const leviathanSnapshot of snapshot.leviathans) {
      const leviathan = new LeviathanSchema();
      leviathan.id = leviathanSnapshot.id;
      leviathan.name = leviathanSnapshot.name;
      leviathan.archetype = leviathanSnapshot.archetype;
      leviathan.hp = leviathanSnapshot.hp;
      leviathan.hpMax = leviathanSnapshot.hpMax;
      leviathan.x = leviathanSnapshot.x;
      leviathan.y = leviathanSnapshot.y;
      leviathan.heading = leviathanSnapshot.heading;
      leviathan.moveX = leviathanSnapshot.moveX;
      leviathan.moveY = leviathanSnapshot.moveY;
      leviathan.speed = leviathanSnapshot.speed;
      leviathan.status = leviathanSnapshot.status;
      leviathan.statusEndTime = leviathanSnapshot.statusEndTime;
      leviathan.containedAt = leviathanSnapshot.containedAt;
      leviathan.lastAttackTime = leviathanSnapshot.lastAttackTime;
      leviathan.abilityCooldownEndsAt = leviathanSnapshot.abilityCooldownEndsAt;
      leviathan.pendingAbilityId = leviathanSnapshot.pendingAbilityId;
      leviathan.pendingAbilityRequestedAt = leviathanSnapshot.pendingAbilityRequestedAt;
      leviathan.credits = leviathanSnapshot.credits;
      leviathan.isAI = leviathanSnapshot.isAI;
      leviathan.isSpectator = leviathanSnapshot.isSpectator;
      leviathan.playerId = leviathanSnapshot.playerId;
      leviathan.playerName = leviathanSnapshot.playerName;
      leviathan.ready = leviathanSnapshot.ready;
      leviathan.damageDealt = leviathanSnapshot.damageDealt;
      leviathan.damageReceived = leviathanSnapshot.damageReceived;
      state.leviathans.push(leviathan);
    }

    state.dispatchHistory.clear();
    for (const dispatchSnapshot of snapshot.dispatchHistory) {
      const dispatch = new DispatchRecordSchema();
      dispatch.id = dispatchSnapshot.id;
      dispatch.assetName = dispatchSnapshot.assetName;
      dispatch.targetId = dispatchSnapshot.targetId;
      dispatch.dispatchedAt = dispatchSnapshot.dispatchedAt;
      dispatch.resolvedAt = dispatchSnapshot.resolvedAt;
      dispatch.outcome = dispatchSnapshot.outcome;
      dispatch.delayMs = dispatchSnapshot.delayMs;
      dispatch.applied = dispatchSnapshot.applied;
      state.dispatchHistory.push(dispatch);
    }

    state.kaijuAbilityResults.clear();
    for (const resultSnapshot of snapshot.kaijuAbilityResults) {
      const result = new KaijuAbilityResultSchema();
      result.id = resultSnapshot.id;
      result.leviathanId = resultSnapshot.leviathanId;
      result.abilityId = resultSnapshot.abilityId;
      result.outcome = resultSnapshot.outcome;
      result.message = resultSnapshot.message;
      result.resolvedAt = resultSnapshot.resolvedAt;
      result.applied = resultSnapshot.applied;
      state.kaijuAbilityResults.push(result);
    }

    state.signalFeed.clear();
    for (const signalSnapshot of snapshot.signalFeed) {
      const signal = new SignalFeedEntrySchema();
      signal.timestamp = signalSnapshot.timestamp;
      signal.message = signalSnapshot.message;
      signal.severity = signalSnapshot.severity;
      signal.source = signalSnapshot.source;
      signal.dispatchId = signalSnapshot.dispatchId;
      state.signalFeed.push(signal);
    }

    state.activeBarriers.clear();
    for (const barrierSnapshot of snapshot.activeBarriers) {
      const barrier = new BarrierSchema();
      barrier.id = barrierSnapshot.id;
      barrier.createdAt = barrierSnapshot.createdAt;
      barrier.expiresAt = barrierSnapshot.expiresAt;
      barrier.damageAbsorbed = barrierSnapshot.damageAbsorbed;
      state.activeBarriers.push(barrier);
    }

    return state;
  }

  /**
   * Parse a serialized snapshot string and return hydrated schema state.
   */
  static deserializeSnapshot(serialized: string): MatchSchema {
    const parsed = JSON.parse(serialized) as MatchSnapshot;
    return MatchSchema.fromSnapshot(parsed);
  }
}

export interface MatchSnapshot {
  metadata: MatchMetadataSnapshot;
  cityBase: CityBaseSnapshot;
  commander: CommanderSnapshot;
  participants: MatchParticipantSnapshot[];
  leviathans: LeviathanSnapshot[];
  dispatchHistory: DispatchRecordSnapshot[];
  kaijuAbilityResults: KaijuAbilityResultSnapshot[];
  signalFeed: SignalFeedEntrySnapshot[];
  activeBarriers: BarrierSnapshot[];
}

export interface MatchMetadataSnapshot {
  matchId: string;
  startedAt: number;
  now: number;
  state: string;
  outcome: string;
  commanderScore: number;
  comboPeak: number;
  tickCount: number;
  roundTimerMs: number;
}

export interface CityBaseSnapshot {
  id: string;
  cityName: string;
  hp: number;
  hpMax: number;
  x: number;
  y: number;
  damageLastTick: number;
  totalDamage: number;
}

export interface CommanderSnapshot {
  playerId: string;
  playerName: string;
  ready: boolean;
  selectedLeviathanId: string;
  assetsRemaining: Record<string, number>;
  assetCooldowns: Record<string, number>;
}

export interface MatchParticipantSnapshot {
  sessionId: string;
  playerName: string;
  claimedRole: string;
  ready: boolean;
  leviathanId: string;
}

export interface LeviathanSnapshot {
  id: string;
  name: string;
  archetype: string;
  hp: number;
  hpMax: number;
  x: number;
  y: number;
  heading: number;
  moveX: number;
  moveY: number;
  speed: number;
  status: string;
  statusEndTime: number;
  containedAt: number;
  lastAttackTime: number;
  abilityCooldownEndsAt: number;
  pendingAbilityId: string;
  pendingAbilityRequestedAt: number;
  credits: number;
  isAI: boolean;
  isSpectator: boolean;
  playerId: string;
  playerName: string;
  ready: boolean;
  damageDealt: number;
  damageReceived: number;
}

export interface DispatchRecordSnapshot {
  id: string;
  assetName: string;
  targetId: string;
  dispatchedAt: number;
  resolvedAt: number;
  outcome: string;
  delayMs: number;
  applied: boolean;
}

export interface KaijuAbilityResultSnapshot {
  id: string;
  leviathanId: string;
  abilityId: string;
  outcome: string;
  message: string;
  resolvedAt: number;
  applied: boolean;
}

export interface SignalFeedEntrySnapshot {
  timestamp: number;
  message: string;
  severity: string;
  source: string;
  dispatchId: string;
}

export interface BarrierSnapshot {
  id: string;
  createdAt: number;
  expiresAt: number;
  damageAbsorbed: number;
}

/**
 * Game Constants
 * Centralized configuration for all game mechanics
 */
export const GAME_CONSTANTS = {
  // Tick engine
  TICK_RATE_HZ: 20, // 20 Hz = 50ms per tick
  TICK_MS: 50,

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

  // Movement tuning
  BASE_MOVE_SPEED_UNITS_PER_MS: 0.1,
  TURN_RATE_DEGREES_PER_SECOND: {
    Sniper: 460,
    Dozer: 260,
    Berserker: 400,
    Tank: 230,
    DEFAULT: 320,
  },

  // Status effects
  SUBMERGED_DURATION_MS: 5000,
  SUBMERGED_DAMAGE_ADJUSTMENT: 0.6,
  FRENZY_DURATION_MS: 4_000,
  FORTRESS_DURATION_MS: 5_000,
  ROAR_RADIUS_UNITS: 22,
  ROAR_PUSH_UNITS: 7,
  ABILITY_COOLDOWNS_MS: {
    submerge: 8_000,
    roar: 7_000,
    frenzy: 6_000,
    fortress: 9_000,
  },
};
