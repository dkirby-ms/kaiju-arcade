---
title: "Epic 10 Requirements Research"
description: "Repository-grounded research of Epic 10 requirements, acceptance criteria, dependencies, risks, and implementation implications for kaiju-arcade."
ms.date: 2026-06-25
ms.topic: reference
---

## Scope

Research focus: discover Epic 10 requirements, scope, acceptance criteria, and implementation-relevant details from repository artifacts only.

In scope:
* Epic 10 definition and task breakdown
* Related operations epic acceptance criteria that constrain deployment/infrastructure work
* Current implementation coverage in backend, workflows, and ops docs
* Gaps, dependencies, risks, and unresolved ambiguities

Out of scope:
* External standards beyond what is already captured in this repository
* Code changes outside this research file

## Evidence Log

High-signal Epic 10 source artifacts:
* .copilot-tracking/implementation-tasks.md:230 defines Epic 10 as Deployment and Infrastructure.
* .copilot-tracking/implementation-tasks.md:232-253 defines Features 10.1-10.4 and Tasks 10.1.1-10.4.3 (Docker, ACA config, observability, config/secrets).
* docs/multiplayer-game-design.md:213-222 defines hosting target as Azure Container Apps, sticky sessions, Node 22 alpine Dockerfile, and ACR.
* docs/multiplayer-game-design.md:239 defines KEDA HTTP scaler behavior.
* docs/multiplayer-game-design.md:251-252 defines COLYSEUS_MONITOR_ENABLED and CORS_ORIGIN runtime vars.
* IMPLEMENTATION-GUIDE.md:78 names Epic 10 as Deployment and Infrastructure (Azure Container Apps).
* DELIVERABLES.md:96 tracks Epic 10 with Epic 11 in deployment and validation phase.

Operations epic constraints relevant to Epic 10:
* docs/operations/epic-tracking.md:62-74 defines seven acceptance criteria that materially overlap Epic 10 implementation (SLOs, graceful shutdown, progressive delivery, startup config validation, observability, rate limits, incident runbooks).
* docs/operations/release-policy.md:20-44 defines 5% > 25% > 100% rollout stages and gates.
* docs/operations/release-policy.md:82 defines rollback via RELEASE_STAGE=rollback + previous stable image.
* docs/operations/production-config.md:73 declares RELEASE_STAGE values canary/stable/rollback.
* docs/operations/slo-policy.md:124-141 documents current instrumentation and notes gap between documented end-to-end metric and implemented HTTP-only latency metric.

Current backend/workflow implementation evidence:
* src/index.ts:63,68,82 implement /health/live, /health/ready, /metrics.
* src/index.ts:104,178 apply rate limit middleware to POST /api/matches and POST /api/matches/:roomId/kaiju-join.
* src/index.ts:279 implements SIGTERM drain behavior using DRAIN_TIMEOUT_MS.
* src/ops/config.ts:12-24 defines typed config for deployment-related vars (PORT/HOST/NODE_ENV/METRICS/limits/RELEASE_STAGE/feature flags).
* src/ops/config.ts:29 restricts RELEASE_STAGE to canary/stable only.
* src/ops/config.ts:95,99 default bind is PORT 3000 and HOST localhost.
* src/ops/metrics.ts:81 and 111 register kaiju_join_total and kaiju_join_latency_ms (not kaiju_join_attempts_total or kaiju_join_to_ready_duration_ms).
* .github/workflows/deploy-production.yml:77,101,111,117,162,186,194,199 contain unresolved TODO placeholders for image build/push and platform rollout commands.
* .github/workflows/deploy-production.yml:42 sets NODE_VERSION=24 for deploy workflow.
* .github/workflows/ci.yml uses Node 24 for lint/build/test.

Runbook/alert readiness evidence:
* docs/operations/runbooks/index.md:10-15 maps core alerts to runbooks.
* ops/monitoring/alerts/release-gates.yaml:19-27 and 48-56 define rollback-trigger alerts for join failures and disconnect spikes.
* ops/monitoring/alerts/slo-burn-rate.yaml:19-27 and 70-79 use kaiju_join_total and kaiju_join_latency_ms metrics.

## Discovered Requirements

### Explicit Requirements (directly documented)

Epic 10 backlog requirements from implementation plan:
* Docker and container image:
  * Create Dockerfile based on Node.js 22 LTS alpine, expose port 2567, integrate with ACR, and support push/pull workflow.
  * Evidence: .copilot-tracking/implementation-tasks.md:233-236, docs/multiplayer-game-design.md:220-222
