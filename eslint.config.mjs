import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	// 1. Base Setup
	{
		languageOptions: {
			ecmaVersion: 2026,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: true },
			globals: { ...globals.browser, ...globals.node },
		},
		linterOptions: { reportUnusedDisableDirectives: true },
	},

	// Test files — use the test tsconfig that includes __tests__ and __test-utils__
	{
		files: ['apps/client/src/**/__tests__/**/*.ts', 'apps/client/src/**/__test-utils__/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: './apps/client/tsconfig.test.json',
			},
		},
	},

	// 2. ZONE: MODULES — Pure TypeScript. No engine, no browser, no backdoors.
	{
		files: ['apps/client/src/modules/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'phaser',
							message:
								'ZONE VIOLATION: modules/ must be engine-agnostic. Import from core/ports/ instead.',
						},
					],
					patterns: [
						{
							group: ['**/scenes/*'],
							message: 'ZONE VIOLATION: modules/ cannot access view layer.',
						},
						{
							group: ['**/adapters/*'],
							message: 'ZONE VIOLATION: modules/ must use ports/, not concrete adapters.',
						},
					],
				},
			],
			'no-restricted-globals': [
				'error',
				{ name: 'Phaser', message: 'Global Phaser access is forbidden in modules/.' },
				{ name: 'window', message: 'Global window access is forbidden in modules/.' },
				{ name: 'document', message: 'Direct DOM access is forbidden in modules/.' },
				{ name: 'requestAnimationFrame', message: 'Use IGameClock from core/ports/ instead.' },
			],
		},
	},

	// 3. ZONE: SCENES — Phaser allowed, but no raw server access.
	{
		files: ['apps/client/src/scenes/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/server/*', 'hono/*'],
							message:
								'ZONE VIOLATION: scenes/ must use NetworkManager from core/, not raw server code.',
						},
					],
				},
			],
		},
	},

	// 4. ZONE: CORE — Privileged. The only place where "dirty work" happens.
	{
		files: ['apps/client/src/core/**/*.ts'],
		rules: {
			'no-restricted-imports': 'off',
			'no-restricted-globals': 'off',
		},
	},

	// 5. ZONE: SHARED — No runtime dependencies except Zod.
	{
		files: ['packages/shared/src/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['phaser', 'hono', '**/client/*', '**/server/*'],
							message: 'ZONE VIOLATION: shared/ must have zero app dependencies.',
						},
					],
				},
			],
		},
	},
);
