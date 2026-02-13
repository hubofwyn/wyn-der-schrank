---
title: Studio Asset Interface — Shared Contract & Game-Side Preparation
last_updated: 2026-02-12
status: PLAN — decisions resolved, implementation tracked as G6 in active-plan.md
scope: "@wds/shared preparation for studio consumption, missing schemas, publishing"
companion: wyn-der-schrank-studio/plan.md (studio build plan)
---

# Studio Asset Interface

This document defines the shared contract between the game (`wyn-der-schrank`)
and the studio (`wyn-der-schrank-studio`). It is the authoritative reference
for how the two projects cooperate through `@wds/shared` and the asset manifest.

The studio plan (Part VII: @wds/shared Preparation) references this document
as the source of truth for all game-side concerns.

---

## Shared Contract

Both projects agree on the following. If a discrepancy arises, this section
governs — the studio plan defers to it.

### 1. Integration Surface

The **only** integration points between studio and game are:

1. **`@wds/shared` npm package** — schemas and types, consumed by the studio
   as a pinned npm dependency.
2. **`asset-manifest.json`** — the manifest file in the game repo, written by
   the studio's exporter and read by the game's PreloadScene.
3. **Asset files** — binary files (PNG, OGG, JSON) placed in the game repo's
   `apps/client/public/assets/` directory tree.

The studio never imports game-internal code. The game never knows how assets
were generated. The manifest is the handshake.

### 2. Export Paths — What the Studio Can Import

`@wds/shared` publishes these explicit subpath exports:

| Export Path | File | Studio Uses For |
|-------------|------|-----------------|
| `@wds/shared/assets` | `schema/assets.ts` | AssetTypeSchema, AssetEntrySchema, AssetManifestSchema, SpritesheetMetaSchema, AudioMetaSchema, TilemapMetaSchema |
| `@wds/shared/character` | `schema/character.ts` | CharacterIdSchema — validate spriteKey/portraitKey references |
| `@wds/shared/enemy` | `schema/enemy.ts` | EnemyTypeSchema — validate spriteKey references |
| `@wds/shared/collectible` | `schema/collectible.ts` | CollectibleTypeSchema — validate spriteKey/sfxKey references |
| `@wds/shared/level` | `schema/level.ts` | LevelIdSchema, WorldIdSchema — validate tilemapAssetKey/musicKey references |
| `@wds/shared/common` | `schema/common.ts` | Vec2Schema, RectSchema — positioning data |
| `@wds/shared/types` | `types/index.ts` | TypeScript type aliases (z.infer<> re-exports) |

The studio **never** imports:

| Forbidden Export | Why |
|-----------------|-----|
| `@wds/shared` (barrel) | Pulls in all schemas including game internals |
| `@wds/shared/schema/*` (wildcard) | Removed — replaced by explicit subpaths above |
| diagnostics, settings, events, sync, physics-config, player, progression, scoring, minigame | Game-internal runtime concerns |

ESLint `no-restricted-imports` in the studio enforces this boundary.

### 3. Asset Key Convention

Asset keys in the manifest follow a consistent naming pattern:

| Asset Category | Key Pattern | Examples |
|---------------|-------------|----------|
| Player sprites | `player` | `player` |
| Enemy sprites | `enemy-{type}-{state}` | `enemy-skeleton-idle`, `enemy-skeleton-walk` |
| Collectible sprites | `collectible-{type}` | `collectible-coin` |
| Tileset images | `tiles-{name}` | `tiles-dungeon` |
| Tilemap JSON | `map-{worldId}-{number}` | `map-forest-1`, `map-forest-2` |
| Music | `music-{context}` | `music-forest`, `music-boss` |
| SFX | `sfx-{action}` | `sfx-jump`, `sfx-coin-pickup` |
| UI sprites | `ui-{element}` | `ui-health-bar`, `ui-coin-icon` |

Keys are lowercase, hyphen-separated, globally unique within the manifest.
The studio writes keys following this convention; the game references them
in schema fields like `spriteKey`, `sfxKey`, `musicKey`, `tilemapAssetKey`.

### 4. Asset Directory Structure

The studio writes files into the game repo at this structure:

