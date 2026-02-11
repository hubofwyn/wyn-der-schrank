# Architectural Audit — Findings Summary

**Date:** 2026-02-10
**Auditor:** Claude Code CLI (claude-opus-4-6)
**Codebase state:** `37576c9` (main branch, Phase 1 — Core Infrastructure in progress)
**Audit plan:** `docs/audit/audit-plan-02102026.md` (12 gates)

---

## Scorecard

| Gate | Name | Status | Findings |
|------|------|--------|----------|
| 1 | Repository Structure | ✅ | 0 |
| 2 | Dependency Versions | ✅ | 1 🔵 |
| 3 | TypeScript Configuration | ✅ | 1 🔵 |
| 4 | Directory Structure & Naming | ✅ | 0 |
| 5 | Zone Enforcement Tooling | ✅ | 0 |
| 6 | Zone Violation Scan | ✅ | 0 |
| 7 | Schema & Type Discipline | ✅ | 0 |
| 8 | Container & DI | ✅ | 1 🔵 |
| 9 | Port Interfaces & Adapters | ✅ | 0 |
| 10 | Scenes & Phaser Patterns | ✅ | 1 🔵 |
| 11 | Agentic Infrastructure | ✅ | 1 🔵 |
| 12 | Legacy Artifact Scan | ✅ | 0 |

**Total: 0 🔴 CRITICAL · 0 🟡 WARNING · 5 🔵 INFO**

---

## Critical Findings (🔴 fix before any new work)

None.

---

## Warnings (🟡 fix within current phase)

None.

---

## Info (🔵 fix opportunistically)

| # | Gate | Finding | Evidence | Remediation |
|---|------|---------|----------|-------------|
| 1 | 2 | Root devDeps include `globals` and `typescript-eslint` not listed in Foundation §1 stack table | `jq '.devDependencies' package.json` shows `"globals": "^17.3.0"` and `"typescript-eslint": "^8.55.0"` | These are ESLint infrastructure deps (required for flat config). Add to Foundation §1 table under "Dev — ESLint ecosystem" or note as implicit. No action needed. |
| 2 | 3 | `skipLibCheck: true` in base tsconfig | `tsconfig.base.json` line: `"skipLibCheck": true` | Per Foundation spec. Consider setting to `false` for Phaser type safety. The tradeoff is build speed vs catching wrong Phaser API usage at compile time. Deliberate decision review recommended. |
| 3 | 8 | Stale empty `__tests__/` directory in `apps/client/dist/` | `find apps/client/dist -name "__tests__" -type d` → `apps/client/dist/modules/player/__tests__` (empty dir, 0 files) | Run `rm -rf apps/client/dist && bun run typecheck` to regenerate clean dist/. The tsconfig exclude is working (no .ts files compiled), but old empty dir persists. |
| 4 | 10 | No scene files exist yet | `find apps/client/src/scenes -name "*.ts"` → empty | Expected for current phase. Scene implementation (Boot → Preload → Title → MainMenu chain) is listed as Phase 1 "Next" in `active-plan.md`. |
| 5 | 11 | Local Phaser 4 docs mirror not yet created | `docs/vendor/phaser-4.0.0-rc.6/` does not exist | Listed as Phase 1 "Next" item. Priority 1 of the Phaser docs-first contract. Online docs at `docs.phaser.io/api-documentation/4.0.0-rc.6/` remain available in the meantime. |

---

## Remediation Plan (Priority Order)

No critical or warning-level remediations required. The codebase is architecturally sound.

For INFO items, recommended order if addressed:

1. **Clean dist/ artifacts** — `rm -rf apps/client/dist && bun run typecheck` (removes stale empty `__tests__` dir)
2. **Create local Phaser docs mirror** — Already on the Phase 1 "Next" list. This is the highest-value remaining infrastructure item since it enables offline Phaser API verification.
3. **Review `skipLibCheck` decision** — Consider adding an ADR documenting the tradeoff. Current setting matches Foundation spec and is not wrong.
4. **Document ESLint ecosystem deps** — Add `globals` and `typescript-eslint` to Foundation §1 table. Cosmetic.

---

## Spec Inconsistencies Discovered

None. The Foundation, Blueprint, Telemetry, and Agentic Setup documents are internally consistent. The Architectural Decisions Log in the audit plan correctly documents all Phase 1 deviations from the original Foundation spec (e.g., 14 schemas instead of 13, expanded port interfaces, deps object pattern).

---

## Gate-by-Gate Evidence

### Gate 1: Repository Structure ✅

