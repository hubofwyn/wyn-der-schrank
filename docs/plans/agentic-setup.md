# Wyn der Schrank — Agentic Development Setup

**Companion to:** `docs/FOUNDATION.md` (architecture), `docs/plans/game-blueprint.md` (domain), `docs/plans/telemetry.md` (enforcement)
**Date:** February 10, 2026
**Purpose:** Drop-in files for agent-assisted development via Claude Code CLI and compatible tools

---

## File Map

```text
wyn-der-schrank/
├── AGENTS.md                          # Canonical project contract (tool-agnostic)
├── CLAUDE.md                          # Claude Code shim (short, imports AGENTS.md)
├── .claude/
│   ├── settings.json                  # Permissions + hooks (deterministic enforcement)
│   ├── mcp.json                       # MCP server config (optional)
│   ├── agents/                        # Subagent definitions
│   │   ├── architect.md
│   │   ├── tester.md
│   │   └── security-reviewer.md
│   ├── commands/                      # Slash commands (Claude Code native)
│   │   ├── investigate.md
│   │   ├── zone-check.md
│   │   └── implement-feature.md
│   └── skills/                        # On-demand workflows (loaded when relevant)
│       ├── fix-issue/SKILL.md
│       ├── add-module/SKILL.md
│       ├── add-minigame/SKILL.md
│       ├── review-diff/SKILL.md
│       └── ship-small/SKILL.md
└── docs/
    └── adr/
        └── template.md                # ADR template
```

---

## 1. `AGENTS.md`

```markdown
# AGENTS.md — Wyn der Schrank

## Project snapshot
- Purpose: Web-based platformer with integrated minigame subsystem
- Stack: TypeScript 5.9.3 (strict + isolatedDeclarations), Phaser 4.0.0-rc.6, Hono 4.11.9, Zod 4.3.6
- Runtime: Bun 1.3.9 (dev), Node 24.13.1 LTS (CI)
- Build: Vite 7.3.1, Biome 2.3.14, ESLint 10.0.0, dependency-cruiser 17.3.8
- Repo shape: Bun workspaces monorepo

```text
packages/shared/     → Zod schemas + inferred types (@wds/shared). THE source of truth.
apps/client/         → Phaser 4 game client (@wds/client)
  src/core/          → Infrastructure zone (ports, adapters, services, container)
  src/modules/       → Domain zone (pure TS, NO Phaser/browser globals)
  src/scenes/        → View zone (Phaser scenes, thin)
apps/server/         → Hono API + game server (@wds/server)
docs/adr/            → Architectural Decision Records
```

## Setup & common commands

- Install: `bun install`
- Dev server: `bun run dev`
- Typecheck: `bun run typecheck`
- Lint zones: `bun run lint:zones`
- Format: `bun run format`
- Format check: `bun run format:check`
- Dependency structure: `bun run deps:check`
- Unit tests (watch): `bun run test`
- Unit tests (CI): `bun run test:run`
- **Full verification: `bun run check`** (typecheck + lint:zones + deps:check + test:run)

## Definition of done

- [ ] `bun run check` passes (zero warnings, zero errors)
- [ ] New/changed domain logic has co-located tests in `__tests__/`
- [ ] No zone violations (modules/ imports only ports/ and @wds/shared)
- [ ] New services registered in `core/container.ts`
- [ ] New types inferred from Zod schemas (never hand-written)
- [ ] ADR written for architectural changes (use `docs/adr/template.md`)

## Workflow rules

- **Investigate first.** Before writing code: grep for existing patterns, read relevant ADRs, check `core/ports/` and `core/container.ts`. Show evidence. Code without investigation evidence is rejected.
- **Explore → plan → implement.** For non-trivial tasks, write a short plan with file paths before coding.
- **Verify after every change.** Run `bun run check`. Never `--no-verify`.
- **Keep diffs small.** 1–3 focused commits. If touching >10 files, write a plan first.

## Boundaries

### Always

- Respect the three zones. `modules/` is pure TS — no Phaser, no `window`, no `document`.
- Wire new services through `core/container.ts` (Pure DI Composition Root in `main.ts`).
- Infer types from Zod schemas in `@wds/shared`. Never hand-write types that Zod can generate.
- Scenes are thin. Domain logic lives in `modules/`, scenes only read state and move sprites.
- Use port interfaces (`core/ports/`) — never import Phaser directly in domain code.

### Ask first

- New dependencies (runtime or dev)
- New port interfaces or changes to existing ports
- Changes to `eslint.config.mjs`, `.dependency-cruiser.cjs`, or `tsconfig.*.json`
- Schema changes in `@wds/shared` (contract changes affect client + server)
- New ADRs or changes to existing ADRs
- Refactors touching >10 files

### Never

- Import `phaser`, `window`, `document`, or `requestAnimationFrame` in `modules/`
- Import `server/` or `hono` in `scenes/` (use `core/services/network-manager`)
- Hand-write types that should be `z.infer<>`
- Claim Phaser 4 uses WebGPU (it uses WebGL)
- Disable tests or linters to make things pass
- Commit secrets, keys, or tokens
- Use `--no-verify` on commits
- Modify `node_modules/`, `bun.lockb` manually, or generated files

## Architecture (quick reference)

### Zone dependency law

```text
modules/ → core/ports/    (interfaces only)
modules/ → @wds/shared    (schemas + types)
scenes/  → modules/       (domain logic)
scenes/  → core/          (services + adapters)
core/    → @wds/shared    (schemas + types)

