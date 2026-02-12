export interface StarThresholds {
	readonly oneStar: number;
	readonly twoStar: number;
	readonly threeStar: number;
}

export type StarRating = 0 | 1 | 2 | 3;

const COIN_VALUE = 10;
const TIME_BONUS_MAX = 500;
const TIME_BONUS_DECAY_PER_SECOND = 5;

export class ScoreTracker {
	private _coins = 0;
	private _score = 0;

	get coins(): number {
		return this._coins;
	}

	get score(): number {
		return this._score;
	}

	addCoins(count: number): void {
		if (count <= 0) return;
		this._coins += count;
		this._score += count * COIN_VALUE;
	}

	calculateTimeBonus(timeElapsedMs: number): number {
		const seconds = Math.max(0, timeElapsedMs) / 1000;
		const bonus = Math.max(0, TIME_BONUS_MAX - seconds * TIME_BONUS_DECAY_PER_SECOND);
		return Math.floor(bonus);
	}

	finalScore(timeElapsedMs: number): number {
		return this._score + this.calculateTimeBonus(timeElapsedMs);
	}

	calculateStarRating(finalScore: number, thresholds: StarThresholds): StarRating {
		if (finalScore >= thresholds.threeStar) return 3;
		if (finalScore >= thresholds.twoStar) return 2;
		if (finalScore >= thresholds.oneStar) return 1;
		return 0;
	}

	reset(): void {
		this._coins = 0;
		this._score = 0;
	}
}
