import type { MinigameId, MinigamePhase } from '@hub-of-wyn/shared';

export const MINIGAME_HUD_STATE_KEY = 'minigame-hud-state';

export interface MinigameHudState {
	readonly minigameId: MinigameId;
	readonly phase: MinigamePhase;
	readonly score: number;
	readonly lives: number;
	readonly maxLives: number;
	readonly combo: number;
	readonly progress: number;
	readonly progressLabel: string;
	readonly timeRemainingMs: number;
	readonly message: string | null;
}

export function createInitialMinigameHudState(): MinigameHudState {
	return {
		minigameId: 'shake-rush',
		phase: 'intro',
		score: 0,
		lives: 3,
		maxLives: 3,
		combo: 0,
		progress: 0,
		progressLabel: '0/0',
		timeRemainingMs: 0,
		message: null,
	};
}