- Root `package.json`: name `wyn-der-schrank`, private `true`, workspaces `["packages/*", "apps/*"]` ✓
- Three workspace packages: `@wds/shared`, `@wds/client`, `@wds/server` ✓
- `bun.lock` exists (54,377 bytes, text-based format) ✓
- All 5 config files present: `biome.json`, `eslint.config.mjs`, `.dependency-cruiser.cjs`, `tsconfig.base.json`, `vitest.workspace.ts` ✓

### Gate 2: Dependency Versions ✅

All pinned versions match Foundation §1:

| Package | Dependency | Expected | Actual | Status |
|---------|-----------|----------|--------|--------|
| root (dev) | typescript | 5.9.3 | 5.9.3 | ✓ |
| root (dev) | vitest | 4.0.18 | 4.0.18 | ✓ |
| root (dev) | happy-dom | 20.6.0 | 20.6.0 | ✓ |
| root (dev) | @biomejs/biome | 2.3.14 | 2.3.14 | ✓ |
| root (dev) | eslint | 10.0.0 | 10.0.0 | ✓ |
| root (dev) | dependency-cruiser | 17.3.8 | 17.3.8 | ✓ |
| @wds/client (dev) | vite | 7.3.1 | 7.3.1 | ✓ |
| @wds/shared | zod | 4.3.6 | 4.3.6 | ✓ |
| @wds/client | phaser | 4.0.0-rc.6 | 4.0.0-rc.6 | ✓ |
| @wds/server | hono | 4.11.9 | 4.11.9 | ✓ |

Unlisted but legitimate: `globals ^17.3.0`, `typescript-eslint ^8.55.0` (ESLint flat config deps).
No unexpected production dependencies.

### Gate 3: TypeScript Configuration ✅

- `strict: true` ✓
- `isolatedDeclarations: true` in base ✓ (disabled in shared + server for Zod/Hono compat)
- `target: ES2024`, `module: ESNext`, `moduleResolution: bundler` ✓
- `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` ✓
- `noUnusedLocals: true`, `noUnusedParameters: true` ✓
- No path aliases anywhere ✓
- Client references `../../packages/shared` ✓
- Client `exclude` covers `__tests__/**`, `*.test.ts`, `__test-utils__/**` ✓
- `tsconfig.test.json` exists with `composite: false`, `noEmit: true`, `exclude: []` ✓
- `env.d.ts` contains `/// <reference types="phaser" />` ✓
- `bun run typecheck` passes clean (exit 0) ✓

### Gate 4: Directory Structure & Naming ✅

All zone directories exist:

- `core/`, `core/ports/`, `core/adapters/`, `core/services/`, `modules/`, `scenes/` ✓
- `packages/shared/src/schema/`, `packages/shared/src/types/` ✓
- `apps/server/src/routes/`, `apps/server/src/services/` ✓ (with `.gitkeep`)
- `docs/`, `docs/adr/`, `docs/adr/template.md` ✓

Key files:

- `main.ts`, `container.ts`, `env.d.ts`, `__test-utils__/mocks.ts` all present ✓

File naming:

- All module files follow `{domain}-{role}.ts` kebab-case ✓
- All adapter files follow `phaser-{domain}.ts` ✓
- Test file: `player-controller.test.ts` follows `{module}.test.ts` ✓
- `__tests__/` directories exist in all module directories ✓
- Only `main.ts` and `env.d.ts` in client `src/` root ✓
- Zero Phaser imports in modules/ ✓

### Gate 5: Zone Enforcement Tooling ✅

- ESLint has 4 zone blocks (modules, scenes, core, shared) + 1 test override ✓
- Modules zone: `no-restricted-imports` (phaser, scenes, adapters) + `no-restricted-globals` (Phaser, window, document, requestAnimationFrame) ✓
- Test override block points to `tsconfig.test.json` ✓
- `eslint apps/client/src/modules/ --max-warnings 0` passes (exit 0) ✓
- dependency-cruiser: 6 forbidden rules, 100 modules / 113 dependencies cruised, 0 violations ✓
- Biome config: `dist/`, `build/`, `coverage/`, `.claude/settings*.json` excluded ✓
- `bun run check` passes (exit 0, 32/32 tests) ✓

### Gate 6: Zone Violation Scan ✅

All 8 scans clean:

- 6.1: Zero Phaser imports in modules/ ✓
- 6.2: Zero browser globals in modules/ ✓
- 6.3: Zero scene imports in modules/ ✓
- 6.4: Zero adapter imports in modules/ ✓
- 6.5: Zero server/hono imports in scenes/ ✓
- 6.6: Zero app imports in shared/ ✓
- 6.7: Zero game logic in scenes/ ✓
- 6.8: Modules only import from core/ports/ ✓

### Gate 7: Schema & Type Discipline ✅

- 14 schema files in `packages/shared/src/schema/` ✓
  - `assets`, `character`, `collectible`, `common`, `enemy`, `events`, `level`, `minigame`, `physics-config`, `player`, `progression`, `scoring`, `settings`, `sync`
