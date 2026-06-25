---
title: "Runbook: Reconnect Storm"
description: "Diagnosis and mitigation steps for a spike in kaiju_reconnect_total{outcome=failure}."
ms.date: 2026-06-25
ms.topic: runbook
---

## Summary

A reconnect storm occurs when many clients simultaneously attempt to rejoin a session and fail. This typically follows a server restart, an unintended drain, or token expiry. Sustained reconnect failures erode the error budget and, if unchecked, can cascade into a full session loss event.

---

## Trigger

| Alert                         | Threshold                                                                      |
|-------------------------------|--------------------------------------------------------------------------------|
| `KaijuReconnectStormDetected` | `kaiju_reconnect_total{outcome="failure"}` > 20 per minute, sustained for 2 minutes |

---

## Initial Diagnosis

1. **Check the reconnect failure counter.**

   ```
   GET /metrics
   ```

   Look for `kaiju_reconnect_total{outcome="failure"}`. Note the rate per minute and compare to the baseline.

2. **Check token expiry configuration.**

   Verify the current value of `RECONNECT_GRACE_MS` in the running environment. The default is 30 000 ms (30 seconds). If clients are reconnecting after the grace window, tokens will have expired and all reconnect attempts will fail.

3. **Check for unintentional drain.**

   ```
   GET /health/ready
   ```

   A `503` response indicates the server is draining. If the drain was not intentional (for example, caused by a SIGTERM from a bad deploy), restart the affected instance immediately.

4. **Check server readiness and capacity.**

   Review logs for `[ERROR]` entries related to reconnect token validation or room-not-found errors. Confirm that the room the client is trying to rejoin still exists.

---

## Mitigation Steps

Follow this order; stop when the failure rate drops below 5 per minute:

1. **Extend the reconnect grace window.** If token expiry is the root cause, increase `RECONNECT_GRACE_MS` via an environment variable update. A restart is required for the change to take effect. Clients already disconnected will not benefit immediately but future reconnects will succeed within the extended window. Document the change per the change governance process.

2. **Stagger drain across instances.** If the storm was triggered by a simultaneous drain across all nodes (for example, a rolling deploy that hit all instances at once), stagger subsequent drains so no more than one instance drains at a time. This prevents all clients from reconnecting simultaneously.

3. **Disable new match creation temporarily.** If the server is overwhelmed by simultaneous reconnects and new-match requests, set `FEATURE_DISPATCH_ENABLED=false` to temporarily disable new match dispatch, reserving capacity for reconnecting players.

4. **Rollback if new deploy.** If the storm began after a recent deployment, follow the rollback procedure below.

---

## Rollback Procedure

Follow [release-policy.md](../release-policy.md) — Rollback Authority section. Set `RELEASE_STAGE=rollback` on the deployment and redeploy the last stable image tag. Notify the team channel immediately.

---

## Communication Template

Use the following template for status updates every 15 minutes during a P1 incident:

> **[STATUS UPDATE — hh:mm UTC]**
> Issue: Reconnect storm in progress (~X failures/min).
> Impact: Players disconnected from active matches unable to rejoin.
> Status: Investigating / Mitigating / Resolved.
> Next update: hh:mm UTC.

---

## Post-Incident Actions

- File a post-mortem using [postmortem-template.md](../postmortem-template.md) if the incident lasted > 30 minutes or affected more than 10 concurrent sessions.
- Review `RECONNECT_GRACE_MS` default and adjust if the window is consistently too short for client network conditions.
- Update this runbook if a new failure mode was discovered.
