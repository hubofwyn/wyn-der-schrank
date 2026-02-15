import type { CharacterDefinition, CharacterId } from '@hub-of-wyn/shared';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { Colors, Spacing, Typography } from '../modules/ui/design-tokens.js';
import { BaseScene } from './base-scene.js';

/** Color-coded border colors per character. */
const BORDER_COLORS: Record<CharacterId, number> = {
	knight: 0x4488ff,
	mage: 0xaa44ff,
	rogue: 0x44cc66,
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 420;
const CARD_GAP = Spacing.xl;
const STAT_BAR_WIDTH = 200;
const STAT_BAR_HEIGHT = 12;

/**
 * CharacterSelectScene — 3-character card layout.
 *
 * Displays character cards with name, description, stat bars, and
 * color-coded borders. Hover scales the card. Click selects the
 * character and navigates to MainMenu. Back resets flow and returns
 * to Title.
 *
 * Audio policy:
 *   Music  — continues title-theme from TitleScene
 *   SFX    — menu-select on card click and back button
 */
export class CharacterSelectScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.CHARACTER_SELECT });
	}

	create(): void {
		const { width, height } = this.scale;
		const cx = width / 2;

		this.cameras.main.setBackgroundColor(Colors.background);

		// ── Title ──
		const title = this.add.text(cx, 50, 'Choose Your Hero', {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		title.setOrigin(0.5, 0.5);

		// ── Character cards ──
		const characters = this.container.characterCatalog.getUnlocked();
		const totalWidth = characters.length * CARD_WIDTH + (characters.length - 1) * CARD_GAP;
		const startX = cx - totalWidth / 2 + CARD_WIDTH / 2;
		const cardY = height / 2 - 20;

		for (let i = 0; i < characters.length; i++) {
			const char = characters[i];
			if (!char) continue;
			const cardX = startX + i * (CARD_WIDTH + CARD_GAP);
			this.createCharacterCard(cardX, cardY, char);
		}

		// ── Back button ──
		const backBtn = this.add.text(80, height - 50, 'Back', {
			...Typography.button,
			color: Colors.button,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		backBtn.setOrigin(0.5, 0.5);
		backBtn.setInteractive({ useHandCursor: true });
		backBtn.on('pointerover', () => backBtn.setColor(Colors.buttonHover));
		backBtn.on('pointerout', () => backBtn.setColor(Colors.button));
		backBtn.on('pointerdown', () => {
			this.playButtonSfx();
			this.container.flowController.reset();
			this.navigateTo(SceneKeys.TITLE);
		});
	}

	private createCharacterCard(x: number, y: number, char: CharacterDefinition): void {
		const borderColor = BORDER_COLORS[char.id] ?? 0xffffff;

		// ── Card background ──
		const bg = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, Colors.panel);
		bg.setStrokeStyle(3, borderColor);
		bg.setInteractive({ useHandCursor: true });

		// ── Container group for scaling ──
		const container = this.add.container(x, y);

		// ── Name ──
		const nameText = this.add.text(0, -CARD_HEIGHT / 2 + Spacing.lg, char.name, {
			...Typography.heading,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		nameText.setOrigin(0.5, 0);
		container.add(nameText);

		// ── Description ──
		const descText = this.add.text(0, -CARD_HEIGHT / 2 + Spacing.lg + 44, char.description, {
			...Typography.small,
			color: Colors.textMuted,
			wordWrap: { width: CARD_WIDTH - Spacing.lg * 2 },
		} as Phaser.Types.GameObjects.Text.TextStyle);
		descText.setOrigin(0.5, 0);
		container.add(descText);

		// ── Stat bars ──
		const stats = [
			{ label: 'HP', value: char.stats.maxHealth, max: 200 },
			{ label: 'SPD', value: char.stats.speed, max: 350 },
			{ label: 'JMP', value: char.stats.jumpForce, max: 500 },
			{ label: 'ATK', value: char.stats.attackPower, max: 25 },
			{ label: 'DEF', value: char.stats.defense, max: 15 },
		];

		const statsStartY = -20;
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			if (!stat) continue;
			const sy = statsStartY + i * (STAT_BAR_HEIGHT + Spacing.sm + 4);
			this.createStatBar(
				container,
				-STAT_BAR_WIDTH / 2,
				sy,
				stat.label,
				stat.value,
				stat.max,
				borderColor,
			);
		}

		// ── Ability ──
		const abilityText = this.add.text(0, CARD_HEIGHT / 2 - Spacing.xl - 20, char.ability.name, {
			...Typography.small,
			color: Colors.accent,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		abilityText.setOrigin(0.5, 0.5);
		container.add(abilityText);

		// ── Hover effects ──
		let activeTween: Phaser.Tweens.Tween | null = null;
		bg.on('pointerover', () => {
			if (activeTween) activeTween.destroy();
			activeTween = this.tweens.add({
				targets: [bg, container],
				scaleX: 1.05,
				scaleY: 1.05,
				duration: 150,
				ease: 'Power2',
			});
			bg.setStrokeStyle(4, borderColor);
		});
		bg.on('pointerout', () => {
			if (activeTween) activeTween.destroy();
			activeTween = this.tweens.add({
				targets: [bg, container],
				scaleX: 1,
				scaleY: 1,
				duration: 150,
				ease: 'Power2',
			});
			bg.setStrokeStyle(3, borderColor);
		});

		// ── Click → select character ──
		bg.on('pointerdown', () => {
			this.playButtonSfx();
			this.container.flowController.selectCharacter(char.id);
			this.navigateTo(SceneKeys.MAIN_MENU);
		});
	}

	private createStatBar(
		container: Phaser.GameObjects.Container,
		x: number,
		y: number,
		label: string,
		value: number,
		max: number,
		color: number,
	): void {
		const labelText = this.add.text(x - 4, y, label, {
			...Typography.small,
			color: Colors.textMuted,
		} as Phaser.Types.GameObjects.Text.TextStyle);
		labelText.setOrigin(1, 0.5);
		container.add(labelText);

		const barBg = this.add.rectangle(
			x + STAT_BAR_WIDTH / 2,
			y,
			STAT_BAR_WIDTH,
			STAT_BAR_HEIGHT,
			0x333333,
		);
		barBg.setOrigin(0.5, 0.5);
		container.add(barBg);

		const fillWidth = Math.min(value / max, 1) * STAT_BAR_WIDTH;
		const barFill = this.add.rectangle(x, y, fillWidth, STAT_BAR_HEIGHT, color);
		barFill.setOrigin(0, 0.5);
		container.add(barFill);
	}
}
