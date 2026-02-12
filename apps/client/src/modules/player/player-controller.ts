import type { CharacterStats, Facing, PlatformerConfig, PlayerState, Vec2 } from '@wds/shared';
import type { IGameClock } from '../../core/ports/engine.js';
import type { IInputProvider } from '../../core/ports/input.js';
import type { IBody } from '../../core/ports/physics.js';

/**
 * Readonly snapshot of the player's current state.
 * Read by the scene to drive sprites, animations, HUD, and camera.
 */
export interface PlayerSnapshot {
	readonly state: PlayerState;
	readonly facing: Facing;
	readonly position: Readonly<Vec2>;
	readonly velocity: Readonly<Vec2>;
	readonly health: number;
	readonly maxHealth: number;
	readonly isOnGround: boolean;
	readonly jumpsRemaining: number;
	readonly isInvincible: boolean;
}

export interface DamageResult {
	readonly damaged: boolean;
	readonly newHealth: number;
	readonly isDead: boolean;
}

/**
 * Dependencies injected into the PlayerController.
 * Keeps the constructor signature clean and testable.
 */
export interface PlayerControllerDeps {
	readonly input: IInputProvider;
	readonly body: IBody;
	readonly clock: IGameClock;
	readonly config: PlatformerConfig;
	readonly stats: CharacterStats;
}

/**
 * Single composable player controller.
 *
 * This is the ONE class that handles all player movement and state.
 * No controller proliferation — movement, jump, fast-fall, and state
 * machine are methods within this class, not separate hierarchies.
 *
 * RULES:
 * - Zero Phaser imports. Talks only through port interfaces.
 * - All tuning via PlatformerConfig (Zod-validated).
 * - Internal timers (coyote, jumpBuffer) are NOT serialized.
 * - Exposed state is readonly via snapshot().
 */
export class PlayerController {
	static readonly INVINCIBILITY_DURATION_MS = 1500;
	static readonly HURT_DURATION_MS = 300;
	static readonly RESPAWN_INVINCIBILITY_MS = 2000;

	private readonly input: IInputProvider;
	private readonly body: IBody;
	private readonly clock: IGameClock;
	private readonly config: PlatformerConfig;
	private readonly stats: CharacterStats;

	// ── State machine ──
	private _state: PlayerState = 'idle';
	private _facing: Facing = 'right';
	private _health: number;
	private _maxHealth: number;

	// ── Invincibility + hurt ──
	private _invincibleUntilElapsed = 0;
	private _hurtTimeRemaining = 0;

	// ── Internal timers (seconds) ──
	private coyoteTimeRemaining = 0;
	private jumpBufferRemaining = 0;
	private jumpsRemaining: number;
	private wasOnGround = false;
	private didJumpFromGround = false;

	constructor(deps: PlayerControllerDeps) {
		this.input = deps.input;
		this.body = deps.body;
		this.clock = deps.clock;
		this.config = deps.config;
		this.stats = deps.stats;

		this._health = deps.stats.maxHealth;
		this._maxHealth = deps.stats.maxHealth;
		this.jumpsRemaining = deps.config.jump.maxJumps;
	}

	/** Readonly snapshot for the scene to read. */
	snapshot(): PlayerSnapshot {
		return {
			state: this._state,
			facing: this._facing,
			position: this.body.position,
			velocity: this.body.velocity,
			health: this._health,
			maxHealth: this._maxHealth,
			isOnGround: this.body.isOnGround,
			jumpsRemaining: this.jumpsRemaining,
			isInvincible: this.clock.elapsed < this._invincibleUntilElapsed,
		};
	}

	/**
	 * Main update — called once per frame after input.update().
	 * Reads input, updates physics intent, advances state machine.
	 */
	update(): void {
		const dt = this.clock.delta / 1000; // ms → seconds
		if (dt <= 0 || !Number.isFinite(dt)) return;

		this.updateGroundTracking();
		this.updateTimers(dt);
		this.handleJumpInput();
		this.handleJumpCut();
		this.handleHorizontalMovement();
		this.handleFastFall();
		this.updateStateMachine();
	}

	// ── Ground tracking ──

	private updateGroundTracking(): void {
		const onGround = this.body.isOnGround;

		if (this.wasOnGround && !onGround) {
			// Just left the ground — start coyote timer only if walked off edge
			if (!this.didJumpFromGround) {
				this.coyoteTimeRemaining = this.config.jump.coyoteTimeMs / 1000;
			}
			this.didJumpFromGround = false;
		}

		if (!this.wasOnGround && onGround) {
			// Just landed
			this.jumpsRemaining = this.config.jump.maxJumps;
			this.coyoteTimeRemaining = 0;

			// Check jump buffer — auto-jump on landing
			if (this.jumpBufferRemaining > 0) {
				this.executeJump();
			}
		}

		if (onGround) {
			this.jumpsRemaining = this.config.jump.maxJumps;
		}

		this.wasOnGround = onGround;
	}

