# Wyn der Schrank — Architectural Foundation Document

**Version:** 1.0.0  
**Date:** February 10, 2026  
**Status:** CANONICAL — All downstream ADRs and implementation must conform to this document  
**Scope:** Web-based platformer with integrated minigame subsystem

---

## 1. Technology Stack (Locked)

All versions are pinned. No upgrades without an ADR.

### Core Runtime & Build

| Tool | Version | Purpose | Install Note |
|------|---------|---------|--------------|
| **Phaser** | `4.0.0-rc.6` | Game engine (WebGL renderer) | Pin explicitly: `phaser@4.0.0-rc.6` |
| **Bun** | `1.3.9` | Dev runtime, workspaces, test runner | Local dev only |
| **Node.js** | `24.13.1 LTS` | CI/CD baseline | Production/CI compatibility |
| **Vite** | `7.3.1` | Client build | |
| **TypeScript** | `5.9.3` | Language | `strict` + `isolatedDeclarations` |

### Server & Contract

| Tool | Version | Purpose |
|------|---------|---------|
| **Hono** | `4.11.9` | API server (standards-first, multi-runtime) |
| **Zod** | `4.3.6` | Schema-first runtime validation + type inference |

### Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | `4.0.18` | Unified test runner |
| **Happy DOM** | `20.6.0` | Lightweight DOM simulation for scene-adjacent tests |

### Lint & Formatting (Hybrid Strategy)

| Tool | Version | Responsibility |
|------|---------|----------------|
| **Biome** | `2.3.14` | Formatting + basic lint (fast) |
| **ESLint** | `10.0.0` | Architectural boundary enforcement (zone defense) |
| **dependency-cruiser** | `17.3.8` | Structural dependency validation (CI gate) |

### Optional: Overlay UI (Choose ONE if needed)

| Option | Version |
|--------|---------|
| React | `19.2.4` |
| Vue | `3.5.28` |

---

## 2. Project Structure (Monorepo)

Designed for **Bun Workspaces**. Separates Source of Truth (Shared) from Implementation (Client/Server).

```text
/project-root (wyn-der-schrank/)
├── .claude/                        # AGENTIC INFRASTRUCTURE
│   ├── CLAUDE.md                   # Project constitution (short directives)
│   ├── agents/                     # Subagent definitions
│   │   ├── architect.md            # Architecture review agent
│   │   ├── implementer.md          # Code implementation agent
│   │   ├── tester.md               # Test writing agent
│   │   └── security-reviewer.md    # Security audit agent
│   ├── commands/                   # Slash commands
│   │   ├── investigate.md          # /project:investigate <target>
│   │   ├── implement-feature.md    # /project:implement-feature <spec>
│   │   └── zone-check.md          # /project:zone-check (lint zones)
│   └── hooks/                      # Lifecycle hooks
│       └── pre-commit.sh           # Format + lint + type-check gate
│
├── docs/                           # GOVERNANCE
│   ├── adr/                        # Architectural Decision Records
│   │   ├── 001-pure-di.md
│   │   ├── 002-phaser-ports.md
│   │   └── template.md
│   ├── plans/                      # Phase plans
│   │   └── active-plan.md
│   └── runbooks/                   # Operational procedures
│
├── bun.lockb                       # Single lockfile (Bun 1.3.9)
├── package.json                    # workspaces: ["packages/*", "apps/*"]
├── biome.json                      # Formatting & basic linting
├── eslint.config.mjs               # Architectural enforcement
├── vitest.workspace.ts             # Unified test runner
├── .dependency-cruiser.cjs         # Structural validation rules
├── tsconfig.base.json              # Shared TS config (strict base)
│
├── packages/
│   └── shared/                     # THE CONTRACT — npm: @wds/shared@1.0.0
│       ├── package.json            # name: "@wds/shared", public npm package
│       ├── tsconfig.json           # extends base + isolatedDeclarations
│       └── src/
│           ├── schema/             # Runtime validators (Zod 4.3.6, 15 files)
│           │   ├── assets.ts       # AssetManifestSchema + meta schemas
│           │   ├── common.ts       # Vec2, Rect, Range, EntityId
│           │   ├── character.ts    # CharacterDefinitionSchema
│           │   ├── enemy.ts        # EnemyDefinitionSchema
│           │   ├── level.ts        # LevelMetadata, WorldDefinition
│           │   └── ...             # + collectible, minigame, scoring, etc.
│           └── types/              # Inferred types (NEVER hand-written)
│               └── index.ts        # Re-exports z.infer<> types only
│
├── apps/
│   ├── server/                     # Hono 4.11.9 (API + Game Server)
│   │   ├── package.json            # name: "@wds/server"
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts            # Entry + RPC export (AppType)
│   │   │   ├── routes/             # Hono route handlers
│   │   │   └── services/           # Business logic
│   │   │       ├── game-session.ts
│   │   │       └── leaderboard.ts
│   │   └── test/
│   │
│   └── client/                     # Phaser 4 Game Client
│       ├── package.json            # name: "@wds/client"
│       ├── tsconfig.json
│       ├── index.html
│       ├── vite.config.ts          # Vite 7.3.1
│       └── src/
│           ├── main.ts             # COMPOSITION ROOT (DI wiring)
│           │
│           ├── core/               # ═══ INFRASTRUCTURE ZONE ═══
│           │   ├── ports/          # Interfaces (the contract)
│           │   │   ├── engine.ts   # IGameClock, IRendererStats
│           │   │   ├── input.ts    # IInputProvider
│           │   │   ├── audio.ts    # IAudioPlayer
│           │   │   ├── physics.ts  # IPhysicsWorld, IBody
│           │   │   └── network.ts  # INetworkClient
│           │   ├── adapters/       # Phaser implementations of ports
│           │   │   ├── phaser-clock.ts
│           │   │   ├── phaser-input.ts
│           │   │   ├── phaser-audio.ts
│           │   │   └── phaser-physics.ts
│           │   ├── container.ts    # DI container (Pure DI)
│           │   └── services/       # Cross-cutting infrastructure
│           │       ├── network-manager.ts
│           │       ├── asset-loader.ts
│           │       └── scene-coordinator.ts
│           │
│           ├── modules/            # ═══ DOMAIN ZONE ═══ (Pure TS)
│           │   ├── player/
│           │   │   ├── player-controller.ts
│           │   │   ├── player-state.ts
│           │   │   └── __tests__/
│           │   ├── physics/
│           │   │   ├── platformer-physics.ts
│           │   │   └── collision-system.ts
│           │   ├── enemy/
│           │   │   ├── enemy-ai.ts
│           │   │   └── patrol-behavior.ts
│           │   ├── level/
│           │   │   ├── level-data.ts
│           │   │   └── tile-registry.ts
│           │   ├── collectible/
│           │   │   └── collectible-system.ts
│           │   ├── camera/
│           │   │   └── camera-controller.ts
│           │   ├── minigame/       # Minigame subsystem
│           │   │   ├── minigame-manager.ts
│           │   │   ├── minigame-registry.ts
│           │   │   └── games/
│           │   │       └── [minigame-name]/
│           │   │           ├── logic.ts
│           │   │           └── __tests__/
│           │   └── game-state/
│           │       ├── state-machine.ts
│           │       └── sync-manager.ts
│           │
│           └── scenes/             # ═══ VIEW ZONE ═══ (Phaser)
│               ├── boot-scene.ts
│               ├── preload-scene.ts
│               ├── main-menu-scene.ts
│               ├── platformer-scene.ts
│               ├── minigame-scene.ts
│               └── hud-scene.ts    # Parallel scene for UI overlay
```

