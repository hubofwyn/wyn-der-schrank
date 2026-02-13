# Wyn der Schrank — Architectural Audit Directive

**For:** Claude Code CLI agent (or any compatible agentic tool)  
**Authority:** Foundation, Agentic Setup, Game Blueprint, Telemetry & Enforcement documents  
**Date:** February 10, 2026  
**Purpose:** Full verification of the live codebase against the canonical specification

---

## Instructions for the Executing Agent

You are conducting a comprehensive architectural audit of the Wyn der Schrank codebase. This audit has **12 gates**. Execute every gate in order. For each gate:

1. Run every command listed under **Checks**
2. Record the actual output
3. Compare against the **Expected** result
4. Log every deviation as a **FINDING** with severity:
   - 🔴 **CRITICAL** — Zone violation, architectural corruption, security risk. Must fix before any new work.
   - 🟡 **WARNING** — Drift from spec, missing enforcement, incomplete setup. Fix within current phase.
   - 🔵 **INFO** — Minor naming inconsistency, missing optional file, suggestion. Fix opportunistically.
5. At the end, produce a **FINDINGS SUMMARY** table and a **REMEDIATION PLAN**

**Do not fix anything during the audit.** Observe and report only. Fixes come after the full picture is clear.

**Investigation evidence rule applies to this audit too:** show the grep/command output that supports each finding. No finding without evidence.

---

## Architectural Decisions Log (Phase 1)

The following decisions were made during Phase 1 implementation and should be treated as **canon** by the auditor. Deviations from the original Foundation spec in these areas are intentional and correct.

### File Organization & Naming

- **kebab-case universally**: All files are `{domain}-{role}.ts` (e.g., `player-controller.ts`, `phaser-clock.ts`, `scene-keys.ts`)
- **Adapter naming**: `phaser-{domain}.ts` (e.g., `phaser-clock.ts`, `phaser-input.ts`, `phaser-physics.ts`)
- **Test co-location**: `__tests__/` directory inside each module directory (double-underscore prefix)
- **Shared test utilities**: `modules/__test-utils__/mocks.ts` at the modules level, not per-module
- **Schema naming**: `{domain}.ts` for single-word, `{domain}-{part}.ts` for compound (e.g., `physics-config.ts`)
- **Declaration files**: `env.d.ts` in `apps/client/src/` for Phaser ambient type loading

### TypeScript Configuration

- **Build tsconfig excludes tests**: `apps/client/tsconfig.json` has `exclude` for `__tests__/`, `*.test.ts`, `__test-utils__/` to prevent dist/ pollution
- **Companion tsconfig.test.json**: Extends main tsconfig with `noEmit: true`, includes all files, used by ESLint for type-aware linting of test files
- **env.d.ts**: Required for Phaser 4's ambient `declare namespace Phaser` types to load

### Schema & Types (14 files, not 13)

- **physics-config.ts** added: `PlatformerConfigSchema`, `MovementConfigSchema`, `JumpConfigSchema`, `FastFallConfigSchema`, `BodyDimensionsSchema`
- **Zod v4 `.default()` requires full objects**: No `{}`; every nested `.default()` provides explicit values for all fields
- **Module-local interfaces are acceptable**: `PlayerControllerDeps` (deps container) and `PlayerSnapshot` (readonly state view) are structural contracts, not domain types

### Dependency Injection

- **Deps object pattern**: Modules receive a single typed deps object, not positional constructor params
- **PlatformerScope shape**: `{ levelId, config: PlatformerConfig, playerBody: IBody, dispose() }`
- **Container has 6 infrastructure services + 2 scoped factories**

### Port Interfaces (Expanded)

- **IInputProvider**: Has `update()` method (must be called once per frame), `isDown(action)` for held state, `justPressed`/`justReleased` for frame edges, `getBinding`/`setBinding`/`resetBindings` for key remapping
- **IBody**: Full physics API — read (`position`, `velocity`, `blocked`, `isOnGround`) and write (`setVelocityX/Y`, `setAcceleration`, `setGravityY`, `setDrag`, etc.)
- **IPhysicsWorld**: `createBody(config)`, `removeBody(body)`, `collide`, `overlap`, `raycast`, gravity control

### Testing Patterns

- **Mock factories**: `createMockClock()`, `createMockInput()`, `createMockBody()`, `createDefaultConfig()`, `createDefaultStats()`
- **MockInput/MockBody extend port interfaces**: Add test-visible properties (`_pressed`, `_justPressed`, `_velocity`, etc.)
- **Getter/setter for primitives**: Mock body uses getter/setter pairs for `_gravityY` and `_enabled` to maintain closure synchronization (spread copies primitives by value)
- **vitest.workspace.ts**: Named project objects with explicit `include`/`exclude` patterns (not simple string array)

### Biome Configuration

- **Excludes**: `dist/`, `build/`, `coverage/`, `.claude/settings*.json`

---

## Gate 1: Repository Structure & Workspace Configuration

Verify the monorepo skeleton matches the specification.

### Checks

```bash
# 1.1 — Root package.json: workspace configuration
cat package.json | jq '{name, private, workspaces, scripts}'

# 1.2 — Workspace packages exist
ls -d packages/*/package.json apps/*/package.json 2>/dev/null

# 1.3 — Package names match @hub-of-wyn/* convention
for pkg in packages/*/package.json apps/*/package.json; do
  echo "$pkg: $(jq -r .name "$pkg" 2>/dev/null)"
done

# 1.4 — Root monorepo name
jq -r .name package.json

# 1.5 — Lockfile exists (bun.lock — Bun 1.3+ uses text-based lockfile)
ls -la bun.lock 2>/dev/null || echo "MISSING: bun.lock"

# 1.6 — Top-level config files exist
for f in biome.json eslint.config.mjs .dependency-cruiser.cjs tsconfig.base.json vitest.workspace.ts; do
  [[ -f "$f" ]] && echo "✓ $f" || echo "✗ MISSING: $f"
done
```

### Expected

- Root `package.json` name: `wyn-der-schrank`, private: true, workspaces: `["packages/*", "apps/*"]`
- Three workspace packages: `@hub-of-wyn/shared`, `@hub-of-wyn/client`, `@hub-of-wyn/server`
- All six config files present
- `bun.lock` committed (Bun 1.3+ text-based lockfile; not the old binary `bun.lockb`)

### Spec Reference

- Foundation §2 (Project Structure)
- Foundation §15 (Package.json Scripts)

---

## Gate 2: Dependency Versions (Pinned Stack)

Every dependency must match the locked versions. No drift.

### Checks

```bash
# 2.1 — Core runtime versions
echo "=== Root devDependencies ==="
jq '.devDependencies // {}' package.json

echo "=== Shared dependencies ==="
jq '.dependencies // {}' packages/shared/package.json

echo "=== Client dependencies ==="
jq '.dependencies // {}' apps/client/package.json
jq '.devDependencies // {}' apps/client/package.json

echo "=== Server dependencies ==="
jq '.dependencies // {}' apps/server/package.json

# 2.2 — Phaser version (CRITICAL — must be exactly 4.0.0-rc.6)
grep -r '"phaser"' apps/client/package.json
ls node_modules/phaser/package.json 2>/dev/null && jq -r .version node_modules/phaser/package.json

# 2.3 — Zod version
grep -r '"zod"' packages/shared/package.json
ls node_modules/zod/package.json 2>/dev/null && jq -r .version node_modules/zod/package.json

# 2.4 — Hono version
grep -r '"hono"' apps/server/package.json

# 2.5 — TypeScript version
grep -r '"typescript"' package.json packages/*/package.json apps/*/package.json
npx tsc --version 2>/dev/null || bunx tsc --version 2>/dev/null

# 2.6 — Check for unexpected/unlisted dependencies
echo "=== All production deps across workspaces ==="
for pkg in packages/*/package.json apps/*/package.json; do
  echo "--- $pkg ---"
  jq -r '.dependencies // {} | keys[]' "$pkg" 2>/dev/null
done
```

