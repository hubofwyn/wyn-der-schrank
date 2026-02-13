import { z } from 'zod';

/**
 * Coerce string env var to boolean.
 * "false", "0", "" → false. Everything else truthy → true.
 */
const booleanFromEnv = z.preprocess((val) => {
	if (typeof val === 'string') {
		return val !== 'false' && val !== '0' && val !== '';
	}
	return val;
}, z.boolean().default(true));

export const ServerConfigSchema = z.object({
	port: z.coerce.number().int().min(1).max(65535).default(3001),
	logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
	env: z.enum(['development', 'production', 'test']).default('development'),
	diagnosticsEnabled: booleanFromEnv,
	diagnosticsBufferSize: z.coerce.number().int().min(100).max(10000).default(500),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function loadConfig(): ServerConfig {
	return ServerConfigSchema.parse({
		port: process.env.PORT,
		logLevel: process.env.LOG_LEVEL,
		env: process.env.NODE_ENV,
		diagnosticsEnabled: process.env.DIAGNOSTICS_ENABLED,
		diagnosticsBufferSize: process.env.DIAGNOSTICS_BUFFER_SIZE,
	});
}
