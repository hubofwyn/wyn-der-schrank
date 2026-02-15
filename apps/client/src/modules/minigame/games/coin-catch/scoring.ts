import type { FallingKind } from './coin-catch-config.js';
import { COIN_CATCH } from './coin-catch-config.js';

export interface CoinCatchScoreBreakdown {
	readonly base: number;
	readonly comboBonus: number;
	readonly speedBonus: number;
	readonly total: number;
}

export function getBasePoints(kind: FallingKind): number {
	switch (kind) {
		case 'coin':
			return COIN_CATCH.POINTS_COIN;
		case 'gold-coin':
			return COIN_CATCH.POINTS_GOLD;
		case 'bomb':
			return 0;
	}
}

export function calculateCatchScore(
	kind: FallingKind,
	combo: number,
	speedMultiplier: number,
): CoinCatchScoreBreakdown {
	const base = getBasePoints(kind);
	const comboBonus = Math.round(base * combo * COIN_CATCH.COMBO_MULTIPLIER);
	const speedBonus = Math.round(base * (speedMultiplier - 1.0));
	const total = base + comboBonus + speedBonus;
	return { base, comboBonus, speedBonus, total };
}

export function getCatchMessage(combo: number): string {
	if (combo >= 10) return `LEGENDARY! x${combo}`;
	if (combo >= 5) return `Amazing! x${combo}`;
	if (combo >= 3) return `Great! x${combo}`;
	return 'Nice!';
}
