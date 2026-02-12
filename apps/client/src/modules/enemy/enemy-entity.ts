import type { Facing } from '@wds/shared';
import {
	createPatrolState,
	type PatrolConfig,
	type PatrolState,
	updatePatrol,
} from './behaviors/patrol-behavior.js';

export interface EnemyConfig {
	readonly damage: number;
	readonly health: number;
	readonly speed: number;
	readonly patrolLeftBound: number;
	readonly patrolRightBound: number;
}

export interface EnemyIntent {
	readonly velocityX: number;
	readonly facing: Facing;
}

export interface EnemySnapshot {
	readonly facing: Facing;
	readonly health: number;
	readonly isAlive: boolean;
	readonly damage: number;
}

export class EnemyEntity {
	private _health: number;
	private _isAlive: boolean;
	private _facing: Facing = 'left';
	private readonly _damage: number;
	private readonly patrolConfig: PatrolConfig;
	private readonly patrolState: PatrolState;

	constructor(config: EnemyConfig) {
		this._health = config.health;
		this._isAlive = true;
		this._damage = config.damage;
		this.patrolConfig = {
			leftBound: config.patrolLeftBound,
			rightBound: config.patrolRightBound,
			speed: config.speed,
		};
		this.patrolState = createPatrolState();
	}

	update(currentX: number): EnemyIntent {
		if (!this._isAlive) {
			return { velocityX: 0, facing: this._facing };
		}

		const intent = updatePatrol(currentX, this.patrolState, this.patrolConfig);
		this._facing = intent.facing;
		return intent;
	}

	takeDamage(amount: number): void {
		if (!this._isAlive || amount <= 0) return;
		this._health = Math.max(0, this._health - amount);
		if (this._health <= 0) {
			this._isAlive = false;
		}
	}

	snapshot(): EnemySnapshot {
		return {
			facing: this._facing,
			health: this._health,
			isAlive: this._isAlive,
			damage: this._damage,
		};
	}
}
