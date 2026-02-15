import { SessionSaveSchema } from '@hub-of-wyn/shared';
import { describe, expect, it } from 'vitest';
import type { IStorageProvider } from '../../../core/ports/storage.js';
import { SessionSave } from '../session-save.js';

/** In-memory storage satisfying IStorageProvider for tests. */
function createMemoryStorage(): IStorageProvider {
	const store = new Map<string, unknown>();
	return {
		async get<T>(key: string): Promise<T | null> {
			return (store.get(key) as T) ?? null;
		},
		async set<T>(key: string, value: T): Promise<void> {
			store.set(key, value);
		},
		async remove(key: string): Promise<void> {
			store.delete(key);
		},
		async has(key: string): Promise<boolean> {
			return store.has(key);
		},
		async keys(prefix?: string): Promise<string[]> {
			const all = [...store.keys()];
			return prefix ? all.filter((k) => k.startsWith(prefix)) : all;
		},
	};
}

describe('SessionSave', () => {
	it('returns default state before load', () => {
		const save = new SessionSave(createMemoryStorage());
		expect(save.current.totalCoins).toBe(0);
		expect(save.current.totalStars).toBe(0);
		expect(save.current.levels).toEqual({});
		expect(save.isLoaded).toBe(false);
	});

	it('loads defaults when storage is empty', async () => {
		const save = new SessionSave(createMemoryStorage());
		const data = await save.load();
		expect(data.totalCoins).toBe(0);
		expect(data.totalStars).toBe(0);
		expect(data.levels).toEqual({});
		expect(save.isLoaded).toBe(true);
	});

	it('round-trips a level completion through storage', async () => {
		const storage = createMemoryStorage();
		const save = new SessionSave(storage);

		await save.load();
		await save.onLevelComplete('forest-1', 150, 2, 15, 45000);

		// New instance, same storage — should rehydrate
		const save2 = new SessionSave(storage);
		const data = await save2.load();

		expect(data.levels['forest-1']).toBeDefined();
		expect(data.levels['forest-1']!.score).toBe(150);
		expect(data.levels['forest-1']!.stars).toBe(2);
		expect(data.levels['forest-1']!.coins).toBe(15);
		expect(data.levels['forest-1']!.time).toBe(45000);
		expect(data.totalCoins).toBe(15);
		expect(data.totalStars).toBe(2);
	});

	it('validates loaded data against SessionSaveSchema', async () => {
		const storage = createMemoryStorage();
		const save = new SessionSave(storage);

		await save.load();
		await save.onLevelComplete('forest-1', 100, 3, 10, 30000);

		// Read raw storage and validate against schema
		const raw = await storage.get<unknown>('wds:session-save');
		const result = SessionSaveSchema.safeParse(raw);
		expect(result.success).toBe(true);
	});

	it('rejects corrupt data and returns defaults', async () => {
		const storage = createMemoryStorage();
		// Write corrupt data directly
		await storage.set('wds:session-save', { garbage: true, levels: 'not-an-object' });

		const save = new SessionSave(storage);
		const data = await save.load();

		expect(data.totalCoins).toBe(0);
		expect(data.totalStars).toBe(0);
		expect(data.levels).toEqual({});
		expect(save.isLoaded).toBe(true);
	});

	it('rejects data with invalid star values', async () => {
		const storage = createMemoryStorage();
		await storage.set('wds:session-save', {
			levels: {
				'forest-1': { score: 100, stars: 99, coins: 10, time: 5000, completedAt: 1 },
			},
			totalCoins: 10,
			totalStars: 99,
			savedAt: 1,
		});

		const save = new SessionSave(storage);
		const data = await save.load();

		// stars: 99 exceeds max(3) — safeParse rejects the whole object
		expect(data.levels).toEqual({});
		expect(data.totalStars).toBe(0);
	});

	it('accumulates across multiple level completions', async () => {
		const save = new SessionSave(createMemoryStorage());
		await save.load();

		await save.onLevelComplete('forest-1', 100, 1, 10, 30000);
		await save.onLevelComplete('forest-2', 200, 3, 20, 60000);

		expect(save.current.totalCoins).toBe(30);
		expect(save.current.totalStars).toBe(4);
		expect(Object.keys(save.current.levels)).toHaveLength(2);
	});

	it('overwrites previous result for same level', async () => {
		const save = new SessionSave(createMemoryStorage());
		await save.load();

		await save.onLevelComplete('forest-1', 100, 1, 10, 30000);
		await save.onLevelComplete('forest-1', 200, 3, 15, 25000);

		expect(save.current.levels['forest-1']!.score).toBe(200);
		expect(save.current.levels['forest-1']!.stars).toBe(3);
		// Totals reflect only the latest result per level
		expect(save.current.totalCoins).toBe(15);
		expect(save.current.totalStars).toBe(3);
	});

	it('clears saved state', async () => {
		const storage = createMemoryStorage();
		const save = new SessionSave(storage);

		await save.load();
		await save.onLevelComplete('forest-1', 100, 2, 10, 30000);
		await save.clear();

		expect(save.current.totalCoins).toBe(0);
		expect(save.current.levels).toEqual({});

		// Verify storage is actually cleared
		const save2 = new SessionSave(storage);
		const data = await save2.load();
		expect(data.totalCoins).toBe(0);
	});

	it('floors fractional score and time values', async () => {
		const save = new SessionSave(createMemoryStorage());
		await save.load();

		await save.onLevelComplete('forest-1', 99.7, 2, 10, 12345.6);

		expect(save.current.levels['forest-1']!.score).toBe(99);
		expect(save.current.levels['forest-1']!.time).toBe(12345);
	});

	it('clamps stars to 0-3 range', async () => {
		const save = new SessionSave(createMemoryStorage());
		await save.load();

		await save.onLevelComplete('forest-1', 100, 5, 10, 30000);

		expect(save.current.levels['forest-1']!.stars).toBe(3);
	});
});
