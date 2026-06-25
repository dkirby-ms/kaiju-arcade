---
title: "Production Configuration Reference"
description: "Required environment variables for the kaiju-arcade server, including owners, defaults, and fallback policy."
ms.date: 2026-06-25
ms.topic: reference
---

## Overview

All runtime configuration for the kaiju-arcade server is supplied through environment variables following the [Twelve-Factor](https://12factor.net/config) config principle. No deployment-varying value may be hard-coded in source. Every variable listed here is validated at startup; the process exits with a non-zero code when a required variable is missing or malformed (implemented in Phase 3).

The variables are grouped by concern. Within each group, entries appear in priority order (most critical first).

---

## Server Identity and Binding

| Variable   | Required | Default     | Owner   | Notes                                                            |
|------------|----------|-------------|---------|------------------------------------------------------------------|
| `PORT`     | No       | `3000`      | Ops     | Read in `src/index.ts` (`process.env.PORT`). Integer; validated at startup in Phase 3. |
| `HOST`     | No       | `localhost` | Ops     | Read in `src/index.ts` (`process.env.HOST`). Set to `0.0.0.0` in production containers. |
| `NODE_ENV` | No       | `development` | Ops   | Read implicitly by Express and Colyseus. Set to `production` in all non-local environments. |

### Fallback policy

If `PORT` or `HOST` are absent the server binds to `localhost:3000`. This is intentionally permissive to keep local development zero-config. In production the absence of an explicit `HOST=0.0.0.0` is a deployment error; health probes will fail to reach the process.

---

## Lifecycle and Session Control

| Variable               | Required | Default | Owner | Notes                                                                     |
|------------------------|----------|---------|-------|---------------------------------------------------------------------------|
| `DRAIN_TIMEOUT_MS`     | No       | `15000` | Ops   | Milliseconds to allow in-flight Colyseus sessions to finish during graceful SIGTERM. Implemented in Phase 1. |
| `RECONNECT_GRACE_MS`   | No       | `30000` | Dev   | Reconnection grace window forwarded to `allowReconnection()` in `src/game/MatchRoom.ts`. |

### Fallback policy

If either value is absent the hard-coded constant in the respective file takes effect. A missing `DRAIN_TIMEOUT_MS` is logged as a warning; the server will use the default and continue. A missing `RECONNECT_GRACE_MS` silently falls back to the in-code default of 30,000 ms.

---

## Observability

| Variable          | Required | Default | Owner | Notes                                                          |
|-------------------|----------|---------|-------|----------------------------------------------------------------|
| `METRICS_ENABLED` | No       | `false` | Ops   | Enables Prometheus-compatible `/metrics` endpoint (Phase 4). Accepted values: `true`, `false`. |
| `LOG_LEVEL`       | No       | `info`  | Ops   | Controls structured log verbosity. Accepted values: `debug`, `info`, `warn`, `error`. |

### Fallback policy

If `METRICS_ENABLED` is absent metrics are silently disabled. If `LOG_LEVEL` is absent the server defaults to `info`. An unrecognized `LOG_LEVEL` value is treated as `info` and a warning is emitted.

---

## Rate Limiting

| Variable                 | Required | Default | Owner | Notes                                              |
|--------------------------|----------|---------|-------|----------------------------------------------------|
| `RATE_LIMIT_JOIN_RPM`    | No       | `60`    | Ops   | Maximum join requests per minute per IP (Phase 5). |
| `RATE_LIMIT_CREATE_RPM`  | No       | `20`    | Ops   | Maximum match-create requests per minute per IP (Phase 5). |

### Fallback policy

If absent the defaults above apply. Values must be positive integers; a non-integer value causes a startup validation error in Phase 3.

---

## Release and Feature Control

| Variable                         | Required | Default | Owner | Notes                                                               |
|----------------------------------|----------|---------|-------|---------------------------------------------------------------------|
| `RELEASE_STAGE`                  | No       | `stable` | Ops  | Active rollout stage. Values: `canary`, `stable`, `rollback`. Consumed by the progressive delivery guard in Phase 2. |
| `FEATURE_DISPATCH_ENABLED`       | No       | `true`  | Dev   | Kill switch for Commander dispatch routing in `src/game/MatchRoom.ts`. Accepted values: `true`, `false`. |
| `FEATURE_TICK_BROADCAST_ENABLED` | No       | `true`  | Dev   | Kill switch for the 20 Hz game-loop tick broadcast in `src/game/GameLoop.ts`. Accepted values: `true`, `false`. |

### Fallback policy

Feature flags default to their current behavior (`true`) when absent so that rollouts do not change runtime behavior by default. `RELEASE_STAGE` defaults to `stable`; missing or unrecognized values log a warning and fall back to `stable`.

---

## Environment Matrix

The table below shows the recommended value for each variable across the three deployment targets. Values marked **required** have no default and must be set explicitly; omitting them causes a startup failure when `NODE_ENV=production`.

| Variable                         | Local (development)    | Staging                 | Production              |
|----------------------------------|------------------------|-------------------------|-------------------------|
| `PORT`                           | *(omit — default 3000)*| `8080`                  | `8080` **required**     |
| `HOST`                           | *(omit — default localhost)* | `0.0.0.0`         | `0.0.0.0` **required**  |
| `NODE_ENV`                       | `development`          | `staging`               | `production`            |
| `DRAIN_TIMEOUT_MS`               | *(omit — default 30000)*| `30000`                | `30000`                 |
| `RECONNECT_GRACE_MS`             | *(omit — default 30000)*| `30000`                | `30000`                 |
| `METRICS_ENABLED`                | `false`                | `true`                  | `true`                  |
| `LOG_LEVEL`                      | `debug`                | `info`                  | `warn`                  |
| `RATE_LIMIT_JOIN_RPM`            | *(omit — default 60)*  | `60`                    | `60`                    |
| `RATE_LIMIT_CREATE_RPM`          | *(omit — default 10)*  | `10`                    | `10`                    |
| `RELEASE_STAGE`                  | `stable`               | `canary`                | `stable`                |
| `FEATURE_DISPATCH_ENABLED`       | `true`                 | `true`                  | `true`                  |
| `FEATURE_TICK_BROADCAST_ENABLED` | `true`                 | `true`                  | `true`                  |

---

## Where Variables Are Consumed

The table below maps each variable to the file where it is currently read or where it will be read after each phase lands. Lines marked "Phase N" indicate code does not yet exist.

| Variable                         | File                           | Current status        |
|----------------------------------|--------------------------------|-----------------------|
| `PORT`                           | `src/index.ts` line ~26        | Live                  |
| `HOST`                           | `src/index.ts` line ~27        | Live                  |
| `NODE_ENV`                       | Express internals              | Live (implicit)       |
| `DRAIN_TIMEOUT_MS`               | `src/index.ts`                 | Phase 1               |
| `RECONNECT_GRACE_MS`             | `src/game/MatchRoom.ts`        | Phase 3               |
| `METRICS_ENABLED`                | `src/index.ts`                 | Phase 4               |
| `LOG_LEVEL`                      | `src/index.ts`                 | Phase 3               |
| `RATE_LIMIT_JOIN_RPM`            | `src/index.ts`                 | Phase 5               |
| `RATE_LIMIT_CREATE_RPM`          | `src/index.ts`                 | Phase 5               |
| `RELEASE_STAGE`                  | `src/index.ts`                 | Phase 2               |
| `FEATURE_DISPATCH_ENABLED`       | `src/game/MatchRoom.ts`        | Phase 3               |
| `FEATURE_TICK_BROADCAST_ENABLED` | `src/game/GameLoop.ts`         | Phase 3               |

---

## Sample `.env` (non-production)

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
DRAIN_TIMEOUT_MS=15000
RECONNECT_GRACE_MS=30000
METRICS_ENABLED=false
LOG_LEVEL=debug
RATE_LIMIT_JOIN_RPM=60
RATE_LIMIT_CREATE_RPM=20
RELEASE_STAGE=stable
FEATURE_DISPATCH_ENABLED=true
FEATURE_TICK_BROADCAST_ENABLED=true
```

> Never commit `.env` files containing real credentials or production configuration to source control.
