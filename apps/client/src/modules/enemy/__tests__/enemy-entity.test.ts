import { describe, expect, it } from 'vitest';
import type { EnemyConfig } from '../enemy-entity.js';
import { EnemyEntity } from '../enemy-entity.js';

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

describe('EnemyEntity', () => {
	it('starts alive with configured health', () => {
		const entity = new EnemyEntity(makeConfig());
		const snap = entity.snapshot();
		expect(snap.isAlive).toBe(true);
		expect(snap.health).toBe(50);
		expect(snap.damage).toBe(20);
	});

	it('returns patrol intent from update', () => {
		const entity = new EnemyEntity(makeConfig());
		const intent = entity.update(200);
		expect(intent.velocityX).toBe(-60);
		expect(intent.facing).toBe('left');
	});

	it('reverses at patrol bounds', () => {
		const entity = new EnemyEntity(makeConfig());
		const intent = entity.update(100);
		expect(intent.velocityX).toBe(60);
		expect(intent.facing).toBe('right');
	});

	it('returns zero velocity when dead', () => {
		const entity = new EnemyEntity(makeConfig({ health: 10 }));
		entity.takeDamage(10);
		const intent = entity.update(200);
		expect(intent.velocityX).toBe(0);
	});

	it('reduces health on takeDamage', () => {
		const entity = new EnemyEntity(makeConfig());
		entity.takeDamage(15);
		expect(entity.snapshot().health).toBe(35);
	});

	it('dies when health reaches zero', () => {
		const entity = new EnemyEntity(makeConfig({ health: 20 }));
		entity.takeDamage(20);
		expect(entity.snapshot().isAlive).toBe(false);
		expect(entity.snapshot().health).toBe(0);
	});

	it('does not take negative damage', () => {
		const entity = new EnemyEntity(makeConfig());
		entity.takeDamage(-10);
		expect(entity.snapshot().health).toBe(50);
	});

	it('ignores damage after death', () => {
		const entity = new EnemyEntity(makeConfig({ health: 10 }));
		entity.takeDamage(10);
		entity.takeDamage(10);
		expect(entity.snapshot().health).toBe(0);
	});
});
