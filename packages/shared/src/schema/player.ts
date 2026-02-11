import { z } from 'zod';
import { CharacterIdSchema } from './character.js';
import { EntityIdSchema, Vec2Schema } from './common.js';

export const FacingSchema = z.enum(['left', 'right']);

export const PlayerStateSchema = z.enum([
	'idle',
	'running',
	'jumping',
	'falling',
	'attacking',
	'hurt',
	'dead',
]);

export const PlayerSchema = z.object({
	id: EntityIdSchema,
	characterId: CharacterIdSchema,
	position: Vec2Schema,
	velocity: Vec2Schema,
	facing: FacingSchema,
	state: PlayerStateSchema,
	health: z.number().int().min(0),
	maxHealth: z.number().int().min(1),
	score: z.number().int().min(0),
	coins: z.number().int().min(0),
	lives: z.number().int().min(0),
	abilityCooldownRemaining: z.number().min(0),
	invincibleUntil: z.number().min(0),
	isOnGround: z.boolean(),
});
