---
title: Active Plan
last_updated: 2026-02-16
---

# Active Plan

## Snapshot

- __Active:__ none (G11 complete, awaiting merge)
- __Next ready:__ G12
- __Blocked:__ none
- __Last milestone:__ 2026-02-15 — G11 Character System & Selection Flow (396 tests) [feat/character-system]
- __Gates:__ all green (396 tests)

## Goals

### G1: Scene Infrastructure

> __Status:__ done
> __Requires:__ none
> __Benefits from:__ none
> __Unlocks:__ G2, G3, G4
> __Branch:__ merged

BaseScene with container access, full Container wiring, camera module, PreloadScene with asset manifest. The platform everything else builds on.

- [x] BaseScene class with typed container access pattern
- [x] Full Container wiring in main.ts (all ports resolved)
- [x] Camera module (modules/camera/) with port interface
- [x] PreloadScene with asset manifest loading
- [x] Full scene chain: Boot -> Preload -> Platformer

### G2: Visual Identity

> __Status:__ done
> __Requires:__ G1
> __Benefits from:__ none
> __Unlocks:__ G3, G4, G5
> __Branch:__ merged

Sprites, animation, and tile rendering replace colored rectangles. The game looks like a game.

- [x] Sprite-based player replacing colored rectangle
- [x] Player animation state machine (idle, run, jump, fall)
- [x] Tilemap rendering from Tiled JSON
- [x] Enemy sprites with idle/walk display animation (domain AI is G4)
- [x] Collectible sprites with idle display animation (domain pickup logic is G3)

### G3: Gameplay Loop

> __Status:__ done
> __Requires:__ G1
> __Benefits from:__ G2
> __Unlocks:__ G5
> __Branch:__ merged

Collectibles, HUD, level-end trigger, and scoring give the player a goal. Builds on G2 sprites and tilemaps.

- [x] Collectible module (modules/collectible/) with pickup logic wired to G2 sprites
- [x] HUD scene (score, health, level indicator) — PlayerController already exposes health via snapshot
- [x] Level-end trigger and level-complete flow (exit object in tilemap)
- [x] Scoring module with star rating calculation
- [x] At least one complete world with 2-3 Tiled levels (requires G2 tilemap infrastructure)

### G4: Hazards

> __Status:__ done
> __Requires:__ G1
> __Benefits from:__ G2
> __Unlocks:__ G5
> __Branch:__ merged

Enemy patrol, damage, death/respawn, and game-over add risk to the platforming. Builds on G2 enemy sprites.

- [x] Enemy module (modules/enemy/) with patrol AI wired to G2 sprites
- [x] Damage and health system (PlayerController.takeDamage exists; wire collision → damage → visual feedback)
- [x] Death and respawn mechanic (checkpoint system + spawn reset)
- [x] Game-over trigger when health reaches zero
- [x] Enemy-player collision detection via physics port

### G5: Menu and Flow

> __Status:__ done
> __Requires:__ G3, G4
> __Benefits from:__ G2
> __Unlocks:__ none
> __Branch:__ merged

Title screen, pause, game-over screen, settings, and persistence make the game self-contained. Design tokens (colors, spacing, typography) provide consistent UI across all menu scenes. G3 delivered LevelCompleteScene (next-level + replay) and G4 delivered GameOverScene (retry only). Both need menu navigation once TitleScene exists. IStorageProvider port and NoopStorage adapter already exist; G5 replaces NoopStorage with LocalStorageAdapter in main.ts.

- [x] Design tokens module (modules/ui/design-tokens.ts) — color palette, spacing scale, z-index layers (pure TS, zone-safe)
- [x] Title screen and main menu scene (SceneKeys.TITLE already defined)
- [x] Pause scene (overlay, SceneKeys.PAUSE already defined)
- [x] Game-over scene with retry/quit options (enhance existing GameOverScene — add Menu button once TitleScene exists)
- [x] Settings scene with LocalStorageAdapter persistence (SceneKeys.SETTINGS defined; replace NoopStorage in main.ts)
- [x] Level-complete scene connecting to next level or menu (enhance existing LevelCompleteScene — add Menu button)

### G6: @hub-of-wyn/shared Publishing Preparation

