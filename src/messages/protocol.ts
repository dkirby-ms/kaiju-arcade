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
  leviathanId?: string;
  // Temporary backward compatibility for existing clients.
  leviathonId?: string;
}

export interface CommanderDispatchMessage {
  type: "commander.dispatch";
  assetName: "Scramble Jets" | "Deploy Mechs" | "Raise Barrier" | "Evac Sector";
  targetId: string;
}

export interface MatchRoleClaimMessage {
  type: "match.role.claim";
  role: "COMMANDER" | "KAIJU";
}

export interface MatchRoleReleaseMessage {
  type: "match.role.release";
}

export interface MatchReadyMessage {
  type: "match.ready";
  ready: boolean;
}

export interface KaijuMoveMessage {
  type: "kaiju.move";
  heading?: number; // 0–360 degrees fallback
  moveX?: number; // normalized movement vector X (-1 to 1)
  moveY?: number; // normalized movement vector Y (-1 to 1)
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
  | MatchRoleClaimMessage
  | MatchRoleReleaseMessage
  | MatchReadyMessage
  | KaijuMoveMessage
  | KaijuAttackMessage
  | KaijuAbilityMessage
  | KaijuContinueMessage;

/**
 * Server → Client broadcast events (sent via room.broadcast or room.send to specific client)
 */
export interface KaijuContainedSignal {
  type: "kaiju.contained";
  leviathanId: string;
  leviathanName: string;
  creditsRemaining: number;
  containedAt: number;
  timestamp: number;
}

export interface SignalFeedEvent {
  type: "signal.feed";
  timestamp: number;
  message: string;
  severity: "nominal" | "alert" | "critical";
  dispatchId?: string;
}

export interface CommanderStatusEvent {
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

export interface CommanderDispatchResultEvent {
  type: "commander.dispatch.result";
  dispatchId: string;
  assetName: string;
  targetId: string;
  outcome: "SUCCESS" | "PARTIAL" | "FAILED" | "UNVERIFIED";
  resolvedAt: number;
}

export interface KaijuAbilityResultEvent {
  type: "kaiju.ability.result";
  resultId: string;
  leviathanId: string;
  abilityId: string;
  outcome: "APPLIED" | "REJECTED" | "UNVERIFIED";
  message: string;
  resolvedAt: number;
}

export interface KaijuSpectatorEvent {
  type: "kaiju.spectator";
  leviathanId: string;
  leviathanName: string;
  reason: "continue-window-expired";
  timestamp: number;
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

export interface MatchStartEvent {
  type: "match.start";
  matchId: string;
  cityName: string;
  startedAt: number;
  kaijuSlots: Array<{
    id: string;
    name: string;
    archetype: string;
    isAI: boolean;
  }>;
}

export interface KaijuReconnectTokenEvent {
  type: "kaiju.reconnect.token";
  leviathanId: string;
  reconnectToken: string;
  graceWindowMs: number;
}

export interface GameStateUpdateEvent {
  type: "game.state.update";
  // Colyseus handles the delta encoding; this is just a marker for client code
}

export type ServerEvent =
  | KaijuContainedSignal
  | SignalFeedEvent
  | CommanderStatusEvent
  | CommanderDispatchResultEvent
  | KaijuAbilityResultEvent
  | KaijuSpectatorEvent
  | MatchResultEvent
  | MatchStartEvent
  | KaijuReconnectTokenEvent
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
    "match.role.claim",
    "match.role.release",
    "match.ready",
    "kaiju.move",
    "kaiju.attack",
    "kaiju.ability",
    "kaiju.continue",
  ].includes(type);
}

export function validateMatchRoleClaim(msg: unknown): msg is MatchRoleClaimMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }

  const m = msg as Record<string, unknown>;
  return (
    m.type === "match.role.claim" &&
    (m.role === "COMMANDER" || m.role === "KAIJU")
  );
}

export function validateMatchRoleRelease(msg: unknown): msg is MatchRoleReleaseMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }

  const m = msg as Record<string, unknown>;
  return m.type === "match.role.release";
}

export function validateMatchReady(msg: unknown): msg is MatchReadyMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }

  const m = msg as Record<string, unknown>;
  return m.type === "match.ready" && typeof m.ready === "boolean";
}

export function validateCommanderSelect(msg: unknown): msg is CommanderSelectMessage {
  if (!msg || typeof msg !== "object") {
    return false;
  }
  const m = msg as Record<string, unknown>;
  return (
    m.type === "commander.select" &&
    ((typeof m.leviathanId === "string" && m.leviathanId.length > 0) ||
      (typeof m.leviathonId === "string" && m.leviathonId.length > 0))
  );
}

export function getCommanderSelectLeviathanId(msg: CommanderSelectMessage): string {
  return msg.leviathanId ?? msg.leviathonId ?? "";
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
  if (m.type !== "kaiju.move") {
    return false;
  }

  const hasHeading = typeof m.heading === "number" && Number.isFinite(m.heading as number);
  const hasVector =
    typeof m.moveX === "number" &&
    Number.isFinite(m.moveX as number) &&
    typeof m.moveY === "number" &&
    Number.isFinite(m.moveY as number);

  return hasHeading || hasVector;
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
