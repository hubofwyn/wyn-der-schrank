import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography, ZIndex } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

/**
 * PauseScene — dark overlay with Resume/Settings/Quit buttons.
 *
 * Launched parallel to PlatformerScene when paused. PlatformerScene
 * is paused (no update) but still renders underneath the overlay.
 */
export class PauseScene extends BaseScene {
	private escHandler: (() => void) | null = null;

	constructor() {
		super({ key: SceneKeys.PAUSE });
	}

	create(): void {
		const { width, height } = this.scale;
		const cx = width / 2;

		// ── Dark overlay ──
		const overlay = this.add.rectangle(cx, height / 2, width, height, 0x000000);
		overlay.alpha = 0.6;
		overlay.setDepth(ZIndex.overlay);

		// ── Title ──
		const title = this.add.text(cx, height * 0.25, 'Paused', {
			...Typography.title,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);
		title.setDepth(ZIndex.modal);

		// ── Resume button ──
		const resumeBtn = this.add.text(cx, height * 0.45, 'Resume', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		resumeBtn.setOrigin(0.5, 0.5);
		resumeBtn.setDepth(ZIndex.modal);
		resumeBtn.setInteractive({ useHandCursor: true });
		resumeBtn.on('pointerover', () => resumeBtn.setColor(Colors.buttonHover));
		resumeBtn.on('pointerout', () => resumeBtn.setColor(Colors.button));
		resumeBtn.on('pointerdown', () => this.resumeGame());

		// ── Settings button ──
		const settingsBtn = this.add.text(cx, height * 0.55, 'Settings', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		settingsBtn.setOrigin(0.5, 0.5);
		settingsBtn.setDepth(ZIndex.modal);
		settingsBtn.setInteractive({ useHandCursor: true });
		settingsBtn.on('pointerover', () => settingsBtn.setColor(Colors.buttonHover));
		settingsBtn.on('pointerout', () => settingsBtn.setColor(Colors.button));
		settingsBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.SETTINGS, { returnTo: SceneKeys.PAUSE });
		});

		// ── Quit button ──
		const quitBtn = this.add.text(cx, height * 0.65, 'Quit', {
			...Typography.button,
			color: Colors.danger,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		quitBtn.setOrigin(0.5, 0.5);
		quitBtn.setDepth(ZIndex.modal);
		quitBtn.setInteractive({ useHandCursor: true });
		quitBtn.on('pointerover', () => quitBtn.setColor('#ff6666'));
		quitBtn.on('pointerout', () => quitBtn.setColor(Colors.danger));
		quitBtn.on('pointerdown', () => {
			this.stopParallel(SceneKeys.HUD);
			this.stopParallel(SceneKeys.PLATFORMER);
			this.navigateTo(SceneKeys.TITLE);
		});

		// ── Escape key to resume (stored for targeted cleanup) ──
		this.escHandler = () => this.resumeGame();
		this.input.keyboard?.once('keydown-ESC', this.escHandler);

		// ── Cleanup: remove only our ESC handler if scene shuts down before it fires ──
		this.events.once('shutdown', () => {
			if (this.escHandler) {
				this.input.keyboard?.off('keydown-ESC', this.escHandler);
				this.escHandler = null;
			}
		});
	}

	private resumeGame(): void {
		this.resumeScene(SceneKeys.PLATFORMER);
		this.resumeScene(SceneKeys.HUD);
		this.scene.stop();
	}
}
