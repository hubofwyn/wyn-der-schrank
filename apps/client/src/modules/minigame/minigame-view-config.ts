export interface EntityStyle {
	readonly width: number;
	readonly height: number;
	readonly tint: number;
}

export interface MinigameViewConfig {
	readonly entityStyles: Record<string, EntityStyle>;
	readonly playerSize: { readonly width: number; readonly height: number };
	readonly playerTint: number;
}

export const MINIGAME_VIEW_CONFIGS: Record<string, MinigameViewConfig> = {
	'shake-rush': {
		entityStyles: {
			'parcel-protein': { width: 24, height: 24, tint: 0x22cc44 },
			'parcel-special': { width: 24, height: 24, tint: 0xffd700 },
			'obstacle-poop': { width: 28, height: 28, tint: 0x8b4513 },
			'obstacle-cone': { width: 28, height: 28, tint: 0xff8c00 },
			'obstacle-bird': { width: 28, height: 28, tint: 0x4488cc },
		},
		playerSize: { width: 32, height: 40 },
		playerTint: 0xff4444,
	},
	'coin-catch': {
		entityStyles: {
			coin: { width: 20, height: 20, tint: 0xffd700 },
			'gold-coin': { width: 24, height: 24, tint: 0xffaa00 },
			bomb: { width: 28, height: 28, tint: 0xff2222 },
		},
		playerSize: { width: 48, height: 32 },
		playerTint: 0x44aaff,
	},
};
