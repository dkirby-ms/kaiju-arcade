<!-- markdownlint-disable-file -->
# PR Review Status: feat-playwright

## Review Status

- Phase: 3 — Collaborative Review
- Last Updated: 2026-06-25
- Summary: Adds Playwright e2e test infrastructure with 4 spec files, 2 helper modules, a CI workflow, and data-testid instrumentation across 4 HTML pages.

## Branch and Metadata

- Normalized Branch: `feat-playwright`
- Source Branch: `feat-playwright`
- Base Branch: `main`
- PR: [#22 — Feat: Add playwright test coverage](https://github.com/dkirby-ms/kaiju-arcade/pull/22)
- Linked Work Items: None explicitly linked

## Commits

| SHA | Message |
|-----|---------|
| `d9f2987` | feat: playwright test coverage |
| `52689c0` | feat: playwright testing infra |
| `5fc47d2` | feat: playwright test coverage plan |
| `dbeec5d` | feat: playwright research |

## Diff Mapping

| File | Type | Lines | Notes |
|------|------|-------|-------|
| `.github/workflows/e2e-playwright.yml` | Added | 1–38 | CI workflow, Chromium only |
| `package.json` | Modified | +4 scripts, +1 dep | `@playwright/test ^1.54.1`, 4 test:e2e scripts |
| `playwright.config.ts` | Added | 1–28 | Config: webServer, chromium, retries |
| `tests/e2e/entry-lobby-smoke.spec.ts` | Added | 1–33 | Entry → lobby → create match smoke |
| `tests/e2e/continue-window.spec.ts` | Added | 1–16 | Deferred/skipped skeleton |
| `tests/e2e/multiplayer-start.spec.ts` | Added | 1–73 | Full multiplayer UI flow |
| `tests/e2e/start-gating.spec.ts` | Added | 1–95 | API-seeded start gating test |
| `tests/e2e/helpers/api.ts` | Added | 1–68 | REST API helpers (create/join match) |
| `tests/e2e/helpers/multiplayer.ts` | Added | 1–52 | Multi-browser context helpers |
| `public/lobby.html` | Modified | +4 `data-testid` attrs | lobby-root, create-match-button, lobby-room-list, enter-match-{id} |
| `public/match-room.html` | Modified | +6 `data-testid` attrs | match-room-root, match-room-id, match-room-phase, claim buttons, ready/start |
| `public/commander/index.html` | Modified | +2 `data-testid` attrs | commander-root, commander-active-ui |
| `public/kaiju/index.html` | Modified | +2 `data-testid` attrs | kaiju-root, kaiju-active-ui |

## Instruction Files Reviewed

- `coding-standards/uv-projects.instructions.md`: Not applicable (Python)
- General code quality and reliability apply

---

## Review Items

### ✅ Approved for PR Comment

#### RI-01: `entry-lobby-smoke.spec.ts` — Flaky assertion requires a pre-existing room
- **File**: `tests/e2e/entry-lobby-smoke.spec.ts` lines 18–22
- **Decision**: Approved

#### RI-02: `helpers/api.ts` — No fetch timeout / AbortController
- **File**: `tests/e2e/helpers/api.ts` lines 26–38
- **Decision**: Approved

#### RI-03: `playwright.config.ts` — Concurrent workers risk state collision on shared server
- **File**: `playwright.config.ts` lines 6–7
- **Decision**: Approved

#### RI-04: `helpers/multiplayer.ts` — `gotoLobby` exported but unused
- **File**: `tests/e2e/helpers/multiplayer.ts` lines 31–33
- **Decision**: Approved

#### RI-05: `helpers/multiplayer.ts` — `reservation?: unknown` weak type
- **File**: `tests/e2e/helpers/multiplayer.ts` line 14
- **Decision**: Approved

#### RI-06: `e2e-playwright.yml` — Playwright browser binaries not cached in CI
- **File**: `.github/workflows/e2e-playwright.yml`
- **Decision**: Approved

#### RI-07: `e2e-playwright.yml` — No `retention-days` on failure artifact upload
- **File**: `.github/workflows/e2e-playwright.yml` lines 32–38
- **Decision**: Approved

### ❌ Rejected / No Action

*(populated during Phase 3)*

---

## Phase 2 — Analysis Findings Queue

### RI-01: `entry-lobby-smoke.spec.ts` — Flaky assertion requires a pre-existing room
- **File**: `tests/e2e/entry-lobby-smoke.spec.ts` lines 18–22
- **Category**: Reliability
- **Severity**: Medium

### RI-02: `helpers/api.ts` — No fetch timeout / AbortController
- **File**: `tests/e2e/helpers/api.ts` lines 26–38
- **Category**: Reliability
- **Severity**: Medium

### RI-03: `playwright.config.ts` — Concurrent workers risk state collision on shared server
- **File**: `playwright.config.ts` lines 6–7
- **Category**: Reliability
- **Severity**: Medium

### RI-04: `helpers/multiplayer.ts` — `gotoLobby` exported but unused
- **File**: `tests/e2e/helpers/multiplayer.ts` lines 31–33
- **Category**: Code Quality
- **Severity**: Low

### RI-05: `helpers/multiplayer.ts` — `reservation?: unknown` weak type
- **File**: `tests/e2e/helpers/multiplayer.ts` line 14
- **Category**: Code Quality
- **Severity**: Low

### RI-06: `e2e-playwright.yml` — Playwright browser binaries not cached in CI
- **File**: `.github/workflows/e2e-playwright.yml`
- **Category**: Performance
- **Severity**: Low

### RI-07: `e2e-playwright.yml` — No `retention-days` on failure artifact upload
- **File**: `.github/workflows/e2e-playwright.yml` lines 32–38
- **Category**: Operations
- **Severity**: Low

---

## Next Steps

- [x] Phase 1: Initialize tracking workspace
- [x] Phase 2: Diff parsed, findings queued
- [ ] Phase 3: Surface RI-01 through RI-07 to user, capture decisions
- [ ] Phase 4: Finalize handoff.md
