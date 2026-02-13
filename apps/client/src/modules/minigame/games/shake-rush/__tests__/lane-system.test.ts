import { describe, expect, it } from 'vitest';
import {
	checkObstacleHit,
	checkPickup,
	createLaneSystemState,
	removeOffscreen,
	spawnEntity,
	updatePositions,
} from '../lane-system.js';
import { SHAKE_RUSH } from '../shake-rush-config.js';

describe('lane-system', () => {
	it('createLaneSystemState returns empty state', () => {
		const state = createLaneSystemState();
		expect(state.entities).toEqual([]);
		expect(state.nextEntityId).toBe(0);
		expect(state.spawnTimer).toBe(0);
	});

	it('spawnEntity adds entity with correct position offscreen right', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 1);

		expect(state.entities).toHaveLength(1);
		const entity = state.entities[0]!;
		expect(entity.kind).toBe('parcel-protein');
		expect(entity.lane).toBe(1);
		expect(entity.x).toBe(SHAKE_RUSH.WORLD_WIDTH + 50);
		expect(entity.active).toBe(true);
	});

	it('spawnEntity auto-increments IDs', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 0);
		spawnEntity(state, 'obstacle-poop', 1);
		spawnEntity(state, 'parcel-special', 2);

		expect(state.entities[0]!.id).toBe(0);
		expect(state.entities[1]!.id).toBe(1);
		expect(state.entities[2]!.id).toBe(2);
		expect(state.nextEntityId).toBe(3);
	});

	it('updatePositions moves entities left', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 0);
		const startX = state.entities[0]!.x;

		updatePositions(state, 300, 1000); // 300 px/s for 1 second

		expect(state.entities[0]!.x).toBe(startX - 300);
	});

	it('updatePositions applies obstacle speed multiplier', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'obstacle-cone', 0); // cone has 1.3x multiplier
		const startX = state.entities[0]!.x;

		updatePositions(state, 300, 1000);

		const expected = startX - 300 * SHAKE_RUSH.OBSTACLE_SPEED.cone;
		expect(state.entities[0]!.x).toBeCloseTo(expected, 5);
	});

	it('removeOffscreen removes entities past minX', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 0);
		spawnEntity(state, 'obstacle-poop', 1);

		// Move first entity far left past the threshold
		state.entities[0]!.x = -100;
		state.entities[1]!.x = 500;

		const removed = removeOffscreen(state, -50);

		expect(removed).toHaveLength(1);
		expect(removed[0]!.kind).toBe('parcel-protein');
		expect(state.entities).toHaveLength(1);
		expect(state.entities[0]!.kind).toBe('obstacle-poop');
	});

	it('checkPickup finds parcel on same lane within threshold', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 1);
		state.entities[0]!.x = 200;

		const result = checkPickup(state, 1, 210, 50);
		expect(result).not.toBeNull();
		expect(result!.kind).toBe('parcel-protein');
		expect(result!.active).toBe(false);
	});

	it('checkPickup returns null for wrong lane', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 1);
		state.entities[0]!.x = 200;

		const result = checkPickup(state, 0, 200, 50);
		expect(result).toBeNull();
	});

	it('checkObstacleHit finds obstacle on same lane within threshold', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'obstacle-poop', 2);
		state.entities[0]!.x = 200;

		const result = checkObstacleHit(state, 2, 210, 50);
		expect(result).not.toBeNull();
		expect(result!.kind).toBe('obstacle-poop');
		expect(result!.active).toBe(false);
	});

	it('checkObstacleHit returns null for parcels', () => {
		const state = createLaneSystemState();
		spawnEntity(state, 'parcel-protein', 2);
		state.entities[0]!.x = 200;

		const result = checkObstacleHit(state, 2, 200, 50);
		expect(result).toBeNull();
	});
});
