---
title: Bicep and GitHub Actions OIDC Research
description: Primary planning artifact for creating Azure Bicep infrastructure and a workflow_dispatch GitHub Actions deployment workflow with an existing OIDC service principal
ms.date: 2026-06-24
ms.topic: concept
---

## Objective

Define a practical implementation plan for Azure IaC and deployment automation for this repository using:

* Bicep assets for Azure Container Apps deployment
* A manual GitHub Actions workflow using workflow_dispatch
* Existing OIDC configured Azure service principal

## Current State Summary

* No deployed IaC or workflow assets exist in this repository yet
* Architecture and backlog already indicate Azure Container Apps + ACR direction
* Server already exposes health and version endpoints needed for runtime probes and smoke checks

## Evidence Summary

### Existing architecture constraints

* Express and Colyseus share one server process
  * src/index.ts:18-24
* Room listing and lobby discovery are enabled
  * src/index.ts:70-71
* Health endpoint is available
  * src/index.ts:51-54
* App computes wsEndpoint using HOST and PORT in API responses
  * src/index.ts:97
  * src/index.ts:157
* Browser-side websocket endpoint is same-origin based and protocol aware
  * public/common/colyseus-client.js:12-15
  * public/common/colyseus-client.js:17-20

### Existing deployment intent in docs and planning

* ACA is the recommended host with sticky sessions and ACR image flow
  * docs/multiplayer-game-design.md:213-233
* Planned deployment tasks include Docker, ACA ingress, scaling, and configuration
  * .copilot-tracking/implementation-tasks.md:232-253

### Gaps discovered

* No .github directory and no workflows present
* No Dockerfile present
* No Bicep or Terraform files present

## Minimal Azure Resource Plan

### Required resources

1. Resource group
2. Azure Container Registry
3. Log Analytics workspace
4. Azure Container Apps environment
5. Azure Container App (server)

### Initial app settings and runtime posture

* Ingress external true
* targetPort 3000 to align with current app PORT default
* Session affinity enabled
* revision mode single
* minReplicas 1, maxReplicas conservative
* Probes against /health

### Later scale and resilience expansion

* Add Redis backed Colyseus presence and coordination before broad multi replica scaling
* Add App Insights if additional distributed observability is needed

## OIDC GitHub Actions Design

### Token permissions

* permissions:
  * id-token: write
  * contents: read

### Required secrets

* AZURE_CLIENT_ID
* AZURE_TENANT_ID
* AZURE_SUBSCRIPTION_ID

### workflow_dispatch inputs

1. environment (dev, staging, prod)
2. location
3. resource_group
4. image_tag
5. deploy_mode (what-if, apply)
6. min_replicas
7. max_replicas

### Recommended workflow behavior

1. Authenticate with azure/login using OIDC
2. Validate Bicep and run what-if
3. Require explicit apply mode to deploy
4. Build and push image
5. Deploy or update ACA revision
6. Run post deploy smoke checks

## Proposed File Layout

### Infrastructure

* infra/bicep/main.bicep
* infra/bicep/modules/container-registry.bicep
* infra/bicep/modules/log-analytics.bicep
* infra/bicep/modules/container-app-env.bicep
* infra/bicep/modules/container-app.bicep
* infra/bicep/params/dev.bicepparam
* infra/bicep/params/staging.bicepparam
* infra/bicep/params/prod.bicepparam

### Automation

* .github/workflows/deploy-aca.yml

## Validation and Rollout Plan

### Validation commands

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

### Rollout sequence

1. Implement and validate in dev using manual dispatch
2. Introduce staging with environment approvals
3. Gate production with required reviewers and apply-only mode
4. Add Redis and tune scale rules when traffic growth requires multi replica correctness

## Open Questions

1. Should runtime be standardized on Node 24 (package engines) or Node 22 (current docs)
2. Should static assets remain in same ACA app or be split to static hosting
3. Which region and naming standards are mandatory in target subscription
4. Does the existing OIDC service principal already have least privilege RBAC on the target RG
5. Will image builds run on GitHub runner Docker or via az acr build

## External References

* GitHub Actions workflow_dispatch:
  * <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow>
* GitHub OIDC permissions:
  * <https://docs.github.com/en/actions/reference/openid-connect-reference>
* Azure login action:
  * <https://github.com/Azure/login>
* Bicep deployment with az deployment group create:
  * <https://github.com/Azure/bicep>
