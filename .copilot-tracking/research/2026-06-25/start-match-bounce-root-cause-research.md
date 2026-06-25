<!-- markdownlint-disable-file -->
# Task Research: Start Match Bounce-To-Matchmaking Bug

Investigate why clicking Start Match sends players back to matchmaking/lobby instead of entering gameplay, and correlate this with server parse errors:

- Match starting...
- clients immediately leave room
- SyntaxError: Unexpected token '"', ""PY3mJEhpo"" is not valid JSON

## Task Implementation Requests

* Identify likely root cause from current code and logs.
* Explain why users appear to be "refreshed" back to matchmaking.
* Provide the most likely failing request path, payload shape, and endpoint class.

## Scope and Success Criteria

* Scope: Frontend match-start and reconnect flow plus server JSON parse boundaries. Excludes implementing code fixes.
* Assumptions: User report and provided server logs are from the same run and build.
* Success Criteria:
  * Identify one primary, evidence-backed root cause.
  * Explain observed behavior sequence end-to-end.
  * Provide concrete verification checklist for fast confirmation.

## Outline

1. Verify whether Start Match itself triggers browser submit/reload.
2. Trace post-start navigation and reconnect behavior for commander vs kaiju.
3. Map server parse failure boundaries and identify candidate endpoints.
4. Evaluate alternatives and select one recommended root cause.

## Potential Next Research

* Capture failing browser network request during kaiju reconnect.
  * Reasoning: Confirms exact URL and raw body bytes causing parser failure.
  * Reference: .copilot-tracking/research/subagents/2026-06-25/start-match-client-flow-research.md
* Add malformed JSON tests for join endpoints.
  * Reasoning: Prevents regressions and validates middleware handling assumptions.
  * Reference: .copilot-tracking/research/subagents/2026-06-25/start-match-server-parse-research.md

## Research Executed

### File Analysis

* public/common/match-room-app.js
  * Start flow sends commander.start and then intentionally leaves pre-match room and navigates role-specific page.
  * Evidence: lines 194-216, 370-373 (from subagent evidence).
* public/kaiju/app.js
  * Reconnect path uses direct join signature: client.join("match", selectedRoomId, options), then on failure routes upstream back to matchmaking.
  * Evidence: lines 1198-1224, 1657-1661, 248-268 (from subagent evidence).
* public/commander/app.js
  * Reconnect uses shared helper joinMatchById pattern.
  * Evidence: lines 685-691 (from subagent evidence).
* src/index.ts
  * express.json() globally enabled and join endpoints parse req.body expecting object payload.
  * Evidence: lines 31, 137-170, 173-207 (from subagent evidence).
* src/game/MatchRoom.ts
  * commander.start is websocket message handling, not Express JSON endpoint.
  * Evidence: lines 182-191, 408-426 (from subagent evidence).

### Code Search Results

* Search term: commander.start
  * MatchRoom websocket handler path confirms non-HTTP start.
* Search term: reconnectToken
  * Consumed in both HTTP join endpoints and websocket join options; parse error only possible on HTTP middleware path.
* Search term: express.json
  * Global parser confirms malformed application/json body fails before route logic.

### External Research

* Context7 (via subagent): Colyseus join contract notes show join-by-room-id should use joinById(roomId, options), not join(roomName, roomId, options).
  * Finding supports payload-shape mismatch risk in kaiju reconnect callsite.
  * Source: .copilot-tracking/research/subagents/2026-06-25/start-match-client-flow-research.md

### Project Conventions

* Standards referenced: existing unified matchmaking research artifacts dated 2026-06-25.
* Instructions followed: Task Researcher mode, research-document-only edits under .copilot-tracking/research/.

## Key Discoveries

### Project Structure

- Start Match command path is websocket-only.
- HTTP JSON parser failures are separate from room message handling.
- Pre-match flow intentionally navigates to role pages after activation.

