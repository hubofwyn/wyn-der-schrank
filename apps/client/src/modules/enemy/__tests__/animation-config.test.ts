import { describe, expect, it } from 'vitest';
import { getSkeletonAnimationDefs, getSkeletonDefaultAnim } from '../animation-config.js';

describe('getSkeletonAnimationDefs', () => {
	it('returns two animation definitions (idle and walk)', () => {
		const defs = getSkeletonAnimationDefs();
		expect(defs).toHaveLength(2);
	});

	it('has unique animation keys', () => {
		const defs = getSkeletonAnimationDefs();
		const keys = defs.map((d) => d.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('defines idle animation with 6 looping frames', () => {
		const defs = getSkeletonAnimationDefs();
		const idle = defs.find((d) => d.key === 'skeleton-idle');
		expect(idle).toBeDefined();
		expect(idle!.textureKey).toBe('enemy-skeleton-idle');
		expect(idle!.startFrame).toBe(0);
		expect(idle!.endFrame).toBe(5);
		expect(idle!.repeat).toBe(-1);
	});

	it('defines walk animation with 10 looping frames', () => {
		const defs = getSkeletonAnimationDefs();
		const walk = defs.find((d) => d.key === 'skeleton-walk');
		expect(walk).toBeDefined();
		expect(walk!.textureKey).toBe('enemy-skeleton-walk');
		expect(walk!.startFrame).toBe(0);
		expect(walk!.endFrame).toBe(9);
		expect(walk!.repeat).toBe(-1);
	});
});

describe('getSkeletonDefaultAnim', () => {
	it('returns the idle animation key', () => {
		expect(getSkeletonDefaultAnim()).toBe('skeleton-idle');
	});
});
