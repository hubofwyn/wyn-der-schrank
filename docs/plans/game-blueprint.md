# Wyn der Schrank — Game Domain & Implementation Blueprint

**Companion to:** `docs/FOUNDATION.md` (architecture), `docs/plans/agentic-setup.md` (tooling), `docs/plans/telemetry.md` (enforcement)
**Date:** February 10, 2026
**Status:** CANONICAL — Defines the complete game structure, naming, schemas, and domain model
**Scope:** All screens, systems, assets, levels, and data for the web platformer + minigame game

---

## 1. Game Overview

Wyn der Schrank is a web-based side-scrolling platformer with an integrated minigame subsystem. Players select a character, navigate through themed worlds composed of multiple levels, collect items, defeat enemies, and encounter minigame portals that trigger standalone challenge games. Progression, scores, and unlocks persist across sessions.

### Core Game Loop

```text
┌──────────────────────────────────────────────────────────────────┐
│                         SESSION                                   │
│                                                                   │
│  Title → Menu → Character Select → World Select → Level Select   │
│                                                                   │
│  ┌──────────── LEVEL LOOP ─────────────┐                         │
│  │                                      │                         │
│  │  Platformer Gameplay                 │                         │
│  │    ├─ traverse terrain               │                         │
│  │    ├─ defeat / avoid enemies         │                         │
│  │    ├─ collect items & currency       │                         │
│  │    ├─ discover secrets               │                         │
│  │    └─ reach minigame portal ─────┐   │                         │
│  │                                   │   │                         │
│  │  ┌── Minigame ──┐                │   │                         │
│  │  │  challenge    │◄───────────────┘   │                         │
│  │  │  reward/fail  │                    │                         │
│  │  └──────┬───────┘                    │                         │
│  │         │ return to platform          │                         │
│  │         ▼                             │                         │
│  │  Reach level exit ───▶ Results        │                         │
│  └──────────────────────────────────────┘                         │
│                                                                   │
│  Results → next level / world map / menu                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Scene Graph (Complete)

Every screen the player sees is a Phaser Scene. Scenes are thin view layers — they read domain state and render. All game logic lives in `modules/`.

### Scene Map

```text
BootScene
  │  (load boot assets: logo, loading bar sprites, base font)
  ▼
PreloadScene
  │  (load all assets with progress bar, parse asset manifests)
  ▼
TitleScene ◄─────────────────────────────────────┐
  │  (title + Play / Settings buttons)            │
  │  NOTE: MainMenu deferred — TitleScene serves  │
  │  as entry point for G5. MainMenuScene reserved │
  │  for future character/world/level select flow. │
  ├──▶ SettingsScene ────────────────────────────▶┤
  ▼                                                │
MainMenuScene (DEFERRED) ◄───────────────────────┤
  │  Play / Settings / Leaderboard / Credits      │
  ├──▶ SettingsScene ────────────────────────────▶┤
  ├──▶ LeaderboardScene ─────────────────────────▶┤
  ├──▶ CreditsScene ─────────────────────────────▶┤
  ▼                                                │
CharacterSelectScene                               │
  │  (choose character, preview stats/abilities)   │
  ▼                                                │
WorldSelectScene                                   │
  │  (choose world/biome, shows lock/unlock state) │
  ▼                                                │
LevelSelectScene                                   │
  │  (choose level within world, star ratings)     │
  ▼                                                │
PlatformerScene ◄─────────────────────────┐        │
  │  (gameplay — parallel scenes below)    │        │
  │  ├── HudScene (parallel: health, score,│        │
  │  │   items, timer, minimap)            │        │
  │  └── PauseScene (overlay on pause)     │        │
  │         └── Resume / Settings / Quit ──┼──────▶┤
  │                                        │        │
  ├──▶ MinigameScene ──────────────────────┤        │
  │      (portal triggered, minigame plays)│        │
  │      ├── MinigameHudScene (parallel)   │        │
  │      └── results → return to platformer│        │
  │                                        │        │
  └──▶ LevelCompleteScene ─────────────────┘        │
         (score tally, stars, rewards)              │
         └── Next Level / World Map / Menu ────────▶┘

GameOverScene
  └── Retry / World Map / Menu ────────────────────▶MainMenuScene
