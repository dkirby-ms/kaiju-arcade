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
