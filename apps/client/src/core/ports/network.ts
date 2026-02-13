import type { GameEvent, SyncState } from '@hub-of-wyn/shared';

export interface INetworkClient {
	fetchState<T>(endpoint: string): Promise<T>;
	sendEvent(event: GameEvent): Promise<void>;
	onSync(callback: (state: SyncState) => void): () => void;
}
