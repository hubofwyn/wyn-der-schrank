import { MusicKeys } from '../modules/assets/audio-keys.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { progressSummary } from '../modules/progression/progress-summary.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { menuLayout } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

/**
 * TitleScene — the game's front door.
 *
 * Shows title text with Play and Settings buttons.
 * Serves as both title and main menu for G5 (MainMenu deferred).
 *
 * Audio policy:
 *   Music  — title-theme (loop, crossfade from any prior track)
 *   SFX    — menu-select on button clicks
 */
export class TitleScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.TITLE });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const layout = menuLayout(safeZone, [0.3, 0.38, 0.55, 0.65]);
		const cx = layout.cx;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Music: crossfade into title theme ──
		this.container.audio.playMusic(MusicKeys.TITLE, { loop: true, fadeInMs: 1000 });

		// ── Title ──
		const title = this.add.text(
			cx,
			layout.items[0]!,
			'Wyn der Schrank',
			Typography.title as Phaser.Types.GameObjects.Text.TextStyle,
		);
		title.setOrigin(0.5, 0.5);
		title.setColor(Colors.accent);

		// ── Progress indicator (only when save data exists) ──
		const summary = progressSummary(this.container.sessionSave.current);
		if (summary) {
			const progressText = this.add.text(cx, layout.items[1]!, summary, {
				...Typography.small,
				color: Colors.textMuted,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			progressText.setOrigin(0.5, 0.5);
		}

		// ── Play button ──
		const playBtn = this.add.text(cx, layout.items[2]!, 'Play', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		playBtn.setOrigin(0.5, 0.5);
		playBtn.setInteractive({ useHandCursor: true });
		playBtn.on('pointerover', () => playBtn.setColor(Colors.buttonHover));
		playBtn.on('pointerout', () => playBtn.setColor(Colors.button));
		playBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.container.flowController.reset();
			this.navigateTo(SceneKeys.CHARACTER_SELECT);
		});

		// ── Settings button ──
		const settingsBtn = this.add.text(cx, layout.items[3]!, 'Settings', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		settingsBtn.setOrigin(0.5, 0.5);
		settingsBtn.setInteractive({ useHandCursor: true });
		settingsBtn.on('pointerover', () => settingsBtn.setColor(Colors.buttonHover));
		settingsBtn.on('pointerout', () => settingsBtn.setColor(Colors.button));
		settingsBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.start(SceneKeys.SETTINGS, { returnTo: SceneKeys.TITLE });
		});
	}
}
