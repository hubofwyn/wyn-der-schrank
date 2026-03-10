import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Spacing, Typography } from '../modules/ui/design-tokens.js';
import { cornerButton, menuLayout, safeCenterY } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

const CARD_SIZE = 120;
const CARD_GAP = Spacing.lg;
const MAX_COLUMNS = 4;

function formatStars(count: number): string {
	const filled = '*'.repeat(Math.min(count, 3));
	const empty = '-'.repeat(3 - Math.min(count, 3));
	return filled + empty;
}

/**
 * LevelSelectScene — shows levels within the selected world.
 *
 * Reads worldId from flowController.selection. If null, redirects
 * to WorldSelect. Shows level cards with star ratings from SessionSave.
 * Click starts the level. Back returns to WorldSelect (clears level,
 * keeps world).
 *
 * Audio policy:
 *   Music  — continues title-theme
 *   SFX    — menu-select on level card clicks and back button
 */
export class LevelSelectScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.LEVEL_SELECT });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const layout = menuLayout(safeZone, [0.07]);
		const cx = layout.cx;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Guard: redirect if no world selected ──
		const worldId = this.container.flowController.selection.worldId;
		if (!worldId) {
			this.navigateTo(SceneKeys.WORLD_SELECT);
			return;
		}

		const world = this.container.worldCatalog.getById(worldId);
		const worldName = world?.name ?? worldId;

		// ── Title ──
		const title = this.add.text(cx, layout.items[0]!, worldName, {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Level cards ──
		const levels = this.container.worldCatalog.getLevelsForWorld(worldId);
		const saveData = this.container.sessionSave.current;

		if (levels.length === 0) {
			const emptyText = this.add.text(cx, safeCenterY(safeZone), 'No levels yet...', {
				...Typography.body,
				color: Colors.textMuted,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			emptyText.setOrigin(0.5, 0.5);
		} else {
			const cols = Math.min(levels.length, MAX_COLUMNS);
			const gridWidth = cols * CARD_SIZE + (cols - 1) * CARD_GAP;
			const startX = cx - gridWidth / 2 + CARD_SIZE / 2;
			const startY = safeCenterY(safeZone) - 40;

			for (let i = 0; i < levels.length; i++) {
				const levelId = levels[i];
				if (!levelId) continue;
				const col = i % MAX_COLUMNS;
				const row = Math.floor(i / MAX_COLUMNS);
				const lx = startX + col * (CARD_SIZE + CARD_GAP);
				const ly = startY + row * (CARD_SIZE + CARD_GAP);
				const completion = saveData.levels[levelId];

				this.createLevelCard(lx, ly, levelId, completion?.stars);
			}
		}

		// ── Back button ──
		const backPos = cornerButton('bottom-left', safeZone);
		const backBtn = this.add.text(backPos.x, backPos.y, 'Back', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		backBtn.setOrigin(0.5, 0.5);
		backBtn.setInteractive({ useHandCursor: true });
		backBtn.on('pointerover', () => backBtn.setColor(Colors.buttonHover));
		backBtn.on('pointerout', () => backBtn.setColor(Colors.button));
		backBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.navigateTo(SceneKeys.WORLD_SELECT);
		});
	}

	private createLevelCard(x: number, y: number, levelId: string, stars?: number): void {
		const bg = this.add.rectangle(x, y, CARD_SIZE, CARD_SIZE, Colors.panel);
		bg.setStrokeStyle(2, 0x444444);
		bg.setInteractive({ useHandCursor: true });

		// ── Level name ──
		const displayName = levelId.replace(/-/g, ' ');
		const label = this.add.text(x, y - 14, displayName, {
			...Typography.small,
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		label.setOrigin(0.5, 0.5);

		// ── Star rating ──
		if (stars !== undefined) {
			const starsText = this.add.text(x, y + 16, formatStars(stars), {
				...Typography.small,
				color: Colors.accent,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			starsText.setOrigin(0.5, 0.5);
		}

		// ── Hover ──
		bg.on('pointerover', () => bg.setStrokeStyle(3, 0x66ff66));
		bg.on('pointerout', () => bg.setStrokeStyle(2, 0x444444));

		// ── Click → start level ──
		bg.on('pointerdown', () => {
			this.playButtonSfx();
			this.container.flowController.selectLevel(levelId);
			this.navigateTo(SceneKeys.PLATFORMER);
		});
	}
}
