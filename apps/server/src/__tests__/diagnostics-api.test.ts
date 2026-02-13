import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { ServerConfig } from '../config.js';
import { createDiagnosticsRoutes } from '../routes/diagnostics.js';
import { ServerDiagnostics } from '../services/server-diagnostics.js';

function createConfig(): ServerConfig {
	return {
		port: 3001,
		logLevel: 'info',
		env: 'test',
		diagnosticsEnabled: true,
		diagnosticsBufferSize: 500,
	};
}

describe('GET /api/diagnostics', () => {
	it('returns empty events array when no events', async () => {
		const diag = new ServerDiagnostics(createConfig());
		const app = new Hono().route('/', createDiagnosticsRoutes(diag));
		const res = await app.request('/api/diagnostics');
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.events).toEqual([]);
	});

	it('returns emitted events', async () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', { version: '0.0.1' });
		diag.emit('request', 'state', 'GET /api/health', {});
		const app = new Hono().route('/', createDiagnosticsRoutes(diag));
		const res = await app.request('/api/diagnostics');
		const body = await res.json();
		expect(body.events).toHaveLength(2);
	});

	it('filters by channel query param', async () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', {});
		diag.emit('request', 'state', 'GET /api/health', {});
		diag.emit('startup', 'state', 'ready', {});
		const app = new Hono().route('/', createDiagnosticsRoutes(diag));
		const res = await app.request('/api/diagnostics?channel=startup');
		const body = await res.json();
		expect(body.events).toHaveLength(2);
		expect(body.events.every((e: { channel: string }) => e.channel === 'startup')).toBe(true);
	});

	it('respects last query param', async () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('request', 'state', 'req-1', {});
		diag.emit('request', 'state', 'req-2', {});
		diag.emit('request', 'state', 'req-3', {});
		const app = new Hono().route('/', createDiagnosticsRoutes(diag));
		const res = await app.request('/api/diagnostics?last=2');
		const body = await res.json();
		expect(body.events).toHaveLength(2);
		expect(body.events[0].label).toBe('req-2');
	});
});