FORBIDDEN:
modules/ ✗ phaser, window, document, scenes/, core/adapters/
scenes/  ✗ server/, hono, raw fetch
shared/  ✗ any app dependency except Zod
```

### Pure DI pattern

- `core/container.ts` — Container interface (all services declared here)
- `main.ts` — Composition Root (all services wired here, nowhere else)
- Modules receive dependencies via constructor params (port interfaces only)
- Tests use plain mock objects that satisfy port interfaces

### Phaser 4 renderer

- WebGL renderer (WebGL2-class). Not WebGPU.
- SpriteGPULayer for instanced rendering
- GPU-accelerated tilemaps: orthographic only

## Code style

- Biome handles formatting. No manual style debates.
- `isolatedDeclarations` is on — all exported functions need explicit return types.
- Relative imports only (no path aliases in Phase 0).
- Co-locate tests: `modules/player/__tests__/player-controller.test.ts`
- Zod schemas in `packages/shared/src/schema/`, types in `packages/shared/src/types/` (re-exports only).

## Where to look first

- Player mechanics: `apps/client/src/modules/player/`
- Physics/collision: `apps/client/src/modules/physics/`
- Enemy behavior: `apps/client/src/modules/enemy/`
- Minigame system: `apps/client/src/modules/minigame/`
- Game state: `apps/client/src/modules/game-state/`
- Engine abstraction: `apps/client/src/core/ports/`
- Phaser adapters: `apps/client/src/core/adapters/`
- DI wiring: `apps/client/src/core/container.ts` + `apps/client/src/main.ts`
- Scene rendering: `apps/client/src/scenes/`
- Shared schemas: `packages/shared/src/schema/`
- Server API: `apps/server/src/`
- Architecture docs: `docs/adr/`
- Current plan: `docs/plans/active-plan.md`

```text

---

## 2. `CLAUDE.md`

```markdown
# CLAUDE.md — Wyn der Schrank

Project contract: @AGENTS.md
Architecture reference: @docs/FOUNDATION.md

## Workflow
- Investigate → plan → implement → `bun run check`.
- Reference files with @path when discussing specifics.
- Use skills for repeatable workflows (fix-issue, add-module, add-minigame, review-diff).

## Key constraints (from AGENTS.md)
- modules/ is pure TS. Zero Phaser, zero browser globals.
- Types from Zod. Services through container. Scenes are thin.
- Renderer is WebGL, not WebGPU.
```

---

## 3. `.claude/settings.json`

Hooks are deterministic — they run regardless of what the agent decides.
Permissions allowlist known-safe commands so the agent doesn't stall on confirmation prompts.

```jsonc
{
  "permissions": {
    "allow": [
      // Read operations (always safe)
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(wc *)",
      "Bash(head *)",
      "Bash(tail *)",

      // Project commands (verification)
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

      // Scoped test runs
      "Bash(bun test *)",
      "Bash(bunx vitest run *)",

      // Scoped lint runs
      "Bash(bunx eslint *)",
      "Bash(bunx biome check *)",
      "Bash(bunx dependency-cruiser *)",

      // Type-checking
      "Bash(tsc *)",
      "Bash(bunx tsc *)",

      // Git read operations
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git branch *)"
    ],
    "deny": [
      // Destructive operations require confirmation
      "Bash(git push *)",
      "Bash(git reset --hard *)",
      "Bash(git clean *)",
      "Bash(rm -rf *)",
      "Bash(bun add *)",
      "Bash(bun remove *)"
    ]
  },
  "hooks": {
    "PostEditFile": {
      "matches": ["apps/client/src/modules/**/*.ts"],
      "command": "bunx eslint $FILE --max-warnings 0 2>&1 || echo 'ZONE VIOLATION detected — fix before continuing'"
    },
    "PreCommit": {
      "command": "bun run check && bun run format:check"
    }
  }
}
```

