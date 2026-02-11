import { z } from 'zod';
import { Vec2Schema } from './common.js';

export const MovementConfigSchema = z.object({
	walkSpeed: z.number().positive().default(250),
	airControlFactor: z.number().min(0).max(1).default(0.85),
	groundAcceleration: z.number().positive().default(1200),
	airAcceleration: z.number().positive().default(600),
	groundDeceleration: z.number().positive().default(1500),
	airDeceleration: z.number().positive().default(200),
	maxFallSpeed: z.number().positive().default(600),
});

export const JumpConfigSchema = z.object({
	jumpVelocity: z.number().negative().default(-420),
	jumpCutMultiplier: z.number().min(0).max(1).default(0.4),
	coyoteTimeMs: z.number().min(0).default(120),
	jumpBufferMs: z.number().min(0).default(100),
	maxJumps: z.number().int().min(1).max(5).default(2),
	doubleJumpVelocity: z.number().negative().default(-360),
});

export const FastFallConfigSchema = z.object({
	multiplier: z.number().min(1).default(1.5),
	threshold: z.number().min(0).default(0),
});

export const BodyDimensionsSchema = z.object({
	width: z.number().positive().default(24),
	height: z.number().positive().default(40),
	offsetX: z.number().default(4),
	offsetY: z.number().default(8),
});

export const PlatformerConfigSchema = z.object({
	gravity: Vec2Schema.default({ x: 0, y: 800 }),
	movement: MovementConfigSchema.default({
		walkSpeed: 250,
		airControlFactor: 0.85,
		groundAcceleration: 1200,
		airAcceleration: 600,
		groundDeceleration: 1500,
		airDeceleration: 200,
		maxFallSpeed: 600,
	}),
	jump: JumpConfigSchema.default({
		jumpVelocity: -420,
		jumpCutMultiplier: 0.4,
		coyoteTimeMs: 120,
		jumpBufferMs: 100,
		maxJumps: 2,
		doubleJumpVelocity: -360,
	}),
	fastFall: FastFallConfigSchema.default({
		multiplier: 1.5,
		threshold: 0,
	}),
	body: BodyDimensionsSchema.default({
		width: 24,
		height: 40,
		offsetX: 4,
		offsetY: 8,
	}),
});
