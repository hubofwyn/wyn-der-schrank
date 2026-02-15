import { z } from 'zod';
import { StarRatingSchema } from './scoring.js';

/**
 * Per-level completion record for session persistence.
 * A subset of LevelResultSchema — omits enemiesDefeated and
 * secretsFound which aren't tracked yet.
 */
export const LevelCompletionSchema = z.object({
	score: z.number().int().min(0),
	stars: StarRatingSchema,
	coins: z.number().int().min(0),
	time: z.number().int().min(0),
	completedAt: z.number(),
});

/**
 * Minimal session save schema — a subset of PlayerProfileSchema.
 * Captures per-level results and running totals without requiring
 * character selection, world unlocks, or profile management.
 */
export const SessionSaveSchema = z.object({
	levels: z.record(z.string(), LevelCompletionSchema).default({}),
	totalCoins: z.number().int().min(0).default(0),
	totalStars: z.number().int().min(0).default(0),
	savedAt: z.number().default(0),
});
