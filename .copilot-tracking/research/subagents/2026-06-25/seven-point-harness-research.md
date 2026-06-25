---
title: Seven-Point Harness Repository Research
description: Inventory of the implemented 7-point production management harness in kaiju-arcade with file-level evidence and status classification.
ms.date: 2026-06-25
ms.topic: reference
---

## Scope

Repository-only research to inventory the existing 7-point production management harness in kaiju-arcade.

Primary questions covered:

* Where the 7-point harness is defined
* Concrete implementation evidence for each point
* What is fully implemented vs partially implemented vs planned
* Reusable patterns and integration touchpoints
* Risks and limitations relevant to Epic 10 alignment

## Harness Definition

Canonical harness definition is in docs/operations/epic-tracking.md.

Definition statement:

* docs/operations/epic-tracking.md:31 defines the seven-point production management harness.

Harness points:

1. Reliability objectives and error budget policy (docs/operations/epic-tracking.md:33)
2. Progressive delivery and rollback safety (docs/operations/epic-tracking.md:34)
3. Runtime configuration and feature control (docs/operations/epic-tracking.md:35)
4. Resiliency and session continuity (docs/operations/epic-tracking.md:36)
5. Observability and telemetry contract (docs/operations/epic-tracking.md:37)
6. Incident operations and runbooks (docs/operations/epic-tracking.md:38)
7. Security and change governance (docs/operations/epic-tracking.md:39)

Phase tracker baseline in the same file marks only Phase 0 and Phase E checked (docs/operations/epic-tracking.md:47, docs/operations/epic-tracking.md:54), while runtime/ops artifacts show substantial implementation beyond that checklist.

## Per-Point Evidence

### 1) Reliability Objectives And Error Budget Policy

Definition and policy evidence:

* docs/operations/slo-policy.md:14 defines SLO-A.
* docs/operations/slo-policy.md:18 sets target Join Success Rate >= 99.5%.
* docs/operations/slo-policy.md:46 defines SLO-B.
* docs/operations/slo-policy.md:50 sets target Join-to-Ready p95 <= 3000 ms.

Implementation evidence:

* src/index.ts:104 increments join outcome counter and records join latency histogram on match create path.
* src/index.ts:125 and src/index.ts:126 record kaiju_join_total and kaiju_join_latency_ms.
* src/ops/metrics.ts:92 registers kaiju_join_total.
* src/ops/metrics.ts:123 registers kaiju_join_latency_ms.
* ops/monitoring/alerts/slo-burn-rate.yaml:20 defines SloAJoinSuccessRateCritical.
* ops/monitoring/alerts/slo-burn-rate.yaml:69 defines SloBJoinLatencyP95Critical.
* ops/monitoring/dashboards/slo-overview.json:55 includes SLO-A panel.
* ops/monitoring/dashboards/slo-overview.json:92 includes SLO-B panel.

Gap evidence:

* docs/operations/slo-policy.md:139 and docs/operations/slo-policy.md:140 explicitly note full end-to-end join-to-ready is not yet instrumented.

Status: Partially implemented

### 2) Progressive Delivery And Rollback Safety

Definition and policy evidence:

* docs/operations/release-policy.md:18 defines canary 5% stage.
* docs/operations/release-policy.md:30 defines partial 25% stage.
* docs/operations/release-policy.md:40 defines full 100% stage.
* docs/operations/release-policy.md:115 defines rollback triggers.

Implementation evidence:

* .github/workflows/deploy-production.yml:1 provides staged deploy workflow.
* .github/workflows/deploy-production.yml:23 includes manual release_stage input (canary/partial/stable/rollback).
* ops/monitoring/alerts/release-gates.yaml:20 defines DeploymentJoinFailureRateHigh.
* ops/monitoring/alerts/release-gates.yaml:47 defines DeploymentDisconnectSpike.
* docs/operations/rollback-drill.md:33 defines executable drill flow.

Gap evidence:

* src/ops/config.ts:22 restricts RELEASE_STAGE type to canary|stable (no rollback).
* src/ops/config.ts:29 valid stages are canary and stable only.
* src/**/*.ts search shows RELEASE_STAGE is parsed but not used to route behavior in runtime paths.
* scripts/rollback-drill.sh:110, scripts/rollback-drill.sh:127, scripts/rollback-drill.sh:131 show rollback command is still TODO placeholder and not executed.
* .github/workflows/deploy-production.yml has multiple TODOs for real platform traffic-splitting and rollout commands.

Status: Partially implemented

### 3) Runtime Configuration And Feature Control

Definition evidence:

* docs/operations/production-config.md:10 defines startup validation expectations.
* docs/operations/feature-flags.md:10 defines runtime kill-switch controls.

Implementation evidence:

