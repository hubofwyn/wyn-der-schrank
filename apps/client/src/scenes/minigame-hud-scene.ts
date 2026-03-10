import type { MinigameHudState } from '../modules/minigame/minigame-hud-state.js';
import {
	createInitialMinigameHudState,
	MINIGAME_HUD_STATE_KEY,
} from '../modules/minigame/minigame-hud-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { hudColumn, safeCenterX } from '../modules/ui/scene-layout.js';
import { scaleFontSizeStr } from '../modules/viewport/viewport-math.js';
import { BaseScene } from './base-scene.js';

/**
 * MinigameHudScene — rendered in parallel with MinigameScene.
 *
 * Reads MinigameHudState from the registry each frame and renders
 * score, lives, combo, progress, and floating messages as text overlays.
 * Uses createInitialMinigameHudState() as fallback if MinigameScene
 * hasn't written state yet.
 */
export class MinigameHudScene extends BaseScene {
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private comboText!: Phaser.GameObjects.Text;
	private progressText!: Phaser.GameObjects.Text;
	private phaseText!: Phaser.GameObjects.Text;
	private messageText!: Phaser.GameObjects.Text;

	constructor() {
		super({ key: SceneKeys.MINIGAME_HUD });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const left = hudColumn('top-left', safeZone, 4);
		const right = hudColumn('top-right', safeZone, 1);

		const hudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: scaleFontSizeStr(16, ww),
			color: '#ffffff',
			fontFamily: 'monospace',
		};

		this.scoreText = this.add.text(left.x, left.lines[0]!, '', hudStyle);
		this.livesText = this.add.text(left.x, left.lines[1]!, '', hudStyle);
		this.comboText = this.add.text(left.x, left.lines[2]!, '', hudStyle);
		this.progressText = this.add.text(left.x, left.lines[3]!, '', hudStyle);

		this.phaseText = this.add.text(right.x, right.lines[0]!, '', hudStyle);
		this.phaseText.setOrigin(1, 0);

		this.messageText = this.add.text(safeCenterX(safeZone), 280, '', {
			fontSize: scaleFontSizeStr(24, ww),
			color: '#ffff00',
			fontFamily: 'monospace',
		});
		this.messageText.setOrigin(0.5, 0.5);

		this.subscribeResize();
	}

	update(): void {
		const state = this.readMinigameHudState();

		this.scoreText.setText(`Score: ${state.score}`);
		this.livesText.setText(
			`Lives: ${'*'.repeat(state.lives)}${'_'.repeat(state.maxLives - state.lives)}`,
		);
		this.comboText.setText(state.combo > 0 ? `Combo: x${state.combo}` : '');
		this.progressText.setText(state.progressLabel);
		this.phaseText.setText(state.phase.toUpperCase());

		if (state.message) {
			this.messageText.setText(state.message);
			this.messageText.setVisible(true);
		} else {
			this.messageText.setVisible(false);
		}
	}

	private readMinigameHudState(): MinigameHudState {
		const raw = this.registry.get(MINIGAME_HUD_STATE_KEY) as MinigameHudState | undefined;
		return raw ?? createInitialMinigameHudState();
	}
}
