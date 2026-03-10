import type { CharacterStats } from '@hub-of-wyn/shared';
import { PlatformerConfigSchema } from '@hub-of-wyn/shared';
import { AdaptiveInput } from '../core/adapters/adaptive-input.js';
import { PhaserInput } from '../core/adapters/phaser-input.js';
import { PhaserBody } from '../core/adapters/phaser-physics.js';
import { TouchInput } from '../core/adapters/touch-input.js';
import type { IGameClock } from '../core/ports/engine.js';
import type { IInputProvider } from '../core/ports/input.js';
import { MusicKeys, pickSfxVariant, SfxKeys } from '../modules/assets/audio-keys.js';
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
	extractMinigamePortals,
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
 *
 * Audio policy:
 *   Music  — platformer-theme (loop, crossfade from title/other tracks)
 *   SFX    — jump on takeoff, land on ground contact, coin on pickup,
 *            hurt on damage, game-over sting on final death
 *   Silent — pause (music paused, not stopped); respawn (no extra SFX)
 */
export class PlatformerScene extends BaseScene {
	private clock!: IGameClock;
	private inputAdapter!: IInputProvider;
	private touchInput: TouchInput | null = null;
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
	private portalTriggered = false;
	private deathHandled = false;
	private lives = 3;
	private spawnPoint = { x: 100, y: 700 };
	private previousPlayerState: string | null = null;

	constructor() {
		super({ key: SceneKeys.PLATFORMER });
	}