---

## 3. Zone Defense Architecture

The architecture enforces **strict dependency direction** through three zones:

```text
          ┌─────────────────────────────────────────┐
          │              SERVER                       │
          │         (Hono + Services)                 │
          └──────────────┬──────────────────────────┘
                         │
          ┌──────────────▼──────────────────────────┐
          │              SHARED                       │
          │     (Zod Schemas + Inferred Types)        │
          │        THE SOURCE OF TRUTH                │
          └──────────────┬──────────────────────────┘
                         │
          ┌──────────────▼──────────────────────────┐
          │              CLIENT                       │
          │                                           │
          │  ┌─────────┐    ┌──────────┐             │
          │  │ SCENES   │───▶│  CORE    │◀────┐      │
          │  │ (View)   │    │ (Infra)  │     │      │
          │  └─────────┘    └──────────┘     │      │
          │                   ▲   ports/     │      │
          │                   │              │      │
          │               ┌───┴────────┐     │      │
          │               │  MODULES   │─────┘      │
          │               │  (Domain)  │            │
          │               │  Pure TS   │            │
          │               └────────────┘            │
          └─────────────────────────────────────────┘
```

### Zone Rules (Enforced by ESLint + dependency-cruiser)

| Zone | May Import | May NOT Import | Phaser Access |
|------|-----------|----------------|---------------|
| **Modules** (Domain) | `@wds/shared`, `core/ports/` | `phaser`, `scenes/`, `window`, `document` | ❌ Forbidden |
| **Scenes** (View) | `modules/`, `core/`, `@wds/shared` | `server/`, raw `fetch` | ✅ Full access |
| **Core** (Infrastructure) | Everything | — | ✅ Full access |

### Dependency Direction Law

```text
modules/ ──imports──▶ core/ports/  (interfaces only)
modules/ ──imports──▶ @wds/shared/  (schemas + types)
scenes/  ──imports──▶ modules/  (domain logic)
scenes/  ──imports──▶ core/  (services + adapters)
core/    ──imports──▶ @wds/shared/  (schemas + types)
core/    ──implements──▶ core/ports/  (adapter pattern)

FORBIDDEN:
modules/ ──X──▶ phaser
modules/ ──X──▶ scenes/
scenes/  ──X──▶ server/ (use core/services/network-manager)
```

