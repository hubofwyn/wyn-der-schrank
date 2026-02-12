import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

export class GameOverScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.GAME_OVER });
	}

	create(): void {
		const state = this.readGameplayState();
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, 140, 'Game Over', {
			...Typography.title,
			color: Colors.danger,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [`Score: ${state.score}`, `Coins: ${state.coins}/${state.coinsTotal}`];
		const statsText = this.add.text(cx, 260, statsLines.join('\n'), {
			...Typography.body,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		statsText.setOrigin(0.5, 0.5);

		// ── Retry button ──
		const retryBtn = this.add.text(cx, height - 160, 'Retry', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		retryBtn.setOrigin(0.5, 0.5);
		retryBtn.setInteractive({ useHandCursor: true });
		retryBtn.on('pointerover', () => retryBtn.setColor(Colors.buttonHover));
		retryBtn.on('pointerout', () => retryBtn.setColor(Colors.button));
		retryBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.PLATFORMER, {
				mapKey: state.levelId || 'map-forest-1',
			});
		});

		// ── Menu button ──
		const menuBtn = this.add.text(cx, height - 100, 'Menu', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		menuBtn.setOrigin(0.5, 0.5);
		menuBtn.setInteractive({ useHandCursor: true });
		menuBtn.on('pointerover', () => menuBtn.setColor(Colors.buttonHover));
		menuBtn.on('pointerout', () => menuBtn.setColor(Colors.button));
		menuBtn.on('pointerdown', () => {
			this.scene.stop(SceneKeys.HUD);
			this.scene.stop(SceneKeys.PAUSE);
			this.navigateTo(SceneKeys.TITLE);
		});
	}

	private readGameplayState(): GameplayState {
		const raw = this.registry.get(GAMEPLAY_STATE_KEY) as GameplayState | undefined;
		return raw ?? createInitialGameplayState();
	}
}