* Azure Container Apps configuration:
  * Sticky sessions for WebSocket affinity.
  * Autoscaling via KEDA HTTP scaler with scale-to-zero behavior.
  * Ingress/port exposure for Colyseus.
  * Environment variable configuration for runtime controls.
  * Evidence: .copilot-tracking/implementation-tasks.md:239-242, docs/multiplayer-game-design.md:216,239
* Monitoring and observability:
  * Colyseus monitor endpoint, server-side logging, Azure Application Insights integration, health endpoint.
  * Evidence: .copilot-tracking/implementation-tasks.md:245-248
* Configuration and secrets:
  * Environment-based config, restrictive CORS origin config, secret management.
  * Evidence: .copilot-tracking/implementation-tasks.md:251-253, docs/multiplayer-game-design.md:252

Ops acceptance constraints that Epic 10 must satisfy before production completion:
* Progressive rollout must run with 5% > 25% > 100% gates and rollback rehearsal.
* Startup config must fail fast on malformed/missing required vars.
* Metrics and logging contract must be met.
* Join/create endpoints must enforce configurable per-IP rate limits.
* Incident runbooks/tabletop evidence must exist.
* Evidence: docs/operations/epic-tracking.md:66-74

### Inferred Implications (not stated as direct Epic 10 tasks, but required to make explicit requirements viable)

* Backend implication:
  * Because runtime currently returns wsEndpoint from HOST and PORT, production behind ACA ingress likely requires externally routable host derivation or relative WS strategy; localhost defaults are incompatible with container ingress if misconfigured.
  * Evidence: src/index.ts:135,206,251 and src/ops/config.ts:95,99
* Backend implication:
  * RELEASE_STAGE implementation must include rollback branch in typed config and rollout logic, because docs/workflow use rollback stage.
  * Evidence: docs/operations/production-config.md:73 vs src/ops/config.ts:29
* Ops implication:
  * Deployment workflow cannot satisfy Epic 10 completion while platform commands remain TODO placeholders.
  * Evidence: .github/workflows/deploy-production.yml:77,101,111,117,162,186,194,199
* Observability implication:
  * Metric name/schema contract must be unified across docs, alerts, and implementation to avoid false dashboards/alerts.
  * Evidence: docs/operations/epic-tracking.md:70, docs/operations/slo-policy.md:27,58,141, src/ops/metrics.ts:81,111
* Frontend implication:
  * CORS and origin restrictions need explicit trusted origin list to support commander, kaiju, and lobby pages in deployed topology.
  * Evidence: .copilot-tracking/implementation-tasks.md:252 and docs/multiplayer-game-design.md:252
* Testing implication:
  * Epic 10 requires deployment-gate and rollback verification evidence, not just unit tests.
  * Evidence: docs/operations/release-policy.md:160-178 and docs/operations/epic-tracking.md:66,74

### Concrete Implementation Implications by Area

Backend:
* Add container-first runtime binding convention (HOST=0.0.0.0, production PORT alignment with ACA ingress).
* Add RELEASE_STAGE rollback compatibility in config and any stage guard logic.
* Implement CORS restriction middleware and optional Colyseus monitor route toggle.
* Add Application Insights/OpenTelemetry exporter wiring if Azure observability is required.

Frontend:
* Verify browser Colyseus connection path through ACA ingress and sticky affinity behavior.
* Validate client behavior under rollout, reconnect, and drain windows.
* Ensure configured CORS origin set matches deployed commander/kaiju/lobby origins.

Ops:
* Provide real container build/push path (Dockerfile + ACR credentials + image tags).
* Replace deploy workflow TODOs with ACA-native deployment commands and weighted rollout mechanism.
* Ensure alert rules, runbooks, and release gate checks are wired to live telemetry and approvals.

Testing:
* Add deployment validation checks for readiness/liveness, drain behavior, and rollback command execution.
* Add observability contract tests (metrics endpoint enabled/disabled behavior and required metric names).
* Add canary gate test protocol for 5/25/100 progression and rollback trigger conditions.

## Acceptance Criteria

### Explicit Acceptance Criteria (documented)