---

## 4. ESLint 10.0 Zone Enforcement

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // 1. Base Setup
  {
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      parserOptions: { project: true },
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
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
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'phaser',
            message: 'ZONE VIOLATION: modules/ must be engine-agnostic. Import from core/ports/ instead.',
          },
          // No named path for scenes — covered by pattern below.
          // If path aliases are added later, add corresponding entries here.
        ],
        patterns: [
          {
            group: ['**/scenes/*'],
            message: 'ZONE VIOLATION: modules/ cannot access view layer.',
          },
          {
            group: ['**/adapters/*'],
            message: 'ZONE VIOLATION: modules/ must use ports/, not concrete adapters.',
          },
        ],
      }],
      // Suspenders: explicit ban even if globals leak through via ambient types
      'no-restricted-globals': ['error',
        { name: 'Phaser', message: 'Global Phaser access is forbidden in modules/.' },
        { name: 'window', message: 'Global window access is forbidden in modules/.' },
        { name: 'document', message: 'Direct DOM access is forbidden in modules/.' },
        { name: 'requestAnimationFrame', message: 'Use IGameClock from core/ports/ instead.' },
      ],
    },
  },

  // 3. ZONE: SCENES — Phaser allowed, but no raw server access.
  {
    files: ['apps/client/src/scenes/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/server/*', 'hono/*'],
            message: 'ZONE VIOLATION: scenes/ must use NetworkManager from core/, not raw server code.',
          },
        ],
      }],
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
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['phaser', 'hono', '**/client/*', '**/server/*'],
            message: 'ZONE VIOLATION: shared/ must have zero app dependencies.',
          },
        ],
      }],
    },
  },
);
```

---

## 5. Pure DI — Composition Root Pattern

All dependencies are wired explicitly in a single Composition Root (`main.ts`). Modules receive dependencies via constructor parameters. No reflection, no decorators, no runtime metadata. Agents can trace every dependency by reading one file.

### Container Definition

```typescript
// apps/client/src/core/container.ts

import type { IGameClock } from './ports/engine';
import type { IInputProvider } from './ports/input';
import type { IAudioPlayer } from './ports/audio';
import type { IPhysicsWorld } from './ports/physics';
import type { INetworkClient } from './ports/network';

/**
 * Service container — the SINGLE location where all dependencies are wired.
 * 
 * RULES FOR AGENTS:
 * 1. Every service is created HERE and ONLY here.
 * 2. Modules receive dependencies via constructor parameters.
 * 3. No service may construct another service (that's this file's job).
 * 4. Adding a service = add to Container interface + createContainer factory.
 */
export interface Container {
  // Infrastructure (Phaser adapters)
  readonly clock: IGameClock;
  readonly input: IInputProvider;
  readonly audio: IAudioPlayer;
  readonly physics: IPhysicsWorld;
  readonly network: INetworkClient;
  
  // Domain (pure logic)
  readonly playerController: PlayerController;
  readonly enemyAI: EnemyAI;
  readonly levelData: LevelData;
  readonly collectibleSystem: CollectibleSystem;
  readonly cameraController: CameraController;
  readonly gameStateMachine: GameStateMachine;
  readonly minigameManager: MinigameManager;
  
  // Scene-scoped (created per scene lifecycle)
  createPlatformerScope(): PlatformerScope;
  createMinigameScope(gameId: string): MinigameScope;
}

export interface PlatformerScope {
  readonly enemySpawner: EnemySpawner;
  readonly levelLoader: LevelLoader;
  dispose(): void;
}

export interface MinigameScope {
  readonly minigameLogic: MinigameLogic;
  dispose(): void;
}
```

### Composition Root

```typescript
// apps/client/src/main.ts — THE COMPOSITION ROOT

import { PhaserClock } from './core/adapters/phaser-clock';
import { PhaserInput } from './core/adapters/phaser-input';
import { PhaserAudio } from './core/adapters/phaser-audio';
import { PhaserPhysics } from './core/adapters/phaser-physics';
import { HonoNetworkClient } from './core/services/network-manager';
import { PlayerController } from './modules/player/player-controller';
import { EnemyAI } from './modules/enemy/enemy-ai';
// ... all domain imports

import type { Container } from './core/container';

