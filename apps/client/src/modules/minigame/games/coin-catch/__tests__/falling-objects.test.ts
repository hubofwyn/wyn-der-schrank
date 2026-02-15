import { describe, expect, it } from 'vitest';
import { COIN_CATCH } from '../coin-catch-config.js';
import {
	checkCatch,
	createFallingObjectsState,
	removeOffscreen,
	spawnEntity,
	updatePositions,
} from '../falling-objects.js';

describe('FallingObjects', () => {
	describe('createFallingObjectsState', () => {
		it('creates empty initial state', () => {
			const state = createFallingObjectsState();
			expect(state.entities).toEqual([]);
			expect(state.nextEntityId).toBe(0);
			expect(state.spawnTimer).toBe(COIN_CATCH.BASE_SPAWN_INTERVAL_MS);
			expect(state.lastSpawnWasBomb).toBe(false);
		});
	});

	describe('spawnEntity', () => {
		it('spawns entity at given x and SPAWN_Y', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 200);
			expect(state.entities).toHaveLength(1);
			expect(state.entities[0]).toMatchObject({
				id: 0,
				kind: 'coin',
				x: 200,
				y: COIN_CATCH.SPAWN_Y,
				active: true,
			});
		});

		it('auto-increments entity IDs', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			spawnEntity(state, 'bomb', 200);
			spawnEntity(state, 'gold-coin', 300);
			expect(state.entities.map((e) => e.id)).toEqual([0, 1, 2]);
			expect(state.nextEntityId).toBe(3);
		});

		it('spawns different entity kinds', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			spawnEntity(state, 'gold-coin', 200);
			spawnEntity(state, 'bomb', 300);
			expect(state.entities.map((e) => e.kind)).toEqual(['coin', 'gold-coin', 'bomb']);
		});
	});

	describe('updatePositions', () => {
		it('moves entities downward based on fall speed and delta', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			const startY = state.entities[0]!.y;

			updatePositions(state, 200, 500); // 200 px/s for 0.5s = 100px
			expect(state.entities[0]!.y).toBe(startY + 100);
		});

		it('skips inactive entities', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			state.entities[0]!.active = false;
			const startY = state.entities[0]!.y;

			updatePositions(state, 200, 1000);
			expect(state.entities[0]!.y).toBe(startY);
		});

		it('handles zero delta (no movement)', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			const startY = state.entities[0]!.y;

			updatePositions(state, 200, 0);
			expect(state.entities[0]!.y).toBe(startY);
		});

		it('moves multiple entities independently', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			spawnEntity(state, 'bomb', 200);

			// Move first entity manually to a different starting position
			state.entities[0]!.y = 50;
			state.entities[1]!.y = 100;

			updatePositions(state, 300, 1000); // 300 px/s for 1s = 300px
			expect(state.entities[0]!.y).toBe(350);
			expect(state.entities[1]!.y).toBe(400);
		});
	});

	describe('removeOffscreen', () => {
		it('removes entities past maxY', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			state.entities[0]!.y = 800;

			const removed = removeOffscreen(state, 750);
			expect(removed).toHaveLength(1);
			expect(removed[0]!.kind).toBe('coin');
			expect(state.entities).toHaveLength(0);
		});

		it('keeps entities within bounds', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			state.entities[0]!.y = 500;

			const removed = removeOffscreen(state, 750);
			expect(removed).toHaveLength(0);
			expect(state.entities).toHaveLength(1);
		});

		it('handles mixed in-bounds and out-of-bounds', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			spawnEntity(state, 'bomb', 200);
			spawnEntity(state, 'gold-coin', 300);

			state.entities[0]!.y = 800; // past bottom
			state.entities[1]!.y = 400; // in bounds
			state.entities[2]!.y = 900; // past bottom

			const removed = removeOffscreen(state, 750);
			expect(removed).toHaveLength(2);
			expect(state.entities).toHaveLength(1);
			expect(state.entities[0]!.kind).toBe('bomb');
		});

		it('entity at exactly maxY stays', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 100);
			state.entities[0]!.y = 750;

			const removed = removeOffscreen(state, 750);
			expect(removed).toHaveLength(0);
			expect(state.entities).toHaveLength(1);
		});
	});

	describe('checkCatch', () => {
		it('catches entity within radius', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 650;

			const caught = checkCatch(state, 510, 650, 40, 30);
			expect(caught).not.toBeNull();
			expect(caught!.kind).toBe('coin');
			expect(caught!.active).toBe(false);
		});

		it('returns null when no entity in range', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 100; // far from catcher

			const caught = checkCatch(state, 500, 650, 40, 30);
			expect(caught).toBeNull();
		});

		it('skips inactive entities', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 650;
			state.entities[0]!.active = false;

			const caught = checkCatch(state, 500, 650, 40, 30);
			expect(caught).toBeNull();
		});

		it('catches the closest entity when multiple in range', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500); // farther
			spawnEntity(state, 'gold-coin', 502); // closer
			state.entities[0]!.y = 660;
			state.entities[1]!.y = 650;

			const caught = checkCatch(state, 503, 650, 40, 30);
			expect(caught).not.toBeNull();
			expect(caught!.kind).toBe('gold-coin');
		});

		it('respects x radius boundary', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 650;

			// Exactly at boundary (dx=40, radiusX=40) — should catch
			const caught1 = checkCatch(state, 460, 650, 40, 30);
			expect(caught1).not.toBeNull();
		});

		it('rejects entity just outside x radius', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 650;

			// Just outside (dx=41, radiusX=40)
			const caught = checkCatch(state, 459, 650, 40, 30);
			expect(caught).toBeNull();
		});

		it('respects y radius boundary', () => {
			const state = createFallingObjectsState();
			spawnEntity(state, 'coin', 500);
			state.entities[0]!.y = 680; // dy=30 from catcher at y=650

			const caught = checkCatch(state, 500, 650, 40, 30);
			expect(caught).not.toBeNull();
		});
	});
});
