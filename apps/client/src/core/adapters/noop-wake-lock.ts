import type { IWakeLock } from '../ports/wake-lock.js';

/**
 * No-op wake lock for environments that don't support the Wake Lock API.
 * Used as fallback when navigator.wakeLock is unavailable.
 */
export class NoopWakeLock implements IWakeLock {
	get isActive(): boolean {
		return false;
	}

	async request(): Promise<void> {}
	async release(): Promise<void> {}
	async destroy(): Promise<void> {}
}