```

### Scene Key Registry

Every scene has a unique string key. These keys are the ONLY way scenes reference each other.

```typescript
// This belongs in modules/navigation/scene-keys.ts (pure TS, no Phaser)
export const SceneKeys = {
  BOOT:             'Boot',
  PRELOAD:          'Preload',
  TITLE:            'Title',
  MAIN_MENU:        'MainMenu',
  CHARACTER_SELECT: 'CharacterSelect',
  WORLD_SELECT:     'WorldSelect',
  LEVEL_SELECT:     'LevelSelect',
  SETTINGS:         'Settings',
  CREDITS:          'Credits',
  LEADERBOARD:      'Leaderboard',
  PLATFORMER:       'Platformer',
  HUD:              'Hud',
  PAUSE:            'Pause',
  MINIGAME:         'Minigame',
  MINIGAME_HUD:     'MinigameHud',
  LEVEL_COMPLETE:   'LevelComplete',
  GAME_OVER:        'GameOver',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
```

### Scene Classification

| Scene | Type | Update Loop? | Parallel? | Scoped Container? |
|-------|------|--------------|-----------|--------------------|
| BootScene | System | No | No | None |
| PreloadScene | System | No | No | None |
| TitleScene | Menu | No | No | None |
| MainMenuScene | Menu | No | No | None |
| CharacterSelectScene | Menu | No | No | None |
| WorldSelectScene | Menu | No | No | None |
| LevelSelectScene | Menu | No | No | None |
| SettingsScene | Menu | No | No | None |
| CreditsScene | Menu | No | No | None |
| LeaderboardScene | Menu | No | No | None |
| PlatformerScene | Gameplay | **Yes** | No | `PlatformerScope` |
| HudScene | Overlay | **Yes** | Yes (with Platformer) | Reads PlatformerScope |
| PauseScene | Overlay | No | Yes (over Platformer) | None |
| MinigameScene | Gameplay | **Yes** | No | `MinigameScope` |
| MinigameHudScene | Overlay | **Yes** | Yes (with Minigame) | Reads MinigameScope |
| LevelCompleteScene | Menu | No | No | None |
| GameOverScene | Menu | No | No | None |

---

## 3. Complete File Structure

Expands the foundation document's layout with every file needed.

```text
apps/client/
├── index.html
├── vite.config.ts
├── public/
│   └── assets/                         # ═══ ASSET TREE (§8) ═══
│       ├── sprites/
│       │   ├── characters/
│       │   │   ├── knight.json         # Texture atlas (JSON Hash)
│       │   │   ├── knight.png
│       │   │   ├── mage.json
│       │   │   ├── mage.png
│       │   │   ├── rogue.json
│       │   │   └── rogue.png
│       │   ├── enemies/
│       │   │   ├── slime.json
│       │   │   ├── slime.png
│       │   │   ├── bat.json
│       │   │   └── bat.png
│       │   ├── items/
│       │   │   ├── collectibles.json   # Shared atlas: coins, gems, hearts
│       │   │   └── collectibles.png
│       │   ├── effects/
│       │   │   ├── particles.json
│       │   │   └── particles.png
│       │   └── ui/
│       │       ├── ui-atlas.json       # Buttons, panels, icons
│       │       └── ui-atlas.png
│       ├── tilemaps/
│       │   ├── tilesets/
│       │   │   ├── forest-tiles.png
│       │   │   ├── cave-tiles.png
│       │   │   └── castle-tiles.png
│       │   └── levels/
│       │       ├── forest-1.json       # Tiled JSON export
│       │       ├── forest-2.json
│       │       ├── cave-1.json
│       │       └── ...
│       ├── audio/
│       │   ├── music/
│       │   │   ├── title-theme.ogg
│       │   │   ├── forest-theme.ogg
│       │   │   ├── cave-theme.ogg
│       │   │   ├── boss-theme.ogg
│       │   │   └── minigame-theme.ogg
│       │   └── sfx/
│       │       ├── jump.ogg
│       │       ├── land.ogg
│       │       ├── coin.ogg
│       │       ├── hurt.ogg
│       │       ├── enemy-defeat.ogg
│       │       ├── powerup.ogg
│       │       ├── menu-select.ogg
│       │       ├── menu-confirm.ogg
│       │       ├── level-complete.ogg
│       │       └── game-over.ogg
│       ├── fonts/
│       │   ├── game-font.png           # Bitmap font atlas
│       │   └── game-font.xml           # Bitmap font descriptor
│       └── data/
│           ├── asset-manifest.json     # Master manifest for PreloadScene
│           ├── characters.json         # Character definitions (matches schema)
│           ├── worlds.json             # World/level structure (matches schema)
│           └── enemies.json            # Enemy definitions (matches schema)
│
└── src/
    ├── main.ts                         # COMPOSITION ROOT
    │
    ├── core/                           # ═══ INFRASTRUCTURE ZONE ═══
    │   ├── ports/
    │   │   ├── engine.ts               # IGameClock, IRendererStats
    │   │   ├── input.ts                # IInputProvider
    │   │   ├── audio.ts                # IAudioPlayer
    │   │   ├── physics.ts              # IPhysicsWorld, IBody
    │   │   ├── network.ts              # INetworkClient
    │   │   └── storage.ts              # IStorageProvider (saves, prefs)
    │   ├── adapters/
    │   │   ├── phaser-clock.ts
    │   │   ├── phaser-input.ts
    │   │   ├── phaser-audio.ts
    │   │   ├── phaser-physics.ts
    │   │   └── local-storage-adapter.ts
    │   ├── container.ts                # Container interface + scope interfaces
    │   └── services/
    │       ├── network-manager.ts      # Hono RPC typed client
    │       ├── asset-loader.ts         # Manifest-driven loading
    │       └── scene-coordinator.ts    # Scene transition orchestration
    │
    ├── modules/                        # ═══ DOMAIN ZONE ═══ (Pure TS)
    │   ├── __test-utils__/
    │   │   └── mocks.ts               # Mock factories for all ports
    │   │
    │   ├── navigation/                 # Screen flow & scene coordination logic
    │   │   ├── scene-keys.ts           # SceneKeys const + SceneKey type
    │   │   ├── flow-controller.ts      # Scene transition state machine
    │   │   └── __tests__/
    │   │
    │   ├── character/                  # Character definitions & selection
    │   │   ├── character-catalog.ts    # Loads & queries character defs
    │   │   ├── character-stats.ts      # Stat calculations, level scaling
    │   │   └── __tests__/
    │   │
    │   ├── player/                     # Player runtime state & control
    │   │   ├── player-controller.ts    # Input → physics intent
    │   │   ├── player-state.ts         # Health, score, inventory, abilities
    │   │   ├── player-abilities.ts     # Character-specific ability dispatch
    │   │   └── __tests__/
    │   │
    │   ├── physics/                    # Platformer physics & collision
    │   │   ├── platformer-physics.ts   # Gravity, ground, wall, ceiling
    │   │   ├── collision-system.ts     # Overlap resolution, trigger zones
    │   │   └── __tests__/
    │   │
    │   ├── enemy/                      # Enemy types & AI
    │   │   ├── enemy-catalog.ts        # Loads enemy definitions
    │   │   ├── enemy-ai.ts            # Behavior tree / state machine
    │   │   ├── enemy-spawner.ts        # Spawn logic from level data
    │   │   ├── behaviors/
    │   │   │   ├── patrol.ts
    │   │   │   ├── chase.ts
    │   │   │   ├── fly.ts
    │   │   │   └── boss.ts
    │   │   └── __tests__/
    │   │
    │   ├── level/                      # Level data & world structure
    │   │   ├── level-data.ts           # Level metadata, tile data, object layer
    │   │   ├── level-loader.ts         # JSON → domain model
    │   │   ├── world-catalog.ts        # World/level manifest, lock/unlock
    │   │   ├── tile-registry.ts        # Tile type → collision/behavior
    │   │   └── __tests__/
    │   │
    │   ├── camera/                     # Camera control
    │   │   ├── camera-controller.ts    # Follow, bounds, lookahead, shake
    │   │   └── __tests__/
    │   │
    │   ├── collectible/                # Items, currency, powerups
    │   │   ├── collectible-system.ts   # Pickup logic, inventory updates
    │   │   ├── collectible-catalog.ts  # Item definitions
    │   │   └── __tests__/
    │   │
    │   ├── minigame/                   # Minigame subsystem
    │   │   ├── minigame-manager.ts     # Lifecycle: enter, play, exit
    │   │   ├── minigame-registry.ts    # Registry + Factory
    │   │   ├── minigame-logic.ts       # MinigameLogic interface
    │   │   ├── games/
    │   │   │   ├── dice-duel/
    │   │   │   │   ├── logic.ts
    │   │   │   │   └── __tests__/
    │   │   │   ├── coin-catch/
    │   │   │   │   ├── logic.ts
    │   │   │   │   └── __tests__/
    │   │   │   └── memory-match/
    │   │   │       ├── logic.ts
    │   │   │       └── __tests__/
    │   │   └── __tests__/
    │   │
    │   ├── scoring/                    # Points, combos, level rating
    │   │   ├── score-calculator.ts     # Combo multiplier, time bonus
    │   │   ├── star-rating.ts          # Level star thresholds
    │   │   └── __tests__/
    │   │
    │   ├── progression/                # Save, unlock, session persistence
    │   │   ├── profile-manager.ts      # Load/save player profile
    │   │   ├── unlock-tracker.ts       # World/level/character unlocks
    │   │   ├── session-state.ts        # Current session (char, world, level)
    │   │   └── __tests__/
    │   │
    │   ├── settings/                   # User preferences (pure logic)
    │   │   ├── settings-manager.ts     # Audio vol, controls, display prefs
    │   │   └── __tests__/
    │   │
    │   └── game-state/                 # Top-level state machine
    │       ├── game-state-machine.ts   # Global game phase FSM
    │       ├── sync-manager.ts         # Client-server state sync
    │       └── __tests__/
    │
    └── scenes/                         # ═══ VIEW ZONE ═══ (Phaser)
        ├── base-scene.ts               # Shared scene utilities (container access)
        ├── boot-scene.ts
        ├── preload-scene.ts
        ├── title-scene.ts
        ├── main-menu-scene.ts
        ├── character-select-scene.ts
        ├── world-select-scene.ts
        ├── level-select-scene.ts
        ├── settings-scene.ts
        ├── credits-scene.ts
        ├── leaderboard-scene.ts
        ├── platformer-scene.ts
        ├── hud-scene.ts
        ├── pause-scene.ts
        ├── minigame-scene.ts
        ├── minigame-hud-scene.ts
        ├── level-complete-scene.ts
        └── game-over-scene.ts
```

---

## 4. Zod Schema Catalog (Complete)

All schemas live in `packages/shared/src/schema/`. All types in `packages/shared/src/types/index.ts` are `z.infer<>` re-exports.

### Schema File Organization

```text
packages/shared/src/
├── schema/
│   ├── common.ts           # Vec2, Rect, primitives
│   ├── character.ts        # Character definitions & stats
│   ├── player.ts           # Player runtime state
│   ├── enemy.ts            # Enemy definitions & runtime
│   ├── level.ts            # Level metadata, world structure
│   ├── collectible.ts      # Item definitions, inventory
│   ├── minigame.ts         # Minigame IDs, state, results
│   ├── progression.ts      # Save data, unlocks, profile
│   ├── settings.ts         # User preferences
│   ├── scoring.ts          # Score, stars, leaderboard
│   ├── events.ts           # Game event discriminated union
│   ├── sync.ts             # Client-server sync payloads
│   └── assets.ts           # Asset manifest structure
└── types/
    └── index.ts            # z.infer<> re-exports ONLY
```

### `schema/common.ts`

```typescript
import { z } from 'zod';

export const Vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const RangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

// Reusable ID patterns
export const EntityIdSchema = z.string().min(1).max(64);
```

### `schema/character.ts`

```typescript
import { z } from 'zod';

export const CharacterIdSchema = z.enum([
  'knight',
  'mage',
  'rogue',
]);

export const CharacterStatsSchema = z.object({
  maxHealth: z.number().int().min(1).max(200),
  speed: z.number().positive(),           // Base horizontal speed
  jumpForce: z.number().positive(),       // Base jump impulse
  attackPower: z.number().int().min(0),
  defense: z.number().int().min(0),
});

export const CharacterAbilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cooldownMs: z.number().int().min(0),
});

