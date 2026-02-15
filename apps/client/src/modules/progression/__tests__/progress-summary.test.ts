import type { SessionSaveData } from '@hub-of-wyn/shared';
import { describe, expect, it } from 'vitest';
import { progressSummary } from '../progress-summary.js';

describe('progressSummary', () => {
	it('returns null for new player with no completions', () => {
		const data: SessionSaveData = {
			levels: {},
			totalCoins: 0,
			totalStars: 0,
			savedAt: 0,
		};
		expect(progressSummary(data)).toBeNull();
	});

	it('returns singular form for one level and one star', () => {
		const data: SessionSaveData = {
			levels: {
				'forest-1': { score: 100, stars: 1, coins: 5, time: 30000, completedAt: 1 },
			},
			totalCoins: 5,
			totalStars: 1,
			savedAt: 1,
		};
		expect(progressSummary(data)).toBe('1 star · 1 level completed');
	});

	it('returns plural form for multiple levels and stars', () => {
		const data: SessionSaveData = {
			levels: {
				'forest-1': { score: 100, stars: 2, coins: 5, time: 30000, completedAt: 1 },
				'forest-2': { score: 200, stars: 3, coins: 10, time: 45000, completedAt: 2 },
			},
			totalCoins: 15,
			totalStars: 5,
			savedAt: 2,
		};
		expect(progressSummary(data)).toBe('5 stars · 2 levels completed');
	});

	it('handles zero stars with completed levels', () => {
		const data: SessionSaveData = {
			levels: {
				'forest-1': { score: 0, stars: 0, coins: 0, time: 99000, completedAt: 1 },
			},
			totalCoins: 0,
			totalStars: 0,
			savedAt: 1,
		};
		expect(progressSummary(data)).toBe('0 stars · 1 level completed');
	});
});
