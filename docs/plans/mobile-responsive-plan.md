---
title: Responsive Multi-Platform Development Guide
category: plans
component: viewport
status: reference
last_updated: 2026-03-09
tags: [mobile, viewport, touch, responsive, reference]
priority: high
---

# Responsive Multi-Platform Development Guide

> Machine-readable agentic reference for building a web-first game that works on desktop and mobile from a single codebase. Extracted from a production SvelteKit + Phaser 4 arcade shooter monorepo. Contains hard-won lessons from shipping on phones, tablets, and desktops.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Layer Model](#layer-model)
- [World Size Computation](#layer-3-world-size-computation)
- [Safe Zone Model](#safe-zone-model)
- [HUD Scaling System](#hud-scaling-system)
- [Input Abstraction Layer](#input-abstraction-layer)
- [Hardware Safe Area Insets](#hardware-safe-area-insets)
- [App Shell (SvelteKit)](#app-shell-sveltekit)
- [Orientation Handling](#orientation-handling)
- [Resize Pipeline](#resize-pipeline)
- [Settings Bridge](#settings-bridge)
- [Frame-Rate Independence](#frame-rate-independence)
- [Hard-Won Mobile Lessons](#hard-won-mobile-lessons)
- [Testing Strategy](#testing-strategy)
- [Implementation Checklist](#implementation-checklist)
- [Reference File Map](#reference-file-map)

---

## Architecture Overview

The system uses a **four-layer rendering pipeline** to achieve responsive gameplay across desktop monitors, tablets, and landscape phones without any platform-specific code paths.

### Core Principles

1. **Fixed height, variable width** -- the world height never changes; width stretches with aspect ratio.
2. **Safe zone for authored content** -- all gameplay-critical spawning, HUD anchoring, and design density targets a fixed rectangle centered in the variable-width world.
3. **Single input contract** -- all input devices produce the same `InputIntent` struct; the game loop is input-agnostic.
4. **Shell owns chrome, engine owns play surface** -- the web framework handles menus, overlays, settings, and orientation warnings; the game engine handles only rendering, physics, and gameplay input.
5. **Pure functions for layout math** -- world sizing, safe zones, and HUD scaling are pure functions with zero engine dependency, making them fully unit-testable.

### Boundary Rules

```text
App Shell (SvelteKit)         Game Engine (Phaser)
---------------------         -------------------
Routes, menus, settings       Scenes, rendering, physics
Overlays (pause, rotate)      Input adapters, HUD text
Persistence (localStorage)    Audio playback
CSS safe-area-inset-*         World coordinate system

Communication: GameHandle (typed event emitter + settings bridge)
Direction: Shell -> Engine (settings, lifecycle)
           Engine -> Shell (score, death, stage-clear, ready, error)
No engine types leak outside the game package.
```

---

## Layer Model

The rendering pipeline flows through four layers, each responsible for one concern.

### Layer 1: Shell Viewport

**Owner**: Web framework (SvelteKit route)

```css
.play-page {
  position: fixed;
  inset: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #000;
}
```

- Uses `position: fixed` + `inset: 0` to fill the browser viewport.
- No scrolling, no overflow. The game surface IS the page.
- Safe area padding handled at overlay level, not here.

### Layer 2: Canvas Container

**Owner**: Game mount component

```css
.game-container {
  width: 100%;
  height: 100%;
  background: #000;
  touch-action: none;  /* CRITICAL: prevents browser gesture interference */
}
```

- **`touch-action: none` is non-negotiable** -- without it, pull-to-refresh, pinch-to-zoom, and swipe navigation will fight the game for touch events. This single CSS property prevents all of them. We learned this the hard way: on Chrome Android, even a slight vertical drag triggers pull-to-refresh mid-gameplay.
- Container spans the full shell viewport.
- The game engine reads `container.clientWidth` and `container.clientHeight` to compute world size.

### Layer 3: World Size Computation

**Owner**: Pure function (no engine dependency)

```typescript
// Constants
const WORLD_HEIGHT = 600;       // fixed -- never changes
const MIN_WORLD_WIDTH = 800;    // 4:3 minimum
const MAX_WORLD_WIDTH = 1340;   // ultra-wide clamp

function computeWorldSize(
  containerWidth: number,
  containerHeight: number,
  minWidth = MIN_WORLD_WIDTH,
  maxWidth = MAX_WORLD_WIDTH,
  baseHeight = WORLD_HEIGHT,
): { width: number; height: number } {
  const containerAspect = containerWidth / containerHeight;
  const rawWidth = baseHeight * containerAspect;
  const width = Math.max(minWidth, Math.min(Math.round(rawWidth), maxWidth));
  return { width, height: baseHeight };
}
```

**Behavior by device class**:

| Device | Aspect | Container (example) | World Size |
|---|---|---|---|
| Desktop 16:9 | 1.78 | 1920x1080 | 1067x600 |
| Desktop 4:3 | 1.33 | 1024x768 | 800x600 |
| Phone 20:9 | 2.22 | 960x432 | 1200x600* |
| Phone 19.5:9 | 2.17 | 844x390 | 1200x600* |
| iPad landscape | 1.33 | 1024x768 | 800x600 |
| Ultra-wide 21:9 | 2.33 | 2560x1080 | 1340x600 |

*Clamped by `MAX_WORLD_WIDTH`.

### Layer 4: Engine Display Scale

**Owner**: Game engine scale manager

```typescript
const game = new GameEngine({
  width: worldWidth,
  height: worldHeight,
  scale: {
    mode: Scale.FIT,           // scale to fill container
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    arcade: {
      fixedStep: true,         // frame-rate independent physics
      gravity: { x: 0, y: 0 },
    },
  },
});
```

- `FIT` mode scales the world down to fit the container while preserving aspect ratio.
- On phones, this means the 600px-tall world is displayed at ~390 CSS pixels -- text and sprites shrink proportionally.
- This is the ONLY place display scaling happens. The HUD scaling system compensates for it.

---

## Safe Zone Model

The safe zone is a fixed-size rectangle (800x600) centered in the variable-width world. It serves as the authored gameplay area.

### Purpose

- **Enemy spawning**: All enemy X positions are computed relative to safe zone bounds, not world bounds. This prevents enemies from spawning in side gutters on wide screens where the player can't easily reach them.
- **HUD anchoring**: Score, lives, and wave text anchor to safe zone origin, not world origin.
- **Player start position**: Centered in the safe zone.
- **Boss positioning**: Boss anchor point uses safe zone center.
- **Side gutters as touch zones**: On wide phones, the side gutters outside the safe zone serve as visual breathing room for touch controls. No gameplay content spawns there.

### Interface

```typescript
interface SafeZone {
  readonly x: number;       // left edge offset from world origin
  readonly y: number;       // top edge offset (usually 0)
  readonly width: number;   // always 800
  readonly height: number;  // always 600
  readonly centerX: number;
  readonly centerY: number;
  readonly right: number;
  readonly bottom: number;
}

function createSafeZone(worldWidth: number, worldHeight: number): SafeZone {
  const x = (worldWidth - SAFE_ZONE_WIDTH) / 2;
  const y = (worldHeight - SAFE_ZONE_HEIGHT) / 2;
  return {
    x, y,
    width: SAFE_ZONE_WIDTH,
    height: SAFE_ZONE_HEIGHT,
    centerX: x + SAFE_ZONE_WIDTH / 2,
    centerY: y + SAFE_ZONE_HEIGHT / 2,
    right: x + SAFE_ZONE_WIDTH,
    bottom: y + SAFE_ZONE_HEIGHT,
  };
}
```

### Visual Diagram

```text
+-------------------------------------------+
|               WORLD (1067x600)             |
|                                            |
|  +-- gutter --+-- SAFE ZONE --+-- gutter --+
|  |   (133px)  |   (800x600)   |   (134px)  |
|  |            |               |            |
|  |  (touch    | (enemy spawns | (touch     |
|  |   zone)    |  HUD anchors  |  zone)     |
|  |            |  player start) |           |
|  +------------+---------------+------------+
+-------------------------------------------+
```

At 4:3 (800x600), the safe zone fills the entire world -- no gutters.

### Usage Pattern

```typescript
// Spawning an enemy
const safeZone = registry.get('safeZone');
const spawnX = safeZone.x + Math.random() * safeZone.width;
const spawnY = safeZone.y - 40; // above visible area

// Anchoring HUD text
const hudX = safeZone.x + 10;
const hudY = safeZone.y + 10;

// Updating spawn bounds on resize
waveManager.updateSpawnBounds(safeZone.width, safeZone.x);
```

---

## HUD Scaling System

On small displays, the engine's `FIT` mode already shrinks everything. Without compensation, HUD text becomes unreadably small. The HUD scaling system prevents this "double-dip" shrink.

### The Double-Dip Problem (Hard-Won Lesson)

On a phone with `displayHeight = 390`:

1. **FIT scaling** reduces 600 world-pixels to 390 CSS-pixels (0.65x).
2. If HUD text is also scaled by `displayHeight / 600 = 0.65`, a 16px font becomes `16 * 0.65 = 10.4px` in world coords.
3. FIT then renders that 10.4px world-pixel font at `10.4 * 0.65 = 6.7 CSS pixels` on screen -- **unreadable**.

The fix: **TEXT_SCALE_FLOOR = 1.0** -- text scaling never goes below 1.0. FIT handles the only reduction.

### Scale Factors

```typescript
const REF_HEIGHT = 600;
const SCALE_FLOOR = 0.6;
const SCALE_CEILING = 1.5;
const TEXT_SCALE_FLOOR = 1.0;  // prevents double-dip with FIT
const HUD_TEXT_MIN_PX = 10;
const BOSS_LABEL_MIN_PX = 9;

function computeScaleFactor(_displayWidth: number, displayHeight: number): number {
  const rawFactor = displayHeight / REF_HEIGHT;
  return Math.max(SCALE_FLOOR, Math.min(rawFactor, SCALE_CEILING));
}

function computeTextScaleFactor(displayWidth: number, displayHeight: number): number {
  return Math.max(computeScaleFactor(displayWidth, displayHeight), TEXT_SCALE_FLOOR);
}

function scaleFontSize(baseSize: number, factor: number, minPx = 0): number {
  return Math.max(baseSize * factor, minPx);
}

function scaleMargin(baseMargin: number, factor: number): number {
  return baseMargin * factor;
}
```

### Application

HUD elements call `scaleFontSize` at creation and on resize:

```typescript
const factor = computeTextScaleFactor(displayWidth, displayHeight);
scoreText.setFontSize(scaleFontSize(16, factor, HUD_TEXT_MIN_PX));
bossLabel.setFontSize(scaleFontSize(12, factor, BOSS_LABEL_MIN_PX));
```

---

## Input Abstraction Layer

All input devices produce the same `InputIntent` interface. The game loop never knows which device is active.

### InputIntent Contract

```typescript
interface InputIntent {
  /** Movement direction, each axis normalized to -1..1 */
  moveVector: { x: number; y: number };
  /** When true, moveVector is a position delta (pixels) not a velocity direction */
  isPositionDelta: boolean;
  /** Primary weapon firing */
  fireHeld: boolean;
  /** Secondary ability (reserved) */
  secondaryHeld: boolean;
  /** Pause toggle (reserved) */
  pausePressed: boolean;
}
```

### InputAdapter Lifecycle

```typescript
interface InputAdapter {
  create(scene: Scene): void;   // bind to scene/DOM
  update(): InputIntent;        // called each frame
  clear(): void;                // zero out intent (called on pause)
  destroy(): void;              // unbind all listeners
}
```

### Three Adapter Implementations

#### 1. KeyboardInput (desktop)

- Reads cursor keys + WASD each frame.
- Returns direction vector normalized to -1..1.
- `isPositionDelta = false` -- moveVector is a velocity direction.
- Diagonal movement normalized by `1/sqrt(2)`.

```typescript
// Game loop application (velocity-based)
const vx = intent.moveVector.x * PLAYER_SPEED;
const vy = intent.moveVector.y * PLAYER_SPEED;
body.setVelocity(vx, vy);
```

#### 2. TouchInput (mobile -- joystick mode)

- Floating virtual joystick appears on touch-down.
- **Left half of screen only** -- right half reserved for future secondary actions.
- Uses **DOM `PointerEvent` listeners on the canvas element**, NOT the engine's input system. This was a deliberate choice: Phaser 4 RC's touch handling had inconsistencies across versions, while DOM Pointer Events are stable and well-specified.
- Dead zone (10px) prevents drift. Max radius (60px) clamps magnitude.
- `isPositionDelta = false` -- moveVector is a normalized velocity direction.
- Semi-transparent joystick visual (alpha 0.35) to avoid obscuring gameplay.

**Critical: DOM-to-world coordinate conversion**:

```typescript
// This conversion must account for CSS scaling of the canvas
const rect = canvas.getBoundingClientRect();
const cssX = e.clientX - rect.left;
const cssY = e.clientY - rect.top;
const worldX = (cssX / rect.width) * sceneWidth;
const worldY = (cssY / rect.height) * sceneHeight;
```

#### 3. RelativeTouchInput (mobile -- default, recommended)

- 1:1 finger tracking: ship moves the exact distance your finger moves.
- No joystick visual, no dead zone. Direct and precise.
- Records ship position + finger anchor at touch start; computes target position from finger delta.
- `isPositionDelta = true` -- moveVector is a pixel offset to apply directly.
- Requires a reference to the player sprite (via `setPlayer()` after creation).

```typescript
// Game loop application (position-delta)
player.x = clamp(player.x + intent.moveVector.x, margin, width - margin);
player.y = clamp(player.y + intent.moveVector.y, margin, height - margin);
body.setVelocity(0, 0); // MUST clear physics velocity when using position deltas
```

### Adapter Selection Logic

```typescript
function selectInputAdapter(): InputAdapter {
  const controlScheme = settings.controlScheme;  // 'wasd' | 'arrows' | 'touch'
  const touchStyle = settings.touchStyle;        // 'relative' | 'joystick'
  const touchEnabled = settings.touchControlsEnabled; // boolean

  // Explicit keyboard
  if (controlScheme === 'arrows') return new KeyboardInput();

  // Explicit touch
  if (controlScheme === 'touch') {
    return touchStyle === 'joystick' ? new TouchInput() : new RelativeTouchInput();
  }

  // Auto-detect (default path for 'wasd')
  if (touchEnabled !== false) {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch) {
      return touchStyle === 'joystick' ? new TouchInput() : new RelativeTouchInput();
    }
  }

  return new KeyboardInput();
}
```

### Game Loop Dispatch

The game loop handles both movement styles with a single branch:

```typescript
function handleMovement(): void {
  const intent = inputAdapter.update();

  if (intent.isPositionDelta) {
    // Relative touch: apply pixel delta directly, clamp to world bounds
    player.x = clamp(player.x + intent.moveVector.x, margin, width - margin);
    player.y = clamp(player.y + intent.moveVector.y, margin, height - margin);
    body.setVelocity(0, 0);
  } else {
    // Velocity-based: keyboard or joystick
    body.setVelocity(
      intent.moveVector.x * PLAYER_SPEED,
      intent.moveVector.y * PLAYER_SPEED,
    );
  }
}
```

---

## Hardware Safe Area Insets

Modern phones have notches, camera cutouts, rounded corners, and gesture bars that occlude content. The safe area inset system pushes UI elements inward.

### Two Layers of Protection

#### 1. CSS Layer (App Shell Overlays)

The shell overlay buttons use CSS `env()` directly:

```css
.overlay-buttons {
  position: absolute;
  top: calc(8px + env(safe-area-inset-top, 0px));
  right: calc(8px + env(safe-area-inset-right, 0px));
}
```

#### 2. Game World Layer (In-Engine HUD)

The engine cannot use CSS `env()`. Instead, a DOM probe reads the values and converts them to world coordinates:

```typescript
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') return ZERO_INSETS; // SSR guard

  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '0';
  div.style.height = '0';
  div.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  div.style.paddingRight = 'env(safe-area-inset-right, 0px)';
  div.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  div.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
  document.body.appendChild(div);

  const cs = getComputedStyle(div);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  div.remove();
  return insets;
}

// Game world is larger than display (FIT mode scales it down),
// so insets need to be scaled UP to world coordinates
function toWorldInsets(insets, gameWidth, gameHeight, displayWidth, displayHeight) {
  const scaleX = gameWidth / displayWidth;
  const scaleY = gameHeight / displayHeight;
  return {
    top: insets.top * scaleY,
    right: insets.right * scaleX,
    bottom: insets.bottom * scaleY,
    left: insets.left * scaleX,
  };
}
```

The converted insets are stored in the game registry and **re-probed on every resize** (orientation changes alter which insets are active).

---

## App Shell (SvelteKit)

### Component Hierarchy

```text
/play route
  +page.svelte          -- full-viewport shell (.play-page)
    GameCanvas.svelte   -- mounts game engine, passes settings
    GameOverlay.svelte  -- pause/mute buttons (z-index: 20)
    RotateOverlay.svelte -- portrait warning (z-index: 50)
```

### GameCanvas Mount Pattern

The game engine accesses `window` at module scope and CANNOT be imported during SSR. Use dynamic import inside `onMount`:

```typescript
onMount(() => {
  // MUST use dynamic import -- top-level import causes SSR crash
  import('@my/game').then(({ mountGame }) => {
    handle = mountGame(container, {
      basePath: base,
      settings: {
        masterVolume: s.masterVolume,
        touchControlsEnabled: s.touchControlsEnabled,
        controlScheme: s.controlScheme,
        touchStyle: s.touchStyle,
      },
    });
  });
});

onDestroy(() => {
  handle?.destroy();
  handle = null;
});
```

**Lesson**: Svelte's `onMount` return type is a sync cleanup function. You CANNOT use `async onMount`. Use `.then()` inside a sync `onMount` for async work.

### GameHandle API

```typescript
interface GameHandle {
  destroy(): void;
  pause(): void;
  resume(): void;
  updateSettings(partial: Partial<RuntimeSettings>): void;
  emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void;
  on<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
  off<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
}

interface GameEventMap {
  score: [score: number];
  death: [];
  'stage-clear': [stageIndex: number, score: number, currency: number];
  'scene-change': [scene: string];
  ready: [];
  error: [error: Error];
}
```

### Overlay Design Rules

- **pointer-events: none** on overlay container -- clicks pass through to the canvas.
- **pointer-events: auto** on individual buttons only.
- **min-width/min-height: 44px** on all touch targets (WCAG 2.5.8 minimum).
- **-webkit-tap-highlight-color: transparent** to suppress blue flash on iOS.
- **clamp()** for responsive text: `font-size: clamp(0.75rem, 2vw, 1rem)`.

---

## Orientation Handling

Portrait mode is not supported for landscape-oriented games. Instead of broken layout, show a rotate prompt.

### Implementation

```svelte
<script>
let isPortrait = $state(false);
let isTouchDevice = $state(false);

$effect(() => {
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  function check() { isPortrait = window.innerWidth < window.innerHeight; }
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
});
</script>

{#if isPortrait && isTouchDevice}
  <div class="rotate-overlay" role="alert" aria-live="assertive">
    <!-- rotating phone icon + "Rotate your device" message -->
  </div>
{/if}
```

### Rules

- **Only shown on touch devices** -- desktop users may have tall browser windows intentionally.
- `z-index: 50` -- above game overlay (20) and game canvas.
- Uses `role="alert"` + `aria-live="assertive"` for screen reader announcement.
- Does NOT pause the game -- the overlay just blocks interaction visually.

---

## Resize Pipeline

When the browser window resizes (orientation change, split-screen, desktop resize):

```text
Browser resize event
  -> Engine scale.resize event
  -> Debounce 100ms (prevents thrashing during drag-resize)
  -> computeWorldSize(newContainerW, newContainerH)
  -> Compare with current dimensions (skip if unchanged)
  -> game.scale.setGameSize(newWidth, newHeight)
  -> createSafeZone(newWidth, newHeight) -> registry
  -> getSafeAreaInsets() -> registry (re-probe: orientation may have changed)
  -> Registry 'changedata-worldWidth' event fires
  -> Active scene reacts:
     -> Physics world bounds updated
     -> Spawn bounds updated to new safe zone
     -> Background resized to new world dimensions
     -> HUD text repositioned to new safe zone origin
```

### Key Details

- **Debounce**: 100ms timeout prevents rapid setGameSize calls during drag-resize.
- **Skip-if-unchanged**: Early return when computed size hasn't changed.
- **Registry-driven**: Scenes listen on `registry.events.on('changedata-worldWidth', fn)` to react.
- **Cleanup on destroy**: Resize timer cleared, event listeners removed via tracked listener array.
- **Physics bounds**: Must update `physics.world.setBounds()` to match new world size, or player/bullets get stuck at old boundaries.

---

## Settings Bridge

Settings flow from the web framework to the game engine through a typed bridge.

### Schema (Validated with Zod)

```typescript
const ControlSchemeSchema = z.enum(['wasd', 'arrows', 'touch']);
const TouchStyleSchema = z.enum(['relative', 'joystick']);

const GameSettingsSchema = z.object({
  masterVolume: z.number().min(0).max(1).default(0.8),
  sfxVolume: z.number().min(0).max(1).default(1.0),
  musicVolume: z.number().min(0).max(1).default(0.7),
  controlScheme: ControlSchemeSchema.default('wasd'),
  touchControlsEnabled: z.boolean().default(true),
  touchStyle: TouchStyleSchema.default('relative'),
  screenShake: z.number().min(0).max(1).default(0.7),
  showFps: z.boolean().default(false),
});
```

### Flow

```text
localStorage <-> Settings Store <-> GameCanvas <-> mountGame() <-> Game Registry <-> Scenes
                 (Svelte runes)     ($effect)      (options)       (key-value)
```

1. **Load**: Settings store reads localStorage, parses through schema (invalid data silently gets defaults).
2. **Mount**: Initial settings passed via `mountGame(container, { settings })`.
3. **Runtime update**: Shell `$effect` watches settings and calls `handle.updateSettings(partial)`.
4. **Engine side**: `updateSettings` writes to game registry; scenes read from registry each frame.
5. **Persist**: Store writes to localStorage on every update; `storage` event syncs across tabs.

---

## Frame-Rate Independence

All movement and timing must be frame-rate independent to work across 30fps phones and 144Hz monitors.

### Rules

1. **Fixed-step physics**: `fixedStep: true` in physics config. The physics engine steps at a constant rate regardless of display refresh.
2. **Velocity-based movement**: Use `body.setVelocity()`, never `body.x += speed`. The physics engine integrates velocity over its fixed timestep.
3. **Time-based timers**: All cooldowns, spawn intervals, and animation timers compare against `time` (milliseconds from scene start), never frame counts.
4. **No per-frame deltas for gameplay**: Don't multiply by `delta` for movement -- `fixedStep` handles this. Use `delta` only for visual-only effects (parallax scrolling, particle alpha fade).

---

## Hard-Won Mobile Lessons

These are the bugs, gotchas, and anti-patterns discovered through real device testing. Each was painful to debug. Read this section before implementing.

### 1. Audio Unlock on iOS/Safari

**Problem**: Mobile browsers require a user gesture before playing audio. The Web Audio API `AudioContext` starts in a `suspended` state.

**Solution**: Use a "tap to start" menu screen. On the first user gesture, explicitly unlock audio:

```typescript
private launchGame(): void {
  // Unlock audio context on first user gesture
  if (this.sound.locked) {
    this.sound.unlock();
  }
  // ...proceed to game scene
}
```

**Lesson**: Do NOT try to auto-play music on scene load. It will silently fail. Always gate gameplay behind a user gesture (tap/click) and unlock audio in that handler.

### 2. Visibility Handling -- Double-Pause Race

**Problem**: Phaser's built-in `VisibilityHandler` already pauses/resumes the game when the tab loses/gains focus. If your shell ALSO adds a `visibilitychange` listener that calls `handle.pause()`/`handle.resume()`, you get a race condition: two pause/resume calls fire, causing erratic behavior (music plays during pause, input state corrupts).

**Solution**: Let the engine's `VisibilityHandler` handle pause/resume natively. The shell should NOT add a redundant `visibilitychange` listener. Instead, listen for the engine's `game.events.on('pause', ...)` event to clear input state:

```typescript
// Clear input state on game-level pause (fired by VisibilityHandler
// and by explicit handle.pause() calls)
this.game.events.on('pause', () => {
  this.inputAdapter.clear();
});
```

**Critical**: Use `game.events.on('pause')` (game-level), NOT `scene.events.on('pause')` (scene-level). Scene-level pause events do NOT fire when `game.pause()` is called -- only when `scene.sys.pause()` is called.

### 3. SSR Guard for Game Engine Import

**Problem**: Game engines like Phaser access `window` at the top of their module. If imported during SSR (server-side rendering), the build crashes with `window is not defined`.

**Solution**: ALWAYS use dynamic `import()` inside `onMount`, never a top-level import:

```typescript
// WRONG -- crashes during SSR
import { mountGame } from '@my/game';

// CORRECT -- only imports in browser
onMount(() => {
  import('@my/game').then(({ mountGame }) => {
    // safe to use Phaser here
  });
});
```

### 4. Svelte Runes in .svelte.ts Files

**Problem**: Svelte 5 runes (`$state`, `$derived`, `$effect`) only work in files processed by the Svelte compiler. Plain `.ts` files are NOT processed, causing `$state` to be treated as a regular variable, leading to SSR 500 errors that are extremely hard to diagnose.

**Solution**: Any file using runes MUST have the `.svelte.ts` extension:

```text
settings.svelte.ts  // CORRECT -- Svelte compiler processes runes
settings.ts         // WRONG -- $state is not compiled, causes runtime crash
```

### 5. onMount Cannot Be Async

**Problem**: Svelte's `onMount` expects a sync return value (a cleanup function or void). Making it `async` causes the cleanup function to be wrapped in a Promise, which Svelte silently ignores -- the cleanup never runs.

**Solution**: Use `.then()` inside a sync `onMount`:

```typescript
// WRONG
onMount(async () => {
  const { mountGame } = await import('@my/game');
  // cleanup function returned by async function is ignored
  return () => handle?.destroy();
});

// CORRECT
onMount(() => {
  import('@my/game').then(({ mountGame }) => {
    handle = mountGame(container, options);
  });
});
onDestroy(() => {
  handle?.destroy();
});
```

### 6. DOM PointerEvents over Engine Input for Touch

**Problem**: Game engine touch input systems (e.g., Phaser's input plugin) may have inconsistencies across RC versions, especially with multi-touch tracking, pointer capture, and coordinate mapping when the canvas is CSS-scaled.

**Solution**: Use raw DOM `PointerEvent` listeners directly on the canvas element. This gives you:

- Consistent behavior across engine versions
- Proper `pointerId` tracking for multi-touch
- Reliable `pointercancel` handling (critical for when the OS steals a touch, e.g., notification panel swipe)
- Full control over coordinate conversion from CSS pixels to world coordinates

```typescript
canvas.addEventListener('pointerdown', this.boundPointerDown);
canvas.addEventListener('pointermove', this.boundPointerMove);
canvas.addEventListener('pointerup', this.boundPointerUp);
canvas.addEventListener('pointercancel', this.boundPointerCancel);  // don't forget this!
```

**Always handle `pointercancel`** -- it fires when the OS interrupts a touch (swipe from edge, notification, call incoming). Without it, the joystick or finger tracking gets stuck in a "down" state.

### 7. Touch Coordinate Conversion Must Account for CSS Scaling

**Problem**: The canvas element is rendered at CSS dimensions (from `getBoundingClientRect()`) but the game world has different logical dimensions. A touch at CSS position (200, 150) is NOT at world position (200, 150).

**Solution**: Always convert through the CSS-to-world ratio:

```typescript
private toWorldCoords(e: PointerEvent): { x: number; y: number } | null {
  if (!this.canvas || !this.scene) return null;
  const rect = this.canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  const worldX = (cssX / rect.width) * this.scene.scale.width;
  const worldY = (cssY / rect.height) * this.scene.scale.height;
  return { x: worldX, y: worldY };
}
```

### 8. Clear Physics Velocity When Using Position Deltas

**Problem**: When using `isPositionDelta` (relative touch), you set `player.x` directly. If you forget to also call `body.setVelocity(0, 0)`, the physics engine applies residual velocity from the previous frame, causing the ship to drift.

**Solution**: Always zero the velocity when applying position deltas:

```typescript
if (intent.isPositionDelta) {
  player.x = clamp(player.x + intent.moveVector.x, margin, width - margin);
  player.y = clamp(player.y + intent.moveVector.y, margin, height - margin);
  body.setVelocity(0, 0);  // MUST do this
}
```

### 9. Input Adapter Tests Need Engine Mocking

**Problem**: Game engines like Phaser access `window` at module scope (before your test code runs). Standard `vi.mock` won't work if the module is imported before the mock is set up.

**Solution**: Mock the engine first, then dynamically import the adapter:

```typescript
vi.mock('phaser'); // must be before any import that touches Phaser

it('normalizes diagonal movement', async () => {
  const { KeyboardInput } = await import('./KeyboardInput');
  const adapter = new KeyboardInput();
  // ... test with mocked scene
});
```

### 10. Overlay Touch Target Size

**Problem**: Default button sizes are too small to tap reliably on phones, especially during gameplay when fingers are already on the screen.

**Solution**: Enforce 44x44px minimum on all interactive overlay elements:

```css
.overlay-btn {
  min-width: 44px;
  min-height: 44px;
  /* ... */
  -webkit-tap-highlight-color: transparent;  /* suppress iOS blue flash */
}
```

### 11. Physics Bounds Must Update on Resize

**Problem**: When the world resizes (orientation change, split-screen), the physics world bounds still reflect the old dimensions. Players and bullets stop at invisible walls or fly off-screen.

**Solution**: Update physics bounds in the resize listener:

```typescript
registry.events.on('changedata-worldWidth', (_, newWidth) => {
  const newHeight = registry.get('worldHeight');
  physics.world.setBounds(0, 0, newWidth, newHeight);
});
```

### 12. Safe Area Insets Change on Orientation

**Problem**: On phones, `safe-area-inset-left` might be 47px in landscape but 0px in portrait (or vice versa for left-notch vs right-notch). If you only read insets at mount time, they're stale after rotation.

**Solution**: Re-probe `getSafeAreaInsets()` on every resize and store the new values:

```typescript
const onResize = () => {
  // ... compute new world size
  game.registry.set('safeAreaInsets', getSafeAreaInsets()); // re-probe
};
```

### 13. Registry Listener Cleanup

**Problem**: If a scene registers listeners on `registry.events` but doesn't clean them up on scene shutdown, they accumulate across scene restarts (game over -> menu -> new game), causing duplicate handlers and memory leaks.

**Solution**: Track all registry listeners and remove them on scene shutdown:

```typescript
private registryListeners: Array<{ event: string; fn: Function }> = [];

// In create():
const listener = (_, value) => { /* ... */ };
this.registry.events.on('changedata-showFps', listener);
this.registryListeners.push({ event: 'changedata-showFps', fn: listener });

// In shutdown/destroy:
for (const { event, fn } of this.registryListeners) {
  this.registry.events.off(event, fn);
}
this.registryListeners = [];
```

### 14. Debounce Resize, Don't Throttle

**Problem**: Throttled resize handlers fire at regular intervals during a drag-resize, causing visible judder as the world size bounces between values.

**Solution**: Debounce at 100ms. This means the resize only applies after the user stops dragging, giving a clean single transition:

```typescript
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
const onResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // ... compute and apply new world size
  }, 100);
};
```

### 15. Asset Paths Need Base Path Prefix

**Problem**: When deploying to a subpath (e.g., GitHub Pages at `/my-game/`), asset URLs like `/assets/sprites/ship.png` resolve to the wrong path.

**Solution**: Pass the base path from the web framework through to the engine, and prepend it to all asset URLs:

```typescript
// Shell (SvelteKit)
import { base } from '$app/paths';
mountGame(container, { basePath: base });

// Engine (PreloadScene)
const basePath = this.registry.get('basePath') as string;
const url = `${basePath}/assets/${manifestEntry.path}`;
this.load.image(key, url);
```

---

## Testing Strategy

### Pure Function Tests (Unit)

World sizing, safe zones, and HUD scaling are pure functions -- test exhaustively with no mocks:

```typescript
describe('computeWorldSize', () => {
  it('returns 800x600 at 4:3', () => {
    expect(computeWorldSize(1024, 768)).toEqual({ width: 800, height: 600 });
  });

  it('returns wider world at 16:9', () => {
    const { width } = computeWorldSize(1920, 1080);
    expect(width).toBeGreaterThan(800);
    expect(width).toBeLessThanOrEqual(1340);
  });

  it('clamps at max width for ultra-wide', () => {
    expect(computeWorldSize(3440, 1440).width).toBe(1340);
  });
});

describe('HudScale', () => {
  it('text scale never drops below 1.0', () => {
    // Phone-sized display
    const factor = computeTextScaleFactor(390, 200);
    expect(factor).toBeGreaterThanOrEqual(1.0);
  });
});
```

### Input Adapter Tests

Mock the engine, then dynamically import:

```typescript
vi.mock('phaser');

it('normalizes diagonal movement', async () => {
  const { KeyboardInput } = await import('./KeyboardInput');
  const adapter = new KeyboardInput();
  // ... test with mocked scene
});
```

### Integration Tests

Test the full pipeline from container dimensions to safe zone positioning:

```typescript
it('enemy spawns within safe zone on wide screen', () => {
  const world = computeWorldSize(1920, 1080);
  const sz = createSafeZone(world.width, world.height);
  const spawnX = sz.x + Math.random() * sz.width;
  expect(spawnX).toBeGreaterThanOrEqual(sz.x);
  expect(spawnX).toBeLessThanOrEqual(sz.right);
});
```

### Manual Viewport Checks

Test these aspect ratios visually on real devices (DevTools emulation misses touch and audio issues):

| Ratio | Example Resolution | Expected Behavior |
|---|---|---|
| 4:3 | 800x600 | No gutters, HUD at top-left |
| 16:9 | 1920x1080 | Centered safe zone, side gutters |
| 20:9 | 960x432 | No letterbox, HUD at safe-zone edge, text readable |
| iPad | 1024x768 | Centered gameplay, readable text |

---

## Implementation Checklist

When building a new project with this architecture:

### Phase 1: Foundation

- [ ] Create pure `computeWorldSize()` function with height/width constants
- [ ] Create pure `createSafeZone()` function
- [ ] Create pure `computeTextScaleFactor()` and `scaleFontSize()` functions
- [ ] Write unit tests for all pure functions
- [ ] Set up game engine with `Scale.FIT` + `fixedStep: true`
- [ ] Add `touch-action: none` to canvas container CSS

### Phase 2: Input Layer

- [ ] Define `InputIntent` interface and `InputAdapter` lifecycle
- [ ] Implement `KeyboardInput` adapter (cursor + WASD, diagonal normalization)
- [ ] Implement touch adapter(s) with DOM `PointerEvent` on canvas (not engine input)
- [ ] Handle `pointercancel` in touch adapters
- [ ] Add `isPositionDelta` branch in movement handler (zero velocity when true)
- [ ] Add adapter selection logic with touch auto-detection
- [ ] Wire `inputAdapter.clear()` to game-level pause event
- [ ] Write input adapter tests (with engine mock + dynamic import)

### Phase 3: Shell Integration

- [ ] Create game mount component with dynamic import (SSR guard)
- [ ] Use `.then()` inside sync `onMount`, NOT async `onMount`
- [ ] Create `GameHandle` typed event emitter (no engine types leak)
- [ ] Wire settings schema (Zod) + localStorage store (in `.svelte.ts` file)
- [ ] Build overlay component with `pointer-events: none` pass-through
- [ ] Enforce 44px minimum touch targets on all overlay buttons
- [ ] Build rotate overlay for portrait + touch devices only
- [ ] Add `-webkit-tap-highlight-color: transparent` on interactive elements

### Phase 4: Audio

- [ ] Gate first gameplay behind a user gesture (tap-to-start menu)
- [ ] Unlock audio context on first user gesture
- [ ] Do NOT add redundant `visibilitychange` listener (engine handles pause/resume)

### Phase 5: Responsive Polish

- [ ] Implement `getSafeAreaInsets()` DOM probe with SSR guard
- [ ] Convert screen insets to world coordinates (scale up, not down)
- [ ] Anchor HUD to safe zone origin, not world origin
- [ ] Apply text scale floor (1.0) to prevent double-dip shrink
- [ ] Add debounced resize handler (100ms, skip-if-unchanged)
- [ ] Update physics bounds on resize
- [ ] Re-probe safe area insets on resize
- [ ] Track and clean up registry listeners on scene shutdown
- [ ] Wire base path prefix for subpath deployments

### Phase 6: Verification

- [ ] Test all manual viewport checks from the table above
- [ ] Verify touch input on actual phone hardware (not just DevTools emulation)
- [ ] Verify audio unlock works on iOS Safari
- [ ] Verify `touch-action: none` prevents pull-to-refresh on Chrome Android
- [ ] Verify overlay buttons meet 44px minimum touch target size
- [ ] Verify no duplicate pause/resume on tab switch (visibility handling)
- [ ] Verify physics bounds update correctly on orientation change

---

## Reference File Map

Map of concerns to implementation files in this reference architecture.

```text
CONCERN                  FILE                                           TYPE
---------------------------------------------------------------------------------------
World sizing             packages/game/src/systems/SafeZone.ts          pure function
Safe zone                packages/game/src/systems/SafeZone.ts          pure function
HUD scaling              packages/game/src/systems/HudScale.ts          pure function
Safe area insets         packages/game/src/systems/SafeAreaInsets.ts     DOM probe
Input contract           packages/game/src/systems/InputIntent.ts       interface
Keyboard adapter         packages/game/src/systems/KeyboardInput.ts     class
Joystick adapter         packages/game/src/systems/TouchInput.ts        class
Relative touch adapter   packages/game/src/systems/RelativeTouchInput.ts class
Game mount + resize      packages/game/src/mountGame.ts                 entry point
Public types             packages/game/src/types.ts                     types only
Settings schema          packages/contracts/src/settings/settings.schema.ts Zod
Settings store           apps/web/src/lib/stores/settings.svelte.ts     Svelte runes
Game canvas mount        apps/web/src/lib/components/GameCanvas.svelte  component
Game overlay             apps/web/src/lib/components/GameOverlay.svelte  component
Rotate overlay           apps/web/src/lib/components/RotateOverlay.svelte component
Play page shell          apps/web/src/routes/play/+page.svelte          route
Architecture spec        docs/RESPONSIVE_GAMEPLAY.md                    spec
```

---

## Adapting This Guide

To apply this architecture to a different game or interactive application:

1. **Adjust constants**: Change `WORLD_HEIGHT`, `SAFE_ZONE_WIDTH/HEIGHT`, and `MIN/MAX_WORLD_WIDTH` to match your design resolution.
2. **Swap engine**: Replace Phaser-specific code (Scale.FIT, Arcade physics) with your engine's equivalents. The pure functions and input contract are engine-agnostic.
3. **Swap shell**: Replace SvelteKit with Next.js, Nuxt, or vanilla. The mount pattern (dynamic import + container element + typed handle) works anywhere.
4. **Extend InputIntent**: Add fields for your game's needs (aim direction, ability slots, etc.). Keep the adapter interface stable.
5. **Portrait support**: If your game supports portrait, remove the rotate overlay and add a second set of safe zone constants for portrait aspect ratios.
6. **Keep the lessons section**: The mobile gotchas (audio unlock, visibility races, touch-action, pointer coordinate conversion, etc.) apply regardless of engine or framework choice.
