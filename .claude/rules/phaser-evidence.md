---
paths:
  - apps/client/src/core/adapters/**
  - apps/client/src/scenes/**
---

# Phaser 4.0.0-rc.6 — Docs-First Contract

These directories use Phaser directly. Every Phaser symbol must be verified before use.

## Source of Truth (priority order)

1. Type declarations: `node_modules/.bun/phaser@4.0.0-rc.6/node_modules/phaser/types/phaser.d.ts`
2. Online docs: `https://docs.phaser.io/api-documentation/4.0.0-rc.6/`

## Before Using ANY Phaser Symbol

1. Locate it in rc.6 docs or type declarations
2. Record it in `docs/PHASER_EVIDENCE.md` with the verified API signature
3. If not found, say "Not found in Phaser 4.0.0-rc.6 docs" and **STOP**

## Forbidden Sources

- `photonstorm.github.io/phaser3-docs` — Phaser 3, not 4
- `docs.phaser.io/api-documentation/api-documentation` — Phaser 3 alias
- Any URL containing `/3.` or referencing Phaser 3 APIs

## Key Facts

- Phaser 4 renderer is **WebGL** (WebGL2-class), not WebGPU
- Use `SpriteGPULayer` for instanced rendering
- GPU-accelerated tilemaps: orthographic only
