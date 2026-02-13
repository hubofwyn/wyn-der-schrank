import { GameEventSchema, SyncStateSchema } from '@hub-of-wyn/shared';
import { Hono } from 'hono';
import { loadConfig } from './config.js';
import { healthRoutes } from './routes/health.js';
import { ServerDiagnostics } from './services/server-diagnostics.js';

const config = loadConfig();
const diagnostics = new ServerDiagnostics(config);

const app = new Hono()
	.route('/', healthRoutes)
	.get('/api/state', (c) => {
		diagnostics.emit('request', 'state', 'GET /api/state', {
			method: 'GET',
			path: '/api/state',
		});
		const state = SyncStateSchema.parse({
			tick: 0,
			players: [],
			enemies: [],
			collectibles: [],
			timestamp: Date.now(),
		});
		return c.json({ data: state });
	})
	.post('/api/event', async (c) => {
		const body = await c.req.json();
		const result = GameEventSchema.safeParse(body);
		if (!result.success) {
			return c.json({ error: result.error.flatten() }, 400);
		}
		diagnostics.emit('request', 'state', 'POST /api/event', {
			method: 'POST',
			path: '/api/event',
			type: result.data.type,
		});
		return c.json({ ok: true });
	});

// Startup logging
console.log(`[WDS] Wyn der Schrank server v0.0.1`);
console.log(
	`[WDS] Port: ${config.port} | Env: ${config.env} | Diagnostics: ${config.diagnosticsEnabled ? `enabled (buffer: ${config.diagnosticsBufferSize})` : 'disabled'}`,
);

diagnostics.emit('startup', 'state', 'server-ready', {
	port: config.port,
	env: config.env,
	diagnosticsEnabled: config.diagnosticsEnabled,
});

export { diagnostics };
export type AppType = typeof app;
export default {
	port: config.port,
	fetch: app.fetch,
};
