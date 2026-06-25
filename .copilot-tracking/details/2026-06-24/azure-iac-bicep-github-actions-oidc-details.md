<!-- markdownlint-disable-file -->
# Implementation Details: Azure IaC Bicep and Workflow Dispatch Deployment

## Context Reference

Sources: .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md, .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md, .copilot-tracking/research/2026-06-24/azure-hosting-colyseus-lobby-research.md, package.json, src/index.ts, public/common/colyseus-client.js.

## Implementation Phase 0: Preflight Deployment Decisions and Access Validation

<!-- parallelizable: false -->

### Step 0.1: Verify OIDC principal RBAC scope before deployment

Validate that the existing federated service principal has the required least-privilege role assignment at the intended deployment scope and capture the role/scope in deployment notes.

Files:
* .github/workflows/deploy-aca.yml - preflight command step to print active subscription and scoped permissions.
* docs/deployment/azure-container-apps.md - RBAC preflight checklist and required roles.

Discrepancy references:
* Addresses DR-01 by resolving RBAC uncertainty before first apply.

Success criteria:
* Required roles and scopes are documented and verified prior to deployment.
* Workflow preflight fails early when access scope is invalid.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 158-161) - unresolved RBAC question.

Dependencies:
* None.

### Step 0.2: Finalize region, naming, and tagging standards

Select and codify target regions, resource naming pattern, and mandatory tags to prevent drift across environments.

Files:
* infra/bicep/main.bicep - shared naming/tag parameters and propagation to modules.
* infra/bicep/params/dev.bicepparam - environment values.
* infra/bicep/params/staging.bicepparam - environment values.
* infra/bicep/params/prod.bicepparam - environment values.

Discrepancy references:
* Addresses DR-04 by formalizing deployment conventions before implementation.

Success criteria:
* All Bicep modules consume common naming/tag inputs.
* Environment parameter files are consistent with selected standards.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 159-160) - region and naming open questions.

Dependencies:
* Step 0.1 completion.

### Step 0.3: Choose image build path and codify workflow behavior

Finalize whether builds run on the GitHub runner Docker engine or through `az acr build`, and reflect this as the only supported path in the workflow and runbook.

Files:
* .github/workflows/deploy-aca.yml - selected build path implementation.
* docs/deployment/azure-container-apps.md - build path rationale and failure troubleshooting.

Discrepancy references:
* Addresses DR-05 by resolving deployment pipeline ambiguity.

Success criteria:
* Workflow uses one authoritative build strategy.
* Runbook documents prerequisites and triage steps for the chosen strategy.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Line 161) - image build strategy decision point.

Dependencies:
* Step 0.2 completion.

## Implementation Phase 1: Bicep Foundation and Environment Modeling

<!-- parallelizable: false -->

### Step 1.1: Create Bicep directory structure and root deployment composition

Create the infrastructure folders and root template to orchestrate module composition and expose deployment outputs required by CI.

Files:
* infra/bicep/main.bicep - Root template wiring parameters, module calls, outputs.
* infra/bicep/modules/ - Module folder for resource-specific Bicep files.
* infra/bicep/params/ - Environment parameter files for dev/staging/prod.

Discrepancy references:
* Addresses DD-02 by ensuring runtime-sensitive outputs are handled as first-class deployment artifacts.

Success criteria:
* Root Bicep template composes all required modules.
* Outputs include container app endpoint and key deployment identifiers for workflow usage.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 70-90) - minimal resource model.

Dependencies:
* None.

### Step 1.2: Implement modular resources for ACR, Log Analytics, ACA environment, and Container App

Implement each resource as a focused module with environment-aware naming, tags, and resource settings aligned with websocket and low-admin requirements.

Files:
* infra/bicep/modules/container-registry.bicep - ACR definition and outputs.
* infra/bicep/modules/log-analytics.bicep - Workspace for Container Apps logs.
* infra/bicep/modules/container-app-env.bicep - ACA managed environment with diagnostics linkage.
* infra/bicep/modules/container-app.bicep - Container app ingress, scale, probes, and runtime env vars.

