---
title: Game Runtime Diagnostics
last_updated: 2026-02-11
status: PLAN — pending implementation
scope: Port interface, adapters, container wiring, domain integration
---

# Game Runtime Diagnostics

**Companion to:** `docs/plans/telemetry.md` (agentic telemetry — separate system),
`docs/FOUNDATION.md` (architecture), `AGENTS.md` (zone rules)

## Two Systems, One Philosophy

This project has two observability systems. They share a philosophy (structured,
greppable, low-noise signals with domain filtering) but serve different consumers
and fire at different times.

| System | Consumer | Answers | Lifecycle |
|--------|----------|---------|-----------|
| Agentic telemetry | Human oversight, governance hooks | "Did the agent follow the rules?" | Agent session time (hooks fire on tool use) |
| Game runtime diagnostics | Agent debugging gameplay | "What is the game doing and why?" | Game runtime (events fire on game frames) |

Agentic telemetry exists in `.claude/hooks/` and is operational. This document
designs the game runtime diagnostics system.

## The Problem

When gameplay behavior is wrong — a jump that stalls, a collision that misses,
a state transition that fires early — the agent's debugging workflow is:

1. Read PlayerController source
2. Read physics adapter
3. Read the scene's update loop
4. Mentally simulate what might happen
5. Hypothesize, edit code, rebuild
6. Ask the human to test again

There is no runtime feedback loop. The agent debugs blind. What the agent needs
is a structured event stream:

```text
Frame 1847: player state running → jumping, velocity.y=-400, grounded=false, pos=(340,512)
Frame 1848: player state jumping, velocity.y=-388, grounded=false, pos=(340,500)
Frame 1852: player velocity.y=12, grounded=false, state=jumping — WHY POSITIVE?
```

The agent can then grep for the anomaly instead of reading source and guessing.

## Design

### 1. The Diagnostic Port

Lives in `core/ports/diagnostics.ts`. Domain modules consume it through DI.
It is not a logger — it is a structured event emitter with domain-aware filtering.

```typescript
// core/ports/diagnostics.ts

/** Domain channels — each module emits on its own channel */
export type DiagnosticChannel =
  | 'player'
  | 'camera'
  | 'physics'
  | 'enemy'
  | 'collectible'
  | 'scene'
  | 'audio'
  | 'network'
  | 'settings';

/** Signal importance — not severity, but signal density */
export type DiagnosticLevel =
  | 'state'   // State transitions — always interesting, low volume
  | 'debug'   // Frame-by-frame detail — usually noise, enable per-channel
  | 'warn';   // Unexpected conditions — something the agent should investigate

export interface IDiagnostics {
  /**
   * Emit a structured diagnostic event.
   * @param channel  Domain identifier (player, camera, physics, ...)
   * @param level    Signal importance (state, debug, warn)
   * @param label    Short human-readable event name (e.g. 'state-change', 'velocity')
   * @param data     Serializable payload — the actual diagnostic data
   */
  emit(
    channel: DiagnosticChannel,
    level: DiagnosticLevel,
    label: string,
    data: Record<string, unknown>,
  ): void;

  /**
   * Check if a channel+level combination is currently enabled.
   * Callers SHOULD check this before constructing expensive payloads.
   * When disabled, emit() is a no-op but this avoids the allocation cost.
   */
  isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean;
}
```

**Key design decision: channels, not log levels.** Traditional logging (info/warn/error)
forces a single severity axis. Game debugging needs domain filtering: "show me
everything about the player, nothing about the camera." Channels give you that.
Enable `player:state` and `player:debug` while leaving `camera:*` off entirely.

### 2. The Event Shape

Every diagnostic event has this structure when serialized:

```typescript
interface DiagnosticEvent {
  frame: number;          // IGameClock.frame
  timestamp: number;      // IGameClock.now (ms since game start)
  channel: DiagnosticChannel;
  level: DiagnosticLevel;
  label: string;
  data: Record<string, unknown>;
}
```

The `frame` number is critical — it correlates events across channels.
"What happened on frame 1852?" shows player, physics, and camera events together.

### 3. Adapters

#### ConsoleDiagnostics (development)

`core/adapters/console-diagnostics.ts`

- Writes to browser console using `console.groupCollapsed` for channel grouping
- Writes structured JSON for the data payload (greppable in dev tools)
- Maintains a ring buffer in memory: `window.__wds_diagnostics` — typed array
  of the last N events (default N=500)
- The agent can instruct: "open browser console and run
  `window.__wds_diagnostics.filter(e => e.channel === 'player').slice(-20)`"
  and the human pastes back the last 20 player events
- That is the runtime feedback loop

#### NoopDiagnostics (production, tests)

`core/adapters/noop-diagnostics.ts`

