/**
 * Client-side Type Definitions
 *
 * Shared types for Commander Dashboard and Kaiju Mobile Client
 * These types mirror the server schema and add client-specific state
 */

import { MatchSchema } from "../schema/MatchSchema";

/**
 * Client game state
 * Extends server schema with client-only state like predicted/interpolated positions
 */
export interface ClientGameState {
  matchId: string;
  serverState: MatchSchema;
  role: "COMMANDER" | "KAIJU";
  playerId: string;
  playerName: string;
  leviathanId?: string;

  // Client-only state
  isConnected: boolean;
  isReady: boolean;
  latencyMs: number;
  lastServerMessageTime: number;

  // Commander-specific
  selectedTargetId?: string;
  lastDispatchTime?: number;

  // Kaiju-specific
  lastHeading?: number;
  lastAbilityTime?: number;
}

/**
 * Connection options when joining a match
 */
export interface MatchJoinOptions {
  playerName: string;
  matchId?: string;
  role?: "COMMANDER" | "KAIJU";
}

/**
 * Client → Server message payload
 */
export interface ClientMessagePayload {
  type: string;
  [key: string]: unknown;
}

/**
 * Server → Client event payload
 */
export interface ServerEventPayload {
  type: string;
  [key: string]: unknown;
}

/**
 * Commander frontend event models (server broadcast payloads)
 */
export interface SignalFeedEventModel {
  type: "signal.feed";
  timestamp: number;
  message: string;
  severity: "nominal" | "alert" | "critical";
  dispatchId?: string;
}

export interface CommanderStatusEventModel {
  type: "commander.status";
  timestamp: number;
  selectedLeviathanId: string;
  assetsRemaining: Record<string, number>;
  assetCooldownsMsRemaining: Record<string, number>;
  assetCooldownsReady: Record<string, boolean>;
  assetCooldownsProgress: Record<string, number>;
  activeBarriers: number;
  commanderScore: number;
  cityBaseHp: number;
}

export interface KaijuAbilityResultEventModel {
  type: "kaiju.ability.result";
  resultId: string;
  leviathanId: string;
  abilityId: string;
  outcome: "APPLIED" | "REJECTED" | "UNVERIFIED";
  message: string;
  resolvedAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => typeof entry === "number" && Number.isFinite(entry)
  );
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "boolean");
}

/**
 * Runtime guard for commander status payloads.
 */
export function isCommanderStatusEventModel(
  payload: unknown
): payload is CommanderStatusEventModel {
  if (!isRecord(payload) || payload.type !== "commander.status") {
    return false;
  }

  return (
    typeof payload.timestamp === "number" &&
    typeof payload.selectedLeviathanId === "string" &&
    isNumberRecord(payload.assetsRemaining) &&
    isNumberRecord(payload.assetCooldownsMsRemaining) &&
    isBooleanRecord(payload.assetCooldownsReady) &&
    isNumberRecord(payload.assetCooldownsProgress) &&
    typeof payload.activeBarriers === "number" &&
    typeof payload.commanderScore === "number" &&
    typeof payload.cityBaseHp === "number"
  );
}

/**
 * Runtime guard for signal feed payloads.
 */
export function isSignalFeedEventModel(payload: unknown): payload is SignalFeedEventModel {
  if (!isRecord(payload) || payload.type !== "signal.feed") {
    return false;
  }

  const hasValidSeverity =
    payload.severity === "nominal" ||
    payload.severity === "alert" ||
    payload.severity === "critical";

  return (
    typeof payload.timestamp === "number" &&
    typeof payload.message === "string" &&
    hasValidSeverity &&
    (payload.dispatchId === undefined || typeof payload.dispatchId === "string")
  );
}

/**
 * Runtime guard for kaiju ability result payloads.
 */
export function isKaijuAbilityResultEventModel(
  payload: unknown
): payload is KaijuAbilityResultEventModel {
  if (!isRecord(payload) || payload.type !== "kaiju.ability.result") {
    return false;
  }

  const validOutcome =
    payload.outcome === "APPLIED" ||
    payload.outcome === "REJECTED" ||
    payload.outcome === "UNVERIFIED";

  return (
    typeof payload.resultId === "string" &&
    typeof payload.leviathanId === "string" &&
    typeof payload.abilityId === "string" &&
    validOutcome &&
    typeof payload.message === "string" &&
    typeof payload.resolvedAt === "number"
  );
}

/**
 * Commander display state
 */
export interface CommanderDisplayState {
  selectedLeviathanId: string;
  hoveredLeviathanId?: string;
  visibleLeviathanDetails?: Record<string, unknown>;
  lastSignalFeedUpdate: number;
}

/**
 * Kaiju display state
 */
export interface KaijuDisplayState {
  currentHeading: number;
  targetHeading?: number;
  showContinueUI: boolean;
  continueCountdownMs: number;
  damagePopups: DamagePopupDisplay[];
}

/**
 * Damage popup for rendering
 */
export interface DamagePopupDisplay {
  id: string;
  damage: number;
  x: number;
  y: number;
  createdAt: number;
  durationMs: number;
  isCombo: boolean;
  color: string;
}

/**
 * UI state for both clients
 */
export interface UIState {
  showMenu: boolean;
  showSettings: boolean;
  showStats: boolean;
  alertLevel: "normal" | "warning" | "critical";
  screenShakeIntensity: number;
}

/**
 * Audio cue types
 */
export type AudioCueType =
  | "select"
  | "confirm"
  | "dispatch"
  | "attack"
  | "damage"
  | "combo"
  | "alarm"
  | "kaiju_contained"
  | "respawn"
  | "victory"
  | "defeat";

/**
 * Audio cue to play
 */
export interface AudioCue {
  type: AudioCueType;
  volume: number;
  playbackRate: number;
}

/**
 * Animation context for screen shake
 */
export interface ScreenShakeContext {
  intensity: number;
  duration: number;
  startTime: number;
  frequency: number;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  latencyMs: number;
  packetLoss: number;
  messageQueueLength: number;
  lastMessageTime: number;
}

/**
 * Game statistics / score tracking
 */
export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  assetsDispatched: number;
  civilians: number;
  comboPeak: number;
  playDuration: number;
  outcome: "PENDING" | "VICTORY" | "DEFEAT" | "DRAW";
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  wins: number;
  losses: number;
  avgScore: number;
  lastPlayed: number;
}

/**
 * Match result / final state
 */
export interface MatchResult {
  outcome: "KAIJU_VICTORY" | "COMMANDER_VICTORY" | "TIME_LIMIT" | "ABORTED";
  commanderScore: number;
  comboPeak: number;
  durationMs: number;
  kaijuStats: Record<string, GameStats>;
  commanderStats: GameStats;
}