function createContainer(game: Phaser.Game): Container {
  // 1. Infrastructure (adapters — Phaser-coupled)
  const clock = new PhaserClock(game);
  const input = new PhaserInput(game);
  const audio = new PhaserAudio(game);
  const physics = new PhaserPhysics(game);
  const network = new HonoNetworkClient();
  
  // 2. Domain (pure — receive only port interfaces)
  const playerController = new PlayerController(input, physics, clock);
  const enemyAI = new EnemyAI(clock, physics);
  const levelData = new LevelData();
  const collectibleSystem = new CollectibleSystem();
  const cameraController = new CameraController(clock);
  const minigameManager = new MinigameManager(network);
  const gameStateMachine = new GameStateMachine(network, minigameManager);
  
  return {
    clock,
    input,
    audio,
    physics,
    network,
    playerController,
    enemyAI,
    levelData,
    collectibleSystem,
    cameraController,
    gameStateMachine,
    minigameManager,
    
    createPlatformerScope() {
      const enemySpawner = new EnemySpawner(enemyAI, levelData);
      const levelLoader = new LevelLoader(levelData, network);
      return {
        enemySpawner,
        levelLoader,
        dispose() { /* cleanup */ },
      };
    },
    
    createMinigameScope(gameId: string) {
      const minigameLogic = minigameManager.createLogic(gameId);
      return {
        minigameLogic,
        dispose() { minigameLogic.cleanup(); },
      };
    },
  };
}

// Boot Phaser, then wire everything
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  physics: { default: 'arcade' },
  scene: [], // scenes added after container is ready
});

const container = createContainer(game);

// Pass container to scenes via Phaser's registry or scene data
game.registry.set('container', container);
game.scene.add('Boot', BootScene, true);
```

### Testing with Pure DI

Test doubles are plain objects that satisfy port interfaces:

```typescript
// modules/player/__tests__/player-controller.test.ts
import { describe, it, expect } from 'vitest';
import { PlayerController } from '../player-controller';
import { createMockInput, createMockPhysics, createMockClock } from '../../__test-utils__/mocks';

describe('PlayerController', () => {
  it('should move right when horizontal axis is positive', () => {
    const input = createMockInput({ horizontal: 1.0 });
    const physics = createMockPhysics();
    const clock = createMockClock({ delta: 16 });
    
    const controller = new PlayerController(input, physics, clock);
    controller.update();
    
    expect(physics.getVelocityX()).toBeGreaterThan(0);
  });
});
```

---

## 6. Port Interfaces (Engine Abstraction)

These interfaces define the ONLY contract that modules/ may see from the engine.

```typescript
// core/ports/engine.ts
export interface IGameClock {
  readonly now: number;
  readonly delta: number;       // Frame delta (ms)
  readonly frame: number;       // Current frame count
  readonly elapsed: number;     // Total elapsed (ms)
}

export interface IRendererStats {
  readonly type: 'WEBGL' | 'CANVAS';
  readonly fps: number;
  readonly drawCalls: number;
}

// core/ports/input.ts
export type ActionKey = 'jump' | 'left' | 'right' | 'attack' | 'interact' | 'pause';

export interface IInputProvider {
  isDown(action: ActionKey): boolean;
  justPressed(action: ActionKey): boolean;
  justReleased(action: ActionKey): boolean;
  getAxis(axis: 'horizontal' | 'vertical'): number; // -1 to 1
  
  // Touch/gamepad abstraction
  readonly isTouchActive: boolean;
  readonly isGamepadConnected: boolean;
}

// core/ports/audio.ts
export interface IAudioPlayer {
  playSfx(key: string, config?: { volume?: number; rate?: number }): void;
  playMusic(key: string, config?: { loop?: boolean; volume?: number }): void;
  stopMusic(): void;
  setMasterVolume(volume: number): void;
}

// core/ports/physics.ts
export interface IPhysicsWorld {
  createBody(config: BodyConfig): IBody;
  removeBody(body: IBody): void;
  overlap(a: IBody, b: IBody): boolean;
  raycast(origin: Vec2, direction: Vec2, distance: number): RaycastHit | null;
}

export interface IBody {
  readonly id: string;
  position: Vec2;
  velocity: Vec2;
  readonly isOnGround: boolean;
  readonly isTouchingWall: boolean;
  setGravity(x: number, y: number): void;
  applyForce(x: number, y: number): void;
}

export interface Vec2 {
  x: number;
  y: number;
}

// core/ports/network.ts
export interface INetworkClient {
  fetchState<T>(endpoint: string): Promise<T>;
  sendEvent(event: GameEvent): Promise<void>;
  onSync(callback: (state: SyncState) => void): () => void; // returns unsubscribe
}

// core/ports/storage.ts
export interface IStorageProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(prefix?: string): Promise<string[]>;
}

// core/ports/settings.ts
export interface ISettingsManager {
  readonly current: Settings;           // Settings from @wds/shared
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
  updateSection<K extends keyof Settings>(
    section: K,
    patch: Partial<Settings[K]>,
  ): Promise<Settings>;
}

// core/ports/diagnostics.ts
export interface IDiagnostics {
  emit(channel: DiagnosticChannel, level: DiagnosticLevel, label: string,
       data: Record<string, unknown>): void;
  isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean;
  query(filter?: { channel?: DiagnosticChannel; level?: DiagnosticLevel;
       last?: number }): readonly DiagnosticEvent[];
}
```

---

## 7. Shared Contract (Zod-First)

```typescript
// packages/shared/src/schema/game-state.ts
import { z } from 'zod';

