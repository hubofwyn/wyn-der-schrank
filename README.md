# Wyn der Schrank

Web-based side-scrolling platformer with integrated minigame subsystem.

## Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.9 (strict) |
| Game engine | Phaser 4.0.0-rc.6 (WebGL) |
| Server | Hono 4.11 |
| Validation | Zod 4.3 |
| Runtime | Bun 1.3 (dev), Node 24 (CI) |
| Build | Vite 7.3, Biome 2.3, ESLint 10 |

## Setup

```bash
bun install
bun run hooks:install # install Lefthook git hooks (once)
bun run dev           # client dev server
bun run check         # full gate: typecheck + zone lint + dep check + tests
```

## Project Structure

```text
packages/shared/     Zod schemas + inferred types (@hub-of-wyn/shared)
apps/client/         Phaser 4 game client (@hub-of-wyn/client)
  src/core/          Infrastructure: ports, adapters, services, DI container
  src/modules/       Domain logic (pure TS, no Phaser imports)
  src/scenes/        Phaser scenes (thin view layer)
apps/server/         Hono API server (@hub-of-wyn/server)
docs/                Architecture, plans, Phaser API evidence
```

## Architecture

Three-zone dependency law:

- **modules/** — Pure TypeScript domain logic. No Phaser, no browser globals.
- **scenes/** — Thin Phaser view layer. Reads state, moves sprites.
- **core/** — Infrastructure. Ports (interfaces), adapters (implementations), DI container.

Types are inferred from Zod schemas, never hand-written. Services are wired through pure DI in `core/container.ts`.

## Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start client dev server |
| `bun run typecheck` | TypeScript project references build |
| `bun run lint:zones` | ESLint zone enforcement on modules/ |
| `bun run format` | Biome format + lint fix |
| `bun run deps:check` | Dependency-cruiser structural validation |
| `bun run test` | Vitest watch mode |
| `bun run test:run` | Vitest single run |
| `bun run check` | Full gate (typecheck + zones + deps + tests) |
| `bun run lint:md` | Markdown lint check |
| `bun run hooks:install` | Install Lefthook git hooks (run once after clone) |

## Documentation

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Project contract: rules, boundaries, workflow |
| `docs/FOUNDATION.md` | Architecture deep-dive: zones, DI, TypeScript config |
| `docs/plans/active-plan.md` | Goal roadmap, status tracking, deliverables |
| `docs/plans/game-blueprint.md` | Game domain: scenes, schemas, modules, assets |
| `docs/plans/studio-asset-interface.md` | Shared contract with asset studio repo |
| `docs/plans/diagnostics.md` | Runtime diagnostics: ports, channels, adapters |
| `docs/plans/telemetry.md` | Agentic telemetry and Phaser 4 enforcement |
| `docs/plans/lint-format-hooks.md` | Tool roles, config, git hook pipeline |
| `docs/PHASER_EVIDENCE.md` | Verified Phaser 4 API usage log |
