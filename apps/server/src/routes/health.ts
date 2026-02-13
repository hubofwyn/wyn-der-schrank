import { Hono } from 'hono';

const startTime = Date.now();

export const healthRoutes = new Hono().get('/api/health', (c) => {
	return c.json({
		status: 'ok',
		version: '0.0.1',
		uptime: Math.floor((Date.now() - startTime) / 1000),
		environment: process.env.NODE_ENV ?? 'development',
		timestamp: Date.now(),
	});
});
