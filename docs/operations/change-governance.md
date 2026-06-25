---
title: "Change Governance"
description: "Deployment audit requirements, configuration change process, audit log retention, and incident linkage for kaiju-arcade."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This document defines the audit and governance requirements that apply to every change reaching the kaiju-arcade production environment. All engineers with merge or deployment access are expected to follow these procedures.

---

## Deployment Audit Requirements

Every production deployment must produce an audit record before the deployment begins. The record must contain all of the following fields:

| Field | Description |
|-------|-------------|
| Approver name | Full name of the engineer who approved the pull request or authorized the deployment |
| Change scope summary | One-to-three sentence description of what is changing and why |
| Test results link | URL to the passing CI run (lint, build, and all tests green) |
| Rollback plan | Specific version tag or image tag to roll back to, and the command to execute |
| Post-deployment verification result | Health endpoint status, p95 join latency, and error budget burn rate observed after deployment completes |

The audit record is filed in the pull request description. For hotfixes deployed outside a pull request, the record must be added to the incident log within one hour of the deployment.

---

## Configuration Change Process

Configuration changes (any modification to environment variables, feature flags, or runtime parameters) are subject to the same governance as code changes.

- Every environment variable change must include a **ticket reference** in the pull request description (e.g., `Fixes #123` or `Ref: KAIJU-456`).
- The change must be documented in the release notes for the affected release, with the old and new values noted.
- Configuration-only changes that do not require a code deployment must still go through a pull request so the change is reviewable, tracked, and reversible.
- Emergency configuration overrides applied during an active incident must be documented in the incident log within 30 minutes and followed up with a pull request that codifies the change within 48 hours.

---

## Audit Log Retention

| Log Category | Minimum Retention | Storage Location |
|---|---|---|
| CI/CD pipeline logs (lint, build, test, security scan) | 90 days | CI provider (GitHub Actions) |
| Deployment records (pull request descriptions, merge events) | 90 days | GitHub pull request history |
| Runtime server logs | 90 days | Centralized log aggregation (see `production-config.md`) |
| Incident records | 1 year | Incident log (linked from pull request or postmortem) |

After 90 days, CI logs may be archived to cold storage. Pull request and incident records must remain searchable for compliance and retrospective purposes.

---

## Incident Linkage

Any deployment made while a P1 or P2 incident is active must include a reference to the incident ID in both the commit message and the pull request description.

- **Commit message format:** `fix: <description> [incident: INC-<id>]`
- **PR description:** Include a line `Incident: INC-<id>` near the top of the pull request body.

This requirement ensures that incident timelines accurately reflect all changes applied during the incident window and enables post-incident review of whether a deployment contributed to or resolved the incident.

If a deployment is later discovered to have occurred during an incident window without proper linkage, the omission must be noted in the incident postmortem.
