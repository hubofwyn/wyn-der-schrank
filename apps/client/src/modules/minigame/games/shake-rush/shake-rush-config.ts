import type { MinigameDefinition, MinigameId, MinigamePhase } from '@hub-of-wyn/shared';

export const SHAKE_RUSH = {
	// Layout
	LANE_COUNT: 3,
	LANE_HEIGHT: 120,
	LANE_START_Y: 350,
	PLAYER_START_X: 200,
	PLAYER_MIN_X: 50,
	PLAYER_MAX_X: 924,
	WORLD_WIDTH: 1024,
	WORLD_HEIGHT: 768,

	// Movement
	PLAYER_MOVE_SPEED: 5,
	BASE_SCROLL_SPEED: 300,
	DASH_DISTANCE: 200,
	DASH_DURATION_MS: 300,
	DASH_COOLDOWN_MS: 3000,
	LANE_CHANGE_DURATION_MS: 200,

	// Obstacle speed multipliers
	OBSTACLE_SPEED: { poop: 1.0, cone: 1.3, bird: 0.8 } as const,

	// Collision
	COLLISION_THRESHOLD: 50,
	DELIVERY_ZONE_X: 900,

	// Game rules
	INITIAL_LIVES: 3,
	TARGET_DELIVERIES: 9,
	MAX_DELIVERY_TIME_MS: 10000,

	// Scoring
	POINTS_PROTEIN: 100,
	POINTS_SPECIAL: 500,
	PERFECT_TIME_MS: 2000,
	GOOD_TIME_MS: 5000,

	// Difficulty
	SPEED_INCREMENT_PER_DELIVERY: 0.05,
	BASE_SPAWN_INTERVAL_MS: 3000,
	MIN_SPAWN_INTERVAL_MS: 1500,
	SPAWN_INTERVAL_DECREASE_MS: 200,

	// Spawn probabilities (out of 100)
	SPAWN_OBSTACLE_MAX: 30,
	SPAWN_PARCEL_MAX: 60,

	// Invincibility
	INVINCIBILITY_DURATION_MS: 1000,
} as const;

export type EntityKind =
	| 'parcel-protein'
	| 'parcel-special'
	| 'obstacle-poop'
	| 'obstacle-cone'
	| 'obstacle-bird';

export type CarryingType = 'protein' | 'special' | null;

export interface ShakeRushEntityState {
	readonly id: number;
	readonly kind: EntityKind;
	lane: number;
	x: number;
	readonly y: number;
	active: boolean;
}

export interface ShakeRushRenderState {
	readonly player: {
		readonly lane: number;
		readonly x: number;
		readonly y: number;
		readonly carrying: CarryingType;
		readonly isDashing: boolean;
		readonly isInvincible: boolean;
	};
	readonly entities: ReadonlyArray<{
		readonly id: number;
		readonly kind: EntityKind;
		readonly lane: number;
		readonly x: number;
		readonly y: number;
		readonly active: boolean;
	}>;
	readonly deliveryZone: { readonly x: number; readonly width: number };
	readonly phase: MinigamePhase;
}

export function getLaneY(lane: number): number {
	return SHAKE_RUSH.LANE_START_Y + lane * SHAKE_RUSH.LANE_HEIGHT;
}

export function isParcel(kind: EntityKind): boolean {
	return kind === 'parcel-protein' || kind === 'parcel-special';
}

export function isObstacle(kind: EntityKind): boolean {
	return kind === 'obstacle-poop' || kind === 'obstacle-cone' || kind === 'obstacle-bird';
}

export function getObstacleSpeedMultiplier(kind: EntityKind): number {
	switch (kind) {
		case 'obstacle-poop':
			return SHAKE_RUSH.OBSTACLE_SPEED.poop;
		case 'obstacle-cone':
			return SHAKE_RUSH.OBSTACLE_SPEED.cone;
		case 'obstacle-bird':
			return SHAKE_RUSH.OBSTACLE_SPEED.bird;
		default:
			return 1.0;
	}
}

export const SHAKE_RUSH_DEFINITION: MinigameDefinition = {
	id: 'shake-rush' as MinigameId,
	name: 'Shake Rush',
	description:
		'Collect protein shakes and deliver them to the zone! Dodge obstacles along the way.',
	durationMs: 0,
	musicKey: 'shake-rush-bgm',
	instructionText: 'Move: Arrow Keys / WASD | Dash: Space',
};
