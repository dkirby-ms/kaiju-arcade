<!-- markdownlint-disable-file -->
# Implementation Details: Production Management Harness

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/production-management-harness-research.md, package.json, src/index.ts, src/game/MatchRoom.ts, src/game/GameLoop.ts, /memories/repo/kaiju-arcade-notes.md.

## Implementation Phase 0: Production Baseline and Scope Lock

<!-- parallelizable: false -->

### Step 0.1: Define production environment contract and required environment variables

Create a versioned operations contract document that defines required environment variables and default values for runtime behavior, telemetry toggles, and release controls.

Files:
* docs/operations/production-config.md - canonical variable contract and examples.
* src/index.ts - required env loading points and startup checks entry.
* package.json - optional helper script for config validation.

Discrepancy references:
* Addresses DR-01 by turning suggested controls into enforceable runtime contract.

Success criteria:
* Required env vars are explicitly listed with owner and fallback policy.
* Missing required vars cause startup failure in production mode.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 96-117) - Runtime Configuration and Feature Control controls.

Dependencies:
* None.

### Step 0.2: Establish first operational scope for SLO-A and SLO-B definitions

Write an SLO scope specification that defines request boundaries for join success and join-to-ready latency, including measurement window and exclusions.

Files:
* docs/operations/slo-policy.md - SLO definitions, SLI formulas, error budget cadence.
* docs/operations/alerts.md - initial burn-rate and threshold design.

Success criteria:
* SLO-A and SLO-B formulas are documented in measurable terms.
* Alert thresholds and windows are listed for implementation.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 82-95) - reliability objectives.

Dependencies:
* Step 0.1 completion for config field naming consistency.

### Step 0.3: Record rollout assumptions and rollback authority model

Define the release decision chain, who can pause rollout, and what conditions trigger immediate rollback.

Files:
* docs/operations/release-policy.md - rollout stages, gates, and ownership.
* docs/operations/incident-roles.md - incident command and deployment authority.

Success criteria:
* Rollback authority and escalation route are explicit.
* Gate conditions are mapped to observable metrics.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 89-95, 118-134) - progressive delivery + incident controls.

Dependencies:
* Step 0.2 completion for SLO-linked gate thresholds.

## Implementation Phase E: Epic Tracking Issue Creation

<!-- parallelizable: false -->

### Step E.1: Create GitHub epic issue to track the full seven-point harness implementation

Open a new GitHub issue in this repository labeled as an epic for operational work, with scope summary, phased checklist, dependencies, and acceptance criteria mapped to the seven harness points.

Files:
* .copilot-tracking/plans/2026-06-25/production-management-harness-implementation-plan.instructions.md - source of phased checklist.
* .copilot-tracking/plans/logs/2026-06-25/production-management-harness-implementation-log.md - source of follow-on work and implementation paths.

Discrepancy references:
* Addresses DR-01 by making epic creation an explicit executable step.

Success criteria:
* Epic issue exists in dkirby-ms/kaiju-arcade with a stable URL and issue number.
* Epic description includes all implementation phases and links to planning artifacts.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 76-80, 170-178) - selected approach and seven-point scope.

Dependencies:
* Implementation plan and planning log complete.

### Step E.2: Add issue link, labels, and ownership evidence to planning artifacts

Record epic metadata (issue number, URL, labels, owner) in planning outputs and verify it is visible to implementation contributors.

Files:
* .copilot-tracking/plans/logs/2026-06-25/production-management-harness-implementation-log.md - append tracking metadata.

Success criteria:
* Planning log includes issue URL and ownership metadata.
* Labels include epic + operations scope for queue routing.

Context references:
* user request in current conversation - explicit requirement to create a new epic issue.

Dependencies:
* Step E.1 completion.

## Implementation Phase 1: Reliability Objectives and Error Budget Policy

<!-- parallelizable: true -->

### Step 1.1: Add SLI instrumentation points for join success and join-to-ready latency

Instrument server create/join/joinById paths and room readiness transitions so both success counters and latency histograms can be emitted.

Files:
* src/index.ts - wrap `/api/matches`, `/api/matches/:roomId/join`, `/api/matches/:roomId/kaiju-join` with outcome + duration metrics hooks.
* src/game/MatchRoom.ts - emit ready transition marker for latency completion.
* src/ops/metrics.ts - centralized metric registration and helper functions.

Discrepancy references:
* Addresses DR-02 regarding missing direct instrumentation plan for SLO math.

Success criteria:
* Join success/failure events are emitted with stable labels.
* Join-to-ready latency can be computed from emitted events or direct histogram observation.