export const CharacterDefinitionSchema = z.object({
  id: CharacterIdSchema,
  name: z.string(),
  description: z.string(),
  stats: CharacterStatsSchema,
  ability: CharacterAbilitySchema,
  spriteKey: z.string(),                  // Key into asset manifest
  portraitKey: z.string(),                // Character select portrait
  unlocked: z.boolean(),                  // Default unlock state
  unlockCondition: z.string().optional(), // Human-readable condition
});
```

### `schema/player.ts`

```typescript
import { z } from 'zod';
import { Vec2Schema, EntityIdSchema } from './common';
import { CharacterIdSchema } from './character';

export const FacingSchema = z.enum(['left', 'right']);

export const PlayerStateSchema = z.enum([
  'idle',
  'running',
  'jumping',
  'falling',
  'attacking',
  'hurt',
  'dead',
]);

export const PlayerSchema = z.object({
  id: EntityIdSchema,
  characterId: CharacterIdSchema,
  position: Vec2Schema,
  velocity: Vec2Schema,
  facing: FacingSchema,
  state: PlayerStateSchema,
  health: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  score: z.number().int().min(0),
  coins: z.number().int().min(0),
  lives: z.number().int().min(0),
  abilityCooldownRemaining: z.number().min(0),
  invincibleUntil: z.number().min(0),     // Timestamp, 0 = not invincible
  isOnGround: z.boolean(),
});
```

### `schema/enemy.ts`

```typescript
import { z } from 'zod';
import { Vec2Schema, EntityIdSchema, RangeSchema } from './common';

export const EnemyTypeSchema = z.enum([
  'slime',
  'bat',
  'skeleton',
  'spider',
  'boss-golem',
]);

export const EnemyBehaviorSchema = z.enum([
  'patrol',
  'chase',
  'fly',
  'boss',
  'stationary',
]);

export const EnemyDefinitionSchema = z.object({
  type: EnemyTypeSchema,
  name: z.string(),
  health: z.number().int().min(1),
  damage: z.number().int().min(0),
  speed: z.number().min(0),
  behavior: EnemyBehaviorSchema,
  detectionRange: z.number().positive().optional(),
  spriteKey: z.string(),
  loot: z.array(z.object({
    itemId: z.string(),
    chance: z.number().min(0).max(1),
  })).default([]),
});

export const EnemyInstanceSchema = z.object({
  id: EntityIdSchema,
  type: EnemyTypeSchema,
  position: Vec2Schema,
  velocity: Vec2Schema,
  health: z.number().int().min(0),
  facing: z.enum(['left', 'right']),
  currentBehavior: EnemyBehaviorSchema,
  isAlive: z.boolean(),
});
```

### `schema/level.ts`

```typescript
import { z } from 'zod';
import { Vec2Schema, RectSchema, EntityIdSchema } from './common';

export const WorldIdSchema = z.enum([
  'forest',
  'cave',
  'castle',
]);

export const LevelIdSchema = z.string().regex(/^[a-z]+-\d+$/);  // e.g. "forest-1"

export const TileLayerRefSchema = z.object({
  name: z.string(),
  tilemapKey: z.string(),       // Key into loaded Tiled JSON
  tilesetKey: z.string(),       // Key into loaded tileset image
  collides: z.boolean(),
});

export const ObjectPlacementSchema = z.object({
  type: z.enum(['enemy', 'collectible', 'portal', 'checkpoint', 'spawn', 'exit']),
  id: z.string(),
  position: Vec2Schema,
  properties: z.record(z.unknown()).default({}),
});

export const LevelMetadataSchema = z.object({
  id: LevelIdSchema,
  worldId: WorldIdSchema,
  name: z.string(),
  order: z.number().int().min(0),         // Sort order within world
  tilemapAssetKey: z.string(),            // Phaser key for Tiled JSON
  tileLayers: z.array(TileLayerRefSchema),
  objects: z.array(ObjectPlacementSchema),
  bounds: RectSchema,
  playerSpawn: Vec2Schema,
  musicKey: z.string(),
  parTime: z.number().int().positive(),   // Target time in seconds
  starThresholds: z.object({
    one: z.number().int().min(0),
    two: z.number().int().min(0),
    three: z.number().int().min(0),
  }),
});

export const WorldDefinitionSchema = z.object({
  id: WorldIdSchema,
  name: z.string(),
  description: z.string(),
  order: z.number().int().min(0),
  levels: z.array(LevelIdSchema),
  unlockCondition: z.object({
    type: z.enum(['stars', 'world-complete', 'none']),
    worldId: WorldIdSchema.optional(),
    starsRequired: z.number().int().min(0).optional(),
  }),
  backgroundKey: z.string(),
  musicKey: z.string(),
});
```

### `schema/collectible.ts`

```typescript
import { z } from 'zod';
import { EntityIdSchema, Vec2Schema } from './common';

export const CollectibleTypeSchema = z.enum([
  'coin',
  'gem',
  'heart',
  'extra-life',
  'speed-boost',
  'shield',
  'key',
  'minigame-portal',
]);

export const CollectibleDefinitionSchema = z.object({
  type: CollectibleTypeSchema,
  name: z.string(),
  spriteKey: z.string(),
  animationKey: z.string().optional(),
  value: z.number().int().min(0).default(0),    // Score/currency value
  effectDurationMs: z.number().int().min(0).optional(),
  sfxKey: z.string().default('coin'),
});

export const CollectibleInstanceSchema = z.object({
  id: EntityIdSchema,
  type: CollectibleTypeSchema,
  position: Vec2Schema,
  collected: z.boolean(),
});
```

### `schema/minigame.ts`

```typescript
import { z } from 'zod';

export const MinigameIdSchema = z.enum([
  'dice-duel',
  'coin-catch',
  'memory-match',
]);

export const MinigamePhaseSchema = z.enum([
  'intro',        // Rules/countdown
  'active',       // Playing
  'finished',     // Results showing
]);

export const MinigameStateSchema = z.object({
  id: MinigameIdSchema,
  phase: MinigamePhaseSchema,
  participants: z.array(z.string()),
  timeRemainingMs: z.number().min(0),
  data: z.record(z.unknown()),
});

export const MinigameResultSchema = z.object({
  minigameId: MinigameIdSchema,
  playerId: z.string(),
  score: z.number().int().min(0),
  won: z.boolean(),
  reward: z.object({
    coins: z.number().int().min(0).default(0),
    scoreBonus: z.number().int().min(0).default(0),
    itemId: z.string().optional(),
  }),
});

export const MinigameDefinitionSchema = z.object({
  id: MinigameIdSchema,
  name: z.string(),
  description: z.string(),
  durationMs: z.number().int().positive(),
  musicKey: z.string(),
  instructionText: z.string(),
});
```

### `schema/scoring.ts`

```typescript
import { z } from 'zod';
import { LevelIdSchema } from './level';

