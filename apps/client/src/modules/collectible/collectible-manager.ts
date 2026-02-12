export interface CollectiblePosition {
	readonly x: number;
	readonly y: number;
}

export interface CollectResult {
	readonly collected: boolean;
	readonly coinCount: number;
}

const DEFAULT_COIN_COUNT = 1;

export class CollectibleManager {
	private collected: boolean[] = [];
	private _count = 0;

	get total(): number {
		return this.collected.length;
	}

	get collectedCount(): number {
		return this._count;
	}

	get allCollected(): boolean {
		return this._count === this.collected.length && this.collected.length > 0;
	}

	init(positions: ReadonlyArray<CollectiblePosition>): void {
		this.collected = new Array(positions.length).fill(false);
		this._count = 0;
	}

	collect(index: number): CollectResult {
		if (index < 0 || index >= this.collected.length) {
			return { collected: false, coinCount: 0 };
		}

		if (this.collected[index]) {
			return { collected: false, coinCount: 0 };
		}

		this.collected[index] = true;
		this._count++;
		return { collected: true, coinCount: DEFAULT_COIN_COUNT };
	}

	isCollected(index: number): boolean {
		if (index < 0 || index >= this.collected.length) return false;
		return this.collected[index] === true;
	}

	reset(): void {
		this.collected = [];
		this._count = 0;
	}
}
