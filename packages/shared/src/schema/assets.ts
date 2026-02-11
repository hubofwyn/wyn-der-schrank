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

export const AssetEntrySchema = z.object({
	key: z.string(),
	type: AssetTypeSchema,
	url: z.string(),
	frameWidth: z.number().int().positive().optional(),
	frameHeight: z.number().int().positive().optional(),
	atlasUrl: z.string().optional(),
	fontDataUrl: z.string().optional(),
});

export const AssetManifestSchema = z.object({
	version: z.string(),
	assets: z.array(AssetEntrySchema),
});
