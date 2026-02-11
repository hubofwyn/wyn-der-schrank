import type { GameEvent, SyncState } from '@wds/shared';

export interface INetworkClient {
	fetchState<T>(endpoint: string): Promise<T>;
	sendEvent(event: GameEvent): Promise<void>;
	onSync(callback: (state: SyncState) => void): () => void;
}
