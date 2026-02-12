import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

const HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: '16px',
	color: '#ffffff',
	fontFamily: 'monospace',
};

const HUD_PADDING = 16;

/**
 * HudScene — rendered in parallel with PlatformerScene.
 *
 * Reads GameplayState from the registry each frame and renders
 * health, score, coins, and level name as text overlays.
 * Uses createInitialGameplayState() as fallback if PlatformerScene
 * hasn't written state yet.
 */
export class HudScene extends BaseScene {
	private healthText!: Phaser.GameObjects.Text;
	private scoreText!: Phaser.GameObjects.Text;
	private coinsText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private levelText!: Phaser.GameObjects.Text;

	constructor() {
		super({ key: SceneKeys.HUD });
	}

	create(): void {
		this.healthText = this.add.text(HUD_PADDING, HUD_PADDING, '', HUD_STYLE);
		this.scoreText = this.add.text(HUD_PADDING, HUD_PADDING + 24, '', HUD_STYLE);
		this.coinsText = this.add.text(HUD_PADDING, HUD_PADDING + 48, '', HUD_STYLE);
		this.livesText = this.add.text(HUD_PADDING, HUD_PADDING + 72, '', HUD_STYLE);

		const { width } = this.scale;
		this.levelText = this.add.text(width - HUD_PADDING, HUD_PADDING, '', HUD_STYLE);
		this.levelText.setOrigin(1, 0);
	}

	update(): void {
		const state = this.readGameplayState();
		this.healthText.setText(`HP: ${state.health}/${state.maxHealth}`);
		this.scoreText.setText(`Score: ${state.score}`);
		this.coinsText.setText(`Coins: ${state.coins}/${state.coinsTotal}`);
		this.livesText.setText(`Lives: ${state.lives}`);
		this.levelText.setText(state.levelName);
	}

	private readGameplayState(): GameplayState {
		const raw = this.registry.get(GAMEPLAY_STATE_KEY) as GameplayState | undefined;
		return raw ?? createInitialGameplayState();
	}
}
