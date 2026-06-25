---
title: "Security Controls"
description: "Rate limit thresholds, CI security scanning, and abuse remediation procedures for kaiju-arcade."
ms.date: 2026-06-25
ms.topic: reference
---

## Purpose

This document describes the security controls applied to the kaiju-arcade production server. It covers in-process rate limiting, CI-integrated dependency and secret scanning, and the remediation obligations for each control category.

---

## Rate Limiting

### Overview

The server enforces per-IP token bucket rate limits on the match creation and join endpoints. Rate limiting is implemented in `src/ops/rate-limit.ts` using a pure in-memory token bucket — no external packages are required.

### Thresholds

| Endpoint                                 | Config Variable            | Default |
|------------------------------------------|----------------------------|---------|
| `POST /api/matches` (create match)       | `RATE_LIMIT_CREATE_RPM`    | Set via environment variable |
| `POST /api/matches/:roomId/join`         | `RATE_LIMIT_JOIN_RPM`      | Set via environment variable |
| `POST /api/matches/:roomId/kaiju-join`   | `RATE_LIMIT_JOIN_RPM`      | Set via environment variable |

When a bucket is exhausted the server returns:

```json
HTTP 429 Too Many Requests
{ "error": "Too many requests", "retryAfterSeconds": N }
```

### Tuning Guidance

Adjust thresholds via environment variables — no code changes are required:

- `RATE_LIMIT_JOIN_RPM` — maximum join attempts per IP per minute.
- `RATE_LIMIT_CREATE_RPM` — maximum match creation attempts per IP per minute.

Set these values based on observed legitimate peak traffic. A useful starting point is 3× the p99 requests-per-minute for that endpoint from the previous 30 days. After any threshold change, monitor 429 response volume for 10 minutes to confirm the change does not block legitimate players.

Document all threshold changes in the release notes and follow the change governance process in [change-governance.md](change-governance.md).

### Monitoring

- 429 responses are logged at `[WARN]` level with the rate-limited IP and the endpoint path.
- Track 429 rate in the SLO dashboard and set up a `KaijuRateLimitHigh` alert if 429s exceed 1% of endpoint requests over a 5-minute window.
- A spike in 429s from a single IP is a strong signal of automated abuse; escalate to the security remediation process below.

### Remediation SLA for Abuse Reports

| Severity                                       | Response SLA |
|------------------------------------------------|--------------|
| Automated join flooding from single IP (DoS)   | 1 hour       |
| Coordinated multi-IP abuse                     | 4 hours      |
| Reported vulnerability in rate limit logic     | 24 hours     |

---

## CI Security Scanning

CI runs on every push and every pull request targeting `main`. The pipeline enforces the following security checks:

### npm Audit

`npm audit --audit-level=high` is run as a dedicated CI job. Any `high` or `critical` severity finding blocks the build.

### Secret Scanning

TruffleHog (`trufflesecurity/trufflehog@v3`) scans every push and PR for verified leaked credentials. A verified secret detected in any commit blocks the build.

### Remediation SLA for CI Findings

| Severity                                       | Remediation SLA |
|------------------------------------------------|-----------------|
| Critical vulnerability in a dependency         | 24 hours        |
| High vulnerability in a dependency             | 7 days          |
| Medium vulnerability in a dependency           | 30 days         |
| Verified secret detected in commit             | Immediate — rotate credential, then fix within 1 hour |

When a critical or high finding is detected:

1. The on-call engineer is notified via the team channel.
2. The affected dependency is patched or pinned to a safe version.
3. A tracking issue is filed with the CVE reference, affected component, and planned fix date.
4. The fix is validated by re-running `npm audit` locally before merging.

---

## Vulnerability Management

| Severity | Remediation SLA | Action |
|----------|----------------|--------|
| Critical | 24 hours       | Immediate patch or dependency pin; notify on-call engineer; file tracking issue with CVE reference |
| High     | 7 days         | Patch in next sprint; tracking issue required; escalate if unresolved at 5 days |
| Medium   | 30 days        | Scheduled patch; track in backlog with CVE reference |
| Low      | Next quarterly review | Document and monitor; patch during routine dependency updates |

Run `npm audit` before every release and after any dependency addition. If a critical or high finding cannot be patched immediately, a waiver must be approved by the Ops lead and documented in the tracking issue.

---

## Secret Management

- **Never commit secrets.** API keys, tokens, database passwords, and TLS private keys must never appear in source code, configuration files, or commit history.
- **Use environment variables.** All secrets are injected at runtime via environment variables. See `src/ops/config.ts` for the canonical list of configuration fields.
- **Rotate on suspected leak.** If a secret is suspected to have been exposed (e.g., found by TruffleHog, visible in a log, or committed accidentally), rotate the credential immediately and before any other remediation step.
- **Rotation procedure:**
  1. Generate a new credential in the issuing system.
  2. Update the secret in the deployment environment.
  3. Verify the service restarts and health checks pass.
  4. Revoke the old credential.
  5. File an incident record with the exposure timeline, rotation timestamp, and affected systems.
- **Access control.** Restrict secret access to the minimum set of systems and individuals required. Review access grants quarterly.