export const Vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const PlayerSchema = z.object({
  id: z.string(),
  position: Vec2Schema,
  velocity: Vec2Schema,
  health: z.number().int().min(0).max(100),
  score: z.number().int().min(0),
  facing: z.enum(['left', 'right']),
});

export const SyncStateSchema = z.object({
  tick: z.number().int(),
  players: z.array(PlayerSchema),
  timestamp: z.number(),
});

// packages/shared/src/schema/minigame.ts
export const MinigameIdSchema = z.enum([
  'dice-duel',
  // Add more as minigames are implemented
]);

export const MinigameStateSchema = z.object({
  id: MinigameIdSchema,
  phase: z.enum(['waiting', 'active', 'finished']),
  participants: z.array(z.string()),
  data: z.record(z.unknown()),  // Game-specific payload
});

// packages/shared/src/types/index.ts — INFERRED ONLY
export type Vec2 = z.infer<typeof Vec2Schema>;
export type Player = z.infer<typeof PlayerSchema>;
export type SyncState = z.infer<typeof SyncStateSchema>;
export type MinigameId = z.infer<typeof MinigameIdSchema>;
export type MinigameState = z.infer<typeof MinigameStateSchema>;
```

### Publishing @wds/shared

`@wds/shared` is published to the npm public registry so the studio repo
(`wyn-der-schrank-studio`) can depend on it. Key details:

- **Zod is a peer dependency** (`^4.0.0`). Bun auto-installs it for consumers.
- **Explicit subpath exports** control what the studio can import:
  `./assets`, `./level`, `./character`, `./enemy`, `./collectible`, `./common`, `./types`.
- **Game-internal schemas** (settings, diagnostics, physics-config, etc.) are only
  reachable via the barrel `@wds/shared` import — the studio is instructed not to use it.
- **`prepublishOnly`** runs `tsc --noEmit` before every publish.
- **Contract document:** `docs/plans/studio-asset-interface.md` defines the full
  integration surface, versioning protocol, and `bun link` workflow.

---

## 8. Data Flow (RPC Loop)

```text
1. SHARED:   SyncStateSchema defined in Zod
2. SERVER:   Hono endpoint validates + returns c.json({ data })
3. CLIENT    NetworkManager (core/) fetches via hc<AppType> typed client
   (Core):
4. CLIENT    GameStateMachine (modules/) updates domain entities
   (Module):
5. CLIENT    PlatformerScene.update() reads domain state, moves sprites
   (Scene):
```

### Server RPC Contract

```typescript
// apps/server/src/index.ts
import { Hono } from 'hono';
import { hc } from 'hono/client';
import { SyncStateSchema } from '@wds/shared';

const app = new Hono()
  .get('/api/state', async (c) => {
    const state = await gameSession.getState();
    const validated = SyncStateSchema.parse(state);
    return c.json({ data: validated });
  })
  .post('/api/event', async (c) => {
    const event = await c.req.json();
    const validated = GameEventSchema.parse(event);
    await gameSession.handleEvent(validated);
    return c.json({ ok: true });
  });

export type AppType = typeof app;
```

---

## 9. Platformer Architecture

### Scene Lifecycle

```text
BootScene → PreloadScene → MainMenuScene ─┬─▶ PlatformerScene
                                           │    (parallel: HudScene)
                                           │
                                           └─▶ MinigameScene
                                                (parallel: HudScene)
```

### PlatformerScene Pattern

Scenes are THIN. They read domain state and move sprites. Zero game logic in scenes.

```typescript
// scenes/platformer-scene.ts
export class PlatformerScene extends Phaser.Scene {
  private container!: Container;
  private scope!: PlatformerScope;
  private playerSprite!: Phaser.GameObjects.Sprite;
  
  create() {
    this.container = this.registry.get('container') as Container;
    this.scope = this.container.createPlatformerScope();
    
    // Create visuals (sprites, tilemap, etc.)
    this.playerSprite = this.add.sprite(0, 0, 'player');
    
    // Load level data through domain
    this.scope.levelLoader.load('level-1');
  }
  
  update(_time: number, _delta: number) {
    // 1. Domain updates (pure logic via ports)
    this.container.playerController.update();
    this.container.enemyAI.update();
    this.container.collectibleSystem.update();
    this.container.cameraController.update();
    
    // 2. Sync visuals to domain state (view reads model)
    const playerState = this.container.playerController.state;
    this.playerSprite.setPosition(playerState.position.x, playerState.position.y);
    this.playerSprite.setFlipX(playerState.facing === 'left');
  }
  
  shutdown() {
    this.scope.dispose();
  }
}
```

### Minigame Subsystem

The minigame system uses a **Registry + Factory** pattern, allowing new minigames to be added without modifying existing code.

```typescript
// modules/minigame/minigame-registry.ts
export class MinigameRegistry {
  private factories = new Map<MinigameId, () => MinigameLogic>();
  
  register(id: MinigameId, factory: () => MinigameLogic): void {
    this.factories.set(id, factory);
  }
  