---

## 4. `.claude/mcp.json`

```jsonc
{
  "mcpServers": {
    // Enable if using Phaser Editor v5 for visual scene building
    // "phaser-editor": {
    //   "command": "npx",
    //   "args": ["@phaserjs/editor-mcp-server"]
    // }
  }
}
```

---

## 5. Subagent Definitions

### `.claude/agents/architect.md`

```markdown
---
name: architect
description: Reviews changes for zone violations and architectural conformance
tools: Read, Grep, Glob
model: opus
---
You are a senior game architect reviewing Wyn der Schrank.

Read @AGENTS.md for project rules. Read @docs/FOUNDATION.md for architecture details.

REVIEW CHECKLIST:
1. Zone violations: Does any file in modules/ import phaser, scenes/, adapters/, or use window/document?
2. Container discipline: Are new services wired in core/container.ts and main.ts?
3. Type discipline: Are types inferred from Zod schemas, or hand-written?
4. Port coverage: Does new engine-facing logic go through a port interface?
5. Circular dependencies: Run `bun run deps:check` to verify.
6. ADR compliance: Does the change conform to existing ADRs? Does it need a new one?

Report violations with file:line references. Suggest fixes.
```

### `.claude/agents/tester.md`

```markdown
---
name: tester
description: Writes and validates tests for domain modules
tools: Read, Grep, Glob, Bash(bun test*), Bash(bun run check)
model: opus
---
You write tests for Wyn der Schrank's domain modules.

Read @AGENTS.md for project rules.

RULES:
- Tests for modules/ use mock ports — never real Phaser objects
- Create mocks via factory functions in `modules/__test-utils__/mocks.ts`
- Tests live in `__tests__/` co-located with source
- Use vitest + happy-dom for DOM-adjacent tests only
- After writing tests: `bun run check`

MOCK PATTERN:
```typescript
import { createMockInput, createMockPhysics, createMockClock } from '../../__test-utils__/mocks';
const controller = new PlayerController(createMockInput(), createMockPhysics(), createMockClock());
```

```text

### `.claude/agents/security-reviewer.md`

```markdown
---
name: security-reviewer
description: Audits changes for security concerns
tools: Read, Grep, Glob
model: opus
---
You are a security reviewer for Wyn der Schrank.

Read @AGENTS.md for boundaries and "Never" rules.

REVIEW FOR:
1. Secrets/tokens/keys in source (grep for patterns: API_KEY, SECRET, TOKEN, password)
2. Unsanitized user input reaching server endpoints
3. Zod validation bypasses (raw `.json()` without `.parse()`)
4. Direct DOM manipulation outside scenes/ (XSS vectors)
5. Network requests outside core/services/network-manager (fetch, XMLHttpRequest)
6. eval(), Function(), or dynamic code execution
```

---

## 6. Slash Commands

### `.claude/commands/investigate.md`

```markdown
Investigate $ARGUMENTS before any implementation.

1. `grep -rn "$ARGUMENTS" apps/ packages/ --include="*.ts" | head -30`
2. `ls docs/adr/` — scan for relevant decisions
3. `grep -rn "$ARGUMENTS" apps/client/src/core/ports/` — check existing abstractions
4. `grep -rn "$ARGUMENTS" apps/client/src/core/container.ts` — check current wiring
5. Check `docs/plans/active-plan.md` for context on current phase

Report findings with file:line references. Do NOT write any code.
If the investigation reveals an existing pattern, describe it.
If nothing exists, outline where the new code should live per zone rules.
```

### `.claude/commands/zone-check.md`

```markdown
Run full zone defense validation and report results:

1. `bun run lint:zones`
2. `bun run deps:check`
3. `bun run typecheck`

If any step fails, report every violation with file:line.
If all pass, confirm: "✓ All zone gates green."
```

### `.claude/commands/implement-feature.md`

