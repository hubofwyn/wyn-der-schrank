import type { SessionSaveData } from '@hub-of-wyn/shared';
import { describe, expect, it } from 'vitest';
import { WorldCatalog } from '../world-catalog.js';

const VALID_WORLDS = [
	{
		id: 'forest',
		name: 'Forest',
		description: 'Green',
		order: 0,
		levels: ['forest-1', 'forest-2'],
		unlockCondition: { type: 'none' as const },
		backgroundKey: 'bg-forest',
		musicKey: 'music-platformer',
	},
	{
		id: 'cave',
		name: 'Cave',
		description: 'Dark',
		order: 1,
		levels: ['cave-1'],
		unlockCondition: { type: 'world-complete' as const, worldId: 'forest' as const },
		backgroundKey: 'bg-cave',
		musicKey: 'music-platformer',
	},
	{
		id: 'castle',
		name: 'Castle',
		description: 'Final',
		order: 2,
		levels: [],
		unlockCondition: { type: 'stars' as const, starsRequired: 10 },
		backgroundKey: 'bg-castle',
		musicKey: 'music-platformer',
	},
];

function emptySave(): SessionSaveData {
	return { levels: {}, totalCoins: 0, totalStars: 0, savedAt: 0 };
}

function completedForestSave(): SessionSaveData {
	return {
		levels: {
			'forest-1': { score: 100, stars: 2, coins: 5, time: 30000, completedAt: 1 },
			'forest-2': { score: 150, stars: 3, coins: 8, time: 25000, completedAt: 2 },
		},
		totalCoins: 13,
		totalStars: 5,
		savedAt: 2,
	};
}

describe('WorldCatalog', () => {
	it('starts uninitialized', () => {
		const catalog = new WorldCatalog();
		expect(catalog.isInitialized).toBe(false);
	});

	it('initializes from valid data', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.isInitialized).toBe(true);
	});

	it('throws on invalid data', () => {
		const catalog = new WorldCatalog();
		expect(() => catalog.init([{ id: 'invalid' }])).toThrow();
	});

	it('getById returns correct world', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		const forest = catalog.getById('forest');
		expect(forest?.name).toBe('Forest');
	});

	it('getById returns undefined for unknown id', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		// @ts-expect-error — testing invalid ID at runtime
		expect(catalog.getById('swamp')).toBeUndefined();
	});

	it('getAll returns all worlds', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getAll()).toHaveLength(3);
	});

	it('getOrdered returns worlds sorted by order', () => {
		const reversed = [...VALID_WORLDS].reverse();
		const catalog = new WorldCatalog();
		catalog.init(reversed);
		const ordered = catalog.getOrdered();
		expect(ordered[0]?.id).toBe('forest');
		expect(ordered[1]?.id).toBe('cave');
		expect(ordered[2]?.id).toBe('castle');
	});

	it('getLevelsForWorld returns level IDs', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getLevelsForWorld('forest')).toEqual(['forest-1', 'forest-2']);
	});

	it('getLevelsForWorld returns empty for unknown world', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		// @ts-expect-error — testing invalid ID at runtime
		expect(catalog.getLevelsForWorld('swamp')).toEqual([]);
	});

	// ── Unlock checks ──

	it('isWorldUnlocked: type=none always returns true', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.isWorldUnlocked('forest', emptySave())).toBe(true);
	});

	it('isWorldUnlocked: type=world-complete returns false when incomplete', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		const partial: SessionSaveData = {
			...emptySave(),
			levels: { 'forest-1': { score: 100, stars: 1, coins: 3, time: 30000, completedAt: 1 } },
		};
		expect(catalog.isWorldUnlocked('cave', partial)).toBe(false);
	});

	it('isWorldUnlocked: type=world-complete returns true when all levels done', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.isWorldUnlocked('cave', completedForestSave())).toBe(true);
	});

	it('isWorldUnlocked: type=world-complete returns false for empty required world', () => {
		// If the required world has 0 levels, it can't be "complete"
		const worldsWithEmpty = [
			{ ...VALID_WORLDS[0]!, levels: [] }, // forest with no levels
			VALID_WORLDS[1]!, // cave requires forest-complete
			VALID_WORLDS[2]!,
		];
		const catalog = new WorldCatalog();
		catalog.init(worldsWithEmpty);
		expect(catalog.isWorldUnlocked('cave', emptySave())).toBe(false);
	});

	it('isWorldUnlocked: type=stars returns false when not enough', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.isWorldUnlocked('castle', completedForestSave())).toBe(false);
	});

	it('isWorldUnlocked: type=stars returns true when enough', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		const save = { ...completedForestSave(), totalStars: 10 };
		expect(catalog.isWorldUnlocked('castle', save)).toBe(true);
	});

	// ── Next level ──

	it('getNextLevel returns next level in array order', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getNextLevel('forest-1', 'forest')).toBe('forest-2');
	});

	it('getNextLevel returns null for last level', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getNextLevel('forest-2', 'forest')).toBeNull();
	});

	it('getNextLevel returns null for unknown level', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getNextLevel('forest-99', 'forest')).toBeNull();
	});

	it('getNextLevel returns null for unknown world', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		// @ts-expect-error — testing invalid ID at runtime
		expect(catalog.getNextLevel('forest-1', 'swamp')).toBeNull();
	});

	it('getNextLevel returns null for empty-level world', () => {
		const catalog = new WorldCatalog();
		catalog.init(VALID_WORLDS);
		expect(catalog.getNextLevel('cave-1', 'castle')).toBeNull();
	});
});
