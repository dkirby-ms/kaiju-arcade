/**
 * Kaiju Arcade Match Room
 *
 * Colyseus Room implementation for managing a single multiplayer match.
 * Handles: match initialization, player roles, game loop, message validation, and state updates.
 */

import { Room, Client } from "colyseus";
import {
  MatchSchema,
  LeviathanSchema,
  MatchParticipantSchema,
  GAME_CONSTANTS,
} from "../schema/MatchSchema";
import {
  ClientMessage,
  getCommanderSelectLeviathanId,
  validateMatchReady,
  validateMatchRoleClaim,
  validateMatchRoleRelease,
  validateCommanderSelect,
  validateCommanderDispatch,
  validateKaijuMove,
  validateKaijuAttack,
  validateKaijuAbility,
  validateKaijuContinue,
} from "../messages/protocol";
import { executeTick, validateTickTiming } from "./GameLoop";
import { selectCityBase } from "./lastStandCities";
import { v4 as uuid } from "uuid";

const COMMANDER_ASSET_STARTING_COUNTS: Record<string, number> = {
  "Scramble Jets": 5,
  "Deploy Mechs": 3,
  "Raise Barrier": 4,
  "Evac Sector": 2,
};

const COMMANDER_DISPATCH_COOLDOWN_MS: Record<string, number> = {
  "Scramble Jets": 6_000,
  "Deploy Mechs": 8_000,
  "Raise Barrier": 12_000,
  "Evac Sector": 10_000,
};

const COMMANDER_TARGETED_ASSETS = new Set<string>(["Scramble Jets", "Deploy Mechs"]);

type PlayerRole = "COMMANDER" | "KAIJU";

interface PlayerSession {
  clientId: string;
  sessionId: string;
  role?: PlayerRole;
  leviathanId?: string;
  playerName: string;
  ready: boolean;
}

interface MatchResultSummary {
  baseHPRemaining: number;
  commanderScore: number;
  comboPeak: number;
  duration: number;
}

type MatchResultOutcome = "kaiju-victory" | "commander-victory" | "time-limit" | "aborted";

interface ReconnectGraceWindow {
  leviathanId: string;
  reconnectToken: string;
  timeoutId: NodeJS.Timeout;
  expiresAt: number;
}

interface ReconnectTokenPayload {
  type: "match.reconnect.token";
  role: "COMMANDER" | "KAIJU";
  leviathanId: string;
  reconnectToken: string;
  graceWindowMs: number;
}

interface CommanderReconnectWindow {
  reconnectToken: string;
  expiresAt: number;
  timeoutId: NodeJS.Timeout;
  playerName: string;
}

interface JoinRejectionTelemetry {
  type: "match.join.rejected";
  reason: "capacity" | "invalid-role";
  matchId: string;
  clientId: string;
  sessionId: string;
  timestamp: number;
}

interface MatchPhasePayload {
  type: "match.phase";
  phase: "WAITING" | "LOBBY" | "ACTIVE";
  matchId: string;
  timestamp: number;
  playerCount: number;
}

interface RejectionCapableClient {
  leave?: (code?: number, reason?: string) => void;
}

export class MatchRoom extends Room<MatchSchema> {
  private static readonly MAX_KAIJU_SLOTS = 4;
  private static readonly RECONNECT_GRACE_MS = 30_000;
  private static readonly ROOM_FULL_CLOSE_CODE = 1008;

  private playerSessions: Map<string, PlayerSession> = new Map();
  private reconnectGraceWindows: Map<string, ReconnectGraceWindow> = new Map();
  private reconnectTokenByLeviathanId: Map<string, string> = new Map();
  private commanderReconnectWindow?: CommanderReconnectWindow;
  private tickIntervalId?: NodeJS.Timeout;
  private lastTickTime: number = 0;
  private tickDeltaMs: number = 0;
  private containedEventLedger: Map<string, number> = new Map();

  private updateRoomListingMetadata(metadata: Record<string, unknown>) {
    const roomWithMetadata = this as unknown as {
      setMetadata: (value: Record<string, unknown>) => void;
    };
    roomWithMetadata.setMetadata(metadata);
  }

  onCreate(options: Record<string, unknown>) {
    console.log("MatchRoom created");

    // Initialize schema
    this.state = new MatchSchema();

    // Initialize metadata
    this.state.metadata.matchId = uuid();
    this.state.metadata.startedAt = Date.now();
    this.state.metadata.state = "WAITING";
    this.updateRoomListingMetadata({
      state: "WAITING",
      status: "waiting",
      playerCount: 0,
      maxPlayers: this.maxClients,
      commanderName: "",
      commanderTaken: false,
      kaijuOpenSlots: MatchRoom.MAX_KAIJU_SLOTS,
      cityName: this.state.cityBase.cityName,
      gameMode: "standard",
    });

    // Initialize city base from options or use default
    this.state.cityBase.id = uuid();
    this.state.cityBase.cityName = selectCityBase(options.cityName as string | undefined);
    this.state.cityBase.hp = GAME_CONSTANTS.CITY_BASE_HP;
    this.state.cityBase.hpMax = GAME_CONSTANTS.CITY_BASE_HP;
    this.state.cityBase.x = 50;
    this.state.cityBase.y = 50;

    // Initialize commander state (placeholder, will be assigned on onJoin)
    this.state.commander.playerId = "";
    this.state.commander.playerName = "";
    this.state.commander.selectedLeviathanId = "";
    this.state.commander.assetsRemaining.clear();
    this.state.commander.assetCooldowns.clear();

    // Initialize asset cooldowns
    for (const [assetName, count] of Object.entries(COMMANDER_ASSET_STARTING_COUNTS)) {
      this.state.commander.assetsRemaining.set(assetName, count);
      this.state.commander.assetCooldowns.set(assetName, 0);
    }

    this.seedKaijuSlots();

    // Set room options
    this.maxClients = 1 + MatchRoom.MAX_KAIJU_SLOTS; // 1 commander + up to 4 kaiju
    this.autoDispose = true;

    // Set up message handlers
    this.onMessage("*", (client: Client, messageType: string | number, message: unknown) => {
      if (typeof messageType === "string") {
        const payload = { type: messageType, ...(message as Record<string, unknown>) };
        if (messageType === "commander.start") {
          this.handleCommanderStart(client);
          return;
        }

        this.handleClientMessage(client, payload as ClientMessage);
      }
    });

    console.log(`Match ${this.state.metadata.matchId} initialized`);
  }

