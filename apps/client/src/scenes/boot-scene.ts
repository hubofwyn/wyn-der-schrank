import { SceneKeys } from '../modules/navigation/scene-keys.js';

/**
 * BootScene — first scene to run.
 * Transitions immediately to the PlatformerScene for MVP.
 * In the full game this will hand off to Preload -> Title -> MainMenu.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super({ key: SceneKeys.BOOT });
	}

	create(): void {
		this.scene.start(SceneKeys.PLATFORMER);
	}
}
