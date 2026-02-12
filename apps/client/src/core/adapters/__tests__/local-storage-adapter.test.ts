import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../local-storage-adapter.js';

/** Map-backed mock for globalThis.localStorage */
function createMockStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		key: (index: number) => [...store.keys()][index] ?? null,
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
	};
}

describe('LocalStorageAdapter', () => {
	const original = globalThis.localStorage;

	beforeEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: createMockStorage(),
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: original,
			writable: true,
			configurable: true,
		});
	});

	it('returns null for missing key', async () => {
		const adapter = new LocalStorageAdapter();
		expect(await adapter.get('missing')).toBeNull();
	});

	it('round-trips JSON values via set and get', async () => {
		const adapter = new LocalStorageAdapter();
		await adapter.set('key', { a: 1, b: 'two' });
		expect(await adapter.get('key')).toEqual({ a: 1, b: 'two' });
	});

	it('removes keys', async () => {
		const adapter = new LocalStorageAdapter();
		await adapter.set('key', 42);
		await adapter.remove('key');
		expect(await adapter.get('key')).toBeNull();
	});

	it('reports key existence with has()', async () => {
		const adapter = new LocalStorageAdapter();
		expect(await adapter.has('key')).toBe(false);
		await adapter.set('key', true);
		expect(await adapter.has('key')).toBe(true);
	});

	it('lists keys with optional prefix filter', async () => {
		const adapter = new LocalStorageAdapter();
		await adapter.set('wds:a', 1);
		await adapter.set('wds:b', 2);
		await adapter.set('other', 3);
		expect(await adapter.keys('wds:')).toEqual(['wds:a', 'wds:b']);
		expect((await adapter.keys()).length).toBe(3);
	});

	it('returns null on corrupted JSON', async () => {
		const adapter = new LocalStorageAdapter();
		localStorage.setItem('bad', '{not-json');
		expect(await adapter.get('bad')).toBeNull();
	});
});
