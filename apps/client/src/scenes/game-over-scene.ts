import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { buttonStack, menuLayout, safeCenterX, scaledStyle } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

/**
 * GameOverScene — shown when the player loses all lives.
 *
 * Retry uses flowController.getMapKey() for level key.
 * Menu navigates to MainMenu (selection preserved).
 *
 * Audio policy:
 *   Music  — none (PlatformerScene fades out music and plays game-over sting
 *            before transitioning here; silence reinforces the loss)
 *   SFX    — menu-select on Retry/Menu buttons
 */
export class GameOverScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.GAME_OVER });
	}

	create(): void {
		const state = this.readGameplayState();
		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const cx = safeCenterX(safeZone);
		const header = menuLayout(safeZone, [0.19, 0.36]);
		const buttons = buttonStack(safeZone, 0.72, 2, 60);

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, header.items[0]!, 'Game Over', {
			...scaledStyle(Typography.title, ww),
			color: Colors.danger,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [`Score: ${state.score}`, `Coins: ${state.coins}/${state.coinsTotal}`];
		const statsText = this.add.text(cx, header.items[1]!, statsLines.join('\n'), {
			...scaledStyle(Typography.body, ww),
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		statsText.setOrigin(0.5, 0.5);

		// ── Retry button ──
		const retryBtn = this.add.text(cx, buttons.items[0]!, 'Retry', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		retryBtn.setOrigin(0.5, 0.5);
		this.makeButton(retryBtn);
		retryBtn.on('pointerover', () => retryBtn.setColor(Colors.buttonHover));
		retryBtn.on('pointerout', () => retryBtn.setColor(Colors.button));
		retryBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.start(SceneKeys.PLATFORMER);
		});

		// ── Menu button ──
		const menuBtn = this.add.text(cx, buttons.items[1]!, 'Menu', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		menuBtn.setOrigin(0.5, 0.5);
		this.makeButton(menuBtn);
		menuBtn.on('pointerover', () => menuBtn.setColor(Colors.buttonHover));
		menuBtn.on('pointerout', () => menuBtn.setColor(Colors.button));
		menuBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.stop(SceneKeys.HUD);
			this.scene.stop(SceneKeys.PAUSE);
			this.navigateTo(SceneKeys.MAIN_MENU);
		});

		this.subscribeResize();
	}

	private readGameplayState(): GameplayState {
		const raw = this.registry.get(GAMEPLAY_STATE_KEY) as GameplayState | undefined;
		return raw ?? createInitialGameplayState();
	}
}