Discrepancy references:
* Addresses DD-02 by codifying websocket-compatible ACA ingress posture.

Success criteria:
* Container App has external ingress, targetPort 3000, sticky sessions enabled, single revision mode.
* Default scale posture sets minReplicas 1 and conservative maxReplicas.
* Liveness/readiness probes target /health.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md (Lines 58-72) - required ACA posture.
* .copilot-tracking/research/2026-06-24/azure-hosting-colyseus-lobby-research.md (Lines 157-188) - multiplayer reliability caveats.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Add environment-specific parameter files

Create bicepparam files for dev, staging, and prod with controlled differences for scale bounds, naming suffixes, and tags.

Files:
* infra/bicep/params/dev.bicepparam - development defaults.
* infra/bicep/params/staging.bicepparam - staging defaults.
* infra/bicep/params/prod.bicepparam - production defaults.

Discrepancy references:
* Addresses DR-04 by enforcing selected region/naming/tag conventions in parameterized IaC.

Success criteria:
* Each bicepparam file references main.bicep and sets required parameters.
* Environment values support deterministic names and reproducible deployments.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md (Lines 115-133) - proposed layout and naming.

Dependencies:
* Step 1.2 completion.

### Step 1.4: Validate Bicep assets

Run formatting and compile checks before integrating CI workflow.

Validation commands:
* az bicep build --file infra/bicep/main.bicep - compile root template.
* az deployment group validate --resource-group <rg> --template-file infra/bicep/main.bicep --parameters @infra/bicep/params/dev.bicepparam - schema and parameter validation.
* az deployment group what-if --resource-group <rg> --template-file infra/bicep/main.bicep --parameters @infra/bicep/params/dev.bicepparam - planned change inspection.

## Implementation Phase 2: Workflow Dispatch OIDC Deployment Pipeline

<!-- parallelizable: true -->

### Step 2.1: Create manual deploy workflow with OIDC security baseline

Create a single workflow_dispatch workflow with strict token permissions and environment-aware manual inputs.

Files:
* .github/workflows/deploy-aca.yml - GitHub Actions deploy workflow.

Discrepancy references:
* Addresses DR-04 by implementing secure OIDC login requirements without client secrets.

Success criteria:
* Workflow has `workflow_dispatch` trigger with environment, deploy_mode, image_tag, location, resource_group, min_replicas, max_replicas inputs.
* Workflow permissions include only `id-token: write` and `contents: read`.
* Azure login uses existing OIDC principal secrets.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md (Lines 74-114) - OIDC workflow controls.

Dependencies:
* None.

### Step 2.2: Add deployment stages for what-if, conditional apply, image publish, and app update

Implement sequential jobs/steps to run infrastructure preview first, apply only when requested, then publish image and roll out app revision.

Files:
* .github/workflows/deploy-aca.yml - deployment job definitions and conditionals.

Discrepancy references:
* Addresses DD-01 by selecting explicit what-if/apply split to reduce accidental production changes.

Success criteria:
* Default mode is what-if and does not mutate infrastructure.
* Apply mode performs Bicep deployment and app update only when explicitly selected.
* Image publish pushes repository image to ACR with deterministic tag.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 98-113) - recommended workflow behavior.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Add smoke checks and run summary output

Add post-deploy health/version checks and write concise deployment summary for operators.

Files:
* .github/workflows/deploy-aca.yml - smoke test and summary step.

Success criteria:
* Workflow verifies /health and /version after apply deployments.
* Workflow summary includes environment, image tag, endpoint, and deploy mode.

Context references:
* src/index.ts (Lines 51-54, 58-63) - existing smoke-check endpoints.
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 134-162) - validation and rollout guidance.

Dependencies:
* Step 2.2 completion.

### Step 2.4: Add GitHub Environment protections for staging and production

