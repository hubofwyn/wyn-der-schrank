import { SettingsSchema } from '@wds/shared';
import { describe, expect, it } from 'vitest';
import type { IStorageProvider } from '../../../core/ports/storage.js';
import { SETTINGS_STORAGE_KEY, SettingsManager } from '../settings-manager.js';

/** In-memory mock satisfying IStorageProvider for tests. */
function createMockStorage(): IStorageProvider {
	const store = new Map<string, string>();
	return {
		get: <T>(key: string) => {
			const raw = store.get(key);
			if (raw === undefined) return Promise.resolve(null as T | null);
			return Promise.resolve(JSON.parse(raw) as T);
		},
		set: <T>(key: string, value: T) => {
			store.set(key, JSON.stringify(value));
			return Promise.resolve();
		},
		remove: (key: string) => {
			store.delete(key);
			return Promise.resolve();
		},
		has: (key: string) => Promise.resolve(store.has(key)),
		keys: (prefix?: string) => {
			const all = [...store.keys()];
			if (prefix === undefined) return Promise.resolve(all);
			return Promise.resolve(all.filter((k) => k.startsWith(prefix)));
		},
	};
}

describe('SettingsManager', () => {
	const defaults = SettingsSchema.parse({
		audio: {},
		display: {},
		controls: {},
		accessibility: {},
	});

	it('starts with schema defaults', () => {
		const mgr = new SettingsManager(createMockStorage());
		expect(mgr.current).toEqual(defaults);
	});

	it('load() returns defaults when storage is empty', async () => {
		const mgr = new SettingsManager(createMockStorage());
		const result = await mgr.load();
		expect(result).toEqual(defaults);
	});

	it('load() restores previously saved settings', async () => {
		const storage = createMockStorage();
		const mgr = new SettingsManager(storage);
		await mgr.updateSection('audio', { muted: true });

		const mgr2 = new SettingsManager(storage);
		await mgr2.load();
		expect(mgr2.current.audio.muted).toBe(true);
	});

	it('save() persists and validates full settings', async () => {
		const storage = createMockStorage();
		const mgr = new SettingsManager(storage);
		const modified = { ...defaults, audio: { ...defaults.audio, muted: true } };
		await mgr.save(modified);

		const raw = await storage.get(SETTINGS_STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(mgr.current.audio.muted).toBe(true);
	});

	it('updateSection() merges patch and enforces schema', async () => {
		const mgr = new SettingsManager(createMockStorage());
		const result = await mgr.updateSection('display', { showFps: true });
		expect(result.display.showFps).toBe(true);
		// Other display fields retain defaults
		expect(result.display.screenShake).toBe(true);
	});

	it('load() falls back to defaults on corrupted data', async () => {
		const storage = createMockStorage();
		// Inject non-parseable data
		await storage.set(SETTINGS_STORAGE_KEY, 'not-an-object');
		const mgr = new SettingsManager(storage);
		const result = await mgr.load();
		expect(result).toEqual(defaults);
	});

	it('uses the expected storage key constant', () => {
		expect(SETTINGS_STORAGE_KEY).toBe('wds:settings');
	});
});
