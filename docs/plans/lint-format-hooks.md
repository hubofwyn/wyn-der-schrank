# Wyn der Schrank — Lint, Format & Git Hooks

**Companion to:** Foundation (architecture), Agentic Setup (agent tooling), Telemetry & Enforcement  
**Date:** February 10, 2026  
**Status:** CANONICAL — Defines tool roles, config, and git hook pipeline  
**Supersedes:** Foundation §15 scripts (updated here), Agentic Setup §3 permissions (extended here)

---

## 1. Tool Roles (No Overlap)

Each tool has exactly one job. When tools overlap, agents get conflicting signals and developers waste time debugging false positives from the wrong enforcer.

| Tool | Role | Scope | Runs When |
|------|------|-------|-----------|
| **ESLint 10** | Semantic + architectural rules | Zone enforcement, restricted imports/globals | `lint`, `lint:zones`, pre-push, CI |
| **Biome 2.3** | Formatting + import sorting | Whitespace, quotes, semicolons, import order | `format`, pre-commit (autofix), pre-push (check), CI |
| **dependency-cruiser** | Structural dependency validation | Forbidden cross-zone imports, circular deps | `deps:check`, pre-push, CI |
| **markdownlint-cli2** | Markdown quality | Heading structure, line length, consistency | `lint:md`, pre-commit (autofix), pre-push (check), CI |
| **TypeScript 5.9** | Type safety | Strict compilation, declaration checking | `typecheck`, pre-push, CI |
| **Vitest 4.0** | Tests | Unit + integration test execution | `test:run`, pre-push, CI |
| **Lefthook** | Git hook orchestration | Coordinates pre-commit + pre-push | Every commit, every push |

**The critical separation:** ESLint handles *what the code means* (zones, restricted APIs). Biome handles *what the code looks like* (indentation, quotes, import order). They never compete for the same concern.

---

## 2. ESLint Configuration

ESLint owns zone defense. It doesn't format, it doesn't sort imports. It enforces architectural boundaries.

### `eslint.config.mjs`

```javascript
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. Base Setup
  {
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: { project: true },
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
  },

  // Test files — use the test tsconfig that includes __tests__ and __test-utils__
  {
    files: [
      'apps/client/src/**/__tests__/**/*.ts',
      'apps/client/src/**/__test-utils__/**/*.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: './apps/client/tsconfig.test.json',
      },
    },
  },

  // 2. ZONE: MODULES — Pure TypeScript. No engine, no browser, no backdoors.
  //    Belt: globals override strips browser APIs from scope entirely.
  //    Suspenders: no-restricted-globals catches anything that leaks through.
  {
    files: ['apps/client/src/modules/**/*.ts'],
    languageOptions: {
      globals: {
        // Node-only globals — browser globals (window, document, etc.)
        // are deliberately excluded so they're flagged as undeclared.
        ...globals.node,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phaser',
              message:
                'ZONE VIOLATION: modules/ must be engine-agnostic. Import from core/ports/ instead.',
            },
          ],
          patterns: [
            {
              group: ['**/scenes/*'],
              message: 'ZONE VIOLATION: modules/ cannot access view layer.',
            },
            {
              group: ['**/adapters/*'],
              message:
                'ZONE VIOLATION: modules/ must use ports/, not concrete adapters.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Phaser', message: 'Global Phaser access is forbidden in modules/.' },
        { name: 'window', message: 'Global window access is forbidden in modules/.' },
        { name: 'document', message: 'Direct DOM access is forbidden in modules/.' },
        {
          name: 'requestAnimationFrame',
          message: 'Use IGameClock from core/ports/ instead.',
        },
      ],
    },
  },

  // 3. ZONE: SCENES — Phaser allowed, but no raw server access.
  {
    files: ['apps/client/src/scenes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/*', 'hono/*'],
              message:
                'ZONE VIOLATION: scenes/ must use NetworkManager from core/, not raw server code.',
            },
          ],
        },
      ],
    },
  },

  // 4. ZONE: CORE — Privileged. The only place where "dirty work" happens.
  {
    files: ['apps/client/src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // 5. ZONE: SHARED — No runtime dependencies except Zod.
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'hono', '**/client/*', '**/server/*'],
              message: 'ZONE VIOLATION: shared/ must have zero app dependencies.',
            },
          ],
        },
      ],
    },
  },
);
```

