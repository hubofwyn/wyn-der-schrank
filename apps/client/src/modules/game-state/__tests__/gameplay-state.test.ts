import { describe, expect, it } from 'vitest';
import { createInitialGameplayState, GAMEPLAY_STATE_KEY } from '../gameplay-state.js';

describe('GameplayState', () => {
	it('has a stable registry key', () => {
		expect(GAMEPLAY_STATE_KEY).toBe('gameplay-state');
	});

	it('creates initial state with sensible defaults', () => {
		const state = createInitialGameplayState();
		expect(state.health).toBe(100);
		expect(state.maxHealth).toBe(100);
		expect(state.score).toBe(0);
		expect(state.coins).toBe(0);
		expect(state.coinsTotal).toBe(0);
		expect(state.timeElapsedMs).toBe(0);
		expect(state.stars).toBe(0);
		expect(state.completed).toBe(false);
	});

	it('returns a new object each call', () => {
		const a = createInitialGameplayState();
		const b = createInitialGameplayState();
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});
});
