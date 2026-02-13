import type { MinigameId, MinigamePhase, MinigameResult } from '@hub-of-wyn/shared';
import type { IDiagnostics } from '../../../../core/ports/diagnostics.js';
import type { IInputProvider } from '../../../../core/ports/input.js';
import type { MinigameHudState } from '../../minigame-hud-state.js';
import type { IMinigameLogic, MinigameLogicDeps } from '../../minigame-logic.js';
import {
	checkObstacleHit,
	checkPickup,
	createLaneSystemState,
	type LaneSystemState,
	removeOffscreen,
	spawnEntity,
	updatePositions,
} from './lane-system.js';
import { calculateDeliveryScore, type DeliveryQuality, getBasePoints } from './scoring.js';
import type { CarryingType, EntityKind, ShakeRushRenderState } from './shake-rush-config.js';
import { getLaneY, isParcel, SHAKE_RUSH } from './shake-rush-config.js';

const NOOP_DIAGNOSTICS: IDiagnostics = {
	emit() {},
	isEnabled() {
		return false;
	},
	query() {
		return [];
	},
};

const OBSTACLE_KINDS: EntityKind[] = ['obstacle-poop', 'obstacle-cone', 'obstacle-bird'];
const PARCEL_KINDS: EntityKind[] = ['parcel-protein', 'parcel-special'];

export class ShakeRushLogic implements IMinigameLogic {
	readonly id: MinigameId = 'shake-rush';

	private _phase: MinigamePhase = 'intro';
	private readonly input: IInputProvider;
	private readonly diagnostics: IDiagnostics;

	// Player state
	private lane = 1;
	private x: number = SHAKE_RUSH.PLAYER_START_X;
	private carrying: CarryingType = null;
	private pickupTimeMs = 0;
	private dashCooldownMs = 0;
	private isDashing = false;
	private dashRemainingMs = 0;
	private invincibilityMs = 0;

	// Game state
	private score = 0;
	private lives = SHAKE_RUSH.INITIAL_LIVES;
	private combo = 0;
	private deliveries = 0;
	private speedMultiplier = 1.0;
	private message: string | null = null;
	private elapsedMs = 0;

	// Lane system (exposed as readonly for testing)
	readonly laneState: LaneSystemState;

	constructor(deps: MinigameLogicDeps) {
		this.input = deps.input;
		this.diagnostics = deps.diagnostics ?? NOOP_DIAGNOSTICS;
		this.laneState = createLaneSystemState();
	}

	get phase(): MinigamePhase {
		return this._phase;
	}

	start(): void {
		this._phase = 'active';
		this.lane = 1;
		this.x = SHAKE_RUSH.PLAYER_START_X;
		this.carrying = null;
		this.pickupTimeMs = 0;
		this.dashCooldownMs = 0;
		this.isDashing = false;
		this.dashRemainingMs = 0;
		this.invincibilityMs = 0;
		this.score = 0;
		this.lives = SHAKE_RUSH.INITIAL_LIVES;
		this.combo = 0;
		this.deliveries = 0;
		this.speedMultiplier = 1.0;
		this.message = null;
		this.elapsedMs = 0;

		// Reset lane state
		this.laneState.entities.length = 0;
		this.laneState.nextEntityId = 0;
		this.laneState.spawnTimer = SHAKE_RUSH.BASE_SPAWN_INTERVAL_MS;

		this.diagnostics.emit('minigame', 'state', 'shake-rush-start', {
			lives: this.lives,
			targetDeliveries: SHAKE_RUSH.TARGET_DELIVERIES,
		});
	}