export const StarRatingSchema = z.number().int().min(0).max(3);

export const LevelResultSchema = z.object({
  levelId: LevelIdSchema,
  score: z.number().int().min(0),
  time: z.number().int().min(0),          // Seconds
  coins: z.number().int().min(0),
  enemiesDefeated: z.number().int().min(0),
  secretsFound: z.number().int().min(0),
  stars: StarRatingSchema,
  completedAt: z.number(),                // Timestamp
});

export const LeaderboardEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  levelId: LevelIdSchema,
  score: z.number().int().min(0),
  stars: StarRatingSchema,
  timestamp: z.number(),
});
```

### `schema/progression.ts`

```typescript
import { z } from 'zod';
import { CharacterIdSchema } from './character';
import { WorldIdSchema, LevelIdSchema } from './level';
import { StarRatingSchema, LevelResultSchema } from './scoring';

export const PlayerProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(20),
  createdAt: z.number(),
  lastPlayedAt: z.number(),

  // Unlocks
  unlockedCharacters: z.array(CharacterIdSchema),
  unlockedWorlds: z.array(WorldIdSchema),
  unlockedLevels: z.array(LevelIdSchema),

  // Progress
  totalCoins: z.number().int().min(0),
  totalScore: z.number().int().min(0),
  levelResults: z.record(LevelIdSchema, LevelResultSchema).default({}),
  totalStars: z.number().int().min(0),

  // Current session bookmark
  lastCharacterId: CharacterIdSchema.optional(),
  lastWorldId: WorldIdSchema.optional(),
  lastLevelId: LevelIdSchema.optional(),
});

export const SessionStateSchema = z.object({
  profileId: z.string(),
  characterId: CharacterIdSchema,
  worldId: WorldIdSchema,
  levelId: LevelIdSchema,
  lives: z.number().int().min(0),
  checkpointPosition: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});
```

### `schema/settings.ts`

```typescript
import { z } from 'zod';

