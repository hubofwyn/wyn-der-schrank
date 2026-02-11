/**
 * Persistence abstraction for saves, profiles, and settings.
 * modules/ uses this — never touches localStorage/IndexedDB directly.
 */
export interface IStorageProvider {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T): Promise<void>;
	remove(key: string): Promise<void>;
	has(key: string): Promise<boolean>;
	keys(prefix?: string): Promise<string[]>;
}
