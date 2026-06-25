---
applyTo: '.copilot-tracking/changes/2026-06-25/production-management-harness-implementation-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Production Management Harness

## Overview

Implement a seven-point production management harness for kaiju-arcade that adds SLO governance, safe rollout controls, runtime configuration validation, resiliency/drain behavior, telemetry contracts, incident runbooks, and security/change governance for reliable multiplayer operations.

## Objectives

### User Requirements

* Build a plan to implement the researched seven-point production management harness. — Source: user request in current conversation.
* Create a GitHub issue as a new epic to track harness implementation. — Source: user request in current conversation.

### Derived Objectives

* Convert each of the seven control domains from research into executable phases with concrete file targets and validation gates. — Derived from: .copilot-tracking/research/2026-06-25/production-management-harness-research.md.
* Prioritize controls that reduce the highest operational risks first (readiness/drain, telemetry, progressive delivery). — Derived from: .copilot-tracking/research/2026-06-25/production-management-harness-research.md.
* Preserve repository conventions and existing build/test scripts while introducing production operations scaffolding. — Derived from: package.json and src/index.ts.

## Context Summary

### Project Files

* package.json - Build, lint, test, and production start scripts for validation and rollout gates.
* src/index.ts - HTTP endpoints, room registration, process signal handling, and production runtime entrypoint.
* src/game/MatchRoom.ts - Reconnect flow, room lifecycle behavior, and broadcast surfaces for operational metrics/events.
* src/game/GameLoop.ts - Tick cadence and drift warnings that need metrics and alerting.
* src/messages/protocol.ts - Server-side client message contract and input validation boundaries.
* public/common/session-manager.js - Browser reconnect token/session continuity behavior tied to resiliency controls.
* docs/multiplayer-game-design.md - Architecture context for multiplayer lifecycle and deployment assumptions.

### References

* .copilot-tracking/research/2026-06-25/production-management-harness-research.md - Primary operational design and seven-point harness content.
* /memories/repo/kaiju-arcade-notes.md - Existing repository notes on reconnect and Colyseus behavior.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — Markdown standards for planning artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — Writing style conventions for planning artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/coding-standards/python-script.instructions.md — Referenced if implementation introduces Python operational scripts.

## Implementation Checklist

### [ ] Implementation Phase E: Epic Tracking Issue Creation

<!-- parallelizable: false -->

* [ ] Step E.1: Create GitHub epic issue to track the full seven-point harness implementation
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 77-91)
* [ ] Step E.2: Add issue link, labels, and ownership evidence to planning artifacts
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 92-104)

### [ ] Implementation Phase 0: Production Baseline and Scope Lock

<!-- parallelizable: false -->

* [ ] Step 0.1: Define production environment contract and required environment variables
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 11-35)
* [ ] Step 0.2: Establish first operational scope for SLO-A and SLO-B definitions
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 36-56)
* [ ] Step 0.3: Record rollout assumptions and rollback authority model
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 57-76)

### [ ] Implementation Phase 1: Reliability Objectives and Error Budget Policy

<!-- parallelizable: true -->

* [ ] Step 1.1: Add SLI instrumentation points for join success and join-to-ready latency
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 85-111)
* [ ] Step 1.2: Implement SLO dashboards and burn-rate alert definitions
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 112-136)
* [ ] Step 1.3: Codify release freeze trigger when error budget is exhausted
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 137-153)
* [ ] Step 1.4: Validate phase changes
  * Run lint/build and unit tests for touched server files.

### [ ] Implementation Phase 2: Progressive Delivery and Rollback Safety

<!-- parallelizable: true -->

* [ ] Step 2.1: Create staged rollout workflow (5% -> 25% -> 100%) with health windows
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 162-184)
* [ ] Step 2.2: Implement rollback gate conditions tied to join failure/disconnect spikes
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 185-206)
* [ ] Step 2.3: Add rollback drill script and staging rehearsal checklist
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 207-226)

### [ ] Implementation Phase 3: Runtime Configuration and Feature Control

<!-- parallelizable: true -->

* [ ] Step 3.1: Introduce typed startup configuration schema and fail-fast validation
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 235-257)
* [ ] Step 3.2: Add emergency feature flags for high-risk gameplay and dispatch flows
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 258-279)
* [ ] Step 3.3: Document config matrix for local/staging/production
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 280-297)

### [ ] Implementation Phase 4: Resiliency and Session Continuity

<!-- parallelizable: false -->

* [ ] Step 4.1: Split health endpoints into liveness and readiness semantics
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 306-329)
* [ ] Step 4.2: Add graceful SIGTERM drain mode that rejects new allocations while preserving reconnects
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 330-356)
* [ ] Step 4.3: Add reconnect and capacity chaos scenarios for token refresh/expiry/full room
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 357-381)
* [ ] Step 4.4: Validate phase changes
  * Run targeted tests for MatchRoom reconnect and leave/join behavior.

### [ ] Implementation Phase 5: Observability and Telemetry Contract

<!-- parallelizable: false -->

* [ ] Step 5.1: Implement structured JSON logging with deployment and correlation fields
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 390-416)
* [ ] Step 5.2: Add core Prometheus metrics for joins, disconnects, tick timing, active rooms, and active players
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 417-447)
* [ ] Step 5.3: Add tracing spans for create/join/reconnect paths
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 448-468)
* [ ] Step 5.4: Build runbook-linked alert routing for telemetry signals
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 469-486)

### [ ] Implementation Phase 6: Incident Operations and Runbooks

<!-- parallelizable: true -->

* [ ] Step 6.1: Create incident response runbook for join failures and reconnect storms
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 495-519)
* [ ] Step 6.2: Create runbook for tick lag drift and match start deadlocks
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 520-542)
* [ ] Step 6.3: Establish incident review cadence and postmortem template
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 543-560)

### [ ] Implementation Phase 7: Security and Change Governance

<!-- parallelizable: true -->

* [ ] Step 7.1: Add public endpoint rate-limiting and abuse thresholds
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 569-592)
* [ ] Step 7.2: Add CI dependency and secret scanning checks
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 593-612)
* [ ] Step 7.3: Add deployment/config/audit trail requirements and evidence capture
  * Details: .copilot-tracking/details/2026-06-25/production-management-harness-implementation-details.md (Lines 613-631)

### [ ] Implementation Phase 8: Validation

<!-- parallelizable: false -->

* [ ] Step 8.1: Run full project validation
  * Execute all lint commands (`npm run lint`, language linters)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [ ] Step 8.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 8.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See .copilot-tracking/plans/logs/2026-06-25/production-management-harness-implementation-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js 24+ and npm 11+ matching package.json engine requirements.
* Existing lint/build/test toolchain (`npm run lint`, `npm run build`, `npm test`).
* Production deployment platform with support for readiness/liveness probes and staged rollout orchestration.
* Metrics/logging backend (Prometheus-compatible metrics ingest and centralized log storage).
* Team operational ownership for on-call, runbook maintenance, and incident review cadence.

## Success Criteria

* All seven harness domains are represented by implemented controls and validated checks. — Traces to: .copilot-tracking/research/2026-06-25/production-management-harness-research.md.
* Production readiness includes separate liveness/readiness, graceful drain behavior, and reconnect continuity tests. — Traces to: src/index.ts and src/game/MatchRoom.ts.
* Observability includes structured logs, core service metrics, and runbook-mapped alerts. — Traces to: research telemetry contract section.
* Rollout and rollback procedures are executable and rehearsed in staging with documented outcomes. — Traces to: research progressive delivery section.
* Security baseline includes endpoint abuse controls and CI scanning with remediation expectations. — Traces to: research security/change governance section.
