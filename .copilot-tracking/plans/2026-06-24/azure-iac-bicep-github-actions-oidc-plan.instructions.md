---
applyTo: '.copilot-tracking/changes/2026-06-24/azure-iac-bicep-github-actions-oidc-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Azure IaC Bicep and Workflow Dispatch Deployment

## Overview

Create Azure Bicep infrastructure assets and a manual GitHub Actions deployment workflow using workflow_dispatch and existing OIDC federation to deploy this Colyseus application to Azure Container Apps with low operational overhead.

## Objectives

### User Requirements

* Build a plan to create IaC Bicep assets for Azure deployment. — Source: user request in current conversation.
* Build a GitHub Actions deployment workflow triggered by workflow_dispatch. — Source: user request in current conversation.
* Use the already configured OIDC service principal for Azure authentication. — Source: user request in current conversation.

### Derived Objectives

* Standardize Azure resource provisioning with environment-parameterized Bicep modules to reduce manual deployment drift. — Derived from: .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md.
* Enforce least-privilege CI authentication with token-only OIDC flow and explicit deploy mode controls (what-if/apply). — Derived from: .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md.
* Preserve websocket reliability for multiplayer joins by deploying to Azure Container Apps with external ingress, sticky sessions, and conservative replica posture. — Derived from: .copilot-tracking/research/2026-06-24/azure-hosting-colyseus-lobby-research.md.

## Context Summary

### Project Files

* package.json - Node engine constraints and npm scripts for build/test.
* src/index.ts - Runtime port behavior and health/version endpoints used for probes and smoke checks.
* public/common/colyseus-client.js - Same-origin ws/wss endpoint behavior that must align with ingress hostnames.
* docs/multiplayer-game-design.md - Existing architecture direction for Azure Container Apps and scaling posture.

### References

* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md - primary task research for Bicep and GitHub Actions OIDC workflow.
* .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md - repository inspection and deployment pattern details.
* .copilot-tracking/research/2026-06-24/azure-hosting-colyseus-lobby-research.md - selected Azure hosting rationale and websocket constraints.

### Standards References

* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/coding-standards/bicep/bicep.instructions.md — Bicep implementation standards for infra assets under bicep paths.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/markdown.instructions.md — markdown standards for planning artifacts.
* /home/dakir/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.3.101/.github/instructions/hve-core/writing-style.instructions.md — writing style constraints for planning artifacts.

## Implementation Checklist

### [ ] Implementation Phase 0: Preflight Deployment Decisions and Access Validation

<!-- parallelizable: false -->

* [ ] Step 0.1: Verify OIDC principal RBAC on target subscription/resource groups
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 11-30)
* [ ] Step 0.2: Finalize region, resource naming, and baseline tagging convention
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 32-52)
* [ ] Step 0.3: Select container image build strategy and codify it in workflow design
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 54-74)

### [ ] Implementation Phase 1: Bicep Foundation and Environment Modeling

<!-- parallelizable: false -->

* [ ] Step 1.1: Create Bicep directory structure and root deployment composition
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 83-100)
* [ ] Step 1.2: Implement modular resource definitions for ACR, Log Analytics, ACA environment, and Container App
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 102-127)
* [ ] Step 1.3: Add environment-specific bicepparam files for dev, staging, and prod
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 129-151)
* [ ] Step 1.4: Validate Bicep assets
  * Run Bicep format/build and template validation commands for initial compile integrity.

### [ ] Implementation Phase 2: Workflow Dispatch OIDC Deployment Pipeline

<!-- parallelizable: true -->

* [ ] Step 2.1: Create workflow_dispatch GitHub Actions workflow with secure OIDC permissions
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 160-187)
* [ ] Step 2.2: Add deployment execution stages for what-if, conditional apply, image publish, and ACA rollout
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 189-216)
* [ ] Step 2.3: Add post-deploy smoke checks and workflow summary outputs
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 218-234)
* [ ] Step 2.4: Add GitHub Environment protections for staging and production deployments
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 236-254)

### [ ] Implementation Phase 3: Runtime and Configuration Alignment

<!-- parallelizable: false -->

* [ ] Step 3.1: Add container build artifact and deployment metadata conventions
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 263-284)
* [ ] Step 3.2: Align runtime assumptions for PORT, ws endpoint generation, and environment variables
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 286-308)
* [ ] Step 3.3: Document operator runbook for manual workflow dispatch inputs and expected outcomes
  * Details: .copilot-tracking/details/2026-06-24/azure-iac-bicep-github-actions-oidc-details.md (Lines 310-324)
* [ ] Step 3.4: Validate phase changes
  * Run build/test checks and a dry-run workflow logic validation.

### [ ] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [ ] Step 4.1: Run full project validation
  * Execute all lint commands (`npm run lint`, language linters)
  * Execute build scripts for all modified components
  * Run test suites covering modified code
* [ ] Step 4.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 4.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See .copilot-tracking/plans/logs/2026-06-24/azure-iac-bicep-github-actions-oidc-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Azure CLI with Bicep support.
* Azure subscription access for target resource group and OIDC service principal assignments.
* Existing repository npm scripts for build/test validation.
* GitHub repository secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID.
* GitHub Environments configured for staging/prod with required reviewers.

## Success Criteria

* Bicep assets provision a deployable Azure Container Apps baseline for this service. — Traces to: .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md.
* Manual workflow_dispatch deployment executes using OIDC without client secrets. — Traces to: user requirement and OIDC research findings.
* Deployment flow supports what-if and apply modes with clear operator controls. — Traces to: .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md.
* Post-deploy health and version smoke checks verify service availability. — Traces to: src/index.ts runtime endpoints and research validation guidance.
