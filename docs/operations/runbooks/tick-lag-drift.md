---
title: "Runbook: Tick Lag Drift"
description: "Diagnosis and mitigation steps for game loop tick latency exceeding the 80ms p95 threshold."
ms.date: 2026-06-25
ms.topic: runbook
---

## Summary

The game loop runs a fixed-interval tick that drives simulation state for all active match rooms. When tick duration p95 exceeds 80 ms, the simulation falls behind real time, causing game state to desync from client expectations. Prolonged drift results in dropped events and degraded gameplay.

---

## Trigger

| Signal                        | Threshold / Pattern                                                   |
|-------------------------------|-----------------------------------------------------------------------|
| `TickLagDrift` alert          | `kaiju_tick_duration_ms` p95 > 80 ms sustained for 3 minutes         |
| Log warning                   | `GameLoop tick drift warning` in server logs                          |

---

## Initial Diagnosis

1. **Check CPU load.**

   Review host CPU utilization. A tick that shares CPU with many concurrent rooms or with high-frequency broadcast operations will exceed its budget. CPU above 80% sustained is a strong indicator.

2. **Check active room count.**

   ```
   GET /api/matches
   ```

   High room count multiplies tick processing overhead. Note the current `total` field.

3. **Check the tick duration histogram via /metrics.**

   ```
   GET /metrics
   ```

   Look for `kaiju_tick_duration_ms_bucket`, `kaiju_tick_duration_ms_sum`, and `kaiju_tick_duration_ms_count`. Calculate:

   - p50, p95, p99 from the histogram buckets.
   - Rate of increase over the last 5 minutes.

---

## Mitigation Steps

Follow this order; stop when p95 returns below 60 ms:

1. **Disable tick broadcasts.** Set `FEATURE_TICK_BROADCAST_ENABLED=false` via environment variable update. This silences state broadcast to clients on each tick without stopping the simulation. Clients will experience reduced update frequency but the simulation remains authoritative. Document the change per the change governance process.

2. **Disable new match creation when room count is high.** If active room count exceeds 20, set `FEATURE_DISPATCH_ENABLED=false` via environment variable update to stop new rooms from being created. Existing sessions continue; the tick load stabilizes as rooms naturally complete and dispose. Document the change per the change governance process.

3. **Schedule a restart during low-traffic.** If CPU pressure is due to memory fragmentation or a long-running leak, schedule a graceful drain and restart during the overnight low-traffic window. Follow [drain-procedure.md](../drain-procedure.md).

---

## Rollback Procedure

If tick drift began after a recent deployment, follow [release-policy.md](../release-policy.md) — Rollback Authority section. Set `RELEASE_STAGE=rollback` on the deployment and redeploy the last stable image tag.

---

## Communication Template

Use the following template for status updates every 15 minutes during a P1 incident:

> **[STATUS UPDATE — hh:mm UTC]**
> Issue: Game loop tick latency elevated (p95 ~X ms).
> Impact: Potential game state desync for players in active matches.
> Status: Investigating / Mitigating / Resolved.
> Next update: hh:mm UTC.

---

## Post-Incident Actions

- File a post-mortem using [postmortem-template.md](../postmortem-template.md) if the drift lasted > 15 minutes or affected more than 5 active rooms.
- Review tick histogram baseline and consider tightening the alert threshold if the environment has changed.
- Update this runbook if a new drift cause was discovered.