```text
apps/client/public/assets/
├── audio/
│   ├── music/          ← background music (OGG)
│   └── sfx/            ← sound effects (OGG)
├── data/
│   └── asset-manifest.json  ← THE MANIFEST (handshake file)
├── fonts/              ← bitmap fonts
├── sprites/
│   ├── characters/     ← player spritesheets (PNG)
│   ├── effects/        ← particle/effect sprites
│   ├── enemies/        ← enemy spritesheets (PNG)
│   ├── items/          ← collectible spritesheets (PNG)
│   └── ui/             ← UI element sprites
└── tilemaps/
    ├── levels/         ← Tiled JSON level files
    └── tilesets/       ← tileset images (PNG)
```

Asset URLs in the manifest are **relative to `public/`** — e.g.,
`assets/sprites/characters/player.png`, not absolute filesystem paths.

### 5. Manifest Format & Merge Semantics

The manifest is a JSON file validated by `AssetManifestSchema`:

```typescript
{
  version: string,          // semver — current: "0.1.0"
  assets: AssetEntry[],     // sorted by key for deterministic diffs
}
```

**Studio export merge rules:**

1. Read existing `asset-manifest.json`
2. Parse with `AssetManifestSchema` (fail if invalid — don't corrupt)
3. For each new asset: if `key` exists, update in place; if new, append
4. Sort `assets` array by `key` (ascending)
5. Write back with 2-space indent for readable diffs

**Game consumption rules:**

1. PreloadScene loads `asset-manifest.json` via Phaser's JSON loader
2. Parses with `parseManifest()` → `AssetManifestSchema`
3. Queues each entry via `queueAsset()` switch on `type`
4. `frameWidth`/`frameHeight` used for spritesheets
5. Unknown fields (spritesheetMeta, audioMeta, tilemapMeta) are ignored

Meta fields are **additive** — the game doesn't break when they're present
but doesn't use them yet. The studio writes them for its own validation,
and the game can adopt them incrementally.

### 6. Cross-Reference Network

Multiple game schemas reference asset keys by string. The studio must
produce assets whose keys match these references:

| Schema Field | Schema File | References |
|-------------|-------------|------------|
| `CharacterDefinition.spriteKey` | character.ts | Spritesheet manifest key |
| `CharacterDefinition.portraitKey` | character.ts | Image manifest key |
| `CollectibleDefinition.spriteKey` | collectible.ts | Spritesheet manifest key |
| `CollectibleDefinition.sfxKey` | collectible.ts | Audio manifest key |
| `CollectibleDefinition.animationKey` | collectible.ts | Animation key (optional) |
| `EnemyDefinition.spriteKey` | enemy.ts | Spritesheet manifest key |
| `LevelMetadata.tilemapAssetKey` | level.ts | Tilemap manifest key |
| `LevelMetadata.musicKey` | level.ts | Audio manifest key |
| `WorldDefinition.backgroundKey` | level.ts | Image manifest key |
| `WorldDefinition.musicKey` | level.ts | Audio manifest key |

The studio's validator should check that every `spriteKey`, `sfxKey`, etc.
in the game's definitions has a corresponding manifest entry with the
correct asset type.

### 7. AnimationDef — Client Internal, Not Shared

`AnimationDef` is a TypeScript interface in `modules/animation/animation-def.ts`.
It is NOT a Zod schema and is NOT in `@wds/shared`. The studio does not import it.

The studio needs animation frame metadata to produce correct spritesheets.
This is solved by `SpritesheetMetaSchema.animations` — the studio writes
animation metadata into the manifest's `spritesheetMeta` field.

The game's animation config files currently hardcode frame ranges:

```typescript
// modules/player/animation-config.ts — CLIENT INTERNAL
{ key: 'player-idle', startFrame: 0, endFrame: 3, frameRate: 8, repeat: -1 }
{ key: 'player-run',  startFrame: 4, endFrame: 7, frameRate: 10, repeat: -1 }
// ... etc
```

**Future evolution:** If animation definitions migrate from hardcoded config
files to the manifest's `spritesheetMeta.animations` field, the game becomes
data-driven. This is not a prerequisite for studio integration but is a
natural next step. The manifest schema is designed to support this.

### 8. Versioning Protocol

- **@wds/shared version:** Semver. First publish at `1.0.0`.
  - Patch: bug fixes, additive optional fields
  - Minor: new schemas, new export paths
  - Major: breaking changes to existing schemas (should be very rare)
- **Manifest version:** Semver string in `asset-manifest.json`.
  - Bump when manifest structure changes (not on individual asset updates)
- **Studio pins @wds/shared:** Uses exact version in `package.json` via
  `bun add @wds/shared --exact` (the `--exact`/`-E` flag prevents the
  default `^` range and writes the literal version string).
  Updates deliberately via `bun update @wds/shared` followed by
  `wds-studio validate-all` to confirm no regressions.

### 9. Development Workflow — `bun link`

During active development across both repos, `bun link` eliminates the
publish-install cycle. The studio resolves `@wds/shared` to the game's
live source via symlink.

**Setup (one-time per machine):**

```bash
# In the game repo — register @wds/shared as linkable
cd packages/shared
bun link
# → "Success! Registered @wds/shared"

# In the studio repo — symlink to the local copy
cd /path/to/wyn-der-schrank-studio
bun link @wds/shared
# → node_modules/@wds/shared → game's packages/shared/
```

Now schema changes in the game are immediately visible to the studio
without publishing. TypeScript sees the live `.ts` source files.

**Studio package.json during development:**

```jsonc
{
  "dependencies": {
    "@wds/shared": "link:@wds/shared"  // ← bun link sets this
  }
}
```

**Studio package.json for production/CI:**

```jsonc
{
  "dependencies": {
    "@wds/shared": "1.0.0"  // ← pinned npm version
  }
}
```

**Switching between modes:**

```bash
# Switch to linked (dev): symlink to local game repo
bun link @wds/shared

# Switch to published (prod/CI): install from npm
bun unlink
bun add @wds/shared@1.0.0 --exact
```

**When to publish vs link:**

- **Link** when iterating on schemas across both repos simultaneously
- **Publish** when the schema change is finalized and the game repo
  has merged to main. The studio then pins the published version for
  reproducible CI builds.

**Version monitoring:**

```bash
# In the studio repo — check if @wds/shared has a newer published version
bun outdated @wds/shared
```

### 10. Package Management Conventions

Both repos use Bun as the package manager. The following conventions ensure
consistent, reproducible builds across local development and CI.

**Lockfile:**

Both repos commit `bun.lock` to version control. This is required for
`bun ci` (reproducible CI installs). The game repo already commits its
lockfile; the studio must do the same from its first commit.

**CI installs — `bun ci`:**

CI pipelines use `bun ci` (equivalent to `bun install --frozen-lockfile`)
instead of `bun install`. This fails the build if `package.json` disagrees
with the lockfile, preventing accidental dependency drift.

```yaml
# GitHub Actions pattern for both repos
steps:
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun ci
  - run: bun run check
```

**Peer dependencies — Zod:**

`@wds/shared` declares Zod as a `peerDependency` (`"zod": "^4.0.0"`).
Bun auto-installs peer dependencies during `bun install`, so the studio
does not need to manually `bun add zod` — Bun resolves it automatically.
However, if the studio wants to pin a specific Zod version, it can add
Zod explicitly: `bun add zod@4.3.6 --exact`.

**Trusted dependencies — lifecycle scripts:**

Bun does not run postinstall scripts by default. Packages that need them
(e.g., `sharp` in the studio for native binaries) must be listed in
`trustedDependencies` in the consuming repo's `package.json`:

```jsonc
{
  "trustedDependencies": ["sharp"]
}
```

Alternatively, use `bun add sharp --trust` which adds to
`trustedDependencies` and installs in one step.

**Exact version pinning:**

The studio pins `@wds/shared` with `bun add @wds/shared@1.0.0 --exact`
(the `-E` flag). This writes `"1.0.0"` instead of `"^1.0.0"`, preventing
unintended minor/patch upgrades. Updates are deliberate:
`bun update @wds/shared` followed by validation.

**Installation strategy:**

- **Game repo** (workspace): defaults to `isolated` linker (pnpm-style
  strict dependency isolation, prevents phantom dependencies)
- **Studio** (single-package): defaults to `hoisted` linker (traditional
  npm flat node_modules)

Both defaults are correct for their project structures. No `bunfig.toml`
override is needed.

**Publishing gate:**

`@wds/shared` has `prepublishOnly: "bun run typecheck"` which runs
automatically before `bun publish`. This prevents publishing with type
errors. The studio can verify the publish preview with
`bun publish --dry-run` from `packages/shared/`.

---

## Current State

### Package Configuration

`packages/shared/package.json` is currently:

```jsonc
{
  "name": "@wds/shared",
  "version": "0.0.1",
  "private": true,           // ← blocks npm publish
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema/*": "./src/schema/*",    // ← wildcard, no boundary control
    "./types": "./src/types/index.ts"
  },
  "dependencies": {
    "zod": "4.3.6"
  }
}
```

**Issues for publishing:**

1. `"private": true` prevents `bun publish`.
2. No `files` field — publish would include everything (tests, configs).
3. No `publishConfig` — access level unspecified.
4. No `peerDependencies` — Zod is a hard dep instead of peer, risking version
   conflicts if the studio pins a different Zod patch.
5. Wildcard `./schema/*` export gives the studio access to every schema
   including game internals. Must be replaced with explicit subpaths.
6. No `prepublishOnly` script — no gate before publishing.

### Schemas the Studio Needs (Already Exist)

| Schema | File | Used By Studio For |
|--------|------|--------------------|
| `AssetTypeSchema` | `schema/assets.ts` | Validating asset type enum |
| `AssetEntrySchema` | `schema/assets.ts` | Constructing manifest entries |
| `AssetManifestSchema` | `schema/assets.ts` | Reading/writing game manifest |
| `CollectibleTypeSchema` | `schema/collectible.ts` | Matching sfxKey/spriteKey refs |
| `EnemyTypeSchema` | `schema/enemy.ts` | Matching spriteKey refs |
| `CharacterIdSchema` | `schema/character.ts` | Matching spriteKey/portraitKey refs |
| `LevelIdSchema` | `schema/level.ts` | Matching tilemapAssetKey refs |
| `WorldIdSchema` | `schema/level.ts` | Matching backgroundKey/musicKey refs |
| `Vec2Schema` | `schema/common.ts` | Positioning data |

### Schemas the Studio Needs (Missing)

The studio plan (Part VII, Step 3) identifies three missing schemas. Analysis
of the current codebase confirms they do not exist.

#### 1. SpritesheetMetaSchema

`AssetEntrySchema` has `frameWidth` and `frameHeight` but no `frameCount`.
The studio needs frame count to validate `total_width = frameWidth × frameCount`.

Currently, frame counts are hardcoded in client-internal animation config files:

- `player.png`: 7 cols × 4 rows (28 frames, but only 0–8 used)
- `skeleton-idle.png`: 6 frames at 32×32
- `skeleton-walk.png`: 10 frames at 32×32
- `coin.png`: 4 frames at 16×16

**Proposed schema:**

```typescript
export const SpritesheetMetaSchema = z.object({
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  frameCount: z.number().int().positive(),
  columns: z.number().int().positive().optional(),
  animations: z.array(z.object({
    key: z.string(),
    startFrame: z.number().int().min(0),
    endFrame: z.number().int().min(0),
    frameRate: z.number().positive(),
    repeat: z.number().int().min(-1),
  })).optional(),
});
```

Added as optional `spritesheetMeta` field on `AssetEntrySchema`. This lets
the manifest carry full metadata without breaking existing entries.

#### 2. AudioMetaSchema

No audio metadata schema exists. Audio assets are loaded as bare
`{ key, type: 'audio', url }` in the manifest. The studio needs to validate
format, duration, and channel count.

**Proposed schema:**

```typescript
export const AudioMetaSchema = z.object({
  format: z.enum(['ogg', 'mp3', 'wav']),
  durationMs: z.number().positive(),
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().min(1).max(2).optional(),
});
```

Added as optional `audioMeta` field on `AssetEntrySchema`.

#### 3. TilemapMetaSchema

Tilemap assets are `{ key, type: 'tilemapTiledJSON', url }` — no metadata.
The studio's level builder needs to know dimensions, tile size, and layer names.

**Proposed schema:**

```typescript
export const TilemapMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileWidth: z.number().int().positive(),
  tileHeight: z.number().int().positive(),
  layers: z.array(z.string()),
  objectGroups: z.array(z.string()).optional(),
});
```

Added as optional `tilemapMeta` field on `AssetEntrySchema`.

---

## Gap Analysis Summary

| Item | Status | Action |
|------|--------|--------|
| Remove `"private": true` | Missing | Edit package.json |
| Add `files` field | Missing | Edit package.json |
| Add `publishConfig` | Missing | Edit package.json |
| Move Zod to `peerDependencies` | Missing | Edit package.json |
| Add `prepublishOnly` script | Missing | Edit package.json |
| Replace wildcard exports with explicit subpaths | Missing | Edit package.json |
| Create `SpritesheetMetaSchema` | Missing | New fields in schema/assets.ts |
| Create `AudioMetaSchema` | Missing | New fields in schema/assets.ts |
| Create `TilemapMetaSchema` | Missing | New fields in schema/assets.ts |
| Export new types from index.ts and types/index.ts | Missing | Add type re-exports |
| Verify schema self-containment | Needed | Run dep-cruiser on each export path |
| Bump version to `1.0.0` | Needed | Semver for first publish |
| Publish to npm | Needed | `bun publish --access public` |

---

## Proposed AssetEntrySchema Extension

Current:

```typescript
export const AssetEntrySchema = z.object({
  key: z.string(),
  type: AssetTypeSchema,
  url: z.string(),
  frameWidth: z.number().int().positive().optional(),
  frameHeight: z.number().int().positive().optional(),
  atlasUrl: z.string().optional(),
  fontDataUrl: z.string().optional(),
});
```

Proposed:

```typescript
export const SpritesheetMetaSchema = z.object({
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  frameCount: z.number().int().positive(),
  columns: z.number().int().positive().optional(),
  animations: z.array(z.object({
    key: z.string(),
    startFrame: z.number().int().min(0),
    endFrame: z.number().int().min(0),
    frameRate: z.number().positive(),
    repeat: z.number().int().min(-1),
  })).optional(),
});

export const AudioMetaSchema = z.object({
  format: z.enum(['ogg', 'mp3', 'wav']),
  durationMs: z.number().positive(),
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().min(1).max(2).optional(),
});

export const TilemapMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileWidth: z.number().int().positive(),
  tileHeight: z.number().int().positive(),
  layers: z.array(z.string()),
  objectGroups: z.array(z.string()).optional(),
});

export const AssetEntrySchema = z.object({
  key: z.string(),
  type: AssetTypeSchema,
  url: z.string(),
  // Legacy fields preserved — PreloadScene reads these directly
  frameWidth: z.number().int().positive().optional(),
  frameHeight: z.number().int().positive().optional(),
  atlasUrl: z.string().optional(),
  fontDataUrl: z.string().optional(),
  // Optional metadata — studio writes, game ignores for now
  spritesheetMeta: SpritesheetMetaSchema.optional(),
  audioMeta: AudioMetaSchema.optional(),
  tilemapMeta: TilemapMetaSchema.optional(),
});
```

`frameWidth`/`frameHeight` remain as top-level fields because PreloadScene
reads them directly for `this.load.spritesheet()`. The `spritesheetMeta` field
adds `frameCount` and animation data without breaking existing consumers.

---

## Proposed package.json

```jsonc
{
  "name": "@wds/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./assets": "./src/schema/assets.ts",
    "./level": "./src/schema/level.ts",
    "./character": "./src/schema/character.ts",
    "./enemy": "./src/schema/enemy.ts",
    "./collectible": "./src/schema/collectible.ts",
    "./common": "./src/schema/common.ts",
    "./types": "./src/types/index.ts"
  },
  "files": [
    "src/**/*.ts",
    "package.json"
  ],
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "zod": "4.3.6"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "bun run typecheck"
  }
}
```

Key changes from current:

- `private: true` removed
- Version bumped to `1.0.0`
- Wildcard exports replaced with explicit subpath entries
- `files` field limits what gets published
- `publishConfig` sets public access
- Zod moved to `peerDependencies` (kept in `devDependencies` for local dev).
  CLI: `bun add zod --peer` adds to peerDependencies; Bun auto-installs
  peer deps for consumers, so the studio gets Zod without explicit install.
- `prepublishOnly` script gates publication on type checking

---

## Studio Import Map

Concrete import guidance for the studio codebase:

```typescript
// PRIMARY — manifest schema construction and validation
import {
  AssetTypeSchema, AssetEntrySchema, AssetManifestSchema,
  SpritesheetMetaSchema, AudioMetaSchema, TilemapMetaSchema,
} from '@wds/shared/assets';

// REFERENCE VALIDATION — verify asset keys match game definitions
import { CharacterIdSchema } from '@wds/shared/character';
import { EnemyTypeSchema } from '@wds/shared/enemy';
import { CollectibleTypeSchema } from '@wds/shared/collectible';
import { LevelIdSchema, WorldIdSchema } from '@wds/shared/level';

// COMMON — positioning and geometry
import { Vec2Schema, RectSchema } from '@wds/shared/common';

// TYPES — TypeScript type aliases when only types are needed
import type { AssetEntry, AssetManifest, AssetType } from '@wds/shared/types';
```

The studio **NEVER** imports:

```typescript
// FORBIDDEN — game internal schemas
import { ... } from '@wds/shared';                // barrel pulls everything
import { ... } from '@wds/shared/schema/settings'; // game runtime
import { ... } from '@wds/shared/schema/physics-config'; // game runtime
// etc.
```

---

## Future Extensibility

### New Asset Types

When the game adds new asset types (e.g., `'particle'`, `'shader'`,
`'spine-animation'`), the process is:

1. Add the value to `AssetTypeSchema` enum in `schema/assets.ts`
2. If the type needs metadata, create an optional `{type}Meta` schema
3. Add the optional field to `AssetEntrySchema`
4. Export from `index.ts` and `types/index.ts`
5. Publish a patch version of `@wds/shared`
6. Studio runs `bun update @wds/shared` + `wds-studio validate-all`
7. Studio adds a new processor for the asset type if needed

This is always additive — existing manifest entries and studio code are
unaffected.

### Data-Driven Animation

Currently the game hardcodes animation frame ranges in client-internal config
files. The `SpritesheetMetaSchema.animations` field allows the manifest to
carry this data. Migration path:

1. **Phase 1 (current):** Studio writes `animations` to manifest. Game ignores.
2. **Phase 2 (future):** Game reads `animations` from manifest as fallback when
   no hardcoded config exists for a spriteKey.
3. **Phase 3 (future):** Game reads all animation data from manifest. Hardcoded
   configs removed. Animation system becomes fully data-driven.

This is not a prerequisite for studio integration. Each phase is independently
shippable.

### Multi-Resolution Assets

Future: studio produces multiple resolutions (1x, 2x) of each sprite.
The manifest would gain a `variants` field on `AssetEntrySchema`:

```typescript
variants: z.array(z.object({
  scale: z.number().positive(),
  url: z.string(),
})).optional(),
```

The game's asset loader would select the appropriate variant at runtime.
Not needed now, but the additive schema pattern supports it.

---

## Decisions (Resolved)

1. **Publish target:** npm public registry. `@wds/shared` contains schemas
   and inferred types only — no secrets, no proprietary game logic. Public
   access simplifies CI for both repos (no auth tokens, no scoped registry
   config). `publishConfig: { "access": "public" }` is correct.

2. **Version strategy:** Start at `1.0.0`. The schema surface is stable
   after G1–G5 (14 schema files, 40+ inferred types, 164 passing tests).
   Pre-1.0 versioning would signal instability that doesn't exist. Semver
   applies: patch for additive optional fields, minor for new schemas or
   export paths, major for breaking changes (should be rare).

3. **Zod peer dep:** Confirmed. Move Zod to `peerDependencies`. Bun
   auto-installs peer dependencies during `bun install`, so the studio
   gets Zod resolved automatically without explicit `bun add zod`. The
   studio already uses Zod directly for its own schemas, so there is no
   friction. The `^4.0.0` range gives both repos flexibility within Zod 4.

4. **Scope of this branch:** `docs/studio-asset-interface` is documentation
   only — it defines the contract and plan. Implementation goes on a
   separate branch tracked as **G6** in `docs/plans/active-plan.md`. The
   publish itself (`bun publish`) is a manual step after the G6 PR merges.

---

## Implementation Sequence (G6)

### Commit 1: Add meta schemas to assets.ts

- Add `SpritesheetMetaSchema`, `AudioMetaSchema`, `TilemapMetaSchema`
- Add optional `spritesheetMeta`, `audioMeta`, `tilemapMeta` to `AssetEntrySchema`
- Export new schemas from `index.ts`
- Add new types to `types/index.ts`
- Run `bun run check` — existing tests pass (fields are optional)

### Commit 2: Update package.json for publishing

- Remove `private: true`
- Bump version to `1.0.0`
- Add `files`, `publishConfig`, `prepublishOnly`
- Replace wildcard exports with explicit subpaths
- Move Zod to `peerDependencies` via `bun add zod --peer` (keep in
  `devDependencies` for local workspace dev)
- Verify workspace resolution still works: `bun run check`

### Commit 3: Verify export self-containment

- Run `bunx dependency-cruiser packages/shared/src/schema/assets.ts`
  for each export path to confirm no transitive game-internal deps
- Document results in this plan or in a verification log

### Commit 4: Documentation

- Update `AGENTS.md` with publishing workflow notes
- Update `docs/plans/active-plan.md` if a goal is added
- Note in `docs/FOUNDATION.md` section on shared package

Publishing itself (`bun publish`) happens after PR merge, as a manual step.
