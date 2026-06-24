/**
 * Game Loop & Deterministic World Updates
 *
 * Handles all per-tick calculations:
 * - Position updates and Leviathan advancement
 * - Attack cooldown tracking
 * - Damage resolution and combo detection
 * - Status effect duration tracking
 * - Win/loss condition checks
 *
 * All calculations must be deterministic (same input = same output)
 * to ensure consistency between server and clients.
 */

import { MatchSchema, GAME_CONSTANTS } from "../schema/MatchSchema";

export interface GameLoopContext {
  state: MatchSchema;
  deltaMs: number; // Milliseconds since last tick
  tickCount: number;
  now: number;
}

/**
 * Main tick function - orchestrates all per-frame updates
 * Called at 5 Hz (every 200ms)
 */
export function executeTick(context: GameLoopContext): void {
  // Order matters: positions → attacks → damage → effects → cleanup

  updateLeviathanPositions(context);
  processAttacks(context);
  resolveCommanderDispatches(context);
  updateStatusEffects(context);
  checkWinConditions(context);
}

/**
 * Update Leviathan positions based on heading and speed
 */
function updateLeviathanPositions(context: GameLoopContext): void {
  const { state, deltaMs } = context;

  for (const leviathan of state.leviathans) {
    if (leviathan.status === "CONTAINED") {
      continue; // Contained leviathans don't move
    }

    // Calculate movement distance this tick
    // Assuming speed is a multiplier of base speed (e.g., 1 = normal)
    const baseSpeed = 0.1; // Units per ms
    const distance = baseSpeed * leviathan.speed * deltaMs;

    // Convert heading to radians and calculate new position
    const radians = (leviathan.heading * Math.PI) / 180;
    leviathan.x += Math.cos(radians) * distance;
    leviathan.y += Math.sin(radians) * distance;

    // Clamp to map bounds (0-100)
    leviathan.x = Math.max(0, Math.min(100, leviathan.x));
    leviathan.y = Math.max(0, Math.min(100, leviathan.y));
  }
}

/**
 * Process queued attacks and damage
 */
function processAttacks(context: GameLoopContext): void {
  const { state, now } = context;

  for (const leviathan of state.leviathans) {
    if (
      leviathan.status === "CONTAINED" ||
      leviathan.status === "STUNNED"
    ) {
      continue;
    }

    // Check if leviathan can attack base
    const distanceToBase = calculateDistance(
      leviathan.x,
      leviathan.y,
      state.cityBase.x,
      state.cityBase.y
    );

    const attackRange = 10; // Units
    const attackCooldown = 2000; // ms

    if (
      distanceToBase < attackRange &&
      now - leviathan.lastAttackTime > attackCooldown
    ) {
      // Attack base
      const baseDamage = GAME_CONSTANTS.DAMAGE_BASE;
      const severityAdjustment =
        GAME_CONSTANTS.SEVERITY_ADJUSTMENT[
          leviathan.archetype === "Sniper"
            ? "WEAK"
            : leviathan.archetype === "Berserker"
              ? "STRONG"
              : "NORMAL"
        ] || 1.0;

      const damage = Math.round(baseDamage * severityAdjustment);
      state.cityBase.hp -= damage;
      state.cityBase.damageLastTick = damage;
      leviathan.lastAttackTime = now;
      leviathan.damageDealt += damage;

      state.addSignal(
        `BASE DAMAGED - ${leviathan.name} ATTACK RESOLVES`,
        "critical",
        "SYSTEM"
      );
    }
  }

}

