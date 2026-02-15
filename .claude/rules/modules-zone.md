---
paths:
  - apps/client/src/modules/**
---

# Zone Purity: modules/

This directory is the **domain zone** — pure TypeScript with zero framework dependencies.

## Rules

- **No Phaser imports.** Never import from `phaser` or any Phaser sub-module.
- **No browser globals.** Never use `window`, `document`, `requestAnimationFrame`, `localStorage`, or any Web API directly.
- **Port-only imports.** Engine-facing logic goes through `core/ports/` interfaces. Import the port type, never a concrete adapter.
- **Allowed imports:** `@hub-of-wyn/shared` (schemas + types), other `modules/` siblings, `core/ports/` (interfaces only).
- **Forbidden imports:** `phaser`, `scenes/`, `core/adapters/`, `server/`, `hono`, any direct browser API.

## Testing

Domain modules use plain mock objects that satisfy port interfaces. No Phaser test harness needed.

## Enforcement

- `bun run lint:zones` — ESLint zone enforcement (runs in CI and pre-push)
- `bun run deps:check` — dependency-cruiser structural validation
- `zone-lint-on-edit.sh` — PostToolUse hook checks zone compliance after every edit
