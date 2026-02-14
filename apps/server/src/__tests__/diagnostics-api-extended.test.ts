import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
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

function createApp() {
	const diag = new ServerDiagnostics(createConfig());
	const app = new Hono().route('/', createDiagnosticsRoutes(diag));
	return { app, diag };
}

describe('POST /api/diagnostics/ingest', () => {
	it('accepts valid client event batch', async () => {
		const { app } = createApp();
		const res = await app.request('/api/diagnostics/ingest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				events: [
					{
						frame: 100,
						timestamp: Date.now(),
						channel: 'player',
						level: 'state',
						label: 'state-change',
						data: { from: 'idle', to: 'running' },
					},
				],
			}),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.ingested).toBe(1);
	});

	it('rejects invalid payload with 400', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { app } = createApp();
		const res = await app.request('/api/diagnostics/ingest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ events: [] }), // min 1 event required
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid payload');
		vi.restoreAllMocks();
	});

	it('rejects events with invalid channel', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { app } = createApp();
		const res = await app.request('/api/diagnostics/ingest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				events: [
					{
						frame: 1,
						timestamp: Date.now(),
						channel: 'invalid-channel',
						level: 'state',
						label: 'test',
						data: {},
					},
				],
			}),
		});

		expect(res.status).toBe(400);
		vi.restoreAllMocks();
	});

	it('makes ingested events available via unified query', async () => {
		const { app } = createApp();
		vi.spyOn(console, 'log').mockImplementation(() => {});

		await app.request('/api/diagnostics/ingest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				events: [
					{
						frame: 50,
						timestamp: Date.now(),
						channel: 'camera',
						level: 'state',
						label: 'bounds-clamp',
						data: { x: 100, y: 200 },
					},
				],
			}),
		});

		// Query unified endpoint with source=client
		const res = await app.request('/api/diagnostics?source=client');
		const body = await res.json();
		expect(body.events).toHaveLength(1);
		expect(body.events[0].source).toBe('client');
		expect(body.events[0].channel).toBe('camera');

		vi.restoreAllMocks();
	});
});

describe('GET /api/diagnostics?unified=true', () => {
	it('returns both server and client events', async () => {
		const { app, diag } = createApp();
		vi.spyOn(console, 'log').mockImplementation(() => {});

		diag.emit('startup', 'state', 'boot', {});
		diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now(),
				channel: 'player',
				level: 'state',
				label: 'move',
				data: {},
			},
		]);

		const res = await app.request('/api/diagnostics?unified=true');
		const body = await res.json();

		const sources = new Set(body.events.map((e: { source: string }) => e.source));
		expect(sources.has('server')).toBe(true);
		expect(sources.has('client')).toBe(true);

		vi.restoreAllMocks();
	});

	it('filters unified results by channel', async () => {
		const { app, diag } = createApp();
		vi.spyOn(console, 'log').mockImplementation(() => {});

		diag.emit('startup', 'state', 'boot', {});
		diag.emit('request', 'state', 'req', {});
		diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now(),
				channel: 'player',
				level: 'state',
				label: 'move',
				data: {},
			},
		]);

		const res = await app.request('/api/diagnostics?unified=true&channel=player');
		const body = await res.json();
		expect(body.events).toHaveLength(1);
		expect(body.events[0].channel).toBe('player');

		vi.restoreAllMocks();
	});
});

describe('GET /api/diagnostics/snapshot', () => {
	it('returns structured snapshot', async () => {
		const { app, diag } = createApp();
		vi.spyOn(console, 'log').mockImplementation(() => {});

		diag.emit('startup', 'state', 'boot', {});

		const res = await app.request('/api/diagnostics/snapshot');
		expect(res.status).toBe(200);
		const body = await res.json();

		expect(body.serverUptime).toBeGreaterThanOrEqual(0);
		expect(body.serverSeq).toBeGreaterThan(0);
		expect(body.bufferCapacity).toBeDefined();
		expect(body.bufferUsage).toBeDefined();
		expect(body.channels).toBeInstanceOf(Array);
		expect(body.recentWarnings).toBeInstanceOf(Array);
		expect(body.recentEvents).toBeInstanceOf(Array);

		vi.restoreAllMocks();
	});
});

describe('GET /api/diagnostics/summary', () => {
	it('returns AI-readable summary', async () => {
		const { app, diag } = createApp();
		vi.spyOn(console, 'log').mockImplementation(() => {});

		diag.emit('startup', 'state', 'boot', {});

		const res = await app.request('/api/diagnostics/summary');
		expect(res.status).toBe(200);
		const body = await res.json();

		expect(body.status).toMatch(/^(quiet|active|warnings)$/);
		expect(typeof body.description).toBe('string');
		expect(body.activeChannels).toBeInstanceOf(Array);
		expect(body.warningChannels).toBeInstanceOf(Array);
		expect(body.highlights).toBeInstanceOf(Array);
		expect(body.eventRate).toBeDefined();
		expect(typeof body.eventRate.total).toBe('number');

		vi.restoreAllMocks();
	});
});
