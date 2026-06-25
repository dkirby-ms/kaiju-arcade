---
title: "Incident Roles"
description: "Incident command structure, role responsibilities, and handoff procedures for kaiju-arcade production incidents."
ms.date: 2026-06-25
ms.topic: reference
---

## Overview

Every P1 or P2 incident is managed under a lightweight incident command structure. Roles are filled by whoever is available and capable. A single person may hold more than one role for low-severity incidents, but the Incident Commander role must always be explicitly assigned.

---

## Roles

### Incident Commander (IC)

The IC owns the incident from declaration to closure. This role is accountable for all decisions made during the incident.

Responsibilities:

- Declare the incident and assign severity (P1 or P2).
- Assign and confirm all other roles at the start.
- Drive the timeline: triage, mitigation, resolution, and closure.
- Authorize rollbacks and change freeze declarations.
- Communicate status to stakeholders at regular intervals (every 15 minutes for P1).
- Ensure a post-incident review is scheduled within 48 hours of resolution.

Handoff: If the IC must rotate, the outgoing IC briefs the incoming IC on current state, open actions, and stakeholder commitments before stepping away.

### Operations Lead (Ops)

The Ops Lead executes infrastructure and deployment actions under IC direction.

Responsibilities:

- Execute rollback, scale, or configuration changes as directed by the IC.
- Monitor SLO dashboards and burn-rate alerts throughout the incident.
- Report metric changes to the IC every 5 minutes during active mitigation.
- Maintain the deployment log during the incident.

### Developer On-Call (Dev)

The Dev On-Call provides code-level diagnosis and emergency patches.

Responsibilities:

- Diagnose application behavior from logs, metrics, and code.
- Identify root cause and communicate confidence level to the IC.
- Produce and review any emergency hotfix under IC authorization.
- Validate that a proposed fix does not worsen the incident before deployment.

### Communications Lead (Comms)

The Comms Lead manages external and internal status updates. For small teams this role may be held by the IC.

Responsibilities:

- Post status updates to the team channel at IC-directed intervals.
- Update any external status page if one is configured.
- Draft stakeholder communication for IC review before sending.
- Maintain the incident timeline document in real time.

---

## Severity Levels

| Level | Definition                                                       | Response SLA     |
|-------|------------------------------------------------------------------|------------------|
| P1    | Active player impact: join failures, session loss, or total outage | Acknowledge in 5 min; IC assigned in 10 min |
| P2    | Degraded performance: elevated latency, partial join failures, canary regression | Acknowledge in 15 min; IC assigned in 30 min |
| P3    | No current player impact; potential future risk                  | Review in next business day standup |

---

## Incident Lifecycle

```
Alert fires
  → On-call engineer acknowledges
  → Severity assessment (P1/P2/P3)
  → IC assigned (self if P3, explicit assignment for P1/P2)
  → Roles filled
  → Triage: identify blast radius and impacted players
  → Mitigation: rollback, scale, config change, or hotfix
  → Validation: SLO metrics returning to normal, alerts clearing
  → Resolution declared by IC
  → Post-incident review scheduled
  → Review conducted; action items filed as work items
```

---

## Escalation Path

| Condition                                  | Escalate to          |
|--------------------------------------------|----------------------|
| P1 unacknowledged after 5 minutes          | Backup on-call       |
| P1 not mitigated within 30 minutes         | Ops lead + IC review |
| P1 not resolved within 2 hours             | Stakeholder notification |
| IC unavailable during active P1 incident   | Next person in rotation assumes IC role |

---

## Post-Incident Review Requirements

A post-incident review is required for every P1 and for any P2 that triggered a change freeze. The review must be:

- Conducted within 48 hours of incident resolution.
- Blameless in tone; the review targets systems and processes, not individuals.
- Documented with timeline, contributing factors, action items, and owners.
- Action items filed as work items within 24 hours of the review.

Templates for post-incident review documents are stored in `docs/operations/runbooks/` (to be created in Phase 6).