- `emit()` is a no-op
- `isEnabled()` returns `false`
- Zero cost path — no string formatting, no object allocation, no serialization

#### SpyDiagnostics (test assertions)

Not a separate file — inline mock in test files following the same pattern as
other port mocks (IStorageProvider mock in settings-manager tests).

```typescript
function createSpyDiagnostics(): IDiagnostics & { events: DiagnosticEvent[] } {
  const events: DiagnosticEvent[] = [];
  return {
    events,
    isEnabled: () => true,
    emit: (channel, level, label, data) => {
      events.push({ frame: 0, timestamp: 0, channel, level, label, data });
    },
  };
}
```

Tests assert on diagnostic output: "PlayerController emitted a state-change
from idle to jumping when jump was pressed while grounded."

### 4. Configuration

Add a `diagnostics` section to the settings schema in `@wds/shared`:

```typescript
// In packages/shared/src/schema/settings.ts
diagnostics: z.object({
  enabled: z.boolean().default(false),
  channels: z.record(
    z.enum(['player', 'camera', 'physics', 'enemy', 'collectible',
            'scene', 'audio', 'network', 'settings']),
    z.object({
      state: z.boolean().default(true),
      debug: z.boolean().default(false),
      warn: z.boolean().default(true),
    }),
  ).default({}),
  ringBufferSize: z.number().int().min(100).max(10000).default(500),
}),
```

Default dev config: `enabled: false`, all channels at `state`+`warn` levels,
`debug` off everywhere. When debugging a specific domain, the agent edits one
setting and restarts.

The `isEnabled()` method reads from `settingsManager.current.diagnostics` to
determine if a given channel+level is active. When `enabled` is false, all
`isEnabled()` calls return false — zero overhead.

### 5. Container Wiring

```typescript
// core/container.ts — add to Container interface:
readonly diagnostics: IDiagnostics;
```

```typescript
// main.ts — composition root:
import { ConsoleDiagnostics } from './core/adapters/console-diagnostics.js';
// or NoopDiagnostics for production

const diagnostics = new ConsoleDiagnostics(clock, settingsManager);
// Pass to container: { ..., diagnostics }
```

Domain modules receive `IDiagnostics` via constructor injection, same as
`IClock` and `IInputProvider`. Zone rules don't change — modules import only
the port interface from `core/ports/diagnostics.ts`.

### 6. Domain Integration Points

#### PlayerController

Emits on the `player` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `state-change` | State transition (idle→running, running→jumping, etc.) | `{ from, to, velocity, position, grounded }` |
| `debug` | `frame` | Every frame (gated by `isEnabled`) | `{ state, velocity, position, grounded, coyoteFrames }` |
| `warn` | `unexpected` | Anomalous condition (positive velocity while jumping, etc.) | `{ reason, state, velocity, position }` |

```typescript
// In PlayerController.update(), after computing new state:
if (newState !== this.state) {
  this.diagnostics.emit('player', 'state', 'state-change', {
    from: this.state, to: newState,
    velocity: { x: this.vx, y: this.vy },
    position: { x: this.x, y: this.y },
    grounded: this.grounded,
  });
}

if (this.diagnostics.isEnabled('player', 'debug')) {
  this.diagnostics.emit('player', 'debug', 'frame', {
    state: this.state, velocity: { x: this.vx, y: this.vy },
    position: { x: this.x, y: this.y },
    grounded: this.grounded, coyoteFrames: this.coyoteTimeRemaining,
  });
}
```

#### CameraController

Emits on the `camera` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `target-change` | Camera target entity changes | `{ target, position, bounds }` |
| `debug` | `lerp` | Every frame (gated) | `{ position, target, lerpFactor }` |
| `state` | `bounds-clamp` | Camera position clamped to world bounds | `{ requested, clamped, bounds }` |

#### Scenes

Emit on the `scene` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `lifecycle` | Scene started, stopped, paused, resumed | `{ scene, event }` |
| `state` | `preload-progress` | Asset loading progress (PreloadScene) | `{ loaded, total }` |
| `debug` | `collision` | Entity collision detected (PlatformerScene) | `{ entityA, entityB, type }` |

#### Enemy modules

Emit on the `enemy` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `state-change` | Enemy behavior transition | `{ enemyId, from, to, position }` |
| `state` | `damage-dealt` | Enemy damages player | `{ enemyId, damage, playerHealth }` |
| `debug` | `patrol` | Every patrol update (gated) | `{ enemyId, position, direction, atBoundary }` |

### 7. Agentic Workflow Integration

The `/implement-feature` command gains a debugging step:

> "If visual verification reveals unexpected behavior, enable debug-level
> diagnostics for the relevant channel in settings, reproduce the issue,
> and include the diagnostic output in your analysis before proposing a fix."

The `/investigate` command can reference diagnostic channels:

