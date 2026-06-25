<!-- markdownlint-disable-file -->
# Task Research: Azure Hosting for Kaiju Arcade Colyseus Lobby

Research to identify the easiest Azure hosting option with the least administrative effort that still supports this game's architecture: Node.js + Colyseus, WebSockets, and multiple concurrent users joining lobbies and match rooms.

## Task Implementation Requests

* Determine Azure hosting options that support Node.js + Colyseus WebSocket traffic.
* Recommend one easiest, low-admin, production-capable approach.
* Evaluate alternatives with rationale and evidence.
* Provide actionable deployment guidance for this repository.

## Scope and Success Criteria

* Scope: Azure-managed hosting options for this repository, runtime support for Colyseus + WebSockets, multiplayer scaling posture, lobby/session behavior impacts, and admin-effort tradeoffs.
* Assumptions: Existing codebase remains largely unchanged; objective prioritizes operational simplicity over maximum tuning; user concurrency grows over time.
* Success Criteria:
  * A single recommended Azure hosting model is selected with evidence-based rationale.
  * Rejected alternatives are documented with concrete trade-offs.
  * Guidance includes practical implementation and operational caveats for Colyseus lobbies.

## Outline

1. Verify repository architecture constraints.
2. Evaluate Azure hosting options for WebSockets and multiplayer session behavior.
3. Compare operational effort and scaling posture.
4. Select one recommended approach.
5. Provide implementation guidance and follow-up research topics.

## Potential Next Research

* Evaluate Redis-backed Colyseus presence and matchmaking coordination design for safe horizontal scale.
  * Reasoning: Sticky sessions reduce churn but do not provide cross-replica room state consistency.
  * Reference: Colyseus and Azure Container Apps scaling constraints.
* Run load tests to convert qualitative sizing into replica and CPU/memory targets.
  * Reasoning: Current research identified architecture constraints but not measured throughput.
  * Reference: Repository has no captured load test baseline in reviewed artifacts.

## Research Executed

### File Analysis

* package.json
  * Runtime uses Node + TypeScript build/start workflow.
* src/index.ts
  * Single HTTP server hosts Express and Colyseus together.
  * `match` room is realtime listed for lobby discovery.
  * Health/version endpoints available.
* src/game/MatchRoom.ts
  * Stateful room actor with in-memory player session maps and reconnect window.
  * Fixed room capacity and 20 Hz game loop usage pattern.
* src/schema/MatchSchema.ts
  * Authoritative game state is in-memory schema data.
* public/common/colyseus-client.js
  * Same-origin WebSocket client behavior.
  * Built-in LobbyRoom message flow (`rooms`, `+`, `-`).
* docs/multiplayer-game-design.md
  * Existing guidance already points to Azure Container Apps and sticky sessions.

### Code Search Results

* `enableRealtimeListing`
  * Found in src/index.ts for match lobby listing.
* `allowReconnection`
  * Found in src/game/MatchRoom.ts for disconnect grace behavior.
* `setSimulationInterval` / tick behavior
  * Found in src/game/MatchRoom.ts and schema timing constants for 20 Hz updates.

### External Research

* Official Azure docs and Colyseus docs reviewed for hosting behavior:
  * App Service WebSockets and config docs
  * Container Apps ingress, sticky sessions, scaling, revisions docs
  * AKS ingress concepts
  * VM operations baseline docs
  * Colyseus documentation root

### Project Conventions

* Standards referenced: Markdown and writing-style instruction files.
* Instructions followed: Task Researcher mode constraints and `.copilot-tracking/research` file-path conventions.

## Key Discoveries

### Project Structure

* Server and static clients are combined in one Node process with shared HTTP server lifecycle.
  * Evidence: src/index.ts:19-24, src/index.ts:32-41
* Lobby behavior depends on Colyseus realtime room listing and the built-in lobby protocol.
  * Evidence: src/index.ts:71, public/common/colyseus-client.js:23, public/common/colyseus-client.js:60-109
* Match and player state are in-memory, per-room, per-process.
  * Evidence: src/game/MatchRoom.ts:101-103, src/schema/MatchSchema.ts:290-311

### Implementation Patterns

* Fixed room capacity and deterministic tick loop per active room.
  * Evidence: src/game/MatchRoom.ts:97, src/game/MatchRoom.ts:157, src/schema/MatchSchema.ts:760-761
* Reconnection is time-bounded and memory-backed, not persistent.
  * Evidence: src/game/MatchRoom.ts:679-725
* API-generated `wsEndpoint` can diverge from browser same-origin WS endpoint if host/port env values are misconfigured behind ingress.
  * Evidence: src/index.ts:97, src/index.ts:157, public/common/colyseus-client.js:12-15

### Complete Examples

```ts
// src/index.ts (simplified)
const server = http.createServer(app)
const gameServer = new Server({ server })

gameServer.define("match", MatchRoom).enableRealtimeListing()

server.listen(port, host, () => {
  console.log(`Kaiju Arcade server listening on http://${host}:${port}`)
})
```

### API and Schema Documentation

* Azure Container Apps ingress supports WebSockets and optional sticky sessions (constraints apply).
  * Source: <https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview>
  * Source: <https://learn.microsoft.com/en-us/azure/container-apps/sticky-sessions>
* Azure Container Apps revisions support low-downtime update posture.
  * Source: <https://learn.microsoft.com/en-us/azure/container-apps/revisions>
* Azure App Service supports WebSockets and session affinity settings.
  * Source: <https://learn.microsoft.com/en-us/azure/app-service/configure-common>
* Colyseus docs confirm room/lobby and distributed deployment considerations.
  * Source: <https://docs.colyseus.io/>

### Configuration Examples

```yaml
# Azure Container Apps conceptual configuration posture (not a full manifest)
containerApp:
  ingress:
    external: true
    transport: http
    targetPort: 3000
    stickySessions:
      affinity: sticky
  scaling:
    minReplicas: 1
    maxReplicas: 5
  revisionMode: Single
