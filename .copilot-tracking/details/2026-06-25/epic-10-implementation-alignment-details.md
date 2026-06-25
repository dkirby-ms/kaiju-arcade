<!-- markdownlint-disable-file -->
# Implementation Details: Epic 10 Implementation Alignment

## Context Reference

Sources: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md, .copilot-tracking/implementation-tasks.md, docs/operations/epic-tracking.md, docs/operations/release-policy.md, src/ops/config.ts, src/ops/metrics.ts, .github/workflows/deploy-production.yml.

## Implementation Phase 1: Contract Unification

<!-- parallelizable: false -->

### Step 1.1: Normalize release stage contract across docs, workflow, and runtime

Align RELEASE_STAGE semantics so docs, runtime validation, and deployment workflow all support the same stage set (`canary`, `partial`, `stable`, `rollback`) and rollback handling behavior.

Files:
* src/ops/config.ts - extend release stage parser and runtime fallback rules.
* .github/workflows/deploy-production.yml - align dispatch input and gate logic with runtime stage enum.
* docs/operations/release-policy.md - use the same stage contract and definitions.
* docs/operations/production-config.md - update environment variable contract for RELEASE_STAGE.

Discrepancy references:
* Addresses DR-01.

Success criteria:
* A single release stage vocabulary exists across runtime, workflow, and docs.
* Rollback semantics are explicitly defined in runtime and deployment policy.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 124-128) - release stage parser mismatch evidence.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 187-190) - required release stage harmonization.

Dependencies:
* None.

### Step 1.2: Harmonize observability metric contract for SLO acceptance

Reconcile metric names and acceptance criteria across code, alert rules, dashboard visuals, and operations policy so SLO gates evaluate the same signals.

Files:
* src/ops/metrics.ts - canonical metric names and labels.
* ops/monitoring/alerts/slo-burn-rate.yaml - use canonical names in alert expressions.
* ops/monitoring/dashboards/slo-overview.json - use canonical names in panels.
* docs/operations/alerts.md - update documented alert metric names.
* docs/operations/slo-policy.md - update SLI/SLO contract names and formulas.
* docs/operations/epic-tracking.md - align Epic 10 acceptance wording with canonical metrics.

Discrepancy references:
* Addresses DR-02.

Success criteria:
* No drift remains between metric names used in code, alerts, dashboards, and policy docs.
* SLO gate checks can be executed from one documented metric contract.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 34-37) - naming drift evidence.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 189-191) - explicit harmonization requirement.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Resolve baseline and ownership decisions before infrastructure coding

Finalize the Node runtime baseline and deployment ownership boundary to prevent implementing Docker/ACA changes against conflicting assumptions.

Files:
* docs/operations/change-governance.md - record final architecture decisions and ownership.
* docs/operations/production-config.md - record Node baseline and compatibility note.
* .copilot-tracking/plans/logs/2026-06-25/epic-10-implementation-alignment-log.md - close DR-03 and DR-04 when resolved.

Discrepancy references:
* Addresses DR-03.
* Addresses DR-04.

Success criteria:
* Node baseline decision is documented with rationale.
* Deployment ownership model is documented and referenced by implementation phases.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 31-33) - Node baseline conflict.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 37-39) - deployment ownership gap.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 239-245) - blocking decisions list.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate phase changes

Run lint/build checks after contract changes land.

Validation commands:
* npm run lint - verify docs/yaml/json/code references and TypeScript contract updates.
* npm run build - verify runtime config and metrics compile.

## Implementation Phase 2: Deployment Execution

<!-- parallelizable: false -->

### Step 2.1: Implement executable container build and push path

Add or validate Docker and registry automation so production images can be built, tagged, and pushed as immutable artifacts.

Files:
* Dockerfile - production image definition.
* .github/workflows/deploy-production.yml - build/push commands and artifact tagging strategy.
* docs/operations/release-policy.md - image promotion rules and tag policy.