```markdown
Implement the feature described in $ARGUMENTS. Follow this sequence exactly:

**Gate 1 — Investigate**
1. grep for related patterns in the codebase
2. Read relevant ADRs in docs/adr/
3. Check core/ports/ and core/container.ts
4. Report findings — stop if the feature already exists

**Gate 2 — Plan**
1. List files to create/modify with full paths
2. Identify which zone each file belongs to
3. Identify new port interfaces or container changes needed
4. Identify schema changes in @wds/shared
5. Present plan — stop for approval if it touches >5 files

**Gate 3 — Implement**
1. Schema changes first (if any) in packages/shared/
2. Port interfaces second (if any) in core/ports/
3. Domain logic in modules/ (with tests)
4. Container wiring in core/container.ts + main.ts
5. Scene integration in scenes/ (thin — read state, move sprites)

**Gate 4 — Verify**
1. `bun run check` — must pass with zero warnings
2. Review own diff against AGENTS.md boundaries
3. Report: files changed, tests added, verification status
```

---

## 7. Skills

### `.claude/skills/fix-issue/SKILL.md`

```markdown
---
name: fix-issue
description: Reproduce → failing test → fix → verify
---
# Fix Issue

1. **Reproduce.** Find the failing behavior. Add minimal repro notes to the task.
2. **Locate.** Use the zone map from @AGENTS.md to find the relevant module.
   - Game logic bug → `modules/`
   - Rendering bug → `scenes/` (visual) or `core/adapters/` (engine translation)
   - Schema/validation bug → `packages/shared/`
   - API bug → `apps/server/`
3. **Failing test.** Add or adjust a test in the relevant `__tests__/` directory that captures the bug.
   - modules/ tests use mock ports — never real Phaser.
4. **Fix.** Implement the smallest change that makes the test pass.
5. **Verify.** `bun run check` — zero warnings, zero errors.
6. **Document.** If behavior changed, note it in the relevant ADR or `docs/plans/active-plan.md`.
```

### `.claude/skills/add-module/SKILL.md`

```markdown
---
name: add-module
description: Add a new domain module to modules/ following zone rules
---
# Add Module

A module is a self-contained domain concern in `apps/client/src/modules/<name>/`.

## Structure
```text
modules/<name>/
├── <name>-controller.ts    # or <name>-system.ts, <name>-manager.ts
├── <name>-state.ts         # (if stateful)
└── __tests__/
    └── <name>-controller.test.ts
```

## Checklist

1. **Schema first.** If the module introduces new data shapes, define Zod schemas in
   `packages/shared/src/schema/` and export inferred types from `packages/shared/src/types/index.ts`.
2. **Port check.** Does the module need engine capabilities (input, physics, audio, time)?
   Import ONLY from `core/ports/` — never from `phaser` or `core/adapters/`.
   If no existing port covers the need, propose a new port interface (requires "ask first" approval).
3. **Constructor injection.** The module receives all dependencies as constructor parameters.
   Types must be port interfaces, not concrete classes.
4. **Register in container.** Add the service to the `Container` interface in `core/container.ts`
   and wire it in the `createContainer()` factory in `main.ts`.
5. **Tests.** Write tests using mock ports from `modules/__test-utils__/mocks.ts`.
6. **Zone verify.** `bun run lint:zones` — must pass with zero warnings.
7. **Full verify.** `bun run check`.

```text

### `.claude/skills/add-minigame/SKILL.md`

```markdown
---
name: add-minigame
description: Add a new minigame to the Registry + Factory system
---
# Add Minigame

Minigames live in `modules/minigame/games/<name>/` and are registered via the MinigameRegistry.

## Steps

1. **Add ID to schema.** In `packages/shared/src/schema/minigame.ts`, add the new ID to `MinigameIdSchema`:
   ```typescript
   export const MinigameIdSchema = z.enum(['dice-duel', '<new-name>']);
   ```

1. **Create logic module.** `modules/minigame/games/<name>/logic.ts` implementing `MinigameLogic`:

   ```typescript
   import type { MinigameLogic } from '../../minigame-logic';
   // Pure TS — no Phaser, no browser globals
   ```

2. **Create tests.** `modules/minigame/games/<name>/__tests__/logic.test.ts`
   Test start, update, handleInput, getState, and cleanup.

3. **Register factory.** In the MinigameRegistry setup (called from `main.ts`):

   ```typescript
   registry.register('<new-name>', () => new NewNameLogic());
   ```

4. **Scene rendering** (if the minigame needs unique visuals beyond MinigameScene):
   Add a rendering helper in `scenes/` that reads `MinigameLogic.getState()` and draws sprites.
   Keep it thin — zero game logic in the scene.

5. **Verify.** `bun run check`.

```text

### `.claude/skills/review-diff/SKILL.md`

