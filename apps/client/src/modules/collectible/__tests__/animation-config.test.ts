import { describe, expect, it } from 'vitest';
import { getCoinAnimationDefs, getCoinDefaultAnim } from '../animation-config.js';

describe('getCoinAnimationDefs', () => {
	it('returns one animation definition', () => {
		const defs = getCoinAnimationDefs();
		expect(defs).toHaveLength(1);
	});

	it('defines coin-spin with 4 looping frames', () => {
		const defs = getCoinAnimationDefs();
		const spin = defs[0];
		expect(spin?.key).toBe('coin-spin');
		expect(spin?.textureKey).toBe('collectible-coin');
		expect(spin?.startFrame).toBe(0);
		expect(spin?.endFrame).toBe(3);
		expect(spin?.repeat).toBe(-1);
	});
});

describe('getCoinDefaultAnim', () => {
	it('returns the spin animation key', () => {
		expect(getCoinDefaultAnim()).toBe('coin-spin');
	});
});
