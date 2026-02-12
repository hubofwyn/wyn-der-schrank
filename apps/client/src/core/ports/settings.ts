import type { Settings } from '@wds/shared';

/**
 * Port for reading and persisting game settings.
 * Implemented by SettingsManager in modules/settings/.
 */
export interface ISettingsManager {
	readonly current: Settings;
	load(): Promise<Settings>;
	save(settings: Settings): Promise<void>;
	updateSection<K extends keyof Settings>(
		section: K,
		patch: Partial<Settings[K]>,
	): Promise<Settings>;
}
