import { WakeLockManager } from '../../modules/session/wake-lock-manager.js';
import type { IWakeLock } from '../ports/wake-lock.js';

/**
 * Adapter bridging WakeLockManager to IWakeLock port using browser APIs.
 *
 * Uses navigator.wakeLock.request('screen') for wake lock and
 * document.visibilitychange for auto-reacquire on page show.
 */
export class WakeLockAdapter implements IWakeLock {
	private readonly _manager: WakeLockManager;

	constructor() {
		this._manager = new WakeLockManager({
			requestLock: async () => {
				const sentinel = await navigator.wakeLock.request('screen');
				return async () => {
					await sentinel.release();
				};
			},
			onVisibilityChange: (callback) => {
				const handler = () => {
					callback(document.visibilityState === 'visible');
				};
				document.addEventListener('visibilitychange', handler);
				return () => {
					document.removeEventListener('visibilitychange', handler);
				};
			},
		});
	}

	get isActive(): boolean {
		return this._manager.isActive;
	}

	async request(): Promise<void> {
		await this._manager.request();
	}

	async release(): Promise<void> {
		await this._manager.release();
	}

	async destroy(): Promise<void> {
		await this._manager.destroy();
	}
}