  create(id: MinigameId): MinigameLogic {
    const factory = this.factories.get(id);
    if (!factory) throw new Error(`Unknown minigame: ${id}`);
    return factory();
  }
}

// modules/minigame/minigame-logic.ts — interface all minigames implement
export interface MinigameLogic {
  readonly id: MinigameId;
  readonly phase: 'waiting' | 'active' | 'finished';
  
  start(participants: string[]): void;
  update(delta: number): void;
  handleInput(playerId: string, action: string): void;
  getState(): MinigameState;
  cleanup(): void;
}
```

---

## 10. Phaser 4 WebGL Renderer

```text
KEY FACTS:
- Phaser 4 uses a WebGL renderer (WebGL2-class rendering pipeline)
- This is NOT WebGPU — do not reference WebGPU in any project documentation
- Performance wins come from GPU-oriented features:
  • SpriteGPULayer for instanced rendering
  • Optimized 2D batching pipeline
  • Texture wrap controls (setWrap — CLAMP, REPEAT, MIRRORED_REPEAT)
- GPU-accelerated tilemap layers support ORTHOGRAPHIC only
  (not hexagonal or isometric)
- Canvas fallback exists but is not the primary path
```

---

## 11. Agentic Development Infrastructure

### CLAUDE.md (Project Constitution)

```markdown
# CLAUDE.md — Wyn der Schrank

## Identity
Platformer + minigame web game. Phaser 4 (RC6, pinned). Bun workspaces monorepo.

## Architecture Law
- THREE ZONES: modules/ (pure TS), scenes/ (Phaser view), core/ (infrastructure)
- modules/ NEVER imports phaser, window, document, or scenes/
- ALL dependencies wired in main.ts (Pure DI Composition Root)
- Types inferred from Zod schemas in @wds/shared — never hand-written
- Phaser 4 renderer is WebGL. Do not reference WebGPU.

## Investigation First
Before writing ANY code:
1. grep/search for existing patterns
2. Read relevant ADR in docs/adr/
3. Show evidence of investigation before implementation
4. Code without investigation evidence = rejected

## Verification Gate
After ANY change: `bun run check` (type-check + lint + test)
Never --no-verify on commits.

## Key Files
- Architecture: docs/adr/
- Active plan: docs/plans/active-plan.md
- Container: apps/client/src/core/container.ts
- Ports: apps/client/src/core/ports/
- Schemas: packages/shared/src/schema/
```

### Subagent Definitions

```yaml
# .claude/agents/architect.md
---
name: architect
description: Reviews changes for zone violations and architectural conformance
tools: Read, Grep, Glob
model: opus
---
You are a senior game architect reviewing Wyn der Schrank.

CRITICAL RULES:
- modules/ must be pure TypeScript with ZERO Phaser imports
- All types come from @wds/shared Zod schemas
- New services MUST be registered in core/container.ts
- Every architectural change needs an ADR in docs/adr/