Context references:
* src/index.ts (existing API handlers) - join/create paths.
* src/game/MatchRoom.ts (phase transitions) - readiness completion boundary.

Dependencies:
* Step 0.2 completion.

### Step 1.2: Implement SLO dashboards and burn-rate alert definitions

Build initial dashboard and alert artifacts that convert SLI signals into 30-day SLO views and short/long burn-rate alert pairs.

Files:
* ops/monitoring/dashboards/slo-overview.json - dashboard definitions.
* ops/monitoring/alerts/slo-burn-rate.yaml - burn-rate alert policies.

Success criteria:
* Dashboard visualizes SLO-A and SLO-B objective attainment.
* Alert policy includes at least two burn-rate windows per SLO.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 82-88) - target objectives and acceptance criteria.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Codify release freeze trigger when error budget is exhausted

Tie release policy to error budget consumption and define freeze/unfreeze mechanics.

Files:
* docs/operations/release-policy.md - freeze policy details.
* .github/workflows/deploy-production.yml - gate check before promotion step.

Success criteria:
* Policy states objective trigger and escalation path.
* Deployment workflow can enforce a freeze check.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 82-88) - error budget policy requirement.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate phase changes

Validation commands:
* npm run lint - lint server instrumentation additions.
* npm run build - compile TypeScript changes.
* npm test -- --runInBand - verify join/room behavior stability.

## Implementation Phase 2: Progressive Delivery and Rollback Safety

<!-- parallelizable: true -->

### Step 2.1: Create staged rollout workflow (5% -> 25% -> 100%) with health windows

Implement deployment workflow stages that progressively increase traffic/instance exposure with timed evaluation checkpoints.

Files:
* .github/workflows/deploy-production.yml - staged deploy sequencing.
* docs/operations/release-policy.md - stage gate and observation windows.

Discrepancy references:
* Addresses DR-03 by converting staged rollout recommendation into workflow mechanics.

Success criteria:
* Workflow has explicit stage transitions and wait/evaluate windows.
* Stage promotion can be paused manually or by gate checks.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 89-95) - 5/25/100 rollout and windows.

Dependencies:
* Phase 1 completion.

### Step 2.2: Implement rollback gate conditions tied to join failure/disconnect spikes

Define and wire rollback triggers that automatically halt or revert when service health exceeds risk thresholds.

Files:
* .github/workflows/deploy-production.yml - rollback conditions.
* ops/monitoring/alerts/release-gates.yaml - deployment-time gate rules.
* docs/operations/release-policy.md - operator instructions.

Success criteria:
* Rollback triggers include join failures and disconnect anomalies.
* Operators can execute rollback using one documented command or workflow dispatch.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 89-95) - rollback conditions.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Add rollback drill script and staging rehearsal checklist

Create a repeatable monthly drill for rollback validation and recovery time measurement.

Files:
* scripts/rollback-drill.sh - scripted staging drill routine.
* docs/operations/rollback-drill.md - checklist and evidence template.

Success criteria:
* Drill covers trigger, rollback, and verification steps.
* Recovery duration is measured and compared to target (<10 min).

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 95, 213-217) - rollback drill acceptance target.

Dependencies:
* Step 2.2 completion.

## Implementation Phase 3: Runtime Configuration and Feature Control

<!-- parallelizable: true -->

### Step 3.1: Introduce typed startup configuration schema and fail-fast validation

Add a typed configuration loader that validates required variables at process startup and exposes strongly typed configuration to server modules.

Files:
* src/ops/config.ts - schema + parser implementation.
* src/index.ts - replace direct process.env reads with typed config access.
* src/game/MatchRoom.ts - consume feature controls from config.

Discrepancy references:
* Addresses DR-01 by adding concrete implementation path for startup validation.

Success criteria:
* Invalid configuration causes non-zero process exit before server start.
* Config values are centralized and not duplicated across modules.

Context references:
* src/index.ts (HOST/PORT env usage).
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 96-103) - startup schema validation requirement.

Dependencies:
* Phase 0 completion.

### Step 3.2: Add emergency feature flags for high-risk gameplay and dispatch flows

Create runtime flag checks for gameplay paths that may need immediate shutdown during incidents.

Files:
* src/game/MatchRoom.ts - gate selected message handlers and dispatch behavior.
* src/messages/protocol.ts - maintain server-side validation even when feature flags disable execution.
* docs/operations/feature-flags.md - emergency flag usage guide.

Success criteria:
* At least one high-risk flow can be disabled without code redeploy.
* Disabled behavior returns safe, structured response to clients.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 103-105) - kill-switch requirement.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Document config matrix for local/staging/production

