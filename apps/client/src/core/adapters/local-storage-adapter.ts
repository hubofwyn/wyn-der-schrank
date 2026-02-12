import type { IStorageProvider } from '../ports/storage.js';

/**
 * LocalStorage-backed persistence adapter.
 * Wraps window.localStorage with JSON serialization.
 */
export class LocalStorageAdapter implements IStorageProvider {
	get<T>(key: string): Promise<T | null> {
		try {
			const raw = localStorage.getItem(key);
			if (raw === null) return Promise.resolve(null);
			return Promise.resolve(JSON.parse(raw) as T);
		} catch {
			return Promise.resolve(null);
		}
	}

	set<T>(key: string, value: T): Promise<void> {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// QuotaExceededError — silently ignore
		}
		return Promise.resolve();
	}

	remove(key: string): Promise<void> {
		localStorage.removeItem(key);
		return Promise.resolve();
	}

	has(key: string): Promise<boolean> {
		return Promise.resolve(localStorage.getItem(key) !== null);
	}

	keys(prefix?: string): Promise<string[]> {
		const all: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k !== null) all.push(k);
		}
		if (prefix === undefined) return Promise.resolve(all);
		return Promise.resolve(all.filter((k) => k.startsWith(prefix)));
	}
}
