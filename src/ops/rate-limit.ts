/**
 * Rate Limiting Middleware
 *
 * In-memory token bucket rate limiter. No external npm packages.
 * Each key (typically client IP) gets its own bucket. Tokens refill
 * continuously at rpm/60 tokens per second. When a bucket is exhausted
 * the handler returns 429 with a retryAfterSeconds estimate.
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { config } from "./config";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Creates an Express RequestHandler that enforces a per-key token bucket
 * rate limit.
 *
 * @param rpm    - Maximum requests per minute allowed per key.
 * @param keyFn  - Extracts the rate-limit key from the incoming request.
 */
export function createRateLimiter(
  rpm: number,
  keyFn: (req: Request) => string
): RequestHandler {
  const buckets: Map<string, Bucket> = new Map();
  const refillRate = rpm / 60; // tokens per second

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const key = keyFn(req);
    const now = Date.now();

    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { tokens: rpm, lastRefill: now };
      buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time since last request.
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const refilled = elapsedSeconds * refillRate;
    bucket.tokens = Math.min(rpm, bucket.tokens + refilled);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / refillRate);
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds,
      });
      return;
    }

    bucket.tokens -= 1;
    next();
  };
}

export const joinRateLimiter: RequestHandler = createRateLimiter(
  config.RATE_LIMIT_JOIN_RPM,
  (req: Request) => req.ip ?? "unknown"
);

export const createMatchRateLimiter: RequestHandler = createRateLimiter(
  config.RATE_LIMIT_CREATE_RPM,
  (req: Request) => req.ip ?? "unknown"
);
