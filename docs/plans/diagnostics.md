---
title: Game Runtime Diagnostics
last_updated: 2026-02-11
status: IMPLEMENTED — feat/diagnostics branch
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
[WDS:player:state] {"frame":1847,"label":"state-change","data":{"from":"running","to":"jumping","vy":-400}}
[WDS:player:debug] {"frame":1848,"label":"frame","data":{"state":"jumping","vy":-388,"grounded":false}}
[WDS:player:warn]  {"frame":1852,"label":"unexpected","data":{"reason":"positive vy while jumping","vy":12}}
```

The agent greps for the anomaly instead of reading source and guessing.

## Design

### 1. Channel Types — Zod-First, Single Source of Truth

**Critical decision:** Channel names are defined ONCE in the Zod schema in
`@hub-of-wyn/shared`, not independently in the port file. The port file imports the
inferred type. This follows the project's Zod-first principle: schemas are the
source of truth, types are derived.

```typescript
// packages/shared/src/schema/diagnostics.ts (NEW)

import { z } from 'zod';

export const DiagnosticChannelSchema = z.enum([
  'player',
  'camera',
  'physics',
  'enemy',
  'collectible',
  'scene',
  'audio',
  'network',
  'settings',
]);

export const DiagnosticLevelSchema = z.enum([
  'state',   // State transitions — always interesting, low volume
  'debug',   // Frame-by-frame detail — usually noise, enable per-channel
  'warn',    // Unexpected conditions — agent should investigate
]);

export const DiagnosticChannelConfigSchema = z.object({
  state: z.boolean().default(true),
  debug: z.boolean().default(false),
  warn: z.boolean().default(true),
});

export const DiagnosticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.record(
    z.string(),  // sparse record — not all channels need config
    DiagnosticChannelConfigSchema,
  ).default({}),
  ringBufferSize: z.number().int().min(100).max(10000).default(500),
});
```

```typescript
// packages/shared/src/types/index.ts — add:
export type DiagnosticChannel = z.infer<typeof DiagnosticChannelSchema>;
export type DiagnosticLevel = z.infer<typeof DiagnosticLevelSchema>;
export type DiagnosticsConfig = z.infer<typeof DiagnosticsConfigSchema>;
```

If someone adds a channel to the schema, the TypeScript type updates automatically.
If someone adds a channel to the port type without updating the schema, it won't
compile — the type derives from the schema, not the other way around.

### 2. The Diagnostic Port

Lives in `core/ports/diagnostics.ts`. Imports types from `@hub-of-wyn/shared`
(permitted — shared package, not a module).

```typescript
// core/ports/diagnostics.ts

import type { DiagnosticChannel, DiagnosticLevel } from '@hub-of-wyn/shared';

/** Serialized diagnostic event — stored in ring buffer, emitted to console */
export interface DiagnosticEvent {
  readonly frame: number;
  readonly timestamp: number;
  readonly channel: DiagnosticChannel;
  readonly level: DiagnosticLevel;
  readonly label: string;
  readonly data: Record<string, unknown>;
}

export interface IDiagnostics {
  /**
   * Emit a structured diagnostic event.
   * @param channel  Domain identifier (player, camera, physics, ...)
   * @param level    Signal importance (state, debug, warn)
   * @param label    Short event name (e.g. 'state-change', 'velocity')
   * @param data     Serializable payload
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
   */
  isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean;

  /**
   * Query the ring buffer — returns the last N events matching a filter.
   * Used by future HTTP endpoint and diagnostic overlay.
   */
  query(filter?: {
    channel?: DiagnosticChannel;
    level?: DiagnosticLevel;
    last?: number;
  }): readonly DiagnosticEvent[];
}
```

The `query()` method is designed now so a future HTTP endpoint
(`GET /api/diagnostics?channel=player&last=20`) can wrap it without changing
the adapter. This turns the feedback loop from human-in-the-loop (paste from
browser console) to fully agentic (agent curls the endpoint directly).

### 3. Adapters

#### NoopDiagnostics (production, tests by default)

`core/adapters/noop-diagnostics.ts`

```typescript
export class NoopDiagnostics implements IDiagnostics {
  emit(): void {}
  isEnabled(): boolean { return false; }
  query(): readonly DiagnosticEvent[] { return []; }
}
```

Zero cost path — no allocations, no side effects.

#### ConsoleDiagnostics (development)

`core/adapters/console-diagnostics.ts`

Depends on `IGameClock` (for frame/timestamp) and `ISettingsManager` (for
channel config).

Key behaviors:

- **Console output format:** Single-line prefixed JSON, terminal-friendly.
  Format: `[WDS:<channel>:<level>] <compact-json>`. This is parseable when
  piped through terminal output and greppable by channel or level.
- **Ring buffer:** In-memory array of the last N `DiagnosticEvent` objects,
  exposed at `window.__wds_diagnostics` for browser console access and via
  the `query()` method for programmatic access.
- **isEnabled()** reads from `settingsManager.current.diagnostics.channels`
  to determine if a channel+level is active. When `diagnostics.enabled` is
  false, all calls return false — zero overhead.

```typescript
export class ConsoleDiagnostics implements IDiagnostics {
  private readonly buffer: DiagnosticEvent[] = [];

