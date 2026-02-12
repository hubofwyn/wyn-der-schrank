import { z } from 'zod';

export const DiagnosticChannelSchema = z.enum([
	'player',
	'camera',
	'physics',
	'enemy',
	'collectible',
	'scene',
	'audio',
	'network',
	'settings',
]);

export const DiagnosticLevelSchema = z.enum([
	'state', // State transitions — always interesting, low volume
	'debug', // Frame-by-frame detail — usually noise, enable per-channel
	'warn', // Unexpected conditions — agent should investigate
]);

export const DiagnosticChannelConfigSchema = z.object({
	state: z.boolean().default(true),
	debug: z.boolean().default(false),
	warn: z.boolean().default(true),
});

export const DiagnosticsConfigSchema = z.object({
	enabled: z.boolean().default(false),
	// Sparse record: only channels with explicit overrides are listed.
	// Channel names are validated at emit callsites via DiagnosticChannelSchema.
	channels: z.record(z.string(), DiagnosticChannelConfigSchema).default({}),
	ringBufferSize: z.number().int().min(100).max(10000).default(500),
});
