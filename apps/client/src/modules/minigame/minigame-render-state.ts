import type { MinigamePhase } from '@hub-of-wyn/shared';

export interface MinigameEntitySnapshot {
	readonly id: number;
	readonly kind: string;
	readonly x: number;
	readonly y: number;
	readonly active: boolean;
}

export interface MinigameRenderStateBase {
	readonly player: {
		readonly x: number;
		readonly y: number;
		readonly isInvincible: boolean;
	};
	readonly entities: readonly MinigameEntitySnapshot[];
	readonly phase: MinigamePhase;
}