* src/ops/config.ts:12 defines typed ServerConfig.
* src/ops/config.ts:77 enforces production required env vars with process exit.
* src/ops/config.ts:83 and src/ops/config.ts:90 fail fast when required vars missing.
* src/ops/config.ts:125 and src/ops/config.ts:131 parse rate-limit env vars.
* src/ops/config.ts:150 and src/ops/config.ts:153 parse feature flags.
* src/game/MatchRoom.ts:412 and src/game/MatchRoom.ts:413 enforce FEATURE_DISPATCH_ENABLED kill switch.
* src/game/MatchRoom.ts:1229 gates tick processing with FEATURE_TICK_BROADCAST_ENABLED.

Gap evidence:

* docs/operations/feature-flags.md states startup-read behavior requiring restart (not dynamic runtime flip): docs/operations/feature-flags.md:36.
* RELEASE_STAGE rollback mismatch remains between docs/workflow and config type constraints (src/ops/config.ts:22, src/ops/config.ts:29).

Status: Mostly implemented (with specific constraints)

### 4) Resiliency And Session Continuity

Implementation evidence:

* src/index.ts:63 defines liveness endpoint /health/live.
* src/index.ts:68 defines readiness endpoint /health/ready using drain state.
* src/index.ts:279 handles SIGTERM.
* src/index.ts:281 starts drain with DRAIN_TIMEOUT_MS.
* src/ops/runtime-state.ts:28 defines startDrain.
* src/game/MatchRoom.ts:213 rejects non-reconnect joins while draining.
* src/game/MatchRoom.ts reconnect reclaim and grace-window paths are exercised by tests.
* src/game/MatchRoom.test.ts:1007 contains dedicated "drain and capacity resilience" suite.
* src/game/MatchRoom.test.ts:1023 and src/game/MatchRoom.test.ts:1066 test drain behavior.
* docs/operations/drain-procedure.md:9 documents full drain lifecycle and operator steps.
* docs/operations/chaos-reconnect-tests.md:12 maps chaos scenarios to MatchRoom tests.

Status: Fully implemented (for current in-memory single-process architecture)

### 5) Observability And Telemetry Contract

Implementation evidence:

* src/ops/logger.ts:2 defines structured JSON logger.
* src/ops/logger.ts:26 enforces log level filtering.
* src/ops/logger.ts:62 provides request logging middleware.
* src/index.ts:82 serves /metrics when enabled.
* src/ops/metrics.ts:92 through src/ops/metrics.ts:123 register core counters/gauges/histograms.
* src/game/GameLoop.ts:37 records kaiju_tick_duration_ms histogram.
* src/ops/tracing.ts:9 defines span API and emits JSON trace events in production mode.
* ops/monitoring/alerts/service-alerts.yaml:6, :20, :34, :48, :63 define service-level alert rules.
* docs/operations/runbooks/index.md:32 through docs/operations/runbooks/index.md:38 maps key metrics to operational context.

Gap evidence:

* docs/operations/alerts.md still references kaiju_join_attempts_total and kaiju_join_to_ready_duration_ms (docs/operations/alerts.md:46, docs/operations/alerts.md:67), while implemented metrics use kaiju_join_total and kaiju_join_latency_ms (src/ops/metrics.ts:92, src/ops/metrics.ts:123).
* tracing is a lightweight stub and not OpenTelemetry-integrated yet (src/ops/tracing.ts:1).

Status: Partially implemented

### 6) Incident Operations And Runbooks

Implementation evidence:

* docs/operations/incident-roles.md:12 onward defines IC/Ops/Dev/Comms role model.
* docs/operations/runbooks/index.md:8 provides alert-to-runbook mapping.
* docs/operations/runbooks/join-failure.md:1 provides actionable mitigation runbook.
* docs/operations/postmortem-template.md:1 provides standardized postmortem template.
* docs/operations/incident-review.md:14 defines weekly review cadence/checklist.
* ops/monitoring/alerts/service-alerts.yaml:18, :32, :46, :61, :73 include runbook pointers.

Gap evidence:

* docs/operations/epic-tracking.md acceptance requires at least one tabletop exercise, but no direct artifact in repository confirms execution evidence.

Status: Partially implemented

### 7) Security And Change Governance

Implementation evidence:

* src/ops/rate-limit.ts:25 implements in-memory token bucket limiter.
* src/ops/rate-limit.ts:54 returns 429 with retryAfterSeconds.
* src/index.ts:104 applies createMatchRateLimiter to POST /api/matches.
* src/index.ts:178 and src/index.ts:223 apply joinRateLimiter to join endpoints.
* docs/operations/security-controls.md:62 defines CI security scanning requirements.
* .github/workflows/ci.yml:25 defines security job.
* .github/workflows/ci.yml:36 runs npm audit --audit-level=high.
* .github/workflows/ci.yml:38 uses trufflesecurity/trufflehog.
* docs/operations/change-governance.md:14 defines deployment audit requirements.
* docs/operations/change-governance.md:30 defines configuration change governance.
* docs/operations/change-governance.md:54 defines incident linkage requirements.

Gap evidence:

