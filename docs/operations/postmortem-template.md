---
title: "Post-Mortem Template"
description: "Standard post-mortem structure for kaiju-arcade production incidents."
ms.date: 2026-06-25
ms.topic: reference
---

## Post-Mortem: [Incident Title]

> Copy this template for each incident that requires a post-mortem. File the completed document in the incident log within 48 hours of resolution.

---

## Incident Summary

| Field            | Value                                |
|------------------|--------------------------------------|
| Incident ID      |                                      |
| Severity         | P1 / P2                              |
| Start time (UTC) |                                      |
| End time (UTC)   |                                      |
| Duration         |                                      |
| Incident Commander |                                    |
| Status           | Resolved / Ongoing                   |

Brief description (2–4 sentences): What happened, what broke, and how it was resolved.

---

## Timeline

| Time (UTC) | Event | Who |
|------------|-------|-----|
|            |       |     |
|            |       |     |
|            |       |     |

Add rows as needed. Include: alert fired, first response, each mitigation action taken, resolution confirmed, and incident closed.

---

## Impact Assessment

- **Players affected:** Estimated number of active sessions disrupted.
- **Duration of impact:** Time from first player impact to full recovery.
- **Features affected:** List the specific capabilities (join, reconnect, match start, etc.) that were degraded or unavailable.
- **Error budget consumed:** SLO-A and SLO-B burn during the incident window.

---

## Root Cause Analysis

Describe the technical root cause in plain language. Answer: what specific condition caused the failure, and why did it exist?

---

## Contributing Factors

List conditions that made the incident more likely, harder to detect, or harder to mitigate. Examples:

- Missing alert coverage for the failure mode.
- Configuration drift between staging and production.
- Runbook step that was ambiguous or incorrect.

---

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 |        |       |          | Open   |
| 2 |        |       |          | Open   |

---

## Follow-On Work

List any larger improvements (refactors, capacity changes, monitoring additions) that the incident revealed but are too large for an action item. Link to tracking issues.

---

## Lessons Learned

What did the team learn from this incident that was not previously documented? Record insights about the system, the tooling, or the process.