Discrepancy references:
* Addresses DR-05.

Success criteria:
* Production image build and push steps are executable without TODO placeholders.
* Artifact tags map clearly to release stages and rollback targets.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 169-172) - Docker/ACR gap.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 187-188) - executable build/push requirement.

Dependencies:
* Implementation Phase 1 completion.

### Step 2.2: Replace ACA rollout placeholders with staged rollout commands

Implement real ACA deployment and traffic-shift commands that support canary to partial to stable progression and rollback.

Files:
* .github/workflows/deploy-production.yml - replace platform TODO placeholders with executable commands.
* docs/operations/release-policy.md - stage gate definitions and rollback criteria.
* docs/operations/rollback-drill.md - verify commands match drill procedure.

Discrepancy references:
* Addresses DR-06.

Success criteria:
* Workflow executes staged promotions with gate checks.
* Rollback command path is documented and tested in staging drill.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 173-176) - ACA rollout gap.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 188-189) - rollout command requirement.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Validate phase changes

Run deployment workflow validation and production script checks.

Validation commands:
* npm run lint - verify workflow and docs changes remain lint clean.
* npm run build - ensure no runtime breakage from deployment contract updates.
* npm test -- --runInBand - confirm gameplay behavior unaffected by deploy contract changes.

## Implementation Phase 3: Ops Hardening

<!-- parallelizable: true -->

### Step 3.1: Implement CORS restriction and secret management controls

Harden production runtime by enforcing explicit CORS origins and documenting/implementing secret source of truth.

Files:
* src/index.ts - enforce CORS restrictions by environment.
* src/ops/config.ts - add required CORS and secret reference configuration keys.
* docs/operations/security-controls.md - CORS and secret handling controls.
* docs/operations/production-config.md - production secret variable guidance.

Discrepancy references:
* Addresses DR-07.

Success criteria:
* Production allows only approved origins.
* Secret management path is explicitly documented and validated during startup checks.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 181-184) - config and secrets gap.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 192-193) - CORS and secret requirement.

Dependencies:
* Implementation Phase 2 completion.

### Step 3.2: Implement Colyseus monitor exposure policy and access controls

Either explicitly disable monitor exposure in production or expose it behind authenticated access, and document the policy as an operational control.

Files:
* src/index.ts - monitor route wiring and access controls.
* src/ops/config.ts - monitor toggle and access policy configuration.
* docs/operations/security-controls.md - monitor exposure policy.
* docs/operations/incident-roles.md - who can access monitor endpoints during incidents.

Discrepancy references:
* Addresses DR-08.

Success criteria:
* Monitor endpoint exposure policy is enforceable in runtime.
* Policy docs and runtime behavior match for production and non-production environments.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 179-180) - missing monitor evidence.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 191-192) - monitor policy requirement.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Implement Application Insights integration evidence path

Add explicit telemetry sink integration (or ownership handoff evidence when externally managed) for Application Insights so Epic 10 observability acceptance has verifiable proof.

Files:
* src/ops/tracing.ts - exporter wiring and span/metric correlation context.
* src/index.ts - startup initialization and shutdown flush behavior.
* docs/operations/alerts.md - document Application Insights-backed signal mapping.
* docs/operations/epic-tracking.md - include explicit evidence link for Application Insights integration status.

Discrepancy references:
* Addresses DR-01.

Success criteria:
* Application Insights integration state is explicit: implemented in-repo or documented as external ownership with handoff artifact.
* Epic 10 observability acceptance includes a direct Application Insights evidence reference.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 177-180) - missing explicit Application Insights evidence.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 208-211) - final observability sink wiring requirement.

Dependencies:
* Step 3.2 completion.

### Step 3.4: Validate release-gate alerts after hardening changes

Re-run alert and dashboard checks using harmonized metrics and hardened policy conditions.

Files:
* ops/monitoring/alerts/release-gates.yaml - gate expressions and thresholds.
* ops/monitoring/alerts/service-alerts.yaml - service alarms aligned with new controls.
* ops/monitoring/dashboards/slo-overview.json - dashboards reflect final contract.

