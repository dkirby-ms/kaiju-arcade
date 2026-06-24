/**
 * Message Protocol Types
 *
 * Defines the client→server and server→client message contracts.
 *
 * Constraints from design spec:
 * - Commander: select, dispatch
 * - Kaiju: move, attack, ability, continue
 * - Server broadcasts: state patches (via Colyseus), signal events, match results, contained event
 */

/**
 * Client → Server messages
 */
export interface CommanderSelectMessage {
  type: "commander.select";
  leviathonId: string;
}

export interface CommanderDispatchMessage {
  type: "commander.dispatch";
  assetName: "Scramble Jets" | "Deploy Mechs" | "Raise Barrier" | "Evac Sector";
  targetId: string;
}

export interface KaijuMoveMessage {
  type: "kaiju.move";
  heading: number; // 0–360 degrees, or vector
}

export interface KaijuAttackMessage {
  type: "kaiju.attack";
}

export interface KaijuAbilityMessage {
  type: "kaiju.ability";
  abilityId: string;
}

export interface KaijuContinueMessage {
  type: "kaiju.continue";
}

export type ClientMessage =
  | CommanderSelectMessage
  | CommanderDispatchMessage
  | KaijuMoveMessage
  | KaijuAttackMessage
  | KaijuAbilityMessage
  | KaijuContinueMessage;

/**
 * Server → Client broadcast events (sent via room.broadcast or room.send to specific client)
 */
export interface KaijuContainedSignal {
  type: "kaiju.contained";
  leviathonId: string;
  leviathonName: string;
}

export interface SignalFeedEvent {
  type: "signal.feed";
  timestamp: number;
  message: string;
  severity: "nominal" | "alert" | "critical";
}

export interface MatchResultEvent {
  type: "match.result";
  outcome: "kaiju-victory" | "commander-victory" | "time-limit" | "aborted";
  summary: {
    baseHPRemaining: number;
    commanderScore: number;
    comboPeak: number;
    duration: number;
  };
}

export interface GameStateUpdateEvent {
  type: "game.state.update";
  // Colyseus handles the delta encoding; this is just a marker for client code
}

export type ServerEvent =
  | KaijuContainedSignal
  | SignalFeedEvent
  | MatchResultEvent
  | GameStateUpdateEvent;

/**
 * Validation helpers
 */
export function isClientMessage(msg: unknown): msg is ClientMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }

  const m = msg as Record<string, unknown>;
  const type = m.type;

  if (typeof type !== "string") {
    return false;
  }

  return [
    "commander.select",
    "commander.dispatch",
    "kaiju.move",
    "kaiju.attack",
    "kaiju.ability",
    "kaiju.continue",
  ].includes(type);
}

export function validateCommanderSelect(msg: unknown): msg is CommanderSelectMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return (
    m.type === "commander.select" &&
    typeof m.leviathonId === "string" &&
    m.leviathonId.length > 0
  );
}

export function validateCommanderDispatch(msg: unknown): msg is CommanderDispatchMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  const validAssets = [
    "Scramble Jets",
    "Deploy Mechs",
    "Raise Barrier",
    "Evac Sector",
  ];
  return (
    m.type === "commander.dispatch" &&
    validAssets.includes(m.assetName as string) &&
    typeof m.targetId === "string" &&
    m.targetId.length > 0
  );
}

export function validateKaijuMove(msg: unknown): msg is KaijuMoveMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return m.type === "kaiju.move" && typeof m.heading === "number";
}

export function validateKaijuAttack(msg: unknown): msg is KaijuAttackMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return m.type === "kaiju.attack";
}

export function validateKaijuAbility(msg: unknown): msg is KaijuAbilityMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return (
    m.type === "kaiju.ability" &&
    typeof m.abilityId === "string" &&
    m.abilityId.length > 0
  );
}

export function validateKaijuContinue(msg: unknown): msg is KaijuContinueMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return m.type === "kaiju.continue";
}
