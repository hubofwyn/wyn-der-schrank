// Wyn der Schrank — Composition Root
// All services are wired here and ONLY here.
// See core/container.ts for the Container interface.

import { BootScene } from './scenes/boot-scene.js';
import { PlatformerScene } from './scenes/platformer-scene.js';

new Phaser.Game({
	type: Phaser.AUTO,
	width: 1280,
	height: 720,
	parent: document.body,
	pixelArt: true,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { x: 0, y: 800 },
			fixedStep: true,
			fps: 60,
			debug: false,
		},
	},
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [BootScene, PlatformerScene],
});