### Why `project: true` instead of `projectService`

The original plan called for `projectService: true` (typescript-eslint's modern typed-linting path). During implementation, this hit a real incompatibility: `apps/client/tsconfig.json` explicitly excludes `__tests__/` and `__test-utils__/` directories from the build, so `projectService` can't find them. The `allowDefaultProject` escape hatch disallows `**` globs (for performance), making it impractical for deeply nested test files.

`project: true` works correctly with the test override block, which provides an explicit `project` pointer to `tsconfig.test.json` for test files. Migrating to `projectService` would require restructuring the tsconfig graph (e.g., a solution-style root tsconfig) — a worthwhile improvement but outside this migration's scope.

---

## 3. Biome Configuration

Biome handles formatting and import sorting. Its linter is **disabled** to avoid duplicating ESLint's job.

### `biome.json`

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": false
  },
  "assist": {
    "enabled": true
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  },
  "files": {
    "includes": [
      "**",
      "!!**/dist",
      "!!**/build",
      "!!**/coverage",
      "!!.claude/settings*.json"
    ],
    "ignoreUnknown": true
  }
}
```

### Key change: `linter.enabled: false`

The existing config has `linter.enabled: true` with `rules.recommended: true`. This causes Biome to lint alongside ESLint, producing duplicate or conflicting diagnostics. With `enabled: false`, Biome focuses entirely on formatting and import organization — the `format` and `format:check` scripts stop triggering lint errors, and there's a single source of truth for each concern.

The `--linter-enabled=false` CLI flag is the runtime equivalent and can override the config file, but setting it in `biome.json` means every invocation path (scripts, Lefthook, editor integration, agent runs) gets the same behavior without remembering flags.

### Import sorting (via `assist`)

In Biome 2.x, import organization moved from the top-level `organizeImports` key to the `assist` system. `assist.enabled: true` activates all assist actions including import sorting. This replaces any `eslint-plugin-import` sorting rules and runs as part of `biome check --write`. Import *restrictions* (zone violations) remain ESLint's job — Biome only controls *order*.

---

## 4. markdownlint-cli2 Configuration

### Install

```bash
bun add -d markdownlint-cli2
```

### `.markdownlint-cli2.jsonc`

```jsonc
{
  "config": {
    "default": true,
    "MD001": true,
    "MD013": false,
    "MD024": { "siblings_only": true },
    "MD025": false,
    "MD029": { "style": "ordered" },
    "MD033": false,
    "MD036": false,
    "MD040": true,
    "MD060": false
  },
  "ignores": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    ".claude/**",
    "docs/vendor/**",
    "CHANGELOG.md"
  ]
}
```

**Rule rationale:**

Rules are assessed through the lens of *agent readability* — these docs are consumed by agents more than humans.

*Enabled (agents rely on these for structure parsing):*

- **MD001** (heading increment): Agents use heading hierarchy to understand document structure. Skipping levels breaks structure parsing.
- **MD024** (duplicate headings): Allowed between siblings. ADR documents and changelog sections legitimately repeat headings like "Context" and "Decision."
- **MD029** (ordered list style): Enforces sequential numbering (`1. 2. 3.`) rather than all-ones style. Helps agents reference specific steps.
- **MD040** (fenced code language): Language tags tell agents whether a block is a shell command to run, TypeScript to analyze, or plain output to read. Blocks with no specific language use `text`.

*Disabled (publishing concerns, not agent concerns):*

- **MD013** (line length): Agents don't care about line width in prose. Biome handles code line width. Spec documents have long table rows and URLs that would create constant noise.
- **MD025** (single h1): Spec documents with YAML frontmatter titles legitimately have a frontmatter `title:` plus a `# Heading` — not a structural issue for agents.
- **MD033** (inline HTML): ADR templates use custom HTML placeholders. Agent docs use `<details>`/`<summary>`. Maintaining an ever-growing allowlist of elements adds no value.
- **MD036** (emphasis as heading): This project uses bold-as-label for inline emphasis, not as heading substitutes. False positives on summary lines.
- **MD060** (table column style): Compact vs padded tables are parsed identically. Pure cosmetic.

