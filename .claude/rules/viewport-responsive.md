---
paths:
  - apps/client/src/modules/viewport/**
  - apps/client/src/core/ports/viewport.ts
  - apps/client/src/core/adapters/phaser-viewport.ts
  - apps/client/src/core/adapters/touch-input.ts
  - apps/client/src/core/adapters/adaptive-input.ts
  - apps/client/index.html
---

# Viewport & Mobile Responsive

This project supports desktop and mobile from a single codebase using a four-layer model:
Shell Viewport -> Canvas Container -> World Size Computation -> Engine Display Scale.

## Reference

`docs/plans/mobile-responsive-plan.md` — the authoritative responsive guide.

## Zone Rules

- **`modules/viewport/`** is pure TS. No Phaser, no DOM, no browser globals. Layout math only.
  - `computeWorldSize()` — fixed height, variable width
  - `createSafeZone()` — centered authored-content rectangle
  - `scaleFontSize()`, `scaleFontSizeStr()` — HUD scaling compensation (TEXT_SCALE_FLOOR prevents double-dip with FIT)
  - `anchorInSafeZone()` — 5-point anchor positioning (top-left, top-right, bottom-left, bottom-right, center)
- **`core/ports/viewport.ts`** defines `IViewportProvider` interface.
- **`core/adapters/phaser-viewport.ts`** implements `IViewportProvider` using module functions + DOM probe for safe area insets.
- **`core/adapters/touch-input.ts`** implements `IInputProvider` (existing port) using DOM `PointerEvent` overlay with pointer capture for multi-touch.
- **`core/adapters/adaptive-input.ts`** composites keyboard + touch via logical OR, auto-selects via settings.

## Layout Rules (scenes)

- **Safe zone anchoring.** HUD elements anchor to `container.viewport.safeZone`, not raw `(0, 0)` or `this.scale.width/height`.
- **HUD text scaling.** Use `container.viewport.scaleFontSize(baseSizePx)`. Never hardcode pixel font sizes in scenes without scale compensation.
- **Resize response.** Scenes listen for viewport changes through the registry pattern, not ad-hoc `window.addEventListener('resize', ...)`.
- **Physics bounds.** Update `physics.world.setBounds()` on resize to match new world dimensions.

## Touch Rules

- **Port compliance.** Touch adapters implement `IInputProvider` — same ActionKey model as keyboard. No separate touch API.
- **DOM PointerEvent.** Use DOM `PointerEvent` on the canvas element, not Phaser's input system, for touch controls. Handle `pointercancel` for OS interrupts.
- **44px minimum.** All touch targets (virtual buttons, interactive UI) must be at least 44x44px (WCAG 2.5.8).
- **Listener cleanup.** All DOM event listeners must be removed on scene shutdown. Track listeners for cleanup.
- **Coordinate conversion.** CSS-to-world coordinate conversion must account for FIT mode scaling.

## HTML Rules

- **`touch-action: none`** on the canvas container. Non-negotiable — prevents browser gesture interference.
- **`viewport-fit=cover`** in the viewport meta tag for safe area inset support.
- **No scrolling.** `overflow: hidden` on body. The game surface is the page.

## Constants (modules/viewport/viewport-math.ts)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `BASE_HEIGHT` | 720 | Matches authored content, never changes |
| `MIN_WIDTH` | 960 | 4:3 at 720 height |
| `MAX_WIDTH` | 1600 | Ultra-wide clamp |
| `SAFE_ZONE_WIDTH` | 1280 | Authored content area |
| `SAFE_ZONE_HEIGHT` | 720 | Full height |

## Testing

- `modules/viewport/` functions are **pure** — test exhaustively with device-scenario tables (4:3, 16:9, 20:9, 21:9, iPad).
- Touch input adapter tests: mock Phaser first (`vi.mock('phaser')`), then dynamic import the adapter.
- No real device or DOM needed for layout math tests.
