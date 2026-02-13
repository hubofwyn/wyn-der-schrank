import { z } from 'zod';

export const AssetTypeSchema = z.enum([
	'image',
	'spritesheet',
	'atlas',
	'tilemapTiledJSON',
	'audio',
	'bitmapFont',
	'json',
]);

export const SpritesheetMetaSchema = z.object({
	frameWidth: z.number().int().positive(),
	frameHeight: z.number().int().positive(),
	frameCount: z.number().int().positive(),
	columns: z.number().int().positive().optional(),
	animations: z
		.array(
			z.object({
				key: z.string(),
				startFrame: z.number().int().min(0),
				endFrame: z.number().int().min(0),
				frameRate: z.number().positive(),
				repeat: z.number().int().min(-1),
			}),
		)
		.optional(),
});

export const AudioMetaSchema = z.object({
	format: z.enum(['ogg', 'mp3', 'wav']),
	durationMs: z.number().positive(),
	sampleRate: z.number().int().positive().optional(),
	channels: z.number().int().min(1).max(2).optional(),
});

export const TilemapMetaSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	tileWidth: z.number().int().positive(),
	tileHeight: z.number().int().positive(),
	layers: z.array(z.string()),
	objectGroups: z.array(z.string()).optional(),
});

export const AssetEntrySchema = z.object({
	key: z.string(),
	type: AssetTypeSchema,
	url: z.string(),
	frameWidth: z.number().int().positive().optional(),
	frameHeight: z.number().int().positive().optional(),
	atlasUrl: z.string().optional(),
	fontDataUrl: z.string().optional(),
	spritesheetMeta: SpritesheetMetaSchema.optional(),
	audioMeta: AudioMetaSchema.optional(),
	tilemapMeta: TilemapMetaSchema.optional(),
});

export const AssetManifestSchema = z.object({
	version: z.string(),
	assets: z.array(AssetEntrySchema),
});
