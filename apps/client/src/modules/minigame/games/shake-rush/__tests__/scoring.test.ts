import { describe, expect, it } from 'vitest';
import { calculateDeliveryScore, getBasePoints, getDeliveryQuality } from '../scoring.js';
import { SHAKE_RUSH } from '../shake-rush-config.js';

describe('scoring', () => {
	it('getDeliveryQuality returns perfect for time <= PERFECT_TIME_MS', () => {
		expect(getDeliveryQuality(0)).toBe('perfect');
		expect(getDeliveryQuality(SHAKE_RUSH.PERFECT_TIME_MS)).toBe('perfect');
	});

	it('getDeliveryQuality returns good for time <= GOOD_TIME_MS', () => {
		expect(getDeliveryQuality(SHAKE_RUSH.PERFECT_TIME_MS + 1)).toBe('good');
		expect(getDeliveryQuality(SHAKE_RUSH.GOOD_TIME_MS)).toBe('good');
	});

	it('getDeliveryQuality returns normal for time > GOOD_TIME_MS', () => {
		expect(getDeliveryQuality(SHAKE_RUSH.GOOD_TIME_MS + 1)).toBe('normal');
		expect(getDeliveryQuality(10_000)).toBe('normal');
	});

	it('calculateDeliveryScore includes time bonus for perfect delivery', () => {
		const result = calculateDeliveryScore(100, 1000, 0, 1.0);

		expect(result.quality).toBe('perfect');
		expect(result.base).toBe(100);
		expect(result.timeBonus).toBe(50); // 100 * 0.5
		expect(result.comboBonus).toBe(0);
		expect(result.speedBonus).toBe(0);
		expect(result.total).toBe(150);
	});

	it('calculateDeliveryScore includes combo bonus', () => {
		const result = calculateDeliveryScore(100, 1000, 3, 1.0);

		expect(result.comboBonus).toBe(30); // 100 * 3 * 0.1
		expect(result.total).toBe(100 + 50 + 30 + 0); // base + timeBonus + comboBonus + speedBonus
	});

	it('calculateDeliveryScore includes speed bonus', () => {
		const result = calculateDeliveryScore(100, 6000, 0, 1.5);

		expect(result.quality).toBe('normal');
		expect(result.timeBonus).toBe(0);
		expect(result.speedBonus).toBe(100); // 100 * (1.5 - 1.0) * 2
		expect(result.total).toBe(200);
	});

	it('getBasePoints returns correct values for protein and special', () => {
		expect(getBasePoints('protein')).toBe(SHAKE_RUSH.POINTS_PROTEIN);
		expect(getBasePoints('special')).toBe(SHAKE_RUSH.POINTS_SPECIAL);
	});
});
