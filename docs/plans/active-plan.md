---
title: Active Plan
status: Phase 1 — Core Infrastructure (in progress)
last_updated: 2026-02-10
---

# Active Plan

## Phase 0 — Scaffold (COMPLETE)

### Completed
- [x] Monorepo structure (Bun workspaces)
- [x] Root toolchain configs (tsconfig, biome, eslint, dependency-cruiser, bunfig.toml)
- [x] Shared package with Zod schemas (full game domain: 13 schema files, 40+ types)
- [x] Server stub (Hono with safeParse validation)
- [x] Client stub (Phaser 4 + Vite)
- [x] Port interfaces (engine, input, audio, physics, network, storage)
- [x] Container interface with PlatformerScope and MinigameScope factories
- [x] Scene key registry (modules/navigation/scene-keys.ts)
- [x] Agentic infrastructure (AGENTS.md, CLAUDE.md, commands, skills, agents)
- [x] Phaser 4 enforcement (docs-first contract, evidence file, hooks)
- [x] Telemetry infrastructure (6 hooks, JSONL events, drift reports)
- [x] Full directory structure per game blueprint (modules, scenes, assets, server)
- [x] All verification gates green: typecheck + lint:zones + deps:check + test:run + format:check

## Current Phase: 1 — Core Infrastructure (IN PROGRESS)

### Completed
- [x] PlatformerConfig schema (MovementConfig, JumpConfig, FastFallConfig, BodyDimensions)
- [x] Expanded port interfaces (IBody with full physics API, IInputProvider with update/down, IPhysicsWorld with collide/overlap/gravity)
- [x] Phaser 4 adapters (PhaserClock, PhaserInput, PhaserBody, PhaserPhysics)
- [x] PlayerController — single composable controller with jump, double jump, coyote time, jump buffer, fast fall, variable jump height, state machine, health
- [x] PlayerController test suite (32 tests covering all mechanics, edge cases, state transitions)
- [x] Shared mock factories (__test-utils__/mocks.ts) for consistent module testing
- [x] Vitest workspace properly excludes dist/ compiled output
- [x] tsconfig.test.json for ESLint type-aware linting of test files
- [x] All verification gates green: typecheck + lint:zones + deps:check + test:run (32/32) + format:check

### Next
- [ ] Local Phaser 4 docs mirror (docs/vendor/phaser-4.0.0-rc.6/)
- [ ] Composition Root functional (main.ts wiring)
- [ ] Boot -> Preload -> Title -> MainMenu scene chain
- [ ] BaseScene class with container access pattern
- [ ] NetworkManager with Hono RPC client
- [ ] LocalStorageAdapter implementing IStorageProvider
- [ ] Settings persistence round-trip
- [ ] Profile creation / loading
- [ ] Asset manifest loading in PreloadScene
- [ ] Catalog loaders (character, enemy, collectible, world)
- [ ] `bun run check` green with all adapters wired

### Phase 2: Platformer Core
- [ ] player/, physics/, enemy/, level/, camera/, collectible/ modules
- [ ] Full PlatformerScene + HudScene + PauseScene
- [ ] Tilemap rendering from Tiled JSON
- [ ] One complete world with 2-3 levels
- [ ] Enemy behaviors: patrol, chase
- [ ] Scoring + star rating
- [ ] Tests for every module

### Phase 3: Minigame System
- [ ] MinigameRegistry + MinigameManager + MinigameLogic interface
- [ ] MinigameScene + MinigameHudScene
- [ ] Portal detection + scene transition
- [ ] First minigame: dice-duel
- [ ] Minigame rewards -> player state

### Phase 4: Progression & Polish
- [ ] Character/world/level select screens with unlock visualization
- [ ] progression/ module: save/load, unlock tracking
- [ ] Leaderboard (client + server)
- [ ] GameOverScene + LevelCompleteScene
- [ ] Audio crossfading, screen shake, particle effects
- [ ] Additional minigames: coin-catch, memory-match
