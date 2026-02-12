import { describe, expect, it } from 'vitest';
import type { EnemyConfig } from '../enemy-entity.js';
import { EnemyManager } from '../enemy-manager.js';

function makeConfig(overrides?: Partial<EnemyConfig>): EnemyConfig {
	return {
		damage: 20,
		health: 50,
		speed: 60,
		patrolLeftBound: 100,
		patrolRightBound: 300,
		...overrides,
	};
}

describe('EnemyManager', () => {
	it('starts with zero count', () => {
		const manager = new EnemyManager();
		expect(manager.count).toBe(0);
	});

	it('initializes entities from configs', () => {
		const manager = new EnemyManager();
		manager.init([makeConfig(), makeConfig()]);
		expect(manager.count).toBe(2);
	});

	it('returns intents for all enemies from updateAll', () => {
		const manager = new EnemyManager();
		manager.init([makeConfig(), makeConfig()]);
		const intents = manager.updateAll([{ x: 200 }, { x: 200 }]);
		expect(intents).toHaveLength(2);
		expect(intents[0]!.velocityX).toBe(-60);
	});

	it('returns entity by index via getEnemy', () => {
		const manager = new EnemyManager();
		manager.init([makeConfig()]);
		const enemy = manager.getEnemy(0);
		expect(enemy).toBeDefined();
		expect(enemy!.snapshot().isAlive).toBe(true);
	});

	it('returns undefined for out-of-range index', () => {
		const manager = new EnemyManager();
		manager.init([makeConfig()]);
		expect(manager.getEnemy(5)).toBeUndefined();
	});

	it('clears all entities on reset', () => {
		const manager = new EnemyManager();
		manager.init([makeConfig()]);
		manager.reset();
		expect(manager.count).toBe(0);
	});
});