  constructor(
    private readonly clock: IGameClock,
    private readonly settings: ISettingsManager,
    private readonly bufferSize: number = 500,
  ) {
    // Expose ring buffer for browser console access
    if (typeof window !== 'undefined') {
      (window as Record<string, unknown>).__wds_diagnostics = this.buffer;
    }
  }

  isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean {
    const config = this.settings.current.diagnostics;
    if (!config.enabled) return false;
    const channelConfig = config.channels[channel];
    if (!channelConfig) return level !== 'debug'; // default: state+warn on
    return channelConfig[level];
  }

  emit(
    channel: DiagnosticChannel,
    level: DiagnosticLevel,
    label: string,
    data: Record<string, unknown>,
  ): void {
    if (!this.isEnabled(channel, level)) return;

    const event: DiagnosticEvent = {
      frame: this.clock.frame,
      timestamp: this.clock.now,
      channel, level, label, data,
    };

    // Ring buffer
    this.buffer.push(event);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Console output — single-line prefixed JSON for terminal grep
    const prefix = `[WDS:${channel}:${level}]`;
    const json = JSON.stringify({ frame: event.frame, label, data });
    if (level === 'warn') {
      console.warn(prefix, json);
    } else {
      console.log(prefix, json);
    }
  }

  query(filter?: {
    channel?: DiagnosticChannel;
    level?: DiagnosticLevel;
    last?: number;
  }): readonly DiagnosticEvent[] {
    let result: DiagnosticEvent[] = this.buffer;
    if (filter?.channel) {
      result = result.filter(e => e.channel === filter.channel);
    }
    if (filter?.level) {
      result = result.filter(e => e.level === filter.level);
    }
    if (filter?.last) {
      result = result.slice(-filter.last);
    }
    return result;
  }
}
```

#### SpyDiagnostics (test assertions)

Not a separate file — inline in test files, following the existing pattern
(IStorageProvider mock in settings-manager tests).

```typescript
function createSpyDiagnostics(): IDiagnostics & { events: DiagnosticEvent[] } {
  const events: DiagnosticEvent[] = [];
  return {
    events,
    isEnabled: () => true,
    emit: (channel, level, label, data) => {
      events.push({ frame: 0, timestamp: 0, channel, level, label, data });
    },
    query: (filter) => {
      let result = events;
      if (filter?.channel) result = result.filter(e => e.channel === filter.channel);
      if (filter?.level) result = result.filter(e => e.level === filter.level);
      if (filter?.last) result = result.slice(-filter.last);
      return result;
    },
  };
}
```

Tests assert on diagnostic output: "PlayerController emitted a state-change
from idle to jumping when jump was pressed while grounded."

### 4. Settings Schema Extension

Add `diagnostics` section to the existing settings schema. This is a schema
change in `@hub-of-wyn/shared` — "Ask First" per AGENTS.md. This document constitutes
the ask.

```typescript
// packages/shared/src/schema/settings.ts — add after accessibility:
diagnostics: DiagnosticsConfigSchema.default({
  enabled: false,
  channels: {},
  ringBufferSize: 500,
}),
```

The `DiagnosticsConfigSchema` is imported from the new
`packages/shared/src/schema/diagnostics.ts` file (commit 1).

### 5. Constructor Injection — Optional with NoopDiagnostics Default

**Critical design decision:** `IDiagnostics` is optional in constructors with
a `NoopDiagnostics` default. This avoids breaking 44 PlayerController tests and
16 CameraController tests that don't care about diagnostics.

Rationale: diagnostics is a cross-cutting infrastructure concern, not a
domain-specific dependency. It's more like logging than gameplay input. Strict
DI purity would require every test to pass a diagnostics instance, but the
pragmatic tradeoff — a default that does nothing — means 90% of tests don't
change and new tests can opt into spy diagnostics when they want to assert on
emitted events.

```typescript
// PlayerControllerDeps — add optional field:
export interface PlayerControllerDeps {
  readonly input: IInputProvider;
  readonly body: IBody;
  readonly clock: IGameClock;
  readonly config: PlatformerConfig;
  readonly stats: CharacterStats;
  readonly diagnostics?: IDiagnostics;  // optional, defaults to NoopDiagnostics
}

