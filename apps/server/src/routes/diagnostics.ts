import {
	ClientDiagnosticPayloadSchema,
	type DiagnosticChannel,
	type DiagnosticLevel,
	type DiagnosticSource,
} from '@hub-of-wyn/shared';
import { Hono } from 'hono';
import type { ServerDiagnostics } from '../services/server-diagnostics.js';

export function createDiagnosticsRoutes(diagnostics: ServerDiagnostics) {
	return new Hono()
		.get('/api/diagnostics', (c) => {
			const source = c.req.query('source') as DiagnosticSource | undefined;
			const channel = c.req.query('channel') as DiagnosticChannel | undefined;
			const level = c.req.query('level') as DiagnosticLevel | undefined;
			const lastRaw = c.req.query('last');
			const last = lastRaw ? Number.parseInt(lastRaw, 10) : undefined;

			// Use unified query when source is specified or when both buffers are wanted
			if (source || c.req.query('unified') === 'true') {
				const uFilter: {
					source?: DiagnosticSource;
					channel?: DiagnosticChannel;
					level?: DiagnosticLevel;
					last?: number;
				} = {};
				if (source) uFilter.source = source;
				if (channel) uFilter.channel = channel;
				if (level) uFilter.level = level;
				if (last !== undefined) uFilter.last = last;
				const events = diagnostics.unifiedQuery(uFilter);
				return c.json({ events });
			}

			// Backward-compatible: server-only events when no source specified
			const filter: {
				channel?: DiagnosticChannel;
				level?: DiagnosticLevel;
				last?: number;
			} = {};
			if (channel) filter.channel = channel;
			if (level) filter.level = level;
			if (last !== undefined) filter.last = last;

			const events = diagnostics.query(filter);
			return c.json({ events });
		})
		.post('/api/diagnostics/ingest', async (c) => {
			const body = await c.req.json();
			const result = ClientDiagnosticPayloadSchema.safeParse(body);

			if (!result.success) {
				diagnostics.emit('request', 'warn', 'ingest-validation-failed', {
					error: result.error.message,
				});
				return c.json({ error: 'Invalid payload', details: result.error.flatten() }, 400);
			}

			const ingested = diagnostics.ingestClientEvents(result.data.events);
			diagnostics.emit('request', 'debug', 'client-events-ingested', {
				count: ingested,
			});

			return c.json({ ok: true, ingested });
		})
		.get('/api/diagnostics/snapshot', (c) => {
			const snap = diagnostics.snapshot();
			return c.json(snap);
		})
		.get('/api/diagnostics/summary', (c) => {
			const sum = diagnostics.summary();
			return c.json(sum);
		});
}