> "Check if the player channel shows state transitions during the reported
> behavior. Enable `player:debug` if frame-level data is needed."

### 8. Future: In-Game Overlay (Phase 3+)

A `DiagnosticOverlayScene` running parallel to the game scene, rendering the
last N state events as semi-transparent text in a corner. The agent asks for a
screenshot instead of console commands. Designed for now so the port's data shape
supports it — the ring buffer in `ConsoleDiagnostics` is the same data source.

## Zone Architecture Compliance

| Component | Zone | Import Rule |
|-----------|------|-------------|
| `IDiagnostics` port | `core/ports/` | Importable by modules/ and scenes/ |
| `ConsoleDiagnostics` adapter | `core/adapters/` | Importable by scenes/ and main.ts only |
| `NoopDiagnostics` adapter | `core/adapters/` | Same |
| `DiagnosticChannel` / `DiagnosticLevel` types | `core/ports/` | Importable everywhere |
| `diagnostics` settings schema | `@wds/shared` | Importable everywhere |
| Domain emit calls | `modules/` | Import `IDiagnostics` from port (zone-safe) |

No zone rules change. Follows the exact pattern of `IClock`, `IInputProvider`,
`IPhysicsWorld`.

## Implementation Sequence

### Commit 1: Port interface + NoopDiagnostics adapter

| File | Action |
|------|--------|
| `apps/client/src/core/ports/diagnostics.ts` | **New** — `IDiagnostics`, `DiagnosticChannel`, `DiagnosticLevel` |
| `apps/client/src/core/adapters/noop-diagnostics.ts` | **New** — zero-cost no-op implementation |

Pure TS, zero dependencies. Testable in isolation.

### Commit 2: ConsoleDiagnostics adapter

| File | Action |
|------|--------|
| `apps/client/src/core/adapters/console-diagnostics.ts` | **New** — browser console + ring buffer |
| `apps/client/src/core/adapters/__tests__/console-diagnostics.test.ts` | **New** — tests with mock console |

Depends on `IGameClock` (for frame/timestamp) and `ISettingsManager` (for channel config).

### Commit 3: Settings schema extension + Container wiring

| File | Action |
|------|--------|
| `packages/shared/src/schema/settings.ts` | **Edit** — add `diagnostics` section |
| `packages/shared/src/types/index.ts` | May need re-export if new types emerge |
| `apps/client/src/core/container.ts` | **Edit** — add `readonly diagnostics: IDiagnostics` |
| `apps/client/src/main.ts` | **Edit** — wire ConsoleDiagnostics into container |

This is a schema change in `@wds/shared` — requires "Ask First" per AGENTS.md.

### Commit 4: PlayerController + CameraController integration

| File | Action |
|------|--------|
| `apps/client/src/modules/player/player-controller.ts` | **Edit** — accept IDiagnostics, emit state/debug/warn |
| `apps/client/src/modules/camera/camera-controller.ts` | **Edit** — accept IDiagnostics, emit state/debug |
| `apps/client/src/modules/player/__tests__/player-controller.test.ts` | **Edit** — inject SpyDiagnostics, assert on events |
| `apps/client/src/modules/camera/__tests__/camera-controller.test.ts` | **Edit** — inject SpyDiagnostics |

### Commit 5: Scene lifecycle + enemy integration

| File | Action |
|------|--------|
| `apps/client/src/scenes/platformer-scene.ts` | **Edit** — emit scene lifecycle + collision events |
| `apps/client/src/scenes/preload-scene.ts` | **Edit** — emit preload progress |
| `apps/client/src/modules/enemy/enemy-entity.ts` | **Edit** — accept IDiagnostics, emit patrol/state |

### Commit 6: Documentation

| File | Action |
|------|--------|
| `docs/FOUNDATION.md` | **Edit** — add IDiagnostics to port listing |
| `AGENTS.md` | **Edit** — add diagnostics to module/port reference |

## Test Estimate

~8-10 new tests across 2-3 test files:

| Module | Tests |
|--------|-------|
| `console-diagnostics.test.ts` | ~4 (emit with enabled/disabled channels, ring buffer, isEnabled) |
| `player-controller.test.ts` | ~3 additional (state-change event emitted, debug gated, warn on anomaly) |
| `camera-controller.test.ts` | ~2 additional (target-change event, bounds-clamp event) |

## Verification

After each commit: `bun run check` (typecheck + zones + deps + tests).

Manual verification:

1. Enable diagnostics in settings (`diagnostics.enabled: true`)
2. `bun run dev` → open browser console
3. Play the game — see state-change events for player, camera, scenes
4. Enable player debug: `diagnostics.channels.player.debug: true` → restart
5. See frame-by-frame player data in console
6. Run `window.__wds_diagnostics.filter(e => e.channel === 'player').slice(-10)` in console
7. Verify ring buffer contains structured events
