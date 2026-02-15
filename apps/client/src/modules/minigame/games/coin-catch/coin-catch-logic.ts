import type { MinigameId, MinigamePhase, MinigameResult } from '@hub-of-wyn/shared';
import type { IDiagnostics } from '../../../../core/ports/diagnostics.js';
import type { IInputProvider } from '../../../../core/ports/input.js';
import type { MinigameHudState } from '../../minigame-hud-state.js';
import type { IMinigameLogic, MinigameLogicDeps } from '../../minigame-logic.js';
import { clampDelta } from '../../minigame-time.js';
import type { CoinCatchRenderState, FallingKind } from './coin-catch-config.js';
import { COIN_CATCH, isBomb, isCoin } from './coin-catch-config.js';
import {
	checkCatch,
	createFallingObjectsState,
	type FallingObjectsState,
	removeOffscreen,
	spawnEntity,
	updatePositions,
} from './falling-objects.js';
import { calculateCatchScore, getCatchMessage } from './scoring.js';

const NOOP_DIAGNOSTICS: IDiagnostics = {
	emit() {},
	isEnabled() {
		return false;
	},
	query() {
		return [];
	},
};

export class CoinCatchLogic implements IMinigameLogic {
	readonly id: MinigameId = 'coin-catch';

	private _phase: MinigamePhase = 'intro';
	private readonly input: IInputProvider;
	private readonly diagnostics: IDiagnostics;
	private readonly rng: () => number;

	// Player state
	private catcherX: number = COIN_CATCH.WORLD_WIDTH / 2;
	private invincibilityMs = 0;

	// Game state
	private score = 0;
	private lives: number = COIN_CATCH.INITIAL_LIVES;
	private combo = 0;
	private roundTimeMs: number = COIN_CATCH.ROUND_DURATION_MS;
	private elapsedMs = 0;
	private speedMultiplier = 1.0;
	private message: string | null = null;

	// Falling objects (exposed as readonly for testing)
	readonly fallingState: FallingObjectsState;

	constructor(deps: MinigameLogicDeps) {
		this.input = deps.input;
		this.diagnostics = deps.diagnostics ?? NOOP_DIAGNOSTICS;
		this.rng = deps.rng;
		this.fallingState = createFallingObjectsState();
	}

	get phase(): MinigamePhase {
		return this._phase;
	}

	start(): void {
		this._phase = 'active';
		this.catcherX = COIN_CATCH.WORLD_WIDTH / 2;
		this.invincibilityMs = 0;
		this.score = 0;
		this.lives = COIN_CATCH.INITIAL_LIVES;
		this.combo = 0;
		this.roundTimeMs = COIN_CATCH.ROUND_DURATION_MS;
		this.elapsedMs = 0;
		this.speedMultiplier = 1.0;
		this.message = null;

		// Reset falling state
		this.fallingState.entities.length = 0;
		this.fallingState.nextEntityId = 0;
		this.fallingState.spawnTimer = COIN_CATCH.BASE_SPAWN_INTERVAL_MS;
		this.fallingState.lastSpawnWasBomb = false;

		this.diagnostics.emit('minigame', 'state', 'coin-catch-start', {
			lives: this.lives,
			roundDurationMs: COIN_CATCH.ROUND_DURATION_MS,
		});
	}

