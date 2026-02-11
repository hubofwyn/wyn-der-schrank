import { z } from 'zod';
import { LevelIdSchema } from './level.js';

export const StarRatingSchema = z.number().int().min(0).max(3);

export const LevelResultSchema = z.object({
	levelId: LevelIdSchema,
	score: z.number().int().min(0),
	time: z.number().int().min(0),
	coins: z.number().int().min(0),
	enemiesDefeated: z.number().int().min(0),
	secretsFound: z.number().int().min(0),
	stars: StarRatingSchema,
	completedAt: z.number(),
});

export const LeaderboardEntrySchema = z.object({
	playerId: z.string(),
	playerName: z.string(),
	levelId: LevelIdSchema,
	score: z.number().int().min(0),
	stars: StarRatingSchema,
	timestamp: z.number(),
});
