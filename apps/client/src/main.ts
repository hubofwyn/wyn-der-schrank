// Wyn der Schrank — Composition Root
// All services are wired here and ONLY here.
// See core/container.ts for the Container interface.

import { NoopAudio } from './core/adapters/noop-audio.js';
import { NoopNetwork } from './core/adapters/noop-network.js';
import { NoopStorage } from './core/adapters/noop-storage.js';
import { PhaserClock } from './core/adapters/phaser-clock.js';
import type { Container } from './core/container.js';
import type { IInputProvider } from './core/ports/input.js';
import type { IPhysicsWorld } from './core/ports/physics.js';
import { BootScene } from './scenes/boot-scene.js';
import { PlatformerScene } from './scenes/platformer-scene.js';
import { PreloadScene } from './scenes/preload-scene.js';

/**
 * Build the DI container with all infrastructure services.
 *
 * Scene-scoped adapters (input, physics body) are created per-scene
 * in their create() methods. The root container holds noop stubs for
 * those ports — they exist only to satisfy the interface contract.
 */
function createContainer(): Container {
	const clock = new PhaserClock();
	const audio = new NoopAudio();
	const network = new NoopNetwork();
	const storage = new NoopStorage();

	// Scene-scoped stubs — PlatformerScene creates real adapters in create().
	const input: IInputProvider = {
		update() {},
		isDown() {
			return false;
		},
		justPressed() {
			return false;
		},
		justReleased() {
			return false;
		},
		getAxis() {
			return 0;
		},
		isTouchActive: false,
		isGamepadConnected: false,
		getBinding() {
			return '';
		},
		setBinding() {},
		resetBindings() {},
	};

	const physics: IPhysicsWorld = {
		createBody() {
			throw new Error('Root physics stub — use PlatformerScope');
		},
		removeBody() {},
		overlap() {
			return false;
		},
		overlapGroup() {
			return [];
		},
		collide() {
			return false;
		},
		raycast() {
			return null;
		},
		setGravity() {},
		gravity: { x: 0, y: 0 },
		fixedStep: true,
		fps: 60,
	};

	return {
		clock,
		input,
		audio,
		physics,
		network,
		storage,
		createPlatformerScope() {
			throw new Error('PlatformerScope factory not yet wired');
		},
		createMinigameScope() {
			throw new Error('MinigameScope factory not yet wired');
		},
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
	scene: [BootScene, PreloadScene, PlatformerScene],
});

game.registry.set('container', createContainer());
