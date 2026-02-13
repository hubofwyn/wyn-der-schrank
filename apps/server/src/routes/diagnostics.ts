import type { DiagnosticChannel, DiagnosticLevel } from '@hub-of-wyn/shared';
import { Hono } from 'hono';
import type { ServerDiagnostics } from '../services/server-diagnostics.js';

export function createDiagnosticsRoutes(diagnostics: ServerDiagnostics) {
	return new Hono().get('/api/diagnostics', (c) => {
		const channel = c.req.query('channel') as DiagnosticChannel | undefined;
		const level = c.req.query('level') as DiagnosticLevel | undefined;
		const lastRaw = c.req.query('last');
		const last = lastRaw ? Number.parseInt(lastRaw, 10) : undefined;

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
	});
}
