---
title: Active Plan
last_updated: 2026-02-11
---

# Active Plan

## Snapshot

- __Active:__ G1 — Scene Infrastructure [feat/scene-infrastructure]
- __Next ready:__ G2, G3, G4 (after G1 merges)
- __Blocked:__ none
- __Last milestone:__ 2026-02-11 — MVP colored-rect platformer (32 tests) [feat/minimal-playable-game]
- __Gates:__ all green (48 tests)

## Goals

### G1: Scene Infrastructure

> __Status:__ in-progress
> __Requires:__ none
> __Benefits from:__ none
> __Unlocks:__ G2, G3, G4
> __Branch:__ feat/scene-infrastructure

BaseScene with container access, full Container wiring, camera module, PreloadScene with asset manifest. The platform everything else builds on.

- [x] BaseScene class with typed container access pattern
- [x] Full Container wiring in main.ts (all ports resolved)
- [x] Camera module (modules/camera/) with port interface
- [x] PreloadScene with asset manifest loading
- [x] Full scene chain: Boot -> Preload -> Platformer

### G2: Visual Identity

> __Status:__ not-started
> __Requires:__ G1
> __Benefits from:__ none
> __Unlocks:__ G3, G4, G5
> __Branch:__ --

Sprites, animation, and tile rendering replace colored rectangles. The game looks like a game.

- [ ] Sprite-based player replacing colored rectangle
- [ ] Player animation state machine (idle, run, jump, fall)
- [ ] Tilemap rendering from Tiled JSON
- [ ] Enemy sprites and patrol animation
- [ ] Collectible sprites and pickup animation

### G3: Gameplay Loop

> __Status:__ not-started
> __Requires:__ G1
> __Benefits from:__ G2
> __Unlocks:__ G5
> __Branch:__ --

Collectibles, HUD, level-end trigger, and scoring give the player a goal.

- [ ] Collectible module (modules/collectible/) with pickup logic
- [ ] HUD scene (score, health, level indicator)
- [ ] Level-end trigger and level-complete flow
- [ ] Scoring module with star rating calculation
- [ ] At least one complete world with 2-3 levels

### G4: Hazards

> __Status:__ not-started
> __Requires:__ G1
> __Benefits from:__ G2
> __Unlocks:__ G5
> __Branch:__ --

Enemy patrol, damage, death/respawn, and game-over add risk to the platforming.

- [ ] Enemy module (modules/enemy/) with patrol AI
- [ ] Damage and health system (player takes hits)
- [ ] Death and respawn mechanic
- [ ] Game-over trigger when health reaches zero
- [ ] Enemy-player collision detection via physics port

### G5: Menu and Flow

> __Status:__ not-started
> __Requires:__ G3, G4
> __Benefits from:__ G2
> __Unlocks:__ none
> __Branch:__ --

Title screen, pause, game-over screen, settings, and persistence make the game self-contained.

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

## Completed Log

- __2026-02-11__ — MVP: colored-rect platformer with PlayerController, hexagonal architecture (ports/adapters), full CI pipeline (6 gates), 32 tests [feat/minimal-playable-game]
