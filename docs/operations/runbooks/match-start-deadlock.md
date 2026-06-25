---
title: "Runbook: Match Start Deadlock"
description: "Diagnosis and mitigation steps for a match room stuck in 'waiting' or 'lobby' state with sufficient players present."
ms.date: 2026-06-25
ms.topic: runbook
---

## Summary

A match start deadlock occurs when a room has two or more players seated but never transitions out of the `waiting` or `lobby` phase. Players are connected, paying the session cost, but gameplay does not begin. Left unresolved, this ties up a room slot indefinitely and frustrates all players in that session.

---

## Trigger

| Condition                                                                   | Detection                                           |
|-----------------------------------------------------------------------------|-----------------------------------------------------|
| Match room stuck in `waiting` or `lobby` state for > 10 minutes             | Manual observation or log scan for stale phase entry |
| >= 2 players present (`playerSessions` count >= 2) with no phase transition | Verified via MatchRoom state logs                   |

---

## Initial Diagnosis

1. **Check MatchRoom logs for phase transition events.**

   Filter server logs for the affected `roomId` and look for phase transition log entries (for example, `phase changed: waiting → active`). If no transition has been logged since room creation, the dispatch path is blocked.

2. **Check `playerSessions` count vs. expected.**

   Review the MatchRoom schema state via Colyseus admin tools or log output. Confirm:

   - `playerSessions` count matches the number of connected clients.
   - No player joined with an invalid role or a missing `playerName` that would block dispatch.

3. **Check `FEATURE_DISPATCH_ENABLED` flag.**

   If `FEATURE_DISPATCH_ENABLED=false` is set, match dispatch is intentionally disabled. Confirm whether this was a deliberate operational decision or an accidental leftover.

---

## Mitigation Steps

Follow this order:

1. **Set `FEATURE_DISPATCH_ENABLED=false` to stop dispatch loops.** Setting the flag to `false` halts the dispatch evaluation path without dropping connections. This prevents additional deadlocks from forming while the current room is diagnosed. Document the change per the change governance process.

2. **Have the commander re-join.** If the commander client is the blocking dependency, instruct the commander to leave and re-join the room. On re-join the `onJoin` event fires again, which can restart the dispatch evaluation and resolve the stuck state without dropping other players.

3. **Perform a graceful restart if unresolvable.** If steps 1 and 2 do not resolve the deadlock, send SIGTERM to the affected instance to begin a controlled drain. Wait for in-progress connections to close (or for the drain timeout to elapse), then deploy a fresh instance. Affected players reconnect to the new instance. Follow [drain-procedure.md](../drain-procedure.md).

---

## Rollback Procedure

If the deadlock began after a recent deployment, follow [release-policy.md](../release-policy.md) — Rollback Authority section. Set `RELEASE_STAGE=rollback` on the deployment and redeploy the last stable image tag.

---

## Communication Template

Use the following template for status updates during a P2 incident:

> **[STATUS UPDATE — hh:mm UTC]**
> Issue: Match room (ID: XXXX) stuck in waiting state with X players.
> Impact: Affected players cannot begin gameplay. No broader service impact.
> Status: Investigating / Mitigating / Resolved.
> Next update: hh:mm UTC.

---

## Post-Incident Actions

- File a post-mortem using [postmortem-template.md](../postmortem-template.md) if the deadlock was caused by a code defect rather than a configuration issue.
- Add a unit test or integration check covering the phase transition path if the root cause was a regression.
- Update this runbook if a new deadlock pattern was discovered.
