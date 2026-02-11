import { z } from 'zod';

export const SettingsSchema = z.object({
	audio: z.object({
		masterVolume: z.number().min(0).max(1).default(0.8),
		musicVolume: z.number().min(0).max(1).default(0.7),
		sfxVolume: z.number().min(0).max(1).default(1.0),
		muted: z.boolean().default(false),
	}),
	display: z.object({
		showFps: z.boolean().default(false),
		showMinimap: z.boolean().default(true),
		screenShake: z.boolean().default(true),
		particleQuality: z.enum(['low', 'medium', 'high']).default('medium'),
	}),
	controls: z.object({
		jump: z.string().default('Space'),
		left: z.string().default('KeyA'),
		right: z.string().default('KeyD'),
		down: z.string().default('KeyS'),
		attack: z.string().default('KeyJ'),
		interact: z.string().default('KeyE'),
		pause: z.string().default('Escape'),
		ability: z.string().default('KeyK'),
	}),
	accessibility: z.object({
		highContrast: z.boolean().default(false),
		largeText: z.boolean().default(false),
	}),
});
