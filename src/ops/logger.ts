/**
 * Structured JSON Logger
 *
 * Emits JSON lines to stdout for each log call.
 * Respects config.LOG_LEVEL — calls below the configured level are dropped.
 *
 * Safe fields only: roomId, processId, phase, duration, code (numeric), count, role.
 * NEVER include: reconnect tokens, session IDs, playerName, or any client-supplied string.
 */

import { Request, Response, NextFunction } from "express";
import { config } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

export type SafeFields = Record<string, string | number | boolean | undefined>;

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function emit(level: LogLevel, msg: string, fields?: SafeFields): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[config.LOG_LEVEL]) {
    return;
  }

  const line: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };

  process.stdout.write(JSON.stringify(line) + "\n");
}

export const logger = {
  info(msg: string, fields?: SafeFields): void {
    emit("info", msg, fields);
  },

  warn(msg: string, fields?: SafeFields): void {
    emit("warn", msg, fields);
  },

  error(msg: string, fields?: SafeFields): void {
    emit("error", msg, fields);
  },

  debug(msg: string, fields?: SafeFields): void {
    emit("debug", msg, fields);
  },
};

/**
 * Express middleware: logs method, path, status code, and duration in ms.
 * Does NOT log query strings or request bodies to avoid leaking join options/tokens.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("http.request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
}
