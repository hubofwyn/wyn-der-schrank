import type { SceneKey } from '../modules/navigation/scene-keys.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Spacing, Typography } from '../modules/ui/design-tokens.js';
import { menuLayout } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

interface ToggleDef {
	readonly label: string;
	readonly section: 'audio' | 'display' | 'accessibility';
	readonly field: string;
}

const TOGGLES: readonly ToggleDef[] = [
	{ label: 'Muted', section: 'audio', field: 'muted' },
	{ label: 'Show FPS', section: 'display', field: 'showFps' },
	{ label: 'Screen Shake', section: 'display', field: 'screenShake' },
	{ label: 'High Contrast', section: 'accessibility', field: 'highContrast' },
	{ label: 'Large Text', section: 'accessibility', field: 'largeText' },
];

/**
 * SettingsScene — toggle-based settings UI.
 *
 * Reads returnTo from scene data to know where to go on Back.
 * Never touches Platformer or HUD scene state.
 *
 * Audio policy:
 *   Music  — no change (inherits whatever is playing from the caller scene)
 *   SFX    — menu-select on toggle clicks and back button
 *   Live   — mute toggle applies immediately to the audio system
 */
export class SettingsScene extends BaseScene {
	private toggleTexts: Phaser.GameObjects.Text[] = [];
	private returnTo: SceneKey = SceneKeys.TITLE;

	constructor() {
		super({ key: SceneKeys.SETTINGS });
	}

	create(): void {
		const data = this.scene.settings.data as Record<string, unknown> | undefined;
		if (data?.returnTo && typeof data.returnTo === 'string') {
			this.returnTo = data.returnTo as SceneKey;
		}

		const safeZone = this.container.viewport.safeZone;
		const layout = menuLayout(safeZone, [0.12, 0.85]);
		const cx = layout.cx;
		this.cameras.main.setBackgroundColor(Colors.background);
		this.toggleTexts = [];

		// ── Title ──
		const title = this.add.text(cx, layout.items[0]!, 'Settings', {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Toggle rows ──
		const startY = Math.round(safeZone.y + safeZone.height * 0.28);
		const rowHeight = Spacing.xxl + Spacing.sm;

		for (let i = 0; i < TOGGLES.length; i++) {
			const toggle = TOGGLES[i]!;
			const y = startY + i * rowHeight;

			// Label
			const label = this.add.text(cx - 140, y, toggle.label, {
				...Typography.body,
				color: Colors.text,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			label.setOrigin(0, 0.5);

			// Value button
			const current = this.getToggleValue(toggle);
			const valueBtn = this.add.text(cx + 140, y, current ? '[ON]' : '[OFF]', {
				...Typography.body,
				color: current ? Colors.success : Colors.textMuted,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			valueBtn.setOrigin(1, 0.5);
			valueBtn.setInteractive({ useHandCursor: true });

			const idx = i;
			valueBtn.on('pointerdown', () => {
				this.playButtonSfx();
				this.onToggle(idx);
			});

			this.toggleTexts.push(valueBtn);
		}

		// ── Back button ──
		const backBtn = this.add.text(cx, layout.items[1]!, 'Back', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		backBtn.setOrigin(0.5, 0.5);
		backBtn.setInteractive({ useHandCursor: true });
		backBtn.on('pointerover', () => backBtn.setColor(Colors.buttonHover));
		backBtn.on('pointerout', () => backBtn.setColor(Colors.button));
		backBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.navigateTo(this.returnTo);
		});
	}

	private getToggleValue(toggle: ToggleDef): boolean {
		const settings = this.container.settingsManager.current;
		const section = settings[toggle.section] as Record<string, unknown>;
		return Boolean(section[toggle.field]);
	}

	private onToggle(index: number): void {
		const toggle = TOGGLES[index];
		if (!toggle) return;

		const current = this.getToggleValue(toggle);
		this.container.settingsManager.updateSection(toggle.section, {
			[toggle.field]: !current,
		});

		// Apply audio-related settings immediately
		if (toggle.section === 'audio' && toggle.field === 'muted') {
			if (!current) {
				this.container.audio.mute();
			} else {
				this.container.audio.unmute();
			}
		}

		// Update display
		const btn = this.toggleTexts[index];
		if (btn) {
			const newValue = !current;
			btn.setText(newValue ? '[ON]' : '[OFF]');
			btn.setColor(newValue ? Colors.success : Colors.textMuted);
		}
	}
}
