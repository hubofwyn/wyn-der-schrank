import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

const LEVEL_MAP: Record<string, string | undefined> = {
	'map-forest-1': 'map-forest-2',
};

function formatStars(count: number): string {
	const filled = '*'.repeat(Math.min(count, 3));
	const empty = '-'.repeat(3 - Math.min(count, 3));
	return filled + empty;
}

function formatTime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * LevelCompleteScene — shown after the player reaches the exit.
 *
 * Reads final GameplayState from registry to display score, stars,
 * coins, and time. Offers "Next Level", "Replay", and "Menu" navigation.
 */
export class LevelCompleteScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.LEVEL_COMPLETE });
	}

	create(): void {
		const state = this.readGameplayState();
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, 100, 'Level Complete!', {
			...Typography.title,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Stars ──
		const starsText = this.add.text(cx, 180, formatStars(state.stars), {
			...Typography.heading,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		starsText.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [
			`Score: ${state.score}`,
			`Coins: ${state.coins}/${state.coinsTotal}`,
			`Time:  ${formatTime(state.timeElapsedMs)}`,
		];
		const statsText = this.add.text(cx, 280, statsLines.join('\n'), {
			...Typography.body,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		statsText.setOrigin(0.5, 0.5);

		// ── Buttons ──
		let buttonY = height - 200;
		const nextMapKey = LEVEL_MAP[state.levelId];

		if (nextMapKey) {
			const nextBtn = this.add.text(cx, buttonY, 'Next Level', {
				...Typography.button,
				color: Colors.button,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			nextBtn.setOrigin(0.5, 0.5);
			nextBtn.setInteractive({ useHandCursor: true });
			nextBtn.on('pointerover', () => nextBtn.setColor(Colors.buttonHover));
			nextBtn.on('pointerout', () => nextBtn.setColor(Colors.button));
			nextBtn.on('pointerdown', () => {
				this.scene.start(SceneKeys.PLATFORMER, { mapKey: nextMapKey });
			});
			buttonY += 60;
		}

		const replayBtn = this.add.text(cx, buttonY, 'Replay', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		replayBtn.setOrigin(0.5, 0.5);
		replayBtn.setInteractive({ useHandCursor: true });
		replayBtn.on('pointerover', () => replayBtn.setColor(Colors.buttonHover));
		replayBtn.on('pointerout', () => replayBtn.setColor(Colors.button));
		replayBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.PLATFORMER, { mapKey: state.levelId || 'map-forest-1' });
		});

		// ── Menu button ──
		const menuBtn = this.add.text(cx, buttonY + 60, 'Menu', {
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
