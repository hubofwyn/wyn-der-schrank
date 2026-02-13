import type { Settings } from '@hub-of-wyn/shared';
import { SettingsSchema } from '@hub-of-wyn/shared';
import type { ISettingsManager } from '../../core/ports/settings.js';
import type { IStorageProvider } from '../../core/ports/storage.js';

export const SETTINGS_STORAGE_KEY = 'wds:settings';

/**
 * Manages game settings with validation and persistence.
 * All writes go through SettingsSchema.parse() to enforce defaults and constraints.
 */
export class SettingsManager implements ISettingsManager {
	private _current: Settings;

	constructor(private readonly storage: IStorageProvider) {
		this._current = SettingsSchema.parse({
			audio: {},
			display: {},
			controls: {},
			accessibility: {},
			diagnostics: {},
		});
	}

	get current(): Settings {
		return this._current;
	}

	async load(): Promise<Settings> {
		try {
			const raw = await this.storage.get<unknown>(SETTINGS_STORAGE_KEY);
			if (raw !== null && typeof raw === 'object') {
				this._current = SettingsSchema.parse(raw);
			}
		} catch {
			// Corrupted data — keep defaults
		}
		return this._current;
	}

	async save(settings: Settings): Promise<void> {
		this._current = SettingsSchema.parse(settings);
		await this.storage.set(SETTINGS_STORAGE_KEY, this._current);
	}

	async updateSection<K extends keyof Settings>(
		section: K,
		patch: Partial<Settings[K]>,
	): Promise<Settings> {
		const merged = {
			...this._current,
			[section]: { ...this._current[section], ...patch },
		};
		this._current = SettingsSchema.parse(merged);
		await this.storage.set(SETTINGS_STORAGE_KEY, this._current);
		return this._current;
	}
}
