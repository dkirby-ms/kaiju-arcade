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
  GAME_CONSTANTS,
} from "../schema/MatchSchema";
import {
  ClientMessage,
  getCommanderSelectLeviathanId,
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

interface PlayerSession {
  clientId: string;
  sessionId: string;
  role: "COMMANDER" | "KAIJU";
  leviathanId?: string;
  playerName: string;
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
  type: "kaiju.reconnect.token";
  leviathanId: string;
  reconnectToken: string;
  graceWindowMs: number;
}

interface JoinRejectionTelemetry {
  type: "match.join.rejected";
  reason: "capacity";
  matchId: string;
  clientId: string;
  sessionId: string;
  timestamp: number;
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
  private tickIntervalId?: NodeJS.Timeout;
  private lastTickTime: number = 0;
  private tickDeltaMs: number = 0;
  private containedEventLedger: Map<string, number> = new Map();

  onCreate(options: Record<string, unknown>) {
    console.log("MatchRoom created");

    // Initialize schema
    this.state = new MatchSchema();

    // Initialize metadata
    this.state.metadata.matchId = uuid();
    this.state.metadata.startedAt = Date.now();
    this.state.metadata.state = "WAITING";

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
        this.handleClientMessage(client, { type: messageType, ...(message as Record<string, unknown>) } as ClientMessage);
      }
    });

    console.log(`Match ${this.state.metadata.matchId} initialized`);
  }

  onJoin(client: Client, options?: Record<string, unknown>) {
    console.log(`Client ${client.sessionId} joined`);

    // Determine role: first player is COMMANDER, rest are KAIJU
    const isCommander = this.playerSessions.size === 0;

    const playerName = (options?.playerName as string) || `Player_${client.sessionId.slice(0, 6)}`;

    const session: PlayerSession = {
      clientId: client.id,
      sessionId: client.sessionId,
      role: isCommander ? "COMMANDER" : "KAIJU",
      playerName,
    };

    if (isCommander) {
      // Assign Commander
      this.state.commander.playerId = client.sessionId;
      this.state.commander.playerName = playerName;
      session.role = "COMMANDER";
      console.log(`${playerName} assigned as COMMANDER`);
      this.emitSignal(`COMMANDER ${playerName.toUpperCase()} ONLINE`, "nominal", "SYSTEM");
    } else {
      const reconnectToken =
        typeof options?.reconnectToken === "string" ? options.reconnectToken : undefined;

      // Reclaim by reconnect token first, then claim an open AI slot.
      const leviathan =
        this.reclaimKaijuGraceSlot(reconnectToken, client.sessionId, playerName) ??
        this.claimKaijuSlot(client.sessionId, playerName);
      if (!leviathan) {
        console.warn("No kaiju slot available for joining player");
        this.emitJoinRejectionTelemetry(client, "capacity");
        this.rejectJoin(client, "No kaiju slot available");
        return;
      }

      session.leviathanId = leviathan.id;
      this.sendReconnectToken(client, leviathan.id);
      console.log(`${playerName} assigned as KAIJU ${leviathan.name}`);
      this.emitSignal(`KAIJU ${leviathan.name} PILOT ENGAGED`, "nominal", "SYSTEM");
    }

    this.playerSessions.set(client.sessionId, session);

    // Transition to ACTIVE if we have both commander and at least one kaiju
    if (
      this.playerSessions.size >= 2 &&
      this.state.metadata.state === "WAITING"
    ) {
      this.startMatch();
    }
  }

  private rejectJoin(client: Client, reason: string) {
    const rejectionClient = client as unknown as RejectionCapableClient;
    if (typeof rejectionClient.leave === "function") {
      rejectionClient.leave(MatchRoom.ROOM_FULL_CLOSE_CODE, reason);
    }
  }

  private emitJoinRejectionTelemetry(client: Client, reason: "capacity") {
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

  onLeave(client: Client, code?: number) {
    console.log(`Client ${client.sessionId} left`);

    const session = this.playerSessions.get(client.sessionId);
    if (!session) {
      return;
    }

    if (session.role === "COMMANDER") {
      // Commander disconnected - replace with AI or end match
      this.emitSignal("COMMANDER OFFLINE - ATTEMPTING RECOVERY", "critical", "SYSTEM");
      // For now, just mark as disconnected; could implement AI takeover
      if (this.state.metadata.state === "ACTIVE") {
        this.state.metadata.state = "ENDED";
        this.state.metadata.outcome = "ABORTED";
      }
    } else {
      // Kaiju player disconnected - start 30s grace window for reconnection.
      if (session.leviathanId) {
        const leviathan = this.state.getLeviathan(session.leviathanId);
        if (leviathan) {
          const hasReconnectCredits = leviathan.credits > 0;
          const disconnectedAbruptly = typeof code !== "number" || code !== 1000;
          const canGraceReconnect = disconnectedAbruptly && hasReconnectCredits;

          if (canGraceReconnect) {
            this.startReconnectGraceWindow(leviathan, session);
          } else {
            this.promoteSlotToAI(leviathan);
          }
        }
      }
    }

    this.playerSessions.delete(client.sessionId);

    // If room is empty, it will auto-dispose
    if (this.playerSessions.size === 0) {
      this.disconnect();
    }
  }

  private handleClientMessage(client: Client, message: ClientMessage) {
    const session = this.playerSessions.get(client.sessionId);
    if (!session) {
      console.warn(`Received message from unknown client: ${client.sessionId}`);
      return;
    }

    try {
      switch (message.type) {
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
            this.handleKaijuMove(session.leviathanId, message.heading);
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

  private handleKaijuMove(leviathanId: string, heading: number) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan && !leviathan.isSpectator && leviathan.status !== "CONTAINED") {
      leviathan.heading = heading;
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
    return slot;
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

  private promoteSlotToAI(leviathan: LeviathanSchema) {
    leviathan.isAI = true;
    leviathan.playerId = "";
    leviathan.playerName = "";
  }

  private issueReconnectToken(leviathanId: string): string {
    const reconnectToken = uuid();
    this.reconnectTokenByLeviathanId.set(leviathanId, reconnectToken);
    return reconnectToken;
  }

  private sendReconnectToken(client: Client, leviathanId: string) {
    const reconnectToken = this.issueReconnectToken(leviathanId);

    const payload: ReconnectTokenPayload = {
      type: "kaiju.reconnect.token",
      leviathanId,
      reconnectToken,
      graceWindowMs: MatchRoom.RECONNECT_GRACE_MS,
    };

    if (typeof client.send === "function") {
      client.send("kaiju.reconnect.token", payload);
    }
  }

  private startMatch() {
    console.log("Match starting...");
    this.state.metadata.state = "ACTIVE";
    this.state.metadata.startedAt = Date.now();
    this.emitSignal("MATCH START", "nominal", "SYSTEM");
    this.broadcastMatchStart();
    this.broadcastCommanderStatus(this.state.metadata.startedAt);

    // Start game loop: 5 Hz (200ms per tick)
    this.lastTickTime = Date.now();
    this.tickIntervalId = setInterval(() => this.tick(), GAME_CONSTANTS.TICK_MS);
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
    this.reconnectGraceWindows.clear();
    this.reconnectTokenByLeviathanId.clear();
  }
}
