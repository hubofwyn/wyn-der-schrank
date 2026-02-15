import { describe, expect, it } from 'vitest';
import { COIN_CATCH } from '../coin-catch-config.js';
import { calculateCatchScore, getBasePoints, getCatchMessage } from '../scoring.js';

describe('CoinCatch Scoring', () => {
	describe('getBasePoints', () => {
		it('returns POINTS_COIN for coin', () => {
			expect(getBasePoints('coin')).toBe(COIN_CATCH.POINTS_COIN);
		});

		it('returns POINTS_GOLD for gold-coin', () => {
			expect(getBasePoints('gold-coin')).toBe(COIN_CATCH.POINTS_GOLD);
		});

		it('returns 0 for bomb', () => {
			expect(getBasePoints('bomb')).toBe(0);
		});
	});

	describe('calculateCatchScore', () => {
		it('returns base score with no combo and speed 1.0', () => {
			const result = calculateCatchScore('coin', 0, 1.0);
			expect(result.base).toBe(100);
			expect(result.comboBonus).toBe(0);
			expect(result.speedBonus).toBe(0);
			expect(result.total).toBe(100);
		});

		it('applies combo bonus', () => {
			const result = calculateCatchScore('coin', 5, 1.0);
			// comboBonus = round(100 * 5 * 0.15) = 75
			expect(result.comboBonus).toBe(75);
			expect(result.total).toBe(175);
		});

		it('applies speed bonus', () => {
			const result = calculateCatchScore('coin', 0, 1.5);
			// speedBonus = round(100 * 0.5) = 50
			expect(result.speedBonus).toBe(50);
			expect(result.total).toBe(150);
		});

		it('applies both combo and speed bonuses', () => {
			const result = calculateCatchScore('gold-coin', 3, 1.3);
			// base=300, comboBonus=round(300*3*0.15)=135, speedBonus=round(300*0.3)=90
			expect(result.base).toBe(300);
			expect(result.comboBonus).toBe(135);
			expect(result.speedBonus).toBe(90);
			expect(result.total).toBe(525);
		});

		it('returns zero total for bomb', () => {
			const result = calculateCatchScore('bomb', 10, 2.0);
			expect(result.total).toBe(0);
		});
	});

	describe('getCatchMessage', () => {
		it('returns Nice! for combo 0', () => {
			expect(getCatchMessage(0)).toBe('Nice!');
		});

		it('returns Nice! for combo 2', () => {
			expect(getCatchMessage(2)).toBe('Nice!');
		});

		it('returns Great! for combo 3', () => {
			expect(getCatchMessage(3)).toBe('Great! x3');
		});

		it('returns Amazing! for combo 5', () => {
			expect(getCatchMessage(5)).toBe('Amazing! x5');
		});

		it('returns LEGENDARY! for combo 10', () => {
			expect(getCatchMessage(10)).toBe('LEGENDARY! x10');
		});

		it('returns LEGENDARY! for combo 15', () => {
			expect(getCatchMessage(15)).toBe('LEGENDARY! x15');
		});
	});
});