From docs/operations/epic-tracking.md:62-74, relevant to Epic 10 completion:
1. SLO-A and SLO-B measured with dashboards and burn-rate alerts.
2. Graceful shutdown verified within DRAIN_TIMEOUT_MS.
3. Progressive delivery enforced (5/25/100) and rollback drill completed.
4. Runtime configuration validated at startup with feature-flag E2E test.
5. Observability contract met (/metrics + required metrics + structured logs).
6. Rate limiting active on create/join endpoints with env-based config.
7. Incident operations documented and exercised (runbooks + tabletop).

### Current Satisfaction Snapshot (evidence-backed)

Partially satisfied:
* Health endpoints/readiness/drain and rate-limit middleware exist.
  * Evidence: src/index.ts:63,68,104,178,279
* Typed env config validation exists.
  * Evidence: src/ops/config.ts:61-168
* SLO/burn-rate alert rules and runbook index exist as artifacts.
  * Evidence: ops/monitoring/alerts/slo-burn-rate.yaml, docs/operations/runbooks/index.md

Not yet satisfied for Epic 10 closure:
* Dockerfile and ACR integration artifacts not present in repository root.
* ACA deployment workflow has unresolved TODO placeholders for platform-specific deployment.
* Colyseus monitor endpoint implementation is not present in backend.
* Application Insights integration not found in backend/workflows.
* CORS-origin enforcement not found in backend middleware.
* Metrics naming mismatch with acceptance language and SLO doc schema remains unresolved.

## Dependencies

Primary dependencies to complete Epic 10:
* Deployment platform decision finalization (actual ACA command path and weighted traffic mechanism).
* Container artifact chain (Dockerfile, image tagging strategy, ACR auth path).
* Runtime contract alignment (port/host/env vars consistent across code and docs).
* Observability contract alignment (metric names in code, SLO docs, and Prometheus rules).
* Security/governance controls (CORS policy, secrets path, release approvals, rollback authority).
* Incident operations maturity (tabletop execution evidence and runbook usage proof).

Cross-epic dependencies:
* Epic 11 Testing and Validation for acceptance verification gates.
* Existing operations harness artifacts in docs/operations for release and incident controls.

## Risks

High risk:
* Deployment non-executability risk: rollout workflow is mostly scaffolded with TODOs, so production promotion/rollback cannot be reliably executed yet.
  * Evidence: .github/workflows/deploy-production.yml:77,101,111,117,186,194
* Contract mismatch risk: docs require rollback release stage but config only allows canary/stable.
  * Evidence: docs/operations/production-config.md:73 vs src/ops/config.ts:29
* Observability correctness risk: acceptance/docs call for metric names not currently emitted.
  * Evidence: docs/operations/epic-tracking.md:70, docs/operations/slo-policy.md:27,58, src/ops/metrics.ts:81,111

Medium risk:
* Runtime endpoint risk behind ingress due to wsEndpoint derivation from HOST/PORT and localhost defaults.
  * Evidence: src/index.ts:135,206,251 and src/ops/config.ts:95,99
* Version baseline drift risk: Epic text specifies Node 22 container baseline while CI/deploy workflows currently run Node 24.
  * Evidence: .copilot-tracking/implementation-tasks.md:233, docs/multiplayer-game-design.md:220, .github/workflows/ci.yml:10, .github/workflows/deploy-production.yml:42

Operational risk:
* Acceptance requires rollback drill and tabletop execution evidence, which may be process-complete but not yet implementation-linked to ACA commands.
  * Evidence: docs/operations/epic-tracking.md:66,74 and docs/operations/rollback-drill.md:32

## Open Questions

Blocking ambiguities:
* Should Epic 10 target Node 22 (as specified in tasks/design) or align to current Node 24 workflow baseline?
* What exact ACA rollout mechanism will implement 5/25/100 traffic split and sticky session behavior?
* Should RELEASE_STAGE=rollback be a required runtime config enum in server code now, or managed only by deployment pipeline variables?
* Which metric names are authoritative for SLO-A/SLO-B acceptance: kaiju_join_total/kaiju_join_latency_ms or kaiju_join_attempts_total/kaiju_join_to_ready_duration_ms?
* Is Colyseus monitor (/colyseus) required in production behind auth/IP restrictions, or only for staging/ops environments?
* What is the chosen secrets backend for production (ACA secrets, Key Vault, or another path), and what secret inventory is required now versus deferred?

Non-blocking clarifications:
* What is the canonical external websocket endpoint strategy (derived host vs same-origin WS) for deployed clients?
* What evidence artifact format is required to mark rollback drill and tabletop acceptance as complete?
