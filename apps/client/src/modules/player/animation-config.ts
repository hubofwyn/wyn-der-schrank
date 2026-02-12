import type { PlayerState } from '@wds/shared';
import type { AnimationDef } from '../animation/animation-def.js';

/**
 * Map from PlayerState to the animation key that should play.
 * States without a unique animation share keys (e.g. falling = jump).
 */
const STATE_TO_ANIM: Record<PlayerState, string> = {
	idle: 'player-idle',
	running: 'player-run',
	jumping: 'player-jump',
	falling: 'player-fall',
	attacking: 'player-idle',
	hurt: 'player-idle',
	dead: 'player-idle',
};

/**
 * Returns animation definitions for the player spritesheet.
 *
 * Frame layout (Dungeon_Character.png, 16×16 frames, 7 cols × 4 rows):
 *   0–3: idle (4 frames)
 *   4–7: run  (4 frames)
 *   8:   jump (1 frame, reused for fall)
 */
export function getPlayerAnimationDefs(textureKey: string): AnimationDef[] {
	return [
		{ key: 'player-idle', textureKey, startFrame: 0, endFrame: 3, frameRate: 8, repeat: -1 },
		{ key: 'player-run', textureKey, startFrame: 4, endFrame: 7, frameRate: 10, repeat: -1 },
		{ key: 'player-jump', textureKey, startFrame: 8, endFrame: 8, frameRate: 10, repeat: 0 },
		{ key: 'player-fall', textureKey, startFrame: 8, endFrame: 8, frameRate: 10, repeat: 0 },
	];
}

/** Get the animation key that should play for a given player state. */
export function getAnimKeyForState(state: PlayerState): string {
	return STATE_TO_ANIM[state];
}
