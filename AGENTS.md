# AGENTS.md — Wyn der Schrank

## Project Snapshot

- **Purpose:** Web-based side-scrolling platformer with integrated minigame subsystem
- **Stack:** TypeScript 5.9.3 (strict), Phaser 4.0.0-rc.6, Hono 4.11.9, Zod 4.3.6
- **Runtime:** Bun 1.3.9 (dev), Node 24.13.1 LTS (CI)
- **Build:** Vite 7.3.1, Biome 2.3.14, ESLint 10.0.0, dependency-cruiser 17.3.8
- **Repo:** Bun workspaces monorepo

## Repository Map

```text
CLAUDE.md                → Agent entry point (read this first)
AGENTS.md                → Project contract (you are here)
docs/
  FOUNDATION.md          → Architecture: tech stack, zones, DI, TS config
  PHASER_EVIDENCE.md     → Verified Phaser 4.0.0-rc.6 API usage log
  adr/template.md        → ADR template
  audit/                 → Architectural audit artifacts
  plans/
    active-plan.md       → Goal roadmap, status tracking, update protocol
    game-blueprint.md    → Scenes, schemas, modules, assets, data flow
    telemetry.md         → Phaser 4 enforcement, hooks, observability
    agentic-setup.md     → Design of .claude/ infrastructure
    lint-format-hooks.md → Tool roles, config, git hook pipeline
.claude/
  settings.json          → Permissions + hook wiring
  agents/                → Subagent definitions (architect, tester, security-reviewer)
  commands/              → Slash commands (investigate, zone-check, implement-feature, drift-report, session-stats)
  skills/                → Repeatable workflows (fix-issue, add-module, add-minigame, review-diff, ship-small, phaser-doc)
  hooks/                 → Enforcement scripts (zone lint, Phaser guard, telemetry logging)
packages/shared/         → Zod schemas + inferred types (@wds/shared)
  src/schema/            → 14 schema files: common, character, player, enemy, level, collectible,
                           minigame, scoring, progression, settings, events, sync, assets,
                           physics-config
  src/types/index.ts     → 40+ types, all z.infer<> re-exports
apps/client/             → Phaser 4 game client (@wds/client)
  src/core/              → Infrastructure zone (ports, adapters, services, container)
    ports/               → 6 interfaces: engine, input, audio, physics, network, storage
    container.ts         → Container + PlatformerScope + MinigameScope
  src/modules/           → Domain zone (pure TS, NO Phaser/browser globals)
    animation/           → Shared AnimationDef type for entity animations
    assets/              → Asset manifest parser (Zod-validated)
    camera/              → Camera controller
    character/           → Character definitions, stats
    collectible/         → Pickup system, catalog, animation config
    enemy/               → Enemy catalog, AI, behaviors, animation config
    game-state/          → Global FSM, sync manager
    level/               → Tilemap objects, world catalog, tile registry
    minigame/            → Registry, manager, per-game logic (dice-duel, coin-catch, memory-match)
    navigation/          → Scene keys, flow controller
    physics/             → Platformer physics, collision
    player/              → Player controller, state, animation config
    progression/         → Profile, unlocks, session state
    scoring/             → Score calculator, star rating
    settings/            → Preferences manager
  src/scenes/            → View zone (Phaser scenes, thin)
apps/server/             → Hono API + game server (@wds/server)
  src/routes/            → API route handlers
  src/services/          → Server-side business logic
scripts/
  generate-forest-2.mjs → Generates forest-2.json tilemap (Tiled format)
  pre-push-banner.sh    → Cosmetic pre-push header (called by Lefthook)
  telemetry-report.sh   → Human-run telemetry analysis
.github/workflows/
  ci.yml                → CI pipeline (6 parallel gates)
  dependency-review.yml → PR dependency audit
```

## Commands

- `bun install` — Install dependencies
- `bun run dev` — Start client dev server
- `bun run typecheck` — TypeScript project references build
- `bun run lint:zones` — ESLint zone enforcement on modules/
- `bun run format` — Biome format + lint fix
- `bun run format:check` — Biome check (CI)
- `bun run deps:check` — dependency-cruiser structural validation
- `bun run test` — Vitest watch mode
- `bun run test:run` — Vitest single run (CI)
- **`bun run check`** — Full gate: typecheck + lint:zones + deps:check + test:run
- `bun run lint:md` — markdownlint check
- `bun run lint:md:fix` — markdownlint autofix
- `bun run hooks:install` — Install Lefthook git hooks (run once after clone)

## Definition of Done