Review for: zone violations, missing port abstractions, leaked engine coupling,
circular dependencies, and conformance with docs/adr/*.
```

```yaml
# .claude/agents/tester.md
---
name: tester
description: Writes and validates tests for domain modules
tools: Read, Grep, Glob, Bash(bun test*), Bash(bun run check)
model: opus
---
You write tests for Wyn der Schrank's domain modules.

RULES:
- Tests for modules/ use mock ports, never real Phaser
- Tests must be in __tests__/ directories co-located with source
- Use vitest + happy-dom for any DOM-adjacent tests
- Run `bun run check` after writing tests to verify
```

### Slash Commands

```markdown
<!-- .claude/commands/investigate.md -->
Investigate $ARGUMENTS before any implementation.
1. grep -r for related patterns in the codebase
2. Check docs/adr/ for relevant decisions
3. Check core/ports/ for existing abstractions
4. Check core/container.ts for current wiring
5. Report findings — do NOT write code yet
```

```markdown
<!-- .claude/commands/zone-check.md -->
Run full zone defense validation:
1. `bunx eslint apps/client/src/modules/ --max-warnings 0`
2. `bunx dependency-cruiser apps/client/src --config .dependency-cruiser.cjs --output-type err-long`
3. `bun run typecheck`
Report any violations with file:line references.
```

### Pre-commit Hook

```bash
#!/bin/bash
# .claude/hooks/pre-commit.sh
set -euo pipefail

echo "▸ Type-checking..."
bun run typecheck

echo "▸ Linting zones..."
bunx eslint apps/client/src/modules/ --max-warnings 0

echo "▸ Format check..."
bunx biome check --changed

echo "▸ Running tests..."
bun test --run

echo "✓ All gates passed"
```

### MCP Integration Points

```jsonc
// .claude/mcp.json (if using Phaser Editor v5)
{
  "mcpServers": {
    "phaser-editor": {
      "command": "npx",
      "args": ["@phaserjs/editor-mcp-server"]
    }
  }
}
```

The Phaser Editor v5 MCP server provides tools for scene management, asset inspection, tilemap manipulation, and visual scene building — it connects to a running Phaser Editor instance and enables agents to manage visual game content alongside code.

---

## 12. dependency-cruiser Configuration

```javascript
// .dependency-cruiser.cjs
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'modules-no-phaser',
      severity: 'error',
      comment: 'Modules must be engine-agnostic',
      from: { path: 'apps/client/src/modules' },
      to: { path: 'node_modules/phaser' },
    },
    {
      name: 'modules-no-scenes',
      severity: 'error',
      comment: 'Modules cannot import from view layer',
      from: { path: 'apps/client/src/modules' },
      to: { path: 'apps/client/src/scenes' },
    },
    {
      name: 'modules-no-adapters',
      severity: 'error',
      comment: 'Modules use ports, not concrete adapters',
      from: { path: 'apps/client/src/modules' },
      to: { path: 'apps/client/src/core/adapters' },
    },
    {
      name: 'scenes-no-server',
      severity: 'error',
      comment: 'Scenes must use NetworkManager, not raw server',
      from: { path: 'apps/client/src/scenes' },
      to: { path: 'apps/server' },
    },
    {
      name: 'shared-no-app-deps',
      severity: 'error',
      comment: 'Shared package must be dependency-free (except Zod)',
      from: { path: 'packages/shared' },
      to: { path: ['apps/client', 'apps/server', 'node_modules/phaser', 'node_modules/hono'] },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No circular dependencies anywhere',
      from: {},
      to: { circular: true },
    },
  ],
};
```

---

## 13. TypeScript Configuration

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "isolatedDeclarations": true,
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Path Alias Decision: Deferred (Use Relative Imports)

Path aliases (`@wds/client/*`, etc.) are **not defined in Phase 0**. All intra-package
imports use relative paths. This avoids tooling mismatches across Vite `resolve.alias`,
TS `paths`, ESLint config, and dependency-cruiser.

**Upgrade path (Phase 2+, requires ADR):** If relative imports become unwieldy, define
aliases in `tsconfig.json` + `vite.config.ts` + ESLint `no-restricted-imports` simultaneously.
When added, update the ESLint modules zone to include named path entries for any alias
that could reach scenes/ or adapters/.

```jsonc
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "isolatedDeclarations": true
  },
  "include": ["src/**/*.ts"]
}
```

```jsonc
// apps/client/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
    // No "paths" aliases in Phase 0.
    // If added later, must be mirrored in vite.config.ts resolve.alias
    // AND in eslint.config.mjs no-restricted-imports named paths.
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

---

## 14. Implementation Phases

### Phase 0: Scaffold (Day 1)

```bash
# Initialize monorepo
mkdir wyn-der-schrank && cd wyn-der-schrank
bun init

# Configure workspaces
# Edit package.json: "workspaces": ["packages/*", "apps/*"]

# Install toolchain (workspace root)
bun add -w -d typescript@5.9.3 vite@7.3.1 vitest@4.0.18 \
  happy-dom@20.6.0 @biomejs/biome@2.3.14 eslint@10.0.0 \
  dependency-cruiser@17.3.8 typescript-eslint@latest globals@latest

# Setup shared
mkdir -p packages/shared/src/{schema,types}
cd packages/shared && bun init
bun add zod@4.3.6

# Setup server
cd ../../ && mkdir -p apps/server/src/{routes,services}
cd apps/server && bun init
bun add hono@4.11.9

# Setup client
cd ../../ && mkdir -p apps/client/src/{core/{ports,adapters,services},modules,scenes}
cd apps/client && bun init
bun add phaser@4.0.0-rc.6
bun add -d vite@7.3.1

# Apply guardrails
# Copy eslint.config.mjs, .dependency-cruiser.cjs, tsconfig files
# Create core/ports/*.ts interfaces
# Create CLAUDE.md
```

### Phase 1: Core Infrastructure (Week 1)

- [ ] Port interfaces finalized (`core/ports/*.ts`)
- [ ] Phaser adapters implemented (`core/adapters/*.ts`)
- [ ] Composition Root functional (`main.ts`)
- [ ] Boot → Preload → MainMenu scene chain working
- [ ] NetworkManager with Hono RPC client
- [ ] ESLint zones passing with zero violations
- [ ] dependency-cruiser CI gate green
- [ ] `bun run check` script works end-to-end

### Phase 2: Platformer Core (Weeks 2-3)

- [ ] PlayerController with input abstraction
- [ ] Platformer physics (gravity, collision, ground detection)
- [ ] Basic level loading (Tiled JSON → domain model → Phaser tilemap)
- [ ] Enemy AI with patrol behavior
- [ ] Camera controller (follow player, level bounds)
- [ ] PlatformerScene rendering domain state
- [ ] HUD scene (health, score, parallel scene)
- [ ] Full test coverage for modules/

### Phase 3: Minigame System (Week 4)

