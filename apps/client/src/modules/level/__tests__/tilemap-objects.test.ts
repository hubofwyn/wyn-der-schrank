import { describe, expect, it } from 'vitest';
import type { TilemapObject } from '../tilemap-objects.js';
import {
	extractCollectibles,
	extractEnemies,
	extractExit,
	extractSpawn,
} from '../tilemap-objects.js';

describe('extractSpawn', () => {
	it('returns the first valid spawn position', () => {
		const objects: TilemapObject[] = [
			{ type: 'spawn', x: 100, y: 200 },
			{ type: 'spawn', x: 300, y: 400 },
		];

		expect(extractSpawn(objects)).toEqual({ x: 100, y: 200 });
	});

	it('returns null when no spawn object exists', () => {
		const objects: TilemapObject[] = [{ type: 'enemy', x: 10, y: 20 }];

		expect(extractSpawn(objects)).toBeNull();
	});

	it('skips spawn objects missing coordinates', () => {
		const objects: TilemapObject[] = [
			{ type: 'spawn', x: 50 },
			{ type: 'spawn', y: 80 },
		];

		expect(extractSpawn(objects)).toBeNull();
	});

	it('returns later spawn entries when earlier ones are invalid', () => {
		const objects: TilemapObject[] = [
			{ type: 'spawn', x: 50 },
			{ type: 'spawn', x: 320, y: 640 },
		];

		expect(extractSpawn(objects)).toEqual({ x: 320, y: 640 });
	});
});

describe('extractEnemies', () => {
	it('extracts enemy positions with default enemy type', () => {
		const objects: TilemapObject[] = [{ type: 'enemy', x: 15, y: 25 }];

		expect(extractEnemies(objects)).toEqual([{ x: 15, y: 25, enemyType: 'skeleton' }]);
	});

	it('reads enemyType from object properties', () => {
		const objects: TilemapObject[] = [
			{
				type: 'enemy',
				x: 30,
				y: 45,
				properties: [{ name: 'enemyType', type: 'string', value: 'bat' }],
			},
		];

		expect(extractEnemies(objects)).toEqual([{ x: 30, y: 45, enemyType: 'bat' }]);
	});

	it('skips objects that are not enemies', () => {
		const objects: TilemapObject[] = [
			{ type: 'enemy', x: 5, y: 6 },
			{ type: 'collectible', x: 7, y: 8 },
		];

		expect(extractEnemies(objects)).toEqual([{ x: 5, y: 6, enemyType: 'skeleton' }]);
	});

	it('skips enemies missing coordinates', () => {
		const objects: TilemapObject[] = [
			{ type: 'enemy', x: 12 },
			{ type: 'enemy', x: 20, y: 30 },
		];

		expect(extractEnemies(objects)).toEqual([{ x: 20, y: 30, enemyType: 'skeleton' }]);
	});
});

describe('extractCollectibles', () => {
	it('extracts collectible positions', () => {
		const objects: TilemapObject[] = [{ type: 'collectible', x: 8, y: 12 }];

		expect(extractCollectibles(objects)).toEqual([{ x: 8, y: 12 }]);
	});

	it('skips non-collectible and missing-coordinate objects', () => {
		const objects: TilemapObject[] = [
			{ type: 'enemy', x: 1, y: 2 },
			{ type: 'collectible', x: 4 },
		];

		expect(extractCollectibles(objects)).toEqual([]);
	});
});

describe('extractExit', () => {
	it('returns the first valid exit position', () => {
		const objects: TilemapObject[] = [{ type: 'exit', x: 3100, y: 700 }];

		expect(extractExit(objects)).toEqual({ x: 3100, y: 700 });
	});

	it('returns null when no exit object exists', () => {
		const objects: TilemapObject[] = [
			{ type: 'spawn', x: 100, y: 200 },
			{ type: 'collectible', x: 50, y: 60 },
		];

		expect(extractExit(objects)).toBeNull();
	});

	it('skips exit objects missing coordinates', () => {
		const objects: TilemapObject[] = [
			{ type: 'exit', x: 50 },
			{ type: 'exit', y: 80 },
		];

		expect(extractExit(objects)).toBeNull();
	});

	it('returns later exit entries when earlier ones are invalid', () => {
		const objects: TilemapObject[] = [
			{ type: 'exit', x: 50 },
			{ type: 'exit', x: 3100, y: 700 },
		];

		expect(extractExit(objects)).toEqual({ x: 3100, y: 700 });
	});
});