### Expected

| Package | Dependency | Version |
|---------|-----------|---------|
| root (dev) | typescript | 5.9.3 |
| root (dev) | vite | 7.3.1 |
| root (dev) | vitest | 4.0.18 |
| root (dev) | happy-dom | 20.6.0 |
| root (dev) | @biomejs/biome | 2.3.14 |
| root (dev) | eslint | 10.0.0 |
| root (dev) | dependency-cruiser | 17.3.8 |
| @hub-of-wyn/shared | zod | 4.3.6 |
| @hub-of-wyn/client | phaser | 4.0.0-rc.6 |
| @hub-of-wyn/server | hono | 4.11.9 |

Any dependency not in this table or in the Foundation §1 stack table is a 🟡 WARNING.

### Spec Reference

- Foundation §1 (Technology Stack — Locked)

---

## Gate 3: TypeScript Configuration

Verify compiler options match the strictness requirements.

### Checks

```bash
# 3.1 — Base tsconfig
cat tsconfig.base.json | jq .compilerOptions

# 3.2 — Per-package tsconfigs
for f in packages/shared/tsconfig.json apps/client/tsconfig.json apps/server/tsconfig.json; do
  echo "=== $f ==="
  cat "$f" 2>/dev/null | jq . || echo "MISSING"
done

# 3.3 — Critical flags verification
echo "=== Checking critical flags ==="
node -e "
const base = require('./tsconfig.base.json');
const co = base.compilerOptions || {};
const checks = {
  strict: co.strict === true,
  isolatedDeclarations: co.isolatedDeclarations === true,
  noUncheckedIndexedAccess: co.noUncheckedIndexedAccess === true,
  noUnusedLocals: co.noUnusedLocals === true,
  noUnusedParameters: co.noUnusedParameters === true,
  exactOptionalPropertyTypes: co.exactOptionalPropertyTypes === true,
  moduleResolution_bundler: co.moduleResolution === 'bundler',
  target_ES2024: co.target === 'ES2024',
  skipLibCheck: co.skipLibCheck  // NOTE: report value, discussed below
};
for (const [k, v] of Object.entries(checks)) {
  console.log(v ? '✓' : '✗', k, '=', v);
}
" 2>/dev/null || echo "(Run manually if Node not available)"

# 3.4 — Check for path aliases (should be NONE in Phase 0)
grep -rn '"paths"' tsconfig*.json packages/*/tsconfig.json apps/*/tsconfig.json 2>/dev/null || echo "✓ No path aliases (correct for Phase 0)"

# 3.5 — Project references
jq '.references' apps/client/tsconfig.json 2>/dev/null

# 3.6 — Shared has isolatedDeclarations
jq '.compilerOptions.isolatedDeclarations' packages/shared/tsconfig.json 2>/dev/null

# 3.7 — Client tsconfig excludes test files from build output
echo "=== Client tsconfig exclude ==="
jq '.exclude' apps/client/tsconfig.json 2>/dev/null
# Expected: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/__test-utils__/**"]
# This prevents tsc --build from compiling test files into dist/

# 3.8 — Companion tsconfig.test.json for ESLint type-aware linting of tests
echo "=== tsconfig.test.json ==="
[[ -f "apps/client/tsconfig.test.json" ]] && cat apps/client/tsconfig.test.json | jq . || echo "MISSING: tsconfig.test.json"
# Expected: extends ./tsconfig.json, composite: false, noEmit: true, exclude: []
# Purpose: ESLint needs typed AST for test files that are excluded from the build tsconfig.

# 3.9 — env.d.ts Phaser type reference
echo "=== env.d.ts ==="
[[ -f "apps/client/src/env.d.ts" ]] && cat apps/client/src/env.d.ts || echo "MISSING: env.d.ts"
# Expected: /// <reference types="phaser" />
# Phaser 4 uses ambient namespace declarations (declare namespace Phaser)
# that require an explicit triple-slash reference to load.

# 3.10 — Run typecheck
bun run typecheck 2>&1 || echo "TYPECHECK FAILED"
```

### Expected

