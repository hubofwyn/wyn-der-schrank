import type { Container } from '../core/container.js';
import type { SceneKey } from '../modules/navigation/scene-keys.js';

/**
 * Abstract base for all game scenes.
 *
 * Provides typed access to the DI container (stored in the Phaser game
 * registry by main.ts) and navigation helpers that wrap the ScenePlugin.
 */
export abstract class BaseScene extends Phaser.Scene {
	/** Typed accessor for the DI container stored in the game registry. */
	protected get container(): Container {
		return this.registry.get('container') as Container;
	}

	/** Transition to another scene (stops this one). */
	protected navigateTo(key: SceneKey): void {
		this.scene.start(key);
	}

	/** Launch a scene in parallel (e.g., HUD overlay). */
	protected launchParallel(key: SceneKey): void {
		this.scene.launch(key);
	}

	/** Stop a parallel scene. */
	protected stopParallel(key: SceneKey): void {
		this.scene.stop(key);
	}

	/** Pause a scene. No argument pauses this scene. */
	protected pauseScene(key?: SceneKey): void {
		if (key) {
			this.scene.pause(key);
		} else {
			this.scene.pause();
		}
	}

	/** Resume a paused scene. */
	protected resumeScene(key: SceneKey): void {
		this.scene.resume(key);
	}
}
