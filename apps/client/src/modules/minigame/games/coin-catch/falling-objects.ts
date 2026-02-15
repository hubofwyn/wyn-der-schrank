import type { FallingEntityState, FallingKind } from './coin-catch-config.js';
import { COIN_CATCH } from './coin-catch-config.js';

export interface FallingObjectsState {
	entities: FallingEntityState[];
	nextEntityId: number;
	spawnTimer: number;
	lastSpawnWasBomb: boolean;
}

export function createFallingObjectsState(): FallingObjectsState {
	return {
		entities: [],
		nextEntityId: 0,
		spawnTimer: COIN_CATCH.BASE_SPAWN_INTERVAL_MS,
		lastSpawnWasBomb: false,
	};
}

/** Adds a falling entity at a given x position. Spawns above the screen. */
export function spawnEntity(state: FallingObjectsState, kind: FallingKind, x: number): void {
	const entity: FallingEntityState = {
		id: state.nextEntityId++,
		kind,
		x,
		y: COIN_CATCH.SPAWN_Y,
		active: true,
	};
	state.entities.push(entity);
}

/** Moves all active entities downward based on fall speed (frame-rate independent). */
export function updatePositions(
	state: FallingObjectsState,
	fallSpeed: number,
	deltaMs: number,
): void {
	const deltaSeconds = deltaMs / 1000;
	for (const entity of state.entities) {
		if (!entity.active) continue;
		entity.y += fallSpeed * deltaSeconds;
	}
}

/** Removes entities past the bottom edge. Returns the removed entities. */
export function removeOffscreen(state: FallingObjectsState, maxY: number): FallingEntityState[] {
	const removed: FallingEntityState[] = [];
	state.entities = state.entities.filter((e) => {
		if (e.y > maxY) {
			removed.push(e);
			return false;
		}
		return true;
	});
	return removed;
}

/**
 * Finds the closest active entity within the catch zone around the catcher.
 * If found, marks it inactive and returns it. Otherwise returns null.
 */
export function checkCatch(
	state: FallingObjectsState,
	catcherX: number,
	catcherY: number,
	radiusX: number,
	radiusY: number,
): FallingEntityState | null {
	let closest: FallingEntityState | null = null;
	let closestDist = Number.POSITIVE_INFINITY;

	for (const entity of state.entities) {
		if (!entity.active) continue;
		const dx = Math.abs(entity.x - catcherX);
		const dy = Math.abs(entity.y - catcherY);
		if (dx <= radiusX && dy <= radiusY) {
			const dist = dx + dy;
			if (dist < closestDist) {
				closest = entity;
				closestDist = dist;
			}
		}
	}

	if (closest) {
		closest.active = false;
	}
	return closest;
}
