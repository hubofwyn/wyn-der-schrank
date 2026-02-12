import type { CharacterStats } from '@wds/shared';
import { PlatformerConfigSchema, SettingsSchema } from '@wds/shared';
import { PhaserInput } from '../core/adapters/phaser-input.js';
import { PhaserBody } from '../core/adapters/phaser-physics.js';
import type { IGameClock } from '../core/ports/engine.js';
import { getCoinDefaultAnim } from '../modules/collectible/animation-config.js';
import { CollectibleManager } from '../modules/collectible/collectible-manager.js';
import { getSkeletonDefaultAnim } from '../modules/enemy/animation-config.js';
import { EnemyManager } from '../modules/enemy/enemy-manager.js';
import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import { GAMEPLAY_STATE_KEY } from '../modules/game-state/gameplay-state.js';
import {
	extractCollectibles,
	extractEnemies,
	extractExit,
	extractSpawn,
} from '../modules/level/tilemap-objects.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { getAnimKeyForState } from '../modules/player/animation-config.js';
import { PlayerController } from '../modules/player/player-controller.js';
import { ScoreTracker } from '../modules/scoring/score-tracker.js';
import { BaseScene } from './base-scene.js';

const DEFAULT_ENEMY_DAMAGE = 20;
const DEFAULT_ENEMY_HEALTH = 50;
const DEFAULT_ENEMY_SPEED = 60;

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
	private collectibleManager!: CollectibleManager;
	private scoreTracker!: ScoreTracker;
	private enemyManager!: EnemyManager;
	private collectibleSprites: Phaser.GameObjects.Sprite[] = [];
	private enemySprites: Phaser.GameObjects.Sprite[] = [];
	private levelStartMs = 0;
	private mapKey = 'map-forest-1';
	private levelCompleted = false;
	private lives = 3;

	constructor() {
		super({ key: SceneKeys.PLATFORMER });
	}

	create(data?: Record<string, unknown>): void {
		this.levelCompleted = false;

		// ── Level parameterization ──
		const settingsData = this.scene.settings.data as Record<string, unknown> | undefined;
		const rawKey = data?.mapKey ?? settingsData?.mapKey;
		if (typeof rawKey === 'string') {
			this.mapKey = rawKey;
		} else {
			this.mapKey = 'map-forest-1';
		}

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

		// ── Domain modules ──
		this.collectibleManager = new CollectibleManager();
		this.scoreTracker = new ScoreTracker();

		// ── Tilemap ──
		const map = this.make.tilemap({ key: this.mapKey });
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
		this.lives = 3;

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

		// ── Enemies with patrol AI ──
		const enemies = extractEnemies(objects);
		this.enemyManager = new EnemyManager();
		this.enemyManager.init(
			enemies.map((e) => ({
				damage: DEFAULT_ENEMY_DAMAGE,
				health: DEFAULT_ENEMY_HEALTH,
				speed: DEFAULT_ENEMY_SPEED,
				patrolLeftBound: e.x - e.patrolRange,
				patrolRightBound: e.x + e.patrolRange,
			})),
		);

		this.enemySprites = [];
		for (const enemy of enemies) {
			const sprite = this.add.sprite(enemy.x, enemy.y, 'enemy-skeleton-idle');
			sprite.setDisplaySize(32, 48);
			sprite.play(getSkeletonDefaultAnim());
			this.physics.add.existing(sprite, false);
			const enemyBody = sprite.body as Phaser.Physics.Arcade.Body;
			enemyBody.setCollideWorldBounds(true);
			enemyBody.setMaxVelocity(DEFAULT_ENEMY_SPEED, 600);
			this.enemySprites.push(sprite);
		}

		// ── Collectibles (with physics for pickup) ──
		const collectibles = extractCollectibles(objects);
		this.collectibleManager.init(collectibles);
		this.collectibleSprites = [];

		for (const pos of collectibles) {
			const sprite = this.add.sprite(pos.x, pos.y, 'collectible-coin');
			sprite.setDisplaySize(16, 16);
			sprite.play(getCoinDefaultAnim());
			this.physics.add.existing(sprite, true);
			this.collectibleSprites.push(sprite);
		}

		// ── Collectible overlap ──
		for (let i = 0; i < this.collectibleSprites.length; i++) {
			const coinSprite = this.collectibleSprites[i];
			if (!coinSprite) continue;
			const index = i;
			this.physics.add.overlap(this.playerSprite, coinSprite, () => {
				this.onCollectibleOverlap(index);
			});
		}

		// ── Exit zone ──
		const exitPos = extractExit(objects);
		if (exitPos) {
			const exitZone = this.add.zone(exitPos.x, exitPos.y, 32, 64);
			this.physics.add.existing(exitZone, true);
			this.physics.add.overlap(this.playerSprite, exitZone, () => {
				this.onExitReached();
			});
		}

		// ── Collisions ──
		this.physics.add.collider(this.playerSprite, groundLayer);

		// ── Enemy collisions + overlap ──
		for (let i = 0; i < this.enemySprites.length; i++) {
			const enemySprite = this.enemySprites[i];
			if (!enemySprite) continue;
			this.physics.add.collider(enemySprite, groundLayer);
			const idx = i;
			this.physics.add.overlap(this.playerSprite, enemySprite, () => {
				this.onEnemyOverlap(idx);
			});
		}

		// ── Camera ──
		this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		// ── World bounds ──
		this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		// ── Level time tracking ──
		this.levelStartMs = this.clock.elapsed;

		// ── HUD ──
		this.launchParallel(SceneKeys.HUD);
		this.events.once('shutdown', () => {
			this.stopParallel(SceneKeys.HUD);
		});
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

		// ── Invincibility flash ──
		if (snap.isInvincible) {
			this.playerSprite.alpha = Math.sin(this.clock.elapsed * 0.01) > 0 ? 1 : 0.3;
		} else {
			this.playerSprite.alpha = 1;
		}

		// ── Enemy AI updates ──
		const positions = this.enemySprites.map((s) => ({ x: s.x }));
		const intents = this.enemyManager.updateAll(positions);
		for (let i = 0; i < this.enemySprites.length; i++) {
			const sprite = this.enemySprites[i];
			const intent = intents[i];
			if (!sprite || !intent) continue;
			const enemyBody = sprite.body as Phaser.Physics.Arcade.Body;
			enemyBody.setVelocityX(intent.velocityX);
			sprite.flipX = intent.facing === 'left';
			sprite.play(intent.velocityX !== 0 ? 'skeleton-walk' : 'skeleton-idle', true);
		}

		// ── Write gameplay state to registry ──
		const timeElapsedMs = this.clock.elapsed - this.levelStartMs;
		const state: GameplayState = {
			health: snap.health,
			maxHealth: snap.maxHealth,
			score: this.scoreTracker.score,
			coins: this.collectibleManager.collectedCount,
			coinsTotal: this.collectibleManager.total,
			levelId: this.mapKey,
			levelName: this.mapKey.replace('map-', '').replace(/-/g, ' '),
			timeElapsedMs,
			stars: 0,
			completed: false,
			lives: this.lives,
		};
		this.registry.set(GAMEPLAY_STATE_KEY, state);
	}

	private onCollectibleOverlap(index: number): void {
		const result = this.collectibleManager.collect(index);
		if (!result.collected) return;

		this.scoreTracker.addCoins(result.coinCount);
		const sprite = this.collectibleSprites[index];
		if (sprite) {
			sprite.destroy();
		}
	}

	private onExitReached(): void {
		if (this.levelCompleted) return;
		this.levelCompleted = true;

		const timeElapsedMs = this.clock.elapsed - this.levelStartMs;
		const finalScore = this.scoreTracker.finalScore(timeElapsedMs);
		const stars = this.scoreTracker.calculateStarRating(finalScore, {
			oneStar: 30,
			twoStar: 80,
			threeStar: 140,
		});

		const snap = this.playerController.snapshot();
		const finalState: GameplayState = {
			health: snap.health,
			maxHealth: snap.maxHealth,
			score: finalScore,
			coins: this.collectibleManager.collectedCount,
			coinsTotal: this.collectibleManager.total,
			levelId: this.mapKey,
			levelName: this.mapKey.replace('map-', '').replace(/-/g, ' '),
			timeElapsedMs,
			stars,
			completed: true,
			lives: this.lives,
		};
		this.registry.set(GAMEPLAY_STATE_KEY, finalState);

		this.stopParallel(SceneKeys.HUD);
		this.navigateTo(SceneKeys.LEVEL_COMPLETE);
	}

	private onEnemyOverlap(index: number): void {
		const enemy = this.enemyManager.getEnemy(index);
		if (!enemy) return;
		const enemySnap = enemy.snapshot();
		if (!enemySnap.isAlive) return;
		this.playerController.takeDamage(enemySnap.damage);
	}
}
