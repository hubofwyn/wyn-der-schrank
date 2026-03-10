import { describe, expect, it } from 'vitest';
import { type WakeLockDeps, WakeLockManager } from '../wake-lock-manager.js';

function createMockDeps(overrides?: Partial<WakeLockDeps>): {
	deps: WakeLockDeps;
	visibilityCallback: ((visible: boolean) => void) | null;
	requestCount: number;
	releaseCount: number;
} {
	let visibilityCallback: ((visible: boolean) => void) | null = null;
	const state = { requestCount: 0, releaseCount: 0 };

	const deps: WakeLockDeps = {
		requestLock:
			overrides?.requestLock ??
			(async () => {
				state.requestCount++;
				return async () => {
					state.releaseCount++;
				};
			}),
		onVisibilityChange:
			overrides?.onVisibilityChange ??
			((callback) => {
				visibilityCallback = callback;
				return () => {
					visibilityCallback = null;
				};
			}),
	};

	return {
		deps,
		get visibilityCallback() {
			return visibilityCallback;
		},
		get requestCount() {
			return state.requestCount;
		},
		get releaseCount() {
			return state.releaseCount;
		},
	};
}

describe('WakeLockManager', () => {
	it('starts inactive', () => {
		const { deps } = createMockDeps();
		const manager = new WakeLockManager(deps);
		expect(manager.isActive).toBe(false);
	});

	it('becomes active after request', async () => {
		const { deps } = createMockDeps();
		const manager = new WakeLockManager(deps);
		await manager.request();
		expect(manager.isActive).toBe(true);
	});

	it('becomes inactive after release', async () => {
		const { deps } = createMockDeps();
		const manager = new WakeLockManager(deps);
		await manager.request();
		await manager.release();
		expect(manager.isActive).toBe(false);
	});

	it('request is idempotent when already active', async () => {
		const mock = createMockDeps();
		const manager = new WakeLockManager(mock.deps);
		await manager.request();
		await manager.request();
		expect(mock.requestCount).toBe(1);
	});

	it('release is safe when not active', async () => {
		const { deps } = createMockDeps();
		const manager = new WakeLockManager(deps);
		await expect(manager.release()).resolves.toBeUndefined();
	});

	it('handles requestLock failure gracefully', async () => {
		const { deps } = createMockDeps({
			requestLock: async () => {
				throw new Error('NotAllowedError');
			},
		});
		const manager = new WakeLockManager(deps);
		await manager.request();
		expect(manager.isActive).toBe(false);
	});

	it('auto-reacquires on visibility restore when shouldBeActive', async () => {
		const mock = createMockDeps();
		const manager = new WakeLockManager(mock.deps);

		await manager.request();
		expect(mock.requestCount).toBe(1);

		// Simulate browser releasing lock on hidden
		(manager as unknown as { _isActive: boolean })._isActive = false;
		(manager as unknown as { _releaseFn: null })._releaseFn = null;

		// Page becomes visible again
		mock.visibilityCallback?.(true);
		// Wait for async reacquire
		await new Promise((r) => setTimeout(r, 10));

		expect(mock.requestCount).toBe(2);
		expect(manager.isActive).toBe(true);
	});

	it('does not reacquire if release was explicit', async () => {
		const mock = createMockDeps();
		const manager = new WakeLockManager(mock.deps);

		await manager.request();
		await manager.release();

		mock.visibilityCallback?.(true);
		await new Promise((r) => setTimeout(r, 10));

		expect(mock.requestCount).toBe(1);
	});

	it('destroy releases lock and unsubscribes', async () => {
		const mock = createMockDeps();
		const manager = new WakeLockManager(mock.deps);

		await manager.request();
		await manager.destroy();

		expect(manager.isActive).toBe(false);
		expect(mock.releaseCount).toBe(1);
		expect(mock.visibilityCallback).toBeNull();
	});
});