- [ ] MinigameRegistry + Factory pattern
- [ ] Scene transition: PlatformerScene ↔ MinigameScene
- [ ] First minigame implementation (dice-duel)
- [ ] MinigameState sync via Zod schema
- [ ] Minigame-specific HUD mode

### Phase 4: Polish & Server (Weeks 5-6)

- [ ] Server-side game state management
- [ ] Leaderboard system
- [ ] Asset pipeline (sprite atlases, audio)
- [ ] SpriteGPULayer optimization for particle effects
- [ ] Performance profiling and Phaser 4 WebGL tuning
- [ ] Mobile input adaptation (touch controls)

---

## 15. Package.json Scripts

```jsonc
// Root package.json
{
  "name": "wyn-der-schrank",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "bun run --filter @wds/client dev",
    "build": "bun run --filter '*' build",
    "typecheck": "tsc --build --force",
    "lint": "eslint .",
    "lint:zones": "eslint apps/client/src/modules/ --max-warnings 0",
    "format": "biome check --write .",
    "format:check": "biome check .",
    "deps:check": "dependency-cruiser apps/ packages/ --config .dependency-cruiser.cjs --output-type err-long",
    "test": "vitest",
    "test:run": "vitest run",
    "check": "bun run typecheck && bun run lint:zones && bun run deps:check && bun run test:run",
    "pre-commit": "bun run check && bun run format:check"
  }
}
```

---

## 16. Key Architectural Decisions (Summary)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-001 | Pure DI (Composition Root) | Explicit wiring, zero reflection, compatible with `isolatedDeclarations` |
| ADR-002 | Phaser Ports pattern | Engine abstraction; modules/ access only port interfaces |
| ADR-003 | Zod-first contract | Single source of truth; runtime + compile-time safety |
| ADR-004 | ESLint 10 zone defense | Automated architectural enforcement across three zones |
| ADR-005 | dependency-cruiser CI gate | Structural dependency validation beyond import rules |
| ADR-006 | Thin scenes, fat modules | Scenes are pure view; all game logic lives in testable modules/ |
| ADR-007 | Minigame Registry pattern | Open/closed principle for adding new minigames |
| ADR-008 | Phaser 4 RC6 pinned | Production-ready final RC; explicit install required |
| ADR-009 | Investigation-first methodology | Agents must show evidence before writing code |
| ADR-010 | CLAUDE.md as project constitution | Short directives + pointers to canonical docs |
| ADR-011 | Relative imports, no path aliases (Phase 0) | Eliminates Vite/TS/ESLint/dep-cruiser alias sync issues |
| ADR-012 | Modules zone: node-only globals | Belt (browser APIs removed from scope) + suspenders (`no-restricted-globals`) |

---

## Appendix A: Agent Anti-Patterns to Block

These are the most common failures when agents work on game codebases. The architecture prevents each one:

| Anti-Pattern | Prevention |
|-------------|------------|
| Agent imports Phaser in domain logic | ESLint `no-restricted-imports` in modules/ zone |
| Agent accesses `window` or `document` in game logic | Globals override removes browser APIs from scope + `no-restricted-globals` |
| Agent puts game logic in Scene.update() | Thin scene pattern; domain lives in modules/ |
| Agent creates services outside container | CLAUDE.md rule: all services in container.ts |
| Agent hand-writes types instead of using Zod | shared/ lint rule; types/ only re-exports z.infer |
| Agent claims Phaser 4 uses WebGPU | CLAUDE.md + renderer section explicitly prohibit |
| Agent reaches into scene.physics directly | Physics port interface abstracts engine |
| Agent creates circular dependencies | dependency-cruiser CI gate |
| Agent writes code without investigating first | Investigation-first slash command + CLAUDE.md rule |
| Agent uses `--no-verify` to skip checks | CLAUDE.md explicit prohibition |
| Agent imports via phantom path alias | No aliases defined; ESLint pattern catches relative paths to forbidden zones |

---

## Appendix B: Quick Reference — File Roles

| File | Role | Who Writes It |
|------|------|---------------|
| `CLAUDE.md` | Agent behavior constitution | Human (you) |
| `docs/adr/*.md` | Architectural decisions | Human + Agent (with review) |
| `docs/plans/active-plan.md` | Current phase tasks | Agent (with human approval) |
| `packages/shared/src/schema/*.ts` | Zod schemas (source of truth) | Human + Agent |
| `apps/client/src/core/ports/*.ts` | Port interfaces | Human (architectural) |
| `apps/client/src/core/adapters/*.ts` | Phaser implementations | Agent |
| `apps/client/src/core/container.ts` | DI wiring | Agent (under ADR rules) |
| `apps/client/src/modules/**/*.ts` | Domain logic (pure TS) | Agent (primary workspace) |
| `apps/client/src/scenes/*.ts` | View layer (thin) | Agent |
| `eslint.config.mjs` | Zone enforcement | Human (architectural) |
| `.dependency-cruiser.cjs` | Structural validation | Human (architectural) |
