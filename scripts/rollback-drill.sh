#!/usr/bin/env bash
# Copyright (c) Microsoft Corporation.
# SPDX-License-Identifier: MIT
#
# rollback-drill.sh
# Interactive rollback drill script for the kaiju-arcade production server.
#
# Purpose: guides an operator through a rollback rehearsal, confirms
# the target rollback version, executes the (platform-specific) rollback
# command, verifies /health/ready, and records the drill result to a
# local log file.
#
# Usage: bash scripts/rollback-drill.sh [--host <base-url>]
#   --host  Base URL of the server under drill (default: http://localhost:2567)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DRILL_LOG="${REPO_ROOT}/logs/rollback-drills.log"
DEFAULT_HOST="http://localhost:2567"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

parse_args() {
  HOST="${DEFAULT_HOST}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --host)
        HOST="${2:-}"
        shift 2
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Step 1: Print current deployed version
# ---------------------------------------------------------------------------

get_current_version() {
  log "Step 1: Checking current deployed version..."

  # Try the /version endpoint first; fall back to the most recent git tag.
  if VERSION_JSON=$(curl -sf --max-time 5 "${HOST}/version" 2>/dev/null); then
    CURRENT_VERSION=$(echo "${VERSION_JSON}" | \
      grep -oP '"version"\s*:\s*"\K[^"]+' 2>/dev/null || echo "unknown")
  else
    log "  /version endpoint unreachable — reading from git tags."
    CURRENT_VERSION=$(git -C "${REPO_ROOT}" describe --tags --abbrev=0 2>/dev/null \
      || echo "unknown")
  fi

  log "  Current version: ${CURRENT_VERSION}"
}

# ---------------------------------------------------------------------------
# Step 2: Prompt operator for target rollback version
# ---------------------------------------------------------------------------

get_rollback_target() {
  log "Step 2: Identify rollback target."

  # Offer the second-to-last git tag as a default suggestion.
  SUGGESTED=$(git -C "${REPO_ROOT}" tag --sort=-version:refname \
    | grep -E '^v[0-9]' | sed -n '2p' || echo "")

  if [[ -n "${SUGGESTED}" ]]; then
    echo "  Suggested rollback target: ${SUGGESTED}"
  fi

  read -r -p "  Enter target rollback version (tag or image digest): " ROLLBACK_TARGET

  if [[ -z "${ROLLBACK_TARGET}" ]]; then
    die "No rollback target supplied. Aborting drill."
  fi

  log "  Operator confirmed rollback target: ${ROLLBACK_TARGET}"
}

# ---------------------------------------------------------------------------
# Step 3: Execute platform-specific rollback command
# ---------------------------------------------------------------------------

execute_rollback() {
  log "Step 3: Executing rollback to ${ROLLBACK_TARGET}..."

  # TODO: Replace the placeholder below with the platform-specific rollback
  # command for this deployment environment.
  #
  # Examples:
  #   Kubernetes:
  #     kubectl set image deployment/kaiju-stable \
  #       app="${REGISTRY}/${IMAGE_NAME}:${ROLLBACK_TARGET}"
  #     kubectl rollout status deployment/kaiju-stable
  #
  #   Docker Compose (local/staging):
  #     IMAGE_TAG="${ROLLBACK_TARGET}" docker compose up -d --force-recreate
  #
  #   Render / Railway:
  #     render deploys create --service kaiju-arcade \
  #       --image "${REGISTRY}/${IMAGE_NAME}:${ROLLBACK_TARGET}"
  #
  # Remove this echo and the die() call once the real command is in place.
  echo "  [TODO] Rollback command not configured for this platform."
  echo "  Target: ${ROLLBACK_TARGET}"
  echo "  Edit scripts/rollback-drill.sh Step 3 to add the platform command."

  ROLLBACK_EXECUTED="false"
  # Uncomment the next line after wiring the real command above:
  # ROLLBACK_EXECUTED="true"
}

# ---------------------------------------------------------------------------
# Step 4: Verify /health/ready
# ---------------------------------------------------------------------------

verify_health() {
  log "Step 4: Verifying /health/ready at ${HOST}/health/ready"

  local max_attempts=6
  local wait_seconds=10
  local attempt=1
  HEALTH_STATUS="fail"

  # Allow a brief settle period if a real rollback was executed.
  if [[ "${ROLLBACK_EXECUTED}" == "true" ]]; then
    log "  Waiting 30 s for service to settle after rollback..."
    sleep 30
  fi

  while (( attempt <= max_attempts )); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 5 "${HOST}/health/ready" 2>/dev/null || echo "000")
    log "  Attempt ${attempt}/${max_attempts}: HTTP ${HTTP_CODE}"
    if [[ "${HTTP_CODE}" == "200" ]]; then
      HEALTH_STATUS="pass"
      break
    fi
    sleep "${wait_seconds}"
    (( attempt++ ))
  done

  if [[ "${HEALTH_STATUS}" == "pass" ]]; then
    log "  Health check PASSED."
  else
    log "  Health check FAILED after ${max_attempts} attempts."
  fi
}

# ---------------------------------------------------------------------------
# Step 5: Record drill result to local log
# ---------------------------------------------------------------------------

record_result() {
  local drill_result
  if [[ "${HEALTH_STATUS}" == "pass" ]]; then
    drill_result="PASS"
  else
    drill_result="FAIL"
  fi

  DRILL_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  mkdir -p "$(dirname "${DRILL_LOG}")"
  {
    echo "---"
    echo "timestamp:          ${DRILL_TIMESTAMP}"
    echo "operator:           ${USER:-unknown}"
    echo "current_version:    ${CURRENT_VERSION}"
    echo "rollback_target:    ${ROLLBACK_TARGET}"
    echo "rollback_executed:  ${ROLLBACK_EXECUTED}"
    echo "health_check_host:  ${HOST}"
    echo "health_check_result: ${HEALTH_STATUS}"
    echo "drill_result:       ${drill_result}"
  } >> "${DRILL_LOG}"

  log "Step 5: Drill result recorded."
  log "  Timestamp:  ${DRILL_TIMESTAMP}"
  log "  Result:     ${drill_result}"
  log "  Log file:   ${DRILL_LOG}"

  if [[ "${drill_result}" == "FAIL" ]]; then
    log "DRILL FAILED — review the log and escalate if this is a production incident."
    exit 1
  fi

  log "Drill complete. All steps passed."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"

  echo ""
  echo "======================================================"
  echo "  Kaiju Arcade — Rollback Drill"
  echo "  Host: ${HOST}"
  echo "======================================================"
  echo ""

  get_current_version
  get_rollback_target
  execute_rollback
  verify_health
  record_result
}

main "$@"
