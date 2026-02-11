import { z } from 'zod';

export const CharacterIdSchema = z.enum(['knight', 'mage', 'rogue']);

export const CharacterStatsSchema = z.object({
	maxHealth: z.number().int().min(1).max(200),
	speed: z.number().positive(),
	jumpForce: z.number().positive(),
	attackPower: z.number().int().min(0),
	defense: z.number().int().min(0),
});

export const CharacterAbilitySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	cooldownMs: z.number().int().min(0),
});

export const CharacterDefinitionSchema = z.object({
	id: CharacterIdSchema,
	name: z.string(),
	description: z.string(),
	stats: CharacterStatsSchema,
	ability: CharacterAbilitySchema,
	spriteKey: z.string(),
	portraitKey: z.string(),
	unlocked: z.boolean(),
	unlockCondition: z.string().optional(),
});
