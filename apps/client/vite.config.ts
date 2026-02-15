import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		port: 3000,
	},
	build: {
		target: 'ES2024',
		outDir: 'dist',
	},
	resolve: {
		alias: {
			// Phaser 4 rc.6 ESM build uses named exports but does NOT set
			// globalThis.Phaser. The CJS/browser build (dist/phaser.js) does.
			// Force Vite to use the browser build so `Phaser.Scene` etc. work.
			phaser: 'phaser/dist/phaser.js',
		},
	},
});
