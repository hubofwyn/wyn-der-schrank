/**
 * Animation definitions for collectible sprites.
 * Zone-safe: pure data, the scene creates engine animation objects.
 */

import type { AnimationDef } from '../animation/animation-def.js';

/**
 * Coin collectible animation definition.
 * Spritesheet: 64x16 = 4 frames at 16x16, spinning animation.
 */
export function getCoinAnimationDefs(): AnimationDef[] {
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
