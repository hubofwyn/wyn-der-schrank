import { z } from 'zod';

export const Vec2Schema = z.object({
	x: z.number(),
	y: z.number(),
});

export const RectSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number().positive(),
	height: z.number().positive(),
});

export const RangeSchema = z.object({
	min: z.number(),
	max: z.number(),
});

export const EntityIdSchema = z.string().min(1).max(64);
