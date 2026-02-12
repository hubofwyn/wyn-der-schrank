import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: '48px',
	color: '#ff4444',
	fontFamily: 'monospace',
	fontStyle: 'bold',
};

const STAT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: '24px',
	color: '#ffffff',
	fontFamily: 'monospace',
};

const BUTTON_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: '28px',
	color: '#44ff44',
	fontFamily: 'monospace',
};

export class GameOverScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.GAME_OVER });
	}

	create(): void {
		const state = this.readGameplayState();
		const { width, height } = this.scale;
		const cx = width / 2;

		// ── Title ──
		const title = this.add.text(cx, 140, 'Game Over', TITLE_STYLE);
		title.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [`Score: ${state.score}`, `Coins: ${state.coins}/${state.coinsTotal}`];
		const statsText = this.add.text(cx, 260, statsLines.join('\n'), STAT_STYLE);
		statsText.setOrigin(0.5, 0.5);

		// ── Retry button ──
		const retryBtn = this.add.text(cx, height - 120, 'Retry', BUTTON_STYLE);
		retryBtn.setOrigin(0.5, 0.5);
		retryBtn.setInteractive({ useHandCursor: true });
		retryBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.PLATFORMER, {
				mapKey: state.levelId || 'map-forest-1',
			});
		});
	}

	private readGameplayState(): GameplayState {
		const raw = this.registry.get(GAMEPLAY_STATE_KEY) as GameplayState | undefined;
		return raw ?? createInitialGameplayState();
	}
}
