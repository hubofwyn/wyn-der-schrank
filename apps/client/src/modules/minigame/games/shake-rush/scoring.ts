import { SHAKE_RUSH } from './shake-rush-config.js';

export type DeliveryQuality = 'perfect' | 'good' | 'normal';

export interface ScoreBreakdown {
	readonly base: number;
	readonly timeBonus: number;
	readonly comboBonus: number;
	readonly speedBonus: number;
	readonly total: number;
	readonly quality: DeliveryQuality;
}

export function getDeliveryQuality(timeCarriedMs: number): DeliveryQuality {
	if (timeCarriedMs <= SHAKE_RUSH.PERFECT_TIME_MS) return 'perfect';
	if (timeCarriedMs <= SHAKE_RUSH.GOOD_TIME_MS) return 'good';
	return 'normal';
}

export function calculateDeliveryScore(
	basePoints: number,
	timeCarriedMs: number,
	combo: number,
	speedMultiplier: number,
): ScoreBreakdown {
	const quality = getDeliveryQuality(timeCarriedMs);

	let timeBonus = 0;
	if (quality === 'perfect') timeBonus = Math.round(basePoints * 0.5);
	else if (quality === 'good') timeBonus = Math.round(basePoints * 0.25);

	const comboBonus = Math.round(basePoints * combo * 0.1);
	const speedBonus = Math.round(basePoints * (speedMultiplier - 1.0) * 2);

	const total = basePoints + timeBonus + comboBonus + speedBonus;

	return { base: basePoints, timeBonus, comboBonus, speedBonus, total, quality };
}

export function getBasePoints(carrying: 'protein' | 'special'): number {
	return carrying === 'special' ? SHAKE_RUSH.POINTS_SPECIAL : SHAKE_RUSH.POINTS_PROTEIN;
}