* docs/operations/epic-tracking.md:52 includes security hardening scope (security headers), but no corresponding runtime middleware/header hardening evidence was found in src/index.ts.

Status: Partially implemented

## Implementation Status Summary

Harness points evidenced: 7 of 7

* Fully implemented: 1
  * Point 4 (Resiliency and session continuity)
* Mostly implemented: 1
  * Point 3 (Runtime configuration and feature control)
* Partially implemented: 5
  * Points 1, 2, 5, 6, 7
* Planned-only: 0 (all points have concrete implementation artifacts, but many are incomplete against policy intent)

Cross-check note:

* docs/operations/epic-tracking.md phase checklist still marks most phases unchecked (docs/operations/epic-tracking.md:48 through docs/operations/epic-tracking.md:53), which is inconsistent with repository implementation state.

## Integration Points And Reusable Patterns

### Reusable implementation patterns

* Central typed config singleton and fail-fast startup validation: src/ops/config.ts.
* Kill-switch pattern through config flags and early-return guards: src/game/MatchRoom.ts:412 and src/game/MatchRoom.ts:1229.
* Runtime drain-state as shared gate used by HTTP and room-join flow: src/ops/runtime-state.ts + src/index.ts + src/game/MatchRoom.ts.
* Minimal dependency in-process observability primitives (logger/metrics/tracing) to avoid vendor lock-in: src/ops/logger.ts, src/ops/metrics.ts, src/ops/tracing.ts.
* Alert-to-runbook linkage at rule level and index-level mapping: ops/monitoring/alerts/*.yaml and docs/operations/runbooks/index.md.
* Chaos/resilience scenarios codified as unit tests and mirrored in operational docs: src/game/MatchRoom.test.ts + docs/operations/chaos-reconnect-tests.md.

### Integration touchpoints

* Metrics pipeline: src/ops/metrics.ts -> src/index.ts / src/game/* -> ops/monitoring/alerts/*.yaml -> ops/monitoring/dashboards/slo-overview.json -> docs/operations/runbooks/index.md.
* Deployment governance pipeline: docs/operations/release-policy.md -> .github/workflows/deploy-production.yml -> ops/monitoring/alerts/release-gates.yaml -> scripts/rollback-drill.sh and docs/operations/rollback-drill.md.
* Security governance pipeline: src/ops/rate-limit.ts + src/index.ts endpoint middleware -> docs/operations/security-controls.md -> .github/workflows/ci.yml.
* Incident pipeline: alerts + runbook mappings -> docs/operations/incident-roles.md -> docs/operations/incident-review.md -> docs/operations/postmortem-template.md.

## Risks And Limitations

1. Metric contract drift between docs and code
   * docs/operations/alerts.md uses kaiju_join_attempts_total and kaiju_join_to_ready_duration_ms, while implemented telemetry and alerts use kaiju_join_total and kaiju_join_latency_ms.
   * Risk: incorrect dashboards/alerts if operators follow stale doc queries.

2. Progressive delivery control is policy-heavy but runtime-light
   * RELEASE_STAGE is parsed in config but not wired to request routing logic in runtime code.
   * deploy-production workflow and rollback drill still contain platform TODO placeholders.
   * Risk: rollout safety depends on manual operations, reducing reliability under incident pressure.

3. RELEASE_STAGE type mismatch with rollback policy
   * Docs/workflow include rollback stage; config only allows canary/stable.
   * Risk: configuration inconsistency and operator confusion.

4. Observability depth gap for SLO-B
   * Current histogram captures HTTP join processing, not true room ready latency.
   * Risk: SLO-B may under-represent end-to-end player experience.

5. Security hardening scope mismatch
   * Epic text references security headers in Phase 5, but no header middleware implementation evidence found.
   * Risk: incomplete hardening relative to intended baseline.

6. Operational validation evidence gap
   * No explicit repository artifact proving completed tabletop exercise or completed rollback drill execution in target environment.
   * Risk: process readiness may be assumed rather than demonstrated.

## Suggested Epic 10 Alignment Checks

1. Verify metric contract convergence before Epic 10 work starts
   * Align docs/operations/alerts.md query names with implemented metric names and SLO definitions.

2. Close progressive delivery control loop
   * Ensure RELEASE_STAGE semantics are consistent across src/ops/config.ts, docs/operations/release-policy.md, and .github/workflows/deploy-production.yml.
   * Replace deploy and rollback TODOs with platform-specific commands.

3. Validate true join-to-ready telemetry
   * Add room-ready instrumentation path and update SLO-B docs/alerts/dashboard queries accordingly.

4. Confirm governance-to-enforcement traceability
   * For each Epic 10 deliverable touching deployment/security, require explicit evidence path:
     docs policy -> code/workflow implementation -> alert/runbook mapping -> test or drill artifact.

5. Require operational proof artifacts in-repo
   * Record at least one rollback drill execution result and one incident/tabletop exercise artifact to support production-readiness claims.
