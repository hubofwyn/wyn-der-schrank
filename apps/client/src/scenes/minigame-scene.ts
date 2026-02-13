import { SettingsSchema } from '@hub-of-wyn/shared';
import { PhaserInput } from '../core/adapters/phaser-input.js';
import type { MinigameScope } from '../core/container.js';
import type { IGameClock } from '../core/ports/engine.js';
import type { ShakeRushRenderState } from '../modules/minigame/games/shake-rush/shake-rush-config.js';
import { getLaneY, SHAKE_RUSH } from '../modules/minigame/games/shake-rush/shake-rush-config.js';
import { MINIGAME_HUD_STATE_KEY } from '../modules/minigame/minigame-hud-state.js';
import type { IMinigameLogic } from '../modules/minigame/minigame-logic.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

/** Color palette for rendering entity kinds as colored rectangles. */
const ENTITY_COLORS: Record<string, number> = {
	'parcel-protein': 0x22cc44,
	'parcel-special': 0xffd700,
	'obstacle-poop': 0x8b4513,
	'obstacle-cone': 0xff8c00,
	'obstacle-bird': 0x4488cc,
};

const LANE_COLORS = [0x334455, 0x2a3a4a, 0x334455] as const;
const DELIVERY_ZONE_COLOR = 0x00aa44;
const PLAYER_COLOR = 0xff4444;
const PLAYER_CARRYING_COLOR = 0x44ff44;
const FINISH_DELAY_MS = 2000;

/**
 * MinigameScene — drives pure minigame logic via the snapshot/intent pattern.
 *
 * Creates a MinigameScope from the DI container, updates the logic each frame,
 * reads the render snapshot to position visuals, and writes HUD state to the
 * registry for MinigameHudScene to display.
 *
 * All game rules live in modules/. This scene is a thin Phaser rendering layer.
 */
export class MinigameScene extends BaseScene {
	private clock!: IGameClock;
	private phaserInput!: PhaserInput;
	private scope!: MinigameScope;
	private logic!: IMinigameLogic;

	// Visual objects
	private playerRect!: Phaser.GameObjects.Rectangle;
	private entityPool: Map<number, Phaser.GameObjects.Rectangle> = new Map();
	private introText!: Phaser.GameObjects.Text;

	// Finish state
	private finished = false;
	private finishTimerMs = 0;

	constructor() {
		super({ key: SceneKeys.MINIGAME });
	}

	create(data?: Record<string, unknown>): void {
		this.finished = false;
		this.finishTimerMs = 0;
		this.entityPool.clear();

		const minigameId = (data?.minigameId as string) ?? 'shake-rush';

		// ── Game-scoped services from container ──
		this.clock = this.container.clock;

		// ── Scene-scoped input adapter ──
		this.phaserInput = new PhaserInput(
			this.input.keyboard!,
			SettingsSchema.parse({
				audio: {},
				display: {},
				controls: {},
				accessibility: {},
				diagnostics: {},
			}),
		);

		// ── Create minigame scope via container factory ──
		const createScope = this.container.createMinigameScope;
		if (!createScope) {
			throw new Error('createMinigameScope not wired in container');
		}
		this.scope = createScope(minigameId, this.phaserInput);
		this.logic = this.scope.logic;

		// ── Lane backgrounds ──
		for (let i = 0; i < SHAKE_RUSH.LANE_COUNT; i++) {
			const y = getLaneY(i);
			this.add.rectangle(
				SHAKE_RUSH.WORLD_WIDTH / 2,
				y,
				SHAKE_RUSH.WORLD_WIDTH,
				SHAKE_RUSH.LANE_HEIGHT - 4,
				LANE_COLORS[i] ?? 0x334455,
				0.6,
			);
		}

		// ── Delivery zone indicator ──
		const dzWidth = SHAKE_RUSH.WORLD_WIDTH - SHAKE_RUSH.DELIVERY_ZONE_X;
		this.add.rectangle(
			SHAKE_RUSH.DELIVERY_ZONE_X + dzWidth / 2,
			getLaneY(1),
			dzWidth,
			SHAKE_RUSH.LANE_COUNT * SHAKE_RUSH.LANE_HEIGHT,
			DELIVERY_ZONE_COLOR,
			0.3,
		);

		// ── Player ──
		this.playerRect = this.add.rectangle(
			SHAKE_RUSH.PLAYER_START_X,
			getLaneY(1),
			32,
			40,
			PLAYER_COLOR,
		);

		// ── Intro prompt ──
		this.introText = this.add.text(SHAKE_RUSH.WORLD_WIDTH / 2, 200, 'Press SPACE to Start', {
			fontSize: '32px',
			color: '#ffffff',
			fontFamily: 'monospace',
		});
		this.introText.setOrigin(0.5, 0.5);

		// ── HUD overlay ──
		this.launchParallel(SceneKeys.MINIGAME_HUD);
		this.events.once('shutdown', () => {
			this.stopParallel(SceneKeys.MINIGAME_HUD);
			this.cleanupEntityPool();
			this.scope.dispose();
		});

		this.container.diagnostics.emit('scene', 'state', 'lifecycle', {
			scene: SceneKeys.MINIGAME,
			event: 'created',
			minigameId,
		});
	}

