import { describe, expect, it } from 'vitest';
import type { DiagnosticEvent, IDiagnostics } from '../../../core/ports/diagnostics.js';
import type { EnemyConfig } from '../enemy-entity.js';
import { EnemyEntity } from '../enemy-entity.js';

function createSpyDiagnostics(): IDiagnostics & { events: DiagnosticEvent[] } {
	const events: DiagnosticEvent[] = [];
	return {
		events,
		isEnabled: () => true,
		emit: (channel, level, label, data) => {
			events.push({ frame: 0, timestamp: 0, channel, level, label, data });
		},
		query: (filter) => {
			let result = events;
			if (filter?.channel) result = result.filter((e) => e.channel === filter.channel);
			if (filter?.level) result = result.filter((e) => e.level === filter.level);
			if (filter?.last) result = result.slice(-filter.last);
			return result;
		},
	};
}

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

	describe('diagnostics', () => {
		it('emits damage event on takeDamage', () => {
			const spy = createSpyDiagnostics();
			const entity = new EnemyEntity(makeConfig(), spy);
			entity.takeDamage(15);

			const damageEvents = spy.events.filter((e) => e.label === 'damage');
			expect(damageEvents).toHaveLength(1);
			expect(damageEvents[0].channel).toBe('enemy');
			expect(damageEvents[0].level).toBe('state');
			expect(damageEvents[0].data).toEqual({ amount: 15, remainingHealth: 35 });
		});

		it('emits death event when health reaches zero', () => {
			const spy = createSpyDiagnostics();
			const entity = new EnemyEntity(makeConfig({ health: 20 }), spy);
			entity.takeDamage(20);

			const deathEvents = spy.events.filter((e) => e.label === 'death');
			expect(deathEvents).toHaveLength(1);
			expect(deathEvents[0].channel).toBe('enemy');
			expect(deathEvents[0].data).toEqual({ damage: 20 });
		});

		it('does not emit when no diagnostics provided', () => {
			// Default noop — no errors thrown, no events
			const entity = new EnemyEntity(makeConfig());
			entity.takeDamage(15);
			expect(entity.snapshot().health).toBe(35);
		});
	});
});