	update(rawDeltaMs: number): void {
		if (this._phase !== 'active') return;

		const deltaMs = clampDelta(rawDeltaMs);
		this.elapsedMs += deltaMs;
		this.message = null;

		// Decrement timers
		if (this.invincibilityMs > 0) {
			this.invincibilityMs = Math.max(0, this.invincibilityMs - deltaMs);
		}
		this.roundTimeMs -= deltaMs;

		// Difficulty: staircase steps every 10 seconds
		this.speedMultiplier =
			1.0 + Math.floor(this.elapsedMs / 10_000) * COIN_CATCH.SPEED_INCREMENT_PER_10S;

		// Input: left/right catcher movement (frame-rate independent)
		const movePx = COIN_CATCH.CATCHER_SPEED_PX_PER_SEC * (deltaMs / 1000);
		if (this.input.isDown('left')) {
			this.catcherX -= movePx;
		}
		if (this.input.isDown('right')) {
			this.catcherX += movePx;
		}
		this.catcherX = Math.max(
			COIN_CATCH.CATCHER_MIN_X,
			Math.min(COIN_CATCH.CATCHER_MAX_X, this.catcherX),
		);

		// Spawn timer
		this.fallingState.spawnTimer -= deltaMs;
		if (this.fallingState.spawnTimer <= 0) {
			const spawnInterval = Math.max(
				COIN_CATCH.MIN_SPAWN_INTERVAL_MS,
				COIN_CATCH.BASE_SPAWN_INTERVAL_MS -
					Math.floor(this.elapsedMs / 10_000) * COIN_CATCH.SPAWN_INTERVAL_DECREASE_PER_10S,
			);
			this.fallingState.spawnTimer = spawnInterval;

			const kind = this.rollSpawnKind();
			const x =
				COIN_CATCH.CATCHER_MIN_X +
				this.rng() * (COIN_CATCH.CATCHER_MAX_X - COIN_CATCH.CATCHER_MIN_X);
			spawnEntity(this.fallingState, kind, x);
			this.fallingState.lastSpawnWasBomb = isBomb(kind);
		}

		// Update falling positions
		const fallSpeed = COIN_CATCH.BASE_FALL_SPEED * this.speedMultiplier;
		updatePositions(this.fallingState, fallSpeed, deltaMs);

		// Check catch
		const caught = checkCatch(
			this.fallingState,
			this.catcherX,
			COIN_CATCH.CATCHER_Y,
			COIN_CATCH.CATCH_RADIUS_X,
			COIN_CATCH.CATCH_RADIUS_Y,
		);
		if (caught) {
			if (isCoin(caught.kind)) {
				const breakdown = calculateCatchScore(caught.kind, this.combo, this.speedMultiplier);
				this.score += breakdown.total;
				this.combo++;
				this.message = getCatchMessage(this.combo);
				this.diagnostics.emit('minigame', 'state', 'coin-caught', {
					kind: caught.kind,
					score: this.score,
					combo: this.combo,
				});
			} else if (isBomb(caught.kind) && this.invincibilityMs === 0) {
				this.lives--;
				this.combo = 0;
				this.invincibilityMs = COIN_CATCH.INVINCIBILITY_DURATION_MS;
				this.diagnostics.emit('minigame', 'state', 'bomb-hit', {
					lives: this.lives,
				});
			}
		}

		// Remove offscreen (no penalty for missed coins)
		removeOffscreen(this.fallingState, COIN_CATCH.WORLD_HEIGHT + 50);

		// Win/lose checks
		if (this.lives <= 0) {
			this._phase = 'finished';
			this.diagnostics.emit('minigame', 'state', 'coin-catch-finished', {
				won: false,
				score: this.score,
			});
		} else if (this.roundTimeMs <= 0) {
			this.roundTimeMs = 0;
			this._phase = 'finished';
			this.diagnostics.emit('minigame', 'state', 'coin-catch-finished', {
				won: true,
				score: this.score,
			});
		}
	}

	hudSnapshot(): MinigameHudState {
		return {
			minigameId: this.id,
			phase: this._phase,
			score: this.score,
			lives: this.lives,
			maxLives: COIN_CATCH.INITIAL_LIVES,
			combo: this.combo,
			progress: 1.0 - this.roundTimeMs / COIN_CATCH.ROUND_DURATION_MS,
			progressLabel: `${Math.ceil(Math.max(0, this.roundTimeMs) / 1000)}s`,
			timeRemainingMs: Math.max(0, this.roundTimeMs),
			message: this.message,
		};
	}

	renderSnapshot(): CoinCatchRenderState {
		return {
			player: {
				x: this.catcherX,
				y: COIN_CATCH.CATCHER_Y,
				isInvincible: this.invincibilityMs > 0,
			},
			entities: this.fallingState.entities.map((e) => ({
				id: e.id,
				kind: e.kind,
				x: e.x,
				y: e.y,
				active: e.active,
			})),
			phase: this._phase,
		};
	}

	getResult(): MinigameResult | null {
		if (this._phase !== 'finished') return null;
		const won = this.lives > 0 && this.roundTimeMs <= 0;
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

	private rollSpawnKind(): FallingKind {
		const roll = Math.floor(this.rng() * 100);
		if (roll < COIN_CATCH.SPAWN_BOMB_CHANCE) {
			// Fairness guard: no back-to-back bombs
			if (this.fallingState.lastSpawnWasBomb) {
				return 'coin';
			}
			return 'bomb';
		}
		if (roll < COIN_CATCH.SPAWN_BOMB_CHANCE + COIN_CATCH.SPAWN_GOLD_CHANCE) {
			return 'gold-coin';
		}
		return 'coin';
	}
}
