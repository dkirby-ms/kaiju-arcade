---
title: "Graceful Drain Procedure"
description: "Operator steps to gracefully drain a Kaiju Arcade node before shutdown or replacement."
---

## Overview

Draining removes a node from the active rotation without abruptly closing in-flight WebSocket sessions.
The drain lifecycle is: **running → draining → closed**.

During drain, the server:

- Returns `503` on `GET /health/ready` so load balancers stop routing new HTTP requests here.
- Rejects new `POST /api/matches` and seat-reservation requests with `503`.
- Rejects new WebSocket joins via Colyseus with close code `1013` (Try Again Later).
- Allows existing WebSocket sessions and reconnects with a valid token to continue uninterrupted.
- Closes the HTTP listener and exits cleanly after `DRAIN_TIMEOUT_MS`.

## Liveness vs Readiness

| Probe | Endpoint | Returns | Meaning |
|---|---|---|---|
| Liveness | `GET /health/live` | `200 { status: "ok" }` always | Process is up |
| Readiness | `GET /health/ready` | `200 { status: "ok" }` / `503 { status: "draining" }` | Safe to route traffic |
| Legacy | `GET /health` | `200 { status: "ok", version: … }` | Backwards-compatible |

Configure your load balancer or Kubernetes `readinessProbe` to use `/health/ready`.
Use `/health/live` for the `livenessProbe`.

## Manual Drain Steps

Follow these steps when replacing a node (e.g., during a rolling deploy or canary rollback).

### Step 1 — Remove node from rotation

Remove the node from the load balancer target group or set the Kubernetes pod to `NotReady` by
sending it `SIGTERM`. The process handles `SIGTERM` internally; do not skip to step 2.

```bash
# Kubernetes rolling update (preferred — triggers SIGTERM automatically)
kubectl rollout restart deployment/kaiju-arcade

# Manual SIGTERM to a specific process
kill -TERM <pid>
```

### Step 2 — Monitor readiness probe

Poll the readiness endpoint until it returns `503`:

```bash
watch -n1 'curl -s http://localhost:3000/health/ready'
# Expected: {"status":"draining"} with HTTP 503
```

### Step 3 — Wait for drain timeout

The server closes after `DRAIN_TIMEOUT_MS` (default `30000` ms, configurable via environment variable).
Active matches continue for the duration; reconnects with valid tokens are accepted throughout.

### Step 4 — Verify clean shutdown

Confirm the process exited with code `0`:

```bash
journalctl -u kaiju-arcade --since "1 minute ago" | tail -5
# Expected last lines: "Server closed"
```

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `DRAIN_TIMEOUT_MS` | `30000` | Milliseconds between SIGTERM and forced close |
| `RECONNECT_GRACE_MS` | `30000` | Milliseconds a reconnect token stays valid after disconnect |

## Kubernetes Example

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 1

livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

lifecycle:
  preStop:
    exec:
      command: ["sleep", "5"]

terminationGracePeriodSeconds: 45
```

The `terminationGracePeriodSeconds` must exceed `DRAIN_TIMEOUT_MS` + `preStop` sleep to allow clean exit.

## Emergency Force-Kill

If the node does not exit within `terminationGracePeriodSeconds`, Kubernetes sends `SIGKILL`.
Players on that node will see a WebSocket disconnect and must reconnect.
Clients with valid reconnect tokens can resume their session on another node within `RECONNECT_GRACE_MS`.
