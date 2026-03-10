import type { WorldDefinition } from '@hub-of-wyn/shared';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Spacing, Typography } from '../modules/ui/design-tokens.js';
import { cornerButton, menuLayout, safeCenterY, scaledStyle } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

const CARD_WIDTH = 600;
const CARD_HEIGHT = 120;
const CARD_GAP = Spacing.lg;

/**
 * WorldSelectScene — alternate drill-down for world selection.
 *
 * Shows 3 world cards vertically with name, description, and unlock state.
 * Unlocked worlds are clickable and navigate to LevelSelect.
 * Locked worlds are dimmed with unlock requirement text.
 * Back returns to MainMenu.
 *
 * Audio policy:
 *   Music  — continues title-theme
 *   SFX    — menu-select on world card clicks and back button
 */
export class WorldSelectScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.WORLD_SELECT });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const layout = menuLayout(safeZone, [0.07]);
		const cx = layout.cx;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, layout.items[0]!, 'Select World', {
			...scaledStyle(Typography.heading, ww),
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── World cards ──
		const worlds = this.container.worldCatalog.getOrdered();
		const saveData = this.container.sessionSave.current;
		const totalHeight = worlds.length * CARD_HEIGHT + (worlds.length - 1) * CARD_GAP;
		const cy = safeCenterY(safeZone);
		const startY = cy - totalHeight / 2 + CARD_HEIGHT / 2;

		for (let i = 0; i < worlds.length; i++) {
			const world = worlds[i];
			if (!world) continue;
			const unlocked = this.container.worldCatalog.isWorldUnlocked(world.id, saveData);
			const cardY = startY + i * (CARD_HEIGHT + CARD_GAP);
			this.createWorldCard(cx, cardY, world, unlocked, ww);
		}

		// ── Back button ──
		const backPos = cornerButton('bottom-left', safeZone);
		const backBtn = this.add.text(backPos.x, backPos.y, 'Back', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		backBtn.setOrigin(0.5, 0.5);
		this.makeButton(backBtn);
		backBtn.on('pointerover', () => backBtn.setColor(Colors.buttonHover));
		backBtn.on('pointerout', () => backBtn.setColor(Colors.button));
		backBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.navigateTo(SceneKeys.MAIN_MENU);
		});

		this.subscribeResize();
	}

	private createWorldCard(
		x: number,
		y: number,
		world: WorldDefinition,
		unlocked: boolean,
		ww: number,
	): void {
		const bg = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, Colors.panel);
		bg.setStrokeStyle(2, unlocked ? 0x444444 : 0x333333);
		bg.setAlpha(unlocked ? 1 : 0.5);

		// ── Name ──
		const nameText = this.add.text(x, y - 20, world.name, {
			...scaledStyle(Typography.body, ww),
			color: unlocked ? Colors.text : Colors.textMuted,
			fontStyle: 'bold',
		} as Phaser.Types.GameObjects.Text.TextStyle);
		nameText.setOrigin(0.5, 0.5);
		nameText.setAlpha(unlocked ? 1 : 0.5);

		// ── Description or lock text ──
		let subText: string;
		if (!unlocked) {
			const cond = world.unlockCondition;
			if (cond.type === 'world-complete') {
				subText = `Complete all ${cond.worldId ?? 'previous'} levels`;
			} else if (cond.type === 'stars') {
				subText = `Collect ${cond.starsRequired ?? 0} stars`;
			} else {
				subText = world.description;
			}
		} else {
			const levelCount = world.levels.length;
			subText =
				levelCount > 0
					? `${world.description} (${levelCount} level${levelCount !== 1 ? 's' : ''})`
					: `${world.description} (Coming soon)`;
		}

		const desc = this.add.text(x, y + 14, subText, {
			...scaledStyle(Typography.small, ww),
			color: Colors.textMuted,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		desc.setOrigin(0.5, 0.5);
		desc.setAlpha(unlocked ? 1 : 0.5);

		if (unlocked && world.levels.length > 0) {
			bg.setInteractive({ useHandCursor: true });
			bg.on('pointerover', () => bg.setStrokeStyle(3, 0x66ff66));
			bg.on('pointerout', () => bg.setStrokeStyle(2, 0x444444));
			bg.on('pointerdown', () => {
				this.playButtonSfx();
				this.container.flowController.selectWorld(world.id);
				this.navigateTo(SceneKeys.LEVEL_SELECT);
			});
		}
	}
}
