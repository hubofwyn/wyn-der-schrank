import type { EntityKind, ShakeRushEntityState } from './shake-rush-config.js';
import {
	getLaneY,
	getObstacleSpeedMultiplier,
	isObstacle,
	isParcel,
	SHAKE_RUSH,
} from './shake-rush-config.js';

export interface LaneSystemState {
	entities: ShakeRushEntityState[];
	nextEntityId: number;
	spawnTimer: number;
}

export interface CollisionResult {
	entity: ShakeRushEntityState;
	type: 'pickup' | 'obstacle';
}

export function createLaneSystemState(): LaneSystemState {
	return { entities: [], nextEntityId: 0, spawnTimer: 0 };
}

/** Adds entity with auto-incrementing ID. */
export function spawnEntity(state: LaneSystemState, kind: EntityKind, lane: number): void {
	const entity: ShakeRushEntityState = {
		id: state.nextEntityId++,
		kind,
		lane,
		x: SHAKE_RUSH.WORLD_WIDTH + 50, // spawn offscreen right
		y: getLaneY(lane),
		active: true,
	};
	state.entities.push(entity);
}

/** Moves all entities left based on scroll speed and their kind's speed multiplier. */
export function updatePositions(
	state: LaneSystemState,
	baseScrollSpeed: number,
	deltaMs: number,
): void {
	const deltaSeconds = deltaMs / 1000;
	for (const entity of state.entities) {
		if (!entity.active) continue;
		const speedMultiplier = isObstacle(entity.kind) ? getObstacleSpeedMultiplier(entity.kind) : 1.0;
		entity.x -= baseScrollSpeed * speedMultiplier * deltaSeconds;
	}
}

/** Removes entities past the left edge, returns the removed ones. */
export function removeOffscreen(state: LaneSystemState, minX: number): ShakeRushEntityState[] {
	const removed: ShakeRushEntityState[] = [];
	state.entities = state.entities.filter((e) => {
		if (e.x < minX) {
			removed.push(e);
			return false;
		}
		return true;
	});
	return removed;
}

/** Finds the closest active parcel within pickup range on the same lane. */
export function checkPickup(
	state: LaneSystemState,
	playerLane: number,
	playerX: number,
	threshold: number,
): ShakeRushEntityState | null {
	for (const entity of state.entities) {
		if (!entity.active) continue;
		if (!isParcel(entity.kind)) continue;
		if (entity.lane !== playerLane) continue;
		if (Math.abs(entity.x - playerX) < threshold) {
			entity.active = false;
			return entity;
		}
	}
	return null;
}

/** Finds the closest active obstacle within collision range on the same lane. */
export function checkObstacleHit(
	state: LaneSystemState,
	playerLane: number,
	playerX: number,
	threshold: number,
): ShakeRushEntityState | null {
	for (const entity of state.entities) {
		if (!entity.active) continue;
		if (!isObstacle(entity.kind)) continue;
		if (entity.lane !== playerLane) continue;
		if (Math.abs(entity.x - playerX) < threshold) {
			entity.active = false;
			return entity;
		}
	}
	return null;
}
