import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

/**
 * WorldSelectScene — alternate drill-down for world selection.
 *
 * Shows 3 world cards vertically with unlock states.
 * Back returns to MainMenu.
 */
export class WorldSelectScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.WORLD_SELECT });
	}

	create(): void {
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		const title = this.add.text(cx, 60, 'Select World', {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// Placeholder — full implementation in Step 8
		const placeholder = this.add.text(cx, height / 2, 'World Select (WIP)', {
			...Typography.body,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		placeholder.setOrigin(0.5, 0.5);

		// ── Back button ──
		const backBtn = this.add.text(80, height - 50, 'Back', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		backBtn.setOrigin(0.5, 0.5);
		backBtn.setInteractive({ useHandCursor: true });
		backBtn.on('pointerover', () => backBtn.setColor(Colors.buttonHover));
		backBtn.on('pointerout', () => backBtn.setColor(Colors.button));
		backBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.navigateTo(SceneKeys.MAIN_MENU);
		});
	}
}
