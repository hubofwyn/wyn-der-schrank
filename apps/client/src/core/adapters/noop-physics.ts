import type { Vec2 } from '@hub-of-wyn/shared';
import type { BodyConfig, IBody, IPhysicsWorld, RaycastHit } from '../ports/physics.js';

/**
 * No-op physics adapter for the root container.
 * Satisfies the IPhysicsWorld port with inert methods.
 * PlatformerScene uses Phaser's Arcade physics directly
 * because physics bodies require a live scene.
 */
export class NoopPhysics implements IPhysicsWorld {
	readonly gravity: Readonly<Vec2> = { x: 0, y: 0 };
	readonly fixedStep: boolean = true;
	readonly fps: number = 60;

	createBody(_config: BodyConfig): IBody {
		throw new Error('NoopPhysics: use scene-scoped physics instead');
	}
	removeBody(_body: IBody): void {}
	overlap(_a: IBody, _b: IBody): boolean {
		return false;
	}
	overlapGroup(_body: IBody, _group: IBody[]): IBody[] {
		return [];
	}
	collide(_a: IBody, _b: IBody): boolean {
		return false;
	}
	raycast(_origin: Vec2, _direction: Vec2, _distance: number): RaycastHit | null {
		return null;
	}
	setGravity(_x: number, _y: number): void {}
}