	create(data?: Record<string, unknown>): void {
		this.levelCompleted = false;
		this.portalTriggered = false;

		// ── Level parameterization ──
		// Priority: explicit scene data > flowController > hardcoded fallback
		const settingsData = this.scene.settings.data as Record<string, unknown> | undefined;
		const rawKey = data?.mapKey ?? settingsData?.mapKey;
		if (typeof rawKey === 'string') {
			this.mapKey = rawKey;
		} else {
			const flowMapKey = this.container.flowController.getMapKey();
			if (flowMapKey) {
				this.mapKey = flowMapKey;
			} else {
				this.mapKey = 'map-forest-1';
				this.container.diagnostics.emit('scene', 'warn', 'fallback-mapkey', {
					reason: 'no explicit mapKey or flowController selection',
					fallback: this.mapKey,
				});
			}
		}

		// ── Music: crossfade into platformer theme ──
		this.container.audio.playMusic(MusicKeys.PLATFORMER, { loop: true, fadeInMs: 800 });

		// ── Game-scoped services from container ──
		this.clock = this.container.clock;

		// ── Scene-scoped input adapters ──
		const settings = this.container.settingsManager.current;
		const keyboard = new PhaserInput(this.input.keyboard!, settings);

		if (
			this.container.viewport.isTouchDevice &&
			settings.controls.touchControlsEnabled &&
			settings.controls.controlScheme !== 'keyboard'
		) {
			this.touchInput = new TouchInput(document.body, settings);
			this.inputAdapter = new AdaptiveInput(keyboard, this.touchInput);
		} else {
			this.touchInput = null;
			this.inputAdapter = keyboard;
		}

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
		this.spawnPoint = spawn;
		this.lives = 3;
		this.deathHandled = false;

		// ── Player ──
		this.playerSprite = this.add.sprite(spawn.x, spawn.y, 'player');
		this.playerSprite.setDisplaySize(32, 48);
		this.physics.add.existing(this.playerSprite, false);

		const arcadeBody = this.playerSprite.body as Phaser.Physics.Arcade.Body;
		arcadeBody.setCollideWorldBounds(true);
		arcadeBody.setMaxVelocity(300, 600);

		const playerBody = new PhaserBody(arcadeBody);

		const config = PlatformerConfigSchema.parse({});

		// Read character stats: flowController selection > catalog default > hardcoded
		const charId = this.container.flowController.selection.characterId;
		const charDef = charId ? this.container.characterCatalog.getById(charId) : null;
		const defaultChar = this.container.characterCatalog.getDefault();
		const resolvedStats = charDef?.stats ?? defaultChar?.stats;
		const stats: CharacterStats = resolvedStats ?? {
			maxHealth: 100,
			speed: 250,
			jumpForce: 420,
			attackPower: 10,
			defense: 5,
		};
		if (!resolvedStats) {
			this.container.diagnostics.emit('scene', 'warn', 'fallback-stats', {
				reason: 'no character selected and catalog empty',
			});
		}

		this.playerController = new PlayerController({
			input: this.inputAdapter,
			body: playerBody,
			clock: this.clock,
			config,
			stats,
			diagnostics: this.container.diagnostics,
		});

		// ── Enemies with patrol AI ──
		const enemies = extractEnemies(objects);
		this.enemyManager = new EnemyManager(this.container.diagnostics);
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

		// ── Minigame portals ──
		const portals = extractMinigamePortals(objects);
		for (const portal of portals) {
			const portalZone = this.add.zone(portal.x, portal.y, 32, 64);
			this.physics.add.existing(portalZone, true);
			const portalMinigameId = portal.minigameId;
			this.physics.add.overlap(this.playerSprite, portalZone, () => {
				this.onMinigamePortalReached(portalMinigameId);
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

		// ── Resume handler: restore touch overlay after unpause ──
		this.events.on('resume', () => {
			this.touchInput?.setVisible(true);
		});

		this.events.once('shutdown', () => {
			this.stopParallel(SceneKeys.HUD);
			this.touchInput?.destroy();
			this.touchInput = null;
		});

		this.previousPlayerState = null;

		this.container.diagnostics.emit('scene', 'state', 'lifecycle', {
			scene: SceneKeys.PLATFORMER,
			event: 'created',
			mapKey: this.mapKey,
		});
	}

	update(time: number, delta: number): void {
		this.clock.refresh(time, delta);
		this.inputAdapter.update();

		// ── Pause detection ──
		if (this.inputAdapter.justPressed('pause') && !this.levelCompleted && !this.deathHandled) {
			this.touchInput?.setVisible(false);
			this.pauseScene(SceneKeys.HUD);
			this.pauseScene();
			this.launchParallel(SceneKeys.PAUSE);
			return;
		}

		this.playerController.update();

		// ── Drive sprite from domain state ──
		const snap = this.playerController.snapshot();
		const animKey = getAnimKeyForState(snap.state);
		this.playerSprite.play(animKey, true);
		this.playerSprite.flipX = snap.facing === 'left';

		// ── SFX on player state transitions ──
		if (this.previousPlayerState !== snap.state) {
			const wasAirborne =
				this.previousPlayerState === 'jumping' || this.previousPlayerState === 'falling';
			const isGrounded = snap.state === 'idle' || snap.state === 'running';

			if (snap.state === 'jumping') {
				const sfx = pickSfxVariant('jump');
				if (sfx) this.container.audio.playSfx(sfx);
			} else if (wasAirborne && isGrounded) {
				const sfx = pickSfxVariant('land');
				if (sfx) this.container.audio.playSfx(sfx);
			}
			this.previousPlayerState = snap.state;
		}

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

		// ── Death detection ──
		if (snap.state === 'dead' && !this.deathHandled) {
			this.deathHandled = true;
			this.handlePlayerDeath();
		}
	}

	private onCollectibleOverlap(index: number): void {
		const result = this.collectibleManager.collect(index);
		if (!result.collected) return;

		const sfx = pickSfxVariant('coin');
		if (sfx) this.container.audio.playSfx(sfx);

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

		// Fade out gameplay music before transitioning — the level-complete
		// scene plays a victory jingle that should land over silence.
		this.container.audio.stopMusic(300);
		this.stopParallel(SceneKeys.HUD);
		this.navigateTo(SceneKeys.LEVEL_COMPLETE);
	}

	private handlePlayerDeath(): void {
		this.lives--;

		// Update registry so game-over scene reads correct data
		const timeElapsedMs = this.clock.elapsed - this.levelStartMs;
		const snap = this.playerController.snapshot();
		const deathState: GameplayState = {
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
		this.registry.set(GAMEPLAY_STATE_KEY, deathState);

		if (this.lives > 0) {
			// Respawn at spawn point — collected coins persist across respawns
			const sfx = pickSfxVariant('hurt');
			if (sfx) this.container.audio.playSfx(sfx);
			this.playerSprite.setPosition(this.spawnPoint.x, this.spawnPoint.y);
			this.playerController.respawn();
			this.deathHandled = false;
		} else {
			// Game over — fade music, play sting, transition
			this.container.audio.stopMusic(400);
			this.container.audio.playSfx(SfxKeys.GAME_OVER);
			this.stopParallel(SceneKeys.HUD);
			this.navigateTo(SceneKeys.GAME_OVER);
		}
	}

	private onEnemyOverlap(index: number): void {
		const enemy = this.enemyManager.getEnemy(index);
		if (!enemy) return;
		const enemySnap = enemy.snapshot();
		if (!enemySnap.isAlive) return;
		const result = this.playerController.takeDamage(enemySnap.damage);
		if (result.damaged) {
			const sfx = pickSfxVariant('hurt');
			if (sfx) this.container.audio.playSfx(sfx);
			this.container.diagnostics.emit('scene', 'state', 'collision', {
				type: 'enemy-damage',
				enemyIndex: index,
				damage: enemySnap.damage,
				playerHealth: result.newHealth,
			});
		}
	}

	private onMinigamePortalReached(minigameId: string): void {
		if (this.portalTriggered || this.levelCompleted) return;
		this.portalTriggered = true;

		this.container.diagnostics.emit('scene', 'state', 'portal', {
			type: 'minigame-portal',
			minigameId,
		});

		this.stopParallel(SceneKeys.HUD);
		this.scene.start(SceneKeys.MINIGAME, { minigameId });
	}
}
