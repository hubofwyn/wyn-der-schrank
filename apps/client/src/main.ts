// Wyn der Schrank — Composition Root
// All services are wired here and ONLY here.
// See core/container.ts for the Container interface.

import { NoopAudio } from './core/adapters/noop-audio.js';
import { NoopInput } from './core/adapters/noop-input.js';
import { NoopNetwork } from './core/adapters/noop-network.js';
import { NoopPhysics } from './core/adapters/noop-physics.js';
import { NoopStorage } from './core/adapters/noop-storage.js';
import { PhaserClock } from './core/adapters/phaser-clock.js';
import type { Container } from './core/container.js';
import { BootScene } from './scenes/boot-scene.js';
import { GameOverScene } from './scenes/game-over-scene.js';
import { HudScene } from './scenes/hud-scene.js';
import { LevelCompleteScene } from './scenes/level-complete-scene.js';
import { PlatformerScene } from './scenes/platformer-scene.js';
import { PreloadScene } from './scenes/preload-scene.js';

/**
 * Build the DI container with all infrastructure services.
 *
 * Scene-scoped adapters (input, physics body) are created per-scene
 * in their create() methods. The root container holds noop instances
 * for those ports — they satisfy the interface without real behavior.
 */
function createContainer(): Container {
	const clock = new PhaserClock();
	const input = new NoopInput();
	const audio = new NoopAudio();
	const physics = new NoopPhysics();
	const network = new NoopNetwork();
	const storage = new NoopStorage();

	return {
		clock,
		input,
		audio,
		physics,
		network,
		storage,
	};
}

const game = new Phaser.Game({
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
	scene: [BootScene, PreloadScene, PlatformerScene, HudScene, LevelCompleteScene, GameOverScene],
});

game.registry.set('container', createContainer());
