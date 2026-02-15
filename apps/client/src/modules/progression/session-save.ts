import type { SessionSaveData } from '@hub-of-wyn/shared';
import { SessionSaveSchema } from '@hub-of-wyn/shared';
import type { IStorageProvider } from '../../core/ports/storage.js';

const STORAGE_KEY = 'wds:session-save';

function defaultSave(): SessionSaveData {
	return { levels: {}, totalCoins: 0, totalStars: 0, savedAt: 0 };
}

/**
 * Persists session state (level completions, stars, coins) via IStorageProvider.
 *
 * Pure TS, zone-safe. Validates on load via safeParse() — corrupt data
 * is silently replaced with defaults, never thrown.
 */
export class SessionSave {
	private data: SessionSaveData = defaultSave();
	private loaded = false;

	constructor(private readonly storage: IStorageProvider) {}

	/** Load saved state from storage. Corrupt data returns defaults. */
	async load(): Promise<SessionSaveData> {
		const raw = await this.storage.get<unknown>(STORAGE_KEY);
		if (raw !== null && raw !== undefined) {
			const result = SessionSaveSchema.safeParse(raw);
			this.data = result.success ? result.data : defaultSave();
		} else {
			this.data = defaultSave();
		}
		this.loaded = true;
		return this.data;
	}

	/** Current snapshot (returns defaults if not yet loaded). */
	get current(): Readonly<SessionSaveData> {
		return this.data;
	}

	/** Whether load() has been called. */
	get isLoaded(): boolean {
		return this.loaded;
	}

	/**
	 * Record a level completion and persist.
	 * Overwrites the previous result for this levelId.
	 * Recomputes totals from the full levels record.
	 */
	async onLevelComplete(
		levelId: string,
		score: number,
		stars: number,
		coins: number,
		timeMs: number,
	): Promise<void> {
		const levels = {
			...this.data.levels,
			[levelId]: {
				score: Math.floor(score),
				stars: Math.min(Math.max(Math.floor(stars), 0), 3),
				coins: Math.floor(coins),
				time: Math.floor(timeMs),
				completedAt: Date.now(),
			},
		};

		// Derive totals from the record — no accumulator drift.
		let totalCoins = 0;
		let totalStars = 0;
		for (const entry of Object.values(levels)) {
			totalCoins += entry.coins;
			totalStars += entry.stars;
		}

		this.data = { levels, totalCoins, totalStars, savedAt: Date.now() };
		await this.storage.set(STORAGE_KEY, this.data);
	}

	/** Clear saved session (new game). */
	async clear(): Promise<void> {
		this.data = defaultSave();
		await this.storage.remove(STORAGE_KEY);
	}
}
