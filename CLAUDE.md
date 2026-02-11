# CLAUDE.md — Wyn der Schrank

Read `AGENTS.md` first. It is the project contract.

## Reference Hierarchy

| Document | Path | Purpose |
|----------|------|---------|
| Project contract | `AGENTS.md` | Rules, boundaries, workflow, quick reference |
| Architecture | `docs/FOUNDATION.md` | Tech stack, zone defense, DI, TypeScript config |
| Game domain | `docs/plans/game-blueprint.md` | Scenes, schemas, modules, assets, data flow |
| Enforcement | `docs/plans/telemetry.md` | Phaser 4 enforcement, hooks, telemetry |
| Agentic setup | `docs/plans/agentic-setup.md` | Design of .claude/ infrastructure |
| Current plan | `docs/plans/active-plan.md` | What phase we're in, what's next |
| Phaser evidence | `docs/PHASER_EVIDENCE.md` | Verified Phaser 4 API usage log |

## Workflow

1. Start from clean `main`. Pull latest.
2. Create a work branch: `git checkout -b type/short-description`
3. Investigate → plan → implement → `bun run check` after each change.
4. Commit as each piece completes. Conventional commits: `type(scope): description`.
5. When ready, `bun run pre-push` (also enforced by git hook). Fix any failures.
6. Push branch, open PR. Human monitors CI and merges.
7. Return to `main`, pull, delete local branch. Repeat.

Never commit directly to `main`. Never push without pre-push passing.

## Key Constraints

- `modules/` is pure TS. Zero Phaser, zero browser globals.
- Types inferred from Zod schemas. Never hand-written.
- Services wired through `core/container.ts`. Scenes are thin.
- Phaser 4 renderer is WebGL, not WebGPU.

## Phaser 4.0.0-rc.6 — Docs-First Contract

Source of truth (in priority order):
1. Local mirror: `docs/vendor/phaser-4.0.0-rc.6/`
2. Type declarations: `node_modules/phaser/types/*.d.ts`
3. Online docs: `https://docs.phaser.io/api-documentation/4.0.0-rc.6/`

Before using ANY Phaser symbol not already in this codebase:
1. Locate it in rc.6 docs or types
2. Record it in `docs/PHASER_EVIDENCE.md`
3. If not found, say "Not found in Phaser 4.0.0-rc.6 docs" and STOP

Never cite photonstorm.github.io/phaser3-docs or docs.phaser.io/api-documentation/api-documentation (v3).
