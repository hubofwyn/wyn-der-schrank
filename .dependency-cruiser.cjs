/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	options: {
		doNotFollow: {
			path: 'node_modules',
		},
	},
	forbidden: [
		{
			name: 'modules-no-phaser',
			severity: 'error',
			comment: 'Modules must be engine-agnostic',
			from: { path: 'apps/client/src/modules' },
			to: { path: 'node_modules/phaser' },
		},
		{
			name: 'modules-no-scenes',
			severity: 'error',
			comment: 'Modules cannot import from view layer',
			from: { path: 'apps/client/src/modules' },
			to: { path: 'apps/client/src/scenes' },
		},
		{
			name: 'modules-no-adapters',
			severity: 'error',
			comment: 'Modules use ports, not concrete adapters',
			from: { path: 'apps/client/src/modules' },
			to: { path: 'apps/client/src/core/adapters' },
		},
		{
			name: 'scenes-no-server',
			severity: 'error',
			comment: 'Scenes must use NetworkManager, not raw server',
			from: { path: 'apps/client/src/scenes' },
			to: { path: 'apps/server' },
		},
		{
			name: 'shared-no-app-deps',
			severity: 'error',
			comment: 'Shared package must be dependency-free (except Zod)',
			from: { path: 'packages/shared' },
			to: { path: ['apps/client', 'apps/server', 'node_modules/phaser', 'node_modules/hono'] },
		},
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'No circular dependencies anywhere',
			from: {},
			to: { circular: true },
		},
	],
};
