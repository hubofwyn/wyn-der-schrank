import type { MinigameDefinition, MinigameId, MinigamePhase } from '@hub-of-wyn/shared';
import type { MinigameRenderStateBase } from '../../minigame-render-state.js';

export const COIN_CATCH = {
	// Layout
	WORLD_WIDTH: 1024,
	WORLD_HEIGHT: 720,
	CATCHER_Y: 650,
	CATCHER_MIN_X: 30,
	CATCHER_MAX_X: 994,

	// Movement (frame-rate independent)
	CATCHER_SPEED_PX_PER_SEC: 600,

	// Falling
	BASE_FALL_SPEED: 200, // px/sec
	SPAWN_Y: -30, // above screen

	// Collision
	CATCH_RADIUS_X: 40,
	CATCH_RADIUS_Y: 30,

	// Game rules
	INITIAL_LIVES: 3,
	ROUND_DURATION_MS: 60_000,

	// Scoring
	POINTS_COIN: 100,
	POINTS_GOLD: 300,
	COMBO_MULTIPLIER: 0.15,

	// Difficulty (staircase steps every 10s)
	SPEED_INCREMENT_PER_10S: 0.1,
	BASE_SPAWN_INTERVAL_MS: 800,
	MIN_SPAWN_INTERVAL_MS: 350,
	SPAWN_INTERVAL_DECREASE_PER_10S: 50,

	// Spawn probabilities (out of 100)
	SPAWN_BOMB_CHANCE: 20,
	SPAWN_GOLD_CHANCE: 10,

	// Invincibility
	INVINCIBILITY_DURATION_MS: 800,
} as const;

export type FallingKind = 'coin' | 'gold-coin' | 'bomb';

export interface FallingEntityState {
	readonly id: number;
	readonly kind: FallingKind;
	x: number;
	y: number;
	active: boolean;
}

export interface CoinCatchRenderState extends MinigameRenderStateBase {
	readonly phase: MinigamePhase;
}

export function isCoin(kind: FallingKind): boolean {
	return kind === 'coin' || kind === 'gold-coin';
}

export function isBomb(kind: FallingKind): boolean {
	return kind === 'bomb';
}

export const COIN_CATCH_DEFINITION: MinigameDefinition = {
	id: 'coin-catch' as MinigameId,
	name: 'Coin Catch',
	description: 'Catch falling coins and dodge bombs! Survive the clock to win.',
	durationMs: COIN_CATCH.ROUND_DURATION_MS,
	musicKey: 'minigame-theme',
	instructionText: 'Move: Arrow Keys / WASD | Catch coins, dodge bombs!',
};
