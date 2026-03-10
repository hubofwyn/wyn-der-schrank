/**
 * Wake lock lifecycle manager — pure TS, zero DOM.
 *
 * Coordinates request/release of screen wake lock through a provided
 * lock function. Tracks active state and handles auto-reacquire when
 * the page regains visibility (browser releases wake locks on hidden).
 *
 * The lock function and visibility callbacks are injected for testability.
 */

export interface WakeLockDeps {
	/** Request a wake lock. Returns a release function. Throws if unsupported. */
	requestLock: () => Promise<() => Promise<void>>;
	/** Subscribe to page visibility changes. Returns unsubscribe function. */
	onVisibilityChange: (callback: (visible: boolean) => void) => () => void;
}

export class WakeLockManager {
	private _isActive = false;
	private _releaseFn: (() => Promise<void>) | null = null;
	private _shouldBeActive = false;
	private readonly _deps: WakeLockDeps;
	private readonly _unsubVisibility: () => void;

	constructor(deps: WakeLockDeps) {
		this._deps = deps;
		this._unsubVisibility = deps.onVisibilityChange((visible) => {
			if (visible && this._shouldBeActive && !this._isActive) {
				this.request().catch(() => {});
			}
		});
	}

	get isActive(): boolean {
		return this._isActive;
	}

	async request(): Promise<void> {
		this._shouldBeActive = true;
		if (this._isActive) return;

		try {
			this._releaseFn = await this._deps.requestLock();
			this._isActive = true;
		} catch {
			// Wake Lock API not supported or denied — silent fallback
			this._isActive = false;
		}
	}

	async release(): Promise<void> {
		this._shouldBeActive = false;
		if (!this._isActive || !this._releaseFn) return;

		try {
			await this._releaseFn();
		} catch {
			// Already released or invalid — ignore
		}
		this._releaseFn = null;
		this._isActive = false;
	}

	async destroy(): Promise<void> {
		this._unsubVisibility();
		await this.release();
	}
}