Publish environment-specific defaults, required overrides, and safe operating values.

Files:
* docs/operations/production-config.md - matrix table and examples.
* .env.example - non-secret defaults and required keys list.

Success criteria:
* Matrix includes all required runtime controls and default behavior.
* Documentation distinguishes secret vs non-secret values.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 69-80) - suggested configuration set.

Dependencies:
* Step 3.2 completion.

## Implementation Phase 4: Resiliency and Session Continuity

<!-- parallelizable: false -->

### Step 4.1: Split health endpoints into liveness and readiness semantics

Implement dedicated liveness and readiness routes so deployment systems can drain safely without killing healthy but draining nodes.

Files:
* src/index.ts - add `/health/live` and `/health/ready` endpoints, retain `/health` compatibility route.
* src/ops/runtime-state.ts - process state for readiness/drain flags.

Discrepancy references:
* Addresses DR-04 by specifying concrete endpoint-level implementation for probe split.

Success criteria:
* Readiness returns failing status during drain mode.
* Liveness remains healthy unless process is degraded.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 106-111) - health split recommendation.

Dependencies:
* Step 3.1 completion.

### Step 4.2: Add graceful SIGTERM drain mode that rejects new allocations while preserving reconnects

On termination signal, stop accepting new match allocations and room joins while allowing a bounded in-flight drain for active sessions/reconnects.

Files:
* src/index.ts - SIGTERM hook and drain state transitions.
* src/game/MatchRoom.ts - enforce join restrictions during drain.
* docs/operations/drain-procedure.md - operator procedure and timeout values.

Success criteria:
* New joins are rejected during drain with clear error payload.
* Existing sessions/reconnect attempts are honored for configured drain timeout.

Context references:
* src/game/MatchRoom.ts reconnect logic and room capacity handling.
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 106-112) - drain behavior requirements.

Dependencies:
* Step 4.1 completion.

### Step 4.3: Add reconnect and capacity chaos scenarios for token refresh/expiry/full room

Add test coverage and operational checks for reconnect token and room-capacity failure paths.

Files:
* src/game/MatchRoom.test.ts - new reconnect/capacity scenarios.
* docs/operations/chaos-reconnect-tests.md - chaos test scripts and expected outcomes.

Success criteria:
* Tests cover token refresh validity, expired token rejection, and capacity-full joins.
* Reconnect success rate SLI is measurable from generated events.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 111-114, 52-54) - reconnect complexity focus.

Dependencies:
* Step 4.2 completion.

### Step 4.4: Validate phase changes

Validation commands:
* npm run lint - ensure new runtime-state and room logic passes lint.
* npm run build - compile updated server/room logic.
* npm test -- MatchRoom --runInBand - verify resiliency behavior.

## Implementation Phase 5: Observability and Telemetry Contract

<!-- parallelizable: false -->

### Step 5.1: Implement structured JSON logging with deployment and correlation fields

Replace ad hoc logs with structured entries that include trace/correlation IDs and deployment metadata without leaking sensitive session identifiers.

Files:
* src/ops/logger.ts - structured logger utility.
* src/index.ts - HTTP/API logging integration.
* src/game/MatchRoom.ts - lifecycle and reconnection logs with safe fields.

Discrepancy references:
* Addresses DR-05 by defining explicit logging implementation and privacy constraints.

Success criteria:
* Key server events log as JSON with consistent schema.
* No PII or raw reconnect tokens are logged.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 115-117) - logging requirements.

Dependencies:
* Phase 4 completion.

### Step 5.2: Add core Prometheus metrics for joins, disconnects, tick timing, active rooms, and active players

Introduce a metric registry and export endpoint or push integration with stable naming and bounded labels.

Files:
* src/ops/metrics.ts - metric registry and definitions.
* src/index.ts - metrics endpoint wiring.
* src/game/GameLoop.ts - tick duration instrumentation.
* src/game/MatchRoom.ts - active room/player and disconnect counters.

Success criteria:
* Metrics names match research contract and Prometheus conventions.
* No high-cardinality labels (user/session IDs) are emitted.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 116-117, 158-164) - metric set and constraints.

Dependencies:
* Step 5.1 completion.

### Step 5.3: Add tracing spans for create/join/reconnect paths

Instrument server workflows with traces spanning API request entry through room transition and reconnect completion.

Files:
* src/ops/tracing.ts - tracing bootstrap and helpers.
* src/index.ts - span boundaries around seat reservation endpoints.
* src/game/MatchRoom.ts - reconnect and phase transition spans.

Success criteria:
* Traces are generated for create/join/reconnect code paths.
* Spans include error status when operations fail.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 117, 165-167) - tracing requirement.

