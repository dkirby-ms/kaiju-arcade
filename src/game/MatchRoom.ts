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
  CommanderStateSchema,
  CityBaseSchema,
  MatchMetadataSchema,
  GAME_CONSTANTS,
} from "../schema/MatchSchema";
import {
  ClientMessage,
  validateCommanderSelect,
  validateCommanderDispatch,
  validateKaijuMove,
  validateKaijuAttack,
  validateKaijuAbility,
  validateKaijuContinue,
} from "../messages/protocol";
import { executeTick, validateTickTiming } from "./GameLoop";
import { v4 as uuid } from "uuid";

interface PlayerSession {
  clientId: string;
  sessionId: string;
  role: "COMMANDER" | "KAIJU";
  leviathanId?: string;
  playerName: string;
}

export class MatchRoom extends Room<MatchSchema> {
  private playerSessions: Map<string, PlayerSession> = new Map();
  private tickIntervalId?: NodeJS.Timeout;
  private lastTickTime: number = 0;
  private tickDeltaMs: number = 0;

  onCreate(options: Record<string, unknown>) {
    console.log("MatchRoom created");

    // Initialize schema
    this.state = new MatchSchema();

    // Initialize metadata
    this.state.metadata = new MatchMetadataSchema();
    this.state.metadata.matchId = uuid();
    this.state.metadata.startedAt = Date.now();
    this.state.metadata.state = "WAITING";

    // Initialize city base from options or use default
    this.state.cityBase = new CityBaseSchema();
    this.state.cityBase.id = uuid();
    this.state.cityBase.cityName = (options.cityName as string) || "Neo Tokyo";
    this.state.cityBase.hp = GAME_CONSTANTS.CITY_BASE_HP;
    this.state.cityBase.hpMax = GAME_CONSTANTS.CITY_BASE_HP;
    this.state.cityBase.x = 50;
    this.state.cityBase.y = 50;

    // Initialize commander state (placeholder, will be assigned on onJoin)
    this.state.commander = new CommanderStateSchema();

    // Initialize asset cooldowns
    this.state.commander.assetsRemaining?.set("Scramble Jets", 5);
    this.state.commander.assetsRemaining?.set("Deploy Mechs", 3);
    this.state.commander.assetsRemaining?.set("Raise Barrier", 4);
    this.state.commander.assetsRemaining?.set("Evac Sector", 2);

    // Set room options
    this.maxClients = 5; // 1 commander + up to 4 kaiju
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
      this.state.addSignal(`COMMANDER ${playerName.toUpperCase()} ONLINE`, "nominal", "SYSTEM");
    } else {
      // Create Leviathan for Kaiju player
      const leviathan = this.createLeviathanForPlayer(client.sessionId, playerName);
      session.leviathanId = leviathan.id;
      this.state.leviathans.push(leviathan);
      console.log(`${playerName} assigned as KAIJU ${leviathan.name}`);
      this.state.addSignal(`KAIJU ${leviathan.name} PILOT ENGAGED`, "nominal", "SYSTEM");
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

  onLeave(client: Client) {
    console.log(`Client ${client.sessionId} left`);

    const session = this.playerSessions.get(client.sessionId);
    if (!session) {
      return;
    }

    if (session.role === "COMMANDER") {
      // Commander disconnected - replace with AI or end match
      this.state.addSignal("COMMANDER OFFLINE - ATTEMPTING RECOVERY", "critical", "SYSTEM");
      // For now, just mark as disconnected; could implement AI takeover
      if (this.state.metadata.state === "ACTIVE") {
        this.state.metadata.state = "ENDED";
        this.state.metadata.outcome = "ABORTED";
      }
    } else {
      // Kaiju player disconnected - start 30s grace window for reconnection
      if (session.leviathanId) {
        const leviathan = this.state.getLeviathan(session.leviathanId);
        if (leviathan) {
          console.log(`Kaiju ${leviathan.name} player disconnected - grace window started`);
          this.state.addSignal(
            `KAIJU ${leviathan.name} CONNECTION LOST - GRACE WINDOW ACTIVE`,
            "alert",
            "SYSTEM"
          );
          // Could implement grace window timeout here
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
            this.handleCommanderSelect(message.leviathonId);
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
    }
  }

  private handleCommanderDispatch(
    assetName: string,
    targetId: string
  ) {
    console.log(`Commander dispatched ${assetName} on ${targetId}`);
    // Validation and resolution will happen in the game loop
    this.state.addSignal(`DISPATCH: ${assetName}`, "nominal", "COMMANDER");
  }

  private handleKaijuMove(leviathanId: string, heading: number) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan) {
      leviathan.heading = heading;
    }
  }

  private handleKaijuAttack(leviathanId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan) {
      console.log(`${leviathan.name} attacking base`);
      // Damage resolution in game loop
    }
  }

  private handleKaijuAbility(leviathanId: string, abilityId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan) {
      console.log(`${leviathan.name} using ability: ${abilityId}`);
      // Ability resolution in game loop
    }
  }

  private handleKaijuContinue(leviathanId: string) {
    const leviathan = this.state.getLeviathan(leviathanId);
    if (leviathan && leviathan.credits > 0) {
      leviathan.credits--;
      leviathan.hp = Math.ceil(leviathan.hpMax * GAME_CONSTANTS.RESPAWN_HP_FRACTION);
      leviathan.status = "ACTIVE";
      console.log(`${leviathan.name} continued with ${leviathan.credits} credits remaining`);
      this.state.addSignal(
        `KAIJU ${leviathan.name} RESPAWNING - CREDIT USED`,
        "nominal",
        "SYSTEM"
      );
    }
  }

  private createLeviathanForPlayer(playerId: string, playerName: string): LeviathanSchema {
    const archetypes = ["Sniper", "Dozer", "Berserker", "Tank"];
    const archetype = archetypes[this.state.leviathans.length % archetypes.length];

    const leviathan = new LeviathanSchema();
    leviathan.id = uuid();
    leviathan.name = `${archetype}-${playerName.slice(0, 3).toUpperCase()}`;
    leviathan.archetype = archetype;
    leviathan.hp = 100;
    leviathan.hpMax = 100;
    leviathan.x = 10; // Start at map edge
    leviathan.y = 10 + this.state.leviathans.length * 20;
    leviathan.heading = 180; // Moving toward base (at 50, 50)
    leviathan.speed = 1;
    leviathan.status = "ACTIVE";
    leviathan.isAI = false;
    leviathan.playerId = playerId;
    leviathan.playerName = playerName;
    leviathan.credits = GAME_CONSTANTS.CREDIT_COUNT;

    return leviathan;
  }

  private startMatch() {
    console.log("Match starting...");
    this.state.metadata.state = "ACTIVE";
    this.state.metadata.startedAt = Date.now();
    this.state.addSignal("MATCH START", "nominal", "SYSTEM");

    // Start game loop: 5 Hz (200ms per tick)
    this.lastTickTime = Date.now();
    this.tickIntervalId = setInterval(() => this.tick(), GAME_CONSTANTS.TICK_MS);
  }

  private tick() {
    const now = Date.now();
    this.tickDeltaMs = now - this.lastTickTime;
    this.lastTickTime = now;

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

    // Check win conditions
    this.checkWinCondition();

    // Check if match has ended
    if (this.state.metadata.state === "ENDED") {
      this.endMatch();
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
    // Could save match results, update leaderboards, etc. here
  }

  onDispose() {
    console.log("MatchRoom disposed");
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
    }
  }
}
