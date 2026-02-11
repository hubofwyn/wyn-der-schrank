import { z } from 'zod';
import { CollectibleTypeSchema } from './collectible.js';
import { EntityIdSchema, Vec2Schema } from './common.js';
import { LevelIdSchema } from './level.js';
import { MinigameIdSchema } from './minigame.js';

const BaseEventSchema = z.object({
	timestamp: z.number(),
	playerId: z.string(),
});

export const GameEventSchema = z.discriminatedUnion('type', [
	BaseEventSchema.extend({
		type: z.literal('player:moved'),
		position: Vec2Schema,
		velocity: Vec2Schema,
	}),
	BaseEventSchema.extend({
		type: z.literal('player:jumped'),
	}),
	BaseEventSchema.extend({
		type: z.literal('player:attacked'),
		direction: z.enum(['left', 'right']),
	}),
	BaseEventSchema.extend({
		type: z.literal('player:hurt'),
		damage: z.number().int().min(1),
		sourceId: EntityIdSchema,
	}),
	BaseEventSchema.extend({
		type: z.literal('player:died'),
	}),
	BaseEventSchema.extend({
		type: z.literal('collectible:picked-up'),
		collectibleId: EntityIdSchema,
		collectibleType: CollectibleTypeSchema,
	}),
	BaseEventSchema.extend({
		type: z.literal('enemy:defeated'),
		enemyId: EntityIdSchema,
	}),
	BaseEventSchema.extend({
		type: z.literal('minigame:entered'),
		minigameId: MinigameIdSchema,
	}),
	BaseEventSchema.extend({
		type: z.literal('minigame:completed'),
		minigameId: MinigameIdSchema,
		score: z.number().int().min(0),
		won: z.boolean(),
	}),
	BaseEventSchema.extend({
		type: z.literal('level:checkpoint'),
		position: Vec2Schema,
	}),
	BaseEventSchema.extend({
		type: z.literal('level:completed'),
		levelId: LevelIdSchema,
		score: z.number().int().min(0),
		time: z.number().int().min(0),
	}),
]);
