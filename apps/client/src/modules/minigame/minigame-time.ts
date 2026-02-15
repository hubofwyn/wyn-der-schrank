export const MINIGAME_MAX_DELTA_MS = 50; // 20 FPS floor

export function clampDelta(deltaMs: number): number {
	return Math.min(Math.max(0, deltaMs), MINIGAME_MAX_DELTA_MS);
}
