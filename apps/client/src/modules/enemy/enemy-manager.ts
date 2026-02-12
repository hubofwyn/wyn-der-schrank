import type { IDiagnostics } from '../../core/ports/diagnostics.js';
import { type EnemyConfig, EnemyEntity, type EnemyIntent } from './enemy-entity.js';

/** Module-local noop — avoids importing core/adapters/ (zone rule). */
const NOOP_DIAGNOSTICS: IDiagnostics = {
	emit() {},
	isEnabled() {
		return false;
	},
	query() {
		return [];
	},
};

export class EnemyManager {
	private entities: EnemyEntity[] = [];
	private readonly diagnostics: IDiagnostics;

	constructor(diagnostics?: IDiagnostics) {
		this.diagnostics = diagnostics ?? NOOP_DIAGNOSTICS;
	}

	get count(): number {
		return this.entities.length;
	}

	init(configs: ReadonlyArray<EnemyConfig>): void {
		this.entities = configs.map((cfg) => new EnemyEntity(cfg, this.diagnostics));
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