  onJoin(client: Client, options?: Record<string, unknown>) {
    console.log(`Client ${client.sessionId} joined`);

    const requestedRole =
      typeof options?.role === "string"
        ? options.role.toUpperCase()
        : typeof options?.playerRole === "string"
          ? options.playerRole.toUpperCase()
          : undefined;
    const hasRequestedRole = requestedRole !== undefined;

    if (
      hasRequestedRole &&
      requestedRole !== "COMMANDER" &&
      requestedRole !== "KAIJU"
    ) {
      this.emitJoinRejectionTelemetry(client, "invalid-role");
      this.rejectJoin(client, "Role must be commander or kaiju");
      return;
    }

    const playerName = (options?.playerName as string) || `Player_${client.sessionId.slice(0, 6)}`;

    const session: PlayerSession = {
      clientId: client.id,
      sessionId: client.sessionId,
      playerName,
      ready: false,
    };

    this.playerSessions.set(client.sessionId, session);
    this.addParticipant(session);

    const reconnectToken =
      typeof options?.reconnectToken === "string" ? options.reconnectToken : undefined;
    if (reconnectToken) {
      if (this.tryReclaimCommanderSession(client, session, reconnectToken)) {
        this.refreshLobbyMetadata();
        this.reconcileLobbyPhase();
        return;
      }

      this.tryReclaimKaijuSession(client, session, reconnectToken);
    }

    if (requestedRole === "COMMANDER" || requestedRole === "KAIJU") {
      const claimed = this.handleRoleClaim(client, session, requestedRole);
      if (!claimed) {
        const rejectionReason = requestedRole === "COMMANDER" ? "Commander slot already taken" : "No kaiju slot available";
        this.removeParticipant(client.sessionId);
        this.playerSessions.delete(client.sessionId);
        this.emitJoinRejectionTelemetry(client, "capacity");
        this.rejectJoin(client, rejectionReason);
        return;
      }
    }

    this.refreshLobbyMetadata();
    this.reconcileLobbyPhase();

    if (this.state.metadata.state === "WAITING") {
      this.broadcastMatchPhase("WAITING");
    }
  }

  onLeave(client: Client, code?: number) {
    console.log(`Client ${client.sessionId} left`);

    const session = this.playerSessions.get(client.sessionId);
    if (!session) {
      return;
    }

    if (session.role === "COMMANDER") {
      this.emitSignal("COMMANDER OFFLINE - ATTEMPTING RECOVERY", "critical", "SYSTEM");
      const disconnectedAbruptly = typeof code !== "number" || code !== 1000;
      if (disconnectedAbruptly) {
        this.startCommanderReconnectWindow(session);
      } else {
        this.releaseCommanderClaim(session, false);
      }
    } else if (session.role === "KAIJU" && session.leviathanId) {
      const leviathan = this.state.getLeviathan(session.leviathanId);
      if (leviathan) {
        const hasReconnectCredits = leviathan.credits > 0;
        const disconnectedAbruptly = typeof code !== "number" || code !== 1000;
        const canGraceReconnect = disconnectedAbruptly && hasReconnectCredits;

        if (canGraceReconnect) {
          this.startReconnectGraceWindow(leviathan, session);
        } else {
          this.releaseKaijuClaim(session, false);
        }
      }
    }

    this.removeParticipant(client.sessionId);
    this.playerSessions.delete(client.sessionId);
    this.refreshLobbyMetadata();
    this.reconcileLobbyPhase();

    // If room is empty, it will auto-dispose
    if (this.playerSessions.size === 0) {
      this.disconnect();
    }
  }

  private rejectJoin(client: Client, reason: string) {
    const rejectionClient = client as unknown as RejectionCapableClient;
    if (typeof rejectionClient.leave === "function") {
      rejectionClient.leave(MatchRoom.ROOM_FULL_CLOSE_CODE, reason);
    }
  }

  private emitJoinRejectionTelemetry(client: Client, reason: "capacity" | "invalid-role") {
    const telemetry: JoinRejectionTelemetry = {
      type: "match.join.rejected",
      reason,
      matchId: this.state.metadata.matchId,
      clientId: client.id,
      sessionId: client.sessionId,
      timestamp: Date.now(),
    };

    if (typeof this.broadcast === "function") {
      this.broadcast("match.join.rejected", telemetry);
    }

    this.emitSignal("JOIN REJECTED - MATCH AT CAPACITY", "alert", "SYSTEM");
    console.warn(JSON.stringify(telemetry));
  }

