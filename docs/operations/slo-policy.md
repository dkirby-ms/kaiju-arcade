---
title: "SLO Policy"
description: "Service Level Objectives, SLI definitions, error budget mechanics, and freeze criteria for the kaiju-arcade production server."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This document establishes the service level objectives for kaiju-arcade's multiplayer backend. Each SLO defines a measurable user-facing reliability target, the signal used to measure it, and the consequence of missing it. The error budget mechanics define when to freeze changes and how to resume.

---

## SLO-A: Join Success Rate

### Target

Join Success Rate >= 99.5% measured over a 30-day rolling window.

### SLI Definition

```
SLI-A = successful_join_attempts / total_join_attempts
```

A join attempt is counted when a client submits a `POST /api/matches` or `POST /api/matches/:roomId/kaiju-join` request. The attempt is successful when the server returns an HTTP 2xx response containing a valid seat reservation (fields: `roomId`, `sessionId`, `processId`). All non-2xx responses and unhandled exceptions within the join path are counted as failures.

### Measurement Window

Rolling 30-day window. Compute every hour using a sliding window over the metric `kaiju_join_attempts_total{result="success|failure"}`.

### Error Budget

| Window  | Allowed failure budget (0.5%)      |
|---------|------------------------------------|
| 30 days | 21.6 minutes of total failure time |

"Failure time" is a proxy for continuous failure. For sparse traffic, budget is measured as a failure count proportion rather than continuous minutes.

### Compliance Status Target

At least 99.5% compliance for any 30-day period. Burn-rate alerts (see `alerts.md`) fire before the budget is consumed.

---

## SLO-B: Join-to-Ready Latency p95

### Target

Join-to-Ready Latency p95 <= 3000 ms measured over a 30-day rolling window.

### SLI Definition

```
SLI-B = p95(join_to_ready_latency_ms)
```

Measurement starts when the server receives and begins processing a `POST /api/matches` request. Measurement ends when the `MatchRoom` emits the first `onReady` event to all confirmed-ready clients. The timer is recorded per-room only when all expected clients reach the ready state. Rooms that never reach ready (for example due to a client drop before readiness) are excluded from the latency SLI but counted as failures in SLO-A.

### Measurement Window

Same rolling 30-day window as SLO-A. Evaluate the p95 bucket from the histogram metric `kaiju_join_to_ready_duration_ms`.

### Error Budget

The p95 target is a latency objective, not a success-rate objective. The budget is consumed when the measured p95 exceeds 3000 ms during any evaluation period. Treat each hourly evaluation period as either passing (p95 <= 3000 ms) or failing (p95 > 3000 ms). Error budget for SLO-B is 0.5% of evaluation periods over 30 days (approximately 3.6 hours of failing periods).

---

## Error Budget Mechanics

### Budget Tracking

Both SLO error budgets are tracked continuously. A budget dashboard (see `alerts.md`) shows:

- Remaining budget as a percentage
- Current burn rate (x times the allowed rate)
- Projected budget exhaustion time

### Freeze Trigger

A change freeze is declared automatically when **either** condition is met:

1. Either SLO error budget is consumed >= 50% within any rolling 7-day period.
2. The SLO-A burn rate exceeds 14.4x the allowed rate (implying budget exhaustion within 1 day if sustained).

During a freeze:

- No new feature deployments.
- No configuration changes except emergency rollback or explicit incident mitigations.
- Freeze is logged in the incident record and communicated to the team.

### Resuming After a Freeze

A freeze lifts when all of the following are true:

1. The triggering condition has not fired in the previous 6 hours.
2. Remaining error budget (30-day rolling) is above 40% for both SLOs.
3. An incident retrospective is filed if the freeze lasted more than 2 hours.

### Budget Reset Policy

Error budgets reset on a rolling basis (not on a calendar cycle). There is no manual budget refill outside of a formal stakeholder review.

---

## SLO Review Cadence

| Activity               | Frequency  | Owner      |
|------------------------|------------|------------|
| Dashboard review       | Weekly     | Ops lead   |
| Target calibration     | Quarterly  | Dev + Ops  |
| Post-incident SLO review | Per incident | IC       |

SLO targets may be tightened over time as the system matures. They may only be loosened through a formal review with documented rationale.

---

## Implementation Notes

### SLI Instrumentation Points

The following instrumentation is in place in the kaiju-arcade server codebase.

**SLO-A — Join Success Rate (`kaiju_join_total` counter)**

Wired in `src/index.ts` at the `POST /api/matches` and `POST /api/matches/:roomId/kaiju-join` endpoints.
Labels: `outcome=success|failure`, `role=commander|kaiju`.
Used as the numerator and denominator for SLI-A.

**SLO-B — Join-to-Ready Latency (`kaiju_join_latency_ms` histogram)**

Wired in `src/index.ts` at the `POST /api/matches` success path.
The timer starts when the request begins processing and the observation is recorded immediately before the HTTP response is sent.
Buckets: `[100, 500, 1000, 2000, 3000, 5000]` milliseconds.
Used to derive the p95 for SLI-B.

> Note: the SLO-B SLI definition in this document refers to `kaiju_join_to_ready_duration_ms`
> (end-to-end room-ready latency). `kaiju_join_latency_ms` covers the HTTP request processing
> portion of that latency. A full end-to-end measurement requires a Colyseus room-ready event
> hook, which is tracked as a follow-on instrumentation item.