	update(deltaMs: number): void {
		if (this._phase !== 'active') return;

		this.elapsedMs += deltaMs;
		this.message = null;

		// Decrement cooldowns
		if (this.dashCooldownMs > 0) this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
		if (this.invincibilityMs > 0)
			this.invincibilityMs = Math.max(0, this.invincibilityMs - deltaMs);

		// Dash update
		if (this.isDashing) {
			this.dashRemainingMs -= deltaMs;
			this.x += (SHAKE_RUSH.DASH_DISTANCE / SHAKE_RUSH.DASH_DURATION_MS) * deltaMs;
			this.x = Math.min(this.x, SHAKE_RUSH.PLAYER_MAX_X);
			if (this.dashRemainingMs <= 0) {
				this.isDashing = false;
				this.dashRemainingMs = 0;
			}
		}

		// Input: lane changes (blocked during dash)
		if (!this.isDashing) {
			if (this.input.justPressed('jump')) {
				this.lane = Math.max(0, this.lane - 1);
			}
			if (this.input.justPressed('down')) {
				this.lane = Math.min(2, this.lane + 1);
			}
		}

		// Input: horizontal movement
		if (this.input.isDown('left')) {
			this.x -= SHAKE_RUSH.PLAYER_MOVE_SPEED;
		}
		if (this.input.isDown('right')) {
			this.x += SHAKE_RUSH.PLAYER_MOVE_SPEED;
		}
		this.x = Math.max(SHAKE_RUSH.PLAYER_MIN_X, Math.min(SHAKE_RUSH.PLAYER_MAX_X, this.x));

		// Input: dash
		if (this.input.justPressed('ability') && this.dashCooldownMs === 0 && !this.isDashing) {
			this.isDashing = true;
			this.dashRemainingMs = SHAKE_RUSH.DASH_DURATION_MS;
			this.dashCooldownMs = SHAKE_RUSH.DASH_COOLDOWN_MS;
		}

		// Spawn timer
		this.laneState.spawnTimer -= deltaMs;
		if (this.laneState.spawnTimer <= 0) {
			this.laneState.spawnTimer = Math.max(
				SHAKE_RUSH.MIN_SPAWN_INTERVAL_MS,
				SHAKE_RUSH.BASE_SPAWN_INTERVAL_MS - this.deliveries * SHAKE_RUSH.SPAWN_INTERVAL_DECREASE_MS,
			);
			const roll = Math.floor(Math.random() * 100);
			if (roll < SHAKE_RUSH.SPAWN_OBSTACLE_MAX) {
				const kind = OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)]!;
				const lane = Math.floor(Math.random() * SHAKE_RUSH.LANE_COUNT);
				spawnEntity(this.laneState, kind, lane);
			} else if (roll < SHAKE_RUSH.SPAWN_PARCEL_MAX) {
				const kind = PARCEL_KINDS[Math.floor(Math.random() * PARCEL_KINDS.length)]!;
				const lane = Math.floor(Math.random() * SHAKE_RUSH.LANE_COUNT);
				spawnEntity(this.laneState, kind, lane);
			}
		}

		// Update entity positions
		const scrollSpeed = SHAKE_RUSH.BASE_SCROLL_SPEED * this.speedMultiplier;
		updatePositions(this.laneState, scrollSpeed, deltaMs);

		// Collision: pickup
		if (this.carrying === null) {
			const pickup = checkPickup(this.laneState, this.lane, this.x, SHAKE_RUSH.COLLISION_THRESHOLD);
			if (pickup) {
				this.carrying = pickup.kind === 'parcel-special' ? 'special' : 'protein';
				this.pickupTimeMs = this.elapsedMs;
			}
		}

		// Collision: obstacle hit
		if (this.invincibilityMs === 0) {
			const obstacle = checkObstacleHit(
				this.laneState,
				this.lane,
				this.x,
				SHAKE_RUSH.COLLISION_THRESHOLD,
			);
			if (obstacle) {
				this.lives--;
				this.invincibilityMs = SHAKE_RUSH.INVINCIBILITY_DURATION_MS;
				this.combo = 0;
				this.diagnostics.emit('minigame', 'state', 'obstacle-hit', {
					lives: this.lives,
					obstacleKind: obstacle.kind,
				});
			}
		}

		// Delivery check
		if (this.carrying !== null && this.x >= SHAKE_RUSH.DELIVERY_ZONE_X) {
			const timeCarriedMs = this.elapsedMs - this.pickupTimeMs;
			const basePoints = getBasePoints(this.carrying);
			const breakdown = calculateDeliveryScore(
				basePoints,
				timeCarriedMs,
				this.combo,
				this.speedMultiplier,
			);
			this.score += breakdown.total;
			this.deliveries++;
			this.combo++;
			this.speedMultiplier += SHAKE_RUSH.SPEED_INCREMENT_PER_DELIVERY;
			this.message = this.qualityMessage(breakdown.quality);
			this.carrying = null;

			this.diagnostics.emit('minigame', 'state', 'delivery', {
				deliveries: this.deliveries,
				score: this.score,
				quality: breakdown.quality,
				combo: this.combo,
			});
		}

		// Entity cleanup
		const removed = removeOffscreen(this.laneState, -100);
		for (const entity of removed) {
			if (isParcel(entity.kind)) {
				this.lives--;
				this.combo = 0;
				this.diagnostics.emit('minigame', 'state', 'parcel-missed', {
					lives: this.lives,
					kind: entity.kind,
				});
			}
		}

		// Win/lose checks
		if (this.lives <= 0) {
			this._phase = 'finished';
			this.diagnostics.emit('minigame', 'state', 'shake-rush-finished', {
				won: false,
				score: this.score,
				deliveries: this.deliveries,
			});
		} else if (this.deliveries >= SHAKE_RUSH.TARGET_DELIVERIES) {
			this._phase = 'finished';
			this.diagnostics.emit('minigame', 'state', 'shake-rush-finished', {
				won: true,
				score: this.score,
				deliveries: this.deliveries,
			});
		}
	}

	hudSnapshot(): MinigameHudState {
		return {
			minigameId: this.id,
			phase: this._phase,
			score: this.score,
			lives: this.lives,
			maxLives: SHAKE_RUSH.INITIAL_LIVES,
			combo: this.combo,
			progress: this.deliveries / SHAKE_RUSH.TARGET_DELIVERIES,
			progressLabel: `${this.deliveries}/${SHAKE_RUSH.TARGET_DELIVERIES} Deliveries`,
			timeRemainingMs: 0,
			message: this.message,
		};
	}

	renderSnapshot(): ShakeRushRenderState {
		return {
			player: {
				lane: this.lane,
				x: this.x,
				y: getLaneY(this.lane),
				carrying: this.carrying,
				isDashing: this.isDashing,
				isInvincible: this.invincibilityMs > 0,
			},
			entities: this.laneState.entities.map((e) => ({
				id: e.id,
				kind: e.kind,
				lane: e.lane,
				x: e.x,
				y: e.y,
				active: e.active,
			})),
			deliveryZone: {
				x: SHAKE_RUSH.DELIVERY_ZONE_X,
				width: SHAKE_RUSH.WORLD_WIDTH - SHAKE_RUSH.DELIVERY_ZONE_X,
			},
			phase: this._phase,
		};
	}

	getResult(): MinigameResult | null {
		if (this._phase !== 'finished') return null;
		const won = this.deliveries >= SHAKE_RUSH.TARGET_DELIVERIES;
		return {
			minigameId: this.id,
			playerId: 'player-1',
			score: this.score,
			won,
			reward: {
				coins: won ? Math.floor(this.score / 10) : 0,
				scoreBonus: won ? this.combo * 10 : 0,
			},
		};
	}

	dispose(): void {
		// No external resources to clean up
	}

	private qualityMessage(quality: DeliveryQuality): string {
		switch (quality) {
			case 'perfect':
				return 'PERFECT delivery!';
			case 'good':
				return 'Good delivery!';
			case 'normal':
				return 'Delivered!';
		}
	}
}