  private handleClientMessage(client: Client, message: ClientMessage) {
    const session = this.playerSessions.get(client.sessionId);
    if (!session) {
      console.warn(`Received message from unknown client: ${client.sessionId}`);
      return;
    }

    try {
      switch (message.type) {
        case "match.role.claim":
          if (validateMatchRoleClaim(message)) {
            this.handleRoleClaim(client, session, message.role);
          }
          break;

        case "match.role.release":
          if (validateMatchRoleRelease(message)) {
            this.handleRoleRelease(session);
          }
          break;

        case "match.ready":
          if (validateMatchReady(message)) {
            this.handleReadyUpdate(session, message.ready);
          }
          break;

        case "commander.select":
          if (validateCommanderSelect(message) && session.role === "COMMANDER") {
            this.handleCommanderSelect(getCommanderSelectLeviathanId(message));
          }
          break;

        case "commander.dispatch":
          if (validateCommanderDispatch(message) && session.role === "COMMANDER") {
            this.handleCommanderDispatch(
              message.assetName,
              message.targetId
            );
          }
          break;

        case "kaiju.move":
          if (validateKaijuMove(message) && session.role === "KAIJU" && session.leviathanId) {
            this.handleKaijuMove(
              session.leviathanId,
              message.heading,
              message.moveX,
              message.moveY
            );
          }
          break;

        case "kaiju.attack":
          if (validateKaijuAttack(message) && session.role === "KAIJU" && session.leviathanId) {
            this.handleKaijuAttack(session.leviathanId);
          }
          break;

        case "kaiju.ability":
          if (validateKaijuAbility(message) && session.role === "KAIJU" && session.leviathanId) {
            this.handleKaijuAbility(session.leviathanId, message.abilityId);
          }
          break;

        case "kaiju.continue":
          if (validateKaijuContinue(message) && session.role === "KAIJU" && session.leviathanId) {
            this.handleKaijuContinue(session.leviathanId);
          }
          break;

        default:
          console.warn(`Unknown message type: ${(message as Record<string, unknown>).type}`);
      }
    } catch (error) {
      console.error("Error handling client message:", error);
    }
  }

  private handleCommanderStart(client: Client) {
    const session = this.playerSessions.get(client.sessionId);
    if (!session || session.role !== "COMMANDER") {
      return;
    }

    if (this.state.metadata.state !== "LOBBY") {
      this.emitSignal("MATCH START REJECTED - LOBBY PHASE REQUIRED", "alert", "SYSTEM");
      return;
    }

    const startCheck = this.validateStartRequirements();
    if (!startCheck.valid) {
      this.emitSignal(startCheck.reason, "alert", "SYSTEM");
      return;
    }

    this.startMatch();
  }

  private reconcileLobbyPhase() {
    if (this.state.metadata.state === "ACTIVE" || this.state.metadata.state === "ENDED") {
      return;
    }

    const hasMinimumPlayers = this.playerSessions.size >= 2;
    if (hasMinimumPlayers && this.state.metadata.state === "WAITING") {
      this.state.metadata.state = "LOBBY";
      this.emitSignal("LOBBY READY", "nominal", "SYSTEM");
      this.refreshLobbyMetadata();
      this.broadcastMatchPhase("LOBBY");
      return;
    }

    if (!hasMinimumPlayers && this.state.metadata.state === "LOBBY") {
      this.state.metadata.state = "WAITING";
      this.refreshLobbyMetadata();
      this.broadcastMatchPhase("WAITING");
    }
  }

  private handleRoleClaim(client: Client, session: PlayerSession, role: PlayerRole): boolean {
    if (this.state.metadata.state === "ACTIVE" || this.state.metadata.state === "ENDED") {
      return false;
    }

    if (session.role === role) {
      return true;
    }

    if (session.role) {
      this.handleRoleRelease(session);
    }

    if (role === "COMMANDER") {
      if (this.state.commander.playerId.length > 0) {
        this.emitSignal("ROLE CLAIM REJECTED - COMMANDER SLOT TAKEN", "alert", "SYSTEM");
        return false;
      }

      session.role = "COMMANDER";
      session.ready = false;
      session.leviathanId = undefined;
      this.state.commander.playerId = session.sessionId;
      this.state.commander.playerName = session.playerName;
      this.state.commander.ready = false;
      this.syncParticipant(session);
      this.refreshLobbyMetadata();
      this.emitSignal(`COMMANDER ${session.playerName.toUpperCase()} ONLINE`, "nominal", "SYSTEM");
      return true;
    }

    const leviathan = this.claimKaijuSlot(session.sessionId, session.playerName);
    if (!leviathan) {
      this.emitSignal("ROLE CLAIM REJECTED - NO KAIJU SLOT AVAILABLE", "alert", "SYSTEM");
      return false;
    }

    session.role = "KAIJU";
    session.ready = false;
    session.leviathanId = leviathan.id;
    this.syncParticipant(session);
    this.sendReconnectToken(client, leviathan.id);
    this.refreshLobbyMetadata();
    this.emitSignal(`KAIJU ${leviathan.name} PILOT ENGAGED`, "nominal", "SYSTEM");
    return true;
  }

  private handleRoleRelease(session: PlayerSession) {
    if (session.role === "COMMANDER") {
      this.releaseCommanderClaim(session, true);
    } else if (session.role === "KAIJU") {
      this.releaseKaijuClaim(session, true);
    }

    this.refreshLobbyMetadata();
  }

  private handleReadyUpdate(session: PlayerSession, ready: boolean) {
    if (!session.role) {
      this.emitSignal("READY REJECTED - ROLE CLAIM REQUIRED", "alert", "SYSTEM");
      return;
    }

    session.ready = ready;
    if (session.role === "COMMANDER") {
      this.state.commander.ready = ready;
    } else if (session.leviathanId) {
      const leviathan = this.state.getLeviathan(session.leviathanId);
      if (leviathan) {
        leviathan.ready = ready;
      }
    }

    this.syncParticipant(session);
  }

  private validateStartRequirements(): { valid: boolean; reason: string } {
    if (this.playerSessions.size < 2) {
      return { valid: false, reason: "MATCH START REJECTED - MINIMUM PLAYERS REQUIRED" };
    }

    const participants = this.state.participants;
    if (participants.some((participant: MatchParticipantSchema) => participant.claimedRole.length === 0)) {
      return { valid: false, reason: "MATCH START REJECTED - ALL PLAYERS MUST CLAIM ROLE" };
    }

    if (this.state.commander.playerId.length === 0) {
      return { valid: false, reason: "MATCH START REJECTED - COMMANDER REQUIRED" };
    }

    const hasKaiju = this.state.leviathans.some(
      (leviathan: LeviathanSchema) => !leviathan.isAI && leviathan.playerId.length > 0
    );
    if (!hasKaiju) {
      return { valid: false, reason: "MATCH START REJECTED - KAIJU REQUIRED" };
    }

    const everyoneReady = participants.every((participant: MatchParticipantSchema) => participant.ready);
    if (!everyoneReady || !this.state.commander.ready) {
      return { valid: false, reason: "MATCH START REJECTED - ALL PLAYERS MUST BE READY" };
    }

    return { valid: true, reason: "" };
  }

