import type {
	ClientDiagnosticEvent,
	DiagnosticChannel,
	DiagnosticLevel,
	DiagnosticSource,
} from '@hub-of-wyn/shared';
import type { ServerConfig } from '../config.js';

export interface ServerDiagnosticEvent {
	readonly seq: number;
	readonly timestamp: number;
	readonly channel: DiagnosticChannel;
	readonly level: DiagnosticLevel;
	readonly label: string;
	readonly data: Record<string, unknown>;
}

/** Unified event shape returned by query methods — includes source origin. */
export interface UnifiedDiagnosticEvent {
	readonly source: DiagnosticSource;
	readonly seq: number;
	readonly timestamp: number;
	readonly channel: DiagnosticChannel;
	readonly level: DiagnosticLevel;
	readonly label: string;
	readonly data: Record<string, unknown>;
}

/** Per-channel activity summary for snapshot/summary endpoints. */
export interface ChannelActivity {
	readonly channel: DiagnosticChannel;
	readonly total: number;
	readonly lastEvent: UnifiedDiagnosticEvent | null;
	readonly warnCount: number;
}

/** Full system diagnostic snapshot. */
export interface DiagnosticSnapshot {
	readonly serverUptime: number;
	readonly serverSeq: number;
	readonly clientEventsIngested: number;
	readonly bufferCapacity: { server: number; client: number };
	readonly bufferUsage: { server: number; client: number };
	readonly channels: ChannelActivity[];
	readonly recentWarnings: readonly UnifiedDiagnosticEvent[];
	readonly recentEvents: readonly UnifiedDiagnosticEvent[];
}

/** AI-readable diagnostic summary. */
export interface DiagnosticSummary {
	readonly status: 'quiet' | 'active' | 'warnings';
	readonly description: string;
	readonly activeChannels: string[];
	readonly warningChannels: string[];
	readonly highlights: string[];
	readonly eventRate: { server: number; client: number; total: number };
	readonly recentWarnings: readonly UnifiedDiagnosticEvent[];
}

export class ServerDiagnostics {
	private readonly serverBuffer: ServerDiagnosticEvent[] = [];
	private readonly clientBuffer: UnifiedDiagnosticEvent[] = [];
	private seq = 0;
	private clientIngestCount = 0;
	private readonly enabled: boolean;
	private readonly bufferSize: number;
	private readonly startTime: number;

	constructor(config: ServerConfig) {
		this.enabled = config.diagnosticsEnabled;
		this.bufferSize = config.diagnosticsBufferSize;
		this.startTime = Date.now();
	}

	emit(
		channel: DiagnosticChannel,
		level: DiagnosticLevel,
		label: string,
		data: Record<string, unknown>,
	): void {
		if (!this.enabled) return;

		const event: ServerDiagnosticEvent = {
			seq: this.seq++,
			timestamp: Date.now(),
			channel,
			level,
			label,
			data,
		};

		this.serverBuffer.push(event);
		if (this.serverBuffer.length > this.bufferSize) {
			this.serverBuffer.shift();
		}

		const prefix = `[WDS:${channel}:${level}]`;
		const json = JSON.stringify({ seq: event.seq, label, data });
		if (level === 'warn') {
			console.warn(prefix, json);
		} else {
			console.log(prefix, json);
		}
	}

	/** Accept a batch of client-forwarded diagnostic events. */
	ingestClientEvents(events: readonly ClientDiagnosticEvent[]): number {
		if (!this.enabled) return 0;

		let ingested = 0;
		for (const raw of events) {
			const unified: UnifiedDiagnosticEvent = {
				source: 'client',
				seq: this.seq++,
				timestamp: raw.timestamp,
				channel: raw.channel,
				level: raw.level,
				label: raw.label,
				data: raw.data,
			};

			this.clientBuffer.push(unified);
			if (this.clientBuffer.length > this.bufferSize) {
				this.clientBuffer.shift();
			}

			ingested++;
		}

		this.clientIngestCount += ingested;
		return ingested;
	}