export const SettingsSchema = z.object({
  audio: z.object({
    masterVolume: z.number().min(0).max(1).default(0.8),
    musicVolume: z.number().min(0).max(1).default(0.7),
    sfxVolume: z.number().min(0).max(1).default(1.0),
    muted: z.boolean().default(false),
  }),
  display: z.object({
    showFps: z.boolean().default(false),
    showMinimap: z.boolean().default(true),
    screenShake: z.boolean().default(true),
    particleQuality: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
  controls: z.object({
    // Rebindable keys stored as KeyboardEvent.code values
    jump: z.string().default('Space'),
    left: z.string().default('KeyA'),
    right: z.string().default('KeyD'),
    attack: z.string().default('KeyJ'),
    interact: z.string().default('KeyE'),
    pause: z.string().default('Escape'),
    ability: z.string().default('KeyK'),
  }),
  accessibility: z.object({
    highContrast: z.boolean().default(false),
    largeText: z.boolean().default(false),
  }),
});
```

### `schema/events.ts`

```typescript
import { z } from 'zod';
import { Vec2Schema, EntityIdSchema } from './common';
import { CollectibleTypeSchema } from './collectible';
import { MinigameIdSchema } from './minigame';
import { LevelIdSchema } from './level';

// Discriminated union of all game events (client → server)
const BaseEventSchema = z.object({
  timestamp: z.number(),
  playerId: z.string(),
});

export const GameEventSchema = z.discriminatedUnion('type', [
  BaseEventSchema.extend({
    type: z.literal('player:moved'),
    position: Vec2Schema,
    velocity: Vec2Schema,
  }),
  BaseEventSchema.extend({
    type: z.literal('player:jumped'),
  }),
  BaseEventSchema.extend({
    type: z.literal('player:attacked'),
    direction: z.enum(['left', 'right']),
  }),
  BaseEventSchema.extend({
    type: z.literal('player:hurt'),
    damage: z.number().int().min(1),
    sourceId: EntityIdSchema,
  }),
  BaseEventSchema.extend({
    type: z.literal('player:died'),
  }),
  BaseEventSchema.extend({
    type: z.literal('collectible:picked-up'),
    collectibleId: EntityIdSchema,
    collectibleType: CollectibleTypeSchema,
  }),
  BaseEventSchema.extend({
    type: z.literal('enemy:defeated'),
    enemyId: EntityIdSchema,
  }),
  BaseEventSchema.extend({
    type: z.literal('minigame:entered'),
    minigameId: MinigameIdSchema,
  }),
  BaseEventSchema.extend({
    type: z.literal('minigame:completed'),
    minigameId: MinigameIdSchema,
    score: z.number().int().min(0),
    won: z.boolean(),
  }),
  BaseEventSchema.extend({
    type: z.literal('level:checkpoint'),
    position: Vec2Schema,
  }),
  BaseEventSchema.extend({
    type: z.literal('level:completed'),
    levelId: LevelIdSchema,
    score: z.number().int().min(0),
    time: z.number().int().min(0),
  }),
]);

export const GameEventTypeSchema = GameEventSchema.options.map(
  (o) => o.shape.type
);
```

### `schema/sync.ts`

```typescript
import { z } from 'zod';
import { PlayerSchema } from './player';
import { EnemyInstanceSchema } from './enemy';
import { CollectibleInstanceSchema } from './collectible';

export const SyncStateSchema = z.object({
  tick: z.number().int(),
  timestamp: z.number(),
  players: z.array(PlayerSchema),
  enemies: z.array(EnemyInstanceSchema),
  collectibles: z.array(CollectibleInstanceSchema),
});
```

### `schema/assets.ts`

```typescript
import { z } from 'zod';

export const AssetTypeSchema = z.enum([
  'image',
  'spritesheet',
  'atlas',
  'tilemapTiledJSON',
  'audio',
  'bitmapFont',
  'json',
]);

export const AssetEntrySchema = z.object({
  key: z.string(),
  type: AssetTypeSchema,
  url: z.string(),
  // Type-specific options
  frameWidth: z.number().int().positive().optional(),
  frameHeight: z.number().int().positive().optional(),
  atlasUrl: z.string().optional(),
  fontDataUrl: z.string().optional(),
});

export const AssetManifestSchema = z.object({
  version: z.string(),
  assets: z.array(AssetEntrySchema),
});
```

### `types/index.ts` (Complete Re-exports)

```typescript
import { z } from 'zod';
import * as common from '../schema/common';
import * as character from '../schema/character';
import * as player from '../schema/player';
import * as enemy from '../schema/enemy';
import * as level from '../schema/level';
import * as collectible from '../schema/collectible';
import * as minigame from '../schema/minigame';
import * as scoring from '../schema/scoring';
import * as progression from '../schema/progression';
import * as settings from '../schema/settings';
import * as events from '../schema/events';
import * as sync from '../schema/sync';
import * as assets from '../schema/assets';

// Common
export type Vec2 = z.infer<typeof common.Vec2Schema>;
export type Rect = z.infer<typeof common.RectSchema>;
export type Range = z.infer<typeof common.RangeSchema>;
export type EntityId = z.infer<typeof common.EntityIdSchema>;

// Character
export type CharacterId = z.infer<typeof character.CharacterIdSchema>;
export type CharacterStats = z.infer<typeof character.CharacterStatsSchema>;
export type CharacterAbility = z.infer<typeof character.CharacterAbilitySchema>;
export type CharacterDefinition = z.infer<typeof character.CharacterDefinitionSchema>;

// Player
export type Facing = z.infer<typeof player.FacingSchema>;
export type PlayerState = z.infer<typeof player.PlayerStateSchema>;
export type Player = z.infer<typeof player.PlayerSchema>;

// Enemy
export type EnemyType = z.infer<typeof enemy.EnemyTypeSchema>;
export type EnemyBehavior = z.infer<typeof enemy.EnemyBehaviorSchema>;
export type EnemyDefinition = z.infer<typeof enemy.EnemyDefinitionSchema>;
export type EnemyInstance = z.infer<typeof enemy.EnemyInstanceSchema>;

// Level
export type WorldId = z.infer<typeof level.WorldIdSchema>;
export type LevelId = z.infer<typeof level.LevelIdSchema>;
export type TileLayerRef = z.infer<typeof level.TileLayerRefSchema>;
export type ObjectPlacement = z.infer<typeof level.ObjectPlacementSchema>;
export type LevelMetadata = z.infer<typeof level.LevelMetadataSchema>;
export type WorldDefinition = z.infer<typeof level.WorldDefinitionSchema>;

// Collectible
export type CollectibleType = z.infer<typeof collectible.CollectibleTypeSchema>;
export type CollectibleDefinition = z.infer<typeof collectible.CollectibleDefinitionSchema>;
export type CollectibleInstance = z.infer<typeof collectible.CollectibleInstanceSchema>;

// Minigame
export type MinigameId = z.infer<typeof minigame.MinigameIdSchema>;
export type MinigamePhase = z.infer<typeof minigame.MinigamePhaseSchema>;
export type MinigameState = z.infer<typeof minigame.MinigameStateSchema>;
export type MinigameResult = z.infer<typeof minigame.MinigameResultSchema>;
export type MinigameDefinition = z.infer<typeof minigame.MinigameDefinitionSchema>;

// Scoring
export type StarRating = z.infer<typeof scoring.StarRatingSchema>;
export type LevelResult = z.infer<typeof scoring.LevelResultSchema>;
export type LeaderboardEntry = z.infer<typeof scoring.LeaderboardEntrySchema>;

// Progression
export type PlayerProfile = z.infer<typeof progression.PlayerProfileSchema>;
export type SessionState = z.infer<typeof progression.SessionStateSchema>;

// Settings
export type Settings = z.infer<typeof settings.SettingsSchema>;

// Events
export type GameEvent = z.infer<typeof events.GameEventSchema>;

// Sync
export type SyncState = z.infer<typeof sync.SyncStateSchema>;

// Assets
export type AssetType = z.infer<typeof assets.AssetTypeSchema>;
export type AssetEntry = z.infer<typeof assets.AssetEntrySchema>;
export type AssetManifest = z.infer<typeof assets.AssetManifestSchema>;
```

---

## 5. Port Interfaces (Expanded)

The foundation defined five ports. The complete game adds one more: `IStorageProvider`.

### `core/ports/storage.ts` (New)

```typescript
/**
 * Persistence abstraction for saves, profiles, and settings.
 * modules/ uses this — never touches localStorage/IndexedDB directly.
 */
export interface IStorageProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(prefix?: string): Promise<string[]>;
}
```

### Expanded Port: `core/ports/input.ts`

```typescript
// Extended for menu navigation and rebindable controls
export type ActionKey =
  | 'jump' | 'left' | 'right' | 'attack' | 'interact' | 'pause'
  | 'ability'
  | 'menu-up' | 'menu-down' | 'menu-left' | 'menu-right'
  | 'menu-confirm' | 'menu-back';

export interface IInputProvider {
  isDown(action: ActionKey): boolean;
  justPressed(action: ActionKey): boolean;
  justReleased(action: ActionKey): boolean;
  getAxis(axis: 'horizontal' | 'vertical'): number;

  readonly isTouchActive: boolean;
  readonly isGamepadConnected: boolean;

  // Rebinding support
  getBinding(action: ActionKey): string;            // Returns KeyboardEvent.code
  setBinding(action: ActionKey, code: string): void;
  resetBindings(): void;
}
```

### Expanded Port: `core/ports/audio.ts`

```typescript
export interface IAudioPlayer {
  playSfx(key: string, config?: { volume?: number; rate?: number }): void;
  playMusic(key: string, config?: { loop?: boolean; volume?: number; fadeInMs?: number }): void;
  stopMusic(fadeOutMs?: number): void;
  crossfadeMusic(toKey: string, durationMs?: number): void;
  pauseMusic(): void;
  resumeMusic(): void;
  setMasterVolume(volume: number): void;
  setMusicVolume(volume: number): void;
  setSfxVolume(volume: number): void;
  mute(): void;
  unmute(): void;
  readonly isMuted: boolean;
  readonly currentMusicKey: string | null;
  unlockAudioContext(): void;  // Called on first user interaction
}
```

---

## 6. Container (Complete)

The full container with all services, scoped factories, and the new `IStorageProvider` port.

### `core/container.ts`

```typescript
import type { IGameClock, IRendererStats } from './ports/engine';
import type { IInputProvider } from './ports/input';
import type { IAudioPlayer } from './ports/audio';
import type { IPhysicsWorld } from './ports/physics';
import type { INetworkClient } from './ports/network';
import type { IStorageProvider } from './ports/storage';

// Domain module types (imported by type only — no circular deps)
import type { FlowController } from '../modules/navigation/flow-controller';
import type { CharacterCatalog } from '../modules/character/character-catalog';
import type { PlayerController } from '../modules/player/player-controller';
import type { PlayerAbilities } from '../modules/player/player-abilities';
import type { PlatformerPhysics } from '../modules/physics/platformer-physics';
import type { CollisionSystem } from '../modules/physics/collision-system';
import type { EnemyCatalog } from '../modules/enemy/enemy-catalog';
import type { EnemyAI } from '../modules/enemy/enemy-ai';
import type { EnemySpawner } from '../modules/enemy/enemy-spawner';
import type { WorldCatalog } from '../modules/level/world-catalog';
import type { LevelData } from '../modules/level/level-data';
import type { LevelLoader } from '../modules/level/level-loader';
import type { TileRegistry } from '../modules/level/tile-registry';
import type { CameraController } from '../modules/camera/camera-controller';
import type { CollectibleSystem } from '../modules/collectible/collectible-system';
import type { CollectibleCatalog } from '../modules/collectible/collectible-catalog';
import type { MinigameManager } from '../modules/minigame/minigame-manager';
import type { MinigameRegistry } from '../modules/minigame/minigame-registry';
import type { ScoreCalculator } from '../modules/scoring/score-calculator';
import type { StarRating } from '../modules/scoring/star-rating';
import type { ProfileManager } from '../modules/progression/profile-manager';
import type { UnlockTracker } from '../modules/progression/unlock-tracker';
import type { SessionState } from '../modules/progression/session-state';
import type { SettingsManager } from '../modules/settings/settings-manager';
import type { GameStateMachine } from '../modules/game-state/game-state-machine';
import type { SyncManager } from '../modules/game-state/sync-manager';
import type { MinigameLogic } from '../modules/minigame/minigame-logic';

/**
 * Root container — the SINGLE location where all dependencies are declared.
 * Wired in main.ts createContainer().
 */
export interface Container {
  // ── Infrastructure (Phaser adapters + services) ──
  readonly clock: IGameClock;
  readonly input: IInputProvider;
  readonly audio: IAudioPlayer;
  readonly physics: IPhysicsWorld;
  readonly network: INetworkClient;
  readonly storage: IStorageProvider;

  // ── Navigation ──
  readonly flowController: FlowController;

  // ── Character & Player ──
  readonly characterCatalog: CharacterCatalog;
  readonly playerController: PlayerController;
  readonly playerAbilities: PlayerAbilities;

  // ── Physics ──
  readonly platformerPhysics: PlatformerPhysics;
  readonly collisionSystem: CollisionSystem;

  // ── Enemies ──
  readonly enemyCatalog: EnemyCatalog;
  readonly enemyAI: EnemyAI;

  // ── Levels ──
  readonly worldCatalog: WorldCatalog;
  readonly levelData: LevelData;
  readonly tileRegistry: TileRegistry;

  // ── Camera ──
  readonly cameraController: CameraController;

  // ── Collectibles ──
  readonly collectibleCatalog: CollectibleCatalog;
  readonly collectibleSystem: CollectibleSystem;

  // ── Minigames ──
  readonly minigameRegistry: MinigameRegistry;
  readonly minigameManager: MinigameManager;

  // ── Scoring ──
  readonly scoreCalculator: ScoreCalculator;
  readonly starRating: StarRating;

  // ── Progression & Persistence ──
  readonly profileManager: ProfileManager;
  readonly unlockTracker: UnlockTracker;
  readonly sessionState: SessionState;
  readonly settingsManager: SettingsManager;

  // ── Top-level State ──
  readonly gameStateMachine: GameStateMachine;
  readonly syncManager: SyncManager;

  // ── Scoped Factories (per-scene lifecycle) ──
  createPlatformerScope(levelId: string): PlatformerScope;
  createMinigameScope(minigameId: string): MinigameScope;
}

/**
 * Created when PlatformerScene starts, disposed when it shuts down.
 * Contains level-specific services that shouldn't outlive a level.
 */
export interface PlatformerScope {
  readonly levelLoader: LevelLoader;
  readonly enemySpawner: EnemySpawner;
  readonly levelId: string;
  dispose(): void;
}

/**
 * Created when MinigameScene starts, disposed when it ends.
 */
export interface MinigameScope {
  readonly minigameLogic: MinigameLogic;
  readonly minigameId: string;
  dispose(): void;
}
```

### Composition Root Wiring Order (`main.ts`)

```typescript
function createContainer(game: Phaser.Game): Container {

  // ── 1. Infrastructure (adapters — Phaser-coupled) ──
  const clock     = new PhaserClock(game);
  const input     = new PhaserInput(game);
  const audio     = new PhaserAudio(game);
  const physics   = new PhaserPhysics(game);
  const network   = new HonoNetworkClient();
  const storage   = new LocalStorageAdapter();

  // ── 2. Catalogs (pure data, no dependencies beyond storage/network) ──
  const characterCatalog  = new CharacterCatalog();
  const enemyCatalog      = new EnemyCatalog();
  const collectibleCatalog = new CollectibleCatalog();
  const worldCatalog      = new WorldCatalog();
  const tileRegistry      = new TileRegistry();

  // ── 3. Settings & Persistence (depends on storage) ──
  const settingsManager   = new SettingsManager(storage, audio, input);
  const profileManager    = new ProfileManager(storage);
  const unlockTracker     = new UnlockTracker(profileManager, worldCatalog, characterCatalog);
  const sessionState      = new SessionState();

  // ── 4. Scoring (pure logic) ──
  const scoreCalculator   = new ScoreCalculator();
  const starRating        = new StarRating();

  // ── 5. Navigation (depends on session, unlock) ──
  const flowController    = new FlowController(sessionState, unlockTracker);

  // ── 6. Level Data (populated per-level, not at boot) ──
  const levelData         = new LevelData();

  // ── 7. Physics & Collision (depends on ports) ──
  const platformerPhysics = new PlatformerPhysics(physics, clock);
  const collisionSystem   = new CollisionSystem(physics);

  // ── 8. Player (depends on input, physics, clock, character) ──
  const playerController  = new PlayerController(input, platformerPhysics, clock, sessionState);
  const playerAbilities   = new PlayerAbilities(characterCatalog, clock);

  // ── 9. Camera (depends on clock) ──
  const cameraController  = new CameraController(clock);

  // ── 10. Enemies (depends on clock, physics) ──
  const enemyAI           = new EnemyAI(clock, platformerPhysics, enemyCatalog);

  // ── 11. Collectibles (depends on player state) ──
  const collectibleSystem = new CollectibleSystem(collectibleCatalog, audio);

  // ── 12. Minigames (depends on network) ──
  const minigameRegistry  = new MinigameRegistry();
  const minigameManager   = new MinigameManager(minigameRegistry, network, audio);

  // Register minigame factories
  minigameRegistry.register('dice-duel', () => new DiceDuelLogic());
  minigameRegistry.register('coin-catch', () => new CoinCatchLogic());
  minigameRegistry.register('memory-match', () => new MemoryMatchLogic());

  // ── 13. Top-level State (depends on many) ──
  const syncManager       = new SyncManager(network);
  const gameStateMachine  = new GameStateMachine(
    sessionState, profileManager, syncManager, flowController
  );

  // ── Scoped Factories ──
  function createPlatformerScope(levelId: string): PlatformerScope {
    const levelLoader  = new LevelLoader(levelData, worldCatalog, network);
    const enemySpawner = new EnemySpawner(enemyAI, enemyCatalog, levelData);
    return {
      levelLoader,
      enemySpawner,
      levelId,
      dispose() {
        levelData.clear();
      },
    };
  }

  function createMinigameScope(minigameId: string): MinigameScope {
    const minigameLogic = minigameManager.createLogic(minigameId);
    return {
      minigameLogic,
      minigameId,
      dispose() { minigameLogic.cleanup(); },
    };
  }

  return {
    // Infrastructure
    clock, input, audio, physics, network, storage,
    // Navigation
    flowController,
    // Character & Player
    characterCatalog, playerController, playerAbilities,
    // Physics
    platformerPhysics, collisionSystem,
    // Enemies
    enemyCatalog, enemyAI,
    // Levels
    worldCatalog, levelData, tileRegistry,
    // Camera
    cameraController,
    // Collectibles
    collectibleCatalog, collectibleSystem,
    // Minigames
    minigameRegistry, minigameManager,
    // Scoring
    scoreCalculator, starRating,
    // Progression
    profileManager, unlockTracker, sessionState, settingsManager,
    // State
    gameStateMachine, syncManager,
    // Scoped factories
    createPlatformerScope,
    createMinigameScope,
  };
}
```

---

## 7. Domain Module Responsibilities

Each module is a self-contained domain concern. All are pure TS — zero Phaser, zero browser globals.

| Module | Responsibility | Key Dependencies (ports/modules) |
|--------|---------------|----------------------------------|
| `navigation` | Scene flow state machine, screen transitions | `sessionState`, `unlockTracker` |
| `character` | Character definitions, stat queries | None (pure data) |
| `player` | Player movement intent, state tracking, abilities | `IInputProvider`, `PlatformerPhysics`, `IGameClock`, `sessionState` |
| `physics` | Gravity, collision resolution, ground/wall detection | `IPhysicsWorld`, `IGameClock` |
| `enemy` | Enemy catalog, AI behaviors, spawn logic | `IGameClock`, `PlatformerPhysics`, `enemyCatalog`, `levelData` |
| `level` | Level JSON → domain model, world manifest, tile types | `INetworkClient`, `worldCatalog` |
| `camera` | Follow target, bounds clamping, lookahead, shake | `IGameClock` |
| `collectible` | Pickup detection, inventory updates, powerup timers | `collectibleCatalog`, `IAudioPlayer` |
| `minigame` | Registry, lifecycle management, individual game logic | `INetworkClient`, `IAudioPlayer` |
| `scoring` | Point calculation, combo multiplier, star thresholds | None (pure math) |
| `progression` | Save/load profiles, unlock tracking, session state | `IStorageProvider`, `worldCatalog`, `characterCatalog` |
| `settings` | Audio/display/control preferences, persistence | `IStorageProvider`, `IAudioPlayer`, `IInputProvider` |
| `game-state` | Global FSM, client-server sync orchestration | `sessionState`, `profileManager`, `syncManager`, `flowController` |

---

## 8. Asset Organization & Naming

### Naming Conventions

All asset keys follow `{category}-{name}` format. Keys are the same strings used in Phaser's cache and in Zod schemas (`spriteKey`, `musicKey`, etc.).

| Category | Pattern | Examples |
|----------|---------|----------|
| Character sprites | `char-{id}` | `char-knight`, `char-mage`, `char-rogue` |
| Character portraits | `portrait-{id}` | `portrait-knight` |
| Enemy sprites | `enemy-{type}` | `enemy-slime`, `enemy-bat` |
| Collectible atlas | `items-collectibles` | (shared atlas) |
| Tileset images | `tiles-{world}` | `tiles-forest`, `tiles-cave` |
| Tilemap JSON | `map-{levelId}` | `map-forest-1`, `map-cave-2` |
| Music | `music-{context}` | `music-title`, `music-forest`, `music-boss` |
| SFX | `sfx-{action}` | `sfx-jump`, `sfx-coin`, `sfx-hurt` |
| UI atlas | `ui-atlas` | (one shared atlas) |
| Bitmap font | `font-game` | |
| Particle atlas | `fx-particles` | |
| Backgrounds | `bg-{world}` | `bg-forest`, `bg-cave` |

### Asset Manifest (`public/assets/data/asset-manifest.json`)

```jsonc
{
  "version": "1.0.0",
  "assets": [
    // ── Characters ──
    { "key": "char-knight", "type": "atlas", "url": "sprites/characters/knight.png", "atlasUrl": "sprites/characters/knight.json" },
    { "key": "char-mage",   "type": "atlas", "url": "sprites/characters/mage.png",   "atlasUrl": "sprites/characters/mage.json" },
    { "key": "char-rogue",  "type": "atlas", "url": "sprites/characters/rogue.png",  "atlasUrl": "sprites/characters/rogue.json" },

    // ── Enemies ──
    { "key": "enemy-slime", "type": "atlas", "url": "sprites/enemies/slime.png", "atlasUrl": "sprites/enemies/slime.json" },
    { "key": "enemy-bat",   "type": "atlas", "url": "sprites/enemies/bat.png",   "atlasUrl": "sprites/enemies/bat.json" },

    // ── Items ──
    { "key": "items-collectibles", "type": "atlas", "url": "sprites/items/collectibles.png", "atlasUrl": "sprites/items/collectibles.json" },

    // ── Tilesets ──
    { "key": "tiles-forest", "type": "image", "url": "tilemaps/tilesets/forest-tiles.png" },
    { "key": "tiles-cave",   "type": "image", "url": "tilemaps/tilesets/cave-tiles.png" },

    // ── Tilemaps ──
    { "key": "map-forest-1", "type": "tilemapTiledJSON", "url": "tilemaps/levels/forest-1.json" },
    { "key": "map-forest-2", "type": "tilemapTiledJSON", "url": "tilemaps/levels/forest-2.json" },

    // ── Music ──
    { "key": "music-title",   "type": "audio", "url": "audio/music/title-theme.ogg" },
    { "key": "music-forest",  "type": "audio", "url": "audio/music/forest-theme.ogg" },
    { "key": "music-boss",    "type": "audio", "url": "audio/music/boss-theme.ogg" },
    { "key": "music-minigame","type": "audio", "url": "audio/music/minigame-theme.ogg" },

    // ── SFX ──
    { "key": "sfx-jump",       "type": "audio", "url": "audio/sfx/jump.ogg" },
    { "key": "sfx-coin",       "type": "audio", "url": "audio/sfx/coin.ogg" },
    { "key": "sfx-hurt",       "type": "audio", "url": "audio/sfx/hurt.ogg" },
    { "key": "sfx-menu-select","type": "audio", "url": "audio/sfx/menu-select.ogg" },

    // ── UI ──
    { "key": "ui-atlas",     "type": "atlas",      "url": "sprites/ui/ui-atlas.png", "atlasUrl": "sprites/ui/ui-atlas.json" },
    { "key": "font-game",    "type": "bitmapFont", "url": "fonts/game-font.png",     "fontDataUrl": "fonts/game-font.xml" },
    { "key": "fx-particles", "type": "atlas",      "url": "sprites/effects/particles.png", "atlasUrl": "sprites/effects/particles.json" },

    // ── Data ──
    { "key": "data-characters", "type": "json", "url": "data/characters.json" },
    { "key": "data-worlds",     "type": "json", "url": "data/worlds.json" },
    { "key": "data-enemies",    "type": "json", "url": "data/enemies.json" }
  ]
}
```

---

## 9. Scene Implementation Patterns

Every scene follows the same thin-scene contract from the foundation. Here are the patterns for each scene category.

### BaseScene (shared utilities)

```typescript
// scenes/base-scene.ts
export abstract class BaseScene extends Phaser.Scene {
  protected get container(): Container {
    return this.registry.get('container') as Container;
  }

  protected navigateTo(sceneKey: SceneKey): void {
    this.scene.start(sceneKey);
  }

  protected launchParallel(sceneKey: SceneKey): void {
    this.scene.launch(sceneKey);
  }

  protected stopParallel(sceneKey: SceneKey): void {
    this.scene.stop(sceneKey);
  }
}
```

### Menu Scene Pattern (no update loop)

```typescript
// scenes/character-select-scene.ts
export class CharacterSelectScene extends BaseScene {
  constructor() { super(SceneKeys.CHARACTER_SELECT); }

  create() {
    const { characterCatalog, unlockTracker, sessionState, audio } = this.container;
    const characters = characterCatalog.getAll();

    characters.forEach((char, i) => {
      const unlocked = unlockTracker.isCharacterUnlocked(char.id);
      const btn = this.add.sprite(/* position */).setInteractive();

      if (unlocked) {
        btn.on('pointerdown', () => {
          audio.playSfx('sfx-menu-confirm');
          sessionState.selectCharacter(char.id);
          this.navigateTo(SceneKeys.WORLD_SELECT);
        });
      }
    });
  }
  // No update() — menu scenes are event-driven
}
```

### Gameplay Scene Pattern (with update loop + scoped container)

```typescript
// scenes/platformer-scene.ts
export class PlatformerScene extends BaseScene {
  private scope!: PlatformerScope;

  constructor() { super(SceneKeys.PLATFORMER); }

  create() {
    const { sessionState } = this.container;
    this.scope = this.container.createPlatformerScope(sessionState.currentLevelId);

    // Load level → build tilemap → place objects
    this.scope.levelLoader.load(this.scope.levelId);
    this.buildTilemap();
    this.spawnEntities();

    // Launch parallel scenes
    this.launchParallel(SceneKeys.HUD);

    // Music
    this.container.audio.playMusic(
      this.container.levelData.currentLevel!.musicKey,
      { loop: true, fadeInMs: 1000 }
    );
  }

  update(_time: number, _delta: number) {
    const c = this.container;
    // 1. Domain updates (pure logic)
    c.playerController.update();
    c.enemyAI.update();
    c.collectibleSystem.update();
    c.collisionSystem.resolve();
    c.cameraController.update();
    c.playerAbilities.update();

    // 2. Sync visuals to domain state
    this.syncPlayerSprite();
    this.syncEnemySprites();
    this.syncCollectibleSprites();

    // 3. Check level-end conditions
    if (c.playerController.state.state === 'dead') {
      this.handleDeath();
    }
  }

  shutdown() {
    this.stopParallel(SceneKeys.HUD);
    this.scope.dispose();
  }

  private handleDeath() { /* ... */ }
  private buildTilemap() { /* ... */ }
  private spawnEntities() { /* ... */ }
  private syncPlayerSprite() { /* ... */ }
  private syncEnemySprites() { /* ... */ }
  private syncCollectibleSprites() { /* ... */ }
}
```

### HUD Scene Pattern (parallel, reads container state)

```typescript
// scenes/hud-scene.ts
export class HudScene extends BaseScene {
  private healthText!: Phaser.GameObjects.BitmapText;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private coinText!: Phaser.GameObjects.BitmapText;

  constructor() { super(SceneKeys.HUD); }

  create() {
    this.healthText = this.add.bitmapText(16, 16, 'font-game', '', 24);
    this.scoreText  = this.add.bitmapText(16, 48, 'font-game', '', 24);
    this.coinText   = this.add.bitmapText(16, 80, 'font-game', '', 24);
  }

  update() {
    const player = this.container.playerController.state;
    this.healthText.setText(`HP: ${player.health}/${player.maxHealth}`);
    this.scoreText.setText(`Score: ${player.score}`);
    this.coinText.setText(`Coins: ${player.coins}`);
  }
}
```

### Pause Scene Pattern (overlay, pauses underlying)

```typescript
// scenes/pause-scene.ts
export class PauseScene extends BaseScene {
  constructor() { super(SceneKeys.PAUSE); }

  create() {
    // Darken background
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6);

    // Resume button
    this.addButton('Resume', () => {
      this.scene.resume(SceneKeys.PLATFORMER);
      this.scene.stop();
    });

    // Settings button
    this.addButton('Settings', () => {
      this.navigateTo(SceneKeys.SETTINGS);
    });

    // Quit to menu
    this.addButton('Quit', () => {
      this.scene.stop(SceneKeys.PLATFORMER);
      this.scene.stop(SceneKeys.HUD);
      this.navigateTo(SceneKeys.MAIN_MENU);
    });
  }

  private addButton(label: string, callback: () => void) { /* ... */ }
}
```

---

## 10. Server API Surface

### Routes

```typescript
// apps/server/src/routes/
├── state.ts          // GET /api/state — sync state
├── events.ts         // POST /api/event — game events
├── leaderboard.ts    // GET /api/leaderboard/:levelId — scores
                      // POST /api/leaderboard — submit score
