import type { DiagnosticChannel, DiagnosticLevel } from '@wds/shared';
import type { DiagnosticEvent, IDiagnostics } from '../ports/diagnostics.js';
import type { IGameClock } from '../ports/engine.js';
import type { ISettingsManager } from '../ports/settings.js';

/**
 * Development diagnostics adapter.
 *
 * - Writes single-line prefixed JSON to console (greppable by channel/level).
 * - Maintains a ring buffer of recent events for query() and browser console access.
 * - Reads channel config from settingsManager.current.diagnostics at emit time.
 */
export class ConsoleDiagnostics implements IDiagnostics {
	private readonly buffer: DiagnosticEvent[] = [];

	constructor(
		private readonly clock: IGameClock,
		private readonly settings: ISettingsManager,
		private readonly bufferSize: number = 500,
	) {
		if (typeof window !== 'undefined') {
			(window as unknown as Record<string, unknown>).__wds_diagnostics = this.buffer;
		}
	}

	isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean {
		const config = this.settings.current.diagnostics;
		if (!config.enabled) return false;
		const channelConfig = config.channels[channel];
		if (!channelConfig) return level !== 'debug'; // default: state+warn on
		return channelConfig[level];
	}

	emit(
		channel: DiagnosticChannel,
		level: DiagnosticLevel,
		label: string,
		data: Record<string, unknown>,
	): void {
		if (!this.isEnabled(channel, level)) return;

		const event: DiagnosticEvent = {
			frame: this.clock.frame,
			timestamp: this.clock.now,
			channel,
			level,
			label,
			data,
		};

		// Ring buffer
		this.buffer.push(event);
		if (this.buffer.length > this.bufferSize) {
			this.buffer.shift();
		}

		// Console output — single-line prefixed JSON for terminal grep
		const prefix = `[WDS:${channel}:${level}]`;
		const json = JSON.stringify({ frame: event.frame, label, data });
		if (level === 'warn') {
			console.warn(prefix, json);
		} else {
			console.log(prefix, json);
		}
	}

	query(filter?: {
		channel?: DiagnosticChannel;
		level?: DiagnosticLevel;
		last?: number;
	}): readonly DiagnosticEvent[] {
		let result: DiagnosticEvent[] = this.buffer;
		if (filter?.channel) {
			result = result.filter((e) => e.channel === filter.channel);
		}
		if (filter?.level) {
			result = result.filter((e) => e.level === filter.level);
		}
		if (filter?.last) {
			result = result.slice(-filter.last);
		}
		return result;
	}
}
