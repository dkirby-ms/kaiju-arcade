<!-- markdownlint-disable-file -->
# Task Research: 7-Point Production Management Harness

Define a practical seven-point harness to manage the kaiju-arcade application in production, grounded in repository architecture, existing scripts/tests, and operational best practices.

## Task Implementation Requests

* Identify production management needs specific to this codebase.
* Produce a seven-point operational harness with implementation-ready guidance.

## Scope and Success Criteria

* Scope: Node/TypeScript backend, multiplayer room/lobby architecture, public static client assets, test/deploy operations, and observability/reliability/security controls for production runtime.
* Assumptions: Current runtime is Node.js server process; deployment platform may vary (container/VM/PaaS), so controls should be platform-neutral with examples.
* Success Criteria:
  * Seven points are actionable and map to this repository.
  * Each point includes concrete implementation details (commands/files/hooks/metrics).
  * Alternatives are evaluated and one primary operating model is recommended.

## Outline

1. Repository and runtime baseline
2. Operational requirements and risks
3. Seven-point harness design
4. Implementation examples
5. Alternatives analysis and selected approach

## Potential Next Research

* Validate production target platform-specific deployment manifests (Docker/Kubernetes/ACA/IaC).
  * Reasoning: Current harness is platform-neutral; rollout/readiness details should be finalized per platform.
  * Reference: no deployment manifests were confirmed in this pass.
* Define first SLO scopes with stakeholders (join only vs join-to-ready vs full match lifecycle).
  * Reasoning: SLO scope drives alerting, rollback policy, and dashboard design.
  * Reference: SLO section below.
* Build initial load/reconnect chaos tests for room-capacity and token reclaim behavior.
  * Reasoning: Current reconnect and capacity logic are correctness-sensitive and production-critical.
  * Reference: src/game/MatchRoom.ts

## Research Executed

### File Analysis

* package.json
  * build/start scripts and engine constraints identify production launch contract (`build` + `start`; Node >=24).
* src/index.ts
  * Express + Colyseus entrypoint, static routes, health/version routes, seat-reservation APIs.
* src/game/MatchRoom.ts and src/game/GameLoop.ts
  * Authoritative match lifecycle, role assignment/readiness gates, reconnect token flow, 20 Hz tick loop and drift warning.
* src/schema/MatchSchema.ts and src/messages/protocol.ts
  * Authoritative replicated state and client/server contract surface.
* public/common/session-manager.js and public/common/colyseus-client.js
  * Browser session/reconnect mechanics and endpoint behavior.
* public/match-room.html and docs/multiplayer-game-design.md
  * Transitional match-room UX and architecture/deployment assumptions.

### Code Search Results

* `health|version|api/matches`
  * Confirmed `/health`, `/version`, and seat-reservation endpoints in src/index.ts.
* `allowReconnection|reconnectToken|maxClients|setInterval`
  * Confirmed reconnect grace-window/token handling, room cap, and loop timing mechanics in src/game/MatchRoom.ts and src/game/GameLoop.ts.
* `signal.feed|commander.status|dispatch.result`
  * Confirmed gameplay event broadcasting contract in MatchRoom for telemetry-friendly event surfaces.

### External Research

* Source set used for control-domain validation and acceptance checks:
  * Google SRE Workbook (SLO alerting, error budgets, canarying releases): https://sre.google/workbook/alerting-on-slos/, https://sre.google/workbook/error-budget-policy/, https://sre.google/workbook/canarying-releases/
  * Kubernetes probes and deployment rollback behavior: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/, https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
  * Prometheus metric naming: https://prometheus.io/docs/practices/naming/
  * OpenTelemetry JS and semantic conventions: https://opentelemetry.io/docs/languages/js/, https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
  * Node process signal handling: https://nodejs.org/api/process.html
  * Twelve-Factor config: https://12factor.net/config
  * NIST SSDF and OWASP Top 10 overview: https://csrc.nist.gov/pubs/sp/800/218/final, https://owasp.org/www-project-top-ten/

