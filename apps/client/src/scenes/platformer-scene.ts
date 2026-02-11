import type { CharacterStats } from '@wds/shared';
import { PlatformerConfigSchema, SettingsSchema } from '@wds/shared';
import { PhaserInput } from '../core/adapters/phaser-input.js';
import { PhaserBody } from '../core/adapters/phaser-physics.js';
import type { IGameClock } from '../core/ports/engine.js';
import { getCoinDefaultAnim } from '../modules/collectible/animation-config.js';
import { getSkeletonDefaultAnim } from '../modules/enemy/animation-config.js';
import {
	extractCollectibles,
	extractEnemies,
	extractSpawn,
} from '../modules/level/tilemap-objects.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { getAnimKeyForState } from '../modules/player/animation-config.js';
import { PlayerController } from '../modules/player/player-controller.js';
import { BaseScene } from './base-scene.js';

/**
 * PlatformerScene — the core gameplay scene.
 *
 * Renders a Tiled tilemap for level geometry and collision.
 * Wires PlayerController through ports to sprite rendering.
 * Game-scoped services come from the DI container; scene-scoped
 * adapters (input, body) are created here because they need a live scene.
 */
export class PlatformerScene extends BaseScene {
	private clock!: IGameClock;
	private phaserInput!: PhaserInput;
	private playerController!: PlayerController;
	private playerSprite!: Phaser.GameObjects.Sprite;

	constructor() {
		super({ key: SceneKeys.PLATFORMER });
	}

	create(): void {
		// ── Game-scoped services from container ──
		this.clock = this.container.clock;

		// ── Scene-scoped adapters ──
		this.phaserInput = new PhaserInput(
			this.input.keyboard!,
			SettingsSchema.parse({
				audio: {},
				display: {},
				controls: {},
				accessibility: {},
			}),
		);

		// ── Tilemap ──
		const map = this.make.tilemap({ key: 'map-forest-1' });
		const tileset = map.addTilesetImage('dungeon-tileset', 'tiles-dungeon', 16, 16);

		if (!tileset) {
			throw new Error('Failed to load dungeon tileset');
		}

		const groundLayer = map.createLayer('Ground', tileset, 0, 0);

		if (!groundLayer) {
			throw new Error('Failed to create Ground layer');
		}

		groundLayer.setCollisionByExclusion([-1]);

		const objectLayer = map.getObjectLayer('Objects');
		const objects = objectLayer?.objects ?? [];

		// ── Spawn point from tilemap objects ──
		const spawn = extractSpawn(objects) ?? { x: 100, y: 700 };

		// ── Player ──
		this.playerSprite = this.add.sprite(spawn.x, spawn.y, 'player');
		this.playerSprite.setDisplaySize(32, 48);
		this.physics.add.existing(this.playerSprite, false);

		const arcadeBody = this.playerSprite.body as Phaser.Physics.Arcade.Body;
		arcadeBody.setCollideWorldBounds(true);
		arcadeBody.setMaxVelocity(300, 600);

		const playerBody = new PhaserBody(arcadeBody);

		const config = PlatformerConfigSchema.parse({});
		const stats: CharacterStats = {
			maxHealth: 100,
			speed: 250,
			jumpForce: 420,
			attackPower: 10,
			defense: 5,
		};

		this.playerController = new PlayerController({
			input: this.phaserInput,
			body: playerBody,
			clock: this.clock,
			config,
			stats,
		});

		// ── Enemies (visual only — domain AI is G4) ──
		const enemies = extractEnemies(objects);
		this.placeEntities(enemies, 'enemy-skeleton-idle', 32, 48, getSkeletonDefaultAnim());

		// ── Collectibles (visual only — pickup logic is G3) ──
		const collectibles = extractCollectibles(objects);
		this.placeEntities(collectibles, 'collectible-coin', 16, 16, getCoinDefaultAnim());

		// ── Collisions ──
		this.physics.add.collider(this.playerSprite, groundLayer);

		// ── Camera ──
		this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		// ── World bounds ──
		this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
	}

	update(time: number, delta: number): void {
		this.clock.refresh(time, delta);
		this.phaserInput.update();
		this.playerController.update();

		// ── Drive sprite from domain state ──
		const snap = this.playerController.snapshot();
		const animKey = getAnimKeyForState(snap.state);
		this.playerSprite.play(animKey, true);
		this.playerSprite.flipX = snap.facing === 'left';
	}

	private placeEntities(
		entities: ReadonlyArray<{ x: number; y: number }>,
		textureKey: string,
		width: number,
		height: number,
		defaultAnim: string,
	): void {
		for (const entity of entities) {
			const sprite = this.add.sprite(entity.x, entity.y, textureKey);
			sprite.setDisplaySize(width, height);
			sprite.play(defaultAnim);
		}
	}
}
