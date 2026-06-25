---
title: "Release Policy"
description: "Rollout stages, gate conditions, rollback authority, and change-freeze criteria for the kaiju-arcade production server."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This policy defines how changes move from staging to full production for the kaiju-arcade multiplayer server. Because in-flight game sessions hold authoritative state in memory, an uncontrolled rollout can drop active players. Staged rollout with explicit gates limits the blast radius of any regression.

---

## Rollout Stages

Every production deployment follows the same three-stage progression unless an emergency bypass is authorized (see Emergency Rollback).

### Stage 1: Canary (5%)

| Attribute       | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| Traffic target  | 5% of new connection requests routed to the new build              |
| Minimum soak    | 10 minutes with active traffic (at least 10 join attempts)         |
| Gate conditions | SLO-A >= 99.5%, SLO-B p95 <= 3000 ms, no P1 alerts firing         |
| Proceed action  | Ops lead approves promotion to Stage 2                             |
| Abort action    | Roll back to previous stable immediately; open incident if gate missed |

Set `RELEASE_STAGE=canary` on the new replica set to activate canary routing.

### Stage 2: Partial (25%)

| Attribute       | Value                                                                 |
|-----------------|-----------------------------------------------------------------------|
| Traffic target  | 25% of new connection requests routed to the new build                |
| Minimum soak    | 10 minutes (same gate conditions as Stage 1)                         |
| Gate conditions | SLO-A >= 99.5%, SLO-B p95 <= 3000 ms, no P1 alerts firing, zero error log spike vs. baseline |
| Proceed action  | Ops lead approves promotion to Stage 3                                |
| Abort action    | Roll back to previous stable; open incident if gate missed            |

### Stage 3: Full (100%)

| Attribute       | Value                                                             |
|-----------------|-------------------------------------------------------------------|
| Traffic target  | 100% of new connections route to the new build                    |
| Minimum soak    | 30 minutes                                                        |
| Completion gate | No P1 or P2 alerts; error budget not trending toward freeze trigger |
| Close action    | Mark release complete; update `RELEASE_STAGE=stable`              |

---

## Gate Conditions (Formal Definition)

A stage gate passes when all of the following are true at the end of the soak period:

1. No P1 (Critical) alerts are firing.
2. No P2 (Warning) alerts are firing that began after the new build started receiving traffic.
3. SLO-A (Join Success Rate) >= 99.5% over the soak period.
4. SLO-B (p95 join-to-ready latency) <= 3000 ms over the soak period.
5. Error log volume on `[ERROR]` level has not increased by more than 20% compared to the equivalent soak period on the previous stable build.

If any condition fails, the release is blocked. The Ops lead decides within 15 minutes whether to hold (investigate and retry) or abort (roll back).

---

## Rollback Authority

| Condition                                   | Who may roll back        | Required notice            |
|---------------------------------------------|--------------------------|----------------------------|
| Gate condition fails during staged rollout  | On-call engineer (self)  | Notify team channel immediately after |
| P1 alert fires during any stage             | On-call engineer (self)  | Notify Incident Commander  |
| Ops lead judges risk too high               | Ops lead                 | Team channel notification  |
| Post-release latent regression (< 4h)       | Ops lead or IC           | Team notification + incident record |
| Post-release latent regression (>= 4h)      | Incident Commander only  | Incident record + stakeholder summary |

One-click rollback is executed by setting `RELEASE_STAGE=rollback` on the deployment and redeploying the last stable image tag. The rollback command must be documented in the team runbook for each deployment platform.

---

## Release Freeze Criteria

A release freeze prohibits all new deployments except authorized emergency mitigations.

### Freeze Trigger Conditions

A freeze is declared automatically when **any** of the following conditions is met:

| # | Condition                                                                 | Automatic? | Who declares         |
|---|---------------------------------------------------------------------------|------------|----------------------|
| 1 | Either SLO error budget consumed >= **50%** within a rolling 7-day period | Yes        | Alerting system      |
| 2 | Active P1 incident unresolved for > 1 hour                                | No         | On-call engineer     |
| 3 | Ops lead or IC declares a discretionary freeze                            | No         | Ops lead / IC        |

When condition 1 fires, the `SloAJoinSuccessRateCritical` or `SloBJoinLatencyP95Critical` alert provides the signal. The on-call engineer must acknowledge within 15 minutes and record the freeze start time in the incident log.

### Freeze Restrictions

During a freeze:

- No feature or non-critical fix deployments.
- No configuration changes except emergency rollback or explicit incident mitigations approved by the IC.
- Freeze status must be communicated to the team channel within 10 minutes of declaration.

### Unfreeze Process

A freeze lifts when **all** of the following are true:

1. The triggering condition has not fired in the previous 6 hours.
2. Remaining error budget (30-day rolling) is above **40%** for both SLO-A and SLO-B.
3. An incident retrospective is filed if the freeze lasted more than 2 hours.

The Ops lead or IC authorizes the unfreeze and records the lift time in the same incident log entry.

---

## Rollback Triggers

The table below defines the conditions that mandate a rollback, the required action, and the responsible owner.

| Condition                                                          | Action                                              | Owner                     |
|--------------------------------------------------------------------|-----------------------------------------------------|---------------------------|
| Join failure rate > 2% for 3+ minutes during any rollout stage     | Immediate rollback to previous stable tag           | On-call engineer          |
| Disconnect spike > 50/min for 2+ minutes during any rollout stage  | Immediate rollback; open P1 incident                | On-call engineer          |
| SLO gate condition fails at end of soak period                     | Block promotion; rollback if not resolved in 15 min | Ops lead                  |
| P1 alert fires at any point after new build receives traffic        | Rollback; escalate to Incident Commander            | On-call engineer          |
| Ops lead judges regression risk too high (any stage)               | Rollback at discretion                              | Ops lead                  |
| Post-release latent regression detected within 4 hours              | Rollback; open incident record                      | Ops lead or IC            |
| Post-release latent regression detected after 4 hours               | IC-authorized rollback; stakeholder summary         | Incident Commander        |

See `ops/monitoring/alerts/release-gates.yaml` for the Prometheus alert rules that fire for the first two conditions.

---

## Pre-Deployment Checklist

Before promoting any build to Stage 1, verify:

- [ ] `npm run lint` passes with zero errors.
- [ ] `npm test -- --runInBand` passes with zero failures.
- [ ] Changelog entry authored and merged.
- [ ] No open P1 or P2 incidents.
- [ ] No active change freeze.
- [ ] Ops lead notified.

---

## Evidence Capture Checklist

### Pre-Deployment

- [ ] PR approved by 2 reviewers.
- [ ] CI passing (lint, build, all tests green) — link to CI run captured in PR description.
- [ ] Rollback version (image tag or git SHA) identified and recorded in PR description.
- [ ] Drain procedure reviewed and the rollback command confirmed executable.

### During Deployment

- [ ] Deployment log URL captured and linked in the audit record.
- [ ] Health endpoint (`/health/ready`) confirmed healthy at each rollout stage before proceeding.

### Post-Deployment

- [ ] p95 join latency baseline checked against the pre-deployment baseline; no regression beyond 10%.
- [ ] Error budget burn rate confirmed stable (not trending toward freeze trigger).
- [ ] Evidence (CI link, deployment log URL, health check screenshots or curl output) filed in the associated ticket or pull request.
