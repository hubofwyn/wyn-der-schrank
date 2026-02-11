import { z } from 'zod';

export const MinigameIdSchema = z.enum(['dice-duel', 'coin-catch', 'memory-match']);

export const MinigamePhaseSchema = z.enum(['intro', 'active', 'finished']);

export const MinigameStateSchema = z.object({
	id: MinigameIdSchema,
	phase: MinigamePhaseSchema,
	participants: z.array(z.string()),
	timeRemainingMs: z.number().min(0),
	data: z.record(z.string(), z.unknown()),
});

export const MinigameResultSchema = z.object({
	minigameId: MinigameIdSchema,
	playerId: z.string(),
	score: z.number().int().min(0),
	won: z.boolean(),
	reward: z.object({
		coins: z.number().int().min(0).default(0),
		scoreBonus: z.number().int().min(0).default(0),
		itemId: z.string().optional(),
	}),
});

export const MinigameDefinitionSchema = z.object({
	id: MinigameIdSchema,
	name: z.string(),
	description: z.string(),
	durationMs: z.number().int().positive(),
	musicKey: z.string(),
	instructionText: z.string(),
});
