---
title: "Runbook Index"
description: "Alert-to-runbook mapping for kaiju-arcade production alerts."
ms.date: 2026-06-25
ms.topic: reference
---

## Alert-to-Runbook Mapping

| Alert Name | Severity | Runbook | Owner |
|---|---|---|---|
| `HighJoinFailureRate` | critical | [join-failure.md](join-failure.md) | Dev On-Call |
| `HighDisconnectRate` | warning | [reconnect-storm.md](reconnect-storm.md) | Dev On-Call |
| `TickLagDrift` | warning | [tick-lag-drift.md](tick-lag-drift.md) | Ops Lead |
| `MatchStartDeadlock` | warning | [match-start-deadlock.md](match-start-deadlock.md) | Dev On-Call |
| `SLOABurnRateCritical` | critical | [join-failure.md](join-failure.md) | Incident Commander |
| `SLOBBurnRateCritical` | critical | [tick-lag-drift.md](tick-lag-drift.md) | Incident Commander |

## Available Runbooks

- [join-failure.md](join-failure.md) — Diagnosing and resolving elevated join failure rates
- [reconnect-storm.md](reconnect-storm.md) — Diagnosing and resolving reconnect failure storms
- [tick-lag-drift.md](tick-lag-drift.md) — Diagnosing and resolving game loop tick duration overruns
- [match-start-deadlock.md](match-start-deadlock.md) — Diagnosing and resolving match rooms stuck in waiting state

## Metrics Reference

All metrics are exposed at `GET /metrics` when `METRICS_ENABLED=true`.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `kaiju_join_total` | counter | `outcome`, `role` | Total player join attempts |
| `kaiju_disconnect_total` | counter | `code` | Total player disconnections |
| `kaiju_reconnect_total` | counter | `outcome` | Total reconnect attempts |
| `kaiju_active_rooms` | gauge | — | Currently active match rooms |
| `kaiju_active_players` | gauge | — | Currently connected players |
| `kaiju_tick_duration_ms` | histogram | — | Game loop tick execution duration |
| `kaiju_join_latency_ms` | histogram | `outcome` | Join request processing latency |
