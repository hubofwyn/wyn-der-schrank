import type { WorldDefinition, WorldId } from '@hub-of-wyn/shared';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Spacing, Typography } from '../modules/ui/design-tokens.js';
import { cornerButton, menuLayout, safeCenterX, scaledStyle } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

const LEVEL_CARD_SIZE = 100;
const LEVEL_CARD_GAP = Spacing.md;
const MAX_COLUMNS = 4;

/** Unlock requirement text for locked worlds. */
function unlockText(world: WorldDefinition): string {
	const cond = world.unlockCondition;
	switch (cond.type) {
		case 'world-complete':
			return `Complete all ${cond.worldId ?? 'previous'} levels`;
		case 'stars':
			return `Collect ${cond.starsRequired ?? 0} stars`;
		default:
			return '';
	}
}

function formatStars(count: number): string {
	const filled = '*'.repeat(Math.min(count, 3));
	const empty = '-'.repeat(3 - Math.min(count, 3));
	return filled + empty;
}

/**
 * MainMenuScene — central hub with inline world/level grid.
 *
 * Shows selected character name, iterates worlds sorted by order,
 * displays level cards with star ratings for unlocked worlds, and
 * dimmed lock text for locked worlds. Click a level to start gameplay.
 *
 * Audio policy:
 *   Music  — continues title-theme
 *   SFX    — menu-select on level card clicks, back, settings
 */
export class MainMenuScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.MAIN_MENU });
	}

	create(): void {
		const safeZone = this.container.viewport.safeZone;
		const ww = this.container.viewport.worldSize.width;
		const cx = safeCenterX(safeZone);
		const headerLayout = menuLayout(safeZone, [0.056]);

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Character name header ──
		const charId = this.container.flowController.selection.characterId;
		const charDef = charId ? this.container.characterCatalog.getById(charId) : null;
		const charName = charDef?.name ?? 'Unknown';

		const header = this.add.text(cx, headerLayout.items[0]!, `${charName}'s Adventure`, {
			...scaledStyle(Typography.heading, ww),
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		header.setOrigin(0.5, 0.5);

		// ── World sections ──
		const worlds = this.container.worldCatalog.getOrdered();
		const saveData = this.container.sessionSave.current;
		let yOffset = Math.round(safeZone.y + safeZone.height * 0.14);

		for (const world of worlds) {
			const unlocked = this.container.worldCatalog.isWorldUnlocked(world.id, saveData);
			yOffset = this.createWorldSection(cx, yOffset, world, unlocked, ww);
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
			this.navigateTo(SceneKeys.CHARACTER_SELECT);
		});

		// ── Settings button ──
		const settingsPos = cornerButton('bottom-right', safeZone);
		const settingsBtn = this.add.text(settingsPos.x, settingsPos.y, 'Settings', {
			...scaledStyle(Typography.button, ww),
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		settingsBtn.setOrigin(0.5, 0.5);
		this.makeButton(settingsBtn);
		settingsBtn.on('pointerover', () => settingsBtn.setColor(Colors.buttonHover));
		settingsBtn.on('pointerout', () => settingsBtn.setColor(Colors.button));
		settingsBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.scene.start(SceneKeys.SETTINGS, { returnTo: SceneKeys.MAIN_MENU });
		});
	}

	private createWorldSection(
		cx: number,
		y: number,
		world: WorldDefinition,
		unlocked: boolean,
		ww: number,
	): number {
		// ── World name ──
		const nameColor = unlocked ? Colors.text : Colors.textMuted;
		const nameText = this.add.text(cx, y, world.name, {
			...scaledStyle(Typography.body, ww),
			color: nameColor,
			fontStyle: 'bold',
		} as Phaser.Types.GameObjects.Text.TextStyle);
		nameText.setOrigin(0.5, 0);
		y += 36;

		if (!unlocked) {
			// ── Locked: show requirement ──
			const lockText = this.add.text(cx, y, unlockText(world), {
				...scaledStyle(Typography.small, ww),
				color: Colors.textMuted,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			lockText.setOrigin(0.5, 0);
			lockText.setAlpha(0.5);
			return y + 50;
		}

		if (world.levels.length === 0) {
			// ── Unlocked but empty: coming soon ──
			const soonText = this.add.text(cx, y, 'Coming soon...', {
				...scaledStyle(Typography.small, ww),
				color: Colors.textMuted,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			soonText.setOrigin(0.5, 0);
			return y + 50;
		}

		// ── Level card grid ──
		const levels = world.levels;
		const cols = Math.min(levels.length, MAX_COLUMNS);
		const gridWidth = cols * LEVEL_CARD_SIZE + (cols - 1) * LEVEL_CARD_GAP;
		const startX = cx - gridWidth / 2 + LEVEL_CARD_SIZE / 2;

		for (let i = 0; i < levels.length; i++) {
			const levelId = levels[i];
			if (!levelId) continue;
			const col = i % MAX_COLUMNS;
			const row = Math.floor(i / MAX_COLUMNS);
			const lx = startX + col * (LEVEL_CARD_SIZE + LEVEL_CARD_GAP);
			const ly = y + row * (LEVEL_CARD_SIZE + LEVEL_CARD_GAP);
			this.createLevelCard(lx, ly, levelId, world.id, ww);
		}

		const rows = Math.ceil(levels.length / MAX_COLUMNS);
		return y + rows * (LEVEL_CARD_SIZE + LEVEL_CARD_GAP) + Spacing.md;
	}

	private createLevelCard(
		x: number,
		y: number,
		levelId: string,
		worldId: WorldId,
		ww: number,
	): void {
		const saveData = this.container.sessionSave.current;
		const completion = saveData.levels[levelId];
		const hasStars = completion !== undefined;

		// ── Card background ──
		const bg = this.add.rectangle(x, y, LEVEL_CARD_SIZE, LEVEL_CARD_SIZE, Colors.panel);
		bg.setStrokeStyle(2, 0x444444);
		bg.setInteractive({ useHandCursor: true });

		// ── Level label ──
		const displayName = levelId.replace(/-/g, ' ');
		const label = this.add.text(x, y - 12, displayName, {
			...scaledStyle(Typography.small, ww),
			color: Colors.text,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		label.setOrigin(0.5, 0.5);

		// ── Star rating ──
		if (hasStars) {
			const stars = this.add.text(x, y + 16, formatStars(completion.stars), {
				...scaledStyle(Typography.small, ww),
				color: Colors.accent,
			} as Phaser.Types.GameObjects.Text.TextStyle);
			stars.setOrigin(0.5, 0.5);
		}

		// ── Hover ──
		bg.on('pointerover', () => bg.setStrokeStyle(3, 0x66ff66));
		bg.on('pointerout', () => bg.setStrokeStyle(2, 0x444444));

		// ── Click → start level ──
		bg.on('pointerdown', () => {
			this.playButtonSfx();
			this.container.flowController.selectWorld(worldId);
			this.container.flowController.selectLevel(levelId);
			this.navigateTo(SceneKeys.PLATFORMER);
		});
	}
}
