---
title: "Emergency Feature Flags"
description: "Runtime kill switches for Commander dispatch and tick broadcast, changeable without a redeploy."
ms.date: 2026-06-25
ms.topic: reference
---

## Overview

Kaiju Arcade exposes two emergency feature flags that can disable high-frequency server behavior at runtime without a code deployment. Both flags are environment variables read at startup and exposed as properties on the singleton `config` object in `src/ops/config.ts`.

Setting a flag to `false` is a non-destructive, reversible operation. Restore the default value and restart the process to re-enable the feature.

---

## Flags

### FEATURE_DISPATCH_ENABLED

| Property      | Value                                                        |
|---------------|--------------------------------------------------------------|
| Variable      | `FEATURE_DISPATCH_ENABLED`                                   |
| Type          | Boolean (`true` \| `false`)                                  |
| Default       | `true`                                                       |
| Safe value    | `false` (disables dispatch without crashing the match)       |
| Consumed in   | `src/game/MatchRoom.ts` — `handleClientMessage` dispatch case |

**Effect when `false`:** Any `commander.dispatch` message from the Commander client is intercepted before the dispatch handler runs. The client immediately receives a `commander.dispatch.result` message with `{ "error": "dispatch temporarily disabled" }`. No game-state mutation occurs; existing cooldown timers and asset counts are unaffected.

**Use when:** A bug in Commander dispatch is causing state corruption or crashes mid-match and you need to stop new dispatches while the fix is staged.

---

### FEATURE_TICK_BROADCAST_ENABLED

| Property      | Value                                                             |
|---------------|-------------------------------------------------------------------|
| Variable      | `FEATURE_TICK_BROADCAST_ENABLED`                                  |
| Type          | Boolean (`true` \| `false`)                                       |
| Default       | `true`                                                            |
| Safe value    | `false` (freezes world state; clients stop receiving tick updates) |
| Consumed in   | `src/game/MatchRoom.ts` — `tick()` method                         |

**Effect when `false`:** The 20 Hz tick interval still fires to keep timing accurate, but the tick body is skipped entirely. No call to `executeTick` is made, no Colyseus state patches are emitted, and no broadcast messages (signals, commander status, dispatch results) are sent during the tick cycle. Active matches freeze in place; players retain their WebSocket connections.

**Use when:** A runaway game-loop calculation is consuming excessive CPU or memory. Disabling the tick lets you diagnose the issue while keeping connections alive for a faster recovery.

---

## Changing a Flag Without a Redeploy

Both flags require a process restart to take effect because they are read once at startup by `loadConfig()`. The fastest zero-downtime change path depends on your runtime:

### Container / Kubernetes

1. Update the environment variable in the Deployment manifest or ConfigMap.
2. Trigger a rolling restart: `kubectl rollout restart deployment/kaiju-arcade`.
3. Confirm with `kubectl rollout status deployment/kaiju-arcade`.

### Process manager (PM2 / systemd)

1. Export the updated variable in the environment file (`.env` for PM2 or the systemd `EnvironmentFile`).
2. Reload the process: `pm2 reload kaiju-arcade` or `systemctl restart kaiju-arcade`.

### Validation

After restart, verify the flag is active by checking startup logs. The server logs the loaded config values at `LOG_LEVEL=debug`. You can also inspect the `/health` endpoint — it returns a 200 when the process is up and accepting connections.

---

## Default Behavior Summary

| Flag                           | Default | Behavior at default              |
|--------------------------------|---------|----------------------------------|
| `FEATURE_DISPATCH_ENABLED`     | `true`  | Commander dispatch runs normally |
| `FEATURE_TICK_BROADCAST_ENABLED` | `true` | 20 Hz game loop runs normally   |
