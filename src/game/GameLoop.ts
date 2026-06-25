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
import { observeHistogram } from "../ops/metrics";

export interface GameLoopContext {
  state: MatchSchema;
  deltaMs: number; // Milliseconds since last tick
  tickCount: number;
  now: number;
}

/**
 * Main tick function - orchestrates all per-frame updates
 * Called at 20 Hz (every 50ms)
 */
export function executeTick(context: GameLoopContext): void {
  const tickStart = Date.now();

  // Order matters: positions → attacks → damage → effects → cleanup

  updateLeviathanPositions(context);
  processAttacks(context);
  resolveCommanderDispatches(context);
  processKaijuAbilities(context);
  updateStatusEffects(context);
  checkWinConditions(context);

  observeHistogram("kaiju_tick_duration_ms", Date.now() - tickStart);
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
    const distance =
      GAME_CONSTANTS.BASE_MOVE_SPEED_UNITS_PER_MS * leviathan.speed * deltaMs;

    const movementMagnitude = Math.hypot(leviathan.moveX, leviathan.moveY);
    if (movementMagnitude <= 0.0001) {
      continue;
    }

    // Treat move vector as desired input and rotate toward it at a capped rate.
    const desiredHeading = normalizeHeading(
      ((Math.atan2(leviathan.moveY, leviathan.moveX) * 180) / Math.PI + 360) % 360
    );
    const currentHeading = normalizeHeading(leviathan.heading);
    const turnRateDegreesPerSecond =
      GAME_CONSTANTS.TURN_RATE_DEGREES_PER_SECOND[
        leviathan.archetype as keyof typeof GAME_CONSTANTS.TURN_RATE_DEGREES_PER_SECOND
      ] ?? GAME_CONSTANTS.TURN_RATE_DEGREES_PER_SECOND.DEFAULT;
    const turnLimitThisTick = turnRateDegreesPerSecond * (deltaMs / 1000);
    const headingDelta = shortestHeadingDelta(currentHeading, desiredHeading);
    const appliedDelta = clamp(headingDelta, -turnLimitThisTick, turnLimitThisTick);

    leviathan.heading = normalizeHeading(currentHeading + appliedDelta);

    const headingRadians = (leviathan.heading * Math.PI) / 180;
    const throttle = Math.min(1, movementMagnitude);
    const unitX = Math.cos(headingRadians);
    const unitY = Math.sin(headingRadians);

    leviathan.x += unitX * distance * throttle;
    leviathan.y += unitY * distance * throttle;

    // Clamp to map bounds (0-100)
    leviathan.x = Math.max(0, Math.min(100, leviathan.x));
    leviathan.y = Math.max(0, Math.min(100, leviathan.y));
  }
}

function normalizeHeading(heading: number): number {
  return ((heading % 360) + 360) % 360;
}

function shortestHeadingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function processKaijuAbilities(context: GameLoopContext): void {
  const { state, now } = context;

  for (const leviathan of state.leviathans) {
    if (!leviathan.pendingAbilityId) {
      continue;
    }

    const abilityId = leviathan.pendingAbilityId;
    leviathan.pendingAbilityId = "";
    leviathan.pendingAbilityRequestedAt = 0;

    if (leviathan.status === "CONTAINED") {
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "REJECTED",
        `ABILITY REJECTED - ${leviathan.name} CONTAINED`,
        now
      );
      continue;
    }

    if (now < leviathan.abilityCooldownEndsAt) {
      const cooldownMs = Math.max(0, leviathan.abilityCooldownEndsAt - now);
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "REJECTED",
        `ABILITY REJECTED - ${Math.ceil(cooldownMs / 1000)}s COOLDOWN`,
        now
      );
      continue;
    }

    if (leviathan.archetype === "Sniper" && abilityId === "submerge") {
      leviathan.status = "SUBMERGED";
      leviathan.statusEndTime = now + GAME_CONSTANTS.SUBMERGED_DURATION_MS;
      leviathan.abilityCooldownEndsAt = now + GAME_CONSTANTS.ABILITY_COOLDOWNS_MS.submerge;
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "APPLIED",
        `ABILITY APPLIED - ${leviathan.name} SUBMERGED`,
        now
      );
      continue;
    }

    if (leviathan.archetype === "Dozer" && abilityId === "roar") {
      for (const target of state.leviathans) {
        if (target.id === leviathan.id || target.status === "CONTAINED") {
          continue;
        }

        const distance = calculateDistance(leviathan.x, leviathan.y, target.x, target.y);
        if (distance <= 0 || distance > GAME_CONSTANTS.ROAR_RADIUS_UNITS) {
          continue;
        }

        const dx = target.x - leviathan.x;
        const dy = target.y - leviathan.y;
        const inv = 1 / distance;
        target.x = Math.max(0, Math.min(100, target.x + dx * inv * GAME_CONSTANTS.ROAR_PUSH_UNITS));
        target.y = Math.max(0, Math.min(100, target.y + dy * inv * GAME_CONSTANTS.ROAR_PUSH_UNITS));
      }

      leviathan.abilityCooldownEndsAt = now + GAME_CONSTANTS.ABILITY_COOLDOWNS_MS.roar;
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "APPLIED",
        `ABILITY APPLIED - ${leviathan.name} ROAR SHOCKWAVE`,
        now
      );
      continue;
    }

    if (leviathan.archetype === "Berserker" && abilityId === "frenzy") {
      leviathan.status = "FRENZIED";
      leviathan.statusEndTime = now + GAME_CONSTANTS.FRENZY_DURATION_MS;
      leviathan.speed = 1.6;
      leviathan.abilityCooldownEndsAt = now + GAME_CONSTANTS.ABILITY_COOLDOWNS_MS.frenzy;
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "APPLIED",
        `ABILITY APPLIED - ${leviathan.name} FRENZY ENGAGED`,
        now
      );
      continue;
    }

    if (leviathan.archetype === "Tank" && abilityId === "fortress") {
      leviathan.status = "FORTIFIED";
      leviathan.statusEndTime = now + GAME_CONSTANTS.FORTRESS_DURATION_MS;
      leviathan.abilityCooldownEndsAt = now + GAME_CONSTANTS.ABILITY_COOLDOWNS_MS.fortress;
      state.addKaijuAbilityResult(
        leviathan.id,
        abilityId,
        "APPLIED",
        `ABILITY APPLIED - ${leviathan.name} FORTRESS PLATING`,
        now
      );
      continue;
    }

    state.addKaijuAbilityResult(
      leviathan.id,
      abilityId,
      "UNVERIFIED",
      `ABILITY UNVERIFIED - ${leviathan.name} ${abilityId}`,
      now
    );
  }
}

/**
 * Update and expire status effects
 */
function updateStatusEffects(context: GameLoopContext): void {
  const { state, now } = context;

  for (const leviathan of state.leviathans) {
    if (
      leviathan.status !== "ACTIVE" &&
      leviathan.status !== "CONTAINED" &&
      now >= leviathan.statusEndTime
    ) {
      // Status effect expired
      leviathan.status = "ACTIVE";
      leviathan.speed = 1;
      leviathan.statusEndTime = 0;
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
  _now: number,
  dispatchId: string
): void {
  const target = state.getLeviathan(targetId);
  if (!target || target.status === "CONTAINED") {
    return;
  }

  const submergedAdjusted =
    target.status === "SUBMERGED"
      ? Math.max(0, Math.round(damage * GAME_CONSTANTS.SUBMERGED_DAMAGE_ADJUSTMENT))
      : damage;
  const effectiveDamage =
    target.status === "FORTIFIED"
      ? Math.max(0, Math.round(submergedAdjusted * 0.6))
      : submergedAdjusted;

  target.hp = Math.max(0, target.hp - effectiveDamage);
  target.damageReceived += effectiveDamage;

  if (target.hp <= 0) {
    target.status = "CONTAINED";
    target.containedAt = _now;
    // CONTAINED is a permanent terminal state; use MAX_SAFE_INTEGER so
    // statusEndTime never looks "expired" even if the guard is removed.
    target.statusEndTime = Number.MAX_SAFE_INTEGER;
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
