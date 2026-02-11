import { z } from 'zod';
import { RectSchema, Vec2Schema } from './common.js';

export const WorldIdSchema = z.enum(['forest', 'cave', 'castle']);

export const LevelIdSchema = z.string().regex(/^[a-z]+-\d+$/);

export const TileLayerRefSchema = z.object({
	name: z.string(),
	tilemapKey: z.string(),
	tilesetKey: z.string(),
	collides: z.boolean(),
});

export const ObjectPlacementSchema = z.object({
	type: z.enum(['enemy', 'collectible', 'portal', 'checkpoint', 'spawn', 'exit']),
	id: z.string(),
	position: Vec2Schema,
	properties: z.record(z.string(), z.unknown()).default({}),
});

export const LevelMetadataSchema = z.object({
	id: LevelIdSchema,
	worldId: WorldIdSchema,
	name: z.string(),
	order: z.number().int().min(0),
	tilemapAssetKey: z.string(),
	tileLayers: z.array(TileLayerRefSchema),
	objects: z.array(ObjectPlacementSchema),
	bounds: RectSchema,
	playerSpawn: Vec2Schema,
	musicKey: z.string(),
	parTime: z.number().int().positive(),
	starThresholds: z.object({
		one: z.number().int().min(0),
		two: z.number().int().min(0),
		three: z.number().int().min(0),
	}),
});

export const WorldDefinitionSchema = z.object({
	id: WorldIdSchema,
	name: z.string(),
	description: z.string(),
	order: z.number().int().min(0),
	levels: z.array(LevelIdSchema),
	unlockCondition: z.object({
		type: z.enum(['stars', 'world-complete', 'none']),
		worldId: WorldIdSchema.optional(),
		starsRequired: z.number().int().min(0).optional(),
	}),
	backgroundKey: z.string(),
	musicKey: z.string(),
});
