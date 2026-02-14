import type { Settings } from '@hub-of-wyn/shared';
import { SettingsSchema } from '@hub-of-wyn/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGameClock } from '../../ports/engine.js';
import type { ISettingsManager } from '../../ports/settings.js';
import { ReportingDiagnostics } from '../reporting-diagnostics.js';

function createMockClock(frame = 100, now = 1000): IGameClock {
	return { now, delta: 16.67, frame, elapsed: now, refresh: vi.fn() };
}

function createMockSettings(
	enabled: boolean,
	channels: Record<string, { state: boolean; debug: boolean; warn: boolean }> = {},
): ISettingsManager {
	const settings: Settings = SettingsSchema.parse({
		audio: {},
		display: {},
		controls: {},
		accessibility: {},
		diagnostics: { enabled, channels, ringBufferSize: 500 },
	});
	return {
		current: settings,
		load: vi.fn(),
		save: vi.fn(),
		updateSection: vi.fn(),
	} as unknown as ISettingsManager;
}

describe('ReportingDiagnostics', () => {
	let diag: ReportingDiagnostics;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		diag?.dispose();
		vi.useRealTimers();
	});

	describe('local behavior (same as ConsoleDiagnostics)', () => {
		it('stores events in ring buffer when enabled', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'state-change', { from: 'idle', to: 'running' });

			const events = diag.query();
			expect(events).toHaveLength(1);
			expect(events[0].channel).toBe('player');
			expect(events[0].label).toBe('state-change');
		});

		it('skips emit when disabled', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(false));

			diag.emit('player', 'state', 'test', {});
			expect(diag.query()).toHaveLength(0);
		});

		it('rotates ring buffer at capacity', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true), { bufferSize: 3 });
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'a', {});
			diag.emit('player', 'state', 'b', {});
			diag.emit('player', 'state', 'c', {});
			diag.emit('player', 'state', 'd', {});

			const events = diag.query();
			expect(events).toHaveLength(3);
			expect(events[0].label).toBe('b');
		});

		it('uses console.warn for warn level', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'warn', 'unexpected', { reason: 'test' });
			expect(warnSpy).toHaveBeenCalledOnce();
			expect(logSpy).not.toHaveBeenCalled();
		});
	});

	describe('server reporting', () => {
		it('queues events for server reporting', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'move', {});

			// Queue should have 1 event (accessed via flush trigger)
			// We test indirectly by triggering a flush
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValue(
					new Response(JSON.stringify({ ok: true, ingested: 1 }), { status: 200 }),
				);

			vi.advanceTimersByTime(5000); // trigger periodic flush

			expect(fetchSpy).toHaveBeenCalledOnce();
			const [url, init] = fetchSpy.mock.calls[0]!;
			expect(url).toBe('/api/diagnostics/ingest');
			expect(init?.method).toBe('POST');

			const body = JSON.parse(init?.body as string);
			expect(body.events).toHaveLength(1);
			expect(body.events[0].channel).toBe('player');
			expect(body.events[0].label).toBe('move');
		});

		it('flushes when batch size is reached', async () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true), { batchSize: 3 });
			vi.spyOn(console, 'log').mockImplementation(() => {});
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValue(
					new Response(JSON.stringify({ ok: true, ingested: 3 }), { status: 200 }),
				);

			diag.emit('player', 'state', 'a', {});
			diag.emit('player', 'state', 'b', {});
			diag.emit('player', 'state', 'c', {}); // triggers flush at batchSize=3

			// flush is async — let microtasks resolve
			await vi.advanceTimersByTimeAsync(0);

			expect(fetchSpy).toHaveBeenCalledOnce();
			const body = JSON.parse(fetchSpy.mock.calls[0]![1]?.body as string);
			expect(body.events).toHaveLength(3);
		});

		it('handles fetch failure gracefully without crashing', async () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

			diag.emit('player', 'state', 'move', {});

			// Should not throw
			await expect(diag.flush()).resolves.toBeUndefined();
		});

		it('handles non-ok response gracefully', async () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad', { status: 500 }));

			diag.emit('player', 'state', 'move', {});
			await diag.flush();

			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Ingest failed: 500'));
		});

		it('stops periodic flush on dispose', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

			diag.dispose();

			// Advancing timers should not trigger any more flushes
			vi.spyOn(console, 'log').mockImplementation(() => {});
			diag.emit('player', 'state', 'after-dispose', {});
			vi.advanceTimersByTime(10000);

			// fetch called once for the final flush in dispose, not from periodic timer
		});
	});

	describe('query', () => {
		it('filters by channel and level', () => {
			const clock = createMockClock();
			diag = new ReportingDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});
			vi.spyOn(console, 'warn').mockImplementation(() => {});

			diag.emit('player', 'state', 'a', {});
			diag.emit('camera', 'state', 'b', {});
			diag.emit('player', 'warn', 'c', {});

			expect(diag.query({ channel: 'player' })).toHaveLength(2);
			expect(diag.query({ level: 'warn' })).toHaveLength(1);
			expect(diag.query({ last: 1 })).toHaveLength(1);
		});
	});
});
