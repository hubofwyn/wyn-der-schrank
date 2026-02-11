import { GameEventSchema, SyncStateSchema } from '@wds/shared';
import { Hono } from 'hono';

const app = new Hono()
	.get('/api/state', (c) => {
		// TODO: Replace with real game session
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
		// TODO: Handle event via game session
		console.log('Event received:', result.data);
		return c.json({ ok: true });
	});

export type AppType = typeof app;
export default app;