*Ignores:*

- **`.claude/**`**: Agent command files and skill definitions have non-standard markdown format (no top-level heading, emphasis-as-section-label). Linting them would require disabling most rules anyway.
- **`docs/vendor/**`**: Vendored third-party docs are not under project control.

---

## 5. Lefthook Configuration

Lefthook owns all git hooks. No manual `.git/hooks/` copies.

### Install

```bash
bun add -d lefthook
bunx lefthook install
```

### `lefthook.yml`

```yml
# lefthook.yml — Git hook orchestration
# Mirrors CI gates locally. See .github/workflows/ci.yml for the canonical gate list.

pre-commit:
  parallel: true
  commands:
    biome_fix:
      glob: "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}"
      run: >-
        bunx @biomejs/biome check --write
        --no-errors-on-unmatched
        --files-ignore-unknown=true
        --colors=off
        {staged_files}
      stage_fixed: true

    md_fix:
      glob: "**/*.md"
      run: bunx markdownlint-cli2 --config .markdownlint-cli2.jsonc --fix {staged_files}
      stage_fixed: true

pre-push:
  parallel: false
  commands:
    banner:
      run: bash scripts/pre-push-banner.sh
    typecheck:
      run: bun run typecheck
    lint_zones:
      run: bun run lint:zones
    deps_check:
      run: bun run deps:check
    tests:
      run: bun run test:run
    format_check:
      run: bun run format:check
    md_lint:
      run: bun run lint:md
```

