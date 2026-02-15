import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

/**
 * CharacterSelectScene — 3-character card layout.
 *
 * Displays character cards with stats, hover effects, and color-coded borders.
 * Selecting a character calls flowController.selectCharacter() and navigates
 * to MainMenu. Back returns to Title with flowController.reset().
 */
export class CharacterSelectScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.CHARACTER_SELECT });
	}

	create(): void {
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		const title = this.add.text(cx, 60, 'Choose Your Hero', {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// Placeholder — full implementation in Step 6
		const placeholder = this.add.text(cx, height / 2, 'Character Select (WIP)', {
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
			this.container.flowController.reset();
			this.navigateTo(SceneKeys.TITLE);
		});
	}
}
