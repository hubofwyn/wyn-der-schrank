import { type EnemyConfig, EnemyEntity, type EnemyIntent } from './enemy-entity.js';

export class EnemyManager {
	private entities: EnemyEntity[] = [];

	get count(): number {
		return this.entities.length;
	}

	init(configs: ReadonlyArray<EnemyConfig>): void {
		this.entities = configs.map((cfg) => new EnemyEntity(cfg));
	}

	updateAll(positions: ReadonlyArray<{ x: number }>): ReadonlyArray<EnemyIntent> {
		return this.entities.map((entity, i) => {
			const pos = positions[i];
			return entity.update(pos ? pos.x : 0);
		});
	}

	getEnemy(index: number): EnemyEntity | undefined {
		return this.entities[index];
	}

	reset(): void {
		this.entities = [];
	}
}
