import type { CharacterStats, PlatformerConfig } from '@hub-of-wyn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosticEvent, IDiagnostics } from '../../../core/ports/diagnostics.js';
import type { IGameClock } from '../../../core/ports/engine.js';
import type { ActionKey, IInputProvider } from '../../../core/ports/input.js';
import type { BlockedState, IBody } from '../../../core/ports/physics.js';
import { PlayerController } from '../player-controller.js';

// ── Mock Factories ──

function createMockClock(delta = 16.67): IGameClock {
	return {
		now: 0,
		delta,
		frame: 0,
		elapsed: 0,
	};
}

function createMutableMockClock(delta = 16.67): IGameClock & { _elapsed: number; _delta: number } {
	const state = { _elapsed: 0, _delta: delta };
	return {
		now: 0,
		get delta() {
			return state._delta;
		},
		frame: 0,
		get elapsed() {
			return state._elapsed;
		},
		get _elapsed() {
			return state._elapsed;
		},
		set _elapsed(v: number) {
			state._elapsed = v;
		},
		get _delta() {
			return state._delta;
		},
		set _delta(v: number) {
			state._delta = v;
		},
	};
}

function createMockInput(): IInputProvider & {
	_pressed: Set<ActionKey>;
	_justPressed: Set<ActionKey>;
	_justReleased: Set<ActionKey>;
} {
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
				const l = pressed.has('left') ? -1 : 0;
				const r = pressed.has('right') ? 1 : 0;
				return l + r;
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

function createMockBody(): IBody & {
	_velocity: { x: number; y: number };
	_position: { x: number; y: number };
	_blocked: { up: boolean; down: boolean; left: boolean; right: boolean };
	_gravityY: number;
	_enabled: boolean;
} {
	const state = {
		_velocity: { x: 0, y: 0 },
		_position: { x: 100, y: 100 },
		_blocked: { up: false, down: true, left: false, right: false },
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
		id: 'test-body',
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

function createDefaultConfig(): PlatformerConfig {
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
		fastFall: {
			multiplier: 1.5,
			threshold: 0,
		},
		body: {
			width: 24,
			height: 40,
			offsetX: 4,
			offsetY: 8,
		},
	};
}

function createDefaultStats(): CharacterStats {
	return {
		maxHealth: 100,
		speed: 250,
		jumpForce: 420,
		attackPower: 10,
		defense: 5,
	};
}

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

// ── Tests ──

describe('PlayerController', () => {
	let input: ReturnType<typeof createMockInput>;
	let body: ReturnType<typeof createMockBody>;
	let clock: IGameClock;
	let config: PlatformerConfig;
	let stats: CharacterStats;
	let controller: PlayerController;

	beforeEach(() => {
		input = createMockInput();
		body = createMockBody();
		clock = createMockClock();
		config = createDefaultConfig();
		stats = createDefaultStats();
		controller = new PlayerController({ input, body, clock, config, stats });
	});

	describe('initialization', () => {
		it('starts in idle state on ground', () => {
			const snap = controller.snapshot();
			expect(snap.state).toBe('idle');
			expect(snap.facing).toBe('right');
			expect(snap.health).toBe(100);
			expect(snap.maxHealth).toBe(100);
			expect(snap.isOnGround).toBe(true);
			expect(snap.jumpsRemaining).toBe(2);
		});
	});

	describe('horizontal movement', () => {
		it('moves right when right is held', () => {
			input._pressed.add('right');
			controller.update();
			expect(body._velocity.x).toBe(stats.speed);
		});

		it('moves left when left is held', () => {
			input._pressed.add('left');
			controller.update();
			expect(body._velocity.x).toBe(-stats.speed);
		});

		it('stops when no direction is held', () => {
			controller.update();
			expect(body._velocity.x).toBe(0);
		});

		it('updates facing to left when moving left', () => {
			input._pressed.add('left');
			controller.update();
			expect(controller.snapshot().facing).toBe('left');
		});

		it('updates facing to right when moving right', () => {
			input._pressed.add('left');
			controller.update();
			input._pressed.delete('left');
			input._pressed.add('right');
			controller.update();
			expect(controller.snapshot().facing).toBe('right');
		});

		it('applies air control factor when airborne', () => {
			body._blocked.down = false;
			input._pressed.add('right');
			controller.update();
			expect(body._velocity.x).toBe(stats.speed * config.movement.airControlFactor);
		});
	});

	describe('jump', () => {
		it('jumps when grounded and jump is pressed', () => {
			input._justPressed.add('jump');
			controller.update();
			expect(body._velocity.y).toBe(config.jump.jumpVelocity);
		});

		it('does not jump when not grounded and no jumps remaining', () => {
			body._blocked.down = false;
			// Exhaust all jumps: simulate being in air with 0 remaining
			// First update to sync wasOnGround
			controller.update();
			// Manually set jumps to 0 by jumping twice
			input._justPressed.add('jump');
			controller.update();
			input._justPressed.clear();
			input._justPressed.add('jump');
			controller.update();
			input._justPressed.clear();

			// Now should have 0 jumps remaining
			const velBefore = body._velocity.y;
			input._justPressed.add('jump');
			controller.update();
			// Velocity should not change (no jump)
			expect(body._velocity.y).toBe(velBefore);
		});

		it('allows double jump in air', () => {
			// First jump from ground
			input._justPressed.add('jump');
			controller.update();
			expect(body._velocity.y).toBe(config.jump.jumpVelocity);

			// Leave ground
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			// Double jump
			input._justPressed.add('jump');
			controller.update();
			expect(body._velocity.y).toBe(config.jump.doubleJumpVelocity);
		});

		it('decrements jumpsRemaining on each jump', () => {
			expect(controller.snapshot().jumpsRemaining).toBe(2);

			input._justPressed.add('jump');
			controller.update();
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			expect(controller.snapshot().jumpsRemaining).toBe(1);

			input._justPressed.add('jump');
			controller.update();
			input._justPressed.clear();
			controller.update();

			expect(controller.snapshot().jumpsRemaining).toBe(0);
		});

		it('resets jumpsRemaining on landing', () => {
			// Jump and go airborne
			input._justPressed.add('jump');
			controller.update();
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			// Double jump
			input._justPressed.add('jump');
			controller.update();
			input._justPressed.clear();
			controller.update();

			expect(controller.snapshot().jumpsRemaining).toBe(0);

			// Land
			body._blocked.down = true;
			controller.update();

			expect(controller.snapshot().jumpsRemaining).toBe(2);
		});
	});

	describe('jump cut (variable height)', () => {
		it('cuts jump velocity when jump is released while rising', () => {
			// Jump
			input._justPressed.add('jump');
			controller.update();
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			// Release while going up
			body._velocity.y = -300;
			input._justReleased.add('jump');
			controller.update();

			expect(body._velocity.y).toBe(-300 * config.jump.jumpCutMultiplier);
		});

		it('does not cut velocity when falling', () => {
			body._blocked.down = false;
			body._velocity.y = 100; // falling
			input._justReleased.add('jump');
			controller.update();

			// Velocity should remain positive (no cut applied)
			expect(body._velocity.y).toBeGreaterThanOrEqual(0);
		});
	});

	describe('coyote time', () => {
		it('allows jump shortly after leaving ground', () => {
			// Start grounded
			controller.update();

			// Leave ground (walked off edge)
			body._blocked.down = false;
			controller.update();

			// Jump within coyote time (< 120ms at 16.67ms/frame = ~7 frames)
			input._justPressed.add('jump');
			controller.update();

			expect(body._velocity.y).toBe(config.jump.jumpVelocity);
		});

		it('expires after configured duration', () => {
			// Start grounded
			controller.update();

			// Leave ground
			body._blocked.down = false;

			// Advance past coyote time (120ms / 16.67ms ≈ 8 frames)
			for (let i = 0; i < 10; i++) {
				controller.update();
			}

			// Should not be able to ground-jump anymore (but double jump still works)
			const jumpsBefore = controller.snapshot().jumpsRemaining;
			input._justPressed.add('jump');
			controller.update();

			// If coyote expired, this used an air jump (double jump velocity)
			if (jumpsBefore > 0) {
				expect(body._velocity.y).toBe(config.jump.doubleJumpVelocity);
			}
		});
	});

	describe('jump buffer', () => {
		it('auto-jumps on landing when jump was buffered', () => {
			// Use single-jump config so no air jumps are available
			config.jump.maxJumps = 1;
			controller = new PlayerController({ input, body, clock, config, stats });

			// Start grounded, jump
			input._justPressed.add('jump');
			controller.update();
			expect(body._velocity.y).toBe(config.jump.jumpVelocity);

			// Leave ground after jumping
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			// Now airborne with 0 jumps remaining, falling
			body._velocity.y = 100;
			controller.update();

			// Buffer jump input while falling (within 100ms window)
			input._justPressed.add('jump');
			controller.update();
			input._justPressed.clear();

			// Land within buffer window (< 100ms = ~6 frames at 16.67ms)
			body._blocked.down = true;
			body._velocity.y = 0;
			controller.update();

			// Should have auto-jumped on landing
			expect(body._velocity.y).toBe(config.jump.jumpVelocity);
		});
	});

	describe('fast fall', () => {
		it('increases gravity when holding down while airborne and falling', () => {
			body._blocked.down = false;
			body._velocity.y = 50; // falling

			input._pressed.add('down');
			controller.update();

			const expectedGravity = config.gravity.y * (config.fastFall.multiplier - 1);
			expect(body._gravityY).toBe(expectedGravity);
		});

		it('does not apply fast fall when grounded', () => {
			input._pressed.add('down');
			controller.update();

			expect(body._gravityY).toBe(0);
		});

		it('resets gravity when down is released', () => {
			body._blocked.down = false;
			body._velocity.y = 50;

			// Apply fast fall
			input._pressed.add('down');
			controller.update();
			expect(body._gravityY).toBeGreaterThan(0);

			// Release
			input._pressed.delete('down');
			controller.update();
			expect(body._gravityY).toBe(0);
		});
	});

	describe('state machine', () => {
		it('transitions to running when moving on ground', () => {
			input._pressed.add('right');
			controller.update();
			expect(controller.snapshot().state).toBe('running');
		});

		it('transitions to jumping when velocity is upward', () => {
			input._justPressed.add('jump');
			controller.update();
			body._blocked.down = false;
			controller.update();
			expect(controller.snapshot().state).toBe('jumping');
		});

		it('transitions to falling when velocity is downward and airborne', () => {
			body._blocked.down = false;
			body._velocity.y = 100;
			controller.update();
			expect(controller.snapshot().state).toBe('falling');
		});

		it('transitions to idle when stationary on ground', () => {
			controller.update();
			expect(controller.snapshot().state).toBe('idle');
		});

		it('transitions to dead when health reaches zero', () => {
			controller.takeDamage(100);
			controller.update();
			expect(controller.snapshot().state).toBe('dead');
		});

		it('does not transition from dead', () => {
			controller.takeDamage(100);
			controller.update();
			input._pressed.add('right');
			controller.update();
			expect(controller.snapshot().state).toBe('dead');
		});
	});

	describe('health', () => {
		it('reduces health on damage', () => {
			const result = controller.takeDamage(30);
			expect(controller.snapshot().health).toBe(70);
			expect(result.damaged).toBe(true);
			expect(result.newHealth).toBe(70);
			expect(result.isDead).toBe(false);
		});

		it('does not go below zero', () => {
			const result = controller.takeDamage(999);
			expect(controller.snapshot().health).toBe(0);
			expect(result.isDead).toBe(true);
		});

		it('heals up to max', () => {
			controller.takeDamage(50);
			controller.heal(999);
			expect(controller.snapshot().health).toBe(100);
		});
	});

	describe('invincibility', () => {
		it('blocks damage during invincibility window', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });

			ctrl.takeDamage(20);
			expect(ctrl.snapshot().health).toBe(80);

			// Still within invincibility window
			mClock._elapsed = 500;
			const result = ctrl.takeDamage(20);
			expect(result.damaged).toBe(false);
			expect(ctrl.snapshot().health).toBe(80);
		});

		it('allows damage after invincibility expires', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });

			ctrl.takeDamage(20);
			expect(ctrl.snapshot().health).toBe(80);

			// Past invincibility window (1500ms)
			mClock._elapsed = 2000;
			const result = ctrl.takeDamage(20);
			expect(result.damaged).toBe(true);
			expect(ctrl.snapshot().health).toBe(60);
		});

		it('reports isInvincible in snapshot', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });

			expect(ctrl.snapshot().isInvincible).toBe(false);
			ctrl.takeDamage(20);
			expect(ctrl.snapshot().isInvincible).toBe(true);

			mClock._elapsed = 2000;
			expect(ctrl.snapshot().isInvincible).toBe(false);
		});

		it('returns no-op result for zero damage', () => {
			const result = controller.takeDamage(0);
			expect(result.damaged).toBe(false);
			expect(result.newHealth).toBe(100);
		});

		it('returns no-op result for negative damage', () => {
			const result = controller.takeDamage(-5);
			expect(result.damaged).toBe(false);
			expect(result.newHealth).toBe(100);
		});

		it('returns already-dead result when health is zero', () => {
			controller.takeDamage(100);
			const mClock = createMutableMockClock();
			mClock._elapsed = 5000; // past invincibility
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });
			ctrl.takeDamage(100);
			mClock._elapsed = 10000;
			const result = ctrl.takeDamage(10);
			expect(result.damaged).toBe(false);
			expect(result.isDead).toBe(true);
		});
	});

	describe('hurt state', () => {
		it('transitions to hurt after taking damage', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });
			ctrl.takeDamage(20);
			ctrl.update();
			expect(ctrl.snapshot().state).toBe('hurt');
		});

		it('exits hurt state after duration expires', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });
			ctrl.takeDamage(20);
			ctrl.update();
			expect(ctrl.snapshot().state).toBe('hurt');

			// Advance enough frames to expire hurt timer (300ms / 16.67ms ≈ 18 frames)
			for (let i = 0; i < 20; i++) {
				ctrl.update();
			}
			expect(ctrl.snapshot().state).not.toBe('hurt');
		});
	});

	describe('respawn', () => {
		it('resets health to max', () => {
			controller.takeDamage(60);
			controller.respawn();
			expect(controller.snapshot().health).toBe(100);
		});

		it('resets state to idle', () => {
			controller.takeDamage(100);
			controller.update();
			expect(controller.snapshot().state).toBe('dead');
			controller.respawn();
			controller.update();
			expect(controller.snapshot().state).toBe('idle');
		});

		it('grants respawn invincibility', () => {
			const mClock = createMutableMockClock();
			const ctrl = new PlayerController({ input, body, clock: mClock, config, stats });
			ctrl.respawn();
			expect(ctrl.snapshot().isInvincible).toBe(true);

			// Still invincible within 2000ms
			mClock._elapsed = 1000;
			expect(ctrl.snapshot().isInvincible).toBe(true);

			// Past 2000ms
			mClock._elapsed = 3000;
			expect(ctrl.snapshot().isInvincible).toBe(false);
		});

		it('resets velocity to zero', () => {
			body._velocity.x = 200;
			body._velocity.y = -300;
			controller.respawn();
			expect(body._velocity.x).toBe(0);
			expect(body._velocity.y).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('handles zero delta gracefully', () => {
			clock = createMockClock(0);
			controller = new PlayerController({ input, body, clock, config, stats });
			// Should not throw
			controller.update();
			expect(controller.snapshot().state).toBe('idle');
		});

		it('handles negative delta gracefully', () => {
			clock = createMockClock(-16);
			controller = new PlayerController({ input, body, clock, config, stats });
			controller.update();
			expect(controller.snapshot().state).toBe('idle');
		});

		it('handles single-jump config (maxJumps = 1)', () => {
			config.jump.maxJumps = 1;
			controller = new PlayerController({ input, body, clock, config, stats });

			// First jump
			input._justPressed.add('jump');
			controller.update();
			body._blocked.down = false;
			input._justPressed.clear();
			controller.update();

			// Should not double jump
			input._justPressed.add('jump');
			controller.update();
			// No change (can't jump again)
			expect(controller.snapshot().jumpsRemaining).toBe(0);
		});
	});

	describe('diagnostics', () => {
		it('emits state-change event on state transition', () => {
			const spy = createSpyDiagnostics();
			const ctrl = new PlayerController({ input, body, clock, config, stats, diagnostics: spy });

			// idle → running
			input._pressed.add('right');
			ctrl.update();

			const stateEvents = spy.events.filter((e) => e.label === 'state-change');
			expect(stateEvents).toHaveLength(1);
			expect(stateEvents[0].channel).toBe('player');
			expect(stateEvents[0].level).toBe('state');
			expect(stateEvents[0].data.from).toBe('idle');
			expect(stateEvents[0].data.to).toBe('running');
		});

		it('does not emit state-change when state is unchanged', () => {
			const spy = createSpyDiagnostics();
			const ctrl = new PlayerController({ input, body, clock, config, stats, diagnostics: spy });

			// idle → idle (no input, on ground)
			ctrl.update();
			ctrl.update();

			const stateEvents = spy.events.filter((e) => e.label === 'state-change');
			expect(stateEvents).toHaveLength(0);
		});

		it('emits debug frame events when enabled', () => {
			const spy = createSpyDiagnostics();
			const ctrl = new PlayerController({ input, body, clock, config, stats, diagnostics: spy });

			ctrl.update();

			const debugEvents = spy.events.filter((e) => e.level === 'debug');
			expect(debugEvents).toHaveLength(1);
			expect(debugEvents[0].label).toBe('frame');
			expect(debugEvents[0].data.state).toBe('idle');
		});
	});
});
