import type { IStorageProvider } from '../ports/storage.js';

/**
 * In-memory storage adapter for MVP.
 * Satisfies the IStorageProvider port with a simple Map.
 * Data is lost on page reload. Replaced by LocalStorageAdapter later.
 */
export class NoopStorage implements IStorageProvider {
	private store: Map<string, string> = new Map();

	get<T>(key: string): Promise<T | null> {
		const raw = this.store.get(key);
		if (raw === undefined) return Promise.resolve(null);
		return Promise.resolve(JSON.parse(raw) as T);
	}

	set<T>(key: string, value: T): Promise<void> {
		this.store.set(key, JSON.stringify(value));
		return Promise.resolve();
	}

	remove(key: string): Promise<void> {
		this.store.delete(key);
		return Promise.resolve();
	}

	has(key: string): Promise<boolean> {
		return Promise.resolve(this.store.has(key));
	}

	keys(prefix?: string): Promise<string[]> {
		const all = [...this.store.keys()];
		if (prefix === undefined) return Promise.resolve(all);
		return Promise.resolve(all.filter((k) => k.startsWith(prefix)));
	}
}
