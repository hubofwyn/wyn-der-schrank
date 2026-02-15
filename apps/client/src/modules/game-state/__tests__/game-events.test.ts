import { GameEventSchema } from '@hub-of-wyn/shared';
import { describe, expect, it, vi } from 'vitest';
import type { INetworkClient } from '../../../core/ports/network.js';
import { emitLevelCompleted } from '../game-events.js';
import type { GameplayState } from '../gameplay-state.js';

function mockNetwork(): INetworkClient & { sendEvent: ReturnType<typeof vi.fn> } {
	return {
		fetchState: vi.fn().mockRejectedValue(new Error('not connected')),
		sendEvent: vi.fn().mockResolvedValue(undefined),
		onSync: vi.fn().mockReturnValue(() => {}),
	};
}

function completedState(overrides?: Partial<GameplayState>): GameplayState {
	return {
		health: 80,
		maxHealth: 100,
		score: 150,
		coins: 5,
		coinsTotal: 10,
		levelId: 'map-forest-1',
		levelName: 'forest 1',
		timeElapsedMs: 45000,
		stars: 2,
		completed: true,
		lives: 3,
		...overrides,
	};
}

describe('emitLevelCompleted', () => {
	it('sends a level:completed event through the network port', async () => {
		const network = mockNetwork();
		await emitLevelCompleted(network, completedState());

		expect(network.sendEvent).toHaveBeenCalledOnce();
	});

	it('constructs an event matching the GameEventSchema', async () => {
		const network = mockNetwork();
		await emitLevelCompleted(network, completedState());

		const event = network.sendEvent.mock.calls[0]![0];
		const result = GameEventSchema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it('strips map- prefix to produce a valid levelId', async () => {
		const network = mockNetwork();
		await emitLevelCompleted(network, completedState({ levelId: 'map-cave-3' }));

		const event = network.sendEvent.mock.calls[0]![0];
		expect(event.levelId).toBe('cave-3');
	});

	it('passes score and time as integers', async () => {
		const network = mockNetwork();
		await emitLevelCompleted(network, completedState({ score: 99.7, timeElapsedMs: 12345.6 }));

		const event = network.sendEvent.mock.calls[0]![0];
		expect(event.score).toBe(99);
		expect(event.time).toBe(12345);
		expect(Number.isInteger(event.score)).toBe(true);
		expect(Number.isInteger(event.time)).toBe(true);
	});

	it('includes type discriminant and playerId', async () => {
		const network = mockNetwork();
		await emitLevelCompleted(network, completedState());

		const event = network.sendEvent.mock.calls[0]![0];
		expect(event.type).toBe('level:completed');
		expect(event.playerId).toBe('local');
		expect(event.timestamp).toBeTypeOf('number');
	});
});
