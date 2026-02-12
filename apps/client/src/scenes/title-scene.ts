import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

/**
 * TitleScene — the game's front door.
 *
 * Shows title text with Play and Settings buttons.
 * Serves as both title and main menu for G5 (MainMenu deferred).
 */
export class TitleScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.TITLE });
	}

	create(): void {
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(
			cx,
			height * 0.3,
			'Wyn der Schrank',
			Typography.title as Phaser.Types.GameObjects.Text.TextStyle,
		);
		title.setOrigin(0.5, 0.5);
		title.setColor(Colors.accent);

		// ── Play button ──
		const playBtn = this.add.text(cx, height * 0.55, 'Play', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		playBtn.setOrigin(0.5, 0.5);
		playBtn.setInteractive({ useHandCursor: true });
		playBtn.on('pointerover', () => playBtn.setColor(Colors.buttonHover));
		playBtn.on('pointerout', () => playBtn.setColor(Colors.button));
		playBtn.on('pointerdown', () => {
			this.navigateTo(SceneKeys.PLATFORMER);
		});

		// ── Settings button ──
		const settingsBtn = this.add.text(cx, height * 0.65, 'Settings', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		settingsBtn.setOrigin(0.5, 0.5);
		settingsBtn.setInteractive({ useHandCursor: true });
		settingsBtn.on('pointerover', () => settingsBtn.setColor(Colors.buttonHover));
		settingsBtn.on('pointerout', () => settingsBtn.setColor(Colors.button));
		settingsBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.SETTINGS, { returnTo: SceneKeys.TITLE });
		});
	}
}