### `scripts/pre-push-banner.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "──────────────────────────────────────────────"
echo "  pre-push: running CI simulation locally"
echo "──────────────────────────────────────────────"
```

### Pre-commit behavior

Both commands run in parallel (they touch disjoint file sets). `stage_fixed: true` means Biome and markdownlint fix files and automatically `git add` the corrected versions back to the staging area. The commit lands with clean formatting. This is Lefthook's designed use for `pre-commit` fixers and is Biome's own recommended integration path.

### Pre-push behavior: The 7 Gates

Sequential execution. Any failure aborts the push. This is the local CI mirror — same gates, same order, same commands the CI workflow runs.

| Gate | Script | What It Catches |
|------|--------|-----------------|
| 1. Typecheck | `bun run typecheck` | Type errors, missing imports, strict violations |
| 2. Zone Lint | `bun run lint:zones` | Phaser in modules/, browser globals, cross-zone imports |
| 3. Dep Structure | `bun run deps:check` | Circular deps, forbidden structural dependencies |
| 4. Tests | `bun run test:run` | Failing unit/integration tests |
| 5. Format | `bun run format:check` | Unformatted code, unsorted imports |
| 6. Markdown | `bun run lint:md` | Broken markdown structure, inconsistent headings |

The banner script (Gate 0) prints the header for human readability. It's cosmetic.

---

## 6. Package.json Scripts (Complete)

```jsonc
{
  "name": "wyn-der-schrank",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    // Development
    "dev": "bun run --filter @hub-of-wyn/client dev",
    "build": "bun run --filter '*' build",

    // Type safety
    "typecheck": "tsc --build --force",

    // Linting (ESLint = semantic/architectural)
    "lint": "eslint .",
    "lint:zones": "eslint apps/client/src/modules/ --max-warnings 0 --no-error-on-unmatched-pattern",

    // Formatting (Biome = whitespace/imports only)
    "format": "biome check --write .",
    "format:check": "biome check .",

    // Markdown
    "lint:md": "markdownlint-cli2 --config .markdownlint-cli2.jsonc \"**/*.md\"",
    "lint:md:fix": "markdownlint-cli2 --config .markdownlint-cli2.jsonc --fix \"**/*.md\"",

    // Structural
    "deps:check": "dependency-cruiser apps/ packages/ --config .dependency-cruiser.cjs --output-type err-long",

    // Tests
    "test": "vitest",
    "test:run": "vitest run --passWithNoTests",

    // Composite gates
    "check": "bun run typecheck && bun run lint:zones && bun run deps:check && bun run test:run",

    // Hook management (replaces setup-hooks)
    "hooks:install": "lefthook install"
  }
}
```

### What changed from existing scripts

| Script | Before | After | Why |
|--------|--------|-------|-----|
| `format` | `biome check --write .` | Same command, but `biome.json` now has `linter.enabled: false` | No Biome lint overlap |
| `format:check` | `biome check .` | Same command, same `biome.json` change | Consistent |
| `lint:md` | (did not exist) | `markdownlint-cli2 ...` | New markdown gate |
| `lint:md:fix` | (did not exist) | `markdownlint-cli2 --fix ...` | New markdown autofix |
| `setup-hooks` | `cp scripts/pre-push .git/hooks/...` | **Deleted** — replaced by `hooks:install` | Lefthook manages hooks |
| `pre-push` | `bun run check && bun run format:check` | **Deleted** — Lefthook runs gates directly | No intermediate script needed |
| `hooks:install` | (did not exist) | `lefthook install` | One-time setup after clone |
| `check` | Same | Same | Unchanged — still the fast CI-equivalent composite |

### Note on `biome check` without `--linter-enabled=false`

Because `biome.json` now sets `linter.enabled: false`, the `format` and `format:check` scripts don't need the CLI flag. The config file is the single source of truth. If someone runs `bunx biome check .` directly (outside of scripts), they still get format-only behavior.

---

## 7. Migration Steps

Execute in order. Each step is independently verifiable.

### Step 1: Install new dependencies

```bash
bun add -d lefthook markdownlint-cli2
```

### Step 2: Update `biome.json`

Change `linter.enabled` from `true` to `false`. Add `organizeImports.enabled: true`.

### Step 3: Create `.markdownlint-cli2.jsonc`

Copy the config from §4 above.

### Step 4: Create `lefthook.yml`

Copy from §5 above. Create `scripts/pre-push-banner.sh` and `chmod +x` it.

### Step 5: Update `package.json` scripts

Apply the script changes from §6. Remove `setup-hooks` and `pre-push` entries. Add `hooks:install`, `lint:md`, `lint:md:fix`.

### Step 6: Install Lefthook hooks

```bash
bunx lefthook install
```

This writes Lefthook's shim into `.git/hooks/`. Any manually-copied hooks are replaced.

### Step 7: Remove manual hook infrastructure

```bash
rm -f scripts/pre-push         # Old bash pre-push script
rm -f .git/hooks/pre-push      # Will be recreated by lefthook install
```

Keep `scripts/pre-push-banner.sh` (the cosmetic banner, called by Lefthook).

### Step 8: Update ESLint config

Change `parserOptions: { project: true }` to `parserOptions: { projectService: true }` in the base config block. Keep the test override block's explicit `project` pointer.

### Step 9: Verify

```bash
# Full pipeline
bun run typecheck          # Should pass clean
bun run lint               # Full ESLint (may report non-zone issues — that's fine)
bun run lint:zones         # Zone enforcement (must be 0 warnings)
bun run deps:check         # Dependency structure (must be 0 violations)
bun run test:run           # Tests (must pass)
bun run format:check       # Biome format check (should pass if already formatted)
bun run lint:md            # Markdown lint (may report issues in existing docs — fix with lint:md:fix)

# Composite
bun run check              # All gates at once

# Hooks
git add -A && git commit -m "chore: migrate to lefthook + tighten tool roles"
# → pre-commit fires: Biome fixes formatting, markdownlint fixes markdown
git push
# → pre-push fires: all 7 gates run sequentially
```

---

## 8. `bunfig.toml` (Unchanged — Included for Completeness)

```toml
# wyn-der-schrank – Bun configuration
# https://bun.sh/docs/runtime/bunfig

[install]
# Exact versions by default – prevents accidental drift across workspaces
exact = true

# Text lockfile (readable diffs, reviewable in PRs)
saveTextLockfile = true

# Require new packages to have been published for at least 3 days
# before they can be installed – supply-chain protection
minimumReleaseAge = 259200 # 3 days in seconds

# Types packages and tooling ship frequently; exempt them
minimumReleaseAgeExcludes = [
  "@types/bun",
  "@types/node",
  "typescript",
  "@biomejs/biome",
]

