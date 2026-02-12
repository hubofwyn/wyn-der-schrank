/**
 * Pure data definition for a spritesheet animation.
 * Zone-safe: the scene converts these to engine animation objects.
 */
export interface AnimationDef {
	readonly key: string;
	readonly textureKey: string;
	readonly startFrame: number;
	readonly endFrame: number;
	readonly frameRate: number;
	/** -1 = loop forever, 0 = play once */
	readonly repeat: number;
}
