import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

/**
 * BootScene — first scene to run.
 * Transitions to PreloadScene to load all game assets.
 * In the full game, boot assets (logo, loading bar sprites) load here.
 */
export class BootScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.BOOT });
	}

	create(): void {
		this.navigateTo(SceneKeys.PRELOAD);
	}
}