- [ ] `bun run check` passes (zero warnings, zero errors)
- [ ] New domain logic has co-located tests in `__tests__/`
- [ ] No zone violations (modules/ imports only ports/ and @wds/shared)
- [ ] New services registered in `core/container.ts`
- [ ] New types inferred from Zod schemas (never hand-written)
- [ ] New Phaser symbols recorded in `docs/PHASER_EVIDENCE.md`
- [ ] ADR written for architectural changes (use `docs/adr/template.md`)

## Branch Workflow

Every work session follows this cycle. No exceptions.

### 1. Start from clean main

```bash
git checkout main
git pull origin main
# Working tree must be clean. Stash or discard if not.
```

### 2. Create a work branch

```bash
git checkout -b <type>/<short-description>
```

Branch naming: `type/short-description` (kebab-case). Types match conventional commits:
`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `test/`, `ci/`.

Examples: `feat/composition-root`, `fix/coyote-time-edge`, `refactor/player-state-machine`.

### 3. Work on the branch

- Investigate first. Before writing code: grep for existing patterns, read relevant docs, check `core/ports/` and `core/container.ts`. Show evidence.
- Explore → plan → implement. For non-trivial tasks, write a short plan with file paths before coding.
- Run `bun run check` after each logical change.
- Commit as each piece of work completes (not one big commit at the end).
- Keep diffs small and focused. If touching >10 files, write a plan first.

### 4. Commit conventions

```text
type(scope): concise description

Optional body explaining why, not what.
```

- **Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`, `perf`
- **Scopes:** `shared`, `client`, `server`, `audit`, or omit for cross-cutting
- **Subject line:** imperative mood, lowercase, no period, ≤72 chars
- Each commit should be a coherent unit. One logical change per commit.
- Never use `--no-verify` on commits or pushes.

### 5. Pre-push gate

Before pushing, Lefthook's `pre-push` hook runs all CI gates locally:

| Gate | Command | What It Checks |
|------|---------|---------------|
| 1 | `bun run typecheck` | TypeScript compilation (tsc --build) |
| 2 | `bun run lint:zones` | ESLint zone enforcement on modules/ |
| 3 | `bun run deps:check` | dependency-cruiser structural validation |
| 4 | `bun run test:run` | Vitest single run |
| 5 | `bun run format:check` | Biome formatting check |
| 6 | `bun run lint:md` | markdownlint check |

If any gate fails, the push is rejected. Fix the issue and push again.

Lefthook also runs a `pre-commit` hook that auto-formats staged files (Biome + markdownlint) before each commit.

### 6. PR and CI

```bash
git push -u origin <branch-name>
gh pr create --base main --title "type(scope): description" --body "..."
```

The human monitors CI. Once CI passes, the human merges/squashes and deletes the remote branch.

### 7. Sync main

After merge, return to main and pull:

```bash
git checkout main
git pull origin main
git branch -d <branch-name>     # delete local branch
```

Then start the next cycle from step 1.

### Workflow diagram

```text
main (clean) ──→ branch ──→ work + commit ──→ pre-push ──→ push ──→ PR
                                                                      │
main (updated) ←── pull ←── human merges/squashes ←───────────────────┘
```

## Boundaries

### Always

- Work on a branch, never directly on `main`. All changes go through PRs.
- Respect the three zones. `modules/` is pure TS — no Phaser, no `window`, no `document`.
- Wire new services through `core/container.ts` (Pure DI Composition Root in `main.ts`).
- Infer types from Zod schemas in `@wds/shared`. Never hand-write types that Zod can generate.
- Scenes are thin. Domain logic lives in `modules/`, scenes only read state and move sprites.
- Thin-scene heuristic: if a scene method has more than one `if`/`switch` branch that isn't directly about Phaser rendering, extract the logic to a module.
- If an interface is used by two or more domain modules, define it once in a dedicated `modules/<name>/` directory or in `@wds/shared`. Never duplicate interfaces across modules.
- If a scene method iterates over domain data (a `for` loop not directly creating/updating Phaser objects), extract the iteration and filtering logic to a module function. Scenes call the module function and iterate over the result for rendering.
- If a committed asset was generated by a script, commit the generator script in `scripts/`. If the asset is intended to be Tiled-authored going forward, note this in the commit message.
- Use port interfaces (`core/ports/`) — never import Phaser directly in domain code.
- Scenes reference container ports by **interface type** (e.g. `IGameClock`), never cast to concrete adapters (e.g. `as PhaserClock`). The port abstraction exists so implementations can be swapped without changing scene code.
- Verify Phaser symbols against rc.6 docs before use. Record in `docs/PHASER_EVIDENCE.md`.
- Ensure `bun run check` passes before requesting a push or PR.

### Ask First

