import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography, ZIndex } from '../modules/ui/design-tokens.js';
import { menuLayout, safeCenterX, scaledStyle } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

/**
 * PauseScene — dark overlay with Resume/Settings/Quit buttons.
 *
 * Launched parallel to PlatformerScene when paused. PlatformerScene
 * is paused (no update) but still renders underneath the overlay.
 *
 * Audio policy:
 *   Music  — paused on create, resumed on resume (not stopped — avoids
 *            restarting the track when the player unpauses)
 *   SFX    — menu-select on all buttons
 */
export class PauseScene extends BaseScene {
	private escHandler: (() => void) | null = null;

	constructor() {
		super({ key: SceneKeys.PAUSE });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const { width, height } = this.scale;
		const cx = safeCenterX(safeZone);
		const layout = menuLayout(safeZone, [0.25, 0.45, 0.55, 0.65]);

		// ── Pause music while paused ──
		this.container.audio.pauseMusic();

		// ── Dark overlay (full world, not just safe zone) ──
		const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
		overlay.alpha = 0.6;
		overlay.setDepth(ZIndex.overlay);

		// ── Title ──
		const title = this.add.text(cx, layout.items[0]!, 'Paused', {
			...scaledStyle(Typography.title, ww),
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);
		title.setDepth(ZIndex.modal);

		// ── Resume button ──
		const resumeBtn = this.add.text(cx, layout.items[1]!, 'Resume', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		resumeBtn.setOrigin(0.5, 0.5);
		resumeBtn.setDepth(ZIndex.modal);
		this.makeButton(resumeBtn);
		resumeBtn.on('pointerover', () => resumeBtn.setColor(Colors.buttonHover));
		resumeBtn.on('pointerout', () => resumeBtn.setColor(Colors.button));
		resumeBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.resumeGame();
		});

		// ── Settings button ──
		const settingsBtn = this.add.text(cx, layout.items[2]!, 'Settings', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		settingsBtn.setOrigin(0.5, 0.5);
		settingsBtn.setDepth(ZIndex.modal);
		this.makeButton(settingsBtn);
		settingsBtn.on('pointerover', () => settingsBtn.setColor(Colors.buttonHover));
		settingsBtn.on('pointerout', () => settingsBtn.setColor(Colors.button));
		settingsBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.start(SceneKeys.SETTINGS, { returnTo: SceneKeys.PAUSE });
		});

		// ── Quit button ──
		const quitBtn = this.add.text(cx, layout.items[3]!, 'Quit', {
			...scaledStyle(Typography.button, ww),
			color: Colors.danger,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		quitBtn.setOrigin(0.5, 0.5);
		quitBtn.setDepth(ZIndex.modal);
		this.makeButton(quitBtn);
		quitBtn.on('pointerover', () => quitBtn.setColor('#ff6666'));
		quitBtn.on('pointerout', () => quitBtn.setColor(Colors.danger));
		quitBtn.on('pointerdown', () => {
			this.playButtonSfx();
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
		this.container.audio.resumeMusic();
		this.resumeScene(SceneKeys.PLATFORMER);
		this.resumeScene(SceneKeys.HUD);
		this.scene.stop();
	}
}
