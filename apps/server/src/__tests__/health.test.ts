import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { healthRoutes } from '../routes/health.js';

describe('GET /api/health', () => {
	const app = new Hono().route('/', healthRoutes);

	it('returns status ok', async () => {
		const res = await app.request('/api/health');
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe('ok');
	});

	it('includes all required fields', async () => {
		const res = await app.request('/api/health');
		const body = await res.json();
		expect(body).toHaveProperty('version');
		expect(body).toHaveProperty('uptime');
		expect(body).toHaveProperty('environment');
		expect(body).toHaveProperty('timestamp');
		expect(typeof body.uptime).toBe('number');
		expect(typeof body.timestamp).toBe('number');
	});

	it('returns version 0.0.1', async () => {
		const res = await app.request('/api/health');
		const body = await res.json();
		expect(body.version).toBe('0.0.1');
	});
});