- New dependencies (runtime or dev)
- New port interfaces or changes to existing ports
- Changes to `eslint.config.mjs`, `.dependency-cruiser.cjs`, or `tsconfig.*.json`
- Schema changes in `@wds/shared` (contract changes affect client + server)
- New ADRs or changes to existing ADRs
- Refactors touching >10 files

### Never

- Commit directly to `main`. All work goes through feature branches and PRs.
- Push without the pre-push gate passing (Lefthook enforces this).
- Force-push to `main` or any shared branch.
- Import `phaser`, `window`, `document`, or `requestAnimationFrame` in `modules/`
- Import `server/` or `hono` in `scenes/` (use `core/services/network-manager`)
- Cast container ports to concrete adapter types in scenes (e.g. `container.clock as PhaserClock`)
- Hand-write types that should be `z.infer<>`
- Claim Phaser 4 uses WebGPU (it uses WebGL)
- Cite Phaser 3 docs (photonstorm.github.io/phaser3-docs or docs.phaser.io/api-documentation/api-documentation)
- Disable tests or linters to make things pass
- Commit secrets, keys, or tokens
- Use `--no-verify` on commits or pushes

## Architecture Quick Reference

### Zone Dependency Law

```text
modules/ -> core/ports/    (interfaces only)
modules/ -> @wds/shared    (schemas + types)
scenes/  -> modules/       (domain logic)
scenes/  -> core/          (services + adapters)
core/    -> @wds/shared    (schemas + types)

FORBIDDEN:
modules/ X phaser, window, document, scenes/, core/adapters/
scenes/  X server/, hono, raw fetch
shared/  X any app dependency except Zod
```

### Pure DI Pattern

- `core/container.ts` — Container interface (all services declared here)
- `main.ts` — Composition Root (all services wired here, nowhere else)
- Modules receive dependencies via constructor params (port interfaces only)
- Tests use plain mock objects that satisfy port interfaces

### Phaser 4

- WebGL renderer (WebGL2-class). Not WebGPU.
- SpriteGPULayer for instanced rendering
- GPU-accelerated tilemaps: orthographic only

### Schemas

14 files in `packages/shared/src/schema/`:
`common` `character` `player` `enemy` `level` `collectible` `minigame` `scoring` `progression` `settings` `events` `sync` `assets` `physics-config`

40+ inferred types exported from `packages/shared/src/types/index.ts`.

### Hooks (enforcement)

| Hook | Event | What It Does |
|------|-------|-------------|
| `lefthook.yml` | git pre-push | Runs all 6 CI gates locally before push |
| `block-phaser3-urls.sh` | PreToolUse | Blocks Phaser 3 doc URL access |
| `zone-lint-on-edit.sh` | PostToolUse | ESLint + grep on modules/ edits |
| `phaser-version-guard.sh` | PostToolUse | Warns on undocumented Phaser symbols |
| `telemetry-log.sh` | PostToolUse | Appends event to `.claude/telemetry/events.jsonl` |
| `session-summary.sh` | Stop | Tallies violations/warnings for response cycle |
| `session-end-report.sh` | SessionEnd | Writes session summary + drift report |

## Code Style

- Biome handles formatting. No manual style debates.
- `isolatedDeclarations` on in client (off in shared/server for Zod/Hono compat).
- Relative imports only (no path aliases).
- Co-locate tests: `modules/player/__tests__/player-controller.test.ts`
- Schemas in `packages/shared/src/schema/`, types in `packages/shared/src/types/`.

## Where to Look First

| Topic | Location |
|-------|----------|
| Player mechanics | `apps/client/src/modules/player/` |
| Physics/collision | `apps/client/src/modules/physics/` |
| Enemy behavior | `apps/client/src/modules/enemy/` |
| Minigame system | `apps/client/src/modules/minigame/` |
| Game state | `apps/client/src/modules/game-state/` |
| Scene navigation | `apps/client/src/modules/navigation/scene-keys.ts` |
| Engine abstraction | `apps/client/src/core/ports/` |
| Phaser adapters | `apps/client/src/core/adapters/` |
| DI wiring | `apps/client/src/core/container.ts` + `apps/client/src/main.ts` |
| Scene rendering | `apps/client/src/scenes/` |
| Shared schemas | `packages/shared/src/schema/` |
| Inferred types | `packages/shared/src/types/index.ts` |
| Server API | `apps/server/src/` |
| Phaser API evidence | `docs/PHASER_EVIDENCE.md` |
| Architecture docs | `docs/FOUNDATION.md` |
| Game blueprint | `docs/plans/game-blueprint.md` |
| Roadmap & status | `docs/plans/active-plan.md` |
