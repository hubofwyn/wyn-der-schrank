import type { MinigameId } from '@hub-of-wyn/shared';
import { describe, expect, it, vi } from 'vitest';
import type { IDiagnostics } from '../../../core/ports/diagnostics.js';
import { createMockClock, createMockInput } from '../../__test-utils__/mocks.js';
import type { IMinigameLogic, MinigameLogicDeps } from '../minigame-logic.js';
import { MinigameManager } from '../minigame-manager.js';
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

function createSpyDiagnostics(): IDiagnostics {
	return {
		emit: vi.fn(),
		isEnabled: () => true,
		query: () => [],
	};
}

describe('MinigameManager', () => {
	it('creates logic and sets active', () => {
		const registry = new MinigameRegistry();
		const logic = createStubLogic('shake-rush');
		registry.register('shake-rush', () => logic);
		const manager = new MinigameManager(registry);
		const result = manager.createLogic('shake-rush', createDeps());
		expect(result).toBe(logic);
		expect(manager.active).toBe(logic);
	});

	it('disposes active logic', () => {
		const registry = new MinigameRegistry();
		const logic = createStubLogic('shake-rush');
		registry.register('shake-rush', () => logic);
		const manager = new MinigameManager(registry);
		manager.createLogic('shake-rush', createDeps());
		manager.disposeActive();
		expect(manager.active).toBeNull();
		expect(logic.dispose).toHaveBeenCalled();
	});

	it('replaces previous active on create', () => {
		const registry = new MinigameRegistry();
		const first = createStubLogic('shake-rush');
		const second = createStubLogic('shake-rush');
		let callCount = 0;
		registry.register('shake-rush', () => (callCount++ === 0 ? first : second));
		const manager = new MinigameManager(registry);
		manager.createLogic('shake-rush', createDeps());
		manager.createLogic('shake-rush', createDeps());
		expect(first.dispose).toHaveBeenCalled();
		expect(manager.active).toBe(second);
	});

	it('active is null when nothing created', () => {
		const registry = new MinigameRegistry();
		const manager = new MinigameManager(registry);
		expect(manager.active).toBeNull();
	});

	it('emits diagnostics on create and dispose', () => {
		const registry = new MinigameRegistry();
		registry.register('shake-rush', () => createStubLogic('shake-rush'));
		const diag = createSpyDiagnostics();
		const manager = new MinigameManager(registry, diag);
		manager.createLogic('shake-rush', createDeps());
		expect(diag.emit).toHaveBeenCalledWith('minigame', 'state', 'created', {
			minigameId: 'shake-rush',
		});
		manager.disposeActive();
		expect(diag.emit).toHaveBeenCalledWith('minigame', 'state', 'disposed', {
			minigameId: 'shake-rush',
		});
	});
});
