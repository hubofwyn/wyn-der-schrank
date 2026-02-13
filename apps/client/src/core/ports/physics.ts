import type { Vec2 } from '@hub-of-wyn/shared';

export interface BodyConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	isStatic?: boolean;
	offsetX?: number;
	offsetY?: number;
	maxVelocityX?: number;
	maxVelocityY?: number;
	gravityY?: number;
	bounce?: number;
	drag?: number;
	mass?: number;
}

export interface BlockedState {
	readonly up: boolean;
	readonly down: boolean;
	readonly left: boolean;
	readonly right: boolean;
}

export interface RaycastHit {
	body: IBody;
	point: Vec2;
	normal: Vec2;
	distance: number;
}

export interface IPhysicsWorld {
	createBody(config: BodyConfig): IBody;
	removeBody(body: IBody): void;

	overlap(a: IBody, b: IBody): boolean;
	overlapGroup(body: IBody, group: IBody[]): IBody[];
	collide(a: IBody, b: IBody): boolean;

	raycast(origin: Vec2, direction: Vec2, distance: number): RaycastHit | null;

	setGravity(x: number, y: number): void;

	readonly gravity: Readonly<Vec2>;
	readonly fixedStep: boolean;
	readonly fps: number;
}

export interface IBody {
	readonly id: string;
	readonly position: Readonly<Vec2>;
	readonly velocity: Readonly<Vec2>;

	readonly isOnGround: boolean;
	readonly isTouchingWall: boolean;
	readonly isTouchingCeiling: boolean;
	readonly blocked: Readonly<BlockedState>;

	readonly enable: boolean;
	readonly width: number;
	readonly height: number;

	setVelocity(x: number, y: number): void;
	setVelocityX(x: number): void;
	setVelocityY(y: number): void;
	setAcceleration(x: number, y: number): void;
	setAccelerationX(x: number): void;
	setGravityY(y: number): void;
	setDrag(x: number, y?: number): void;
	setMaxVelocity(x: number, y?: number): void;
	setBounce(x: number, y?: number): void;
	setSize(width: number, height: number): void;
	setOffset(x: number, y: number): void;
	setEnable(enabled: boolean): void;
}