[run]
# Suppress the "$ <command>" echo lines from bun run
silent = true
```

No changes needed. The `exact = true` and `minimumReleaseAge` settings are strong supply-chain hygiene. The `silent = true` keeps script output clean (especially important when hooks chain multiple scripts).

---

## 9. Vitest Workspace (Unchanged — Included for Completeness)

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: 'packages/shared',
      include: ['src/**/*.test.ts'],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
  {
    test: {
      name: 'client',
      root: 'apps/client',
      include: ['src/**/*.test.ts'],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
  {
    test: {
      name: 'server',
      root: 'apps/server',
      include: ['src/**/*.test.ts'],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
]);
```

---

## 10. Updated `.claude/settings.json` Permissions

The agentic setup's permissions allowlist needs the new scripts added.

```jsonc
{
  "permissions": {
    "allow": [
      // ... existing entries unchanged ...

      // New: markdown lint
      "Bash(bun run lint:md)",
      "Bash(bun run lint:md:fix)",
      "Bash(bunx markdownlint-cli2 *)",

      // New: hook management
      "Bash(bun run hooks:install)",
      "Bash(bunx lefthook *)"
    ]
  }
}
```

---

## 11. CI Alignment

The pre-push gates must mirror CI exactly. When adding a CI workflow, use this gate order:

```yaml
# .github/workflows/ci.yml (skeleton — fill in when CI is set up)
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run typecheck       # Gate 1
      - run: bun run lint:zones      # Gate 2
      - run: bun run deps:check      # Gate 3
      - run: bun run test:run        # Gate 4
      - run: bun run format:check    # Gate 5
      - run: bun run lint:md         # Gate 6
```

Same gates, same order, same commands. The pre-push hook is a local preview of what CI will enforce. If pre-push passes, CI will pass. If they diverge, something is wrong.

---

## 12. Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Biome linter disabled | `linter.enabled: false` | ESLint is the sole semantic linter. Biome's recommended rules overlap with ESLint zone rules and typescript-eslint type-checked rules, producing duplicate/conflicting diagnostics. |
| Biome import sorting enabled | `assist.enabled: true` | In Biome 2.x, import sorting moved to the `assist` system. Deterministic import order without an ESLint plugin. Import *restrictions* (zone violations) remain ESLint's job. |
| `project: true` kept (not `projectService`) | `parserOptions: { project: true }` | `projectService` hit a real incompatibility: test files are excluded from `tsconfig.json`, and `allowDefaultProject` disallows `**` globs. Migrating to `projectService` requires restructuring the tsconfig graph — deferred to a separate change. |
| Lefthook over manual `.git/hooks/` | `lefthook.yml` | Cross-platform, declarative, supports `stage_fixed` for pre-commit autofix. Eliminates `setup-hooks` script and manual file copies. |
| markdownlint-cli2 added | Dev dependency + config | Project has substantial markdown (Foundation, Blueprint, ADRs, CLAUDE.md, AGENTS.md). Catching broken headings, inconsistent list styles, and invalid HTML in pre-commit prevents doc rot. |
| Pre-commit = autofix, pre-push = verify | Parallel pre-commit, sequential pre-push | Pre-commit is fast and forgiving (fixes then stages). Pre-push is the gate that mirrors CI. This separation means developers don't wait 30+ seconds on every commit, but nothing unverified gets pushed. |
| `check` excludes format and markdown | `typecheck && lint:zones && deps:check && test:run` | `check` is the "fast CI core" — the expensive, high-signal gates. Format and markdown are fast but less critical, so they run in pre-push but not in the core `check` composite. Agents and developers can run `check` frequently without the format/markdown overhead. |

---

## 13. File Inventory

```text
Root files (config):
├── biome.json                         # Format + import sort (linter disabled)
├── eslint.config.mjs                  # Zone defense + semantic rules
├── .dependency-cruiser.cjs            # Structural dependency validation
├── .markdownlint-cli2.jsonc           # Markdown quality rules
├── lefthook.yml                       # Git hook orchestration
├── tsconfig.base.json                 # Base TypeScript strictness
├── vitest.workspace.ts                # Test workspace config
├── bunfig.toml                        # Bun runtime config
└── package.json                       # Scripts + dependencies

Scripts:
└── scripts/
    └── pre-push-banner.sh             # Cosmetic pre-push header

Removed:
├── scripts/pre-push                   # ✗ Replaced by lefthook.yml
└── (setup-hooks script entry)         # ✗ Replaced by hooks:install
```
