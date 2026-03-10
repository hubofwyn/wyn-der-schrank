---
title: Phaser 4.0.0-rc.6 API Evidence Log
category: docs
status: active
last_updated: 2026-03-09
tags: [phaser, api, evidence]
priority: high
---

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
| `Phaser.Input.Keyboard.KeyboardPlugin` | `/classes/Phaser.Input.Keyboard.KeyboardPlugin.html` | `core/adapters/phaser-input.ts` | 2026-02-10 | type-verified |
| `Phaser.Input.Keyboard.Key` | `/classes/Phaser.Input.Keyboard.Key.html` | `core/adapters/phaser-input.ts` | 2026-02-10 | type-verified |
| `Phaser.Input.Keyboard.KeyCodes` | `/variables/Phaser.Input.Keyboard.KeyCodes.html` | `core/adapters/phaser-input.ts` | 2026-02-10 | type-verified |
| `KeyboardPlugin.addKey()` | `/classes/Phaser.Input.Keyboard.KeyboardPlugin.html#addKey` | `core/adapters/phaser-input.ts` | 2026-02-10 | type-verified |
| `KeyboardPlugin.removeKey()` | `/classes/Phaser.Input.Keyboard.KeyboardPlugin.html#removeKey` | `core/adapters/phaser-input.ts` | 2026-02-10 | type-verified |
| `Phaser.Physics.Arcade.Body` | `/classes/Phaser.Physics.Arcade.Body.html` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Phaser.Physics.Arcade.World` | `/classes/Phaser.Physics.Arcade.World.html` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setVelocity()` | `/classes/Phaser.Physics.Arcade.Body.html#setVelocity` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setVelocityX()` | `/classes/Phaser.Physics.Arcade.Body.html#setVelocityX` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setVelocityY()` | `/classes/Phaser.Physics.Arcade.Body.html#setVelocityY` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setAcceleration()` | `/classes/Phaser.Physics.Arcade.Body.html#setAcceleration` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setAccelerationX()` | `/classes/Phaser.Physics.Arcade.Body.html#setAccelerationX` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setGravityY()` | `/classes/Phaser.Physics.Arcade.Body.html#setGravityY` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setDrag()` | `/classes/Phaser.Physics.Arcade.Body.html#setDrag` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setBounce()` | `/classes/Phaser.Physics.Arcade.Body.html#setBounce` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setSize()` | `/classes/Phaser.Physics.Arcade.Body.html#setSize` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setOffset()` | `/classes/Phaser.Physics.Arcade.Body.html#setOffset` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `Body.setMass()` | `/classes/Phaser.Physics.Arcade.Body.html#setMass` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `scene.add.zone()` | `/classes/Phaser.GameObjects.GameObjectFactory.html#zone` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `scene.add.rectangle()` | `/classes/Phaser.GameObjects.GameObjectFactory.html#rectangle` | `scenes/platformer-scene.ts` | 2026-02-11 | type-verified |
| `scene.add.text()` | `/classes/Phaser.GameObjects.GameObjectFactory.html#text` | `scenes/platformer-scene.ts` | 2026-02-10 | type-verified |
| `scene.physics.overlap()` | `/classes/Phaser.Physics.Arcade.ArcadePhysics.html#overlap` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `scene.physics.collide()` | `/classes/Phaser.Physics.Arcade.ArcadePhysics.html#collide` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `scene.scene.start()` | `/classes/Phaser.Scenes.ScenePlugin.html#start` | `scenes/boot-scene.ts` | 2026-02-10 | type-verified |
| `World.gravity` | `/classes/Phaser.Physics.Arcade.World.html#gravity` | `core/adapters/phaser-physics.ts` | 2026-02-10 | type-verified |
| `game.registry.set()` | `/classes/Phaser.Data.DataManager.html#set` | `main.ts` | 2026-02-11 | type-verified |
| `scene.registry.get()` | `/classes/Phaser.Data.DataManager.html#get` | `scenes/base-scene.ts` | 2026-02-11 | type-verified |
| `scene.scene.launch()` | `/classes/Phaser.Scenes.ScenePlugin.html#launch` | `scenes/base-scene.ts` | 2026-02-11 | type-verified |
| `scene.scene.stop()` | `/classes/Phaser.Scenes.ScenePlugin.html#stop` | `scenes/base-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.json()` | `/classes/Phaser.Loader.LoaderPlugin.html#json` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.image()` | `/classes/Phaser.Loader.LoaderPlugin.html#image` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.spritesheet()` | `/classes/Phaser.Loader.LoaderPlugin.html#spritesheet` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.atlas()` | `/classes/Phaser.Loader.LoaderPlugin.html#atlas` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.tilemapTiledJSON()` | `/classes/Phaser.Loader.LoaderPlugin.html#tilemapTiledJSON` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.audio()` | `/classes/Phaser.Loader.LoaderPlugin.html#audio` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.bitmapFont()` | `/classes/Phaser.Loader.LoaderPlugin.html#bitmapFont` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `Loader.Events.PROGRESS` | `/namespaces/Phaser.Loader.Events.html` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `Loader.Events.COMPLETE` | `/namespaces/Phaser.Loader.Events.html` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.load.start()` | `/classes/Phaser.Loader.LoaderPlugin.html#start` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `scene.cache.json.get()` | `/classes/Phaser.Cache.BaseCache.html#get` | `scenes/preload-scene.ts` | 2026-02-11 | type-verified |
| `Camera.setScroll()` | `/classes/Phaser.Cameras.Scene2D.BaseCamera.html#setScroll` | (planned) | — | type-verified |
| `Camera.scrollX` | `/classes/Phaser.Cameras.Scene2D.BaseCamera.html#scrollX` | (planned) | — | type-verified |
| `Camera.scrollY` | `/classes/Phaser.Cameras.Scene2D.BaseCamera.html#scrollY` | (planned) | — | type-verified |
| `Phaser.GameObjects.Sprite` | `/classes/Phaser.GameObjects.Sprite.html` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `scene.add.sprite()` | `/classes/Phaser.GameObjects.GameObjectFactory.html#sprite` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.setDisplaySize()` | `/classes/Phaser.GameObjects.Components.Size.html#setDisplaySize` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Loader.once('complete')` | `/classes/Phaser.Loader.LoaderPlugin.html` | `scenes/preload-scene.ts` | 2026-02-12 | type-verified |
| `scene.anims.create()` | `/classes/Phaser.Animations.AnimationManager.html#create` | `scenes/preload-scene.ts` | 2026-02-12 | type-verified |
| `scene.anims.generateFrameNumbers()` | `/classes/Phaser.Animations.AnimationManager.html#generateFrameNumbers` | `scenes/preload-scene.ts` | 2026-02-12 | type-verified |
| `scene.anims.exists()` | `/classes/Phaser.Animations.AnimationManager.html#exists` | `scenes/preload-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.play()` | `/classes/Phaser.GameObjects.Sprite.html#play` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.flipX` | `/classes/Phaser.GameObjects.Components.Flip.html#flipX` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `scene.make.tilemap()` | `/classes/Phaser.GameObjects.GameObjectCreator.html#tilemap` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Tilemap.addTilesetImage()` | `/classes/Phaser.Tilemaps.Tilemap.html#addTilesetImage` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Tilemap.createLayer()` | `/classes/Phaser.Tilemaps.Tilemap.html#createLayer` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `TilemapLayer.setCollisionByExclusion()` | `/classes/Phaser.Tilemaps.TilemapLayer.html#setCollisionByExclusion` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Tilemap.getObjectLayer()` | `/classes/Phaser.Tilemaps.Tilemap.html#getObjectLayer` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Tilemap.widthInPixels` | `/classes/Phaser.Tilemaps.Tilemap.html#widthInPixels` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Tilemap.heightInPixels` | `/classes/Phaser.Tilemaps.Tilemap.html#heightInPixels` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `physics.add.overlap()` | `/classes/Phaser.Physics.Arcade.Factory.html#overlap` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `GameObject.destroy()` | `/classes/Phaser.GameObjects.GameObject.html#destroy` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `scene.settings.data` | `/classes/Phaser.Scenes.ScenePlugin.html#start` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `scene.events.once()` | `/classes/Phaser.Events.EventEmitter.html#once` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Text.setOrigin()` | `/classes/Phaser.GameObjects.Components.Origin.html#setOrigin` | `scenes/hud-scene.ts` | 2026-02-12 | type-verified |
| `GameObject.setInteractive()` | `/classes/Phaser.GameObjects.GameObject.html#setInteractive` | `scenes/level-complete-scene.ts` | 2026-02-12 | type-verified |
| `EventEmitter.on()` | `/classes/Phaser.Events.EventEmitter.html#on` | `scenes/level-complete-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.setPosition()` | `/classes/Phaser.GameObjects.Components.Transform.html#setPosition` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.alpha` | `/classes/Phaser.GameObjects.Components.Alpha.html#alpha` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Sprite.x` | `/classes/Phaser.GameObjects.Components.Transform.html#x` | `scenes/platformer-scene.ts` | 2026-02-12 | type-verified |
| `Scene.scale` (ScaleManager) | `/classes/Phaser.Scale.ScaleManager.html` | `scenes/preload-scene.ts` | 2026-02-12 | type-verified |
| `ScenePlugin.pause()` | `/classes/Phaser.Scenes.ScenePlugin.html#pause` — `phaser.d.ts:109195` | `scenes/base-scene.ts` | 2026-02-12 | type-verified |
| `ScenePlugin.resume()` | `/classes/Phaser.Scenes.ScenePlugin.html#resume` — `phaser.d.ts:109205` | `scenes/base-scene.ts` | 2026-02-12 | type-verified |
| `Camera.setBackgroundColor()` | `/classes/Phaser.Cameras.Scene2D.Camera.html#setBackgroundColor` — `phaser.d.ts:3178` | `scenes/title-scene.ts` | 2026-02-12 | type-verified |
| `GameObject.setDepth()` | `/classes/Phaser.GameObjects.Components.Depth.html#setDepth` — `phaser.d.ts:14009` | `scenes/pause-scene.ts` | 2026-02-12 | type-verified |
| `Text.setColor()` | `/classes/Phaser.GameObjects.Text.html#setColor` — `phaser.d.ts:58828` | `scenes/title-scene.ts` | 2026-02-12 | type-verified |
| `EventEmitter.off()` | `/classes/Phaser.Events.EventEmitter.html#off` — `phaser.d.ts:10108` | `scenes/pause-scene.ts` | 2026-02-12 | type-verified |
| `Shape.fillColor` | `/classes/Phaser.GameObjects.Shape.html#fillColor` — `phaser.d.ts:40462` | `scenes/minigame-scene.ts` | 2026-02-12 | type-verified |
| `Shape.setFillStyle()` | `/classes/Phaser.GameObjects.Shape.html#setFillStyle` — `phaser.d.ts:40532` | `scenes/minigame-scene.ts` | 2026-02-12 | type-verified |
| `Text.setText()` | `/classes/Phaser.GameObjects.Text.html#setText` — `phaser.d.ts:57018` | `scenes/hud-scene.ts` | 2026-02-12 | type-verified |
| `Text.setVisible()` | `/classes/Phaser.GameObjects.Components.Visible.html#setVisible` — `phaser.d.ts:14801` | `scenes/minigame-hud-scene.ts` | 2026-02-12 | type-verified |
| `Shape.setPosition()` | `/classes/Phaser.GameObjects.Components.Transform.html#setPosition` — inherited via Shape | `scenes/minigame-scene.ts` | 2026-02-12 | type-verified |
| `Shape.alpha` | `/classes/Phaser.GameObjects.Components.AlphaSingle.html#alpha` — inherited via Shape | `scenes/minigame-scene.ts` | 2026-02-12 | type-verified |
| `game.sound` (BaseSoundManager) | `/classes/Phaser.Sound.BaseSoundManager.html` — `phaser.d.ts:86703` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSoundManager.play()` | `/classes/Phaser.Sound.BaseSoundManager.html#play` — `phaser.d.ts:87100` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSoundManager.add()` | `/classes/Phaser.Sound.BaseSoundManager.html#add` — `phaser.d.ts:86820` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSoundManager.mute` | `/classes/Phaser.Sound.BaseSoundManager.html#mute` — `phaser.d.ts:86753` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSoundManager.locked` | `/classes/Phaser.Sound.BaseSoundManager.html#locked` — `phaser.d.ts:86786` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.play()` | `/classes/Phaser.Sound.BaseSound.html#play` — `phaser.d.ts:86342` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.stop()` | `/classes/Phaser.Sound.BaseSound.html#stop` — `phaser.d.ts:86360` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.pause()` | `/classes/Phaser.Sound.BaseSound.html#pause` — `phaser.d.ts:86348` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.resume()` | `/classes/Phaser.Sound.BaseSound.html#resume` — `phaser.d.ts:86354` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.destroy()` | `/classes/Phaser.Sound.BaseSound.html#destroy` — `phaser.d.ts:86452` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.isPlaying` | `/classes/Phaser.Sound.BaseSound.html#isPlaying` — `phaser.d.ts:86398` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `BaseSound.isPaused` | `/classes/Phaser.Sound.BaseSound.html#isPaused` — `phaser.d.ts:86404` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `WebAudioSound.setVolume()` | `/classes/Phaser.Sound.WebAudioSound.html#setVolume` — `phaser.d.ts:88230` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `SoundConfig` (Types) | `/types/Phaser.Types.Sound.SoundConfig.html` — `phaser.d.ts:116908` | `core/adapters/phaser-audio.ts` | 2026-02-15 | type-verified |
| `Phaser.GameObjects.Container` | `/classes/Phaser.GameObjects.Container.html` — `phaser.d.ts:20609` | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `scene.add.container()` | `/classes/Phaser.GameObjects.GameObjectFactory.html#container` — `phaser.d.ts:12463` | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `Container.add()` | `/classes/Phaser.GameObjects.Container.html#add` — `phaser.d.ts:25866` | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `Shape.setStrokeStyle()` | `/classes/Phaser.GameObjects.Shape.html#setStrokeStyle` — `phaser.d.ts:40547` | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `GameObject.setAlpha()` | `/classes/Phaser.GameObjects.Components.AlphaSingle.html#setAlpha` — `phaser.d.ts:17600` | `scenes/world-select-scene.ts` | 2026-02-15 | type-verified |
| `TweenManager.add()` | `/classes/Phaser.Tweens.TweenManager.html#add` — `phaser.d.ts:124032` | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `Phaser.Tweens.Tween` | `/classes/Phaser.Tweens.Tween.html` — `phaser.d.ts:123942` (ref) | `scenes/character-select-scene.ts` | 2026-02-15 | type-verified |
| `SpriteGPULayer` | `/classes/Phaser.GameObjects.SpriteGPULayer.html` | (planned) | — | — |
| `Texture#setWrap` | `/classes/Phaser.Textures.Texture.html#setWrap` | (planned) | — | — |

## Rejected (Phaser 3 only — NOT in rc.6)

| Symbol | Why Rejected | Correct rc.6 Alternative |
|--------|-------------|--------------------------|
| (none yet) | | |
