---
title: Active Plan
last_updated: 2026-02-12
---

# Active Plan

## Snapshot

- __Active:__ none
- __Next ready:__ G5
- __Blocked:__ none
- __Last milestone:__ 2026-02-12 — G4 Hazards (147 tests) [feat/enemy-ai]
- __Gates:__ all green (147 tests)

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

> __Status:__ ready
> __Requires:__ G3, G4
> __Benefits from:__ G2
> __Unlocks:__ none
> __Branch:__ --

Title screen, pause, game-over screen, settings, and persistence make the game self-contained. Design tokens (colors, spacing, typography) provide consistent UI across all menu scenes.

- [ ] Design tokens module (modules/ui/design-tokens.ts) — color palette, spacing scale, z-index layers (pure TS, zone-safe)
- [ ] Title screen and main menu scene
- [ ] Pause scene (overlay)
- [ ] Game-over scene with retry/quit options
- [ ] Settings scene with LocalStorageAdapter persistence
- [ ] Level-complete scene connecting to next level or menu

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

- __2026-02-12__ — G4: Hazards — Enemy patrol AI, damage/invincibility, death/respawn, game-over scene (147 tests) [feat/enemy-ai]
- __2026-02-12__ — G3: Gameplay Loop — Collectible pickup, HUD, level-complete, scoring with star rating, 2-level forest world (110 tests) [feat/gameplay-loop]
- __2026-02-11__ — G2: Visual Identity — Sprite player + animation, Tiled tilemap, enemy/collectible sprites (83 tests) [feat/visual-identity]
- __2026-02-11__ — G1: Scene Infrastructure — BaseScene, container wiring, CameraController, PreloadScene, scene chain (48 tests) [feat/scene-infrastructure]
- __2026-02-11__ — MVP: colored-rect platformer with PlayerController, hexagonal architecture (ports/adapters), full CI pipeline (6 gates), 32 tests [feat/minimal-playable-game]
