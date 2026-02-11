import { describe, expect, it } from 'vitest';
import { getAnimKeyForState, getPlayerAnimationDefs } from '../animation-config.js';

describe('getPlayerAnimationDefs', () => {
	it('returns four animation definitions', () => {
		const defs = getPlayerAnimationDefs('player');
		expect(defs).toHaveLength(4);
	});

	it('uses the provided texture key for all definitions', () => {
		const defs = getPlayerAnimationDefs('custom-texture');
		for (const def of defs) {
			expect(def.textureKey).toBe('custom-texture');
		}
	});

	it('has unique animation keys', () => {
		const defs = getPlayerAnimationDefs('player');
		const keys = defs.map((d) => d.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('defines idle animation with looping frames', () => {
		const defs = getPlayerAnimationDefs('player');
		const idle = defs.find((d) => d.key === 'player-idle');
		expect(idle).toBeDefined();
		expect(idle!.startFrame).toBe(0);
		expect(idle!.endFrame).toBe(3);
		expect(idle!.repeat).toBe(-1);
	});

	it('defines run animation with looping frames', () => {
		const defs = getPlayerAnimationDefs('player');
		const run = defs.find((d) => d.key === 'player-run');
		expect(run).toBeDefined();
		expect(run!.startFrame).toBe(4);
		expect(run!.endFrame).toBe(7);
		expect(run!.repeat).toBe(-1);
	});

	it('defines jump and fall as single-frame non-looping', () => {
		const defs = getPlayerAnimationDefs('player');
		const jump = defs.find((d) => d.key === 'player-jump');
		const fall = defs.find((d) => d.key === 'player-fall');
		expect(jump).toBeDefined();
		expect(fall).toBeDefined();
		expect(jump!.startFrame).toBe(jump!.endFrame);
		expect(fall!.startFrame).toBe(fall!.endFrame);
		expect(jump!.repeat).toBe(0);
		expect(fall!.repeat).toBe(0);
	});
});

describe('getAnimKeyForState', () => {
	it('maps idle to player-idle', () => {
		expect(getAnimKeyForState('idle')).toBe('player-idle');
	});

	it('maps running to player-run', () => {
		expect(getAnimKeyForState('running')).toBe('player-run');
	});

	it('maps jumping to player-jump', () => {
		expect(getAnimKeyForState('jumping')).toBe('player-jump');
	});

	it('maps falling to player-fall', () => {
		expect(getAnimKeyForState('falling')).toBe('player-fall');
	});

	it('maps unimplemented states to player-idle as fallback', () => {
		expect(getAnimKeyForState('attacking')).toBe('player-idle');
		expect(getAnimKeyForState('hurt')).toBe('player-idle');
		expect(getAnimKeyForState('dead')).toBe('player-idle');
	});
});