function resolveCommanderDispatches(context: GameLoopContext): void {
  const { state, now } = context;

  for (const dispatch of state.dispatchHistory) {
    if (dispatch.resolvedAt > 0) {
      continue;
    }

    const isReadyToResolve = now - dispatch.dispatchedAt >= dispatch.delayMs;
    if (!isReadyToResolve) {
      continue;
    }

    dispatch.resolvedAt = now;

    switch (dispatch.assetName) {
      case "Scramble Jets":
      case "Deploy Mechs": {
        const target = state.getLeviathan(dispatch.targetId);
        if (!target || target.status === "CONTAINED") {
          dispatch.outcome = "UNVERIFIED";
          state.addSignal(
            `MITIGATION UNVERIFIED - ${dispatch.assetName} TARGET LOST`,
            "alert",
            "SYSTEM",
            dispatch.id
          );
          break;
        }

        const roll = deterministicRoll(dispatch.id, now);
        const profile = dispatch.assetName === "Scramble Jets"
          ? { success: 0.65, partial: 0.2, maxDamage: 40 }
          : { success: 0.55, partial: 0.25, maxDamage: 30 };

        if (roll <= profile.success) {
          dispatch.outcome = "SUCCESS";
          applyMitigationDamage(state, target.id, profile.maxDamage, now, dispatch.id);
          state.metadata.commanderScore += 20;
          state.addSignal(
            `${dispatch.assetName.toUpperCase()} SUCCESS - ${target.name} CONTAINMENT HIT`,
            "nominal",
            "SYSTEM",
            dispatch.id
          );
        } else if (roll <= profile.success + profile.partial) {
          dispatch.outcome = "PARTIAL";
          applyMitigationDamage(state, target.id, Math.round(profile.maxDamage * 0.5), now, dispatch.id);
          state.metadata.commanderScore += 8;
          state.addSignal(
            `${dispatch.assetName.toUpperCase()} PARTIAL - ${target.name} REPULSED`,
            "alert",
            "SYSTEM",
            dispatch.id
          );
        } else {
          dispatch.outcome = "FAILED";
          state.addSignal(
            `${dispatch.assetName.toUpperCase()} FAILED - ${target.name} EVADED`,
            "critical",
            "SYSTEM",
            dispatch.id
          );
        }

        break;
      }

      case "Raise Barrier": {
        const barrier = state.createBarrier(now, now + 8_000);
        state.activeBarriers.push(barrier);
        dispatch.outcome = "SUCCESS";
        state.metadata.commanderScore += 5;
        state.addSignal("RAISE BARRIER ONLINE - CITY BASE SHIELDED", "nominal", "SYSTEM", dispatch.id);
        break;
      }

      case "Evac Sector": {
        dispatch.outcome = "SUCCESS";
        state.metadata.commanderScore += 12;
        state.addSignal("EVAC SECTOR SUCCESS - CIVILIANS RELOCATED", "nominal", "SYSTEM", dispatch.id);
        break;
      }

      default:
        dispatch.outcome = "UNVERIFIED";
        state.addSignal("MITIGATION UNVERIFIED - UNKNOWN ASSET", "alert", "SYSTEM", dispatch.id);
        break;
    }
  }
}

/**
 * Update and expire status effects
 */
function updateStatusEffects(context: GameLoopContext): void {
  const { state, now } = context;

  for (const leviathan of state.leviathans) {
    if (leviathan.status !== "ACTIVE" && now >= leviathan.statusEndTime) {
      // Status effect expired
      leviathan.status = "ACTIVE";
    }
  }

  // Update barrier duration
  const barriersToRemove = [];
  for (let i = 0; i < state.activeBarriers.length; i++) {
    const barrier = state.activeBarriers[i];
    if (now >= barrier.expiresAt) {
      barriersToRemove.push(i);
    }
  }

  // Remove expired barriers (in reverse order to maintain indices)
  for (let i = barriersToRemove.length - 1; i >= 0; i--) {
    state.activeBarriers.splice(barriersToRemove[i], 1);
  }
}

