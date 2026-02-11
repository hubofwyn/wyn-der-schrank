import { SceneKeys } from '../modules/navigation/scene-keys.js';

/**
 * PlatformerScene — stub for commit 3.
 * Displays placeholder text; full implementation in next commit.
 */
export class PlatformerScene extends Phaser.Scene {
	constructor() {
		super({ key: SceneKeys.PLATFORMER });
	}

	create(): void {
		this.add
			.text(640, 360, 'Wyn der Schrank — loading...', {
				fontSize: '24px',
				color: '#ffffff',
			})
			.setOrigin(0.5);
	}
}
