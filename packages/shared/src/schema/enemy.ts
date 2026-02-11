import { z } from 'zod';
import { EntityIdSchema, Vec2Schema } from './common.js';

export const EnemyTypeSchema = z.enum(['slime', 'bat', 'skeleton', 'spider', 'boss-golem']);

export const EnemyBehaviorSchema = z.enum(['patrol', 'chase', 'fly', 'boss', 'stationary']);

export const EnemyDefinitionSchema = z.object({
	type: EnemyTypeSchema,
	name: z.string(),
	health: z.number().int().min(1),
	damage: z.number().int().min(0),
	speed: z.number().min(0),
	behavior: EnemyBehaviorSchema,
	detectionRange: z.number().positive().optional(),
	spriteKey: z.string(),
	loot: z
		.array(
			z.object({
				itemId: z.string(),
				chance: z.number().min(0).max(1),
			}),
		)
		.default([]),
});

export const EnemyInstanceSchema = z.object({
	id: EntityIdSchema,
	type: EnemyTypeSchema,
	position: Vec2Schema,
	velocity: Vec2Schema,
	health: z.number().int().min(0),
	facing: z.enum(['left', 'right']),
	currentBehavior: EnemyBehaviorSchema,
	isAlive: z.boolean(),
});