Dependencies:
* Step 5.2 completion.

### Step 5.4: Build runbook-linked alert routing for telemetry signals

Ensure each alert includes immediate operator actions and links to the relevant runbook section.

Files:
* ops/monitoring/alerts/service-alerts.yaml - alert definitions with runbook links.
* docs/operations/runbooks/index.md - alert-to-runbook mapping table.

Success criteria:
* Every critical alert references one runbook path.
* Alert severities align with on-call response expectations.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 167-168) - alert mapping requirement.

Dependencies:
* Step 5.3 completion.

## Implementation Phase 6: Incident Operations and Runbooks

<!-- parallelizable: true -->

### Step 6.1: Create incident response runbook for join failures and reconnect storms

Author actionable diagnostics and mitigation workflows for the two highest-risk user-facing failure modes.

Files:
* docs/operations/runbooks/join-failure.md - triage and mitigation workflow.
* docs/operations/runbooks/reconnect-storm.md - diagnostic workflow and fallback actions.

Success criteria:
* Runbooks include trigger, diagnosis, mitigation, rollback, and comms sections.
* On-call can execute runbook without implementation-team escalation for first response.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 118-124).

Dependencies:
* Phase 5 completion.

### Step 6.2: Create runbook for tick lag drift and match start deadlocks

Document procedures for timing drift and lifecycle deadlock handling, including temporary feature flag usage and controlled restarts.

Files:
* docs/operations/runbooks/tick-lag-drift.md - loop health workflow.
* docs/operations/runbooks/match-start-deadlock.md - phase transition incident workflow.

Success criteria:
* Runbooks define concrete telemetry queries and decision thresholds.
* Fallback actions are ordered from lowest to highest user impact.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 124-126).

Dependencies:
* Step 6.1 completion.

### Step 6.3: Establish incident review cadence and postmortem template

Codify weekly operational review and required post-incident documentation quality.

Files:
* docs/operations/incident-review.md - weekly review checklist.
* docs/operations/postmortem-template.md - standardized incident report template.

Success criteria:
* Postmortem template includes timeline, root cause, contributing factors, actions, and owners.
* Review cadence and participants are explicitly defined.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 126-127).

Dependencies:
* Step 6.2 completion.

## Implementation Phase 7: Security and Change Governance

<!-- parallelizable: true -->

### Step 7.1: Add public endpoint rate-limiting and abuse thresholds

Protect public matchmaking endpoints against abusive traffic patterns while preserving legitimate gameplay joins.

Files:
* src/index.ts - route-level rate limiting middleware.
* src/ops/rate-limit.ts - policy definitions and helper utilities.
* docs/operations/security-controls.md - thresholds and tuning guidance.

Discrepancy references:
* Addresses DR-06 by defining concrete abuse controls for join endpoints.

Success criteria:
* Public join/create routes enforce configurable per-IP or token bucket limits.
* Rate-limit responses are structured and observable.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 128-134).

Dependencies:
* Phase 0 completion.

### Step 7.2: Add CI dependency and secret scanning checks

Introduce automated checks in CI to detect vulnerable dependencies and leaked secrets before deployment.

Files:
* .github/workflows/ci.yml - dependency and secret scanning stages.
* docs/operations/security-controls.md - remediation SLA and triage workflow.

Success criteria:
* CI fails on critical vulnerability and verified secret leak detections.
* Remediation SLA is documented and enforceable.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 131-134).

Dependencies:
* Step 7.1 completion.

### Step 7.3: Add deployment/config/audit trail requirements and evidence capture

Create auditable records for deployment decisions, configuration changes, and incident-linked operational actions.

Files:
* docs/operations/change-governance.md - audit trail requirements.
* docs/operations/release-policy.md - evidence capture checklist.

Success criteria:
* Every production deployment captures approver, change scope, and rollback evidence.
* Configuration changes are traceable to ticket/issue references.

Context references:
* .copilot-tracking/research/2026-06-25/production-management-harness-research.md (Lines 131-134).

Dependencies:
* Step 7.2 completion.

## Implementation Phase 8: Validation

<!-- parallelizable: false -->

### Step 8.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm run build
* npm test -- --runInBand

### Step 8.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 8.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* Node.js 24+ runtime and npm 11+.
* Deployment platform support for readiness/liveness probes and staged rollout.
* Metrics/logging backend integrations.
* GitHub workflow permissions for deployment and CI security controls.

## Success Criteria

* The seven harness domains are implementable through concrete file-level tasks.
* Final validation commands are executable in repository toolchain.
* Operational documents and workflows provide implementation-ready guidance.