  private handleCommanderSelect(leviathanId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan) {
      this.state.commander.selectedLeviathanId = leviathanId;
      console.log(`Commander selected ${leviathan.name}`);
      this.broadcastCommanderStatus(Date.now());
    }
  }

  private handleCommanderDispatch(
    assetName: string,
    targetId: string
  ) {
    const now = Date.now();
    const cooldownReadyAt = this.state.commander.assetCooldowns.get(assetName) ?? 0;
    if (now < cooldownReadyAt) {
      const secondsRemaining = Math.ceil((cooldownReadyAt - now) / 1000);
      this.emitSignal(
        `DISPATCH FAILED: ${assetName} COOLDOWN ${secondsRemaining}s`,
        "alert",
        "SYSTEM"
      );
      return;
    }

    if (COMMANDER_TARGETED_ASSETS.has(assetName) && !this.state.getLeviathan(targetId)) {
      this.emitSignal(
        `DISPATCH FAILED: ${assetName} TARGET INVALID`,
        "alert",
        "SYSTEM"
      );
      return;
    }

    const assetsRemaining = this.state.commander.assetsRemaining.get(assetName) ?? 0;
    if (assetsRemaining <= 0) {
      this.emitSignal(`DISPATCH FAILED: ${assetName} DEPLETED`, "alert", "SYSTEM");
      return;
    }

    this.state.commander.assetsRemaining.set(assetName, assetsRemaining - 1);
    const cooldownMs = COMMANDER_DISPATCH_COOLDOWN_MS[assetName] ?? 0;
    this.state.commander.assetCooldowns.set(assetName, now + cooldownMs);

    const dispatchRecord = this.state.createDispatchRecord(assetName, targetId, now);
    this.state.dispatchHistory.push(dispatchRecord);

    console.log(`Commander dispatched ${assetName} on ${targetId}`);
    // Validation and resolution will happen in the game loop
    this.emitSignal(`DISPATCH: ${assetName} -> ${targetId}`, "nominal", "COMMANDER", dispatchRecord.id);
    this.broadcastCommanderStatus(now);
  }

  private handleKaijuMove(
    leviathanId: string,
    heading?: number,
    moveX?: number,
    moveY?: number
  ) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (!leviathan || leviathan.isSpectator || leviathan.status === "CONTAINED") {
      return;
    }

    const hasVector =
      typeof moveX === "number" &&
      Number.isFinite(moveX) &&
      typeof moveY === "number" &&
      Number.isFinite(moveY);

    if (hasVector) {
      const magnitude = Math.hypot(moveX, moveY);
      if (magnitude <= 0.0001) {
        leviathan.moveX = 0;
        leviathan.moveY = 0;
        return;
      }

      leviathan.moveX = moveX / magnitude;
      leviathan.moveY = moveY / magnitude;
      leviathan.heading = ((Math.atan2(leviathan.moveY, leviathan.moveX) * 180) / Math.PI + 360) % 360;
      return;
    }

    if (typeof heading === "number" && Number.isFinite(heading)) {
      const normalizedHeading = ((heading % 360) + 360) % 360;
      const radians = (normalizedHeading * Math.PI) / 180;
      leviathan.heading = normalizedHeading;
      leviathan.moveX = Math.cos(radians);
      leviathan.moveY = Math.sin(radians);
    }
  }

  private handleKaijuAttack(leviathanId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan && !leviathan.isSpectator && leviathan.status !== "CONTAINED") {
      console.log(`${leviathan.name} attacking base`);
      // Damage resolution in game loop
    }
  }

  private handleKaijuAbility(leviathanId: string, abilityId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan) {
      if (leviathan.isSpectator) {
        this.state.addKaijuAbilityResult(
          leviathan.id,
          abilityId,
          "REJECTED",
          `ABILITY REJECTED - ${leviathan.name} IN SPECTATOR MODE`,
          Date.now()
        );
        this.broadcastKaijuAbilityResults();
        return;
      }

      const now = Date.now();
      if (leviathan.status === "CONTAINED") {
        this.state.addKaijuAbilityResult(
          leviathan.id,
          abilityId,
          "REJECTED",
          `ABILITY REJECTED - ${leviathan.name} CONTAINED`,
          now
        );
        this.emitSignal(
          `ABILITY REJECTED - ${leviathan.name} CONTAINED`,
          "alert",
          "SYSTEM"
        );
        this.broadcastKaijuAbilityResults();
        return;
      }

      if (now < leviathan.abilityCooldownEndsAt) {
        this.state.addKaijuAbilityResult(
          leviathan.id,
          abilityId,
          "REJECTED",
          `ABILITY REJECTED - ${Math.ceil((leviathan.abilityCooldownEndsAt - now) / 1000)}s COOLDOWN`,
          now
        );
        this.broadcastKaijuAbilityResults();
        return;
      }

      leviathan.pendingAbilityId = abilityId;
      leviathan.pendingAbilityRequestedAt = now;
      this.emitSignal(
        `ABILITY QUEUED - ${leviathan.name} ${abilityId.toUpperCase()}`,
        "nominal",
        "SYSTEM"
      );
    }
  }

  private handleKaijuContinue(leviathanId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan && !leviathan.isSpectator && leviathan.credits > 0 && leviathan.status === "CONTAINED") {
      const now = Date.now();
      const remainingWindowMs = GAME_CONSTANTS.CONTINUE_WINDOW_MS - (now - leviathan.containedAt);
      if (remainingWindowMs <= 0) {
        this.emitSignal(
          `KAIJU ${leviathan.name} CONTINUE FAILED - WINDOW EXPIRED`,
          "critical",
          "SYSTEM"
        );
        return;
      }

      leviathan.credits--;
      leviathan.hp = Math.ceil(leviathan.hpMax * GAME_CONSTANTS.RESPAWN_HP_FRACTION);
      leviathan.status = "ACTIVE";
      leviathan.statusEndTime = 0;
      leviathan.containedAt = 0;
      leviathan.isSpectator = false;
      leviathan.moveX = 0;
      leviathan.moveY = 0;
      console.log(`${leviathan.name} continued with ${leviathan.credits} credits remaining`);
      this.emitSignal(
        `KAIJU ${leviathan.name} RESPAWNING - CREDIT USED`,
        "nominal",
        "SYSTEM"
      );
    }
  }

  private createLeviathan(
    index: number,
    playerId: string,
    playerName: string,
    isAI: boolean
  ): LeviathanSchema {
    const archetypes = ["Sniper", "Dozer", "Berserker", "Tank"];
    const archetype = archetypes[index % archetypes.length];

    const leviathan = new LeviathanSchema();
    leviathan.id = uuid();
    leviathan.name = isAI
      ? `${archetype}-AI-${index + 1}`
      : `${archetype}-${playerName.slice(0, 3).toUpperCase()}`;
    leviathan.archetype = archetype;
    leviathan.hp = 100;
    leviathan.hpMax = 100;
    leviathan.x = 10; // Start at map edge
    leviathan.y = 10 + index * 20;
    leviathan.heading = 180; // Moving toward base (at 50, 50)
    leviathan.moveX = 0;
    leviathan.moveY = 0;
    leviathan.speed = 1;
    leviathan.status = "ACTIVE";
    leviathan.isAI = isAI;
    leviathan.playerId = playerId;
    leviathan.playerName = playerName;
    leviathan.credits = GAME_CONSTANTS.CREDIT_COUNT;

    return leviathan;
  }

  private seedKaijuSlots() {
    for (let i = 0; i < MatchRoom.MAX_KAIJU_SLOTS; i++) {
      this.state.leviathans.push(this.createLeviathan(i, "", "", true));
    }
  }

  private claimKaijuSlot(playerId: string, playerName: string): LeviathanSchema | undefined {
    const slot = this.state.leviathans.find(
      (leviathan: LeviathanSchema) => leviathan.isAI && leviathan.playerId === ""
    );
    if (!slot) {
      return undefined;
    }

    slot.isAI = false;
    slot.playerId = playerId;
    slot.playerName = playerName;
    slot.name = `${slot.archetype}-${playerName.slice(0, 3).toUpperCase()}`;
    slot.hp = slot.hpMax;
    slot.credits = GAME_CONSTANTS.CREDIT_COUNT;
    slot.moveX = 0;
    slot.moveY = 0;
    slot.ready = false;
    return slot;
  }

  private tryReclaimKaijuSession(client: Client, session: PlayerSession, reconnectToken: string) {
    const leviathan = this.reclaimKaijuGraceSlot(reconnectToken, client.sessionId, session.playerName);
    if (!leviathan) {
      return;
    }

    session.role = "KAIJU";
    session.leviathanId = leviathan.id;
    session.ready = leviathan.ready;
    this.syncParticipant(session);
    this.sendReconnectToken(client, leviathan.id);
  }

  private tryReclaimCommanderSession(client: Client, session: PlayerSession, reconnectToken: string): boolean {
    if (!this.commanderReconnectWindow) {
      return false;
    }

    if (this.commanderReconnectWindow.reconnectToken !== reconnectToken) {
      return false;
    }

    clearTimeout(this.commanderReconnectWindow.timeoutId);
    this.commanderReconnectWindow = undefined;

    session.role = "COMMANDER";
    session.ready = this.state.commander.ready;
    session.leviathanId = undefined;
    this.state.commander.playerId = session.sessionId;
    this.state.commander.playerName = session.playerName;
    this.syncParticipant(session);
    this.sendCommanderReconnectToken(client);
    this.emitSignal(`COMMANDER ${session.playerName.toUpperCase()} RECONNECTED`, "nominal", "SYSTEM");
    return true;
  }

  private reclaimKaijuGraceSlot(
    reconnectToken: string | undefined,
    sessionId: string,
    playerName: string
  ): LeviathanSchema | undefined {
    if (!reconnectToken) {
      return undefined;
    }

    const graceWindow = Array.from(this.reconnectGraceWindows.values()).find(
      (window: ReconnectGraceWindow) => window.reconnectToken === reconnectToken
    );
    if (!graceWindow) {
      return undefined;
    }

    const leviathan = this.state.getLeviathan(graceWindow.leviathanId);
    if (!leviathan) {
      return undefined;
    }

    clearTimeout(graceWindow.timeoutId);
    this.reconnectGraceWindows.delete(graceWindow.leviathanId);

    leviathan.isAI = false;
    leviathan.playerId = sessionId;
    leviathan.playerName = playerName;
    leviathan.moveX = 0;
    leviathan.moveY = 0;

    this.emitSignal(
      `KAIJU ${leviathan.name} RECONNECTED - GRACE RECOVERY SUCCESS`,
      "nominal",
      "SYSTEM"
    );

    return leviathan;
  }

  private startReconnectGraceWindow(leviathan: LeviathanSchema, session: PlayerSession) {
    const existingWindow = this.reconnectGraceWindows.get(leviathan.id);
    if (existingWindow) {
      clearTimeout(existingWindow.timeoutId);
      this.reconnectGraceWindows.delete(leviathan.id);
    }

    const reconnectToken = this.issueReconnectToken(leviathan.id);

    console.log(`Kaiju ${leviathan.name} player disconnected - grace window started`);
    this.emitSignal(
      `KAIJU ${leviathan.name} CONNECTION LOST - GRACE WINDOW ACTIVE`,
      "alert",
      "SYSTEM"
    );

    const timeoutId = setTimeout(() => {
      const currentWindow = this.reconnectGraceWindows.get(leviathan.id);
      if (!currentWindow) {
        return;
      }

      const latestLeviathan = this.state.getLeviathan(leviathan.id);
      if (!latestLeviathan) {
        this.reconnectGraceWindows.delete(leviathan.id);
        return;
      }

      const hasActiveController = latestLeviathan.playerId.length > 0;
      if (!hasActiveController) {
        this.promoteSlotToAI(latestLeviathan);
        this.emitSignal(
          `KAIJU ${latestLeviathan.name} GRACE WINDOW EXPIRED - AI TAKEOVER`,
          "alert",
          "SYSTEM"
        );
      }

      this.reconnectGraceWindows.delete(leviathan.id);
    }, MatchRoom.RECONNECT_GRACE_MS);

    this.reconnectGraceWindows.set(leviathan.id, {
      leviathanId: leviathan.id,
      reconnectToken,
      timeoutId,
      expiresAt: Date.now() + MatchRoom.RECONNECT_GRACE_MS,
    });

    leviathan.playerId = "";
    leviathan.playerName = session.playerName;
  }

  private startCommanderReconnectWindow(session: PlayerSession) {
    if (this.commanderReconnectWindow) {
      clearTimeout(this.commanderReconnectWindow.timeoutId);
    }

    const reconnectToken = uuid();
    const timeoutId = setTimeout(() => {
      if (!this.commanderReconnectWindow) {
        return;
      }

      this.commanderReconnectWindow = undefined;
      this.state.metadata.state = "ENDED";
      this.state.metadata.outcome = "ABORTED";
      this.emitSignal("COMMANDER RECONNECT WINDOW EXPIRED - MATCH ABORTED", "critical", "SYSTEM");
    }, MatchRoom.RECONNECT_GRACE_MS);

    this.commanderReconnectWindow = {
      reconnectToken,
      expiresAt: Date.now() + MatchRoom.RECONNECT_GRACE_MS,
      timeoutId,
      playerName: session.playerName,
    };

    this.state.commander.playerId = "";
    this.sendCommanderReconnectToken();
  }

  private promoteSlotToAI(leviathan: LeviathanSchema) {
    const slotIndex = this.state.leviathans.findIndex((candidate: LeviathanSchema) => candidate.id === leviathan.id);
    leviathan.isAI = true;
    leviathan.playerId = "";
    leviathan.playerName = "";
    leviathan.ready = false;
    if (slotIndex >= 0) {
      leviathan.name = `${leviathan.archetype}-AI-${slotIndex + 1}`;
    }
  }

  private releaseCommanderClaim(session: PlayerSession, resetSession: boolean) {
    this.state.commander.playerId = "";
    this.state.commander.playerName = "";
    this.state.commander.ready = false;
    this.state.commander.selectedLeviathanId = "";

    if (resetSession) {
      session.role = undefined;
      session.ready = false;
      session.leviathanId = undefined;
    }

    this.syncParticipant(session);
  }

  private releaseKaijuClaim(session: PlayerSession, resetSession: boolean) {
    if (session.leviathanId) {
      const leviathan = this.state.getLeviathan(session.leviathanId);
      if (leviathan) {
        this.promoteSlotToAI(leviathan);
      }
    }

    if (resetSession) {
      session.role = undefined;
      session.ready = false;
      session.leviathanId = undefined;
    }

    this.syncParticipant(session);
  }

  private addParticipant(session: PlayerSession) {
    const participant = this.state.getParticipant(session.sessionId);
    if (participant) {
      return;
    }

    const nextParticipant = this.createParticipant(session);
    this.state.participants.push(nextParticipant);
  }

  private syncParticipant(session: PlayerSession) {
    const participant = this.state.getParticipant(session.sessionId);
    if (!participant) {
      return;
    }

    participant.playerName = session.playerName;
    participant.claimedRole = session.role ?? "";
    participant.ready = session.ready;
    participant.leviathanId = session.leviathanId ?? "";
  }

  private removeParticipant(sessionId: string) {
    const participantIndex = this.state.participants.findIndex(
      (participant: MatchParticipantSchema) => participant.sessionId === sessionId
    );
    if (participantIndex >= 0) {
      this.state.participants.splice(participantIndex, 1);
    }
  }

  private createParticipant(session: PlayerSession) {
    const participant = this.state.getParticipant(session.sessionId);
    if (participant) {
      return participant;
    }

    const createdParticipant = new MatchParticipantSchema();
    createdParticipant.sessionId = session.sessionId;
    createdParticipant.playerName = session.playerName;
    createdParticipant.claimedRole = session.role ?? "";
    createdParticipant.ready = session.ready;
    createdParticipant.leviathanId = session.leviathanId ?? "";
    return createdParticipant;
  }

  private issueReconnectToken(leviathanId: string): string {
    const reconnectToken = uuid();
    this.reconnectTokenByLeviathanId.set(leviathanId, reconnectToken);
    return reconnectToken;
  }

  private sendReconnectToken(client: Client, leviathanId: string) {
    const reconnectToken = this.issueReconnectToken(leviathanId);

    const payload: ReconnectTokenPayload = {
      type: "match.reconnect.token",
      role: "KAIJU",
      leviathanId,
      reconnectToken,
      graceWindowMs: MatchRoom.RECONNECT_GRACE_MS,
    };

    if (typeof client.send === "function") {
      client.send("match.reconnect.token", payload);
      client.send("kaiju.reconnect.token", payload);
    }
  }

  private sendCommanderReconnectToken(client?: Client) {
    if (!this.commanderReconnectWindow) {
      return;
    }

    const payload: ReconnectTokenPayload = {
      type: "match.reconnect.token",
      role: "COMMANDER",
      leviathanId: "",
      reconnectToken: this.commanderReconnectWindow.reconnectToken,
      graceWindowMs: MatchRoom.RECONNECT_GRACE_MS,
    };

    if (client && typeof client.send === "function") {
      client.send("match.reconnect.token", payload);
      return;
    }

    if (typeof this.broadcast === "function") {
      this.broadcast("match.reconnect.token", payload);
    }
  }

  private startMatch() {
    console.log("Match starting...");
    this.state.metadata.state = "ACTIVE";
    this.state.metadata.startedAt = Date.now();
    this.emitSignal("MATCH START", "nominal", "SYSTEM");
    this.refreshLobbyMetadata();
    this.broadcastMatchPhase("ACTIVE");
    this.broadcastMatchStart();
    this.broadcastCommanderStatus(this.state.metadata.startedAt);

    // Start game loop: 20 Hz (50ms per tick)
    this.lastTickTime = Date.now();
    this.tickIntervalId = setInterval(() => this.tick(), GAME_CONSTANTS.TICK_MS);
  }

  private refreshLobbyMetadata() {
    const commanderTaken = this.state.commander.playerId.length > 0;
    const kaijuOpenSlots = this.state.leviathans.filter(
      (leviathan: LeviathanSchema) => leviathan.isAI && leviathan.playerId.length === 0
    ).length;

    this.updateRoomListingMetadata({
      state: this.state.metadata.state,
      status: this.state.metadata.state.toLowerCase(),
      playerCount: this.playerSessions.size,
      maxPlayers: this.maxClients,
      commanderName: this.state.commander.playerName,
      commanderTaken,
      kaijuOpenSlots,
      cityName: this.state.cityBase.cityName,
      gameMode: "standard",
    });
  }

  private broadcastMatchPhase(phase: "WAITING" | "LOBBY" | "ACTIVE") {
    if (typeof this.broadcast !== "function") {
      return;
    }

    const payload: MatchPhasePayload = {
      type: "match.phase",
      phase,
      matchId: this.state.metadata.matchId,
      timestamp: Date.now(),
      playerCount: this.playerSessions.size,
    };

    this.broadcast("match.phase", payload);
  }

  private broadcastMatchStart() {
    const payload = {
      type: "match.start",
      matchId: this.state.metadata.matchId,
      cityName: this.state.cityBase.cityName,
      startedAt: this.state.metadata.startedAt,
      kaijuSlots: this.state.leviathans.map((leviathan: LeviathanSchema) => ({
        id: leviathan.id,
        name: leviathan.name,
        archetype: leviathan.archetype,
        isAI: leviathan.isAI,
      })),
    };

    if (typeof this.broadcast === "function") {
      this.broadcast("match.start", payload);
    }
  }

  private tick() {
    const now = Date.now();
    this.tickDeltaMs = now - this.lastTickTime;
    this.lastTickTime = now;
    const signalCountBeforeTick = this.state.signalFeed.length;

    this.state.metadata.now = now;
    this.state.metadata.tickCount++;

    // Validate tick timing
    const timing = validateTickTiming(this.tickDeltaMs);
    if (!timing.isValid) {
      console.warn(
        `Tick timing drift: ${timing.drift}ms (${timing.driftPercent.toFixed(1)}%)`
      );
    }

    // Execute deterministic world updates
    executeTick({
      state: this.state,
      deltaMs: this.tickDeltaMs,
      tickCount: this.state.metadata.tickCount,
      now,
    });

    this.transitionExpiredContinuedKaijuToSpectators(now);
    this.broadcastContainedEvents(now);

    this.broadcastDispatchResults();
    this.broadcastKaijuAbilityResults();

    // Signals generated by tick execution are mirrored over room broadcasts for commander UI.
    this.broadcastSignalsSince(signalCountBeforeTick);
    this.broadcastCommanderStatus(now);

    // Check win conditions
    this.checkWinCondition();

    // Check if match has ended
    if (this.state.metadata.state === "ENDED") {
      this.endMatch();
    }
  }

  private emitSignal(
    message: string,
    severity: "nominal" | "alert" | "critical",
    source: string,
    dispatchId?: string
  ) {
    this.state.addSignal(message, severity, source, dispatchId ?? "");
    const latestSignal = this.state.signalFeed[this.state.signalFeed.length - 1];
    if (!latestSignal) {
      return;
    }

    this.broadcastSignalEntry(
      latestSignal.timestamp,
      latestSignal.message,
      latestSignal.severity,
      latestSignal.dispatchId
    );
  }

  private broadcastSignalsSince(startIndex: number) {
    if (typeof this.broadcast !== "function" || this.state.signalFeed.length <= startIndex) {
      return;
    }

    for (let i = startIndex; i < this.state.signalFeed.length; i++) {
      const signal = this.state.signalFeed[i];
      if (!signal) {
        continue;
      }

      this.broadcastSignalEntry(signal.timestamp, signal.message, signal.severity, signal.dispatchId);
    }
  }

  private broadcastSignalEntry(
    timestamp: number,
    message: string,
    severity: string,
    dispatchId?: string
  ) {
    if (typeof this.broadcast !== "function") {
      return;
    }

    this.broadcast("signal.feed", {
      type: "signal.feed",
      timestamp,
      message,
      severity,
      ...(dispatchId ? { dispatchId } : {}),
    });
  }

  private broadcastCommanderStatus(timestamp: number) {
    if (typeof this.broadcast !== "function") {
      return;
    }

    const assetCooldownsMsRemaining: Record<string, number> = {};
    const assetCooldownsReady: Record<string, boolean> = {};
    const assetCooldownsProgress: Record<string, number> = {};
    for (const [assetName, readyAt] of this.state.commander.assetCooldowns.entries()) {
      const remainingMs = Math.max(0, readyAt - timestamp);
      const cooldownMs = COMMANDER_DISPATCH_COOLDOWN_MS[assetName] ?? 0;
      const normalizedProgress = cooldownMs <= 0
        ? 1
        : Math.max(0, Math.min(1, (cooldownMs - remainingMs) / cooldownMs));

      assetCooldownsMsRemaining[assetName] = remainingMs;
      assetCooldownsReady[assetName] = remainingMs === 0;
      assetCooldownsProgress[assetName] = normalizedProgress;
    }

    this.broadcast("commander.status", {
      type: "commander.status",
      timestamp,
      selectedLeviathanId: this.state.commander.selectedLeviathanId,
      assetsRemaining: Object.fromEntries(this.state.commander.assetsRemaining),
      assetCooldownsMsRemaining,
      assetCooldownsReady,
      assetCooldownsProgress,
      activeBarriers: this.state.activeBarriers.length,
      commanderScore: this.state.metadata.commanderScore,
      cityBaseHp: this.state.cityBase.hp,
    });
  }

  private broadcastDispatchResults() {
    if (typeof this.broadcast !== "function") {
      return;
    }

    for (const dispatch of this.state.dispatchHistory) {
      if (dispatch.resolvedAt <= 0 || dispatch.applied) {
        continue;
      }

      this.broadcast("commander.dispatch.result", {
        type: "commander.dispatch.result",
        dispatchId: dispatch.id,
        assetName: dispatch.assetName,
        targetId: dispatch.targetId,
        outcome: dispatch.outcome,
        resolvedAt: dispatch.resolvedAt,
      });

      dispatch.applied = true;
    }
  }

  private broadcastKaijuAbilityResults() {
    if (typeof this.broadcast !== "function") {
      return;
    }

    for (const result of this.state.kaijuAbilityResults) {
      if (result.applied) {
        continue;
      }

      this.broadcast("kaiju.ability.result", {
        type: "kaiju.ability.result",
        resultId: result.id,
        leviathanId: result.leviathanId,
        abilityId: result.abilityId,
        outcome: result.outcome,
        message: result.message,
        resolvedAt: result.resolvedAt,
      });

      result.applied = true;
    }
  }

  private broadcastContainedEvents(now: number) {
    if (typeof this.broadcast !== "function") {
      return;
    }

    for (const leviathan of this.state.leviathans) {
      if (leviathan.status !== "CONTAINED" || leviathan.containedAt <= 0) {
        this.containedEventLedger.delete(leviathan.id);
        continue;
      }

      const lastBroadcastContainedAt = this.containedEventLedger.get(leviathan.id) ?? 0;
      if (leviathan.containedAt <= lastBroadcastContainedAt) {
        continue;
      }

      this.broadcast("kaiju.contained", {
        type: "kaiju.contained",
        leviathanId: leviathan.id,
        leviathanName: leviathan.name,
        creditsRemaining: leviathan.credits,
        containedAt: leviathan.containedAt,
        timestamp: now,
      });

      this.containedEventLedger.set(leviathan.id, leviathan.containedAt);
    }
  }

  private transitionExpiredContinuedKaijuToSpectators(now: number) {
    for (const leviathan of this.state.leviathans) {
      const continueWindowExpired =
        leviathan.containedAt > 0 &&
        now - leviathan.containedAt >= GAME_CONSTANTS.CONTINUE_WINDOW_MS;
      const exhaustedCredits = leviathan.credits <= 0;
      const shouldBecomeSpectator =
        leviathan.status === "CONTAINED" &&
        !leviathan.isSpectator &&
        exhaustedCredits &&
        continueWindowExpired;

      if (!shouldBecomeSpectator) {
        continue;
      }

      leviathan.isSpectator = true;
      leviathan.pendingAbilityId = "";
      leviathan.pendingAbilityRequestedAt = 0;

      this.emitSignal(
        `KAIJU ${leviathan.name} GAME OVER - ENTERING SPECTATOR MODE`,
        "critical",
        "SYSTEM"
      );

      if (typeof this.broadcast === "function") {
        this.broadcast("kaiju.spectator", {
          type: "kaiju.spectator",
          leviathanId: leviathan.id,
          leviathanName: leviathan.name,
          reason: "continue-window-expired",
          timestamp: now,
        });
      }
    }
  }

  private checkWinCondition(): boolean {
    if (this.state.areAllLeviathansCaught()) {
      console.log("Commander victory - all kaiju contained");
      this.state.metadata.state = "ENDED";
      this.state.metadata.outcome = "COMMANDER_VICTORY";
      return true;
    }

    if (this.state.cityBase.hp <= 0) {
      console.log("Kaiju victory - city base destroyed");
      this.state.metadata.state = "ENDED";
      this.state.metadata.outcome = "KAIJU_VICTORY";
      return true;
    }

    return false;
  }

  private endMatch() {
    console.log(`Match ${this.state.metadata.matchId} ended: ${this.state.metadata.outcome}`);
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = undefined;
    }

    const summary: MatchResultSummary = {
      baseHPRemaining: Math.max(0, this.state.cityBase.hp),
      commanderScore: this.state.metadata.commanderScore,
      comboPeak: this.state.metadata.comboPeak,
      duration: Math.max(0, Date.now() - this.state.metadata.startedAt),
    };

    if (typeof this.broadcast === "function") {
      this.broadcast("match.result", {
        type: "match.result",
        outcome: this.toResultOutcome(this.state.metadata.outcome),
        summary,
      });
    }

    if (Array.isArray(this.clients)) {
      for (const client of this.clients) {
        if (typeof client.leave === "function") {
          client.leave();
        }
      }
    }
  }

  private toResultOutcome(rawOutcome: string): MatchResultOutcome {
    switch (rawOutcome) {
      case "KAIJU_VICTORY":
        return "kaiju-victory";
      case "COMMANDER_VICTORY":
        return "commander-victory";
      case "TIME_LIMIT":
        return "time-limit";
      default:
        return "aborted";
    }
  }

  onDispose() {
    console.log("MatchRoom disposed");
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
    }

    for (const graceWindow of this.reconnectGraceWindows.values()) {
      clearTimeout(graceWindow.timeoutId);
    }
    if (this.commanderReconnectWindow) {
      clearTimeout(this.commanderReconnectWindow.timeoutId);
      this.commanderReconnectWindow = undefined;
    }
    this.reconnectGraceWindows.clear();
    this.reconnectTokenByLeviathanId.clear();
  }
}
