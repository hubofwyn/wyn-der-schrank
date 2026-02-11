import type { CharacterStats, PlatformerConfig } from '@wds/shared';
import { vi } from 'vitest';
import type { IGameClock } from '../../core/ports/engine.js';
import type { ActionKey, IInputProvider } from '../../core/ports/input.js';
import type { BlockedState, IBody } from '../../core/ports/physics.js';

/**
 * Shared mock factories for module tests.
 *
 * Every module test uses these instead of creating ad-hoc mocks.
 * Keeps test setup consistent and documents the contract.
 */

export function createMockClock(delta = 16.67): IGameClock {
	return { now: 0, delta, frame: 0, elapsed: 0 };
}

export interface MockInput extends IInputProvider {
	_pressed: Set<ActionKey>;
	_justPressed: Set<ActionKey>;
	_justReleased: Set<ActionKey>;
}

export function createMockInput(): MockInput {
	const pressed = new Set<ActionKey>();
	const justPressed = new Set<ActionKey>();
	const justReleased = new Set<ActionKey>();

	return {
		_pressed: pressed,
		_justPressed: justPressed,
		_justReleased: justReleased,
		update: vi.fn(),
		isDown: (action: ActionKey) => pressed.has(action),
		justPressed: (action: ActionKey) => justPressed.has(action),
		justReleased: (action: ActionKey) => justReleased.has(action),
		getAxis: (axis: 'horizontal' | 'vertical') => {
			if (axis === 'horizontal') {
				return (pressed.has('left') ? -1 : 0) + (pressed.has('right') ? 1 : 0);
			}
			return 0;
		},
		isTouchActive: false,
		isGamepadConnected: false,
		getBinding: () => '',
		setBinding: vi.fn(),
		resetBindings: vi.fn(),
	};
}

export interface MockBody extends IBody {
	_velocity: { x: number; y: number };
	_position: { x: number; y: number };
	_blocked: { up: boolean; down: boolean; left: boolean; right: boolean };
	_gravityY: number;
	_enabled: boolean;
}

export function createMockBody(options?: { grounded?: boolean; x?: number; y?: number }): MockBody {
	const state = {
		_velocity: { x: 0, y: 0 },
		_position: { x: options?.x ?? 100, y: options?.y ?? 100 },
		_blocked: {
			up: false,
			down: options?.grounded ?? true,
			left: false,
			right: false,
		},
		_gravityY: 0,
		_enabled: true,
	};

	return {
		_velocity: state._velocity,
		_position: state._position,
		_blocked: state._blocked,
		get _gravityY() {
			return state._gravityY;
		},
		set _gravityY(v: number) {
			state._gravityY = v;
		},
		get _enabled() {
			return state._enabled;
		},
		set _enabled(v: boolean) {
			state._enabled = v;
		},
		id: 'mock-body',
		get position() {
			return { x: state._position.x, y: state._position.y };
		},
		get velocity() {
			return { x: state._velocity.x, y: state._velocity.y };
		},
		get isOnGround() {
			return state._blocked.down;
		},
		get isTouchingWall() {
			return state._blocked.left || state._blocked.right;
		},
		get isTouchingCeiling() {
			return state._blocked.up;
		},
		get blocked(): Readonly<BlockedState> {
			return { ...state._blocked };
		},
		get enable() {
			return state._enabled;
		},
		get width() {
			return 24;
		},
		get height() {
			return 40;
		},
		setVelocity(x: number, y: number) {
			state._velocity.x = x;
			state._velocity.y = y;
		},
		setVelocityX(x: number) {
			state._velocity.x = x;
		},
		setVelocityY(y: number) {
			state._velocity.y = y;
		},
		setAcceleration: vi.fn(),
		setAccelerationX: vi.fn(),
		setGravityY(y: number) {
			state._gravityY = y;
		},
		setDrag: vi.fn(),
		setMaxVelocity: vi.fn(),
		setBounce: vi.fn(),
		setSize: vi.fn(),
		setOffset: vi.fn(),
		setEnable(enabled: boolean) {
			state._enabled = enabled;
		},
	};
}

export function createDefaultConfig(): PlatformerConfig {
	return {
		gravity: { x: 0, y: 800 },
		movement: {
			walkSpeed: 250,
			airControlFactor: 0.85,
			groundAcceleration: 1200,
			airAcceleration: 600,
			groundDeceleration: 1500,
			airDeceleration: 200,
			maxFallSpeed: 600,
		},
		jump: {
			jumpVelocity: -420,
			jumpCutMultiplier: 0.4,
			coyoteTimeMs: 120,
			jumpBufferMs: 100,
			maxJumps: 2,
			doubleJumpVelocity: -360,
		},
		fastFall: { multiplier: 1.5, threshold: 0 },
		body: { width: 24, height: 40, offsetX: 4, offsetY: 8 },
	};
}

export function createDefaultStats(): CharacterStats {
	return {
		maxHealth: 100,
		speed: 250,
		jumpForce: 420,
		attackPower: 10,
		defense: 5,
	};
}
