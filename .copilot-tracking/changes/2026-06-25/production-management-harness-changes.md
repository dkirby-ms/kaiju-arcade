<!-- markdownlint-disable-file -->
# Release Changes: Production Management Harness

**Related Plan**: production-management-harness-implementation-plan.instructions.md
**Implementation Date**: 2026-06-25

## Summary

Seven-point production management harness for kaiju-arcade covering SLO/SLI instrumentation, progressive delivery, typed runtime configuration, liveness/readiness health endpoints, graceful drain, structured observability (logging, metrics, tracing), incident runbooks, rate limiting, and CI security scanning.

## Changes

### Added

* src/ops/config.ts - Typed ServerConfig interface with 12 env vars, fail-fast validation, singleton export
* src/ops/runtime-state.ts - Liveness/readiness/drain state module
* src/ops/logger.ts - Structured JSON logger with level filtering and Express requestLogger middleware
* src/ops/metrics.ts - In-process Prometheus-format metrics registry (counters, gauges, histograms)
* src/ops/tracing.ts - Lightweight no-op tracing stubs with production JSON span emission
* src/ops/rate-limit.ts - Token bucket rate limiter middleware (no external deps)
* docs/operations/production-config.md - Environment variable contract, owners, defaults, env matrix
* docs/operations/slo-policy.md - SLO-A/SLO-B definitions, SLI formulas, error budget mechanics
* docs/operations/alerts.md - Burn-rate alert thresholds for SLO-A and SLO-B
* docs/operations/release-policy.md - Staged rollout, gate conditions, freeze criteria, evidence checklist
* docs/operations/incident-roles.md - IC, Ops Lead, Dev On-Call, Comms Lead role definitions
* docs/operations/epic-tracking.md - Seven-point harness epic scope and acceptance criteria
* docs/operations/feature-flags.md - FEATURE_DISPATCH_ENABLED and FEATURE_TICK_BROADCAST_ENABLED usage guide
* docs/operations/drain-procedure.md - Operator SIGTERM drain procedure
* docs/operations/chaos-reconnect-tests.md - Reconnect and capacity chaos test documentation
* docs/operations/security-controls.md - Rate limits, vuln management, secret management, CI scanning
* docs/operations/change-governance.md - Deployment audit requirements, config change process, retention
* docs/operations/rollback-drill.md - Monthly rollback drill checklist and evidence template
* docs/operations/runbooks/join-failure.md - Triage and mitigation for join failure incidents
* docs/operations/runbooks/reconnect-storm.md - Diagnostic workflow for reconnect storm incidents
* docs/operations/runbooks/tick-lag-drift.md - Game loop health and tick drift runbook
* docs/operations/runbooks/match-start-deadlock.md - Match phase deadlock incident runbook
* docs/operations/runbooks/index.md - Alert-to-runbook mapping table
* docs/operations/incident-review.md - Weekly operational review cadence and agenda
* docs/operations/postmortem-template.md - Standardized incident postmortem template
* ops/monitoring/dashboards/slo-overview.json - Grafana SLO overview dashboard skeleton
* ops/monitoring/alerts/slo-burn-rate.yaml - SLO-A/SLO-B burn-rate alert pairs
* ops/monitoring/alerts/release-gates.yaml - Deployment-time gate alert rules
* ops/monitoring/alerts/service-alerts.yaml - Core service alert definitions with runbook links
* .github/workflows/deploy-production.yml - Staged production deploy workflow (canary → stable → rollback)
* .github/workflows/ci.yml - CI workflow: lint, build, test, npm audit, TruffleHog secret scan
* scripts/rollback-drill.sh - Scripted rollback drill with health check and evidence logging
* .env.example - All 12 env vars with examples and secret/non-secret annotations

### Modified

* src/index.ts - Typed config, structured logging, metrics instrumentation, liveness/readiness endpoints, drain guards on POST routes, rate limiting middleware, tracing spans, SIGTERM drain handler
* src/game/MatchRoom.ts - Typed config, feature flag gates (dispatch + tick broadcast), drain guard in onJoin, structured logging, metrics counters/gauges, tracing spans
* src/game/GameLoop.ts - Tick duration histogram observation
* src/ops/config.ts - NODE_ENV=test normalization to allow test suite execution
* docs/operations/production-config.md - Added environment matrix table

### Removed

None.

## Additional or Deviating Changes

* NODE_ENV=test normalization added to config.ts (Phase 3 introduced production-mode rejection that blocked the test suite; normalized to "development" for testing)
* Phase E (GitHub epic issue creation) substituted with docs/operations/epic-tracking.md placeholder (no GitHub MCP available during implementation)
* service-alerts.yaml runbook references corrected from stub names (tick-lag.md, disconnect-spike.md, stuck-rooms.md) to actual runbook filenames

## Release Summary

Seven-point production management harness fully implemented across 8 phases:

* **Phase 0** — 6 operational docs: production-config, slo-policy, alerts, release-policy, incident-roles, epic-tracking
* **Phase 1/2** — SLI instrumentation in metrics.ts + index.ts, Grafana dashboard skeleton, burn-rate and release-gate alerts, staged deploy workflow, rollback drill script
* **Phase 3** — Typed config module (src/ops/config.ts), feature flags in MatchRoom, .env.example, feature-flags.md
* **Phase 4** — runtime-state.ts, /health/live + /health/ready endpoints, SIGTERM drain with POST guards, drain guard in MatchRoom.onJoin, 4 new reconnect/capacity MatchRoom tests
* **Phase 5** — logger.ts, metrics.ts, tracing.ts, /metrics endpoint, requestLogger middleware, GameLoop tick histogram, service-alerts.yaml with runbook links, runbooks/index.md
* **Phase 6** — 4 incident runbooks + index, incident-review.md, postmortem-template.md
* **Phase 7** — rate-limit.ts with token bucket, rate limiting on all 3 match POST endpoints, ci.yml with security scanning, change-governance.md, evidence checklist in release-policy.md

Files: 33 added, 5 modified. Validation: 83 tests passing, lint clean, tsc clean.