### Project Conventions

* Standards referenced: existing Node/TypeScript scripts in package.json; Colyseus room authority pattern in src/game/MatchRoom.ts; repository memory notes on reconnect and endpoint behavior.
* Instructions followed: Task Researcher mode constraints

## Key Discoveries

### Project Structure

* Runtime core is Express + Colyseus server in src/index.ts with `match` room registration and realtime listing.
* Authoritative game state lives in Colyseus schema (src/schema/MatchSchema.ts) and is mutated by MatchRoom/game loop logic.
* Client flow is role-selection -> lobby -> match room page(s), with shared browser helpers in public/common.
* Production entrypoint is compiled artifact `dist/index.js`; scripts indicate `npm run build` then `npm start`.

### Implementation Patterns

* Match phase transitions (`WAITING` -> `LOBBY` -> `ACTIVE` -> `ENDED`) are controlled server-side with eligibility checks.
* Reconnection is token-based and uses `allowReconnection(...)` plus token issuance/refresh behavior.
* Tick processing is fixed cadence (20 Hz target), with drift warning logging but no mitigation/metrics export.
* APIs include basic health/version plus match reservation/join endpoints; errors currently return raw error text.

### Complete Examples

```bash
# Production-safe launch contract for this repo
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=3000 npm start

# Core quality gates before promotion
npm run lint
npm test -- --runInBand
```

### API and Schema Documentation

* Server endpoints and seat reservation flow are defined in src/index.ts.
* Message protocol contracts are defined in src/messages/protocol.ts.
* Replicated state shape for client sync is defined in src/schema/MatchSchema.ts.