	/** Query server-only events (backward compatible). */
	query(filter?: {
		channel?: DiagnosticChannel;
		level?: DiagnosticLevel;
		last?: number;
	}): readonly ServerDiagnosticEvent[] {
		let result: ServerDiagnosticEvent[] = this.serverBuffer;
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

	/** Query unified events across both client and server buffers. */
	unifiedQuery(filter?: {
		source?: DiagnosticSource;
		channel?: DiagnosticChannel;
		level?: DiagnosticLevel;
		last?: number;
	}): readonly UnifiedDiagnosticEvent[] {
		const serverEvents: UnifiedDiagnosticEvent[] = this.serverBuffer.map((e) => ({
			source: 'server' as const,
			...e,
		}));

		let combined: UnifiedDiagnosticEvent[];

		if (filter?.source === 'server') {
			combined = serverEvents;
		} else if (filter?.source === 'client') {
			combined = [...this.clientBuffer];
		} else {
			combined = [...serverEvents, ...this.clientBuffer].sort((a, b) => a.timestamp - b.timestamp);
		}

		if (filter?.channel) {
			combined = combined.filter((e) => e.channel === filter.channel);
		}
		if (filter?.level) {
			combined = combined.filter((e) => e.level === filter.level);
		}
		if (filter?.last) {
			combined = combined.slice(-filter.last);
		}

		return combined;
	}

	/** Full system diagnostic snapshot for agent consumption. */
	snapshot(): DiagnosticSnapshot {
		const allEvents = this.unifiedQuery();
		const channelSet = new Set<DiagnosticChannel>();
		for (const e of allEvents) {
			channelSet.add(e.channel);
		}

		const channels: ChannelActivity[] = [];
		for (const ch of channelSet) {
			const chEvents = allEvents.filter((e) => e.channel === ch);
			channels.push({
				channel: ch,
				total: chEvents.length,
				lastEvent: chEvents.length > 0 ? chEvents[chEvents.length - 1]! : null,
				warnCount: chEvents.filter((e) => e.level === 'warn').length,
			});
		}

		channels.sort((a, b) => {
			if (a.warnCount !== b.warnCount) return b.warnCount - a.warnCount;
			return b.total - a.total;
		});

		return {
			serverUptime: Math.floor((Date.now() - this.startTime) / 1000),
			serverSeq: this.seq,
			clientEventsIngested: this.clientIngestCount,
			bufferCapacity: { server: this.bufferSize, client: this.bufferSize },
			bufferUsage: { server: this.serverBuffer.length, client: this.clientBuffer.length },
			channels,
			recentWarnings: this.unifiedQuery({ level: 'warn', last: 20 }),
			recentEvents: this.unifiedQuery({ last: 50 }),
		};
	}

	/** AI-readable diagnostic summary. */
	summary(): DiagnosticSummary {
		const allEvents = this.unifiedQuery();
		const now = Date.now();
		const windowMs = 60_000; // last 60 seconds

		const recentAll = allEvents.filter((e) => e.timestamp > now - windowMs);
		const recentWarnings = recentAll.filter((e) => e.level === 'warn');

		const activeChannels = new Set<string>();
		const warningChannels = new Set<string>();
		for (const e of recentAll) {
			activeChannels.add(e.channel);
			if (e.level === 'warn') warningChannels.add(e.channel);
		}

		const recentServer = recentAll.filter((e) => e.source === 'server').length;
		const recentClient = recentAll.filter((e) => e.source === 'client').length;

		const highlights: string[] = [];

		if (recentWarnings.length > 0) {
			highlights.push(
				`${recentWarnings.length} warning(s) in the last 60s across: ${[...warningChannels].join(', ')}`,
			);
		}

		// Find state transitions as notable events
		const stateChanges = recentAll.filter((e) => e.level === 'state' && e.label.includes('change'));
		if (stateChanges.length > 0) {
			highlights.push(`${stateChanges.length} state transition(s) in the last 60s`);
		}

		if (this.clientIngestCount === 0 && this.serverBuffer.length > 0) {
			highlights.push('No client events ingested yet — client may not be forwarding diagnostics');
		}

		let status: 'quiet' | 'active' | 'warnings';
		if (recentWarnings.length > 0) {
			status = 'warnings';
		} else if (recentAll.length > 0) {
			status = 'active';
		} else {
			status = 'quiet';
		}

		const description =
			status === 'warnings'
				? `System has ${recentWarnings.length} active warning(s). Investigate ${[...warningChannels].join(', ')} channel(s).`
				: status === 'active'
					? `System running normally. ${recentAll.length} events in last 60s across ${activeChannels.size} channel(s).`
					: 'No diagnostic activity in the last 60 seconds.';

		return {
			status,
			description,
			activeChannels: [...activeChannels],
			warningChannels: [...warningChannels],
			highlights,
			eventRate: {
				server: recentServer,
				client: recentClient,
				total: recentAll.length,
			},
			recentWarnings: recentWarnings.slice(-10),
		};
	}
}
