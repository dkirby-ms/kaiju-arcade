/**
 * Runtime State
 *
 * Manages process-level liveness and readiness state.
 * Liveness: is the process able to serve at all?
 * Readiness: should new traffic be routed here?
 *
 * Intentionally does not import config to avoid circular dependencies.
 */

let _ready = true;
let _draining = false;
let _drainDeadline = 0;

/**
 * Always returns true — the process is alive if it can serve this call.
 * Liveness is only false when the process itself has crashed.
 */
export function isLive(): boolean {
  return true;
}

/** Returns true until drain is started. */
export function isReady(): boolean {
  return _ready;
}

/** Returns true once startDrain has been called. */
export function isDraining(): boolean {
  return _draining;
}

/**
 * Enters drain mode: stops accepting new work and records a deadline.
 * @param timeoutMs Milliseconds until the drain deadline.
 */
export function startDrain(timeoutMs: number): void {
  _ready = false;
  _draining = true;
  _drainDeadline = Date.now() + timeoutMs;
}

/** Returns the drain deadline timestamp (epoch ms). Zero if not draining. */
export function getDrainDeadline(): number {
  return _drainDeadline;
}

/**
 * Resets all drain state to initial values.
 * Intended for use in tests only.
 */
export function resetDrainState(): void {
  _ready = true;
  _draining = false;
  _drainDeadline = 0;
}
