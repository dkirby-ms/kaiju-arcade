---
title: "Rollback Drill"
description: "Checklist and evidence template for kaiju-arcade rollback rehearsals."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This document guides an operator through a rollback drill — a rehearsal that validates the rollback procedure before it is needed in a real incident. Drills should be run at least once per quarter and after any significant change to the deployment platform.

---

## When to Run a Drill

| Trigger                                          | Frequency           |
|--------------------------------------------------|---------------------|
| Scheduled quarterly rehearsal                    | Every 90 days       |
| After changing the deployment platform or tooling | Before next release |
| After a real rollback incident                   | Within 5 business days |
| New on-call engineer onboarding                  | During first week   |

---

## Prerequisites

Before starting the drill, confirm:

- [ ] You have a non-production environment (staging or local) available for the drill. Do not run a rollback drill against the live production environment without IC authorization.
- [ ] You know the current deployed version (tag or image digest).
- [ ] You know the previous stable version to roll back to.
- [ ] The `scripts/rollback-drill.sh` script has the platform-specific rollback command configured (Step 3 TODO is filled in).
- [ ] You have access to the `/health/ready` endpoint of the target host.
- [ ] The `logs/` directory in the repository root is writable (the script creates it if absent).

---

## Drill Steps

Run the drill script:

```bash
bash scripts/rollback-drill.sh --host <base-url>
```

The script guides you through the following steps automatically. Verify each step as it executes.

| Step | Script action                        | Operator verification                                             |
|------|--------------------------------------|-------------------------------------------------------------------|
| 1    | Print current deployed version       | Confirm the version matches what you expect from the last deploy  |
| 2    | Prompt for rollback target version   | Enter the previous stable tag (e.g., `v1.2.3`)                   |
| 3    | Execute platform rollback command    | Confirm the command ran without error (or note the TODO state)    |
| 4    | Poll `/health/ready` (up to 6 tries) | Confirm HTTP 200 is received after rollback                       |
| 5    | Record drill result to log file      | Verify a PASS entry appears in `logs/rollback-drills.log`         |

---

## Expected Outcomes

| Condition                         | Expected result                                              |
|-----------------------------------|--------------------------------------------------------------|
| Rollback command succeeds         | `/health/ready` returns HTTP 200 within 60 seconds           |
| Rollback command not configured   | Script prints TODO message; health check runs against current service |
| `/health/ready` returns non-200   | Script exits with code 1; drill result logged as FAIL        |
| Version endpoint unreachable      | Script falls back to `git describe --tags`; drill continues  |

---

## Evidence Template

After each drill, copy and complete the template below into your incident or change record.

```
Rollback Drill Evidence
=======================
Date (UTC):             ___________________________
Operator:               ___________________________
Environment:            staging / local / production (circle one)
Host:                   ___________________________

Pre-Drill State
  Current version:      ___________________________
  Rollback target:      ___________________________
  Prerequisites met:    yes / no (if no, explain: __________________)

Drill Execution
  Script command:       bash scripts/rollback-drill.sh --host ___________
  Step 3 status:        executed / TODO placeholder (explain: ___________)
  Health check result:  PASS / FAIL
  HTTP status code:     ___________________________
  Attempts needed:      _____ of 6

Log Entry
  File:                 logs/rollback-drills.log
  drill_result field:   PASS / FAIL

Post-Drill Actions
  Issues found:         ___________________________
  Follow-up items:      ___________________________
  Drill result sign-off: ___________________________
```

---

## Interpreting a FAIL Result

A FAIL outcome means one of the following occurred:

1. The platform rollback command errored or is not yet configured (Step 3 TODO).
2. The service did not return HTTP 200 from `/health/ready` within the retry window.

In either case:

- Do not run a real rollback in production until the issue is resolved.
- File a follow-up task to fix the blocking item.
- Re-run the drill after the fix is in place.

A FAIL during a drill is valuable information — it is far better to discover it here than during a real incident.

---

## Related Documents

- [Release Policy](release-policy.md) — Rollback Triggers table and authority matrix
- [SLO Policy](slo-policy.md) — freeze criteria that may precede a rollback
- [Alerts](alerts.md) — burn-rate alert thresholds and escalation paths
- `ops/monitoring/alerts/release-gates.yaml` — deployment gate alert rules
- `.github/workflows/deploy-production.yml` — automated rollback job (release_stage=rollback)
