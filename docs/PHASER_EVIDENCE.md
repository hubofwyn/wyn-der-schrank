# Phaser 4.0.0-rc.6 — API Evidence Log

Source of truth: <https://docs.phaser.io/api-documentation/4.0.0-rc.6/>
Local mirror: docs/vendor/phaser-4.0.0-rc.6/

## Format

Each entry records a Phaser symbol used in this project, its verified rc.6 doc location,
and the project file(s) that use it. Add entries when introducing NEW Phaser API usage.
Do not duplicate entries — if a symbol is already listed, additional usages don't need a new row.

| Symbol | rc.6 Doc Path / URL | First Used In | Date | Verified By |
|--------|---------------------|---------------|------|-------------|
| `Phaser.Scene` | `/classes/Phaser.Scene.html` | `scenes/boot-scene.ts` | 2026-02-10 | foundation |
| `Phaser.Game` | `/classes/Phaser.Game.html` | `main.ts` | 2026-02-10 | foundation |
| `Phaser.AUTO` | `/variables/Phaser.AUTO.html` | `main.ts` | 2026-02-10 | foundation |
| `Phaser.Scale.FIT` | `/namespaces/Phaser.Scale.html` | `main.ts` | 2026-02-11 | type-verified |
| `Phaser.Scale.CENTER_BOTH` | `/namespaces/Phaser.Scale.html` | `main.ts` | 2026-02-11 | type-verified |
| `Phaser.GameObjects.Rectangle` | `/classes/Phaser.GameObjects.Rectangle.html` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Phaser.Physics.Arcade.StaticGroup` | `/classes/Phaser.Physics.Arcade.StaticGroup.html` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `scene.physics.add.staticGroup()` | `/classes/Phaser.Physics.Arcade.Factory.html#staticGroup` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `scene.physics.add.existing()` | `/classes/Phaser.Physics.Arcade.Factory.html#existing` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `scene.physics.add.collider()` | `/classes/Phaser.Physics.Arcade.Factory.html#collider` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Phaser.Physics.Arcade.Body.setCollideWorldBounds()` | `/classes/Phaser.Physics.Arcade.Body.html#setCollideWorldBounds` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Phaser.Physics.Arcade.Body.setMaxVelocity()` | `/classes/Phaser.Physics.Arcade.Body.html#setMaxVelocity` | `core/adapters/phaser-physics.ts` | 2026-02-11 | type-verified |
| `Camera.startFollow()` | `/classes/Phaser.Cameras.Scene2D.Camera.html#startFollow` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Camera.setBounds()` | `/classes/Phaser.Cameras.Scene2D.Camera.html#setBounds` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Phaser.Physics.Arcade.World.setBounds()` | `/classes/Phaser.Physics.Arcade.World.html#setBounds` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `Phaser.GameObjects.Sprite` | `/classes/Phaser.GameObjects.Sprite.html` | (planned) | — | — |
| `SpriteGPULayer` | `/classes/Phaser.GameObjects.SpriteGPULayer.html` | (planned) | — | — |
| `Texture#setWrap` | `/classes/Phaser.Textures.Texture.html#setWrap` | (planned) | — | — |

## Rejected (Phaser 3 only — NOT in rc.6)

| Symbol | Why Rejected | Correct rc.6 Alternative |
|--------|-------------|--------------------------|
| (none yet) | | |