- `types/index.ts` has 45 `z.infer<>` type exports, zero hand-written types ✓
- Schema names follow `{Entity}{Part}Schema` convention ✓
- Schemas import only from Zod and sibling schemas ✓
- `physics-config.ts` uses fully explicit `.default(...)` objects (Zod v4 compliant) ✓
- Module-local interfaces: `PlayerControllerDeps` (deps container) and `PlayerSnapshot` (readonly view) — both acceptable structural contracts ✓

### Gate 8: Container & DI ✅

- `container.ts` defines `Container`, `PlatformerScope`, `MinigameScope` ✓
- Container has 6 infrastructure services + 2 scoped factories ✓
- PlatformerScope: `levelId`, `config: PlatformerConfig`, `playerBody: IBody`, `dispose()` ✓
- MinigameScope: `minigameId`, `dispose()` ✓
- `main.ts` exists as stub with Phase 1 TODO ✓
- Zero `new ServiceClass()` in modules/ ✓
- PlayerController uses deps object pattern: `constructor(deps: PlayerControllerDeps)` ✓
- Zero service-locator patterns in modules/ ✓
- Zero DI framework imports (Pure DI only) ✓

### Gate 9: Port Interfaces & Adapters ✅

- 6 port files: `engine.ts`, `input.ts`, `audio.ts`, `physics.ts`, `network.ts`, `storage.ts` ✓
- 8 port interfaces: `IGameClock`, `IRendererStats`, `IInputProvider`, `IAudioPlayer`, `INetworkClient`, `IStorageProvider`, `IPhysicsWorld`, `IBody` ✓
- 3 adapter files: `phaser-clock.ts`, `phaser-input.ts`, `phaser-physics.ts` ✓
- Adapters import from ports/ and reference Phaser namespace ✓
- Modules only import from ports/ ✓
- Mock factory provides: `createMockClock`, `createMockInput`, `createMockBody` + `MockInput`, `MockBody` interfaces ✓

### Gate 10: Scenes & Phaser Patterns ✅

- `scenes/` directory exists but is empty (expected — Phase 1 pending items) ✓
- `SceneKeys` constant in `modules/navigation/scene-keys.ts` ✓
- Zero WebGPU references ✓
- Zero Phaser 3 patterns ✓
- No Phaser.Game config yet (main.ts is stub) ✓

### Gate 11: Agentic Infrastructure ✅

- `CLAUDE.md` (40 lines) — references Phaser 4 contract, docs-first contract, investigation mandate ✓
- `AGENTS.md` (200 lines) — project contract with zone rules, workflow, boundaries ✓
- `.claude/` structure: settings.json with 5 hook types, 3 agents, 5 commands, 6 skills, 6 hooks, telemetry JSONL ✓
- `docs/PHASER_EVIDENCE.md` (25 lines) ✓
- ADR template at `docs/adr/template.md` ✓
- Local Phaser docs mirror: not yet created (Phase 1 "Next" item) — 🔵 INFO

### Gate 12: Legacy Artifact Scan ✅

- Zero "aether" references ✓
- Zero "@aether/" imports ✓
- Zero stale config files (.babelrc, .prettierrc, webpack, jest) ✓
- Zero tsyringe/inversify references ✓
- Zero jest references ✓
- Zero Phaser 3 version references ✓
- Zero "beam" references ✓
- One TODO in main.ts: `// TODO: Phase 1 — Import and wire Phaser adapters + domain modules` — valid planned-work marker, not migration artifact ✓
- All 12 expected scripts present in root `package.json` ✓
- `vitest.workspace.ts`: 3 named projects with `include: ['src/**/*.test.ts']` and `exclude: ['**/dist/**', '**/node_modules/**']` ✓

---

## Recommendations

1. **Architecture is solid.** Zero critical or warning-level findings across all 12 gates. The zone defense, DI pattern, schema-first types, and Phaser enforcement are all working as designed.

2. **Phase 1 completion path is clear.** The active plan's "Next" items (Composition Root wiring, scene chain, adapters integration) are well-positioned — all infrastructure (ports, adapters, container, schemas) is in place and verified.

3. **Test coverage is strong for what exists.** 32 tests covering PlayerController with edge cases, state transitions, coyote time, jump buffering. As more modules are implemented, maintaining this test density will be important.

4. **Phaser docs mirror should be prioritized.** It's the foundation of the docs-first contract. Without it, the codebase relies on online docs which may change or become unavailable.

5. **Consider cleaning dist/ before next phase.** A simple `rm -rf apps/client/dist` removes the stale empty `__tests__` directory. Not urgent but removes noise from any future file scans.