### Implementation Patterns

- Commander reconnect path uses shared reservation/consume helper.
- Kaiju reconnect path bypasses shared helper and calls direct join with three arguments.
- Kaiju init failure path explicitly routes users upstream to matchmaking pages, which appears as a refresh/bounce.

### Complete Example

```javascript
// Current high-risk reconnect path in kaiju client (evidence from subagent readout)
const room = await client.join("match", selectedRoomId, {
  playerName,
  playerRole: "kaiju",
  reconnectToken,
});

// Failure path then routes upstream and users see matchmaking again
routeUpstream(true);
```

### API and Schema Documentation

- HTTP join endpoints expect JSON object bodies containing fields like playerName/reconnectToken.
- Observed error payload was a malformed top-level string body: ""PY3mJEhpo"".
- This fails in JSON middleware before endpoint business logic executes.

### Configuration Example

```text
express.json() middleware (global)
  -> rejects malformed application/json body
  -> route handlers /api/matches/:roomId/join and /api/matches/:roomId/kaiju-join are never reached for malformed input
```

## Technical Scenarios

### Scenario A: Selected Approach - Kaiju reconnect payload/signature mismatch after valid Start Match handoff

Start Match works as designed in the room. Users are moved to role pages. Kaiju reconnect then issues a likely malformed matchmake request due to unsafe join signature usage and fails, triggering fallback routing to matchmaking.

**Requirements:**

* Explain immediate client leaves after Match starting.
* Explain JSON parser error containing token-like string.
* Explain user-visible bounce back to matchmaking.

**Preferred Approach:**

* Treat kaiju reconnect call signature/body shape as primary defect.

```text
Start Match (websocket) -> pre-match client leaves room (intentional) -> navigate to /kaiju/index.html
-> kaiju reconnect call emits malformed request/payload -> express.json parse failure
-> reconnect throws -> kaiju routeUpstream(true) -> user lands back in matchmaking
```

**Implementation Details:**

```text
Primary evidence:
- public/common/match-room-app.js (intentional leave + redirect)
- public/kaiju/app.js (direct join signature + upstream fallback)
- src/index.ts (global express.json + join endpoints)
- src/game/MatchRoom.ts (start is websocket, not HTTP)
```

#### Considered Alternatives

- Alternative 1: Start button performs native form submit and reload.
  - Rejected: start buttons are type="button" and wired to click handlers.
- Alternative 2: Match start server gating fails and aborts transition.
  - Rejected: logs show Match starting... then disconnects; issue aligns with post-start handoff/reconnect failure.
- Alternative 3: Generic lobby metadata mismatch only.
  - Rejected as primary cause: can affect lobby rendering, but does not directly explain malformed JSON token payload.

## Selected Approach and Rationale

Selected root cause:

- Post-start kaiju reconnect path is the most likely defect. It likely generates an invalid/malformed JSON request body (observed as ""PY3mJEhpo"") due to a join API signature mismatch or payload construction mismatch in the reconnect flow.

Why this best fits evidence:

- Aligns with timeline: Match starts -> clients leave intentionally -> reconnect attempt fails -> upstream fallback route.
- Explains parser stack trace from body-parser in Express.
- Explains why lobby disappears and users land back on matchmaking rather than gameplay.

## Actionable Verification Checklist

1. Reproduce once with browser devtools network open on kaiju client.
2. Capture failing request URL/method/body after Start Match redirect.
3. Confirm request body bytes are malformed or string-like instead of object JSON.
4. Confirm failing request occurs before routeUpstream(true) navigation.
5. Compare kaiju reconnect implementation against commander/shared helper path.

## References

- .copilot-tracking/research/subagents/2026-06-25/start-match-client-flow-research.md
- .copilot-tracking/research/subagents/2026-06-25/start-match-server-parse-research.md
- .copilot-tracking/research/subagents/2026-06-25/start-match-existing-research-scan.md
