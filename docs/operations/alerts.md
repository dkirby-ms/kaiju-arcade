---
title: "Burn-Rate Alerts"
description: "Alert thresholds, routing, and escalation paths for SLO burn-rate conditions in the kaiju-arcade production server."
ms.date: 2026-06-25
ms.topic: reference
---

## Overview

Burn-rate alerts fire before the error budget is fully consumed. The thresholds below are calibrated for a 30-day error budget window. Each SLO has two alert tiers: a critical tier for fast burns and a warning tier for sustained moderate burns.

For SLO definitions, SLI formulas, and budget mechanics see [slo-policy.md](slo-policy.md).

---

## Alert Thresholds

### SLO-A: Join Success Rate

| Tier     | Burn Rate | Evaluation Window | Budget Consumed in Window | Severity | Action                         |
|----------|-----------|-------------------|---------------------------|----------|--------------------------------|
| Critical | 2x        | 1 hour            | ~3.3% of 30d budget       | P1       | Page on-call; begin incident protocol |
| Warning  | 5x        | 6 hours           | ~25% of 30d budget        | P2       | Notify channel; investigate within 30 min |

A burn rate of 2x means the budget is being consumed at twice the sustainable rate. At 2x over 1 hour the team has roughly 15 days before full exhaustion if left unaddressed.

### SLO-B: Join-to-Ready Latency p95

| Tier     | Burn Rate | Evaluation Window | Budget Consumed in Window | Severity | Action                              |
|----------|-----------|-------------------|---------------------------|----------|-------------------------------------|
| Critical | 2x        | 1 hour            | ~3.3% of 30d budget       | P1       | Page on-call; check game loop and room state |
| Warning  | 5x        | 6 hours           | ~25% of 30d budget        | P2       | Notify channel; review `kaiju_join_to_ready_duration_ms` histogram |

For SLO-B, burn rate is computed as: `(observed failing periods / allowed failing periods)` over the evaluation window.

---

## Alert Expressions (Prometheus-compatible)

The expressions below are reference implementations. Adapt metric names to the observability backend in use.

### SLO-A Critical (2x burn / 1h)

```promql
(
  sum(rate(kaiju_join_attempts_total{result="failure"}[1h]))
  /
  sum(rate(kaiju_join_attempts_total[1h]))
) > 2 * 0.005
```

### SLO-A Warning (5x burn / 6h)

```promql
(
  sum(rate(kaiju_join_attempts_total{result="failure"}[6h]))
  /
  sum(rate(kaiju_join_attempts_total[6h]))
) > 5 * 0.005
```

### SLO-B Critical (p95 > 6000ms sustained 1h)

```promql
histogram_quantile(
  0.95,
  sum(rate(kaiju_join_to_ready_duration_ms_bucket[1h])) by (le)
) > 6000
```

### SLO-B Warning (p95 > 3000ms sustained 6h)

```promql
histogram_quantile(
  0.95,
  sum(rate(kaiju_join_to_ready_duration_ms_bucket[6h])) by (le)
) > 3000
```

---

## Routing and Escalation

| Severity | Initial notification       | Escalation after         | Escalation target           |
|----------|----------------------------|--------------------------|-----------------------------|
| P1       | On-call engineer (pager)   | 15 minutes with no ack   | Incident Commander          |
| P2       | Team channel (chat)        | 1 hour with no action    | On-call engineer            |

---

## Alert Silencing Policy

Alerts may not be silenced outside of a declared maintenance window. A maintenance window:

- Requires advance notice of at least 30 minutes for planned work.
- Has a maximum duration of 4 hours.
- Must be logged in the incident or change record.

Silencing an alert without a recorded maintenance window is a policy violation and must be reported in the next team retrospective.

---

## Dashboard Requirements

Every production environment must maintain two dashboards:

1. **SLO Status Board**: Current SLI values, remaining error budget (%), and projected exhaustion time for both SLOs.
2. **Burn-Rate Timeline**: Rolling 1h and 6h burn rates for each SLO, with horizontal lines at the alert thresholds.

Dashboards are reviewed weekly by the Ops lead (see [slo-policy.md](slo-policy.md) review cadence).
