<!-- markdownlint-disable-file -->
# Task Research: Epic 10 Implementation Alignment

Research what is needed to implement Epic 10 in kaiju-arcade and ensure alignment with the existing 7-point production management harness.

## Task Implementation Requests

* Identify Epic 10 scope, requirements, and acceptance criteria from repository artifacts.
* Map Epic 10 implementation needs to the existing 7-point harness and identify gaps.
* Recommend one implementation approach aligned with current architecture and operations standards.

## Scope and Success Criteria

* Scope: Repository-internal discovery of Epic 10 definitions, current production harness implementation, and required implementation deltas.
* Assumptions: Epic 10 is documented in repository artifacts and the 7-point harness exists in current branch deliverables/docs.
* Success Criteria:
  * Epic 10 required capabilities are enumerated with source evidence.
  * Each capability is mapped to one or more harness points with gap status.
  * A selected implementation approach is provided with rationale, sequencing, and risks.

## Outline

1. Discover Epic 10 source artifacts and requirements.
2. Discover 7-point harness definitions and implemented components.
3. Build requirement-to-harness traceability matrix.
4. Evaluate implementation alternatives.
5. Select and justify one approach.

## Potential Next Research

* Confirm canonical runtime baseline for deployment images and workflows (Node 22 vs Node 24).
  * Reasoning: Epic 10 backlog and design docs reference Node 22, while CI/deploy workflows use Node 24.
  * Reference: .copilot-tracking/implementation-tasks.md:233, docs/multiplayer-game-design.md:220, .github/workflows/ci.yml:10
* Decide authoritative observability metric contract for SLO acceptance.
  * Reasoning: Docs and acceptance criteria reference legacy metric names while code/alerts use current names.
  * Reference: docs/operations/epic-tracking.md:70, docs/operations/alerts.md:46, src/ops/metrics.ts:92
* Confirm deployment ownership boundary (this repo vs external infra repo) for ACA manifests/commands.
  * Reasoning: Deploy workflow still contains TODO placeholders; completion depends on ownership model.
  * Reference: .github/workflows/deploy-production.yml:77

## Research Executed

### File Analysis

* .copilot-tracking/implementation-tasks.md
  * Epic 10 is defined as Deployment and Infrastructure, with 10.1-10.4 requirements around Docker, Azure Container Apps, observability, and secrets.
* docs/multiplayer-game-design.md
  * Deployment target requires ACA, sticky session support, KEDA scaling, and environment controls including CORS and monitor toggle.
* docs/operations/epic-tracking.md
  * 7-point harness and acceptance criteria define production gates Epic 10 must satisfy before closure.
* docs/operations/release-policy.md
  * Progressive rollout policy requires 5% > 25% > 100% stages plus rollback readiness.
* src/ops/config.ts
  * Startup validation and feature flags are implemented, but RELEASE_STAGE currently allows only canary/stable.
* src/index.ts
  * Health/readiness, drain behavior, rate-limiting middleware, and metrics endpoint are wired.
* src/ops/metrics.ts
  * Metrics contract in code differs from some policy/docs references.
* .github/workflows/deploy-production.yml
  * Deployment control flow exists but core platform commands are TODO placeholders.

### Code Search Results

* Epic 10 references
  * .copilot-tracking/implementation-tasks.md:230
  * IMPLEMENTATION-GUIDE.md:78
* Harness definition and acceptance
  * docs/operations/epic-tracking.md:31
  * docs/operations/epic-tracking.md:62
* Progressive delivery artifacts
  * docs/operations/release-policy.md:18
  * .github/workflows/deploy-production.yml:23
  * scripts/rollback-drill.sh:110
* Metrics naming contract points
  * docs/operations/alerts.md:46
  * docs/operations/slo-policy.md:124
  * src/ops/metrics.ts:92

### External Research

* Not required yet; focus is repository-grounded analysis.

### Project Conventions

* Standards referenced: 7-point production management harness and associated operations docs under docs/operations.
* Instructions followed: Task Researcher mode constraints

