import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: '48px',
	color: '#ffdd44',
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
 * coins, and time. Offers "Next Level" and "Menu" navigation.
 */
export class LevelCompleteScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.LEVEL_COMPLETE });
	}

	create(): void {
		const state = this.readGameplayState();
		const { width, height } = this.scale;
		const cx = width / 2;

		// ── Title ──
		const title = this.add.text(cx, 100, 'Level Complete!', TITLE_STYLE);
		title.setOrigin(0.5, 0.5);

		// ── Stars ──
		const starsText = this.add.text(cx, 180, formatStars(state.stars), {
			...STAT_STYLE,
			fontSize: '36px',
		});
		starsText.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [
			`Score: ${state.score}`,
			`Coins: ${state.coins}/${state.coinsTotal}`,
			`Time:  ${formatTime(state.timeElapsedMs)}`,
		];
		const statsText = this.add.text(cx, 280, statsLines.join('\n'), STAT_STYLE);
		statsText.setOrigin(0.5, 0.5);

		// ── Buttons ──
		const nextMapKey = LEVEL_MAP[state.levelId];

		if (nextMapKey) {
			const nextBtn = this.add.text(cx, height - 160, 'Next Level', BUTTON_STYLE);
			nextBtn.setOrigin(0.5, 0.5);
			nextBtn.setInteractive({ useHandCursor: true });
			nextBtn.on('pointerdown', () => {
				this.scene.start(SceneKeys.PLATFORMER, { mapKey: nextMapKey });
			});
		}

		const menuBtn = this.add.text(cx, height - 100, 'Replay', BUTTON_STYLE);
		menuBtn.setOrigin(0.5, 0.5);
		menuBtn.setInteractive({ useHandCursor: true });
		menuBtn.on('pointerdown', () => {
			this.scene.start(SceneKeys.PLATFORMER, { mapKey: state.levelId || 'map-forest-1' });
		});
	}

	private readGameplayState(): GameplayState {
		const raw = this.registry.get(GAMEPLAY_STATE_KEY) as GameplayState | undefined;
		return raw ?? createInitialGameplayState();
	}
}