	update(time: number, delta: number): void {
		this.clock.refresh(time, delta);
		this.phaserInput.update();

		// ── Intro phase: await start input ──
		if (this.logic.phase === 'intro') {
			if (this.phaserInput.justPressed('ability')) {
				this.logic.start();
				this.introText.setVisible(false);
			}
			this.registry.set(MINIGAME_HUD_STATE_KEY, this.logic.hudSnapshot());
			return;
		}

		// ── Finished phase: countdown then navigate ──
		if (this.logic.phase === 'finished') {
			if (!this.finished) {
				this.finished = true;
				this.finishTimerMs = FINISH_DELAY_MS;
				const result = this.logic.getResult();
				if (result) {
					this.registry.set('minigame-result', result);
				}
			}
			this.finishTimerMs -= delta;
			if (this.finishTimerMs <= 0) {
				this.navigateTo(SceneKeys.TITLE);
			}
			this.registry.set(MINIGAME_HUD_STATE_KEY, this.logic.hudSnapshot());
			return;
		}

		// ── Active phase: run game logic and render ──
		this.logic.update(delta);

		const snap = this.logic.renderSnapshot() as ShakeRushRenderState;

		// Sync player
		this.playerRect.setPosition(snap.player.x, snap.player.y);
		this.playerRect.setFillStyle(snap.player.carrying ? PLAYER_CARRYING_COLOR : PLAYER_COLOR);

		// Invincibility flash
		if (snap.player.isInvincible) {
			this.playerRect.alpha = Math.sin(this.clock.elapsed * 0.01) > 0 ? 1 : 0.3;
		} else {
			this.playerRect.alpha = 1;
		}

		// Sync entity pool — create/update/destroy per frame
		const activeIds = new Set<number>();
		for (const entity of snap.entities) {
			if (!entity.active) continue;
			activeIds.add(entity.id);

			let rect = this.entityPool.get(entity.id);
			if (!rect) {
				const size = entity.kind.startsWith('obstacle') ? 28 : 24;
				rect = this.add.rectangle(
					entity.x,
					entity.y,
					size,
					size,
					ENTITY_COLORS[entity.kind] ?? 0xffffff,
				);
				this.entityPool.set(entity.id, rect);
			}
			rect.setPosition(entity.x, entity.y);
		}

		// Destroy pool entries no longer in the snapshot
		for (const [id, rect] of this.entityPool) {
			if (!activeIds.has(id)) {
				rect.destroy();
				this.entityPool.delete(id);
			}
		}

		// Write HUD state for MinigameHudScene
		this.registry.set(MINIGAME_HUD_STATE_KEY, this.logic.hudSnapshot());
	}

	private cleanupEntityPool(): void {
		for (const rect of this.entityPool.values()) {
			rect.destroy();
		}
		this.entityPool.clear();
	}
}