### Configuration Examples

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# suggested new controls
APP_VERSION=1.0.0
LOG_LEVEL=info
METRICS_ENABLED=true
READINESS_MATCH_ACCEPTING=true
CANARY_ENABLED=false
FEATURE_COMMANDER_DISPATCH=true
```

## Technical Scenarios

### Production Management Harness for Multiplayer Arcade Backend

This repository is best managed in production with a Lean SRE multiplayer harness containing seven explicit control domains. The selected approach emphasizes high return on effort for a small-to-medium team and directly addresses discovered code risks: state/phase consistency complexity, reconnect-token lifecycle correctness, fixed-capacity room pressure, and limited observability depth.

**Requirements:**

* Define 7 operational control points.
* Tie each point to concrete artifacts in this repository.
* Provide a preferred approach and alternatives.

**Preferred Approach:**

* Lean SRE Multiplayer Baseline (90-day target): seven controls with minimum acceptance checks and explicit repository mappings.

```text
1) Reliability Objectives and Error Budget Policy
2) Progressive Delivery and Rollback Safety
3) Runtime Configuration and Feature Control
4) Resiliency and Session Continuity
5) Observability and Telemetry Contract
6) Incident Operations and Runbooks
7) Security and Change Governance
```

**Implementation Details:**

1) Reliability Objectives and Error Budget Policy
* Why: release decisions are currently not tied to objective reliability limits.
* Repo mapping: join/start/reconnect flows in src/index.ts and src/game/MatchRoom.ts.
* Controls:
  * SLO-A: `match join + lobby ready success >= 99.9% / 30d`.
  * SLO-B: `p95 join-to-ready <= 2.0s / 30d`.
  * Error budget freeze policy when budget remaining < 0%.
* Minimum acceptance:
  * Two dashboards and burn-rate alerts defined.
  * Every deploy records expected and observed SLO impact.

2) Progressive Delivery and Rollback Safety
* Why: codebase has real-time state and reconnect behavior; safe rollout is mandatory.
* Repo mapping: production scripts in package.json; service start in src/index.ts.
* Controls:
  * Staged rollout (`5% -> 25% -> 100%`) with 10-minute health windows.
  * Rollback gate: if join failure or disconnect spikes exceed threshold, revert immediately.
  * Keep one-click rollback command/artifact.
* Minimum acceptance:
  * Rollback drill executed in staging with <10 min restore time.

3) Runtime Configuration and Feature Control
* Why: gameplay tuning and endpoint behavior should not require risky redeploys.
* Repo mapping: HOST/PORT/env usage in src/index.ts; gameplay control points in src/game/MatchRoom.ts.
* Controls:
  * All deploy-varying values in env/config service.
  * Startup schema validation; fail-fast invalid config.
  * Kill switches for risky gameplay paths (for example dispatch or ability routing).
* Minimum acceptance:
  * Service exits non-zero on missing required env vars.
  * At least one tested emergency feature flag.

4) Resiliency and Session Continuity
* Why: reconnect token lifecycle and room capacity are high-impact correctness paths.
* Repo mapping: reconnect logic in src/game/MatchRoom.ts; client token storage in public/common/session-manager.js.
* Controls:
  * Separate `/health/live` and `/health/ready`; readiness must fail during drain.
  * Graceful SIGTERM drain: reject new match allocations, preserve in-flight sessions during timeout.
  * Forced disconnect/reconnect test scenarios (token refresh, expired token, capacity full).
* Minimum acceptance:
  * Reconnect success rate SLI visible.
  * Drain behavior validated by canary shutdown test.

5) Observability and Telemetry Contract
* Why: current hooks are mostly console logs and gameplay events; operator visibility is insufficient.
* Repo mapping: health/version in src/index.ts; event emits in src/game/MatchRoom.ts.
* Controls:
  * Structured JSON logs with `deployment`, `roomId` (log-only), and correlation identifiers.
  * Metrics set:
    * `game_match_join_requests_total{result,role}`
    * `game_match_join_duration_seconds{role}`
    * `game_ws_disconnects_total{reason}`
    * `game_tick_duration_seconds`
    * `game_active_rooms`
    * `game_active_players`
  * Trace spans for create/join/reconnect paths.
* Minimum acceptance:
  * No high-cardinality user/session labels in metrics.
  * Alerts map directly to runbook steps.

6) Incident Operations and Runbooks
* Why: incident handling currently implicit; real-time outages need coordinated response.
* Repo mapping: top failure modes derive from src/game/MatchRoom.ts and src/index.ts paths.
* Controls:
  * Define incident roles (command/ops/comms).
  * Maintain runbooks for: join failures, reconnect storms, tick lag drift, match start deadlocks.
  * Weekly ops review for alert noise, MTTR, and unresolved actions.
* Minimum acceptance:
  * One tabletop or game-day run per month.
  * Sev incidents produce postmortem with tracked actions.

7) Security and Change Governance
* Why: client-originated gameplay messages and token/session flows require strict server guardrails.
* Repo mapping: message validators in src/messages/protocol.ts; API handlers in src/index.ts.
* Controls:
  * Enforce server-side validation for all client intents.
  * Add rate limits and abuse controls on public join endpoints.
  * CI dependency + secret scanning; change audit trail for deploy/config/incident actions.
* Minimum acceptance:
  * No plaintext secrets in repo/logs.
  * Critical vulnerabilities remediated within agreed SLA.

```text
Suggested initial implementation order (first 30 days):
1. Add readiness/drain semantics and structured logging
2. Add core metrics and two SLO dashboards
3. Introduce staged rollout + rollback gate
4. Codify incident runbooks for top 4 failure modes
5. Add rate limits and CI security scans
```

#### Considered Alternatives

* Bare minimum operations (single health check + manual deploy + ad hoc logs)
  * Rejected because reconnect/capacity/tick-loop complexity makes silent degradation likely and MTTR too high.
* Enterprise-heavy SRE platform from day one
  * Rejected as first step due to setup overhead and limited immediate ROI for this repository size.
* Selected: Lean SRE Multiplayer Baseline
  * Chosen for strongest risk reduction per effort and direct fit with current code maturity and scripts.
