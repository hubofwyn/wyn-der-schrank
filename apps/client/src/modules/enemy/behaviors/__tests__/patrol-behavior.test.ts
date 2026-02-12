import { describe, expect, it } from 'vitest';
import { createPatrolState, type PatrolConfig, updatePatrol } from '../patrol-behavior.js';

function makeConfig(overrides?: Partial<PatrolConfig>): PatrolConfig {
	return {
		leftBound: 50,
		rightBound: 250,
		speed: 60,
		...overrides,
	};
}

describe('patrol-behavior', () => {
	describe('createPatrolState', () => {
		it('starts moving left (direction -1)', () => {
			const state = createPatrolState();
			expect(state.direction).toBe(-1);
		});
	});

	describe('updatePatrol', () => {
		it('returns negative velocity when moving left', () => {
			const state = createPatrolState();
			const config = makeConfig();
			const intent = updatePatrol(150, state, config);
			expect(intent.velocityX).toBe(-60);
			expect(intent.facing).toBe('left');
		});

		it('reverses to right when reaching left bound', () => {
			const state = createPatrolState();
			const config = makeConfig();
			const intent = updatePatrol(50, state, config);
			expect(state.direction).toBe(1);
			expect(intent.velocityX).toBe(60);
			expect(intent.facing).toBe('right');
		});

		it('reverses to left when reaching right bound', () => {
			const state = createPatrolState();
			state.direction = 1;
			const config = makeConfig();
			const intent = updatePatrol(250, state, config);
			expect(state.direction).toBe(-1);
			expect(intent.velocityX).toBe(-60);
			expect(intent.facing).toBe('left');
		});

		it('does not reverse when within bounds', () => {
			const state = createPatrolState();
			const config = makeConfig();
			updatePatrol(150, state, config);
			expect(state.direction).toBe(-1);
		});

		it('reverses when past left bound', () => {
			const state = createPatrolState();
			const config = makeConfig();
			const intent = updatePatrol(30, state, config);
			expect(state.direction).toBe(1);
			expect(intent.velocityX).toBe(60);
		});

		it('reverses when past right bound', () => {
			const state = createPatrolState();
			state.direction = 1;
			const config = makeConfig();
			const intent = updatePatrol(300, state, config);
			expect(state.direction).toBe(-1);
			expect(intent.velocityX).toBe(-60);
		});

		it('uses provided speed value', () => {
			const state = createPatrolState();
			const config = makeConfig({ speed: 120 });
			const intent = updatePatrol(150, state, config);
			expect(intent.velocityX).toBe(-120);
		});
	});
});
