import { describe, expect, it } from 'vitest';
import { CollectibleManager } from '../collectible-manager.js';

describe('CollectibleManager', () => {
	it('starts empty before init', () => {
		const mgr = new CollectibleManager();
		expect(mgr.total).toBe(0);
		expect(mgr.collectedCount).toBe(0);
		expect(mgr.allCollected).toBe(false);
	});

	it('initializes with positions', () => {
		const mgr = new CollectibleManager();
		mgr.init([
			{ x: 10, y: 20 },
			{ x: 30, y: 40 },
			{ x: 50, y: 60 },
		]);
		expect(mgr.total).toBe(3);
		expect(mgr.collectedCount).toBe(0);
	});

	it('collects an item and returns coin count', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);

		const result = mgr.collect(0);
		expect(result).toEqual({ collected: true, coinCount: 1 });
		expect(mgr.collectedCount).toBe(1);
		expect(mgr.isCollected(0)).toBe(true);
	});

	it('prevents double-collect', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);

		mgr.collect(0);
		const result = mgr.collect(0);
		expect(result).toEqual({ collected: false, coinCount: 0 });
		expect(mgr.collectedCount).toBe(1);
	});

	it('rejects out-of-bounds negative index', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);

		const result = mgr.collect(-1);
		expect(result).toEqual({ collected: false, coinCount: 0 });
	});

	it('rejects out-of-bounds high index', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);

		const result = mgr.collect(5);
		expect(result).toEqual({ collected: false, coinCount: 0 });
	});

	it('tracks allCollected correctly', () => {
		const mgr = new CollectibleManager();
		mgr.init([
			{ x: 10, y: 20 },
			{ x: 30, y: 40 },
		]);

		expect(mgr.allCollected).toBe(false);
		mgr.collect(0);
		expect(mgr.allCollected).toBe(false);
		mgr.collect(1);
		expect(mgr.allCollected).toBe(true);
	});

	it('isCollected returns false for out-of-bounds index', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);
		expect(mgr.isCollected(-1)).toBe(false);
		expect(mgr.isCollected(5)).toBe(false);
	});

	it('resets all state', () => {
		const mgr = new CollectibleManager();
		mgr.init([
			{ x: 10, y: 20 },
			{ x: 30, y: 40 },
		]);
		mgr.collect(0);
		mgr.reset();

		expect(mgr.total).toBe(0);
		expect(mgr.collectedCount).toBe(0);
		expect(mgr.allCollected).toBe(false);
	});

	it('can re-init after reset', () => {
		const mgr = new CollectibleManager();
		mgr.init([{ x: 10, y: 20 }]);
		mgr.collect(0);
		mgr.init([
			{ x: 50, y: 60 },
			{ x: 70, y: 80 },
		]);

		expect(mgr.total).toBe(2);
		expect(mgr.collectedCount).toBe(0);
		expect(mgr.isCollected(0)).toBe(false);
	});
});
