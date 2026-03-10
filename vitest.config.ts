import { defineConfig } from 'vitest/config';

/**
 * Vitest root configuration — the SINGLE source of truth for test discovery.
 *
 * TESTING CONTRACT:
 *   Framework : Vitest (discovery, execution, assertions, coverage)
 *   Launcher  : Bun scripts (`bun run test`, `bun run test:run`)
 *   Bun role  : Package manager + script runner ONLY — NOT a test runner here
 *
 * NEVER use `bun test` — that invokes Bun's built-in test runner, which is
 * NOT configured for this project.
 * NEVER import from `bun:test` — always import from `vitest`.
 *
 * DISCOVERY SCOPE:
 *   Each project restricts include to `src/**‌/*.test.ts` so only source tests
 *   run. Build artifacts (dist/) and dependency caches (node_modules/, .bun/)
 *   are explicitly excluded. Vitest 4 does NOT exclude dist/ by default.
 */
export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'shared',
					root: 'packages/shared',
					include: ['src/**/*.test.ts'],
					exclude: ['dist/**', 'node_modules/**'],
				},
			},
			{
				extends: true,
				test: {
					name: 'client',
					root: 'apps/client',
					include: ['src/**/*.test.ts'],
					exclude: ['dist/**', 'node_modules/**'],
				},
			},
			{
				extends: true,
				test: {
					name: 'server',
					root: 'apps/server',
					include: ['src/**/*.test.ts'],
					exclude: ['dist/**', 'node_modules/**'],
				},
			},
		],
	},
});