```

## Technical Scenarios

### Scenario: Easiest Azure Hosting for Colyseus WebSocket Multiplayer

Goal: choose the lowest-admin Azure platform that still supports WebSockets, multiplayer lobbies, and practical production rollout.

**Requirements:**

* WebSocket support end-to-end
* Multi-user concurrency for lobby/rooms
* Minimal day-2 operations and platform administration
* Path to scale without immediate re-architecture

**Preferred Approach:**

* Use Azure Container Apps as the primary hosting platform.
* Start with single revision mode, HTTP ingress, min replicas of 1, and sticky sessions enabled.
* Introduce Redis-backed shared presence/state before aggressive scale-out beyond one replica.

```text
Current
  Browser clients (commander/kaiju)
      -> HTTPS + WSS ingress
          -> Azure Container Apps (Node/Colyseus container)
              -> In-memory match/lobby state per replica

Recommended near-term hardening
  Browser clients
      -> ACA ingress (WebSockets + sticky)
          -> Colyseus app replicas
              -> Shared Redis presence/coordination (for cross-replica correctness)
```

**Implementation Details:**

1. Containerize the existing Node service and deploy to Azure Container Apps with external HTTP ingress.
2. Keep `targetPort` aligned with app `PORT` (`3000` default) and rely on `process.env.PORT` at runtime.
3. Set `minReplicas: 1` for responsive lobby joins; tune upward using real traffic metrics.
4. Enable sticky sessions for improved client continuity.
5. Keep reconnect flow robust because affinity does not prevent reconnect events during scaling/revision swaps.
6. Validate API `wsEndpoint` behavior through ingress hostnames so clients do not receive unusable localhost addresses.
7. Before broad horizontal scaling, add shared presence/state coordination (Redis) for room/lobby correctness across replicas.

```bash
# Example deployment flow (conceptual)
npm run build
docker build -t kaiju-arcade:latest .
# push image to ACR
# create/update container app with HTTP ingress, targetPort 3000, minReplicas 1
# verify /health and WebSocket lobby join from commander and kaiju clients
```

#### Considered Alternatives

1. Azure App Service (Linux)
   * Rejected as primary recommendation because Container Apps provides a more natural container-native scaling and revision workflow with similarly low operational effort.
   * App Service remains a viable fallback for smallest deployments.
2. Azure Kubernetes Service (AKS)
   * Rejected for this ask due to significantly higher day-2 operations and platform complexity, despite strong technical flexibility.
3. Azure Virtual Machines
   * Rejected for this ask because OS patching, networking, reliability, and scaling burden shifts to the team, violating low-admin objective.

## Selected Approach Rationale

Azure Container Apps best satisfies the user objective: easiest hosting with least administrative effort while supporting WebSockets and multi-user Colyseus lobby flows.

* It is managed enough to avoid Kubernetes/VM overhead.
* It supports WebSockets directly at ingress.
* It offers scaling and revision rollout primitives needed for production operations.
* It aligns with existing repository documentation and architecture assumptions.

## Risks and Mitigations

* Risk: In-memory room state is lost if a replica restarts.
  * Mitigation: Keep conservative scaling policy and implement shared presence/state before broad scale-out.
* Risk: Sticky sessions give false confidence for correctness.
  * Mitigation: Treat affinity as optimization only; build reconnect + distributed coordination as reliability baseline.
* Risk: WS endpoint mismatch behind ingress.
  * Mitigation: Test and potentially standardize on same-origin WS endpoint generation for browser clients.

## Evidence Log

### Repository Evidence

* src/index.ts:19-24, src/index.ts:71, src/index.ts:97, src/index.ts:157
* src/game/MatchRoom.ts:97, src/game/MatchRoom.ts:101-103, src/game/MatchRoom.ts:157, src/game/MatchRoom.ts:679-725, src/game/MatchRoom.ts:770
* src/schema/MatchSchema.ts:290-311, src/schema/MatchSchema.ts:760-761
* public/common/colyseus-client.js:12-15, public/common/colyseus-client.js:23, public/common/colyseus-client.js:60-109
* docs/multiplayer-game-design.md:213-216, docs/multiplayer-game-design.md:228-229

### External Evidence

* <https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview>
* <https://learn.microsoft.com/en-us/azure/container-apps/sticky-sessions>
* <https://learn.microsoft.com/en-us/azure/container-apps/scale-app>
* <https://learn.microsoft.com/en-us/azure/container-apps/revisions>
* <https://learn.microsoft.com/en-us/azure/app-service/configure-common>
* <https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans>
* <https://learn.microsoft.com/en-us/azure/aks/concepts-network-ingress>
* <https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-portal>
* <https://docs.colyseus.io/>

## Actionable Next Steps

1. Deploy first production environment on Azure Container Apps with one warm replica.
2. Validate full commander + kaiju lobby flow over WSS through ACA ingress.
3. Add baseline dashboards/alerts: connection count, join failures, reconnect attempts, room creation failures.
4. Plan Redis-backed presence/state before increasing max replicas for public traffic.
5. Run load testing and update scale thresholds with measured data.
