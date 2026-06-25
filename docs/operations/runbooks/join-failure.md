---
title: "Runbook: Join Failure Spike"
description: "Diagnosis and mitigation steps for elevated kaiju_join_total{outcome=failure} rates."
ms.date: 2026-06-25
ms.topic: runbook
---

## Summary

This runbook covers a spike in join failures surfaced by the `HighJoinFailureRate` alert. A join failure means a player attempted to create or enter a match and received a non-2xx response or a Colyseus rejection. Sustained failure rates degrade the player experience and can indicate capacity, drain, or deployment problems.

---

## Trigger

| Alert                  | Threshold                                                           |
|------------------------|---------------------------------------------------------------------|
| `HighJoinFailureRate`  | `kaiju_join_total{outcome="failure"}` failure rate > 5% for 2 minutes |

---

## Initial Diagnosis

1. **Check the join failure counter.**

   ```
   GET /metrics
   ```

   Look for `kaiju_join_total{outcome="failure"}` and compare to `kaiju_join_total{outcome="success"}`. Calculate the failure rate.

2. **Check readiness.**

   ```
   GET /health/ready
   ```

   A `503` response means the server is draining. New join requests will fail until drain completes or is cancelled.

3. **Check server logs for error entries.**

   Grep logs for `"level":"error"` entries in the last 10 minutes. Common causes:

   - `Room not found` — the requested `roomId` no longer exists (room already disposed).
   - `Room is full` — capacity reached; no additional seats available.
   - `matchMaker.create failed` — resource exhaustion or Colyseus internal error.
   - `Server draining` — drain was triggered before requests completed.

---

## Mitigation Steps

Follow this order; stop when the failure rate returns to < 0.5%:

1. **Check rate limits.** If 429 responses are logged, the rate limit for join or create may be too low for current traffic. Adjust `RATE_LIMIT_JOIN_RPM` or `RATE_LIMIT_CREATE_RPM` via environment variable update (document the change per the change governance process).

2. **Check drain state.** If `/health/ready` returns `503`, determine whether the drain was intentional (rolling deploy) or accidental. If accidental, restart the affected instance.

3. **Check room capacity.** If `Room is full` errors dominate, either scale out (add instances) or increase the `maxClients` setting if game rules allow it.

4. **Disable match creation.** If the failure rate is sustained and the root cause is unresolved, set `RATE_LIMIT_CREATE_RPM=0` via environment variable update to stop new match creation while preserving existing sessions. Document the change per the change governance process.

5. **Rollback if new deploy.** If failure rate spiked after a recent deployment, follow the rollback procedure below.

---

## Rollback Procedure

Follow [release-policy.md](../release-policy.md) — Rollback Authority section. Set `RELEASE_STAGE=rollback` on the deployment and redeploy the last stable image tag. Notify the team channel immediately.

---

## Communication Template

Use the following template for status updates every 15 minutes during a P1 incident:

> **[STATUS UPDATE — hh:mm UTC]**
> Issue: Elevated join failure rate (~X%).
> Impact: Players unable to create or join matches.
> Status: Investigating / Mitigating / Resolved.
> Next update: hh:mm UTC.

---

## Post-Incident Actions

- File a post-mortem using [postmortem-template.md](../postmortem-template.md) if the incident lasted > 30 minutes or impacted more than 5% of join attempts.
- Update this runbook if a new failure mode was discovered.
- Create a tracking issue for any rate-limit or capacity tuning identified during mitigation.
