# Phaser 4.0.0-rc.6 — API Evidence Log

Source of truth: <https://docs.phaser.io/api-documentation/4.0.0-rc.6/>
Local mirror: docs/vendor/phaser-4.0.0-rc.6/

## Format

Each entry records a Phaser symbol used in this project, its verified rc.6 doc location,
and the project file(s) that use it. Add entries when introducing NEW Phaser API usage.
Do not duplicate entries — if a symbol is already listed, additional usages don't need a new row.

| Symbol | rc.6 Doc Path / URL | First Used In | Date | Verified By |
|--------|---------------------|---------------|------|-------------|
| `Phaser.Scene` | `/classes/Phaser.Scene.html` | `scenes/base-scene.ts` | 2026-02-10 | foundation |
| `Phaser.Game` | `/classes/Phaser.Game.html` | `main.ts` | 2026-02-10 | foundation |
| `Phaser.GameObjects.Sprite` | `/classes/Phaser.GameObjects.Sprite.html` | `scenes/platformer-scene.ts` | 2026-02-10 | foundation |
| `Phaser.AUTO` | `/variables/Phaser.AUTO.html` | `main.ts` | 2026-02-10 | foundation |
| `SpriteGPULayer` | `/classes/Phaser.GameObjects.SpriteGPULayer.html` | (planned) | — | — |
| `Texture#setWrap` | `/classes/Phaser.Textures.Texture.html#setWrap` | (planned) | — | — |

## Rejected (Phaser 3 only — NOT in rc.6)

| Symbol | Why Rejected | Correct rc.6 Alternative |
|--------|-------------|--------------------------|
| (none yet) | | |
