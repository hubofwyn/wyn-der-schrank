import type { DiagnosticChannel, DiagnosticLevel } from '@hub-of-wyn/shared';
import type { ServerConfig } from '../config.js';

export interface ServerDiagnosticEvent {
	readonly seq: number;
	readonly timestamp: number;
	readonly channel: DiagnosticChannel;
	readonly level: DiagnosticLevel;
	readonly label: string;
	readonly data: Record<string, unknown>;
}

export class ServerDiagnostics {
	private readonly buffer: ServerDiagnosticEvent[] = [];
	private seq = 0;
	private readonly enabled: boolean;
	private readonly bufferSize: number;

	constructor(config: ServerConfig) {
		this.enabled = config.diagnosticsEnabled;
		this.bufferSize = config.diagnosticsBufferSize;
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

		this.buffer.push(event);
		if (this.buffer.length > this.bufferSize) {
			this.buffer.shift();
		}

		const prefix = `[WDS:${channel}:${level}]`;
		const json = JSON.stringify({ seq: event.seq, label, data });
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
	}): readonly ServerDiagnosticEvent[] {
		let result: ServerDiagnosticEvent[] = this.buffer;
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
