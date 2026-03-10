---
paths:
  - apps/client/src/scenes/**
---

# Thin View Layer: scenes/

Scenes are the **view zone** — they render state, they don't compute it.

## Rules

- **No game logic.** Domain logic lives in `modules/`. Scenes call module functions and render results.
- **No domain iteration.** If a scene method iterates over domain data (a `for` loop not directly creating/updating Phaser objects), extract the iteration and filtering logic to a module function.
- **Port interfaces only.** Reference container ports by interface type (e.g. `IGameClock`), never cast to concrete adapters (e.g. `as PhaserClock`).
- **Thin heuristic:** If a scene method has more than one `if`/`switch` branch that isn't directly about Phaser rendering, extract the logic to a module.

## Allowed imports

- `modules/` — domain logic
- `core/` — services, adapters, container, ports
- `@hub-of-wyn/shared` — schemas + types

## Viewport & Layout

- **Safe zone anchoring.** Position HUD and menu UI relative to `container.viewportProvider.safeZone`, not raw world origin.
- **Scaled text.** Use `scaleFontSize()` from `modules/viewport/hud-scale` for any text that must remain readable across devices.
- **No inline layout math.** World size computation, safe zone calculation, and HUD scaling live in `modules/viewport/`. Scenes consume results via `container.viewportProvider`.
- **Resize cleanup.** Track registry listeners and remove them on scene shutdown to prevent listener accumulation across scene restarts.

## Forbidden imports

- `server/`, `hono`, raw `fetch` — use `core/services/network-manager`
