---
title: "Incident Review"
description: "Weekly incident review checklist, cadence, and participant requirements for kaiju-arcade."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

The weekly incident review is a structured 30-minute session that keeps the team informed about service health trends, unresolved action items, and runbook gaps. It is not a blame exercise; it is a continuous improvement checkpoint.

---

## Cadence and Participants

| Attribute    | Value                                                             |
|--------------|-------------------------------------------------------------------|
| Frequency    | Every Monday                                                      |
| Duration     | 30 minutes                                                        |
| Participants | Developer On-Call + Ops Lead (see [incident-roles.md](incident-roles.md)) |
| Facilitator  | Ops Lead                                                          |
| Record       | Meeting notes filed in the incident log within 24 hours           |

---

## Weekly Review Checklist

Work through each item in order. Record findings in the meeting notes.

### 1. Alerts Fired This Week

- [ ] List all alerts that fired in the past 7 days (name, severity, timestamp, duration).
- [ ] For each alert: was it a true positive, false positive, or flapping?
- [ ] Are any alerts still open or unacknowledged?

### 2. p95 Join Latency Trend

- [ ] Review `kaiju_join_latency_ms` p95 over the trailing 7 days.
- [ ] Is the trend flat, improving, or degrading?
- [ ] Does the trend correlate with any deployment or configuration change?

### 3. Error Budget Burn

- [ ] Check SLO-A (Join Success Rate) error budget remaining (30-day rolling).
- [ ] Check SLO-B (p95 join-to-ready latency) error budget remaining (30-day rolling).
- [ ] Is either budget at risk of triggering a freeze condition (>= 50% consumed)?
- [ ] Reference [slo-policy.md](slo-policy.md) for freeze thresholds.

### 4. Top Errors From Logs

- [ ] Identify the top 5 `[ERROR]` log entries by frequency in the past 7 days.
- [ ] Are any new error types present that were not seen the previous week?
- [ ] Is any error linked to an open tracking issue?

### 5. Runbooks Needing Updates

- [ ] Were any runbooks executed this week? If so, did they accurately reflect the actual diagnosis and mitigation steps?
- [ ] List runbooks that need updates and assign an owner with a due date.
- [ ] Review the runbook index at [runbooks/index.md](runbooks/index.md) for coverage gaps.

---

## Output

At the end of the session, the facilitator records:

1. A brief summary of service health for the week.
2. Any new action items with owner and due date.
3. Any runbook update tasks created.
4. Whether an error budget freeze risk exists.

Meeting notes are retained for at least 90 days per the audit log retention policy in [change-governance.md](change-governance.md).
