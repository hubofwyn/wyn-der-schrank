import { describe, expect, it } from 'vitest';
import { loadConfig, ServerConfigSchema } from '../config.js';

describe('ServerConfigSchema', () => {
	it('provides sensible defaults when no values given', () => {
		const config = ServerConfigSchema.parse({});
		expect(config.port).toBe(3001);
		expect(config.logLevel).toBe('info');
		expect(config.env).toBe('development');
		expect(config.diagnosticsEnabled).toBe(true);
		expect(config.diagnosticsBufferSize).toBe(500);
	});

	it('coerces string values from env vars', () => {
		const config = ServerConfigSchema.parse({
			port: '4000',
			diagnosticsEnabled: 'false',
			diagnosticsBufferSize: '1000',
		});
		expect(config.port).toBe(4000);
		expect(config.diagnosticsEnabled).toBe(false);
		expect(config.diagnosticsBufferSize).toBe(1000);
	});

	it('rejects invalid port numbers', () => {
		expect(() => ServerConfigSchema.parse({ port: 0 })).toThrow();
		expect(() => ServerConfigSchema.parse({ port: 70000 })).toThrow();
	});

	it('rejects invalid log levels', () => {
		expect(() => ServerConfigSchema.parse({ logLevel: 'verbose' })).toThrow();
	});
});

describe('loadConfig', () => {
	it('returns defaults when env vars are not set', () => {
		const config = loadConfig();
		expect(config.port).toBe(3001);
		// NODE_ENV is 'test' when running under Vitest
		expect(config.logLevel).toBe('info');
	});
});
