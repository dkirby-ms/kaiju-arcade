---
title: "Epic Tracking: Production Management Harness"
description: "Tracking document for the seven-point production management harness epic, including phase checklist and acceptance criteria."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This file documents the full scope of the production management harness epic. It captures what would normally live in a GitHub epic issue, including the title, labels, phase checklist, and acceptance criteria. When a GitHub issue is created, the content here becomes its description.

---

## Epic Title

`epic: 7-point production management harness`

---

## Labels

- `epic`
- `production`
- `reliability`
- `operations`

---

## Summary

Implement a seven-point operational harness that makes the kaiju-arcade multiplayer server safe to run in production. The harness addresses the following control domains identified in the production management harness research:

1. Reliability objectives and error budget policy
2. Progressive delivery and rollback safety
3. Runtime configuration and feature control
4. Resiliency and session continuity
5. Observability and telemetry contract
6. Incident operations and runbooks
7. Security and change governance

Each point maps to one or more implementation phases. All phases ship to the `feature/production-management-harness` branch and merge to main after passing gate conditions defined in the release policy.

---

## Phase Checklist

- [x] **Phase 0**: Production baseline and scope lock (documentation, SLO policy, release policy, incident roles)
- [ ] **Phase 1**: Graceful shutdown and SIGTERM drain (SIGTERM handler, drain timeout, readiness probe wiring)
- [ ] **Phase 2**: Progressive delivery guard (RELEASE_STAGE routing, canary traffic split, rollback command)
- [ ] **Phase 3**: Runtime configuration validation (startup schema validation, env-var fail-fast, feature flags wired to code)
- [ ] **Phase 4**: Observability and metrics (structured logging, Prometheus endpoint, histogram for join-to-ready latency)
- [ ] **Phase 5**: Rate limiting and security hardening (per-IP rate limits on join and create, security headers)
- [ ] **Phase 6**: Runbooks and incident procedures (runbook templates, post-incident review template, alerting wired to runbooks)
- [x] **Phase E**: Epic tracking issue creation (this document)

---

## Acceptance Criteria

The epic is complete when all seven of the following conditions are verified in the production environment:

1. **Reliability objectives defined and instrumented**: SLO-A (join success rate >= 99.5%) and SLO-B (p95 join-to-ready <= 3000 ms) are measured, dashboards exist, and burn-rate alerts are configured (see [slo-policy.md](slo-policy.md) and [alerts.md](alerts.md)).

2. **Graceful shutdown functional**: The server handles SIGTERM without dropping in-flight Colyseus sessions within the `DRAIN_TIMEOUT_MS` window. Verified by drain integration test.

3. **Progressive delivery enforced**: Every production deployment follows the 5% > 25% > 100% rollout sequence with gate conditions enforced (see [release-policy.md](release-policy.md)). One rollback drill has been executed in staging.

4. **Runtime configuration validated at startup**: The process exits non-zero when required environment variables are missing or malformed. At least one feature flag (`FEATURE_DISPATCH_ENABLED` or `FEATURE_TICK_BROADCAST_ENABLED`) is tested end-to-end.

5. **Observability contract met**: Structured logs emit at configurable log levels. The `/metrics` endpoint is available when `METRICS_ENABLED=true`. The `kaiju_join_attempts_total` and `kaiju_join_to_ready_duration_ms` metrics are present.

6. **Rate limiting active**: Per-IP rate limits on `POST /api/matches` and `POST /api/matches/:roomId/kaiju-join` are enforced and configurable via environment variables.

7. **Incident operations documented and tested**: Runbook templates exist in `docs/operations/runbooks/`. The incident roles and escalation path are documented (see [incident-roles.md](incident-roles.md)). At least one tabletop exercise has been conducted.

---

## Related Documents

- [production-config.md](production-config.md): Environment variable reference
- [slo-policy.md](slo-policy.md): SLO definitions and error budget mechanics
- [alerts.md](alerts.md): Burn-rate alert thresholds and routing
- [release-policy.md](release-policy.md): Rollout stages, gate conditions, and rollback authority
- [incident-roles.md](incident-roles.md): Incident command structure and escalation path
- [.copilot-tracking/plans/2026-06-25/production-management-harness-implementation-plan.instructions.md](../../.copilot-tracking/plans/2026-06-25/production-management-harness-implementation-plan.instructions.md): Full implementation plan

---

## Notes

GitHub issue creation was deferred. This file serves as the authoritative epic record until the issue is filed. When filing the issue, copy the content under "Epic Title", "Labels", "Summary", "Phase Checklist", and "Acceptance Criteria" into the issue body verbatim.
