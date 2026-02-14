import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../../config.js';
import { ServerDiagnostics } from '../server-diagnostics.js';

function createConfig(overrides?: Partial<ServerConfig>): ServerConfig {
	return {
		port: 3001,
		logLevel: 'info',
		env: 'test',
		diagnosticsEnabled: true,
		diagnosticsBufferSize: 500,
		...overrides,
	};
}

describe('ServerDiagnostics — client ingest', () => {
	it('ingests client events into the client buffer', () => {
		const diag = new ServerDiagnostics(createConfig());
		const ingested = diag.ingestClientEvents([
			{
				frame: 100,
				timestamp: Date.now(),
				channel: 'player',
				level: 'state',
				label: 'state-change',
				data: { from: 'idle', to: 'running' },
			},
		]);

		expect(ingested).toBe(1);
		const events = diag.unifiedQuery({ source: 'client' });
		expect(events).toHaveLength(1);
		expect(events[0]!.source).toBe('client');
		expect(events[0]!.label).toBe('state-change');
	});

	it('does not ingest when disabled', () => {
		const diag = new ServerDiagnostics(createConfig({ diagnosticsEnabled: false }));
		const ingested = diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now(),
				channel: 'player',
				level: 'state',
				label: 'test',
				data: {},
			},
		]);

		expect(ingested).toBe(0);
		expect(diag.unifiedQuery({ source: 'client' })).toHaveLength(0);
	});

	it('rotates client buffer at capacity', () => {
		const diag = new ServerDiagnostics(createConfig({ diagnosticsBufferSize: 3 }));
		const events = Array.from({ length: 5 }, (_, i) => ({
			frame: i,
			timestamp: Date.now() + i,
			channel: 'player' as const,
			level: 'state' as const,
			label: `evt-${i}`,
			data: {},
		}));

		diag.ingestClientEvents(events);
		const result = diag.unifiedQuery({ source: 'client' });
		expect(result).toHaveLength(3);
		expect(result[0]!.label).toBe('evt-2');
	});
});

describe('ServerDiagnostics — unified query', () => {
	it('merges server and client events sorted by timestamp', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		diag.emit('startup', 'state', 'server-boot', {});
		diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now() - 100,
				channel: 'player',
				level: 'state',
				label: 'client-event',
				data: {},
			},
		]);

		const all = diag.unifiedQuery();
		expect(all.length).toBeGreaterThanOrEqual(2);

		const sources = new Set(all.map((e) => e.source));
		expect(sources.has('server')).toBe(true);
		expect(sources.has('client')).toBe(true);

		vi.restoreAllMocks();
	});

	it('filters by source', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

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

		const serverOnly = diag.unifiedQuery({ source: 'server' });
		expect(serverOnly.every((e) => e.source === 'server')).toBe(true);

		const clientOnly = diag.unifiedQuery({ source: 'client' });
		expect(clientOnly.every((e) => e.source === 'client')).toBe(true);

		vi.restoreAllMocks();
	});

	it('filters unified events by channel and level', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		diag.emit('startup', 'state', 'boot', {});
		diag.emit('request', 'warn', 'slow', { ms: 5000 });
		diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now(),
				channel: 'player',
				level: 'warn',
				label: 'anomaly',
				data: {},
			},
		]);

		const warns = diag.unifiedQuery({ level: 'warn' });
		expect(warns).toHaveLength(2);
		expect(warns.every((e) => e.level === 'warn')).toBe(true);

		const playerWarns = diag.unifiedQuery({ channel: 'player', level: 'warn' });
		expect(playerWarns).toHaveLength(1);

		vi.restoreAllMocks();
	});

	it('respects last param on unified query', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		for (let i = 0; i < 10; i++) {
			diag.emit('request', 'state', `req-${i}`, {});
		}

		const last3 = diag.unifiedQuery({ last: 3 });
		expect(last3).toHaveLength(3);

		vi.restoreAllMocks();
	});
});

describe('ServerDiagnostics — snapshot', () => {
	it('returns comprehensive system snapshot', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		diag.emit('startup', 'state', 'boot', {});
		diag.emit('request', 'warn', 'slow', { ms: 5000 });
		diag.ingestClientEvents([
			{
				frame: 1,
				timestamp: Date.now(),
				channel: 'player',
				level: 'state',
				label: 'state-change',
				data: { from: 'idle', to: 'jumping' },
			},
		]);

		const snap = diag.snapshot();

		expect(snap.serverUptime).toBeGreaterThanOrEqual(0);
		expect(snap.serverSeq).toBeGreaterThan(0);
		expect(snap.clientEventsIngested).toBe(1);
		expect(snap.bufferCapacity.server).toBe(500);
		expect(snap.bufferUsage.server).toBe(2);
		expect(snap.bufferUsage.client).toBe(1);
		expect(snap.channels.length).toBeGreaterThan(0);
		expect(snap.recentWarnings.length).toBeGreaterThan(0);
		expect(snap.recentEvents.length).toBeGreaterThan(0);

		vi.restoreAllMocks();
	});

	it('sorts channels by warning count then total', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		diag.emit('startup', 'state', 'boot', {});
		diag.emit('startup', 'state', 'ready', {});
		diag.emit('request', 'warn', 'slow-1', {});
		diag.emit('request', 'warn', 'slow-2', {});

		const snap = diag.snapshot();
		expect(snap.channels[0]!.channel).toBe('request');
		expect(snap.channels[0]!.warnCount).toBe(2);

		vi.restoreAllMocks();
	});
});

describe('ServerDiagnostics — summary', () => {
	it('returns quiet status when no recent events', () => {
		const diag = new ServerDiagnostics(createConfig());
		const sum = diag.summary();

		expect(sum.status).toBe('quiet');
		expect(sum.activeChannels).toHaveLength(0);
		expect(sum.eventRate.total).toBe(0);
	});

	it('returns active status with recent events', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', {});

		const sum = diag.summary();

		expect(sum.status).toBe('active');
		expect(sum.activeChannels).toContain('startup');
		expect(sum.eventRate.server).toBeGreaterThan(0);

		vi.restoreAllMocks();
	});

	it('returns warnings status when recent warnings exist', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('request', 'warn', 'error', { status: 500 });

		const sum = diag.summary();

		expect(sum.status).toBe('warnings');
		expect(sum.warningChannels).toContain('request');
		expect(sum.recentWarnings.length).toBeGreaterThan(0);

		vi.restoreAllMocks();
	});

	it('highlights missing client events', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', {});

		const sum = diag.summary();
		const noClientHighlight = sum.highlights.find((h) => h.includes('No client events'));
		expect(noClientHighlight).toBeDefined();

		vi.restoreAllMocks();
	});

	it('includes event rate breakdown', () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

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

		const sum = diag.summary();
		expect(sum.eventRate.server).toBeGreaterThan(0);
		expect(sum.eventRate.client).toBeGreaterThan(0);
		expect(sum.eventRate.total).toBe(sum.eventRate.server + sum.eventRate.client);

		vi.restoreAllMocks();
	});
});
