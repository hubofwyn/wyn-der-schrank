import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
	plugins: [
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Wyn der Schrank',
				short_name: 'WdS',
				description: 'A platformer adventure game',
				start_url: '/',
				display: 'standalone',
				orientation: 'landscape',
				theme_color: '#1a1a2e',
				background_color: '#1a1a2e',
				icons: [
					{
						src: 'assets/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'assets/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'assets/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,ogg,json}'],
				runtimeCaching: [
					{
						urlPattern: /^https?:\/\/.*\/api\//,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: { maxEntries: 50, maxAgeSeconds: 300 },
						},
					},
				],
			},
		}),
	],
});
