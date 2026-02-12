import type { Facing } from '@wds/shared';

export interface PatrolConfig {
	readonly leftBound: number;
	readonly rightBound: number;
	readonly speed: number;
}

export interface PatrolState {
	direction: 1 | -1;
}

export interface PatrolIntent {
	readonly velocityX: number;
	readonly facing: Facing;
}

export function createPatrolState(): PatrolState {
	return { direction: -1 };
}

export function updatePatrol(
	currentX: number,
	state: PatrolState,
	config: PatrolConfig,
): PatrolIntent {
	if (currentX <= config.leftBound) {
		state.direction = 1;
	} else if (currentX >= config.rightBound) {
		state.direction = -1;
	}

	const velocityX = config.speed * state.direction;
	const facing: Facing = state.direction < 0 ? 'left' : 'right';

	return { velocityX, facing };
}
