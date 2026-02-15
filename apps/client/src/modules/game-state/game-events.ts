import type { GameEvent } from '@hub-of-wyn/shared';
import type { INetworkClient } from '../../core/ports/network.js';
import type { GameplayState } from './gameplay-state.js';

/**
 * Construct and send a `level:completed` GameEvent via the network port.
 *
 * Strips the `map-` prefix from the mapKey to produce a valid LevelId
 * (e.g. `map-forest-1` → `forest-1`).
 *
 * Fire-and-forget — the returned promise is intentionally not awaited
 * by callers (scenes) since offline play uses NoopNetwork.
 */
export function emitLevelCompleted(network: INetworkClient, state: GameplayState): Promise<void> {
	const event: GameEvent = {
		type: 'level:completed',
		timestamp: Date.now(),
		playerId: 'local',
		levelId: state.levelId.replace(/^map-/, ''),
		score: Math.floor(state.score),
		time: Math.floor(state.timeElapsedMs),
	};
	return network.sendEvent(event);
}