- `strict: true`, `isolatedDeclarations: true` in base
- `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- No `paths` aliases anywhere (Phase 0 — ADR-011)
- Client references `../../packages/shared`
- Shared has `isolatedDeclarations: true`
- Client `tsconfig.json` has `exclude: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/__test-utils__/**"]`
- `apps/client/tsconfig.test.json` exists, extends `./tsconfig.json`, has `composite: false`, `noEmit: true`, and empty `exclude: []`
- `apps/client/src/env.d.ts` exists with `/// <reference types="phaser" />`
- Typecheck passes clean

### Design Decisions (Phase 1)

**Test exclusion from build tsconfig:** `tsc --build` was compiling test files into `dist/`, causing vitest to discover and run stale compiled JS alongside the real TS tests. The fix is to exclude test patterns from the build tsconfig and provide a companion `tsconfig.test.json` for ESLint to type-check test files.

**env.d.ts for Phaser types:** Phaser 4 installs ambient `declare namespace Phaser` types. These require an explicit `/// <reference types="phaser" />` directive to load, since Phaser is installed in `apps/client/node_modules/phaser/` (not root). Without this, `Phaser` namespace is not found.

### Spec Note on `skipLibCheck`

The Foundation sets `skipLibCheck: true`. The Phaser enforcement strategy recommends `false` so Phaser types catch wrong API usage. **Log this as 🔵 INFO for deliberate decision review** — the team should decide whether the Phaser type-safety benefit outweighs the build speed cost.

### Spec Reference

- Foundation §13 (TypeScript Configuration)
- Foundation §13 (Path Alias Decision)
- Telemetry & Enforcement §1 (freeze version, types as defense)

---

## Gate 4: Directory Structure & File Organization

Verify every expected directory exists and files follow naming conventions.

### Checks

```bash
# 4.1 — Client source zones exist
for dir in \
  apps/client/src/core \
  apps/client/src/core/ports \
  apps/client/src/core/adapters \
  apps/client/src/core/services \
  apps/client/src/modules \
  apps/client/src/scenes; do
  [[ -d "$dir" ]] && echo "✓ $dir" || echo "✗ MISSING: $dir"
done

# 4.2 — Shared schema/types structure
for dir in \
  packages/shared/src/schema \
  packages/shared/src/types; do
  [[ -d "$dir" ]] && echo "✓ $dir" || echo "✗ MISSING: $dir"
done

# 4.3 — Server structure
for dir in \
  apps/server/src/routes \
  apps/server/src/services; do
  [[ -d "$dir" ]] && echo "✓ $dir" || echo "✗ MISSING: $dir"
done

# 4.4 — Docs & governance
for dir in docs docs/adr; do
  [[ -d "$dir" ]] && echo "✓ $dir" || echo "✗ MISSING: $dir"
done
for f in docs/adr/template.md; do
  [[ -f "$f" ]] && echo "✓ $f" || echo "✗ MISSING: $f"
done

# 4.5 — Composition Root exists
[[ -f "apps/client/src/main.ts" ]] && echo "✓ main.ts" || echo "✗ MISSING: main.ts"

# 4.6 — Container interface exists
[[ -f "apps/client/src/core/container.ts" ]] && echo "✓ container.ts" || echo "✗ MISSING: container.ts"

# 4.7 — env.d.ts exists (Phaser ambient type reference)
[[ -f "apps/client/src/env.d.ts" ]] && echo "✓ env.d.ts" || echo "✗ MISSING: env.d.ts"

# 4.8 — Shared mock factory exists at modules-level
[[ -f "apps/client/src/modules/__test-utils__/mocks.ts" ]] && echo "✓ __test-utils__/mocks.ts" || echo "✗ MISSING: __test-utils__/mocks.ts"

# 4.9 — Full client/src tree (everything that exists)
find apps/client/src -type f -name "*.ts" | sort

# 4.10 — Full shared/src tree
find packages/shared/src -type f -name "*.ts" | sort

# 4.11 — Full server/src tree
find apps/server/src -type f -name "*.ts" | sort

# 4.12 — Check for files in WRONG locations
# Any .ts files directly in apps/client/src/ that aren't main.ts or env.d.ts?
find apps/client/src -maxdepth 1 -name "*.ts" ! -name "main.ts" ! -name "env.d.ts" | head -20

# Any files in modules/ that import phaser? (pre-check for Gate 6)
grep -rn "from.*['\"]phaser" apps/client/src/modules/ 2>/dev/null || echo "✓ No phaser imports in modules/"
```

### Expected

- All zone directories exist (core/, core/ports/, core/adapters/, core/services/, modules/, scenes/)
- `main.ts` is the Composition Root
- `core/container.ts` defines the Container interface
- `env.d.ts` exists in `apps/client/src/` with Phaser type reference
- `__test-utils__/mocks.ts` exists in `apps/client/src/modules/` with shared mock factories
- Files follow `{domain}-{role}.ts` naming in modules/ (kebab-case, always)
- Scene files follow `{name}-scene.ts` naming
- Only `main.ts` and `env.d.ts` should be in `apps/client/src/` root (no other loose files)

### Naming Convention Reference (Established Patterns)

These conventions have been confirmed through implementation:

| Category | Convention | Example |
|----------|-----------|---------|
| Module source files | `{domain}-{role}.ts` (kebab-case) | `player-controller.ts`, `scene-keys.ts` |
| Schema files | `{domain}.ts` (single word or kebab-case) | `common.ts`, `physics-config.ts` |
| Scene files | `{name}-scene.ts` | `boot-scene.ts`, `platformer-scene.ts` |
| Test directories | `__tests__/` (double-underscore prefix) | `modules/player/__tests__/` |
| Test files | `{module}.test.ts` | `player-controller.test.ts` |
| Shared test utilities | `__test-utils__/` at modules/ level | `modules/__test-utils__/mocks.ts` |
| Port interfaces | `{domain}.ts` in `core/ports/` | `engine.ts`, `input.ts`, `physics.ts` |
| Adapter files | `phaser-{domain}.ts` in `core/adapters/` | `phaser-clock.ts`, `phaser-input.ts` |
| Type declaration files | `env.d.ts` | `apps/client/src/env.d.ts` |
| Container | `container.ts` (singular, not pluralized) | `core/container.ts` |
| Composition Root | `main.ts` | `apps/client/src/main.ts` |

### Naming Convention Checks

```bash
# 4.13 — Module file naming: should be kebab-case {domain}-{role}.ts
find apps/client/src/modules -name "*.ts" ! -path "*__tests__*" ! -path "*__test-utils__*" | while read f; do
  base=$(basename "$f")
  if ! echo "$base" | grep -qE '^[a-z][a-z0-9-]+\.ts$'; then
    echo "⚠ Non-standard name: $f"
  fi
done

# 4.14 — Scene file naming: should be {name}-scene.ts
find apps/client/src/scenes -name "*.ts" | while read f; do
  base=$(basename "$f")
  if ! echo "$base" | grep -qE '(-scene|base-scene)\.ts$'; then
    echo "⚠ Non-standard scene name: $f"
  fi
done

# 4.15 — Adapter file naming: should be phaser-{domain}.ts
find apps/client/src/core/adapters -name "*.ts" | while read f; do
  base=$(basename "$f")
  if ! echo "$base" | grep -qE '^phaser-[a-z][a-z0-9-]+\.ts$'; then
    echo "⚠ Non-standard adapter name: $f"
  fi
done

# 4.16 — Test co-location: __tests__/ directories inside modules
find apps/client/src/modules -type d -name "__tests__" | sort
echo "--- Modules WITHOUT __tests__/ directories ---"
for dir in apps/client/src/modules/*/; do
  mod=$(basename "$dir")
  if [[ "$mod" == "__test-utils__" ]]; then continue; fi
  [[ -d "$dir/__tests__" ]] || echo "  ⚠ modules/$mod/ has no __tests__/"
done

# 4.17 — Test file naming: should be {module}.test.ts
find apps/client/src/modules -path "*__tests__*" -name "*.ts" | while read f; do
  base=$(basename "$f")
  if ! echo "$base" | grep -qE '^[a-z][a-z0-9-]+\.test\.ts$'; then
    echo "⚠ Non-standard test name: $f"
  fi
done
```

### Spec Reference

- Foundation §2 (Project Structure)
- Blueprint §3 (Complete File Structure)
- Blueprint §11 (Naming Conventions)

---

## Gate 5: Zone Enforcement Tooling

Verify ESLint zones and dependency-cruiser are correctly configured and passing.

### Checks

```bash
# 5.1 — ESLint config exists and has zone rules
[[ -f "eslint.config.mjs" ]] && echo "✓ eslint.config.mjs" || echo "✗ MISSING"

# 5.2 — Verify ESLint config has the 4 zone blocks + 1 test override
grep -c "modules.*\.ts" eslint.config.mjs 2>/dev/null
grep -c "scenes.*\.ts" eslint.config.mjs 2>/dev/null
grep -c "core.*\.ts" eslint.config.mjs 2>/dev/null
grep -c "shared.*\.ts" eslint.config.mjs 2>/dev/null

# 5.2b — Verify test file override block exists (points to tsconfig.test.json)
grep -c "tsconfig.test.json" eslint.config.mjs 2>/dev/null || echo "✗ MISSING: test file override block"
grep -A 5 "__tests__" eslint.config.mjs 2>/dev/null | head -10

# 5.3 — Check for critical ESLint rules
echo "=== Modules zone restrictions ==="
grep -A 30 "modules.*\.ts" eslint.config.mjs 2>/dev/null | grep -E "no-restricted-imports|no-restricted-globals|phaser|window|document" | head -10

# 5.4 — Run ESLint on modules zone
bunx eslint apps/client/src/modules/ --max-warnings 0 2>&1 || echo "ESLINT MODULES ZONE FAILED"

# 5.5 — dependency-cruiser config exists
[[ -f ".dependency-cruiser.cjs" ]] && echo "✓ .dependency-cruiser.cjs" || echo "✗ MISSING"

