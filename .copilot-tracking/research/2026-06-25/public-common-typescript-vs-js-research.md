<!-- markdownlint-disable-file -->
# Task Research: public/common JavaScript in TypeScript project

Assess whether JavaScript files in public/common are required, how they are referenced, and options to align with a TypeScript-first project structure.

## Task Implementation Requests

* Determine why JavaScript files exist in public/common.
* Determine whether they are actually required at runtime.
* Recommend whether to keep, migrate, or remove them.

## Scope and Success Criteria

* Scope: Frontend runtime wiring and build output assumptions related to public/common JavaScript assets.
* Assumptions: The project compiles TypeScript for server/runtime logic and serves browser assets from public/.
* Success Criteria:
  * Confirm concrete references to public/common JavaScript files.
  * Provide a clear recommended approach with rationale.

## Outline

1. Gather evidence of where public/common files are loaded.
2. Verify whether TypeScript build emits browser bundles into public/common.
3. Evaluate alternatives and provide recommendation.

## Potential Next Research

* Estimate migration effort per shared browser helper file.
  * Reasoning: Needed to scope an incremental TS migration with low risk.
  * Reference: public/common/* and page dependencies.
* Validate a lightweight bundler output strategy that preserves current filenames.
  * Reasoning: Avoids coordinated HTML rewiring during initial migration.
  * Reference: public/*.html script tags and src/index.ts static route mapping.

## Research Executed

### File Analysis

* src/index.ts
  * /common static route is explicitly served from public/common via express static middleware (src/index.ts:48).
* public/index.html
  * Loads /common/session-manager.js (public/index.html:115).
  * Calls window.KaijuSession APIs in inline code (public/index.html:122).
* public/lobby.html
  * Loads /common/session-manager.js, /common/colyseus-client.js, /common/lobby-slot-controls.js (public/lobby.html:178, public/lobby.html:180, public/lobby.html:181).
* public/match-room.html
  * Loads /common/session-manager.js, /common/colyseus-client.js, /common/match-room-app.js (public/match-room.html:316, public/match-room.html:319, public/match-room.html:320).
* public/commander/index.html
  * Loads /common/session-manager.js and /common/colyseus-client.js (public/commander/index.html:117, public/commander/index.html:118).
* public/kaiju/index.html
  * Loads /common/session-manager.js and /common/colyseus-client.js (public/kaiju/index.html:174, public/kaiju/index.html:175).
* src/index.test.ts
  * Test expectations assert /common assets are referenced and served (src/index.test.ts:201, src/index.test.ts:212, src/index.test.ts:224, src/index.test.ts:231, src/index.test.ts:242, src/index.test.ts:251, src/index.test.ts:260).
* package.json
  * Build command is tsc only (package.json:12).
* tsconfig.json
  * rootDir is src and include scope is src/**/* with outDir dist (tsconfig.json:7, tsconfig.json:26, tsconfig.json:6).

### Code Search Results

* Query: /common/*.js usage
  * Matches in public HTML entry points and runtime scripts confirm direct browser loading.
* Query: TypeScript sources for session-manager, colyseus-client, match-room-app, lobby-slot-controls
  * No TypeScript source equivalents found under src/.

### External Research

* Not required for this repository-specific question.

### Project Conventions

* Standards referenced: repository TypeScript + static public asset patterns.
* Instructions followed: task researcher workflow with evidence-first findings.

## Key Discoveries

### Project Structure

* The project is mixed-mode by design today:
  * Backend/game server logic is TypeScript compiled from src to dist.
  * Browser UI logic is static assets under public/ and loaded directly in HTML via script tags.
* public/common/*.js are shared browser helper assets consumed by multiple pages.

### Implementation Patterns

* Shared browser helpers expose globals consumed by page-level scripts and inline logic:
  * public/common/session-manager.js:287 exposes global.KaijuSession.
  * public/common/colyseus-client.js:382 exposes global.KaijuColyseusClient.
  * public/common/lobby-slot-controls.js:22 exposes global.KaijuLobbySlots.
  * public/common/match-room-app.js:2-3 consumes global.KaijuSession and global.KaijuColyseusClient.

### Complete Examples

```text
public/lobby.html loads:
/common/session-manager.js
/common/colyseus-client.js
/common/lobby-slot-controls.js

src/index.ts serves:
app.use("/common", express.static(path.join(PUBLIC_ROOT, "common")))
```

### API and Schema Documentation

Repository-local runtime wiring; no external API required.

### Configuration Examples

```json
// package.json
"scripts": {
  "build": "tsc",
  "dev": "tsx watch src/index.ts"
}

// tsconfig.json (relevant)
"rootDir": "./src",
"outDir": "./dist",
"include": ["src/**/*"]
```

## Technical Scenarios

### Keep public/common JavaScript as runtime browser assets

Current architecture requires direct static serving of browser helper JavaScript.

**Requirements:**

* Browser pages must load shared client logic.
* Assets must be directly servable by static hosting middleware.

**Preferred Approach:**

* Keep public/common/*.js in place right now.
* If TypeScript alignment is desired, migrate incrementally with transpilation output preserving current /common filenames.

```text
public/*.html -> /common/*.js script tags -> window globals -> page runtime
src/index.ts -> app.use('/common', express.static(public/common))
```

**Implementation Details:**

* Removing public/common files immediately causes 404s for /common routes and runtime failures in pages expecting global helpers.
* Tests codify this behavior by asserting served /common assets.
* Current TypeScript toolchain does not produce browser assets into public/common.

```text
Status now: required runtime assets
Future path: add client TS sources + lightweight transpile/bundle step targeting current filenames
```

#### Considered Alternatives

* Alternative A: Remove public/common JS now
  * Rejected: breaks current runtime contract and HTML script dependencies.
* Alternative B: Full immediate migration to TypeScript frontend bundling
  * Rejected for now: higher migration risk and broader churn than needed to address immediate concern.
* Alternative C: Mixed incremental migration (selected future direction)
  * Selected for future evolution: safest path to TypeScript while preserving working runtime behavior.

## Explicit Verdict

Do we really need public/common JavaScript files right now?

* Yes. In the current repository architecture, these files are required runtime browser assets.
* They are directly loaded by HTML pages, served by Express under /common, and validated by tests.

## Selected Approach and Rationale

* Selected approach: Keep the public/common JavaScript files as-is for current behavior; plan an incremental client-side TypeScript migration that emits the same output filenames under public/common.
* Rationale:
  * Zero immediate regression risk.
  * Preserves all existing page contracts.
  * Enables gradual TypeScript adoption without a big-bang rewrite.

## Evidence Log

* src/index.ts:48
* package.json:12
* package.json:14
* tsconfig.json:6
* tsconfig.json:7
* tsconfig.json:26
* public/index.html:115
* public/index.html:122
* public/lobby.html:178
* public/lobby.html:180
* public/lobby.html:181
* public/match-room.html:316
* public/match-room.html:319
* public/match-room.html:320
* public/commander/index.html:117
* public/commander/index.html:118
* public/kaiju/index.html:174
* public/kaiju/index.html:175
* public/common/session-manager.js:287
* public/common/colyseus-client.js:382
* public/common/lobby-slot-controls.js:22
* public/common/match-room-app.js:2
* public/common/match-room-app.js:3
* src/index.test.ts:201
* src/index.test.ts:212
* src/index.test.ts:224
* src/index.test.ts:231
* src/index.test.ts:242
* src/index.test.ts:251
* src/index.test.ts:260

## Subagent Source

Detailed delegated findings are consolidated from:

* .copilot-tracking/research/subagents/2026-06-25/public-common-js-usage-research.md
