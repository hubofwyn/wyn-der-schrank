/**
 * Animation definitions for collectible sprites.
 * Zone-safe: pure data, the scene creates engine animation objects.
 */

export interface CollectibleAnimationDef {
	readonly key: string;
	readonly textureKey: string;
	readonly startFrame: number;
	readonly endFrame: number;
	readonly frameRate: number;
	/** -1 = loop forever, 0 = play once */
	readonly repeat: number;
}

/**
 * Coin collectible animation definition.
 * Spritesheet: 64x16 = 4 frames at 16x16, spinning animation.
 */
export function getCoinAnimationDefs(): CollectibleAnimationDef[] {
	return [
		{
			key: 'coin-spin',
			textureKey: 'collectible-coin',
			startFrame: 0,
			endFrame: 3,
			frameRate: 8,
			repeat: -1,
		},
	];
}

/** Default animation key for a coin. */
export function getCoinDefaultAnim(): string {
	return 'coin-spin';
}
