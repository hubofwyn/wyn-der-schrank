import type { SessionSaveData } from '@hub-of-wyn/shared';

/**
 * Format a human-readable progress summary from session save data.
 * Returns null when no levels have been completed (new player).
 */
export function progressSummary(data: SessionSaveData): string | null {
	const levelCount = Object.keys(data.levels).length;
	if (levelCount === 0) return null;
	const levelWord = levelCount === 1 ? 'level' : 'levels';
	const starWord = data.totalStars === 1 ? 'star' : 'stars';
	return `${data.totalStars} ${starWord} · ${levelCount} ${levelWord} completed`;
}
