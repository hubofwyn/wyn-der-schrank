import type { GameEvent, SyncState } from '@hub-of-wyn/shared';
import type { INetworkClient } from '../ports/network.js';

/**
 * No-op network adapter for MVP (offline-only play).
 * Satisfies the INetworkClient port with stub methods.
 * Replaced by a real Hono RPC adapter when multiplayer/sync is needed.
 */
export class NoopNetwork implements INetworkClient {
	fetchState<T>(_endpoint: string): Promise<T> {
		return Promise.reject(new Error('NoopNetwork: not connected'));
	}

	sendEvent(_event: GameEvent): Promise<void> {
		return Promise.resolve();
	}

	onSync(_callback: (state: SyncState) => void): () => void {
		return () => {};
	}
}
