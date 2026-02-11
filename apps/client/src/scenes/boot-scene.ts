import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

/**
 * BootScene — first scene to run.
 * Transitions immediately to the PlatformerScene for MVP.
 * In the full game this will hand off to Preload -> Title -> MainMenu.
 */
export class BootScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.BOOT });
	}

	create(): void {
		this.navigateTo(SceneKeys.PLATFORMER);
	}
}