> __Status:__ done
> __Requires:__ none (G1–G5 done, schemas stable)
> __Benefits from:__ none
> __Unlocks:__ Studio buildout (external repo)
> __Branch:__ merged

Prepare `@hub-of-wyn/shared` for npm publication so the studio can depend on it. Add missing asset metadata schemas, replace wildcard exports with explicit subpaths, move Zod to peerDependencies, and remove the `private` flag. The studio repo (`wyn-der-schrank-studio`) is blocked on this — it needs `@hub-of-wyn/shared` published (or `bun link`-able with the new schemas) before its schema layer can import from `@hub-of-wyn/shared/assets`.

__Reference:__ `docs/plans/studio-asset-interface.md` — the authoritative shared contract defining export paths, schema extensions, and package.json changes.

- [x] Add `SpritesheetMetaSchema`, `AudioMetaSchema`, `TilemapMetaSchema` to `packages/shared/src/schema/assets.ts` as optional fields on `AssetEntrySchema`
- [x] Export new schemas from `index.ts` and add inferred types to `types/index.ts`
- [x] Update `packages/shared/package.json`: remove `private: true`, bump to `1.0.0`, explicit subpath exports (no wildcards), `files` field, `publishConfig`, `prepublishOnly` script, Zod to `peerDependencies`
- [x] Verify export self-containment via `bunx dependency-cruiser` (no transitive game-internal deps from any exported schema file)
- [x] Update documentation: `AGENTS.md` (publishing workflow), `FOUNDATION.md` (shared package section)
- [x] Publish to npm public registry (`bun publish --access public` — manual step after PR merge)

### G7: Runtime & Observability

> __Status:__ done
> __Requires:__ none (G1–G6 done)
> __Benefits from:__ none
> __Unlocks:__ G8
> __Branch:__ feat/runtime-observability

Server starts properly with validated config, unified dev command, front-to-back diagnostics, tested and verified.

- [x] Server config validation with Zod (port, log level, diagnostics settings)
- [x] ServerDiagnostics service with ring buffer and query filtering
- [x] `GET /api/health` endpoint with uptime, version, environment
- [x] `GET /api/diagnostics` endpoint queryable by channel/level/last
- [x] Structured startup logging on server boot
- [x] Unified `bun run dev` starts both client (:3000) and server (:3001)
- [x] Documentation updated (AGENTS.md, diagnostics.md)

### G8: Minigame Architecture & Shake Rush

> __Status:__ done
> __Requires:__ G7
> __Benefits from:__ none
> __Unlocks:__ future minigames (dice-duel, coin-catch, memory-match)
> __Branch:__ feat/minigame-architecture

Build the minigame framework, then completely rewrite the Birthday Minigame from wynisbuff2 using Phaser 4 and our architecture. Same gameplay (3-lane collect-and-deliver) rebuilt from scratch with hexagonal architecture, ports/adapters, zone defense, and full test coverage.

- [x] `'shake-rush'` added to MinigameIdSchema in `@hub-of-wyn/shared`
- [x] `'minigame'` added to DiagnosticChannelSchema
- [x] IMinigameLogic interface with snapshot/intent pattern (pure TS, zone-safe)
- [x] MinigameRegistry and MinigameManager modules with tests
- [x] MinigameHudState registry key pattern (mirrors GameplayState)
- [x] MinigameScope expanded with logic field, wired in container
- [x] Shake Rush complete rewrite: config, lane system, scoring, game orchestration — all pure TS with full test coverage
- [x] MinigameScene and MinigameHudScene (thin Phaser 4 wrappers, verified API only)
- [x] Minigame portal trigger in PlatformerScene via tilemap objects
- [x] Documentation updated (AGENTS.md, active-plan.md)

### G9: Vertical Slice Safety Net

> __Status:__ done
> __Requires:__ G7, G8
> __Benefits from:__ none
> __Unlocks:__ none
> __Branch:__ chore/agentic-infra-refinement

Wire one event end-to-end through the network port, build session persistence with schema validation, close the persistence loop with load-on-boot and a visible title-screen indicator. Fix Phaser global resolution for Vite dev server.

