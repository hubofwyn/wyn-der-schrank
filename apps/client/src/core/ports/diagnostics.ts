import type { DiagnosticChannel, DiagnosticLevel } from '@hub-of-wyn/shared';

/** Serialized diagnostic event — stored in ring buffer, emitted to console. */
export interface DiagnosticEvent {
	readonly frame: number;
	readonly timestamp: number;
	readonly channel: DiagnosticChannel;
	readonly level: DiagnosticLevel;
	readonly label: string;
	readonly data: Record<string, unknown>;
}

export interface IDiagnostics {
	/**
	 * Emit a structured diagnostic event.
	 * @param channel  Domain identifier (player, camera, physics, ...)
	 * @param level    Signal importance (state, debug, warn)
	 * @param label    Short event name (e.g. 'state-change', 'velocity')
	 * @param data     Serializable payload
	 */
	emit(
		channel: DiagnosticChannel,
		level: DiagnosticLevel,
		label: string,
		data: Record<string, unknown>,
	): void;

	/**
	 * Check if a channel+level combination is currently enabled.
	 * Callers SHOULD check this before constructing expensive payloads.
	 */
	isEnabled(channel: DiagnosticChannel, level: DiagnosticLevel): boolean;

	/**
	 * Query the ring buffer — returns the last N events matching a filter.
	 * Used by future HTTP endpoint and diagnostic overlay.
	 */
	query(filter?: {
		channel?: DiagnosticChannel;
		level?: DiagnosticLevel;
		last?: number;
	}): readonly DiagnosticEvent[];
}
