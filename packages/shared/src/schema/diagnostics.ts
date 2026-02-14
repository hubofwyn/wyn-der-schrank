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
	'request',
	'startup',
	'minigame',
]);

export const DiagnosticLevelSchema = z.enum([
	'state', // State transitions — always interesting, low volume
	'debug', // Frame-by-frame detail — usually noise, enable per-channel
	'warn', // Unexpected conditions — agent should investigate
]);

export const DiagnosticSourceSchema = z.enum([
	'client', // Browser-side game runtime events
	'server', // Server-side Hono request/startup events
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

/** Schema for a single client diagnostic event forwarded to the server. */
export const ClientDiagnosticEventSchema = z.object({
	frame: z.number(),
	timestamp: z.number(),
	channel: DiagnosticChannelSchema,
	level: DiagnosticLevelSchema,
	label: z.string(),
	data: z.record(z.string(), z.unknown()),
});

/** Batch payload for POST /api/diagnostics/ingest. */
export const ClientDiagnosticPayloadSchema = z.object({
	events: z.array(ClientDiagnosticEventSchema).min(1).max(200),
});
