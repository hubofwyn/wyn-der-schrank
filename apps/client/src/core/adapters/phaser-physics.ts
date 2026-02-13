import type { Vec2 } from '@hub-of-wyn/shared';
import type {
	BlockedState,
	BodyConfig,
	IBody,
	IPhysicsWorld,
	RaycastHit,
} from '../ports/physics.js';

let bodyIdCounter = 0;

/**
 * Wraps a Phaser.Physics.Arcade.Body into the IBody port interface.
 *
 * This is the ONLY class that touches Phaser physics types directly.
 * Modules interact exclusively through IBody.
 */
export class PhaserBody implements IBody {
	readonly id: string;
	private body: Phaser.Physics.Arcade.Body;

	constructor(body: Phaser.Physics.Arcade.Body) {
		this.id = `body-${++bodyIdCounter}`;
		this.body = body;
	}

	get position(): Readonly<Vec2> {
		return { x: this.body.position.x, y: this.body.position.y };
	}

	get velocity(): Readonly<Vec2> {
		return { x: this.body.velocity.x, y: this.body.velocity.y };
	}

	get isOnGround(): boolean {
		return this.body.blocked.down;
	}

	get isTouchingWall(): boolean {
		return this.body.blocked.left || this.body.blocked.right;
	}

	get isTouchingCeiling(): boolean {
		return this.body.blocked.up;
	}

	get blocked(): Readonly<BlockedState> {
		return {
			up: this.body.blocked.up,
			down: this.body.blocked.down,
			left: this.body.blocked.left,
			right: this.body.blocked.right,
		};
	}

	get enable(): boolean {
		return this.body.enable;
	}

	get width(): number {
		return this.body.width;
	}

	get height(): number {
		return this.body.height;
	}

	setVelocity(x: number, y: number): void {
		this.body.setVelocity(x, y);
	}

	setVelocityX(x: number): void {
		this.body.setVelocityX(x);
	}

	setVelocityY(y: number): void {
		this.body.setVelocityY(y);
	}

	setAcceleration(x: number, y: number): void {
		this.body.setAcceleration(x, y);
	}

	setAccelerationX(x: number): void {
		this.body.setAccelerationX(x);
	}

	setGravityY(y: number): void {
		this.body.setGravityY(y);
	}

	setDrag(x: number, y?: number): void {
		this.body.setDrag(x, y ?? x);
	}

	setMaxVelocity(x: number, y?: number): void {
		this.body.setMaxVelocity(x, y ?? x);
	}

	setBounce(x: number, y?: number): void {
		this.body.setBounce(x, y ?? x);
	}

	setSize(width: number, height: number): void {
		this.body.setSize(width, height);
	}

	setOffset(x: number, y: number): void {
		this.body.setOffset(x, y);
	}

	setEnable(enabled: boolean): void {
		this.body.enable = enabled;
	}

	/** Expose the underlying Phaser body for adapter-level operations only. */
	get _phaserBody(): Phaser.Physics.Arcade.Body {
		return this.body;
	}
}

/**
 * Wraps Phaser 4 Arcade Physics World into the IPhysicsWorld port interface.
 *
 * Configured with fixedStep: true for deterministic simulation.
 * The scene's physics config should set: { arcade: { gravity: { y }, fixedStep: true, fps: 60 } }
 */
export class PhaserPhysics implements IPhysicsWorld {
	private scene: Phaser.Scene;
	private world: Phaser.Physics.Arcade.World;
	private bodies: Set<PhaserBody> = new Set();

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.world = scene.physics.world;
	}

	createBody(config: BodyConfig): IBody {
		// Create an invisible zone as the physics host object
		const zone = this.scene.add.zone(config.x, config.y, config.width, config.height);
		this.scene.physics.add.existing(zone, config.isStatic ?? false);

		const arcadeBody = zone.body as Phaser.Physics.Arcade.Body;
		arcadeBody.setSize(config.width, config.height);

		if (config.offsetX !== undefined || config.offsetY !== undefined) {
			arcadeBody.setOffset(config.offsetX ?? 0, config.offsetY ?? 0);
		}
		if (config.maxVelocityX !== undefined || config.maxVelocityY !== undefined) {
			arcadeBody.setMaxVelocity(config.maxVelocityX ?? 10000, config.maxVelocityY ?? 10000);
		}
		if (config.gravityY !== undefined) {
			arcadeBody.setGravityY(config.gravityY);
		}
		if (config.bounce !== undefined) {
			arcadeBody.setBounce(config.bounce, config.bounce);
		}
		if (config.drag !== undefined) {
			arcadeBody.setDrag(config.drag, 0);
		}
		if (config.mass !== undefined) {
			arcadeBody.setMass(config.mass);
		}

		const wrapper = new PhaserBody(arcadeBody);
		this.bodies.add(wrapper);
		return wrapper;
	}

	removeBody(body: IBody): void {
		const pb = body as PhaserBody;
		this.bodies.delete(pb);
		const arcadeBody = pb._phaserBody;
		if (arcadeBody.gameObject) {
			arcadeBody.gameObject.destroy();
		}
	}

	overlap(a: IBody, b: IBody): boolean {
		const bodyA = (a as PhaserBody)._phaserBody;
		const bodyB = (b as PhaserBody)._phaserBody;
		if (!bodyA.gameObject || !bodyB.gameObject) return false;
		return this.scene.physics.overlap(bodyA.gameObject, bodyB.gameObject) ?? false;
	}

	overlapGroup(body: IBody, group: IBody[]): IBody[] {
		const results: IBody[] = [];
		for (const other of group) {
			if (this.overlap(body, other)) {
				results.push(other);
			}
		}
		return results;
	}

	collide(a: IBody, b: IBody): boolean {
		const bodyA = (a as PhaserBody)._phaserBody;
		const bodyB = (b as PhaserBody)._phaserBody;
		if (!bodyA.gameObject || !bodyB.gameObject) return false;
		return this.scene.physics.collide(bodyA.gameObject, bodyB.gameObject) ?? false;
	}

	raycast(_origin: Vec2, _direction: Vec2, _distance: number): RaycastHit | null {
		// Arcade Physics has limited raycast support.
		// Will be implemented when needed for line-of-sight or ground probes.
		return null;
	}

	setGravity(x: number, y: number): void {
		this.world.gravity.set(x, y);
	}

	get gravity(): Readonly<Vec2> {
		return { x: this.world.gravity.x, y: this.world.gravity.y };
	}

	get fixedStep(): boolean {
		return this.world.fixedStep;
	}

	get fps(): number {
		return this.world.fps;
	}
}
