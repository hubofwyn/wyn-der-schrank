export const GAMEPLAY_STATE_KEY = 'gameplay-state';

export interface GameplayState {
	readonly health: number;
	readonly maxHealth: number;
	readonly score: number;
	readonly coins: number;
	readonly coinsTotal: number;
	readonly levelId: string;
	readonly levelName: string;
	readonly timeElapsedMs: number;
	readonly stars: number;
	readonly completed: boolean;
}

export function createInitialGameplayState(): GameplayState {
	return {
		health: 100,
		maxHealth: 100,
		score: 0,
		coins: 0,
		coinsTotal: 0,
		levelId: '',
		levelName: '',
		timeElapsedMs: 0,
		stars: 0,
		completed: false,
	};
}
