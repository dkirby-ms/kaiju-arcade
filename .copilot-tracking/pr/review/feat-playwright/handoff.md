<!-- markdownlint-disable-file -->
# PR Review Handoff: feat-playwright

## PR Overview

Adds complete Playwright e2e test infrastructure to kaiju-arcade. Introduces 4 spec files covering the entry-to-lobby smoke flow, full multiplayer start flow, API-seeded start-gating validation, and a deferred continuation-window skeleton. Includes 2 shared helper modules, a CI workflow, and `data-testid` instrumentation across all 4 HTML pages.

The overall design is strong: isolated browser contexts per player, API-assisted state seeding in `start-gating`, proper `afterEach` cleanup, and use of `expect.poll` for async Colyseus state. Seven comments are ready for submission.

- **Branch**: `feat-playwright`
- **Base Branch**: `main`
- **Total Files Changed**: 13 (9 added, 4 modified)
- **Total Review Comments**: 7

---

## PR Comments Ready for Submission

### File: `tests/e2e/entry-lobby-smoke.spec.ts`

#### Comment 1 (Lines 18–22)

- **Category**: Reliability
- **Severity**: ⚠️ Medium

The `expect.poll` assertion requires at least one `<li>` in the lobby room list, but no room has been created by this test. On a fresh CI server with zero existing rooms this will time out and fail every run — making the smoke test unreliable as a gate.

**Suggested Change:**

```typescript
// Option A — remove the poll and rely on the .toBeVisible() already asserted above.
// The lobby-room-list renders (even empty) as soon as the lobby connects.
// Remove lines 18–22 entirely.

// Option B — seed a room via the API helper first, then assert count > 0:
// const reservation = await createMatchReservation(baseURL!, { playerName: `seed-${Date.now()}` });
// await expect.poll(async () => page.getByTestId("lobby-room-list").locator("li").count()).toBeGreaterThan(0);
```

---

### File: `tests/e2e/helpers/api.ts`

#### Comment 2 (Lines 26–38)

- **Category**: Reliability
- **Severity**: ⚠️ Medium

`postJson` uses `fetch()` without a timeout or `AbortController`. A hung server request will block the test runner silently until the 20-minute job limit is hit. Adding a 10-second abort makes failures fast and legible.

**Suggested Change:**

```typescript
async function postJson<TResponse>(baseURL: string, path: string, body: Record<string, unknown>): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(new URL(path, baseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}) ${path}: ${errorText}`);
  }

  return (await response.json()) as TResponse;
}
```

---

### File: `playwright.config.ts`

#### Comment 3 (Lines 6–7)

- **Category**: Reliability
- **Severity**: ⚠️ Medium

`fullyParallel: false` prevents parallelism within a file, but Playwright still runs multiple files concurrently when `workers` is `undefined` (defaults to half CPU count locally). With a shared live Colyseus server, concurrent spec files — e.g. `multiplayer-start` and `start-gating` — can create rooms simultaneously, causing state collisions and flaky results. CI is already serialised (`workers: 1`); apply the same for local runs.

**Suggested Change:**

```typescript
fullyParallel: false,
workers: 1,
```

---

### File: `tests/e2e/helpers/multiplayer.ts`

#### Comment 4 (Lines 31–33)

- **Category**: Code Quality
- **Severity**: 💡 Low

`gotoLobby` is exported but not imported by any spec. Dead exports make the helper's API surface ambiguous. Remove it, or add a comment linking it to the planned spec that will use it.

**Suggested Change:**

```typescript
// Remove the gotoLobby export entirely:
// export async function gotoLobby(...) { ... }
```

---

#### Comment 5 (Line 14)

- **Category**: Code Quality
- **Severity**: 💡 Low

`reservation?: unknown` loses the `ApiSeatReservation` shape. Callers get no type safety or autocomplete when working with reservation fields. The type is already exported from `./api`.

**Suggested Change:**

```typescript
import type { ApiSeatReservation } from "./api";

export interface MatchRoomSessionSeed {
  playerName: string;
  roomId: string;
  reservation?: ApiSeatReservation;
}
```

---

### File: `.github/workflows/e2e-playwright.yml`

#### Comment 6 (After the `Install dependencies` step)

- **Category**: Performance
- **Severity**: 💡 Low

Playwright browser binaries (~150 MB for Chromium) are re-downloaded on every CI run. The `actions/setup-node` npm cache only covers `node_modules`. Adding a dedicated cache step keyed on `package-lock.json` reduces browser install from ~60 s to ~2 s on cache hits.

**Suggested Change:**

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('package-lock.json') }}

- name: Install Playwright Chromium
  run: npx playwright install --with-deps chromium
```

---

#### Comment 7 (Lines 32–38)

- **Category**: Operations
- **Severity**: 💡 Low

The `upload-artifact` step omits `retention-days`, so GitHub keeps failure screenshots, videos, and traces for the default 90 days. These artifacts have short diagnostic value; 14 days is sufficient and avoids unnecessary storage consumption.

**Suggested Change:**

```yaml
- name: Upload Playwright artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-failure-artifacts
    path: |
      playwright-report/
      test-results/
    if-no-files-found: ignore
    retention-days: 14
```

---

## Review Summary by Category

| Category | Count |
|----------|-------|
| Reliability | 3 |
| Code Quality | 2 |
| Performance | 1 |
| Operations | 1 |
| Security | 0 |
| **Total** | **7** |

## Instruction Compliance

- ✅ General code quality: Clean structure, good use of Playwright best practices, proper `afterEach` teardown
- ✅ Security: No secrets, no injection surfaces in test helpers
- ⚠️ Reliability: 3 findings — flaky smoke assertion, missing fetch timeout, concurrent worker risk

## Outstanding Risks / Follow-up

- The `continue-window.spec.ts` skeleton is intentionally skipped. When continuation-window behavior is implemented, the TODO comment should reference the GitHub issue tracking that work so it doesn't get forgotten.
- Consider adding a `test:e2e:ci` script that explicitly sets `CI=true` to make it easy to reproduce CI behaviour locally without setting env vars manually.
