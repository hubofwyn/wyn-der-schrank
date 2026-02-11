import { z } from 'zod';
import { EntityIdSchema, Vec2Schema } from './common.js';

export const CollectibleTypeSchema = z.enum([
	'coin',
	'gem',
	'heart',
	'extra-life',
	'speed-boost',
	'shield',
	'key',
	'minigame-portal',
]);

export const CollectibleDefinitionSchema = z.object({
	type: CollectibleTypeSchema,
	name: z.string(),
	spriteKey: z.string(),
	animationKey: z.string().optional(),
	value: z.number().int().min(0).default(0),
	effectDurationMs: z.number().int().min(0).optional(),
	sfxKey: z.string().default('coin'),
});

export const CollectibleInstanceSchema = z.object({
	id: EntityIdSchema,
	type: CollectibleTypeSchema,
	position: Vec2Schema,
	collected: z.boolean(),
});