function applyMitigationDamage(
  state: MatchSchema,
  targetId: string,
  damage: number,
  now: number,
  dispatchId: string
): void {
  const target = state.getLeviathan(targetId);
  if (!target || target.status === "CONTAINED") {
    return;
  }

  target.hp = Math.max(0, target.hp - damage);
  target.damageReceived += damage;

  if (target.hp <= 0) {
    target.status = "CONTAINED";
    target.statusEndTime = now;
    state.addSignal(`KAIJU ${target.name} CONTAINED`, "nominal", "SYSTEM", dispatchId);
  }
}

function deterministicRoll(seed: string, now: number): number {
  const input = `${seed}:${Math.floor(now / GAME_CONSTANTS.TICK_MS)}`;
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

/**
 * Check for match win/loss conditions
 */
function checkWinConditions(context: GameLoopContext): void {
  const { state } = context;

  // Check if all leviathans are contained
  const allContained = state.leviathans.every(
    (l: { status: string }) => l.status === "CONTAINED"
  );
  if (allContained && state.metadata.state === "ACTIVE") {
    state.metadata.state = "ENDED";
    state.metadata.outcome = "COMMANDER_VICTORY";
    state.addSignal("COMMANDER VICTORY - ALL THREATS CONTAINED", "nominal", "SYSTEM");
    return;
  }

  // Check if city base is destroyed
  if (state.cityBase.hp <= 0 && state.metadata.state === "ACTIVE") {
    state.metadata.state = "ENDED";
    state.metadata.outcome = "KAIJU_VICTORY";
    state.addSignal("KAIJU VICTORY - CITY BASE DESTROYED", "critical", "SYSTEM");
    return;
  }

  // Check time limit (if configured)
  if (state.metadata.roundTimerMs > 0) {
    const elapsed = context.now - state.metadata.startedAt;
    if (elapsed >= state.metadata.roundTimerMs && state.metadata.state === "ACTIVE") {
      state.metadata.state = "ENDED";
      state.metadata.outcome = "TIME_LIMIT";
      state.addSignal("TIME LIMIT REACHED - COMMANDER VICTORY", "nominal", "SYSTEM");
    }
  }
}

/**
 * Helper: Calculate Euclidean distance
 */
function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate tick timing - ensure server maintains consistent 5 Hz tick rate
 */
export function validateTickTiming(
  actualDeltaMs: number,
  expectedTickMs: number = GAME_CONSTANTS.TICK_MS
): { isValid: boolean; drift: number; driftPercent: number } {
  const drift = actualDeltaMs - expectedTickMs;
  const driftPercent = (drift / expectedTickMs) * 100;

  // Allow ±20ms drift (±10% tolerance)
  const isValid = Math.abs(drift) <= 20;

  return {
    isValid,
    drift,
    driftPercent,
  };
}

/**
 * Combo detection helper
 * Tracks simultaneous hits on the same target within the combo window
 */
export interface ComboDetectionContext {
  targetId: string;
  hitsInWindow: number;
  firstHitTime: number;
  lastHitTime: number;
  totalDamage: number;
  multiplier: number;
}

export function detectCombo(
  now: number,
  comboWindows: Map<string, ComboDetectionContext>,
  targetId: string,
  damage: number
): ComboDetectionContext | null {
  const existing = comboWindows.get(targetId);

  if (!existing || now - existing.lastHitTime > GAME_CONSTANTS.COMBO_WINDOW_MS) {
    // New combo window
    const newCombo: ComboDetectionContext = {
      targetId,
      hitsInWindow: 1,
      firstHitTime: now,
      lastHitTime: now,
      totalDamage: damage,
      multiplier: 1.0,
    };
    comboWindows.set(targetId, newCombo);
    return null; // Not a combo yet
  }

  // Add to existing combo window
  existing.hitsInWindow++;
  existing.lastHitTime = now;
  existing.totalDamage += damage;
  existing.multiplier =
    GAME_CONSTANTS.COMBO_MULTIPLIER_BASE +
    GAME_CONSTANTS.COMBO_MULTIPLIER_PER_HIT * (existing.hitsInWindow - 1);

  return existing.hitsInWindow > 1 ? existing : null;
}