Bind deployments to GitHub Environments and require approvals for higher environments so manual dispatch remains governed.

Files:
* .github/workflows/deploy-aca.yml - environment binding and per-environment behavior.
* docs/deployment/azure-container-apps.md - required reviewers and protection policy documentation.

Discrepancy references:
* Addresses DD-01 by incorporating governance controls in baseline workflow.

Success criteria:
* Staging and production deployments require environment-based approvals.
* Workflow clearly differentiates dev from gated environments.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 150-152) - staging/production gate guidance.

Dependencies:
* Step 2.3 completion.

## Implementation Phase 3: Runtime and Configuration Alignment

<!-- parallelizable: false -->

### Step 3.1: Add container build artifact and deployment metadata conventions

Introduce a Dockerfile and image metadata variables consumed by workflow and Bicep deployment values.

Files:
* Dockerfile - production image build for Node service.
* .github/workflows/deploy-aca.yml - image naming/tag propagation.
* infra/bicep/main.bicep - image reference parameter and output plumbing.

Discrepancy references:
* Addresses DR-05 by resolving current absence of deployable container artifact and locking selected build path.

Success criteria:
* Docker build works with repository runtime expectations.
* Bicep and workflow share consistent image repository/tag inputs.

Context references:
* .copilot-tracking/research/subagents/2026-06-24/bicep-github-actions-oidc-research.md (Lines 22-27) - no existing docker or workflow assets.
* package.json (Lines 7-10) - engine requirements.

Dependencies:
* Implementation Phase 1 and Step 2.2 completion.

### Step 3.2: Align runtime assumptions for ingress and websocket endpoints

Ensure environment variables and API response behavior remain compatible behind ACA ingress and do not emit unusable localhost ws endpoints.

Files:
* src/index.ts - ws endpoint generation and runtime env fallback behavior.
* public/common/colyseus-client.js - same-origin fallback checks.
* infra/bicep/modules/container-app.bicep - runtime env var settings.

Discrepancy references:
* Addresses DD-02 by reducing ws endpoint mismatch risk discovered in research.

Success criteria:
* API endpoint metadata is valid for hosted environment.
* Browser clients connect over wss using deployed host under HTTPS.

Context references:
* src/index.ts (Lines 97, 157) - host/port-derived ws endpoint generation.
* public/common/colyseus-client.js (Lines 12-20) - same-origin websocket behavior.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Document operator dispatch runbook

Document expected dispatch inputs, deploy modes, and triage actions for failed deploys.

Files:
* docs/deployment/azure-container-apps.md - operator runbook and deployment checklist.

Discrepancy references:
* Addresses DR-01 and DR-05 by closing operational handoff gaps for access validation and build strategy operations.

Success criteria:
* Runbook includes required secrets, workflow inputs, and expected outputs.
* Runbook includes rollback and retry guidance for failed apply mode executions.

Context references:
* .copilot-tracking/research/2026-06-24/bicep-github-actions-oidc-research.md (Lines 166-175) - open questions and operational decisions.

Dependencies:
* Step 2.3 completion.

### Step 3.4: Validate phase changes

Run project and workflow quality checks for runtime and deployment alignment.

Validation commands:
* npm run build - compile validation with runtime updates.
* npm test - regression validation.
* GitHub Actions workflow syntax validation via local lint or dry-run checks available in tooling.

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands for the project:
* npm run lint
* npm run build
* npm test

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 4.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* Azure CLI and Bicep tooling available in CI and developer environment.
* Existing OIDC service principal with RBAC to target resource group.
* GitHub repository environments and secrets configured for deploy targets.

## Success Criteria

* Infrastructure can be provisioned from Bicep without manual Azure Portal resource creation.
* Manual deployment workflow performs what-if or apply based on explicit operator input.
* Deployments complete with endpoint smoke checks and actionable operator summary.
* Runtime websocket behavior remains functional behind Azure Container Apps ingress.
