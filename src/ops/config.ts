/**
 * Runtime Configuration
 *
 * Typed startup configuration schema with fail-fast validation.
 * Reads all configuration from environment variables, applies typed defaults,
 * and exits with code 1 in production when required variables are missing.
 *
 * Import `config` anywhere in the server; do not read `process.env` directly
 * outside this module.
 */

export interface ServerConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: "development" | "staging" | "production";
  DRAIN_TIMEOUT_MS: number;
  RECONNECT_GRACE_MS: number;
  METRICS_ENABLED: boolean;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  RATE_LIMIT_JOIN_RPM: number;
  RATE_LIMIT_CREATE_RPM: number;
  RELEASE_STAGE: "canary" | "stable";
  FEATURE_DISPATCH_ENABLED: boolean;
  FEATURE_TICK_BROADCAST_ENABLED: boolean;
}

const VALID_NODE_ENVS = ["development", "staging", "production"] as const;
const VALID_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
const VALID_RELEASE_STAGES = ["canary", "stable"] as const;

function parsePositiveInt(raw: string, name: string): number {
  const value = parseInt(raw, 10);
  if (isNaN(value) || value <= 0) {
    throw new Error(
      `Invalid ${name}: "${raw}". Must be a positive integer.`
    );
  }
  return value;
}

function parseNonNegativeInt(raw: string, name: string): number {
  const value = parseInt(raw, 10);
  if (isNaN(value) || value < 0) {
    throw new Error(
      `Invalid ${name}: "${raw}". Must be a non-negative integer.`
    );
  }
  return value;
}

function parseBoundedInt(raw: string, name: string, min: number, max: number): number {
  const value = parseInt(raw, 10);
  if (isNaN(value) || value < min || value > max) {
    throw new Error(
      `Invalid ${name}: "${raw}". Must be an integer between ${min} and ${max}.`
    );
  }
  return value;
}

export function loadConfig(): ServerConfig {
  const env = process.env;

  // --- NODE_ENV ---
  const rawNodeEnv = env.NODE_ENV ?? "development";
  // Jest sets NODE_ENV to "test"; treat it as "development" for configuration purposes.
  const normalizedNodeEnv = rawNodeEnv === "test" ? "development" : rawNodeEnv;
  if (!(VALID_NODE_ENVS as readonly string[]).includes(normalizedNodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: "${rawNodeEnv}". Must be one of: ${VALID_NODE_ENVS.join(", ")}.`
    );
  }
  const nodeEnv = normalizedNodeEnv as "development" | "staging" | "production";
  const isProduction = nodeEnv === "production";

  // --- Production-required fields: no defaults allowed ---
  if (isProduction) {
    if (!env.PORT) {
      console.error(
        "[config] FATAL: PORT must be explicitly set when NODE_ENV=production. " +
          "Set PORT to the container's exposed port (e.g. 8080)."
      );
      process.exit(1);
    }
    if (!env.HOST) {
      console.error(
        "[config] FATAL: HOST must be explicitly set when NODE_ENV=production. " +
          "Set HOST=0.0.0.0 so health probes can reach the process."
      );
      process.exit(1);
    }
  }

  // --- PORT ---
  const rawPort = env.PORT ?? "3000";
  const port = parseBoundedInt(rawPort, "PORT", 1, 65535);

  // --- HOST ---
  const host = env.HOST ?? "localhost";

  // --- DRAIN_TIMEOUT_MS ---
  const drainTimeoutMs = parseNonNegativeInt(
    env.DRAIN_TIMEOUT_MS ?? "30000",
    "DRAIN_TIMEOUT_MS"
  );

  // --- RECONNECT_GRACE_MS ---
  const reconnectGraceMs = parseNonNegativeInt(
    env.RECONNECT_GRACE_MS ?? "30000",
    "RECONNECT_GRACE_MS"
  );

  // --- METRICS_ENABLED ---
  const metricsEnabled = (env.METRICS_ENABLED ?? "false") === "true";

  // --- LOG_LEVEL ---
  const rawLogLevel = env.LOG_LEVEL ?? "info";
  if (!(VALID_LOG_LEVELS as readonly string[]).includes(rawLogLevel)) {
    throw new Error(
      `Invalid LOG_LEVEL: "${rawLogLevel}". Must be one of: ${VALID_LOG_LEVELS.join(", ")}.`
    );
  }
  const logLevel = rawLogLevel as "debug" | "info" | "warn" | "error";

  // --- RATE_LIMIT_JOIN_RPM ---
  const rateLimitJoinRpm = parsePositiveInt(
    env.RATE_LIMIT_JOIN_RPM ?? "60",
    "RATE_LIMIT_JOIN_RPM"
  );

  // --- RATE_LIMIT_CREATE_RPM ---
  const rateLimitCreateRpm = parsePositiveInt(
    env.RATE_LIMIT_CREATE_RPM ?? "10",
    "RATE_LIMIT_CREATE_RPM"
  );

  // --- RELEASE_STAGE ---
  const rawReleaseStage = env.RELEASE_STAGE ?? "stable";
  if (!(VALID_RELEASE_STAGES as readonly string[]).includes(rawReleaseStage)) {
    console.warn(
      `[config] Unrecognized RELEASE_STAGE: "${rawReleaseStage}". ` +
        `Defaulting to "stable". Valid values: ${VALID_RELEASE_STAGES.join(", ")}.`
    );
  }
  const releaseStage = (VALID_RELEASE_STAGES as readonly string[]).includes(rawReleaseStage)
    ? (rawReleaseStage as "canary" | "stable")
    : "stable";

  // --- FEATURE_DISPATCH_ENABLED ---
  const featureDispatchEnabled = (env.FEATURE_DISPATCH_ENABLED ?? "true") === "true";

  // --- FEATURE_TICK_BROADCAST_ENABLED ---
  const featureTickBroadcastEnabled = (env.FEATURE_TICK_BROADCAST_ENABLED ?? "true") === "true";

  return {
    PORT: port,
    HOST: host,
    NODE_ENV: nodeEnv,
    DRAIN_TIMEOUT_MS: drainTimeoutMs,
    RECONNECT_GRACE_MS: reconnectGraceMs,
    METRICS_ENABLED: metricsEnabled,
    LOG_LEVEL: logLevel,
    RATE_LIMIT_JOIN_RPM: rateLimitJoinRpm,
    RATE_LIMIT_CREATE_RPM: rateLimitCreateRpm,
    RELEASE_STAGE: releaseStage,
    FEATURE_DISPATCH_ENABLED: featureDispatchEnabled,
    FEATURE_TICK_BROADCAST_ENABLED: featureTickBroadcastEnabled,
  };
}

/**
 * Singleton config loaded at module initialization.
 * The process exits with code 1 in production if any required variable is absent.
 */
export const config: ServerConfig = loadConfig();