```markdown
---
name: review-diff
description: Self-review checklist before handing back to a human
---
# Diff Review

Run through this checklist before declaring a task complete.

## Correctness
- [ ] Does the diff match the request exactly? No drive-by refactors.
- [ ] Are error paths handled and tested?
- [ ] Any deleted tests or weakened assertions?

## Zone compliance
- [ ] `bun run lint:zones` passes (modules/ clean of Phaser/browser)
- [ ] `bun run deps:check` passes (no circular deps, no forbidden imports)
- [ ] New files are in the correct zone directory

## Contract compliance
- [ ] New types use `z.infer<>` from @wds/shared (not hand-written)
- [ ] New services are in `Container` interface and wired in `createContainer()`
- [ ] Scenes remain thin (no game logic, only state-reading + sprite-moving)

## Boundary check (from AGENTS.md)
- [ ] No new dependencies added without "ask first" approval
- [ ] No schema changes without noting the contract impact
- [ ] No secrets, keys, or tokens in the diff
- [ ] No `--no-verify`, no disabled linters, no skipped tests

## Final gate
- [ ] `bun run check` passes with zero warnings
```

### `.claude/skills/ship-small/SKILL.md`

```markdown
---
name: ship-small
description: Keep changes small, reviewable, and reversible
---
# Ship Small

- 1–3 focused commits per task. No sprawl.
- If touching >10 files, stop and write a plan with rationale first.
- No drive-by refactors. If you spot something unrelated, note it for a separate task.
- Keep public API changes (ports, container interface, schemas) explicit and documented.
- Prefer adding new code alongside old code, then switching over, then removing old code — not all at once.
- If a task is growing beyond scope, split it. Ship the smaller piece first.
```

---

## 8. ADR Template

### `docs/adr/template.md`

```markdown
# ADR-NNN: <Title>

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN  
**Date:** YYYY-MM-DD  
**Deciders:** <who>

## Context
<What is the situation? What forces are at play?>

## Decision
<What did we decide?>

## Consequences
### Positive
- <benefit>

### Negative
- <tradeoff>

### Neutral
- <observation>

## Compliance
<How is this enforced? ESLint rule? dependency-cruiser? CLAUDE.md directive? Hook?>
```

---

## 9. Bootstrapping Sequence

Run these commands to lay down the agentic infrastructure in an already-scaffolded repo:

```bash
cd wyn-der-schrank

# Create agentic directory structure
mkdir -p .claude/{agents,commands,skills/{fix-issue,add-module,add-minigame,review-diff,ship-small}}
mkdir -p docs/adr

# Copy files from this document into place:
# - AGENTS.md → repo root
# - CLAUDE.md → repo root
# - .claude/settings.json
# - .claude/mcp.json
# - .claude/agents/*.md
# - .claude/commands/*.md
# - .claude/skills/*/SKILL.md
# - docs/adr/template.md

# Verify the setup
cat AGENTS.md | head -5          # Should show "Wyn der Schrank"
cat CLAUDE.md | head -5          # Should reference @AGENTS.md
cat .claude/settings.json | head -5  # Should show permissions block

# Run initial verification
bun run check
```

---

## 10. Usage Patterns

### Starting a new session

```bash
claude                          # Opens Claude Code CLI
> @AGENTS.md                    # Agent reads project contract
> /investigate player physics   # Runs investigation skill
```

### Common workflows

```bash
> /investigate <topic>          # Before any code (mandatory)
> /zone-check                   # Quick zone validation
> /implement-feature <spec>     # Guided 4-gate implementation
```

### Delegating to subagents

```bash
> @architect review this diff   # Architecture review
> @tester write tests for modules/camera/
> @security-reviewer audit apps/server/src/routes/
```

### Using skills

Skills load automatically when the agent encounters a matching workflow.
They can also be referenced explicitly:

```bash
> Follow the fix-issue skill for this bug
> Use the add-minigame skill to add a "coin-flip" game
> Run the review-diff checklist before we merge
```

---

## 11. Evolution Notes

This agentic setup is designed to grow:

- **Phase 0–1:** AGENTS.md + CLAUDE.md + settings.json + investigate/zone-check commands. Minimal overhead, maximum guardrails.
- **Phase 2+:** Add skills as repeated patterns emerge. The `add-module` and `add-minigame` skills become heavily used.
- **Phase 3+:** Subagents become more valuable as the codebase grows. The architect agent catches zone violations that are easy to miss in large diffs.
- **Ongoing:** When a mistake repeats, write a skill for it. When a rule must never be advisory, make it a hook. Keep CLAUDE.md short — move knowledge to AGENTS.md or skills.