├── profile.ts        // GET /api/profile/:id — player profile
                      // PUT /api/profile/:id — update profile
└── health.ts         // GET /api/health — server health check
```

### Server Services

```typescript
// apps/server/src/services/
├── game-session.ts      // Session state, event processing
├── leaderboard.ts       // Score storage, ranking
├── profile-service.ts   // Profile CRUD (server-side persistence)
└── validation.ts        // Shared Zod parse helpers
```

---

## 11. Naming Conventions (Summary)

| Category | Convention | Examples |
|----------|-----------|----------|
| Schema files | `{domain}.ts` | `player.ts`, `enemy.ts`, `level.ts` |
| Schema names | `{Entity}{Part}Schema` | `PlayerSchema`, `EnemyDefinitionSchema` |
| Type names | `{Entity}{Part}` | `Player`, `EnemyDefinition` |
| Module dirs | `{domain}/` | `player/`, `enemy/`, `level/` |
| Module files | `{domain}-{role}.ts` | `player-controller.ts`, `enemy-catalog.ts` |
| Test dirs | `__tests__/` | Co-located with source |
| Test files | `{source-file}.test.ts` | `player-controller.test.ts` |
| Scene files | `{name}-scene.ts` | `platformer-scene.ts`, `hud-scene.ts` |
| Scene keys | PascalCase string | `'Platformer'`, `'CharacterSelect'` |
| Port files | `{domain}.ts` | `engine.ts`, `input.ts`, `storage.ts` |
| Port interfaces | `I{Name}` | `IGameClock`, `IInputProvider`, `IStorageProvider` |
| Adapter files | `{impl}-{port}.ts` | `phaser-clock.ts`, `local-storage-adapter.ts` |
| Asset keys | `{category}-{name}` | `char-knight`, `sfx-jump`, `map-forest-1` |
| Level IDs | `{world}-{n}` | `forest-1`, `cave-3` |
| Package names | `@wds/{name}` | `@wds/shared`, `@wds/client`, `@wds/server` |

---

## 12. Data Flow Per Screen

### Boot → Playing (cold start)

```text
1. BootScene loads: logo, loading-bar sprite, font
2. PreloadScene reads asset-manifest.json, loads ALL assets with progress bar
3. PreloadScene triggers: characterCatalog.loadFrom('data-characters')
                          worldCatalog.loadFrom('data-worlds')
                          enemyCatalog.loadFrom('data-enemies')
                          profileManager.loadProfile()
                          settingsManager.loadSettings()