// In PlayerController constructor:
private readonly diagnostics: IDiagnostics;
constructor(deps: PlayerControllerDeps) {
  // ... existing assignments ...
  // Module-local noop (can't import NoopDiagnostics from core/adapters/ — zone rule)
  this.diagnostics = deps.diagnostics ?? NOOP_DIAGNOSTICS;
}
```

```typescript
// CameraController — add optional 2nd parameter:
// Uses module-local NOOP_DIAGNOSTICS const (zone-safe, same pattern as PlayerController)
constructor(
  private config: CameraConfig,
  diagnostics?: IDiagnostics,
) {
  this.diagnostics = diagnostics ?? NOOP_DIAGNOSTICS;
```

Existing tests continue to work unchanged. New tests that want to verify
diagnostic output pass `createSpyDiagnostics()` explicitly.

### 6. Container Wiring

```typescript
// core/container.ts — add to Container interface:
readonly diagnostics: IDiagnostics;
```

```typescript
// main.ts — composition root:
import { ConsoleDiagnostics } from './core/adapters/console-diagnostics.js';

const diagnostics = new ConsoleDiagnostics(clock, settingsManager);
// Pass to container: { ..., diagnostics }
// Pass to PlayerController: { ...deps, diagnostics }
// Pass to CameraController: config, diagnostics
```

### 7. Domain Integration Points

#### PlayerController

Emits on the `player` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `state-change` | State transition | `{ from, to, velocity, position, grounded }` |
| `debug` | `frame` | Every frame (gated by `isEnabled`) | `{ state, velocity, position, grounded, coyoteFrames }` |
| `warn` | `unexpected` | Anomalous condition | `{ reason, state, velocity, position }` |

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
    state: this.state,
    velocity: { x: this.vx, y: this.vy },
    position: { x: this.x, y: this.y },
    grounded: this.grounded,
    coyoteFrames: this.coyoteTimeRemaining,
  });
}
```

#### CameraController

Emits on the `camera` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `target-change` | Camera target entity changes | `{ target, position, bounds }` |
| `debug` | `lerp` | Every frame (gated) | `{ position, target, lerpFactor }` |
| `state` | `bounds-clamp` | Position clamped to world bounds | `{ requested, clamped, bounds }` |

#### Scenes

Emit on the `scene` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `lifecycle` | Scene started/stopped/paused/resumed | `{ scene, event }` |
| `state` | `preload-progress` | Asset loading progress | `{ loaded, total }` |
| `debug` | `collision` | Entity collision detected | `{ entityA, entityB, type }` |

#### Enemy modules

Emit on the `enemy` channel.

| Level | Label | When | Data |
|-------|-------|------|------|
| `state` | `state-change` | Enemy behavior transition | `{ enemyId, from, to, position }` |
| `state` | `damage-dealt` | Enemy damages player | `{ enemyId, damage, playerHealth }` |
| `debug` | `patrol` | Every patrol update (gated) | `{ enemyId, position, direction, atBoundary }` |

### 8. Terminal Output Strategy

The ConsoleDiagnostics adapter writes single-line prefixed JSON:

```text
[WDS:player:state] {"frame":1847,"label":"state-change","data":{"from":"running","to":"jumping"}}
```

This format is designed to be terminal-friendly for when browser console output
is eventually piped to the terminal (via Vite WebSocket HMR forwarding or a
dedicated dev plugin). The prefix `[WDS:<channel>:<level>]` enables:

```bash
# Filter by channel
bun run dev 2>&1 | grep '\[WDS:player'

# Filter by level
bun run dev 2>&1 | grep ':warn\]'

# Filter specific event
bun run dev 2>&1 | grep 'state-change'
```

**Phase 2+ enhancement:** A Vite plugin or dev-mode WebSocket bridge that
forwards `console.*` calls from the browser to the terminal. This gives the
agent direct access to diagnostic output through the terminal it's already
reading, completing the feedback loop without human mediation.

**Phase 2+ enhancement:** An HTTP endpoint on the Hono dev server
(`GET /api/diagnostics?channel=player&last=20`) that wraps the `query()` method.
The agent can `curl` it directly. The ring buffer's `query()` API is designed
now to support this without adapter changes.

### 9. Agentic Workflow Integration

The `/implement-feature` command gains a debugging step:

> "If visual verification reveals unexpected behavior, enable debug-level
> diagnostics for the relevant channel in settings, reproduce the issue,
> and include the diagnostic output in your analysis before proposing a fix."

The `/investigate` command can reference diagnostic channels:

> "Check if the player channel shows state transitions during the reported
> behavior. Enable `player:debug` if frame-level data is needed."

### 10. Future: In-Game Overlay (Phase 3+)

A `DiagnosticOverlayScene` running parallel to the game scene, rendering the
last N state events as semi-transparent text in a corner. Uses the same
`query()` method on the `IDiagnostics` interface. The agent asks for a
screenshot instead of console commands.

## Zone Architecture Compliance

| Component | Zone | Import Rule |
|-----------|------|-------------|
| `DiagnosticChannel`/`DiagnosticLevel` types | `@hub-of-wyn/shared` | Importable everywhere |
| `DiagnosticsConfigSchema` | `@hub-of-wyn/shared` | Importable everywhere |
| `IDiagnostics` port + `DiagnosticEvent` | `core/ports/` | Importable by modules/ and scenes/ |
| `ConsoleDiagnostics` adapter | `core/adapters/` | Importable by scenes/ and main.ts only |
| `NoopDiagnostics` adapter | `core/adapters/` | Same |
| Domain emit calls | `modules/` | Import `IDiagnostics` from port (zone-safe) |
| `window.__wds_diagnostics` | `core/adapters/` | Browser global in adapter only (permitted) |

No zone rules change. Follows the exact pattern of `IClock`, `IInputProvider`,
`IPhysicsWorld`.

## Verified Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `IGameClock.frame` | Exists | `core/ports/engine.ts:4` — `readonly frame: number` |
| `PlayerControllerDeps` interface | Exists | `modules/player/player-controller.ts:35` — clean extension point |
| `CameraController(config)` | Exists | `modules/camera/camera-controller.ts:39` — add optional 2nd param |
| `SettingsSchema` | Exists | `packages/shared/src/schema/settings.ts` — extend with diagnostics |
| `ISettingsManager` | Exists | `core/ports/settings.ts` — ConsoleDiagnostics reads .current |

## Implementation Sequence

### Commit 1: Diagnostics schema in @hub-of-wyn/shared

| File | Action |
|------|--------|
| `packages/shared/src/schema/diagnostics.ts` | **New** — `DiagnosticChannelSchema`, `DiagnosticLevelSchema`, `DiagnosticsConfigSchema` |
| `packages/shared/src/types/index.ts` | **Edit** — export `DiagnosticChannel`, `DiagnosticLevel`, `DiagnosticsConfig` |

Pure Zod schemas, zero game dependencies. Single source of truth for channel
and level names.

### Commit 2: Port interface + NoopDiagnostics adapter

| File | Action |
|------|--------|
| `apps/client/src/core/ports/diagnostics.ts` | **New** — `IDiagnostics`, `DiagnosticEvent` (types from shared/) |
| `apps/client/src/core/adapters/noop-diagnostics.ts` | **New** — zero-cost no-op implementation |

Pure TS, imports types from `@hub-of-wyn/shared` only.

### Commit 3: Settings schema extension (shared/ only)

| File | Action |
|------|--------|
| `packages/shared/src/schema/settings.ts` | **Edit** — import and add `diagnostics` section |

Schema change isolated to shared/ workspace. Tests can verify the new defaults
parse correctly.

### Commit 4: ConsoleDiagnostics adapter

| File | Action |
|------|--------|
| `apps/client/src/core/adapters/console-diagnostics.ts` | **New** — browser console + ring buffer + query() |
| `apps/client/src/core/adapters/__tests__/console-diagnostics.test.ts` | **New** — tests with mock console/clock/settings |

Depends on `IGameClock` and `ISettingsManager` (via ports).

### Commit 5: Container wiring

| File | Action |
|------|--------|
| `apps/client/src/core/container.ts` | **Edit** — add `readonly diagnostics: IDiagnostics` |
| `apps/client/src/main.ts` | **Edit** — wire ConsoleDiagnostics, pass to PlayerController/CameraController |

Container and composition root changes isolated from domain code.

### Commit 6: PlayerController + CameraController integration

| File | Action |
|------|--------|
| `apps/client/src/modules/player/player-controller.ts` | **Edit** — add optional `diagnostics` to deps, emit events |
| `apps/client/src/modules/camera/camera-controller.ts` | **Edit** — add optional diagnostics param, emit events |
| `apps/client/src/modules/player/__tests__/player-controller.test.ts` | **Edit** — add 3 new tests with SpyDiagnostics |
| `apps/client/src/modules/camera/__tests__/camera-controller.test.ts` | **Edit** — add 2 new tests with SpyDiagnostics |

Existing tests unchanged — `diagnostics` is optional with NoopDiagnostics default.

### Commit 7: Scene lifecycle + enemy integration

| File | Action |
|------|--------|
| `apps/client/src/scenes/platformer-scene.ts` | **Edit** — emit scene lifecycle + collision events |
| `apps/client/src/scenes/preload-scene.ts` | **Edit** — emit preload progress |
| `apps/client/src/modules/enemy/enemy-entity.ts` | **Edit** — add optional diagnostics, emit events |

### Commit 8: Documentation

| File | Action |
|------|--------|
| `docs/FOUNDATION.md` | **Edit** — add IDiagnostics to port listing |
| `AGENTS.md` | **Edit** — add diagnostics port count, update module reference |

## Sequencing in Roadmap

G1-G5 are all complete (164 tests). The diagnostics port is cross-cutting
infrastructure that enables better debugging for all future work. It should be
implemented as a dedicated branch (`feat/diagnostics-port`) as the next piece
of work.

**Recommendation:** Add a new goal or position it as a prerequisite that benefits
all future goals. The human controls the goal list — this document provides the
implementation plan ready for scheduling.

## Test Estimate

~9-11 new tests across 3 test files. Existing tests unchanged.

| Module | New Tests |
|--------|-----------|
| `console-diagnostics.test.ts` | ~4 (emit with enabled/disabled, ring buffer, query filter, isEnabled) |
| `player-controller.test.ts` | ~3 additional (state-change emitted, debug gated, warn on anomaly) |
| `camera-controller.test.ts` | ~2 additional (target-change event, bounds-clamp event) |

## Verification

After each commit: `bun run check` (typecheck + zones + deps + tests).

After final commit: `git push` triggers all pre-push gates.

Manual verification:

1. Enable diagnostics in settings (`diagnostics.enabled: true`)
2. `bun run dev` → open browser console
3. Play the game — see `[WDS:player:state]` events for state transitions
4. Enable player debug: set `diagnostics.channels.player.debug: true` → restart
5. See `[WDS:player:debug]` frame-by-frame data in console
6. Run `window.__wds_diagnostics.filter(e => e.channel === 'player').slice(-10)` in console
7. Verify ring buffer contains structured events with frame numbers

## Server-Side Diagnostics

Server diagnostics mirrors the client-side pattern but operates outside the
Phaser game loop with no game clock dependency.

### Implementation

The `ServerDiagnostics` class lives in `apps/server/src/services/server-diagnostics.ts`.
It implements the same `emit` / `isEnabled` / `query` shape as the client
`IDiagnostics` port but uses `Date.now()` timestamps and a monotonic `seq`
counter instead of the game clock's `frame` number. There is no `IGameClock`
on the server.

### Ring Buffer

Events are stored in a ring buffer whose size is configurable via
`ServerConfigSchema.diagnostics.ringBufferSize`. The buffer operates identically
to the client `ConsoleDiagnostics` buffer — oldest events are evicted when the
buffer reaches capacity.

### HTTP Endpoint

`GET /api/diagnostics` wraps `ServerDiagnostics.query()` with query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `channel` | string | Filter by diagnostic channel |
| `level` | string | Filter by diagnostic level |
| `last` | number | Return only the last N matching events |

All parameters are optional. When omitted, the full buffer contents are returned.

### Console Output

Server console output follows the same `[WDS:channel:level]` prefix format as
the client `ConsoleDiagnostics` adapter, keeping terminal grep workflows
consistent across client and server:

```text
[WDS:startup:state] {"seq":1,"label":"server-ready","data":{"port":3001,"env":"development"}}
[WDS:request:debug] {"seq":42,"label":"incoming","data":{"method":"GET","path":"/api/health"}}
```

### Server Channels

Two server-specific channels are added to `DiagnosticChannelSchema` in
`packages/shared/src/schema/diagnostics.ts`:

- `request` — HTTP request lifecycle events
- `startup` — Server boot and configuration events

### Client-to-Server Forwarding

No client-to-server diagnostic forwarding exists in this phase. The client
and server diagnostic ring buffers are independent. Client-to-server forwarding
(browser console events streamed to the server endpoint) is a Phase 2+
enhancement noted in section 8 above.
