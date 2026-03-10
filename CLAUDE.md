# CLAUDE.md — Wyn der Schrank

Read `AGENTS.md` first. It is the project contract.

## Reference Hierarchy

| Document | Path | Purpose |
|----------|------|---------|
| Project contract | `AGENTS.md` | Rules, boundaries, workflow, quick reference |
| Architecture | `docs/FOUNDATION.md` | Tech stack, zone defense, DI, TypeScript config |
| Game domain | `docs/plans/game-blueprint.md` | Scenes, schemas, modules, assets, data flow |
| Roadmap | `docs/plans/active-plan.md` | Goal status, deliverables, update protocol |
| Studio integration | `docs/plans/studio-asset-interface.md` | Shared contract with asset studio repo |
| Enforcement | `docs/plans/telemetry.md` | Phaser 4 enforcement, hooks, telemetry |
| Diagnostics | `docs/plans/diagnostics.md` | Runtime diagnostics: ports, channels, adapters |
| Agentic setup | `docs/plans/agentic-setup.md` | Design of .claude/ infrastructure |
| Lint & hooks | `docs/plans/lint-format-hooks.md` | Tool roles, config, git hook pipeline |
| Mobile responsive | `docs/plans/mobile-responsive-plan.md` | Viewport, safe zone, touch, HUD scaling guide |
| Mobile research | `docs/plans/mobile-ui-ux-research.md` | March 2026 mobile web platform research |
| Mobile goals | `docs/plans/mobile-goals.md` | G13-G15 implementation plan for mobile polish |
| Phaser evidence | `docs/PHASER_EVIDENCE.md` | Verified Phaser 4 API usage log |

## Workflow

1. Start from clean `main`. Pull latest.
2. Create a work branch: `git checkout -b type/short-description`
3. Investigate → plan → implement → `bun run check` after each change.
4. Commit as each piece completes. Conventional commits: `type(scope): description`.
5. When ready, push. Lefthook's pre-push hook runs all gates automatically. Fix any failures.
6. Push branch, open PR. Human monitors CI and merges.
7. Return to `main`, pull, delete local branch. Repeat.

Never commit directly to `main`. Never push without pre-push passing.

## Key Constraints

- `modules/` is pure TS. Zero Phaser, zero browser globals.
- Types inferred from Zod schemas. Never hand-written.
- Services wired through `core/container.ts`. Scenes are thin.
- Phaser 4 renderer is WebGL, not WebGPU.
- Layout math in `modules/viewport/`. HUD anchored to safe zone. Touch targets >= 44px.

## Plan Protocol

The living roadmap is `docs/plans/active-plan.md`. Read it at session start.

- Goals are numbered by priority. Work top-down — pick the first `ready` goal.
- One goal is `in-progress` at a time. Its branch name is in the goal metadata.
- After completing deliverables, check the boxes and update the Snapshot.
- Never add, remove, or reorder goals. Only the human modifies the goal list.
- The `/implement-feature` command reads and updates the plan automatically.

## Phaser 4 Contract

Path-scoped: see `.claude/rules/phaser-evidence.md` (activates for adapters/ and scenes/).
