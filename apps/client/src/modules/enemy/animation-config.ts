/**
 * Animation definitions for enemy sprites.
 * Zone-safe: pure data, the scene creates engine animation objects.
 */

export interface EnemyAnimationDef {
	readonly key: string;
	readonly textureKey: string;
	readonly startFrame: number;
	readonly endFrame: number;
	readonly frameRate: number;
	/** -1 = loop forever, 0 = play once */
	readonly repeat: number;
}

/**
 * Skeleton enemy animation definitions.
 *
 * Uses two separate spritesheets:
 *   enemy-skeleton-idle (192x32, 6 frames at 32x32)
 *   enemy-skeleton-walk (320x32, 10 frames at 32x32)
 */
export function getSkeletonAnimationDefs(): EnemyAnimationDef[] {
	return [
		{
			key: 'skeleton-idle',
			textureKey: 'enemy-skeleton-idle',
			startFrame: 0,
			endFrame: 5,
			frameRate: 8,
			repeat: -1,
		},
		{
			key: 'skeleton-walk',
			textureKey: 'enemy-skeleton-walk',
			startFrame: 0,
			endFrame: 9,
			frameRate: 10,
			repeat: -1,
		},
	];
}

/** Default animation key for a skeleton standing still. */
export function getSkeletonDefaultAnim(): string {
	return 'skeleton-idle';
}
