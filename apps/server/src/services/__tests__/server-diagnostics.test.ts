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

describe('ServerDiagnostics', () => {
	it('stores emitted events in the ring buffer', () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', { version: '0.0.1' });
		const events = diag.query();
		expect(events).toHaveLength(1);
		expect(events[0]!.channel).toBe('startup');
		expect(events[0]!.label).toBe('boot');
		expect(events[0]!.seq).toBe(0);
	});

	it('does not emit when disabled', () => {
		const diag = new ServerDiagnostics(createConfig({ diagnosticsEnabled: false }));
		diag.emit('startup', 'state', 'boot', {});
		expect(diag.query()).toHaveLength(0);
	});

	it('rotates buffer when exceeding bufferSize', () => {
		const diag = new ServerDiagnostics(createConfig({ diagnosticsBufferSize: 100 }));
		for (let i = 0; i < 110; i++) {
			diag.emit('request', 'state', `req-${i}`, { i });
		}
		const events = diag.query();
		expect(events).toHaveLength(100);
		expect(events[0]!.label).toBe('req-10');
	});

	it('filters by channel', () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('startup', 'state', 'boot', {});
		diag.emit('request', 'state', 'GET /api/health', {});
		diag.emit('startup', 'state', 'ready', {});
		const filtered = diag.query({ channel: 'startup' });
		expect(filtered).toHaveLength(2);
	});

	it('respects last param', () => {
		const diag = new ServerDiagnostics(createConfig());
		diag.emit('request', 'state', 'req-1', {});
		diag.emit('request', 'state', 'req-2', {});
		diag.emit('request', 'state', 'req-3', {});
		const last = diag.query({ last: 2 });
		expect(last).toHaveLength(2);
		expect(last[0]!.label).toBe('req-2');
	});

	it('writes warn-level events to console.warn', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const diag = new ServerDiagnostics(createConfig());

		diag.emit('request', 'warn', 'slow-response', { ms: 5000 });
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(logSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
		logSpy.mockRestore();
	});
});