Success criteria:
* Alerts evaluate successfully with no unresolved metric references.
* Release-gate dashboard panels show expected signals for canary and partial stages.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 208-211) - release-gate validation requirement.

Dependencies:
* Step 3.3 completion.

## Implementation Phase 4: Verification Evidence

<!-- parallelizable: false -->

### Step 4.1: Execute rollback drill and capture operational proof artifact

Run rollback rehearsal with the finalized workflow and capture timing, command output summary, and pass/fail against acceptance thresholds.

Files:
* scripts/rollback-drill.sh - authoritative drill command path.
* docs/operations/rollback-drill.md - captured run evidence and lessons learned.
* docs/operations/incident-review.md - drill findings and corrective actions.

Discrepancy references:
* Addresses DR-09.

Success criteria:
* Rollback drill evidence includes measured recovery time and success status.
* Any variance from target thresholds is captured with follow-up actions.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 193-194) - proof artifact requirement.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 212-214) - Phase D verification requirement.

Dependencies:
* Implementation Phase 3 completion.

### Step 4.2: Execute canary to partial to stable gate simulation with evidence

Run stage progression simulation and capture gate outcomes, decision points, and any rollback interventions.

Files:
* .github/workflows/deploy-production.yml - stage progression execution path.
* docs/operations/release-policy.md - gate criteria and operator checklist.
* docs/operations/epic-tracking.md - completion evidence references for Epic 10 closure.

Discrepancy references:
* Addresses DR-10.

Success criteria:
* All stage gates are exercised and recorded with pass/fail evidence.
* Epic tracking doc references evidence artifacts for closure review.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 214-215) - gate simulation requirement.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 225-233) - harness-point completion checklist.

Dependencies:
* Step 4.1 completion.

### Step 4.3: Execute at least one incident exercise and capture evidence

Run one incident exercise (tabletop or controlled simulation) mapped to existing runbooks, then capture evidence, response timeline, and remediation outcomes.

Files:
* docs/operations/incident-review.md - incident exercise timeline and findings.
* docs/operations/postmortem-template.md - completed exercise artifact.
* docs/operations/runbooks/index.md - exercise-to-runbook mapping and updates.

Discrepancy references:
* Addresses DR-02.

Success criteria:
* At least one incident exercise is executed and documented.
* Exercise outcomes include owner-assigned follow-up actions and due dates.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Line 193) - incident exercise requirement.
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 225-233) - harness point 6 incident ops alignment.

Dependencies:
* Step 4.2 completion.

### Step 4.4: Update Epic tracking evidence links for closure review

Update Epic tracking to reference rollback drill, stage-gate simulation, incident exercise, and observability sink evidence artifacts for closure audit.

Files:
* docs/operations/epic-tracking.md - closure evidence link table.

Success criteria:
* Epic tracking includes all required evidence links and closure status.

Context references:
* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 193-194, 214-215) - required verification artifacts.

Dependencies:
* Step 4.3 completion.

## Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm run build
* npm test

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply straightforward fixes directly when changes remain scoped to Epic 10 alignment.

### Step 5.3: Report blocking issues

When validation failures require major architectural change or external ownership decisions:
* Document the issue and affected files.
* Add unresolved items in .copilot-tracking/plans/logs/2026-06-25/epic-10-implementation-alignment-log.md.
* Recommend follow-on research/planning instead of large inline refactors.

## Dependencies

* Access to Azure deployment environment and registry credentials for staged deploy testing.
* Existing Node.js/npm toolchain used by repository CI.

## Success Criteria

* Epic 10 requirements are fully mapped to executable implementation steps with no TODO-only workflow gates.
* Seven-point harness alignment is evidenced through contract unification, deployment execution, hardening, and verification artifacts.
* Final validation passes or unresolved blockers are explicitly logged with follow-on actions.
