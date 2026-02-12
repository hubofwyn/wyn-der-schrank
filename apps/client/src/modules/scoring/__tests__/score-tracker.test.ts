import { describe, expect, it } from 'vitest';
import type { StarThresholds } from '../score-tracker.js';
import { ScoreTracker } from '../score-tracker.js';

describe('ScoreTracker', () => {
	const thresholds: StarThresholds = {
		oneStar: 50,
		twoStar: 100,
		threeStar: 200,
	};

	it('starts with zero coins and score', () => {
		const tracker = new ScoreTracker();
		expect(tracker.coins).toBe(0);
		expect(tracker.score).toBe(0);
	});

	it('accumulates coins and score', () => {
		const tracker = new ScoreTracker();
		tracker.addCoins(3);
		expect(tracker.coins).toBe(3);
		expect(tracker.score).toBe(30);
	});

	it('accumulates across multiple addCoins calls', () => {
		const tracker = new ScoreTracker();
		tracker.addCoins(2);
		tracker.addCoins(5);
		expect(tracker.coins).toBe(7);
		expect(tracker.score).toBe(70);
	});

	it('ignores zero or negative coin amounts', () => {
		const tracker = new ScoreTracker();
		tracker.addCoins(0);
		tracker.addCoins(-3);
		expect(tracker.coins).toBe(0);
		expect(tracker.score).toBe(0);
	});

	it('calculates time bonus that decays over time', () => {
		const tracker = new ScoreTracker();
		expect(tracker.calculateTimeBonus(0)).toBe(500);
		expect(tracker.calculateTimeBonus(10_000)).toBe(450);
		expect(tracker.calculateTimeBonus(100_000)).toBe(0);
	});

	it('clamps time bonus at zero for very long times', () => {
		const tracker = new ScoreTracker();
		expect(tracker.calculateTimeBonus(200_000)).toBe(0);
	});

	it('handles negative time gracefully', () => {
		const tracker = new ScoreTracker();
		expect(tracker.calculateTimeBonus(-1000)).toBe(500);
	});

	it('calculates final score with time bonus', () => {
		const tracker = new ScoreTracker();
		tracker.addCoins(5);
		expect(tracker.finalScore(0)).toBe(550);
		expect(tracker.finalScore(10_000)).toBe(500);
	});

	it('calculates star rating from thresholds', () => {
		const tracker = new ScoreTracker();
		expect(tracker.calculateStarRating(0, thresholds)).toBe(0);
		expect(tracker.calculateStarRating(49, thresholds)).toBe(0);
		expect(tracker.calculateStarRating(50, thresholds)).toBe(1);
		expect(tracker.calculateStarRating(99, thresholds)).toBe(1);
		expect(tracker.calculateStarRating(100, thresholds)).toBe(2);
		expect(tracker.calculateStarRating(199, thresholds)).toBe(2);
		expect(tracker.calculateStarRating(200, thresholds)).toBe(3);
		expect(tracker.calculateStarRating(999, thresholds)).toBe(3);
	});

	it('resets coins and score to zero', () => {
		const tracker = new ScoreTracker();
		tracker.addCoins(10);
		tracker.reset();
		expect(tracker.coins).toBe(0);
		expect(tracker.score).toBe(0);
	});
});