## Key Discoveries

### Project Structure

Epic 10 is an infrastructure-and-operations implementation epic that depends on runtime server behavior, deployment automation, and observability/runbook governance already introduced by the 7-point harness.

Control-plane artifacts live in docs and workflows:
* docs/operations/* policies and runbooks
* ops/monitoring/alerts/* and ops/monitoring/dashboards/*
* .github/workflows/deploy-production.yml

Data-plane implementation lives in source:
* src/index.ts HTTP endpoints, middleware, and process lifecycle
* src/ops/config.ts typed env/config validation
* src/ops/metrics.ts and src/ops/logger.ts observability primitives
* src/game/MatchRoom.ts gameplay-time resilience controls

### Implementation Patterns

* Fail-fast startup config validation via centralized typed parser in src/ops/config.ts.
* Operational feature controls through environment flags consumed in runtime paths.
* Drain-aware behavior shared between HTTP readiness and room join logic.
* Minimal observability stack (metrics/logger/tracing shim) wired to alerts/dashboards.
* Governance-first rollout model where policy docs define release gates and workflows execute gates.

### Complete Examples

```yaml
# From .github/workflows/deploy-production.yml
workflow_dispatch:
  inputs:
    release_stage:
      type: choice
      options: [canary, partial, stable, rollback]
```

```ts
// From src/ops/config.ts
const parsedReleaseStage = releaseStageSchema.safeParse(raw.RELEASE_STAGE ?? "stable");
// currently constrained to canary|stable in runtime config
```

```ts
// From src/index.ts
app.get("/health/ready", (_req, res) => {
  const state = getRuntimeState();
  res.status(state.readiness ? 200 : 503).json({ readiness: state.readiness ? "ready" : "draining" });
});
```

### API and Schema Documentation

Epic 10 implementation must satisfy these internal schema/contracts:
* Runtime configuration contract in src/ops/config.ts (required env vars in production).
* Observability metric names in src/ops/metrics.ts used by alert expressions in ops/monitoring/alerts/slo-burn-rate.yaml.
* Release stage contract in docs/operations/release-policy.md and docs/operations/production-config.md.

### Configuration Examples

```env
# Required for production startup validation (subset)
PORT=2567
HOST=0.0.0.0
NODE_ENV=production
METRICS_ENABLED=true
LOG_LEVEL=info
CREATE_MATCH_RATE_LIMIT_PER_MIN=20
JOIN_RATE_LIMIT_PER_MIN=60
FEATURE_DISPATCH_ENABLED=true
FEATURE_TICK_BROADCAST_ENABLED=true
RELEASE_STAGE=canary
```

## Technical Scenarios

### Epic 10 Alignment to 7-Point Harness

Epic 10 is the delivery mechanism that operationalizes harness controls in a deployable production environment. The current branch has strong harness groundwork but cannot yet close Epic 10 due to deployment automation and contract drift gaps.

Requirement-to-harness traceability:

1. Docker + ACR pipeline (Epic 10.1) -> Harness points 2, 3, 7
   * Needed for controlled promotions, immutable artifacts, and governed change audit.
   * Gap: Docker/ACR implementation artifacts are not complete in-repo and workflow commands are TODO.

2. ACA runtime configuration and scaling (Epic 10.2) -> Harness points 2, 3, 4
   * Needed for progressive rollout behavior, sticky sessions, and resilient session handling under scale/drain events.
   * Gap: progressive deployment policy exists, but executable traffic-shift commands are placeholders.

3. Monitoring/observability integration (Epic 10.3) -> Harness points 1, 5, 6
   * Needed to enforce SLO gates, trigger alerts, and operate runbooks.
   * Gap: metric naming/acceptance contract drift, plus missing explicit evidence for Colyseus Monitor and Application Insights integration.

4. Config and secrets hardening (Epic 10.4) -> Harness points 3, 7
   * Needed for startup fail-fast correctness, environment isolation, and secure operations.
   * Gap: CORS restrictions and production secret backend strategy are not fully evidenced in runtime code.

**Requirements:**

* Implement executable container build and push path for production images (Epic 10.1).
* Implement executable ACA rollout commands supporting stage progression and rollback (Epic 10.2).
* Harmonize RELEASE_STAGE semantics across docs/workflow/runtime config, including rollback handling.
* Harmonize observability metric contract across code, alerts, dashboard, and acceptance docs.
* Implement or explicitly document Colyseus monitor exposure policy and security controls.
* Implement or explicitly document CORS restrictions and secret management path for production.
* Produce operational proof artifacts for rollback drill and at least one incident exercise.

**Preferred Approach:**

* Policy-to-implementation closure approach: treat the 7-point harness as normative contract, close all code/workflow/document drifts, and finish Epic 10 by converting existing scaffolds into executable production controls.

```text
Phase A - Contract Unification
  - Normalize RELEASE_STAGE and metrics naming across docs/workflows/runtime.
  - Decide Node baseline and deployment ownership boundary.

Phase B - Deployment Execution
  - Add/validate Dockerfile + ACR tagging/push path.
  - Replace deploy-production workflow TODOs with ACA rollout commands.

Phase C - Ops Hardening
  - Implement CORS policy + monitor exposure controls.
  - Wire final observability sinks and validate release-gate alerts.

Phase D - Verification
  - Execute rollback drill and capture artifact.
  - Run canary->partial->stable gate simulation with evidence.
```

**Implementation Details:**

Selected approach details:

* Source of truth hierarchy
  * Production acceptance remains anchored to docs/operations/epic-tracking.md and release-policy.md.
  * Runtime/workflow/docs must converge to one contract rather than diverge by convenience.

* Epic 10 completion checklist aligned to harness
  * Point 1 (Reliability): confirm SLO metric names and end-to-end join-to-ready instrumentation path.
  * Point 2 (Progressive Delivery): replace workflow TODO commands and enforce gate checks at each stage.
  * Point 3 (Runtime Config): extend/align release stage enum and verify fail-fast semantics in production mode.
  * Point 4 (Resiliency): validate ACA deployment lifecycle preserves current drain+reconnect behavior.
  * Point 5 (Observability): keep /metrics contract and structured logging, align alert expressions.
  * Point 6 (Incident Ops): ensure runbooks map to actual alert labels and produce tabletop evidence.
  * Point 7 (Security/Governance): enforce CORS and secret controls; retain CI security gates and audit trail.

* Sequencing rationale
  * Resolve contract drifts first to avoid implementing the wrong deployment and telemetry surface.
  * Complete executable deployment second, because all remaining Epic 10 validation depends on a real target environment.
  * Finalize ops evidence last to satisfy acceptance gates with artifacts, not assumptions.

```text
Blocking decisions to finalize before implementation:
1) Node baseline: 22 vs 24
2) Authoritative metrics names for SLO acceptance
3) RELEASE_STAGE rollback runtime semantics
4) Infra ownership scope for ACA/ACR artifacts
```

#### Considered Alternatives

Alternative 1 (Rejected): Workflow-only completion
* Idea: keep existing runtime contracts as-is and only fill deployment workflow TODOs.
* Rejection reason: leaves release-stage and metric-contract drift unresolved; fails harness traceability and creates operational ambiguity.

Alternative 2 (Rejected): Runtime-first refactor before deployment
* Idea: prioritize deep runtime changes (telemetry model, tracing backend, security hardening) before enabling deploy path.
* Rejection reason: increases scope/risk and delays proving progressive delivery mechanics required by Epic 10.

Alternative 3 (Selected): Contract-unify then execute deployment and ops verification
* Idea: first reconcile contract drifts, then make deploy path executable, then produce evidence artifacts.
* Selection reason: minimizes rework, directly addresses Epic 10 blockers, and maps cleanly to all 7 harness points.
