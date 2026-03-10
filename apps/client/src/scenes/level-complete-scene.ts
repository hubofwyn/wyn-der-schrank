import { SfxKeys } from '../modules/assets/audio-keys.js';
import { emitLevelCompleted } from '../modules/game-state/game-events.js';
import type { GameplayState } from '../modules/game-state/gameplay-state.js';
import {
	createInitialGameplayState,
	GAMEPLAY_STATE_KEY,
} from '../modules/game-state/gameplay-state.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Typography } from '../modules/ui/design-tokens.js';
import { buttonStack, menuLayout, scaledStyle } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

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
 * coins, and time. Uses WorldCatalog.getNextLevel() for "Next Level"
 * navigation (replaces hardcoded LEVEL_MAP). Menu goes to MainMenu.
 *
 * Audio policy:
 *   Music  — none (gameplay music faded out by PlatformerScene on exit)
 *   SFX    — level-complete jingle on create, menu-select on buttons
 *   Silent — no looping music; the jingle plays once as a celebratory sting
 */
export class LevelCompleteScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.LEVEL_COMPLETE });
	}

	create(): void {
		const state = this.readGameplayState();

		// Fire-and-forget: emit typed GameEvent through network port
		emitLevelCompleted(this.container.network, state);

		// Persist level completion to session save (fire-and-forget)
		const levelId = state.levelId.replace(/^map-/, '');
		this.container.sessionSave.onLevelComplete(
			levelId,
			state.score,
			state.stars,
			state.coins,
			state.timeElapsedMs,
		);

		// ── Audio: stop any lingering music, play victory jingle ──
		this.container.audio.stopMusic(300);
		this.container.audio.playSfx(SfxKeys.LEVEL_COMPLETE);

		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const header = menuLayout(safeZone, [0.14, 0.25, 0.39]);
		const cx = header.cx;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, header.items[0]!, 'Level Complete!', {
			...scaledStyle(Typography.title, ww),
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Stars ──
		const starsText = this.add.text(cx, header.items[1]!, formatStars(state.stars), {
			...scaledStyle(Typography.heading, ww),
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		starsText.setOrigin(0.5, 0.5);

		// ── Stats ──
		const statsLines = [
			`Score: ${state.score}`,
			`Coins: ${state.coins}/${state.coinsTotal}`,
			`Time:  ${formatTime(state.timeElapsedMs)}`,
		];
		const statsText = this.add.text(cx, header.items[2]!, statsLines.join('\n'), {
			...scaledStyle(Typography.body, ww),
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		statsText.setOrigin(0.5, 0.5);

		// ── Buttons ──
		const buttons = buttonStack(safeZone, 0.72, 3, 60);
		let btnIdx = 0;

		// Determine next level via WorldCatalog
		const worldId = this.container.flowController.selection.worldId;
		const nextLevelId = worldId ? this.container.worldCatalog.getNextLevel(levelId, worldId) : null;

		if (nextLevelId) {
			const nextBtn = this.add.text(cx, buttons.items[btnIdx]!, 'Next Level', {
				...scaledStyle(Typography.button, ww),
				color: Colors.button,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			nextBtn.setOrigin(0.5, 0.5);
			this.makeButton(nextBtn);
			nextBtn.on('pointerover', () => nextBtn.setColor(Colors.buttonHover));
			nextBtn.on('pointerout', () => nextBtn.setColor(Colors.button));
			nextBtn.on('pointerdown', () => {
				this.playButtonSfx();
				this.container.flowController.selectLevel(nextLevelId);
				this.scene.start(SceneKeys.PLATFORMER);
			});
			btnIdx++;
		}

		const replayBtn = this.add.text(cx, buttons.items[btnIdx]!, 'Replay', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		replayBtn.setOrigin(0.5, 0.5);
		this.makeButton(replayBtn);
		replayBtn.on('pointerover', () => replayBtn.setColor(Colors.buttonHover));
		replayBtn.on('pointerout', () => replayBtn.setColor(Colors.button));
		replayBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.start(SceneKeys.PLATFORMER);
		});

		// ── Menu button ──
		const menuBtn = this.add.text(cx, buttons.items[btnIdx + 1]!, 'Menu', {
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
