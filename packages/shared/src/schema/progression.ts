import { z } from 'zod';
import { CharacterIdSchema } from './character.js';
import { LevelIdSchema, WorldIdSchema } from './level.js';
import { LevelResultSchema } from './scoring.js';

export const PlayerProfileSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(20),
	createdAt: z.number(),
	lastPlayedAt: z.number(),

	// Unlocks
	unlockedCharacters: z.array(CharacterIdSchema),
	unlockedWorlds: z.array(WorldIdSchema),
	unlockedLevels: z.array(LevelIdSchema),

	// Progress
	totalCoins: z.number().int().min(0),
	totalScore: z.number().int().min(0),
	levelResults: z.record(z.string(), LevelResultSchema).default({}),
	totalStars: z.number().int().min(0),

	// Current session bookmark
	lastCharacterId: CharacterIdSchema.optional(),
	lastWorldId: WorldIdSchema.optional(),
	lastLevelId: LevelIdSchema.optional(),
});

export const SessionStateSchema = z.object({
	profileId: z.string(),
	characterId: CharacterIdSchema,
	worldId: WorldIdSchema,
	levelId: LevelIdSchema,
	lives: z.number().int().min(0),
	checkpointPosition: z
		.object({
			x: z.number(),
			y: z.number(),
		})
		.optional(),
});