	// ── Timers ──

	private updateTimers(dt: number): void {
		if (this.coyoteTimeRemaining > 0) {
			this.coyoteTimeRemaining -= dt;
		}
		if (this.jumpBufferRemaining > 0) {
			this.jumpBufferRemaining -= dt;
		}
		if (this._hurtTimeRemaining > 0) {
			this._hurtTimeRemaining -= dt;
		}
	}

	// ── Jump ──

	private handleJumpInput(): void {
		if (!this.input.justPressed('jump')) return;

		// Buffer the jump request
		this.jumpBufferRemaining = this.config.jump.jumpBufferMs / 1000;

		if (this.canJump()) {
			this.executeJump();
		}
	}

	private canJump(): boolean {
		const onGround = this.body.isOnGround;
		const hasCoyoteTime = this.coyoteTimeRemaining > 0;
		const hasAirJumps = this.jumpsRemaining > 0;

		return onGround || hasCoyoteTime || hasAirJumps;
	}

	private executeJump(): void {
		const { jump } = this.config;
		const isFirstJump = this.body.isOnGround || this.coyoteTimeRemaining > 0;
		const velocity = isFirstJump ? jump.jumpVelocity : jump.doubleJumpVelocity;

		if (this.body.isOnGround) {
			this.didJumpFromGround = true;
		}

		this.body.setVelocityY(velocity);
		this.jumpsRemaining--;
		this.coyoteTimeRemaining = 0;
		this.jumpBufferRemaining = 0;
	}

	// ── Jump cut (variable height) ──

	private handleJumpCut(): void {
		if (!this.input.justReleased('jump')) return;

		// Only cut if moving upward
		if (this.body.velocity.y < 0) {
			this.body.setVelocityY(this.body.velocity.y * this.config.jump.jumpCutMultiplier);
		}
	}

	// ── Horizontal movement ──

	private handleHorizontalMovement(): void {
		const axis = this.input.getAxis('horizontal');
		const { movement } = this.config;
		const onGround = this.body.isOnGround;

		const speed = this.stats.speed * (onGround ? 1.0 : movement.airControlFactor);
		this.body.setVelocityX(axis * speed);

		// Update facing (only when moving)
		if (axis < 0) this._facing = 'left';
		if (axis > 0) this._facing = 'right';
	}

	// ── Fast fall ──

	private handleFastFall(): void {
		const { fastFall, gravity } = this.config;
		const holdingDown = this.input.isDown('down');
		const falling = this.body.velocity.y > fastFall.threshold;

		if (holdingDown && !this.body.isOnGround && falling) {
			this.body.setGravityY(gravity.y * (fastFall.multiplier - 1));
		} else {
			this.body.setGravityY(0);
		}
	}

	// ── State machine ──

	private updateStateMachine(): void {
		if (this._health <= 0) {
			this._state = 'dead';
			return;
		}

		if (this._hurtTimeRemaining > 0) {
			this._state = 'hurt';
			return;
		}

		const vy = this.body.velocity.y;
		const vx = this.body.velocity.x;
		const onGround = this.body.isOnGround;

		if (vy < 0 && !onGround) {
			this._state = 'jumping';
		} else if (vy > 0 && !onGround) {
			this._state = 'falling';
		} else if (Math.abs(vx) > 1 && onGround) {
			this._state = 'running';
		} else if (onGround) {
			this._state = 'idle';
		}
	}

	// ── Health + Damage ──

	takeDamage(amount: number): DamageResult {
		if (amount <= 0) {
			return { damaged: false, newHealth: this._health, isDead: false };
		}

		if (this._health <= 0) {
			return { damaged: false, newHealth: 0, isDead: true };
		}

		if (this.clock.elapsed < this._invincibleUntilElapsed) {
			return { damaged: false, newHealth: this._health, isDead: false };
		}

		this._health = Math.max(0, this._health - amount);
		this._invincibleUntilElapsed = this.clock.elapsed + PlayerController.INVINCIBILITY_DURATION_MS;
		this._hurtTimeRemaining = PlayerController.HURT_DURATION_MS / 1000;

		return { damaged: true, newHealth: this._health, isDead: this._health <= 0 };
	}

	heal(amount: number): void {
		this._health = Math.min(this._maxHealth, this._health + amount);
	}

	// ── Respawn ──

	respawn(): void {
		this._health = this._maxHealth;
		this._state = 'idle';
		this._invincibleUntilElapsed = this.clock.elapsed + PlayerController.RESPAWN_INVINCIBILITY_MS;
		this._hurtTimeRemaining = 0;
		this.body.setVelocity(0, 0);
		this.jumpsRemaining = this.config.jump.maxJumps;
		this.coyoteTimeRemaining = 0;
		this.jumpBufferRemaining = 0;
		this.wasOnGround = false;
		this.didJumpFromGround = false;
	}
}
