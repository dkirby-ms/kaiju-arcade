---
applyTo: '.copilot-tracking/changes/2026-06-25/epic-10-implementation-alignment-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Epic 10 Implementation Alignment

## Overview

Implement Epic 10 by closing documented contract drifts and converting deployment and operations scaffolds into executable production controls aligned to the seven-point production management harness.

## Objectives

### User Requirements

* Build the plan to implement the researched Epic 10 work. — Source: user request in current conversation.

### Derived Objectives

* Map Epic 10 requirements (10.1-10.4) to implementation phases that directly align with the seven-point harness. — Derived from: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 169-184).
* Select and operationalize the research-selected approach: contract unification, deployment execution, hardening, and verification evidence. — Derived from: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 195-215, 257-259).
* Resolve known blockers (runtime baseline, metric contract, release stage semantics, ownership boundary) before full implementation rollout. — Derived from: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 239-245).

## Context Summary

### Project Files

* .github/workflows/deploy-production.yml - progressive rollout orchestration and current platform TODO placeholders.
* src/ops/config.ts - release stage parsing and production startup contract.
* src/ops/metrics.ts - canonical observability metric definitions.
* src/index.ts - runtime middleware, health/readiness routes, and monitor/control surfaces.
* docs/operations/release-policy.md - rollout policy and gate criteria.
* docs/operations/epic-tracking.md - seven-point harness acceptance and Epic closure evidence.
* docs/operations/alerts.md - alert contract currently affected by metric naming drift.
* docs/operations/slo-policy.md - SLO/SLI policy affected by metrics contract drift.
* ops/monitoring/alerts/slo-burn-rate.yaml - production alert rules for SLO burn checks.
* ops/monitoring/dashboards/slo-overview.json - dashboard contract for release gates.

### References

* .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md - primary Epic 10 alignment research.
* .copilot-tracking/implementation-tasks.md - backlog definition for Epic 10 scope.
* docs/multiplayer-game-design.md - deployment target assumptions and architecture expectations.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown authoring requirements for tracking files.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing style requirements for planning artifacts.

## Implementation Checklist

### [ ] Implementation Phase 1: Contract Unification

<!-- parallelizable: false -->

* [ ] Step 1.1: Normalize release stage contract across docs, workflow, and runtime
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 11-35)
* [ ] Step 1.2: Harmonize observability metric contract for SLO acceptance
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 36-62)
* [ ] Step 1.3: Resolve baseline and ownership decisions before infrastructure coding
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 63-89)
* [ ] Step 1.4: Validate phase changes
  * Run lint/build commands for updated contract and policy files.

### [ ] Implementation Phase 2: Deployment Execution

<!-- parallelizable: false -->

* [ ] Step 2.1: Implement executable container build and push path
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 99-122)
* [ ] Step 2.2: Replace ACA rollout placeholders with staged rollout commands
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 123-146)
* [ ] Step 2.3: Validate phase changes
  * Run workflow and runtime validation after deployment path updates.

### [ ] Implementation Phase 3: Ops Hardening

<!-- parallelizable: false -->

* [ ] Step 3.1: Implement CORS restriction and secret management controls
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 156-180)
* [ ] Step 3.2: Implement Colyseus monitor exposure policy and access controls
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 181-206)
* [ ] Step 3.3: Implement Application Insights integration evidence path
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 206-229)
* [ ] Step 3.4: Validate release-gate alerts after hardening changes
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 230-248)
* [ ] Step 3.5: Validate phase changes
  * Run lint/build and targeted alert contract verification.

### [ ] Implementation Phase 4: Verification Evidence

<!-- parallelizable: false -->

* [ ] Step 4.1: Execute rollback drill and capture operational proof artifact
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 234-259)
* [ ] Step 4.2: Execute canary to partial to stable gate simulation with evidence
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 276-298)
* [ ] Step 4.3: Execute at least one incident exercise and capture evidence
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 299-321)
* [ ] Step 4.4: Update Epic tracking evidence links for closure review
  * Details: .copilot-tracking/details/2026-06-25/epic-10-implementation-alignment-details.md (Lines 322-337)

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full project validation
  * Execute all lint commands (`npm run lint`, language linters)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [ ] Step 5.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 5.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/epic-10-implementation-alignment-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js runtime baseline decision aligned with CI/deploy workflows.
* Access to deployment environment credentials for container registry and ACA rollout testing.
* Existing operations docs and monitoring artifacts under docs/operations and ops/monitoring.
* Team agreement on deployment ownership boundary when external infra repositories are involved.

## Success Criteria

* Epic 10 requirements for deployment/infrastructure are represented by executable implementation steps with source traceability. — Traces to: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 185-194).
* Contract drift is eliminated for release stage semantics and metric names across runtime, workflow, and policy artifacts. — Traces to: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 187-191).
* Deployment workflow no longer contains critical TODO placeholders for build/push/rollout commands. — Traces to: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 171-176).
* Verification evidence exists for rollback drill and staged gate simulation tied to Epic closure tracking. — Traces to: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 193-215).
* Observability acceptance includes explicit Application Insights integration evidence and incident exercise artifacts. — Traces to: .copilot-tracking/research/2026-06-25/epic-10-implementation-alignment-research.md (Lines 177-180, 193, 208-211).