4. TitleScene shows title, waits for interaction (unlocks AudioContext)
5. MainMenuScene — reads profileManager for "continue" option
6. CharacterSelectScene — reads characterCatalog + unlockTracker
7. WorldSelectScene — reads worldCatalog + unlockTracker
8. LevelSelectScene — reads worldCatalog.getLevels(worldId) + profileManager.levelResults
9. PlatformerScene:
   a. sessionState already populated with (characterId, worldId, levelId)
   b. createPlatformerScope(levelId) → levelLoader.load → levelData populated
   c. playerController initialized with character stats from characterCatalog
   d. enemySpawner reads levelData.objects, creates EnemyAI instances
   e. update loop: domain → visual sync
```

### Minigame Portal Trigger

```text
1. CollisionSystem detects player overlapping a 'minigame-portal' object
2. collisionSystem fires event → playerController pauses
3. flowController stores return context (position, level state)
4. PlatformerScene.scene.pause() + scene.launch(SceneKeys.MINIGAME, { minigameId })
5. MinigameScene.create() → createMinigameScope(minigameId)
6. MinigameLogic runs: intro → active → finished
7. MinigameResult calculated → rewards applied to playerController.state
8. MinigameScene stops → PlatformerScene resumes at stored position
```

### Level Complete

```text
1. CollisionSystem detects player overlapping 'exit' object
2. gameStateMachine transitions to 'level-complete'
3. scoreCalculator computes: base + enemies + coins + time bonus + minigame bonus
4. starRating evaluates against level.starThresholds
5. profileManager.saveLevelResult(levelResult) — persists via storage port
6. unlockTracker re-evaluates world/level unlocks
7. LevelCompleteScene displays: score tally animation, stars, rewards
8. Player chooses: Next Level → LevelSelectScene | World Map → WorldSelectScene | Menu → MainMenuScene
```

---

## 13. Implementation Phase Mapping

Maps the implementation phases from the foundation document to specific deliverables in this blueprint.

### Phase 0: Scaffold (Day 1)

- All directories created per §3 file structure
- All schema files stubbed per §4
- `types/index.ts` with all re-exports
- `SceneKeys` constant
- `BaseScene` class
- Expanded `container.ts` interface (no implementations yet)

### Phase 1: Core Infrastructure (Week 1)

- All 6 port interfaces finalized (including `IStorageProvider`)
- All adapters implemented
- `createContainer()` wired with stub modules
- Boot → Preload → Title → MainMenu scene chain
- Asset manifest loading
- Settings persistence round-trip
- Profile creation / loading
- `bun run check` green

### Phase 2: Platformer Core (Weeks 2–3)

- `character/`, `player/`, `physics/`, `enemy/`, `level/`, `camera/`, `collectible/` modules
- All catalog loaders (character, enemy, collectible, world)
- Full `PlatformerScene` + `HudScene` + `PauseScene`
- Tilemap rendering from Tiled JSON
- One complete world with 2–3 levels
- Enemy behaviors: patrol, chase
- Collectible pickups
- Scoring + star rating
- Tests for every module

### Phase 3: Minigame System (Week 4)

- `MinigameRegistry` + `MinigameManager` + `MinigameLogic` interface
- `MinigameScene` + `MinigameHudScene`
- Portal detection + scene transition
- First minigame: `dice-duel`
- Minigame rewards → player state
- Second minigame: `coin-catch`

### Phase 4: Progression & Polish (Weeks 5–6)

- Character select screen with unlock visualization
- World select with lock/unlock states
- Level select with star display
- `progression/` module: save/load, unlock tracking
- Leaderboard (client + server)
- `GameOverScene` + retry flow
- `LevelCompleteScene` with score tally animation
- Credits, settings screen polish
- Audio crossfading, screen shake, particle effects
- Mobile input adaptation
- Third minigame: `memory-match`
- Performance: SpriteGPULayer for particles, tilemap optimization
