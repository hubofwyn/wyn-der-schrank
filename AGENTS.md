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
  plans/
    active-plan.md       → Current phase + next steps
    game-blueprint.md    → Scenes, schemas, modules, assets, data flow
    telemetry.md         → Phaser 4 enforcement, hooks, observability
    agentic-setup.md     → Design of .claude/ infrastructure
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
    navigation/          → Scene keys, flow controller
    character/           → Character definitions, stats
    player/              → Player controller, state, abilities
    physics/             → Platformer physics, collision
    enemy/               → Enemy catalog, AI, behaviors, spawner
    level/               → Level data, world catalog, tile registry
    camera/              → Camera controller
    collectible/         → Pickup system, catalog
    minigame/            → Registry, manager, per-game logic (dice-duel, coin-catch, memory-match)
    scoring/             → Score calculator, star rating
    progression/         → Profile, unlocks, session state
    settings/            → Preferences manager
    game-state/          → Global FSM, sync manager
  src/scenes/            → View zone (Phaser scenes, thin)
apps/server/             → Hono API + game server (@wds/server)
  src/routes/            → API route handlers
  src/services/          → Server-side business logic
scripts/
  telemetry-report.sh   → Human-run telemetry analysis
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
- `bun run pre-commit` — check + format:check

## Definition of Done

- [ ] `bun run check` passes (zero warnings, zero errors)
- [ ] New domain logic has co-located tests in `__tests__/`
- [ ] No zone violations (modules/ imports only ports/ and @wds/shared)
- [ ] New services registered in `core/container.ts`
- [ ] New types inferred from Zod schemas (never hand-written)
- [ ] New Phaser symbols recorded in `docs/PHASER_EVIDENCE.md`
- [ ] ADR written for architectural changes (use `docs/adr/template.md`)

## Workflow

1. **Investigate first.** Before writing code: grep for existing patterns, read relevant docs, check `core/ports/` and `core/container.ts`. Show evidence.
2. **Explore -> plan -> implement.** For non-trivial tasks, write a short plan with file paths before coding.
3. **Verify after every change.** Run `bun run check`. Never `--no-verify`.
4. **Keep diffs small.** 1-3 focused commits. If touching >10 files, write a plan first.

## Boundaries

### Always

- Respect the three zones. `modules/` is pure TS — no Phaser, no `window`, no `document`.
- Wire new services through `core/container.ts` (Pure DI Composition Root in `main.ts`).
- Infer types from Zod schemas in `@wds/shared`. Never hand-write types that Zod can generate.
- Scenes are thin. Domain logic lives in `modules/`, scenes only read state and move sprites.
- Use port interfaces (`core/ports/`) — never import Phaser directly in domain code.
- Verify Phaser symbols against rc.6 docs before use. Record in `docs/PHASER_EVIDENCE.md`.

### Ask First

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
- Cite Phaser 3 docs (photonstorm.github.io/phaser3-docs or docs.phaser.io/api-documentation/api-documentation)
- Disable tests or linters to make things pass
- Commit secrets, keys, or tokens
- Use `--no-verify` on commits

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
| Current plan | `docs/plans/active-plan.md` |
