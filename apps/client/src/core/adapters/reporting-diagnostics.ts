import type { DiagnosticChannel, DiagnosticLevel } from '@hub-of-wyn/shared';
import type { DiagnosticEvent, IDiagnostics } from '../ports/diagnostics.js';
import type { IGameClock } from '../ports/engine.js';
import type { ISettingsManager } from '../ports/settings.js';

interface ReportingConfig {
	/** Max events to queue before flushing. Default: 50. */
	readonly batchSize: number;
	/** Milliseconds between periodic flushes. Default: 5000. */
	readonly flushIntervalMs: number;
	/** Server ingest endpoint URL. Default: '/api/diagnostics/ingest'. */
	readonly endpoint: string;
	/** Ring buffer capacity. Default: 500. */
	readonly bufferSize: number;
}

const DEFAULT_CONFIG: ReportingConfig = {
	batchSize: 50,
	flushIntervalMs: 5000,
	endpoint: '/api/diagnostics/ingest',
	bufferSize: 500,
};

/**
 * Development diagnostics adapter with server-side reporting.
 *
 * Extends the ConsoleDiagnostics pattern:
 * - Writes single-line prefixed JSON to browser console
 * - Maintains a local ring buffer (queryable via query() and window.__wds_diagnostics)
 * - Batches events and forwards them to the server for agent-accessible querying
 *
 * Agents running in the terminal can then query client events via:
 *   curl localhost:3001/api/diagnostics?source=client
 *   curl localhost:3001/api/diagnostics/snapshot
 *   curl localhost:3001/api/diagnostics/summary
 */
export class ReportingDiagnostics implements IDiagnostics {
	private readonly buffer: DiagnosticEvent[] = [];
	private readonly sendQueue: DiagnosticEvent[] = [];
	private readonly config: ReportingConfig;
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private flushInProgress = false;

	constructor(
		private readonly clock: IGameClock,
		private readonly settings: ISettingsManager,
		config?: Partial<ReportingConfig>,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		if (typeof window !== 'undefined') {
			(window as unknown as Record<string, unknown>).__wds_diagnostics = this.buffer;
		}

		this.startPeriodicFlush();
	}

	isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean {
		const config = this.settings.current.diagnostics;
		if (!config.enabled) return false;
		const channelConfig = config.channels[channel];
		if (!channelConfig) return level !== 'debug';
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

		// Local ring buffer
		this.buffer.push(event);
		if (this.buffer.length > this.config.bufferSize) {
			this.buffer.shift();
		}

		// Console output
		const prefix = `[WDS:${channel}:${level}]`;
		const json = JSON.stringify({ frame: event.frame, label, data });
		if (level === 'warn') {
			console.warn(prefix, json);
		} else {
			console.log(prefix, json);
		}

		// Queue for server reporting
		this.sendQueue.push(event);
		if (this.sendQueue.length >= this.config.batchSize) {
			void this.flush();
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

	/** Flush queued events to the server. Called automatically. */
	async flush(): Promise<void> {
		if (this.sendQueue.length === 0 || this.flushInProgress) return;

		// Drain queue into a local batch
		const batch = this.sendQueue.splice(0, this.config.batchSize);
		this.flushInProgress = true;

		try {
			const response = await fetch(this.config.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					events: batch.map((e) => ({
						frame: e.frame,
						timestamp: e.timestamp,
						channel: e.channel,
						level: e.level,
						label: e.label,
						data: e.data,
					})),
				}),
			});

			if (!response.ok) {
				// Drop events silently — diagnostics must not crash the game
				console.warn(`[WDS:diagnostics:warn] Ingest failed: ${response.status}`);
			}
		} catch {
			// Network error — drop events, don't retry, don't crash
			// This is expected when the server isn't running
		} finally {
			this.flushInProgress = false;
		}

		// If more events accumulated during flush, trigger another
		if (this.sendQueue.length >= this.config.batchSize) {
			void this.flush();
		}
	}

	/** Stop periodic flushing. Call on cleanup/dispose. */
	dispose(): void {
		if (this.flushTimer !== null) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		// Final flush attempt
		void this.flush();
	}

	private startPeriodicFlush(): void {
		if (typeof setInterval !== 'undefined') {
			this.flushTimer = setInterval(() => {
				void this.flush();
			}, this.config.flushIntervalMs);
		}
	}
}
