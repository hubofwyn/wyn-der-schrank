/**
 * Port for screen wake lock — prevents screen dimming during gameplay.
 *
 * Implemented by WakeLockAdapter (browser API) or NoopWakeLock (fallback).
 */
export interface IWakeLock {
	/** Whether the wake lock is currently active. */
	readonly isActive: boolean;

	/** Request a screen wake lock. No-op if already active or unsupported. */
	request(): Promise<void>;

	/** Release the current wake lock. No-op if not active. */
	release(): Promise<void>;

	/** Clean up event listeners and release any active lock. */
	destroy(): Promise<void>;
}