- [x] Activate events schema in client (already done — confirmed via investigation)
- [x] Wire `level:completed` event emission through `INetworkClient.sendEvent()` with typed `GameEvent`
- [x] `SessionSaveSchema` and `LevelCompletionSchema` in `@hub-of-wyn/shared`
- [x] `SessionSave` service in `modules/progression/` with `safeParse()` validation, DI registration, one consumer
- [x] `SessionSave.load()` wired into boot sequence (`PreloadScene` via `Promise.all`)
- [x] Progress indicator on Title scene (conditional, zero regression for new players)
- [x] Fix Phaser global: Vite alias to browser build + side-effect import in `main.ts`

### G10: Audio System

> __Status:__ done
> __Requires:__ none (G1–G9 done)
> __Benefits from:__ none
> __Unlocks:__ G11 (menus need audio feedback for interactions)
> __Branch:__ merged

Replace `NoopAudio` with a real `PhaserAudio` adapter that implements the existing `IAudioPlayer` port (`core/ports/audio.ts`). Add SFX and music playback across all existing scenes. Wire the `SettingsManager` audio controls (masterVolume, musicVolume, sfxVolume, muted) to the live audio system. The game is currently silent — this goal makes it sound like a game.

__Porting reference:__ `wynisbuff2/src/core/AudioManager.js` (Howler.js wrapper — rewrite using Phaser 4 native audio API, not Howler), `wynisbuff2/src/core/AudioUnlockManager.js` (browser gesture pattern — adapt for Phaser 4 AudioContext).

__Architecture notes:__

- `IAudioPlayer` port already defines 15 methods including `playSfx`, `playMusic`, `stopMusic`, `crossfadeMusic`, volume controls, and `unlockAudioContext`.
- `NoopAudio` at `core/adapters/noop-audio.ts` is the current placeholder — replace with `PhaserAudio` in `main.ts` container wiring.
- `SettingsSchema` (`packages/shared/src/schema/settings.ts`) already has `audio.masterVolume`, `audio.musicVolume`, `audio.sfxVolume`, `audio.muted` fields.
- `SettingsScene` (`scenes/settings-scene.ts`) currently has a mute toggle — extend with volume sliders in this goal or G11.
- PhaserAudio adapter lives in `core/adapters/` (view zone) — it may import Phaser.
- No audio asset files exist yet. Deliverable includes sourcing or generating placeholder audio files (OGG format preferred, free/CC0 licensed). Organize under `public/assets/audio/sfx/` and `public/assets/audio/music/`.
- wynisbuff2 uses SFX variant arrays (4 variants per sound type for natural variation) — adopt this pattern via a `SfxVariantMap` config in `modules/` (pure TS, zone-safe) that the PhaserAudio adapter reads.
- Phaser 4 audio API must be verified against rc.6 docs. Record all new Phaser audio symbols in `docs/PHASER_EVIDENCE.md`.
- Browser audio unlock is critical: browsers require a user gesture before playing audio. The `unlockAudioContext()` method on `IAudioPlayer` handles this. Wire it to the first user interaction in `TitleScene` (pointerdown on Play or Settings).

__Deliverables:__

- [x] `PhaserAudio` adapter (`core/adapters/phaser-audio.ts`) implementing all 15 `IAudioPlayer` methods using Phaser 4 native audio — verify every Phaser audio symbol against rc.6 docs
- [x] Audio context unlock wired to first user interaction in `TitleScene` — port browser gesture pattern from wynisbuff2 `AudioUnlockManager`
- [x] Replace `NoopAudio` with `PhaserAudio` in `main.ts` `createContainer()` — PhaserAudio receives the `Phaser.Game` instance for sound manager access
- [x] SFX asset files (OGG, CC0/free): jump, land, coin-pickup, hurt, enemy-defeat, menu-select, menu-confirm — added to asset manifest and loaded in PreloadScene
- [x] Music asset files (OGG, CC0/free): title-theme, platformer-theme, minigame-theme — added to asset manifest with loop/fadeIn config
- [x] SFX integration across existing scenes: PlatformerScene (jump, land, coin, hurt, enemy-defeat), TitleScene (menu-select), PauseScene (menu-select), SettingsScene (menu-select), LevelCompleteScene (level-complete), GameOverScene (game-over)
- [x] `SettingsManager` audio round-trip: on boot, apply persisted audio settings to PhaserAudio (volumes + mute state); on settings change, update PhaserAudio in real-time

