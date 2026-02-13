import type { MinigameId } from '@hub-of-wyn/shared';
import { describe, expect, it, vi } from 'vitest';
import { createMockClock, createMockInput } from '../../__test-utils__/mocks.js';
import type { IMinigameLogic, MinigameLogicDeps } from '../minigame-logic.js';
import { MinigameRegistry } from '../minigame-registry.js';

function createDeps(): MinigameLogicDeps {
	return {
		input: createMockInput(),
		clock: createMockClock(),
		diagnostics: {
			emit: vi.fn(),
			isEnabled: () => true,
			query: () => [],
		},
	};
}

function createStubLogic(id: MinigameId): IMinigameLogic {
	return {
		id,
		phase: 'intro',
		start: vi.fn(),
		update: vi.fn(),
		hudSnapshot: vi.fn() as IMinigameLogic['hudSnapshot'],
		renderSnapshot: vi.fn(),
		getResult: () => null,
		dispose: vi.fn(),
	};
}

describe('MinigameRegistry', () => {
	it('registers and creates a minigame', () => {
		const registry = new MinigameRegistry();
		const logic = createStubLogic('shake-rush');
		registry.register('shake-rush', () => logic);
		const result = registry.create('shake-rush', createDeps());
		expect(result).toBe(logic);
	});

	it('passes deps to factory on create', () => {
		const registry = new MinigameRegistry();
		const factory = vi.fn().mockReturnValue(createStubLogic('shake-rush'));
		registry.register('shake-rush', factory);
		const deps = createDeps();
		registry.create('shake-rush', deps);
		expect(factory).toHaveBeenCalledWith(deps);
	});

	it('has() returns true for registered IDs', () => {
		const registry = new MinigameRegistry();
		registry.register('shake-rush', () => createStubLogic('shake-rush'));
		expect(registry.has('shake-rush')).toBe(true);
		expect(registry.has('dice-duel')).toBe(false);
	});

	it('throws on unknown minigame ID', () => {
		const registry = new MinigameRegistry();
		expect(() => registry.create('dice-duel', createDeps())).toThrow(
			"Unknown minigame: 'dice-duel'",
		);
	});

	it('throws on duplicate registration', () => {
		const registry = new MinigameRegistry();
		registry.register('shake-rush', () => createStubLogic('shake-rush'));
		expect(() => registry.register('shake-rush', () => createStubLogic('shake-rush'))).toThrow(
			"Minigame 'shake-rush' is already registered",
		);
	});

	it('returns registered IDs', () => {
		const registry = new MinigameRegistry();
		registry.register('shake-rush', () => createStubLogic('shake-rush'));
		registry.register('dice-duel', () => createStubLogic('dice-duel'));
		expect(registry.registeredIds).toEqual(['shake-rush', 'dice-duel']);
	});
});
