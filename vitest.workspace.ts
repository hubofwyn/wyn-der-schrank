import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	{
		test: {
			name: 'shared',
			root: 'packages/shared',
			include: ['src/**/*.test.ts'],
			exclude: ['**/dist/**', '**/node_modules/**'],
		},
	},
	{
		test: {
			name: 'client',
			root: 'apps/client',
			include: ['src/**/*.test.ts'],
			exclude: ['**/dist/**', '**/node_modules/**'],
		},
	},
	{
		test: {
			name: 'server',
			root: 'apps/server',
			include: ['src/**/*.test.ts'],
			exclude: ['**/dist/**', '**/node_modules/**'],
		},
	},
]);
