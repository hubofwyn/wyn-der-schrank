import type { Settings } from '@wds/shared';
import { SettingsSchema } from '@wds/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGameClock } from '../../ports/engine.js';
import type { ISettingsManager } from '../../ports/settings.js';
import { ConsoleDiagnostics } from '../console-diagnostics.js';

function createMockClock(frame = 100, now = 1000): IGameClock {
	return { now, delta: 16.67, frame, elapsed: now };
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

describe('ConsoleDiagnostics', () => {
	let clock: IGameClock;
	let diag: ConsoleDiagnostics;

	beforeEach(() => {
		clock = createMockClock();
		vi.restoreAllMocks();
	});

	describe('isEnabled', () => {
		it('returns false when diagnostics is disabled', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(false));
			expect(diag.isEnabled('player', 'state')).toBe(false);
			expect(diag.isEnabled('player', 'debug')).toBe(false);
			expect(diag.isEnabled('player', 'warn')).toBe(false);
		});

		it('returns true for state and warn by default when enabled', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true));
			expect(diag.isEnabled('player', 'state')).toBe(true);
			expect(diag.isEnabled('player', 'warn')).toBe(true);
			expect(diag.isEnabled('player', 'debug')).toBe(false);
		});

		it('respects per-channel config overrides', () => {
			diag = new ConsoleDiagnostics(
				clock,
				createMockSettings(true, {
					player: { state: false, debug: true, warn: true },
				}),
			);
			expect(diag.isEnabled('player', 'state')).toBe(false);
			expect(diag.isEnabled('player', 'debug')).toBe(true);
			expect(diag.isEnabled('camera', 'state')).toBe(true); // default
		});
	});

	describe('emit', () => {
		it('stores events in ring buffer when enabled', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'state-change', { from: 'idle', to: 'running' });

			const events = diag.query();
			expect(events).toHaveLength(1);
			expect(events[0].channel).toBe('player');
			expect(events[0].level).toBe('state');
			expect(events[0].label).toBe('state-change');
			expect(events[0].data).toEqual({ from: 'idle', to: 'running' });
			expect(events[0].frame).toBe(100);
		});

		it('skips emit when channel+level is disabled', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(false));

			diag.emit('player', 'state', 'state-change', { from: 'idle', to: 'running' });

			expect(diag.query()).toHaveLength(0);
		});

		it('rotates ring buffer at capacity', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true), 3);
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'a', {});
			diag.emit('player', 'state', 'b', {});
			diag.emit('player', 'state', 'c', {});
			diag.emit('player', 'state', 'd', {});

			const events = diag.query();
			expect(events).toHaveLength(3);
			expect(events[0].label).toBe('b');
			expect(events[2].label).toBe('d');
		});

		it('uses console.warn for warn level', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true));
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'warn', 'unexpected', { reason: 'test' });

			expect(warnSpy).toHaveBeenCalledOnce();
			expect(logSpy).not.toHaveBeenCalled();
		});
	});

	describe('query', () => {
		it('filters by channel', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'a', {});
			diag.emit('camera', 'state', 'b', {});
			diag.emit('player', 'state', 'c', {});

			const playerEvents = diag.query({ channel: 'player' });
			expect(playerEvents).toHaveLength(2);
			expect(playerEvents[0].label).toBe('a');
			expect(playerEvents[1].label).toBe('c');
		});

		it('limits results with last parameter', () => {
			diag = new ConsoleDiagnostics(clock, createMockSettings(true));
			vi.spyOn(console, 'log').mockImplementation(() => {});

			diag.emit('player', 'state', 'a', {});
			diag.emit('player', 'state', 'b', {});
			diag.emit('player', 'state', 'c', {});

			const recent = diag.query({ last: 2 });
			expect(recent).toHaveLength(2);
			expect(recent[0].label).toBe('b');
			expect(recent[1].label).toBe('c');
		});
	});
});
