---
title: Bicep and GitHub Actions OIDC Research
description: Research findings and implementation planning guidance for Azure IaC Bicep assets and a workflow_dispatch GitHub Actions deployment workflow using an existing OIDC configured Azure service principal
ms.date: 2026-06-24
ms.topic: concept
---

## Research Status

* Status: Complete
* Scope: Repository inspection and planning recommendations only
* Constraints honored: No edits outside .copilot-tracking

## Research Questions

1. What infra and deployment assets already exist in the repository
2. What is the minimal Azure resource set to deploy this Node.js and Colyseus app to Azure Container Apps
3. What secure OIDC workflow pattern should be used for workflow_dispatch
4. What file layout and naming conventions are recommended for Bicep and workflows
5. What validation commands and rollout strategy should be used

## Repository Inspection Findings

### Existing deployment and infra artifacts

* No existing Dockerfile, Bicep, Terraform, or GitHub Actions workflow files were found in the repository scan
* .github directory is not present
* Deployment intent is documented, but implementation artifacts are pending

### Evidence from source and docs

* Runtime server is a single Express + Colyseus process with HTTP and WebSocket transport
  * src/index.ts:18-24
* App is deployed behind PORT and currently defaults to 3000
  * src/index.ts:26-29
* Match room uses realtime listing for lobby discovery
  * src/index.ts:70-71
* Health endpoint exists and can be used for probes
  * src/index.ts:51-54
* API currently returns wsEndpoint derived from HOST and PORT
  * src/index.ts:97
  * src/index.ts:157
* Browser client resolves same-origin ws or wss endpoint from location host
  * public/common/colyseus-client.js:12-15
  * public/common/colyseus-client.js:17-20
* Architecture docs already target Azure Container Apps + ACR + sticky sessions
  * docs/multiplayer-game-design.md:213-223
  * docs/multiplayer-game-design.md:228-233
* Backlog contains planned deployment work for Docker, ACA, and observability
  * .copilot-tracking/implementation-tasks.md:232-253

### Runtime and toolchain facts that affect deployment

* package.json engines currently require Node >=24 and npm >=11
  * package.json:7-10
* docs mention Node.js 22 for container image planning
  * docs/multiplayer-game-design.md:220-221
* This version mismatch should be resolved during implementation to avoid image/runtime drift

## Minimal Azure Resource Set for ACA Deployment

### Recommended minimum resources

1. Resource group
2. Azure Container Registry (Basic SKU is sufficient initially)
3. Azure Container Apps Environment
4. Azure Container App for the server container
5. Log Analytics workspace (required by Container Apps Environment)

### Optional resources for phase 1.5 or later

1. Azure Cache for Redis for cross replica presence and room coordination
2. Application Insights if deeper distributed telemetry is needed beyond ACA + workspace logs
3. Azure Key Vault if secrets grow beyond current workflow scope

### Minimal Container App configuration posture

* External ingress enabled
* targetPort set to app PORT (3000 today)
* Session affinity enabled for sticky sessions
* revision mode single for simpler rollout behavior
* minReplicas 1 for WebSocket cold-start avoidance in production
* maxReplicas conservative until Redis backed coordination is introduced
* Liveness and readiness probe against /health

## Secure OIDC workflow_dispatch Pattern

### Security baseline

* Use federated OIDC only, no client secret
* Required GitHub token permissions:
  * id-token: write
  * contents: read
* Keep Azure identity values in repository or environment secrets:
  * AZURE_CLIENT_ID
  * AZURE_TENANT_ID
  * AZURE_SUBSCRIPTION_ID
* Restrict deploy job to GitHub Environment per target stage
* Prefer environment scoped secrets and approvals for production

### workflow_dispatch input pattern

Suggested manual inputs:

1. environment (choice: dev, staging, prod)
2. location (default azure region)
3. resource_group
4. image_tag (default commit sha)
5. deploy_mode (choice: what-if, apply)
6. min_replicas
7. max_replicas

### Recommended job sequence

1. checkout
2. azure/login with OIDC
3. az bicep upgrade and az --version check
4. az deployment group what-if for plan visibility
5. conditional apply only when deploy_mode == apply
6. build and push image to ACR
7. update Container App revision with new image and runtime env values
8. post deploy smoke checks: /health and /version

### External evidence for OIDC and workflow syntax

* GitHub Actions workflow_dispatch inputs and inputs context
  * <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow>
* GitHub Actions OIDC permissions with id-token: write
  * <https://docs.github.com/en/actions/reference/openid-connect-reference>
* azure/login OIDC input parameters
  * <https://github.com/Azure/login>

## Proposed File Layout and Naming

### Bicep layout

* infra/bicep/main.bicep
* infra/bicep/modules/container-registry.bicep
* infra/bicep/modules/log-analytics.bicep
* infra/bicep/modules/container-app-env.bicep
* infra/bicep/modules/container-app.bicep
* infra/bicep/params/dev.bicepparam
* infra/bicep/params/staging.bicepparam
* infra/bicep/params/prod.bicepparam

### GitHub workflow layout

* .github/workflows/deploy-aca.yml

### Naming conventions

* Use short, deterministic names with env suffix
* Example prefix: kaijuarcade
* Example resource names:
  * kaijuarcade-dev-rg
  * kaijuarcadedevacr
  * kaijuarcade-dev-cae
  * kaijuarcade-dev-app

## Validation Commands for Implementation Phase

### Local validation

```bash
npm ci
npm run build
npm run test
```

```bash
az bicep build --file infra/bicep/main.bicep
az deployment group validate \
  --resource-group <rg> \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/params/dev.bicepparam
az deployment group what-if \
  --resource-group <rg> \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/params/dev.bicepparam
```

### Deploy and smoke checks

```bash
az deployment group create \
  --resource-group <rg> \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/params/dev.bicepparam
```

```bash
curl -fsS https://<app-fqdn>/health
curl -fsS https://<app-fqdn>/version
```

## Rollout Strategy

1. Phase 1: Deploy dev with single replica and manual workflow_dispatch only
2. Phase 2: Add staging environment with required reviewers and what-if gate
3. Phase 3: Production with explicit approval and narrow apply window
4. Phase 4: Add Redis and scale policy improvements when multi replica demand appears

## Unresolved Questions and Gaps

1. Confirm runtime baseline: Node 24 from package engines versus Node 22 in design docs
2. Confirm whether static clients remain in same container or move to separate static hosting
3. Confirm exact region, naming policy, and tags required by tenant standards
4. Confirm if existing OIDC service principal already has least privilege RBAC on target resource group
5. Confirm whether ACR build will use Docker on runner or az acr build
6. Confirm production approval model and GitHub Environment protection rules

## Recommended Implementation Approach

1. Implement Bicep with a modular ACA baseline and environment specific bicepparam files
2. Add one manual GitHub Actions workflow with OIDC login, what-if first, then conditional apply
3. Keep required permissions minimal and avoid repository level broad tokens
4. Start single replica plus sticky sessions, then introduce Redis before broad horizontal scale
5. Add smoke tests and deployment outputs to workflow summary for operator confidence