# 5.6 — Verify dep-cruiser forbidden rules
grep -c "modules-no-phaser\|modules-no-scenes\|modules-no-adapters\|scenes-no-server\|shared-no-app-deps\|no-circular" .dependency-cruiser.cjs 2>/dev/null

# 5.7 — Run dependency-cruiser
bun run deps:check 2>&1 || echo "DEPENDENCY-CRUISER FAILED"

# 5.8 — Biome config exists and has correct exclusions
[[ -f "biome.json" ]] && echo "✓ biome.json" || echo "✗ MISSING"
cat biome.json 2>/dev/null | jq '{formatter: .formatter, linter: .linter, files: .files}' || true
# Expected files.includes should have: "!!**/dist", "!!**/build", "!!**/coverage", "!!.claude/settings*.json"

# 5.9 — Run the full check script
bun run check 2>&1
echo "Exit code: $?"
```

### Expected

- ESLint config has all 4 zone blocks (modules, scenes, core, shared)
- ESLint config has a 5th block: test file override pointing `__tests__/**` and `__test-utils__/**` to `tsconfig.test.json`
- Modules zone has: `no-restricted-imports` (phaser, scenes, adapters), `no-restricted-globals` (Phaser, window, document, requestAnimationFrame)
- dependency-cruiser has all 6 forbidden rules
- `bun run check` passes (exit 0)

### Design Decision: ESLint Test File Override

The client `tsconfig.json` excludes test patterns from compilation to prevent dist/ pollution. But ESLint with `parserOptions.project: true` auto-discovers this tsconfig and can no longer type-check test files. The solution is a companion `tsconfig.test.json` (includes all files, `noEmit: true`) and an ESLint override block that routes test file patterns to it.

### Spec Reference

- Foundation §4 (ESLint 10.0 Zone Enforcement)
- Foundation §12 (dependency-cruiser Configuration)
- Foundation §15 (Package.json Scripts — `check` command)

---

## Gate 6: Zone Violation Scan (The Deep Check)

Even if tooling is configured, verify the actual source code is clean. Grep is the ground truth.

### Checks

```bash
# 6.1 — MODULES ZONE: No Phaser imports
echo "=== Phaser imports in modules/ ==="
grep -rn "from.*['\"]phaser" apps/client/src/modules/ 2>/dev/null || echo "✓ Clean"
grep -rn "import.*Phaser" apps/client/src/modules/ 2>/dev/null || echo "✓ Clean"
grep -rn "require.*phaser" apps/client/src/modules/ 2>/dev/null || echo "✓ Clean"

# 6.2 — MODULES ZONE: No browser globals
echo "=== Browser globals in modules/ ==="
grep -rn "\bwindow\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "__tests__" || echo "✓ Clean"
grep -rn "\bdocument\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "__tests__" || echo "✓ Clean"
grep -rn "\brequestAnimationFrame\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null || echo "✓ Clean"
grep -rn "\blocalStorage\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null || echo "✓ Clean"
grep -rn "\bsessionStorage\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null || echo "✓ Clean"
grep -rn "\bfetch\b" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "// " || echo "✓ Clean"

# 6.3 — MODULES ZONE: No scene imports
echo "=== Scene imports in modules/ ==="
grep -rn "from.*scenes/" apps/client/src/modules/ 2>/dev/null || echo "✓ Clean"

# 6.4 — MODULES ZONE: No adapter imports (must use ports)
echo "=== Adapter imports in modules/ ==="
grep -rn "from.*adapters/" apps/client/src/modules/ 2>/dev/null || echo "✓ Clean"

# 6.5 — SCENES ZONE: No server/hono imports
echo "=== Server imports in scenes/ ==="
grep -rn "from.*server/" apps/client/src/scenes/ 2>/dev/null || echo "✓ Clean"
grep -rn "from.*['\"]hono" apps/client/src/scenes/ 2>/dev/null || echo "✓ Clean"

# 6.6 — SHARED ZONE: No app dependency imports
echo "=== App imports in shared/ ==="
grep -rn "from.*phaser\|from.*hono\|from.*client/\|from.*server/" packages/shared/src/ 2>/dev/null || echo "✓ Clean"

# 6.7 — SCENES: Check for game logic in scenes (thick scene detection)
echo "=== Potential game logic in scenes/ ==="
# Look for math operations, state mutations, collision logic in scene files
grep -rn "velocity\|acceleration\|isOnGround\|health.*-=\|score.*+=\|damage\|hitPoints" apps/client/src/scenes/ --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "\.state\.\|\.getState()\|container\." || echo "✓ No obvious game logic in scenes"

# 6.8 — Check that modules only import from ports (not core/ root or services/)
echo "=== Modules importing non-port core files ==="
grep -rn "from.*core/" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "core/ports/" | grep -v "__tests__" || echo "✓ Clean — modules only use core/ports/"
```

### Expected

- Zero Phaser references in `modules/`
- Zero browser globals in `modules/`
- Zero scene imports in `modules/`
- Zero adapter imports in `modules/`
- Zero server/hono imports in `scenes/`
- Zero app imports in `shared/`
- Scenes should not contain game logic (velocity calculations, health mutations, etc.)
- Modules should only import from `core/ports/`, never from `core/` root, `core/adapters/`, or `core/services/`

**Every violation here is 🔴 CRITICAL.**

### Spec Reference

- Foundation §3 (Zone Defense Architecture)
- Foundation §4 (ESLint zone rules)
- Foundation Appendix A (Anti-Patterns)

---

## Gate 7: Schema & Type Discipline

Verify Zod-first contract: schemas are the source of truth, types are inferred.

### Checks

```bash
# 7.1 — Schema files exist
echo "=== Schema files ==="
find packages/shared/src/schema -name "*.ts" | sort

# 7.2 — Types index exists and ONLY re-exports z.infer
echo "=== types/index.ts content ==="
cat packages/shared/src/types/index.ts 2>/dev/null || echo "MISSING"

# 7.3 — Check that types/index.ts uses z.infer (not hand-written interfaces)
echo "=== z.infer usage count ==="
grep -c "z\.infer" packages/shared/src/types/index.ts 2>/dev/null || echo "0"

echo "=== Hand-written interfaces/types in types/ (should be ZERO) ==="
grep -n "^export interface\|^export type.*=" packages/shared/src/types/index.ts 2>/dev/null | grep -v "z\.infer" || echo "✓ All types are z.infer"

# 7.4 — Check for hand-written types elsewhere (should not exist)
echo "=== Hand-written types in client that should be z.infer ==="
grep -rn "^export interface\|^export type" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | grep -v "port\|Port\|interface.*{" | head -20

# 7.5 — Check schema naming convention: {Entity}Schema
echo "=== Schema naming ==="
grep -rn "export const.*Schema" packages/shared/src/schema/ | head -30

# 7.6 — Verify schemas import only from Zod and common schemas
echo "=== Schema imports ==="
grep -rn "^import" packages/shared/src/schema/ | grep -v "from.*['\"]zod\|from.*['\"]\./" || echo "✓ Schemas only import Zod and sibling schemas"

# 7.7 — Check for Zod version in actual use (z.object vs z.schema etc.)
echo "=== Zod usage patterns ==="
grep -c "z\.object\|z\.enum\|z\.array\|z\.string\|z\.number\|z\.boolean\|z\.discriminatedUnion" packages/shared/src/schema/*.ts 2>/dev/null

# 7.8 — Verify physics-config.ts schema defaults are fully specified
echo "=== Physics config defaults ==="
grep -A 2 "\.default(" packages/shared/src/schema/physics-config.ts 2>/dev/null | head -30
# Zod v4 requires full explicit default objects for nested schemas.
# .default({}) is NOT valid for objects with required fields.

# 7.9 — Port-adjacent interfaces in modules (acceptable when used as dep containers)
echo "=== Module-local interfaces (deps/snapshot patterns) ==="
grep -n "^export interface\|^interface" apps/client/src/modules/ -r --include="*.ts" 2>/dev/null | grep -v "__tests__\|__test-utils__" || echo "✓ None"
# PlayerControllerDeps is an acceptable pattern — it's a deps-object interface
# for constructor injection, not a hand-written domain type.
```

### Expected

- **14 schema files** in `packages/shared/src/schema/` following `{domain}.ts` naming:
  `common`, `character`, `player`, `enemy`, `level`, `collectible`, `minigame`, `scoring`, `progression`, `settings`, `events`, `sync`, `assets`, **`physics-config`**
- `types/index.ts` contains ONLY `z.infer<>` re-exports
- Zero hand-written interfaces/types that duplicate what Zod should generate
- Schema names follow `{Entity}{Part}Schema` convention (e.g., `MovementConfigSchema`, `JumpConfigSchema`)
- Schemas import only from Zod and sibling schema files
- `physics-config.ts` uses `.default(...)` with **fully explicit default objects** (Zod v4 requirement)
- Module-local `interface` declarations are acceptable ONLY for dependency injection containers (e.g., `PlayerControllerDeps`) and readonly snapshot types (e.g., `PlayerSnapshot`) — these are structural contracts, not domain data types

### Design Decision: Zod v4 `.default()` Behavior

Zod v4's `.default()` on nested object schemas requires the full output type. Using `.default({})` fails type checking because `{}` does not satisfy `{ walkSpeed: number; ... }`. All defaults in `physics-config.ts` provide explicit values for every field. This is intentional — it makes default values visible and explicit in the schema definition.

### Design Decision: Module-Local Interfaces

Modules may define structural interfaces for:

- **Deps objects** (`PlayerControllerDeps`) — collects constructor dependencies into a single typed parameter
- **Readonly snapshots** (`PlayerSnapshot`) — frozen view of module state for scenes to read

These are NOT domain types and do NOT belong in `@hub-of-wyn/shared`. They are implementation details of how modules receive deps and expose state.

### Spec Reference

- Foundation §7 (Shared Contract — Zod-First)
- Blueprint §4 (Zod Schema Catalog)
- Blueprint §11 (Naming Conventions)

---

## Gate 8: Container & Dependency Injection

Verify Pure DI Composition Root pattern is followed correctly.

### Checks

```bash
# 8.1 — Container interface
echo "=== Container interface ==="
cat apps/client/src/core/container.ts 2>/dev/null || echo "MISSING"

# 8.2 — Composition Root in main.ts
echo "=== main.ts structure ==="
cat apps/client/src/main.ts 2>/dev/null || echo "MISSING"

# 8.3 — All services wired ONLY in main.ts (no service constructing other services)
echo "=== 'new' keyword usage outside main.ts and adapters ==="
grep -rn "\bnew\b.*(" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "__tests__\|__test-utils__\|Map(\|Set(\|Error(\|Array(\|Date(\|Promise(\|RegExp(" || echo "✓ No service construction in modules"

grep -rn "\bnew\b.*(" apps/client/src/scenes/ --include="*.ts" 2>/dev/null | grep -v "Phaser\.\|Map(\|Set(\|Error(\|Array(\|Date(\|Promise(" | head -10

# 8.4 — Services receive deps via constructor (check for constructor params)
echo "=== Module constructors (should accept port interfaces) ==="
grep -rn "constructor(" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | head -20

# 8.5 — Container passed via Phaser registry
echo "=== Container access pattern ==="
grep -rn "registry\.\(get\|set\).*container" apps/client/src/ --include="*.ts" 2>/dev/null | head -10

# 8.6 — Check for service locator anti-pattern (direct container.* access in modules/)
echo "=== Service locator pattern in modules/ (should be ZERO) ==="
grep -rn "container\.\|Container\." apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "__tests__\|import.*type.*Container" || echo "✓ No service locator in modules"

# 8.7 — Check for DI container libraries (should use Pure DI)
echo "=== DI framework imports (should be NONE) ==="
grep -rn "tsyringe\|inversify\|typedi\|awilix\|inject\|@Injectable\|@Inject" apps/ packages/ --include="*.ts" 2>/dev/null || echo "✓ No DI frameworks — Pure DI only"

# 8.8 — Scoped factories exist
echo "=== Scoped factories ==="
grep -n "createPlatformerScope\|createMinigameScope\|PlatformerScope\|MinigameScope" apps/client/src/core/container.ts 2>/dev/null || echo "Not found"
grep -n "createPlatformerScope\|createMinigameScope" apps/client/src/main.ts 2>/dev/null || echo "Not found in main.ts"
```

### Expected

- `container.ts` defines `Container`, `PlatformerScope`, `MinigameScope` interfaces
- `Container` interface has 6 infrastructure services:
  - `clock: IGameClock`, `input: IInputProvider`, `audio: IAudioPlayer`
  - `physics: IPhysicsWorld`, `network: INetworkClient`, `storage: IStorageProvider`
- `Container` has 2 scoped factories:
  - `createPlatformerScope(levelId: string): PlatformerScope`
  - `createMinigameScope(minigameId: string): MinigameScope`
- `PlatformerScope` includes: `levelId: string`, `config: PlatformerConfig`, `playerBody: IBody`, `dispose(): void`
- `MinigameScope` includes: `minigameId: string`, `dispose(): void`
- `main.ts` has a `createContainer()` function that wires ALL services
- No `new ServiceClass()` calls in `modules/` (they receive deps via constructor)
- Container accessed in scenes via `this.registry.get('container')`
- Zero service-locator patterns in `modules/` (no `container.someThing`)
- Zero DI framework imports (Pure DI only — ADR-001)

### Design Decision: Deps Object Pattern

Modules receive dependencies via a **single typed deps object** (not positional constructor params):

```typescript
// Correct — deps object pattern
interface PlayerControllerDeps {
  readonly input: IInputProvider;
  readonly body: IBody;
  readonly clock: IGameClock;
  readonly config: PlatformerConfig;
  readonly stats: CharacterStats;
}
constructor(deps: PlayerControllerDeps) { ... }

// Wrong — positional params
constructor(input: IInputProvider, body: IBody, clock: IGameClock, ...) { ... }
```

Benefits: self-documenting call sites, order-independent, easier to extend, `readonly` prevents mutation.

### Design Decision: PlatformerScope Shape

`PlatformerScope` carries level-specific resources:

- `config: PlatformerConfig` — physics tuning for the level (from Zod schema with defaults)
- `playerBody: IBody` — the physics body for the player (created by `IPhysicsWorld.createBody()`)
- `dispose()` — cleanup when exiting the level

The scope is created by `Container.createPlatformerScope(levelId)` in the scene's `create()` lifecycle. Modules within the scope receive individual deps from it, never the scope object itself.

### Spec Reference

- Foundation §5 (Pure DI — Composition Root Pattern)
- Blueprint §6 (Container — Complete)
- Foundation §16 ADR-001

---

## Gate 9: Port Interfaces & Adapters

Verify the engine abstraction layer is correctly structured.

### Checks

```bash
# 9.1 — Port interface files exist
echo "=== Port files ==="
ls -la apps/client/src/core/ports/ 2>/dev/null

# 9.2 — Port interfaces exported (should be I-prefixed interfaces)
echo "=== Port interface names ==="
grep -rn "export interface I" apps/client/src/core/ports/ --include="*.ts" 2>/dev/null

# 9.3 — Adapter files exist and implement ports
echo "=== Adapter files ==="
ls -la apps/client/src/core/adapters/ 2>/dev/null

# 9.4 — Adapters import from ports (should reference port interfaces)
echo "=== Adapter → port imports ==="
grep -rn "from.*ports/" apps/client/src/core/adapters/ --include="*.ts" 2>/dev/null

# 9.5 — Adapters import Phaser (they SHOULD — they're the bridge)
echo "=== Adapter → Phaser imports ==="
grep -rn "from.*phaser\|import.*Phaser" apps/client/src/core/adapters/ --include="*.ts" 2>/dev/null || echo "No Phaser imports in adapters (may be incomplete)"

# 9.6 — Port coverage: check which ports are defined
echo "=== Expected ports ==="
for port in engine input audio physics network storage; do
  [[ -f "apps/client/src/core/ports/${port}.ts" ]] && echo "✓ ${port}.ts" || echo "✗ MISSING: ${port}.ts"
done

# 9.7 — Verify modules import from ports (not directly from phaser/adapters)
echo "=== Module → port imports ==="
grep -rn "from.*ports/" apps/client/src/modules/ --include="*.ts" 2>/dev/null | grep -v "__tests__" | head -20

# 9.8 — Storage port
grep -rn "IStorageProvider" apps/client/src/core/ports/ 2>/dev/null || echo "IStorageProvider not yet defined"

# 9.9 — Adapter files exist (should be phaser-{domain}.ts)
echo "=== Adapter files ==="
for adapter in phaser-clock phaser-input phaser-physics; do
  [[ -f "apps/client/src/core/adapters/${adapter}.ts" ]] && echo "✓ ${adapter}.ts" || echo "✗ MISSING: ${adapter}.ts"
done

# 9.10 — Adapters reference Phaser namespace (via ambient types)
echo "=== Phaser references in adapters ==="
grep -rn "Phaser\." apps/client/src/core/adapters/ --include="*.ts" 2>/dev/null | head -10

# 9.11 — Mock factory implements port interfaces correctly
echo "=== Mock factory port coverage ==="
grep -n "createMock\|interface Mock" apps/client/src/modules/__test-utils__/mocks.ts 2>/dev/null | head -10
```

### Expected

- **6 port files**: `engine.ts`, `input.ts`, `audio.ts`, `physics.ts`, `network.ts`, `storage.ts`
- Each port exports `I`-prefixed interfaces (see Port Interface Reference below)
- **3 adapter files** (Phase 1): `phaser-clock.ts`, `phaser-input.ts`, `phaser-physics.ts`
- Adapters import from `ports/` and reference `Phaser` namespace (via ambient types from env.d.ts)
- Modules import only from `ports/`, never from `phaser` or `adapters/`
- Mock factory (`__test-utils__/mocks.ts`) provides mock implementations for port interfaces used in tests

### Port Interface Reference (Expanded in Phase 1)

These are the confirmed port interface signatures as of Phase 1:

| Port | Interface | Key Methods/Properties |
|------|-----------|----------------------|
| engine.ts | `IGameClock` | `now`, `delta`, `frame`, `elapsed` (all readonly) |
| engine.ts | `IRendererStats` | `type`, `fps`, `drawCalls` (all readonly) |
| input.ts | `IInputProvider` | `update()`, `isDown(action)`, `justPressed(action)`, `justReleased(action)`, `getAxis(axis)`, `getBinding(action)`, `setBinding(action, code)`, `resetBindings()` |
| input.ts | `ActionKey` | Union type: `'jump' \| 'left' \| 'right' \| 'down' \| 'attack' \| 'interact' \| 'pause' \| 'ability' \| 'menu-*'` |
| physics.ts | `IBody` | `position`, `velocity`, `blocked`, `isOnGround`, `setVelocity(x,y)`, `setVelocityX(x)`, `setVelocityY(y)`, `setAcceleration(x,y)`, `setGravityY(y)`, `setEnable(enabled)`, etc. |
| physics.ts | `IPhysicsWorld` | `createBody(config)`, `removeBody(body)`, `collide(a,b)`, `overlap(a,b)`, `raycast(...)`, `setGravity(x,y)`, `gravity`, `fixedStep`, `fps` |
| physics.ts | `BodyConfig` | `x`, `y`, `width`, `height`, `isStatic?`, `offsetX?`, `offsetY?`, `maxVelocityX?`, `gravityY?`, etc. |
| audio.ts | `IAudioPlayer` | `playSfx(key)`, `playMusic(key)`, `stopMusic()`, `crossfadeMusic()`, volume controls, mute |
| network.ts | `INetworkClient` | `fetchState<T>(endpoint)`, `sendEvent(event)`, `onSync(callback)` |
| storage.ts | `IStorageProvider` | `get<T>(key)`, `set<T>(key, value)`, `remove(key)`, `has(key)`, `keys(prefix?)` |

### Design Decision: `IInputProvider.update()`

The input provider has an explicit `update()` method that must be called once per frame before any game logic reads input state. This is necessary because Phaser's keyboard events fire asynchronously, but game logic needs deterministic frame-edge detection (`justPressed`/`justReleased`). The adapter tracks key state transitions between frames.

### Design Decision: `IBody` as a Full Physics API

`IBody` exposes the complete set of physics operations a game object needs:

- **Read**: `position`, `velocity`, `blocked`, `isOnGround`, `isTouchingWall`, `isTouchingCeiling`
- **Write**: `setVelocity(X/Y)`, `setAcceleration(X)`, `setGravityY()`, `setDrag()`, `setMaxVelocity()`, `setBounce()`, `setSize()`, `setOffset()`, `setEnable()`

This interface is richer than the original Foundation spec because PlayerController needs fine-grained physics control. The adapter (`PhaserBody`) wraps `Phaser.Physics.Arcade.Body`.

### Mock Factory Pattern

`modules/__test-utils__/mocks.ts` provides mock implementations for testing:

- `createMockClock(delta?)` → `IGameClock`
- `createMockInput()` → `MockInput extends IInputProvider` (exposes `_pressed`, `_justPressed`, `_justReleased` sets)
- `createMockBody(options?)` → `MockBody extends IBody` (exposes `_velocity`, `_position`, `_blocked`, `_gravityY`, `_enabled`)
- `createDefaultConfig()` → `PlatformerConfig` (default physics tuning)
- `createDefaultStats()` → `CharacterStats` (default character stats)

**Important mock pattern**: Primitive fields (`_gravityY`, `_enabled`) must use getter/setter pairs referencing the closure state, not spread-copied values. Object fields (`_velocity`, `_position`, `_blocked`) are safe as direct references.

### Spec Reference

- Foundation §6 (Port Interfaces)
- Blueprint §5 (Port Interfaces — Expanded)

---

## Gate 10: Scenes, Navigation, & Phaser Patterns

Verify scenes follow thin-scene discipline and use correct Phaser 4 patterns.

### Checks

```bash
# 10.1 — Scene files
echo "=== Scene files ==="
find apps/client/src/scenes -name "*.ts" | sort

# 10.2 — Scene key registry exists
echo "=== SceneKeys constant ==="
grep -rn "SceneKeys\|SCENE_KEYS\|sceneKeys" apps/client/src/ --include="*.ts" 2>/dev/null | head -10

# 10.3 — Scenes extend Phaser.Scene (correct base class)
echo "=== Scene class declarations ==="
grep -rn "class.*extends.*Scene" apps/client/src/scenes/ --include="*.ts" 2>/dev/null

# 10.4 — Scenes access container correctly
echo "=== Container access in scenes ==="
grep -rn "registry\.\(get\|set\).*container\|this\.container\|get container" apps/client/src/scenes/ --include="*.ts" 2>/dev/null | head -10

# 10.5 — Scene thinness: check for business logic indicators
echo "=== State mutation in scenes (should be ZERO or near-zero) ==="
grep -rn "this\..*=.*this\.\|\.health\s*[+-]=\|\.score\s*[+-]=\|\.velocity\.\|new.*Controller\|new.*Manager\|new.*System" apps/client/src/scenes/ --include="*.ts" 2>/dev/null | grep -v "container\.\|scope\.\|this\.add\.\|this\.make\.\|this\.scene\.\|this\.cameras\.\|this\.input\.\|this\.sound\.\|Phaser\." | head -20

# 10.6 — Check for game logic in update() methods of scenes
echo "=== Scene update() methods ==="
for f in apps/client/src/scenes/*.ts; do
  if grep -q "update(" "$f" 2>/dev/null; then
    echo "--- $f has update() ---"
    # Show what update() does (should be: container.x.update() + sync visuals)
    sed -n '/update(/,/^  }/p' "$f" 2>/dev/null | head -20
  fi
done

# 10.7 — Phaser 4 specific: check for WebGPU references (MUST NOT exist)
echo "=== WebGPU references (should be ZERO) ==="
grep -rni "webgpu" apps/ packages/ --include="*.ts" 2>/dev/null || echo "✓ No WebGPU references"

# 10.8 — Phaser version: check for obvious Phaser 3 patterns
echo "=== Potential Phaser 3 patterns ==="
# this.physics.add.existing — v3 arcade physics pattern
grep -rn "this\.physics\.add\." apps/client/src/ --include="*.ts" 2>/dev/null | head -5
# this.load in create() — v3 lazy-load pattern
grep -rn "this\.load\." apps/client/src/scenes/ --include="*.ts" 2>/dev/null | grep -v "preload\|Preload\|PreloadScene" | head -5
# new Phaser.Game with type: Phaser.WEBGL (v3 constant name)
grep -rn "Phaser\.WEBGL\|Phaser\.CANVAS\b" apps/client/src/ --include="*.ts" 2>/dev/null | head -5

# 10.9 — Check Phaser.Game config
echo "=== Phaser.Game configuration ==="
grep -A 10 "new Phaser.Game\|new Game(" apps/client/src/main.ts 2>/dev/null || echo "Game config not found in main.ts"

# 10.10 — Base scene helper
echo "=== BaseScene ==="
cat apps/client/src/scenes/base-scene.ts 2>/dev/null || echo "base-scene.ts not found"
```

### Expected

- Scene files follow `{name}-scene.ts` naming
- `SceneKeys` constant exists in `modules/navigation/scene-keys.ts` (pure TS, not in scenes/)
- Scenes extend `Phaser.Scene` (or a local `BaseScene`)
- Scene `update()` methods ONLY: call `container.x.update()` and sync visuals
- Zero WebGPU references
- Zero obvious Phaser 3 patterns
- Game config uses `Phaser.AUTO` (not `Phaser.WEBGL` / `Phaser.CANVAS` v3 constants)

### Spec Reference

- Foundation §9 (Platformer Architecture — Scene Lifecycle)
- Blueprint §2 (Scene Graph — Complete)
- Blueprint §9 (Scene Implementation Patterns)
- Telemetry & Enforcement Part I (Phaser Version Enforcement)

---

## Gate 11: Agentic Infrastructure

Verify the tooling that keeps agents on rails.

### Checks

```bash
# 11.1 — CLAUDE.md exists
echo "=== CLAUDE.md ==="
[[ -f "CLAUDE.md" ]] && echo "✓ exists" && wc -l CLAUDE.md || echo "✗ MISSING"

# 11.2 — AGENTS.md exists
echo "=== AGENTS.md ==="
[[ -f "AGENTS.md" ]] && echo "✓ exists" && wc -l AGENTS.md || echo "✗ MISSING"

# 11.3 — .claude directory structure
echo "=== .claude/ structure ==="
find .claude -type f 2>/dev/null | sort || echo ".claude/ directory not found"

# 11.4 — Settings file with hooks
echo "=== .claude/settings.json hooks ==="
cat .claude/settings.json 2>/dev/null | jq '.hooks | keys' 2>/dev/null || echo "No hooks in settings"

# 11.5 — CLAUDE.md references Phaser 4 contract
echo "=== Phaser contract in CLAUDE.md ==="
grep -n "rc.6\|rc6\|4\.0\.0\|docs-first\|PHASER_EVIDENCE\|Phaser 4" CLAUDE.md 2>/dev/null || echo "No Phaser enforcement in CLAUDE.md"

# 11.6 — Investigation-first rules
echo "=== Investigation mandate ==="
grep -ni "investigat\|grep.*before\|evidence.*before\|before.*code" CLAUDE.md AGENTS.md 2>/dev/null | head -10

# 11.7 — PHASER_EVIDENCE.md
echo "=== Phaser evidence file ==="
[[ -f "docs/PHASER_EVIDENCE.md" ]] && echo "✓ exists" && wc -l docs/PHASER_EVIDENCE.md || echo "✗ MISSING"

# 11.8 — Local Phaser docs mirror
echo "=== Phaser docs mirror ==="
[[ -d "docs/vendor/phaser-4.0.0-rc.6" ]] && echo "✓ exists" && find docs/vendor/phaser-4.0.0-rc.6 -type f | wc -l || echo "✗ MISSING (not required yet, but recommended)"

# 11.9 — Skills
echo "=== Skills ==="
find .claude/skills -name "SKILL.md" 2>/dev/null | sort || echo "No skills"

# 11.10 — Commands
echo "=== Commands ==="
find .claude/commands -name "*.md" 2>/dev/null | sort || echo "No commands"

# 11.11 — Hook scripts
echo "=== Hook scripts ==="
find .claude/hooks -name "*.sh" 2>/dev/null | sort || echo "No hook scripts"

# 11.12 — ADRs
echo "=== ADRs ==="
ls docs/adr/*.md 2>/dev/null | sort || echo "No ADRs"
```

### Expected

**Required (🔴 if missing):**

- `CLAUDE.md` at repo root, references Phaser 4 contract and investigation-first rule
- `core/container.ts` and `main.ts` (covered in Gate 8)
- ESLint zones and dep-cruiser (covered in Gate 5)

**Expected (🟡 if missing):**

- `AGENTS.md` at repo root
- `.claude/settings.json` with hooks and permissions
- `docs/PHASER_EVIDENCE.md`
- `docs/adr/template.md`
- At least `/investigate` and `/zone-check` commands

**Optional (🔵 if missing):**

- Local Phaser docs mirror
- Skills beyond `fix-issue`
- Subagent definitions
- Hook scripts (telemetry)

### Spec Reference

- Agentic Setup (entire document)
- Telemetry & Enforcement §3–§7

---

## Gate 12: Cross-Reference — Previous Version Artifacts

Since this project was built partly from a previous version, check for legacy artifacts that don't belong.

### Checks

```bash
# 12.1 — Old project names
echo "=== Old project name references ==="
grep -rni "aether\|project.aether\|@aether" apps/ packages/ --include="*.ts" --include="*.json" --include="*.md" 2>/dev/null | head -10 || echo "✓ No 'aether' references"

# 12.2 — Old package scope
echo "=== Old package scope ==="
grep -rn "@aether/" apps/ packages/ --include="*.ts" --include="*.json" 2>/dev/null | head -10 || echo "✓ No @aether/ imports"

# 12.3 — Stale config files from previous project
echo "=== Potentially stale configs ==="
for f in .babelrc .eslintrc .eslintrc.json .eslintrc.js .prettierrc webpack.config.js jest.config.js jest.config.ts; do
  [[ -f "$f" ]] && echo "⚠ STALE: $f (should not exist in this project)" || true
done

# 12.4 — tsyringe or old DI patterns
echo "=== Old DI framework artifacts ==="
grep -rn "tsyringe\|inversify\|@injectable\|@inject\|@autoInjectable" apps/ packages/ --include="*.ts" 2>/dev/null | head -5 || echo "✓ Clean"

# 12.5 — Old test framework (if not vitest)
echo "=== Old test framework ==="
grep -rn "from.*jest\|describe.*jest\|jest\.fn\|jest\.mock" apps/ packages/ --include="*.ts" 2>/dev/null | head -5 || echo "✓ No jest references"

# 12.6 — Old Phaser version references
echo "=== Phaser version references in code/comments ==="
grep -rn "Phaser 3\|phaser@3\|v3\.\|Phaser\.VERSION.*3" apps/ packages/ --include="*.ts" 2>/dev/null | head -5 || echo "✓ No Phaser 3 version references"

# 12.7 — Any 'beam' naming (retired per foundation)
echo "=== Retired 'beam' naming ==="
grep -rni "beam" apps/ packages/ --include="*.ts" --include="*.json" 2>/dev/null | head -5 || echo "✓ No 'beam' references"

# 12.8 — Check for any TODO/FIXME/HACK comments that reference migration
echo "=== Migration artifacts in comments ==="
grep -rn "TODO.*migrat\|FIXME.*old\|HACK.*legacy\|TODO.*port\|from.*old\|from.*previous" apps/ packages/ --include="*.ts" 2>/dev/null | head -10 || echo "✓ No migration TODOs"

# 12.9 — Check package.json for old scripts
echo "=== Package scripts ==="
jq '.scripts' package.json
echo "--- Expected scripts ---"
for script in dev build typecheck lint lint:zones format format:check deps:check test test:run check pre-commit; do
  jq -r ".scripts[\"$script\"] // \"MISSING\"" package.json | xargs -I{} echo "  $script: {}"
done

# 12.10 — Verify vitest.workspace.ts uses named project format
echo "=== vitest.workspace.ts structure ==="
grep -c "name:" vitest.workspace.ts 2>/dev/null || echo "0 named projects"
grep "include:" vitest.workspace.ts 2>/dev/null || echo "No explicit include patterns"
grep "exclude:" vitest.workspace.ts 2>/dev/null || echo "No explicit exclude patterns"
# Expected: 3 named projects (shared, client, server) with include/exclude patterns
# Must exclude **/dist/** to prevent stale compiled tests from running
```

### Expected

- Zero references to "aether", "@aether/", or "beam"
- Zero references to tsyringe/inversify/jest
- No stale config files from previous toolchains (.babelrc, .prettierrc, webpack, jest)
- All expected scripts present in root `package.json`
- No migration TODOs or legacy comments
- `vitest.workspace.ts` uses named project objects (not simple string array) with `include: ['src/**/*.test.ts']` and `exclude: ['**/dist/**', '**/node_modules/**']` patterns

### Spec Reference

- Foundation (entire project was renamed from Aether)
- Foundation §16 ADR-001 (Pure DI, not tsyringe)

---

## Findings Summary Template

After completing all gates, produce this summary:

```markdown
# Architectural Audit — Findings Summary

**Date:** [date]
**Auditor:** [agent/human]
**Codebase state:** [git SHA or description]

## Scorecard

| Gate | Name | Status | Findings |
|------|------|--------|----------|
| 1 | Repository Structure | ✅/⚠/❌ | [count] |
| 2 | Dependency Versions | ✅/⚠/❌ | [count] |
| 3 | TypeScript Configuration | ✅/⚠/❌ | [count] |
| 4 | Directory Structure & Naming | ✅/⚠/❌ | [count] |
| 5 | Zone Enforcement Tooling | ✅/⚠/❌ | [count] |
| 6 | Zone Violation Scan | ✅/⚠/❌ | [count] |
| 7 | Schema & Type Discipline | ✅/⚠/❌ | [count] |
| 8 | Container & DI | ✅/⚠/❌ | [count] |
| 9 | Port Interfaces & Adapters | ✅/⚠/❌ | [count] |
| 10 | Scenes & Phaser Patterns | ✅/⚠/❌ | [count] |
| 11 | Agentic Infrastructure | ✅/⚠/❌ | [count] |
| 12 | Legacy Artifact Scan | ✅/⚠/❌ | [count] |

## Critical Findings (🔴 fix before any new work)

| # | Gate | Finding | Evidence | Remediation |
|---|------|---------|----------|-------------|
| 1 | | | | |

## Warnings (🟡 fix within current phase)

| # | Gate | Finding | Evidence | Remediation |
|---|------|---------|----------|-------------|
| 1 | | | | |

## Info (🔵 fix opportunistically)

| # | Gate | Finding | Evidence | Remediation |
|---|------|---------|----------|-------------|
| 1 | | | | |

## Remediation Plan (Priority Order)

1. [First critical fix — exact file:line and what to change]
2. [Second critical fix]
3. ...

## Spec Inconsistencies Discovered

[Any contradictions between the spec documents themselves]

## Recommendations

[Observations about project health, patterns to reinforce, areas of concern]
```

---

## Execution Checklist

- [ ] Gate 1: Repository Structure
- [ ] Gate 2: Dependency Versions
- [ ] Gate 3: TypeScript Configuration
- [ ] Gate 4: Directory Structure & Naming
- [ ] Gate 5: Zone Enforcement Tooling
- [ ] Gate 6: Zone Violation Scan (Deep Check)
- [ ] Gate 7: Schema & Type Discipline
- [ ] Gate 8: Container & DI
- [ ] Gate 9: Port Interfaces & Adapters
- [ ] Gate 10: Scenes & Phaser Patterns
- [ ] Gate 11: Agentic Infrastructure
- [ ] Gate 12: Legacy Artifact Scan
- [ ] Findings Summary produced
- [ ] Remediation Plan produced
- [ ] Report saved to `docs/audits/YYYY-MM-DD-architectural-audit.md`