### G11: Character System & Selection Flow

> __Status:__ done
> __Requires:__ G10
> __Benefits from:__ none
> __Unlocks:__ G12
> __Branch:__ feat/character-system

Build the full menu selection pipeline: Title → MainMenu → CharacterSelect → WorldSelect → LevelSelect → Platformer. Port the character select card UI and main menu level grid from wynisbuff2, rewritten for hexagonal architecture with TypeScript, Zod schemas, zone defense, and thin scenes. Requires building the character catalog module and the navigation flow controller.

__Porting reference:__ `wynisbuff2/src/scenes/CharacterSelect.js` (3-character card UI with hover/select effects, color-coded, staggered entrance animation), `wynisbuff2/src/scenes/MainMenu.js` (responsive 4-section layout, level grid with 1-3 columns, keyboard navigation, event banner, reset progress confirmation dialog).

__Architecture notes:__

- Scene keys already defined: `MAIN_MENU`, `CHARACTER_SELECT`, `WORLD_SELECT`, `LEVEL_SELECT` in `modules/navigation/scene-keys.ts`.
- `CharacterIdSchema` (`knight`, `mage`, `rogue`), `CharacterDefinitionSchema`, `CharacterStatsSchema` all exist in `packages/shared/src/schema/character.ts`.
- `modules/character/` directory exists but is empty (only `__tests__/.gitkeep`) — build `character-catalog.ts` here.
- `WorldDefinitionSchema`, `WorldIdSchema` (`forest`, `cave`, `castle`), `LevelIdSchema` exist in `packages/shared/src/schema/level.ts`.
- `modules/level/` currently only has `tilemap-objects.ts` — add `world-catalog.ts` here for world/level definitions and unlock queries.
- `modules/navigation/` currently only has `scene-keys.ts` — add `flow-controller.ts` here for scene transition FSM.
- `SessionSave` exists in `modules/progression/` with level completion tracking — use for unlock state and star display.
- `Container` interface (`core/container.ts`) currently has 9 services — extend with `characterCatalog` and `flowController` at minimum.
- `main.ts` scene array must add the 4 new scenes.
- Character data: define 3 characters matching wynisbuff2 (rebranded for Wyn der Schrank theme) as a JSON data file loaded via PreloadScene, validated against `CharacterDefinitionSchema`.
- World/level data: define forest world (already has 2 levels) and stub cave/castle as locked worlds, as a JSON data file loaded via PreloadScene, validated against `WorldDefinitionSchema`.
- All new scenes follow thin-scene pattern. Domain logic (catalog queries, unlock checks, selection state) lives in `modules/`. Scenes call module functions and render results.
- `TitleScene` Play button changes from navigating to `PLATFORMER` to navigating to `CHARACTER_SELECT` (or `MAIN_MENU` if that's the entry point).
- Audio feedback for menu interactions uses `IAudioPlayer` from G10.

__Deliverables:__

- [x] Character catalog module (`modules/character/character-catalog.ts`) — loads definitions from JSON data, queries by ID, returns all unlocked characters. Pure TS, zone-safe, with co-located tests.
- [x] World catalog module (`modules/level/world-catalog.ts`) — loads world definitions from JSON data, queries levels by world, checks unlock conditions against SessionSave. Pure TS, zone-safe, with co-located tests.
- [x] Flow controller module (`modules/navigation/flow-controller.ts`) — tracks selected character, selected world, selected level. Determines valid next scene based on current selection state. Pure TS, zone-safe, with co-located tests.
- [x] Character and world JSON data files (`public/assets/data/characters.json`, `public/assets/data/worlds.json`) validated against shared schemas, loaded in PreloadScene
- [x] `CharacterSelectScene` (`scenes/character-select-scene.ts`) — 3-character card layout ported from wynisbuff2. Hover glow, color-coded borders, staggered entrance, selection persisted via flow controller. Thin scene.
- [x] `MainMenuScene` (`scenes/main-menu-scene.ts`) — level grid with responsive layout ported from wynisbuff2. Shows world sections, level cards with star ratings from SessionSave, locked/unlocked state. Keyboard navigation. Thin scene.
- [x] `WorldSelectScene` and `LevelSelectScene` (`scenes/world-select-scene.ts`, `scenes/level-select-scene.ts`) — world selection shows 3 worlds (forest unlocked, cave/castle locked), level selection shows levels within selected world with star display
- [x] Container updated: `characterCatalog` and `flowController` added to `Container` interface and wired in `main.ts`
- [x] `TitleScene` updated: Play navigates to `CHARACTER_SELECT` instead of directly to `PLATFORMER`
- [x] Navigation chain verified end-to-end: Title → CharacterSelect → MainMenu → Platformer → LevelComplete → MainMenu

### G12: Second Minigame (Coin Catch)

> __Status:__ ready
> __Requires:__ G11
> __Benefits from:__ G10 (audio feedback during gameplay)
> __Unlocks:__ future minigames (dice-duel, memory-match)
> __Branch:__ —

Implement Coin Catch as the second minigame using the established `IMinigameLogic` interface, `MinigameRegistry`, and `MinigameScope` pattern from G8. Coin Catch is an action-oriented falling-object collection game: coins fall from the top of the screen, the player moves a basket/character left and right to catch them, avoiding bombs/obstacles. Timed rounds with scoring multipliers.

__Architecture notes:__

- `MinigameIdSchema` already includes `'coin-catch'` — no schema changes needed.
- Follow the `shake-rush` reference implementation exactly: config module, game state module, scoring module, orchestrating logic class, all in `modules/minigame/games/coin-catch/`.
- `IMinigameLogic` interface (snapshot/intent pattern): `init()`, `update(dt)`, `handleIntent(intent)`, `snapshot()`, `isFinished()`, `result()`.
- `MinigameRegistry.register('coin-catch', factory)` in `main.ts`.
- `MinigameScene` and `MinigameHudScene` are already generic — they read the logic snapshot and render. No new scene files needed unless Coin Catch needs unique rendering (evaluate during implementation; prefer reusing existing scenes).
- Portal trigger in PlatformerScene already works for any registered minigame ID — just needs a tilemap object with `type: 'minigame-portal'` and `minigameId: 'coin-catch'` property.
- All game logic is pure TS in `modules/` (zone-safe). Falling object positions, collision detection, scoring — all computed in the logic module. The scene just reads snapshot positions and renders sprites.
- wynisbuff2 doesn't have a coin-catch minigame — this is a new design. Use the shake-rush architecture as the template.

__Deliverables:__

- [ ] Coin Catch config module (`modules/minigame/games/coin-catch/config.ts`) — round duration, spawn rate, speed ranges, coin/bomb ratios, scoring values, difficulty progression
- [ ] Coin Catch game state module (`modules/minigame/games/coin-catch/game-state.ts`) — falling objects array (position, type, active), catcher position, score, lives, combo streak
- [ ] Coin Catch scoring module (`modules/minigame/games/coin-catch/scoring.ts`) — base coin value, combo multiplier, streak bonus, penalty for bombs, final tally
- [ ] `CoinCatchLogic` class (`modules/minigame/games/coin-catch/coin-catch-logic.ts`) implementing `IMinigameLogic` — orchestrates spawn timing, gravity simulation, collision detection, game-over condition
- [ ] Full test coverage for all Coin Catch modules (co-located `__tests__/` directory, same pattern as shake-rush tests)
- [ ] Registered in `MinigameRegistry` in `main.ts`: `registry.register('coin-catch', (deps) => new CoinCatchLogic(deps))`
- [ ] At least one tilemap level includes a `minigame-portal` object with `minigameId: 'coin-catch'` for end-to-end verification

## Update Protocol

### When to read

- __Session start.__ Every agent session begins by reading this file.
- __implement-feature Gate 0.__ Before investigating, confirm work aligns with the current goal.

### When to update

| Trigger | Action |
|---------|--------|
| Start work on a goal | Set status to `in-progress`, set branch name, update Snapshot |
| Complete a deliverable | Check the box: `- [ ]` -> `- [x]` |
| All deliverables done | Set status to `done`, branch to `merged`, move to Completed Log, update Snapshot |
| A `requires` dependency completes | Set dependent goal from `not-started` -> `ready` |
| Hit a blocker | Set status to `blocked(reason)`, update Snapshot |
| Blocker resolved | Set status back to previous state, clear reason |
| Checked deliverable fails gates in later session | Uncheck it, add `blocked(reason)` to goal, do not proceed until resolved |

### Rules

1. __Work top-down.__ Start with the lowest-numbered `ready` goal.
2. __One active goal at a time.__ Only one goal may be `in-progress`.
3. __Never add, remove, or reorder goals.__ Only the human modifies the goal list.
4. __Respect requires.__ Do not start a goal whose `requires` dependencies are not `done`.
5. __Update Snapshot.__ After any status change, update the Snapshot section to match.
6. __Update last_updated.__ Set the frontmatter date on any edit.
7. __Decompose large deliverables.__ If a deliverable will touch more than 8 files, stop and split it into sub-deliverables before implementing.
8. __Reprioritization.__ If the Snapshot's active goal doesn't match the first `in-progress` goal in the list, the human has reprioritized. Read the new Snapshot and adjust.
9. __Merge-time vs branch-time.__ Status updates for _completed_ work (goal → `done`, deliverable checked off, Completed Log entry) are committed on the _work branch_ before the PR merge. Status updates for _starting_ new work (goal → `in-progress`, new branch name) are committed as the _first commit_ on the new branch. Never commit plan changes directly on `main`.

## Completed Log

- __2026-02-15__ — G11: Character System & Selection Flow — CharacterCatalog, WorldCatalog, FlowController (FSM), 4 new scenes (CharacterSelect, MainMenu, WorldSelect, LevelSelect), character/world JSON data, navigation chain rewiring (396 tests) [feat/character-system]
- __2026-02-15__ — G10: Audio System — PhaserAudio adapter (layered volume, crossfade, AudioContext unlock), audio-keys domain module (SFX variants), 26 audio assets, scene integration across all 8 scenes, settings round-trip (348 tests) [feat/audio-system]
- __2026-02-14__ — G9: Vertical Slice Safety Net — Event emission (level:completed), SessionSave with schema-validated persistence, boot-sequence loading, title-screen progress indicator, Phaser global fix for Vite (284 tests) [chore/agentic-infra-refinement]
- __2026-02-12__ — G8: Minigame Architecture & Shake Rush — IMinigameLogic interface, MinigameRegistry/Manager, Shake Rush complete rewrite (config, lane system, scoring, game logic), MinigameScene/MinigameHudScene, portal triggers (264 tests) [feat/minigame-architecture]
- __2026-02-12__ — G7: Runtime & Observability — Server config validation, ServerDiagnostics with ring buffer, health + diagnostics endpoints, unified dev command (218 tests) [feat/runtime-observability]
- __2026-02-12__ — G6: @hub-of-wyn/shared Publishing Preparation — Meta schemas, package.json for npm, explicit subpath exports, self-containment verification (182 tests) [feat/shared-publishing]
- __2026-02-12__ — G5: Menu and Flow — Title screen, pause overlay, settings with localStorage persistence, menu navigation on all result scenes (164 tests) [feat/menu-flow]
- __2026-02-12__ — G4: Hazards — Enemy patrol AI, damage/invincibility, death/respawn, game-over scene (147 tests) [feat/enemy-ai]
- __2026-02-12__ — G3: Gameplay Loop — Collectible pickup, HUD, level-complete, scoring with star rating, 2-level forest world (110 tests) [feat/gameplay-loop]
- __2026-02-11__ — G2: Visual Identity — Sprite player + animation, Tiled tilemap, enemy/collectible sprites (83 tests) [feat/visual-identity]
- __2026-02-11__ — G1: Scene Infrastructure — BaseScene, container wiring, CameraController, PreloadScene, scene chain (48 tests) [feat/scene-infrastructure]
- __2026-02-11__ — MVP: colored-rect platformer with PlayerController, hexagonal architecture (ports/adapters), full CI pipeline (6 gates), 32 tests [feat/minimal-playable-game]
