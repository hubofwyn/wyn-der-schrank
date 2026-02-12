# Wyn der Schrank — Agentic Telemetry & Phaser Version Enforcement

**Companion to:** `docs/FOUNDATION.md` (architecture), `docs/plans/agentic-setup.md` (tooling), `docs/plans/game-blueprint.md` (domain)
**See also:** `docs/plans/diagnostics.md` — Game runtime diagnostics (separate system, different consumer)
**Date:** February 10, 2026
**Last updated:** February 11, 2026
**Status:** CANONICAL — Defines observability, drift prevention, and docs-first enforcement
**Scope:** All agentic development sessions across Claude Code CLI, subagents, and CI

> **Implementation note (2026-02-11):** Agentic telemetry hooks are operational
> but had several bugs fixed on this date:
>
> - `session_id` now parsed from hook JSON stdin (was using nonexistent `CLAUDE_SESSION_ID` env var)
> - JSONL output uses `jq -cn` for compact single-line format (was pretty-printed, 10x file bloat)
> - PostToolUse matcher extended to cover `Bash` tool use (was Edit/Write only)
> - SessionEnd hook has canary debug file (`.claude/telemetry/.session-end-canary`) to verify firing
> - Zone-lint and phaser-guard hooks now emit telemetry events DIRECTLY (inline `_emit_telemetry`)
>   instead of relying on `TELEMETRY_RESULT` env var passing between chained hooks (which never worked
>   because hooks run as separate processes and don't share environment)
> - telemetry-log.sh now records tool-use events only (result always "ok"); violations and warnings
>   are recorded by the hooks that detect them
> - SessionEnd hook includes log rotation: events.jsonl rotated to events.jsonl.1 when exceeding
>   10,000 lines, preventing unbounded growth while preserving one generation of history
>
> **Format break (2026-02-11):** Pre-fix events.jsonl (5280 lines, pretty-printed JSON,
> all `sessionId: "unknown"`) was reset. New events use compact single-line JSONL with
> real session IDs from hook JSON stdin. The pre-fix data had zero analytical value due
> to the format and session ID issues.
>
> The local docs mirror (`docs/vendor/phaser-4.0.0-rc.6/`) described in sections 2-3
> was never created. The project uses `node_modules/.bun/phaser@4.0.0-rc.6/node_modules/phaser/types/phaser.d.ts`
> as the authoritative type reference and the online docs at
> `https://docs.phaser.io/api-documentation/4.0.0-rc.6/` as the secondary source.
> References to the vendor mirror in this doc are aspirational, not current state.

---

## Part I: Phaser 4 Version Enforcement

Agents trained on internet-scale data carry deep Phaser 3 habits. Phaser's own docs site labels rc.6 as "unreleased" and defaults to v3 as "latest." Without hard enforcement, every agent session trends toward Phaser 3 regression. This section establishes a docs-first contract with deterministic gates.

### 1. The Problem

| Symptom | Root Cause |
|---------|------------|
| Agent writes `this.physics.add.existing()` | Phaser 3 Arcade Physics pattern |
| Agent references `WebGPU` renderer | Confusing Phaser 4 marketing with actual rc.6 API |
| Agent uses `this.load.image()` in `create()` | Phaser 3 lazy-load pattern (v4 preload works differently) |
| Agent writes `scene.add.text()` style params | Phaser 3 text API (v4 uses different styling) |
| Agent cites `photonstorm.github.io/phaser3-docs` | Training data overwhelmingly v3 |
| Agent invents methods that don't exist | Hallucinating from v3 memory when v4 equivalent is different |

TypeScript catches some of these (the types won't match), but not all — especially when the agent writes plausible code that compiles but behaves incorrectly, or when it writes JSDoc comments and documentation that reference wrong APIs.

### 2. Local Docs Mirror (The Single Biggest Improvement)

When agents can instantly search a local docs tree, they stop "remembering" and start **retrieving**. Hallucination drops dramatically.

#### Option A: TypeDoc from Source (Preferred — Complete + Grep-Friendly)

```bash
# One-time setup
TAG="v4.0.0-rc.6"
mkdir -p docs/vendor

# Clone just the tag
git clone --depth 1 --branch "$TAG" \
  https://github.com/phaserjs/phaser.git \
  /tmp/phaser-rc6

# Generate docs from TypeScript declarations
cd /tmp/phaser-rc6
npx typedoc ./types/*.d.ts \
  --out docs \
  --includeVersion \
  --skipErrorChecking

# Copy into project
cp -r /tmp/phaser-rc6/docs ../docs/vendor/phaser-4.0.0-rc.6
rm -rf /tmp/phaser-rc6

# Verify
ls docs/vendor/phaser-4.0.0-rc.6/
```

This produces the complete API reference as HTML + JSON, fully searchable with `rg` or `grep`.

#### Option B: Mirror the Hosted Docs Site

```bash
wget --mirror --page-requisites --convert-links --no-parent \
  --directory-prefix=docs/vendor/phaser-4.0.0-rc.6 \
  https://docs.phaser.io/api-documentation/4.0.0-rc.6/
```

#### Option C: Types-Only Mirror (Minimal — Still Effective)

Even without full docs, the `.d.ts` files are the ultimate truth:

```bash
# Already in node_modules after install, but make an explicit searchable copy
mkdir -p docs/vendor/phaser-4.0.0-rc.6/types
cp node_modules/phaser/types/*.d.ts docs/vendor/phaser-4.0.0-rc.6/types/
```

Now agents can:

```bash
rg -n "class.*Scene" docs/vendor/phaser-4.0.0-rc.6/
rg -n "setScrollFactor" docs/vendor/phaser-4.0.0-rc.6/
rg -n "SpriteGPULayer" docs/vendor/phaser-4.0.0-rc.6/
rg -n "createLayer" docs/vendor/phaser-4.0.0-rc.6/types/
```

**Add to `.gitignore`:**

```text
# Vendor docs (regenerate with scripts/mirror-phaser-docs.sh)
docs/vendor/
```

### 3. Phaser Evidence File

Every new Phaser API usage must be backed by a citation. This file is the audit trail.

#### `docs/PHASER_EVIDENCE.md`

```markdown
# Phaser 4.0.0-rc.6 — API Evidence Log

Source of truth: https://docs.phaser.io/api-documentation/4.0.0-rc.6/
Local mirror: docs/vendor/phaser-4.0.0-rc.6/

## Format

Each entry records a Phaser symbol used in this project, its verified rc.6 doc location,
and the project file(s) that use it. Add entries when introducing NEW Phaser API usage.
Do not duplicate entries — if a symbol is already listed, additional usages don't need a new row.

| Symbol | rc.6 Doc Path / URL | First Used In | Date | Verified By |
|--------|---------------------|---------------|------|-------------|
| `Phaser.Scene` | `/classes/Phaser.Scene.html` | `scenes/base-scene.ts` | 2026-02-10 | foundation |
| `Phaser.Game` | `/classes/Phaser.Game.html` | `main.ts` | 2026-02-10 | foundation |
| `Phaser.GameObjects.Sprite` | `/classes/Phaser.GameObjects.Sprite.html` | `scenes/platformer-scene.ts` | 2026-02-10 | foundation |
| `Phaser.AUTO` | `/variables/Phaser.AUTO.html` | `main.ts` | 2026-02-10 | foundation |
| `SpriteGPULayer` | `/classes/Phaser.GameObjects.SpriteGPULayer.html` | (planned) | — | — |
| `Texture#setWrap` | `/classes/Phaser.Textures.Texture.html#setWrap` | (planned) | — | — |

## Rejected (Phaser 3 only — NOT in rc.6)

| Symbol | Why Rejected | Correct rc.6 Alternative |
|--------|-------------|--------------------------|
| (none yet) | | |
```

### 4. CLAUDE.md Contract Additions

These rules go into the root `CLAUDE.md` (the always-loaded project contract). They are advisory but visible to the agent on every session start.

```markdown
# Phaser 4.0.0-rc.6 — Docs-First Contract (NON-NEGOTIABLE)

Source of truth:
- LOCAL MIRROR: docs/vendor/phaser-4.0.0-rc.6/ (grep here FIRST)
- ONLINE: https://docs.phaser.io/api-documentation/4.0.0-rc.6/
- TYPES: node_modules/phaser/types/*.d.ts

Rules:
1. Before using ANY Phaser symbol not already in this codebase, you MUST:
   a. Locate it in the rc.6 docs (local mirror preferred: `rg -n "symbol" docs/vendor/`)
   b. Record an rc.6 docs URL or path in docs/PHASER_EVIDENCE.md
   c. If in doubt, check the .d.ts types: `rg -n "symbol" node_modules/phaser/types/`

2. If you CANNOT find the symbol in rc.6 docs, you MUST say:
   "Not found in Phaser 4.0.0-rc.6 docs" and STOP.
   Do not guess from Phaser 3 knowledge. Do not improvise.

3. NEVER cite or use patterns from:
   - photonstorm.github.io/phaser3-docs (legacy v3 archive)
   - docs.phaser.io/api-documentation/api-documentation (this is v3.90.0, NOT v4)
   - Any tutorial, blog, or video that references Phaser 3 without explicitly confirming v4 compatibility

4. Phaser 4 renderer is WebGL (WebGL2-class pipeline). NOT WebGPU.
   Never reference WebGPU in code, comments, or documentation.

5. When writing scene code, verify these rc.6-specific patterns:
   - Preloading happens in PreloadScene (never lazy-load in create())
   - Physics API may differ from v3 Arcade — verify every method call
   - Tilemap GPU layers: orthographic ONLY (not hex, not isometric)
```

### 5. Phaser Doc Lookup Skill

This skill forces a docs retrieval step before any new Phaser API usage.

#### `.claude/skills/phaser-doc/SKILL.md`

````markdown
---
name: phaser-doc
description: Look up Phaser 4.0.0-rc.6 API documentation before using any Phaser symbol
---
# Phaser Doc Lookup

When asked about Phaser APIs, or when you need to use a Phaser symbol not already in the codebase:

## Step 1: Search Local Mirror
```bash
rg -n "$ARGUMENTS" docs/vendor/phaser-4.0.0-rc.6/ --max-count 10
```

## Step 2: Search Type Declarations

```bash
rg -n "$ARGUMENTS" node_modules/phaser/types/ --max-count 10
```

## Step 3: Report

Return:

- The best-matching doc page path(s)
- The exact class/method/property signature (short excerpt)
- The canonical online URL: `https://docs.phaser.io/api-documentation/4.0.0-rc.6/<path>`

## Step 4: Evidence

If this is a NEW symbol for the project, add an entry to `docs/PHASER_EVIDENCE.md`.

## If Not Found

Say: "Not found in Phaser 4.0.0-rc.6 docs or types."
Do NOT answer from memory. Do NOT guess from Phaser 3.
Ask if the user wants to search for an alternative.

````

### 6. Deterministic Enforcement (Hooks)

Advisory rules (CLAUDE.md) get ignored under pressure. Hooks are deterministic — they run every time, no exceptions. These hooks form the hard gates that catch Phaser drift the agent's instructions failed to prevent.

All hook scripts live in `.claude/hooks/` and are executable bash scripts.

#### `.claude/hooks/phaser-version-guard.sh`

This runs after every file write/edit. It scans the changed file for new Phaser imports or `Phaser.` references that don't have a corresponding entry in `PHASER_EVIDENCE.md`.

```bash
#!/usr/bin/env bash
# .claude/hooks/phaser-version-guard.sh
# PostToolUse hook for Edit|Write — checks Phaser evidence discipline
set -euo pipefail

# Read hook input JSON from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check .ts files in apps/client/
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ ^apps/client/.*\.ts$ ]]; then
  exit 0
fi

# Skip non-scene/non-adapter files (modules/ should never have Phaser refs anyway)
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  # modules/ should NEVER reference Phaser — hard fail
  if grep -qE 'import.*from.*["\x27]phaser|Phaser\.' "$FILE_PATH" 2>/dev/null; then
    echo "ZONE VIOLATION: $FILE_PATH imports Phaser in modules/ zone" >&2
    echo "modules/ must be pure TypeScript — use port interfaces from core/ports/" >&2
    exit 2  # exit 2 = block action in Claude Code
  fi
  exit 0
fi

# For scene/adapter files: check for undocumented Phaser symbols
EVIDENCE_FILE="docs/PHASER_EVIDENCE.md"
if [[ ! -f "$EVIDENCE_FILE" ]]; then
  exit 0  # No evidence file yet — skip (Phase 0 grace period)
fi

# Extract Phaser symbols from the changed file
SYMBOLS=$(grep -oE 'Phaser\.[A-Za-z._]+' "$FILE_PATH" 2>/dev/null | sort -u || true)

MISSING=()
for sym in $SYMBOLS; do
  # Check if symbol (or a parent class) is documented
  SHORT=$(echo "$sym" | sed 's/Phaser\.//')
  if ! grep -q "$SHORT" "$EVIDENCE_FILE" 2>/dev/null; then
    MISSING+=("$sym")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARNING: Undocumented Phaser symbols in $FILE_PATH:" >&2
  printf "  - %s\n" "${MISSING[@]}" >&2
  echo "" >&2
  echo "Action required: verify each symbol exists in Phaser 4.0.0-rc.6 docs" >&2
  echo "  rg -n 'SymbolName' docs/vendor/phaser-4.0.0-rc.6/" >&2
  echo "Then add to docs/PHASER_EVIDENCE.md" >&2
  # WARNING only, not a hard block — use exit 2 to make it a hard block
  exit 0
fi
```

#### `.claude/hooks/block-phaser3-urls.sh`

Prevents agents from fetching Phaser 3 documentation.

```bash
#!/usr/bin/env bash
# .claude/hooks/block-phaser3-urls.sh
# PreToolUse hook for Bash|WebFetch — blocks Phaser 3 doc URLs
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input.url // empty')

# Block known Phaser 3 doc URLs
BLOCKED_PATTERNS=(
  "photonstorm.github.io/phaser3-docs"
  "docs.phaser.io/api-documentation/api-documentation"  # v3.90.0 default
  "docs.phaser.io/api-documentation/3"
  "newdocs.phaser.io.*3\."
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern" 2>/dev/null; then
    echo "BLOCKED: Phaser 3 documentation URL detected" >&2
    echo "This project uses Phaser 4.0.0-rc.6 ONLY" >&2
    echo "Use: docs/vendor/phaser-4.0.0-rc.6/ or https://docs.phaser.io/api-documentation/4.0.0-rc.6/" >&2
    exit 2  # Hard block
  fi
done
```

#### `.claude/hooks/zone-lint-on-edit.sh`

Enhanced version of the existing zone check — now includes Phaser import scanning.

```bash
#!/usr/bin/env bash
# .claude/hooks/zone-lint-on-edit.sh
# PostToolUse hook for Edit|Write — lint modules/ zone + Phaser check
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.ts$ ]]; then
  exit 0
fi

# Zone check for modules/
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  # Fast ESLint on just this file
  if command -v bunx &>/dev/null; then
    RESULT=$(bunx eslint "$FILE_PATH" --max-warnings 0 2>&1) || {
      echo "ZONE VIOLATION in $FILE_PATH:" >&2
      echo "$RESULT" >&2
      exit 2
    }
  fi

  # Double-check: grep for forbidden imports (belt + suspenders)
  if grep -qE 'from\s+["\x27]phaser|import.*Phaser|window\.|document\.|requestAnimationFrame' "$FILE_PATH" 2>/dev/null; then
    echo "ZONE VIOLATION: $FILE_PATH contains forbidden imports/globals" >&2
    echo "modules/ must be pure TypeScript with NO Phaser or browser references" >&2
    exit 2
  fi
fi
```

### 7. Updated `.claude/settings.json` (Corrected Hook Format)

The hooks section uses Claude Code's actual settings.json schema: arrays of matcher groups with nested hook handler arrays.

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(rg *)",
      "Bash(wc *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(jq *)",
      "Bash(bun run check)",
      "Bash(bun run typecheck)",
      "Bash(bun run lint:zones)",
      "Bash(bun run deps:check)",
      "Bash(bun run test:run)",
      "Bash(bun run test)",
      "Bash(bun run format:check)",
      "Bash(bun run format)",
      "Bash(bun run dev)",
      "Bash(bun run build)",
      "Bash(bun test *)",
      "Bash(bunx vitest run *)",
      "Bash(bunx eslint *)",
      "Bash(bunx biome check *)",
      "Bash(bunx dependency-cruiser *)",
      "Bash(bunx typedoc *)",
      "Bash(tsc *)",
      "Bash(bunx tsc *)",
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git branch *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(git reset --hard *)",
      "Bash(git clean *)",
      "Bash(rm -rf *)",
      "Bash(bun add *)",
      "Bash(bun remove *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-phaser3-urls.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/zone-lint-on-edit.sh"
          },
          {
            "type": "command",
            "command": ".claude/hooks/phaser-version-guard.sh"
          },
          {
            "type": "command",
            "command": ".claude/hooks/telemetry-log.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/session-summary.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/telemetry-log.sh subagent-stop"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/session-end-report.sh"
          }
        ]
      }
    ]
  }
}
```

### 8. Maximum Discipline Mode

For sessions where Phaser correctness is critical (scene implementations, adapter writing), restrict tools to eliminate web drift entirely:

```bash
# No web search, no web fetch — agent can ONLY use local mirror + types
claude --tools "Bash,Read,Edit,Write,Grep,Glob"
```

The agent must work from:

- `docs/vendor/phaser-4.0.0-rc.6/` (local docs mirror)
- `node_modules/phaser/types/*.d.ts` (authoritative type declarations)
- Existing codebase patterns (grep for what's already working)

This eliminates "I saw a blog post about Phaser…" behavior entirely.

### 9. Task Template (Docs-Shaped)

When handing Phaser-touching tasks to agents, use this structure to force docs-first thinking:

```markdown
## Task: [description]

### Goal
[What should be accomplished]

### Phaser APIs Expected
- `Phaser.X.Y.Z` — [purpose]
- `Phaser.A.B` — [purpose]
- Unknown: [list any APIs that need doc verification]

### Docs Evidence Required
- [ ] Each symbol verified in rc.6 docs (local mirror or types)
- [ ] New entries added to docs/PHASER_EVIDENCE.md
- [ ] No Phaser 3 patterns used

### Acceptance Checks
- [ ] `bun run typecheck` passes
- [ ] `bun run check` passes
- [ ] Manual runtime smoke test (describe expected behavior)
```

---

## Part II: Agentic Telemetry & Observability

Observability answers three questions for agentic development: *What did the agent do?* *Was it correct?* *Is the project drifting?*

### 10. Telemetry Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                  CLAUDE CODE SESSION                          │
│                                                               │
│  Hooks fire at lifecycle points ──┐                          │
│  (PreToolUse, PostToolUse, Stop,  │                          │
│   SubagentStop, SessionEnd)       │                          │
│                                   ▼                          │
│                         .claude/hooks/*.sh                   │
│                              │                               │
│                              ▼                               │
│                     .claude/telemetry/                        │
│                     ├── events.jsonl    (append-only log)     │
│                     ├── sessions.jsonl  (session summaries)   │
│                     └── drift-report.md (human-readable)      │
└──────────────────────────────────────────────────────────────┘
                              │
                    (periodic / on-demand)
                              ▼
                    scripts/telemetry-report.sh
                              │
                              ▼
                    Terminal / dashboard output
```

This is a lightweight, file-based approach appropriate for a solo developer / small team. No external services, no servers, no database. Just structured JSONL files that are easy to grep, analyze, and version-control.

For teams that scale beyond this, the architecture is compatible with HTTP-based collectors (the hooks can POST to a local Bun server with SQLite + WebSocket, following the pattern from `disler/claude-code-hooks-multi-agent-observability`).

### 11. Telemetry Event Schema

```typescript
// For reference — the actual implementation is in bash/jq
interface TelemetryEvent {
  timestamp: string;         // ISO 8601
  sessionId: string;         // ${CLAUDE_SESSION_ID}
  eventType: string;         // hook event name
  toolName?: string;         // which tool was used
  filePath?: string;         // which file was affected
  result: 'ok' | 'warning' | 'violation' | 'blocked';
  category: string;          // 'zone' | 'phaser' | 'edit' | 'test' | 'session'
  detail: string;            // human-readable description
  durationMs?: number;       // hook execution time
}
```

### 12. Hook Scripts (Telemetry)

#### `.claude/hooks/telemetry-log.sh`

The core telemetry hook — appends structured events to the JSONL log. Called by other hooks and also directly as a PostToolUse handler.

```bash
#!/usr/bin/env bash
# .claude/hooks/telemetry-log.sh
# Append a telemetry event to .claude/telemetry/events.jsonl
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"
mkdir -p "$TELEMETRY_DIR"

# Read hook input
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
EVENT_TYPE="${1:-PostToolUse}"
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty' 2>/dev/null || echo "")

# Determine category
CATEGORY="edit"
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  CATEGORY="zone"
elif [[ "$FILE_PATH" =~ apps/client/src/scenes/ ]]; then
  CATEGORY="scene"
elif [[ "$FILE_PATH" =~ packages/shared/ ]]; then
  CATEGORY="schema"
elif [[ "$TOOL_NAME" == "Bash" ]]; then
  CATEGORY="command"
fi

# Determine result from previous hook exit codes (passed as env vars if chained)
RESULT="${TELEMETRY_RESULT:-ok}"

# Append event
jq -n \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg sid "$SESSION_ID" \
  --arg et "$EVENT_TYPE" \
  --arg tn "$TOOL_NAME" \
  --arg fp "$FILE_PATH" \
  --arg res "$RESULT" \
  --arg cat "$CATEGORY" \
  --arg det "${TELEMETRY_DETAIL:-}" \
  '{
    timestamp: $ts,
    sessionId: $sid,
    eventType: $et,
    toolName: $tn,
    filePath: $fp,
    result: $res,
    category: $cat,
    detail: $det
  }' >> "$EVENTS_FILE"
```

#### `.claude/hooks/session-summary.sh`

Runs on every `Stop` event — tallies what happened in this response cycle.

```bash
#!/usr/bin/env bash
# .claude/hooks/session-summary.sh
# Runs on Stop — summarizes the current response cycle
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"

if [[ ! -f "$EVENTS_FILE" ]]; then
  exit 0
fi

SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

# Count events for this session
TOTAL=$(grep -c "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null || echo "0")
VIOLATIONS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"violation"' || echo "0")
WARNINGS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"warning"' || echo "0")
BLOCKED=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"blocked"' || echo "0")
ZONE_EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"category":"zone"' || echo "0")
PHASER_EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"category":"phaser"' || echo "0")

# Log summary if anything happened
if [[ "$TOTAL" -gt 0 ]]; then
  echo "Session $SESSION_ID: $TOTAL events, $VIOLATIONS violations, $WARNINGS warnings, $BLOCKED blocked" >&2
  if [[ "$VIOLATIONS" -gt 0 ]] || [[ "$BLOCKED" -gt 0 ]]; then
    echo "  ⚠ Zone events: $ZONE_EVENTS | Phaser events: $PHASER_EVENTS" >&2
  fi
fi
```

#### `.claude/hooks/session-end-report.sh`

Runs on `SessionEnd` — writes a human-readable session report and appends to sessions log.

```bash
#!/usr/bin/env bash
# .claude/hooks/session-end-report.sh
# Runs on SessionEnd — creates final session report
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"
SESSIONS_FILE="$TELEMETRY_DIR/sessions.jsonl"
DRIFT_FILE="$TELEMETRY_DIR/drift-report.md"

if [[ ! -f "$EVENTS_FILE" ]]; then
  exit 0
fi

SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
mkdir -p "$TELEMETRY_DIR"

# Gather session stats
EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null || true)
TOTAL=$(echo "$EVENTS" | grep -c . 2>/dev/null || echo "0")

if [[ "$TOTAL" -eq 0 ]]; then
  exit 0
fi

VIOLATIONS=$(echo "$EVENTS" | grep -c '"result":"violation"' 2>/dev/null || echo "0")
WARNINGS=$(echo "$EVENTS" | grep -c '"result":"warning"' 2>/dev/null || echo "0")
BLOCKED=$(echo "$EVENTS" | grep -c '"result":"blocked"' 2>/dev/null || echo "0")

FILES_TOUCHED=$(echo "$EVENTS" | jq -r '.filePath // empty' 2>/dev/null | sort -u | grep -c . || echo "0")
ZONES_HIT=$(echo "$EVENTS" | jq -r '.category' 2>/dev/null | sort | uniq -c | sort -rn || echo "none")

FIRST_TS=$(echo "$EVENTS" | head -1 | jq -r '.timestamp' 2>/dev/null || echo "unknown")
LAST_TS=$(echo "$EVENTS" | tail -1 | jq -r '.timestamp' 2>/dev/null || echo "unknown")

# Append to sessions log
jq -n \
  --arg sid "$SESSION_ID" \
  --arg start "$FIRST_TS" \
  --arg end "$LAST_TS" \
  --argjson total "$TOTAL" \
  --argjson violations "$VIOLATIONS" \
  --argjson warnings "$WARNINGS" \
  --argjson blocked "$BLOCKED" \
  --argjson files "$FILES_TOUCHED" \
  '{
    sessionId: $sid,
    startTime: $start,
    endTime: $end,
    totalEvents: $total,
    violations: $violations,
    warnings: $warnings,
    blocked: $blocked,
    filesTouched: $files
  }' >> "$SESSIONS_FILE"

# Update drift report (last 10 sessions)
{
  echo "# Agentic Drift Report"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Last 10 Sessions"
  echo ""
  echo "| Session | Events | Violations | Warnings | Blocked | Files |"
  echo "|---------|--------|------------|----------|---------|-------|"
  tail -10 "$SESSIONS_FILE" 2>/dev/null | while IFS= read -r line; do
    SID=$(echo "$line" | jq -r '.sessionId[:8]')
    TE=$(echo "$line" | jq -r '.totalEvents')
    VI=$(echo "$line" | jq -r '.violations')
    WA=$(echo "$line" | jq -r '.warnings')
    BL=$(echo "$line" | jq -r '.blocked')
    FI=$(echo "$line" | jq -r '.filesTouched')
    echo "| $SID… | $TE | $VI | $WA | $BL | $FI |"
  done
  echo ""

  # Trend analysis
  RECENT_VIOLATIONS=$(tail -10 "$SESSIONS_FILE" 2>/dev/null | jq -s '[.[].violations] | add // 0')
  RECENT_BLOCKED=$(tail -10 "$SESSIONS_FILE" 2>/dev/null | jq -s '[.[].blocked] | add // 0')

  if [[ "$RECENT_VIOLATIONS" -gt 5 ]]; then
    echo "## ⚠ DRIFT ALERT"
    echo ""
    echo "**$RECENT_VIOLATIONS violations across last 10 sessions.** Review patterns:"
    echo ""
    grep '"result":"violation"' "$EVENTS_FILE" 2>/dev/null | tail -10 | jq -r '"- \(.timestamp) | \(.filePath) | \(.detail)"' 2>/dev/null || true
  else
    echo "## ✓ Drift Status: Nominal"
    echo ""
    echo "Violations trending within acceptable range."
  fi
} > "$DRIFT_FILE"
```

### 13. What Gets Measured

| Metric | Source Hook | Category | What It Catches |
|--------|-----------|----------|-----------------|
| Zone violations | `zone-lint-on-edit.sh` | `zone` | Phaser imports in modules/, browser globals |
| Undocumented Phaser symbols | `phaser-version-guard.sh` | `phaser` | New Phaser API usage without evidence |
| Phaser 3 URL access | `block-phaser3-urls.sh` | `phaser` | Agent trying to read v3 docs |
| Files touched per session | `telemetry-log.sh` | `edit` | Scope creep, drive-by refactors |
| Violations per session | `session-summary.sh` | `session` | Drift acceleration |
| Blocked actions per session | `session-end-report.sh` | `session` | Agent fighting guardrails |
| Category distribution | `session-end-report.sh` | `session` | Where agent spends effort |

### 14. Drift Detection Patterns

The drift report (`drift-report.md`) surfaces these patterns over time:

**Healthy session pattern:**

- 0 violations, 0 blocked, warnings are rare
- Agent investigates before coding, uses local docs mirror
- Files touched matches task scope (no sprawl)

**Early drift signals:**

- Rising warnings → agent is trying new Phaser APIs without evidence
- Zone violations appearing → agent starting to blur modules/scenes boundary
- Blocked actions → agent actively trying to reach Phaser 3 docs

**Red flags requiring human intervention:**
>
- >5 violations across 10 sessions → systematic drift, review CLAUDE.md and skills
- Repeated blocked URLs → agent's training is overpowering instructions
- Zone violations in modules/ → architectural corruption in progress

### 15. Telemetry Commands

#### `.claude/commands/drift-report.md`

```markdown
Generate and display the current agentic drift report:

1. `cat .claude/telemetry/drift-report.md`
2. If the file doesn't exist, say "No telemetry data yet."
3. Summarize: total sessions, total violations, trend direction.
4. If violations are trending up, recommend specific actions.
```

#### `.claude/commands/session-stats.md`

```markdown
Show telemetry for the current or most recent session:

1. `tail -1 .claude/telemetry/sessions.jsonl | jq .`
2. `grep "${CLAUDE_SESSION_ID:-}" .claude/telemetry/events.jsonl | jq -s 'group_by(.category) | map({category: .[0].category, count: length})' `
3. Report: events by category, any violations, any blocked actions.
```

### 16. Analysis Script

For periodic human review beyond what hooks produce automatically.

#### `scripts/telemetry-report.sh`

```bash
#!/usr/bin/env bash
# scripts/telemetry-report.sh — Human-run telemetry analysis
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS="$TELEMETRY_DIR/events.jsonl"
SESSIONS="$TELEMETRY_DIR/sessions.jsonl"

if [[ ! -f "$EVENTS" ]]; then
  echo "No telemetry data found."
  exit 0
fi

echo "═══════════════════════════════════════"
echo "  WYN DER SCHRANK — Agentic Telemetry"
echo "═══════════════════════════════════════"
echo ""

# Total stats
TOTAL_EVENTS=$(wc -l < "$EVENTS")
TOTAL_SESSIONS=$(wc -l < "$SESSIONS" 2>/dev/null || echo "0")
echo "Total events: $TOTAL_EVENTS across $TOTAL_SESSIONS sessions"
echo ""

# Events by category
echo "Events by category:"
jq -r '.category' "$EVENTS" | sort | uniq -c | sort -rn
echo ""

# Events by result
echo "Events by result:"
jq -r '.result' "$EVENTS" | sort | uniq -c | sort -rn
echo ""

# Violations detail
VIOLATION_COUNT=$(grep -c '"result":"violation"' "$EVENTS" || echo "0")
if [[ "$VIOLATION_COUNT" -gt 0 ]]; then
  echo "⚠ VIOLATIONS ($VIOLATION_COUNT):"
  grep '"result":"violation"' "$EVENTS" | jq -r '"  \(.timestamp) | \(.filePath) | \(.detail)"'
  echo ""
fi

# Blocked detail
BLOCKED_COUNT=$(grep -c '"result":"blocked"' "$EVENTS" || echo "0")
if [[ "$BLOCKED_COUNT" -gt 0 ]]; then
  echo "🛑 BLOCKED ACTIONS ($BLOCKED_COUNT):"
  grep '"result":"blocked"' "$EVENTS" | jq -r '"  \(.timestamp) | \(.toolName) | \(.detail)"'
  echo ""
fi

# Most-edited files
echo "Most-edited files (top 10):"
jq -r '.filePath // empty' "$EVENTS" | grep -v '^$' | sort | uniq -c | sort -rn | head -10
echo ""

# Session trend
if [[ -f "$SESSIONS" ]]; then
  echo "Session trend (last 10):"
  tail -10 "$SESSIONS" | jq -r '"  \(.sessionId[:8])… | events: \(.totalEvents) | violations: \(.violations) | blocked: \(.blocked)"'
fi
```

### 17. File Structure (Telemetry + Enforcement)

```text
.claude/
├── settings.json                       # Permissions + hooks (§7)
├── hooks/
│   ├── phaser-version-guard.sh         # PostToolUse: Phaser evidence check
│   ├── block-phaser3-urls.sh           # PreToolUse: Block v3 doc URLs
│   ├── zone-lint-on-edit.sh            # PostToolUse: Zone violation detection
│   ├── telemetry-log.sh                # PostToolUse: Append event to JSONL
│   ├── session-summary.sh              # Stop: Tally current response cycle
│   └── session-end-report.sh           # SessionEnd: Final report + drift analysis
├── skills/
│   └── phaser-doc/SKILL.md             # On-demand doc lookup skill
├── commands/
│   ├── drift-report.md                 # /drift-report — show drift status
│   └── session-stats.md                # /session-stats — current session telemetry
└── telemetry/                          # Generated at runtime (gitignored)
    ├── events.jsonl                    # Append-only event log
    ├── sessions.jsonl                  # Session summaries
    └── drift-report.md                 # Human-readable drift report

docs/
├── PHASER_EVIDENCE.md                  # API evidence audit trail
└── vendor/
    └── phaser-4.0.0-rc.6/             # Local docs mirror (gitignored)

scripts/
└── telemetry-report.sh                # Manual telemetry analysis
```

**`.gitignore` additions:**

```text
# Telemetry (machine-local, regenerated per session)
.claude/telemetry/

# Vendor docs (regenerate with scripts/mirror-phaser-docs.sh)
docs/vendor/
```

**Keep in version control:**

```text
# These are project config — always committed
.claude/settings.json
.claude/hooks/*.sh
.claude/skills/*/SKILL.md
.claude/commands/*.md
docs/PHASER_EVIDENCE.md
scripts/telemetry-report.sh
```

---

## Part III: Operational Playbook

### 18. Daily Workflow

```text
1. Start session
   → SessionStart hook initializes telemetry
   → CLAUDE.md loads with Phaser contract

2. Work on tasks
   → Every file edit triggers:
     a. Zone lint (modules/ purity)
     b. Phaser evidence check (new symbols?)
     c. Telemetry log (event recorded)
   → Every Bash/WebFetch triggers:
     a. Phaser 3 URL block (prevent v3 drift)

3. Agent response completes
   → Stop hook tallies session events
   → Prints violation/warning summary

4. Session ends
   → SessionEnd writes session summary
   → Drift report regenerated
   → Human reviews: `cat .claude/telemetry/drift-report.md`

5. Weekly review
   → Run: `bash scripts/telemetry-report.sh`
   → Check violation trends
   → Update PHASER_EVIDENCE.md for newly verified symbols
   → Update skills/commands if new patterns emerged
```

### 19. Escalation Ladder

| Signal | Severity | Action |
|--------|----------|--------|
| 0 violations, 0 blocked | Nominal | Continue |
| Warnings (undocumented Phaser symbols) | Low | Verify and add to evidence file |
| 1–2 violations per session | Medium | Review agent's approach, sharpen CLAUDE.md |
| Zone violation in modules/ | High | Stop. Fix immediately. Check for cascade. |
| Repeated Phaser 3 URL blocks | High | Switch to restricted tools mode (§8) |
| >5 violations across 10 sessions | Critical | Full CLAUDE.md review. Consider rewriting skills. Run `bun run check`. |
| Agent bypasses hooks | Critical | Bug in hook scripts. Fix hooks first. |

### 20. Phase-Appropriate Enforcement

| Phase | Phaser Enforcement | Telemetry |
|-------|-------------------|-----------|
| Phase 0 (Scaffold) | Evidence file created but grace period on undocumented symbols. Hooks log warnings only. | Events logged. Drift report starts accumulating baseline. |
| Phase 1 (Core Infra) | All adapters need evidence entries. Warning on missing evidence. | Session reports active. First drift baselines established. |
| Phase 2 (Platformer) | Full enforcement. Missing evidence = warning. Zone violations = hard block. | Full telemetry operational. Weekly reviews. |
| Phase 3+ (Minigames, Polish) | Strict. Consider promoting evidence warnings to hard blocks (exit 2). | Trend analysis informs which skills/hooks need iteration. |
