/**
 * Scene layout helpers — pure TS functions for safe-zone positioning.
 *
 * Wraps viewport-math anchoring and design-token spacing into a
 * positioning API that scenes call in create(). Zero Phaser, zero DOM.
 */

import type { SafeZone } from '../viewport/viewport-math.js';
import { anchorInSafeZone, MIN_TOUCH_TARGET_PX } from '../viewport/viewport-math.js';
import { Spacing } from './design-tokens.js';

// ── Types ──

export interface MenuLayout {
	/** Center X of the safe zone (for horizontally centered UI). */
	readonly cx: number;
	/** Y positions for a vertical stack of items starting from a ratio of safe zone height. */
	readonly items: readonly number[];
}

export interface ButtonStackLayout {
	readonly cx: number;
	readonly items: readonly number[];
}

export interface CornerPosition {
	readonly x: number;
	readonly y: number;
}

export interface HitAreaSize {
	readonly width: number;
	readonly height: number;
}

// ── Functions ──

/**
 * Compute center X of the safe zone.
 */
export function safeCenterX(safeZone: SafeZone): number {
	return safeZone.x + safeZone.width / 2;
}

/**
 * Compute center Y of the safe zone.
 */
export function safeCenterY(safeZone: SafeZone): number {
	return safeZone.y + safeZone.height / 2;
}

/**
 * Layout a vertical menu centered in the safe zone.
 *
 * @param safeZone Current safe zone rectangle
 * @param ratios Array of height ratios (0-1) for each item's Y position within safe zone
 * @returns MenuLayout with cx and computed Y positions
 */
export function menuLayout(safeZone: SafeZone, ratios: readonly number[]): MenuLayout {
	const cx = safeCenterX(safeZone);
	const items = ratios.map((r) => Math.round(safeZone.y + safeZone.height * r));
	return { cx, items };
}

/**
 * Layout a stack of buttons starting from a Y position with consistent spacing.
 *
 * @param safeZone Safe zone rectangle
 * @param startRatio Y ratio within safe zone for the first button (0-1)
 * @param count Number of buttons
 * @param gap Pixel gap between buttons (default: 72 for comfortable touch spacing)
 */
export function buttonStack(
	safeZone: SafeZone,
	startRatio: number,
	count: number,
	gap = 72,
): ButtonStackLayout {
	const cx = safeCenterX(safeZone);
	const startY = safeZone.y + safeZone.height * startRatio;
	const items: number[] = [];
	for (let i = 0; i < count; i++) {
		items.push(startY + i * gap);
	}
	return { cx, items };
}

/**
 * Compute a corner button position using safe-zone anchoring.
 *
 * @param anchor Which corner to anchor to
 * @param safeZone Safe zone rectangle
 * @param insetX Horizontal inset from safe zone edge (default: Spacing.xxl)
 * @param insetY Vertical inset from safe zone edge (default: Spacing.xxl)
 */
export function cornerButton(
	anchor: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right',
	safeZone: SafeZone,
	insetX: number = Spacing.xxl,
	insetY: number = Spacing.xxl,
): CornerPosition {
	return anchorInSafeZone(anchor, insetX, insetY, safeZone);
}

/**
 * Compute hit area dimensions for a text button, enforcing 44px minimum.
 *
 * @param textWidth The measured width of the text label
 * @param textHeight The measured height of the text label
 * @param paddingX Horizontal padding added to each side (default: Spacing.md)
 * @param paddingY Vertical padding added to top and bottom (default: Spacing.sm)
 */
export function hitArea(
	textWidth: number,
	textHeight: number,
	paddingX: number = Spacing.md,
	paddingY: number = Spacing.sm,
): HitAreaSize {
	return {
		width: Math.max(textWidth + paddingX * 2, MIN_TOUCH_TARGET_PX),
		height: Math.max(textHeight + paddingY * 2, MIN_TOUCH_TARGET_PX),
	};
}

/**
 * Compute Y positions for a HUD column anchored to a safe-zone corner.
 *
 * @param anchor Which corner to start from
 * @param safeZone Safe zone rectangle
 * @param lineCount Number of HUD lines
 * @param lineHeight Pixel height per line (default: 24)
 * @param padding Inset from safe zone edge (default: Spacing.md)
 */
export function hudColumn(
	anchor: 'top-left' | 'top-right',
	safeZone: SafeZone,
	lineCount: number,
	lineHeight = 24,
	padding: number = Spacing.md,
): { x: number; lines: readonly number[] } {
	const pos = anchorInSafeZone(anchor, padding, padding, safeZone);
	const lines: number[] = [];
	for (let i = 0; i < lineCount; i++) {
		lines.push(pos.y + i * lineHeight);
	}
	return { x: pos.x, lines };
}

/**
 * Center a grid of cards horizontally in the safe zone.
 *
 * @param safeZone Safe zone rectangle
 * @param cardWidth Width of each card
 * @param cardCount Number of cards in the row
 * @param gap Gap between cards
 * @returns Starting X position (center of the first card)
 */
export function centeredGridStartX(
	safeZone: SafeZone,
	cardWidth: number,
	cardCount: number,
	gap: number,
): number {
	const totalWidth = cardCount * cardWidth + (cardCount - 1) * gap;
	return safeCenterX(safeZone) - totalWidth / 2 + cardWidth / 2;
}
