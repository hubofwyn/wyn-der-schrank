/**
 * Pure viewport math — computes world size, safe zone, and font scaling.
 *
 * Zero DOM, zero Phaser. All inputs are plain numbers.
 * Used by the adapter layer (phaser-viewport.ts) which feeds in device dimensions.
 */

// ── Constants ──

/** Fixed world height — the game is designed at 720px tall. */
export const WORLD_HEIGHT = 720;

/** Minimum world width (narrow phones in landscape). */
export const WORLD_WIDTH_MIN = 960;

/** Maximum world width (ultrawide monitors). */
export const WORLD_WIDTH_MAX = 1600;

/** Safe zone width — guaranteed visible on all supported aspect ratios. */
export const SAFE_ZONE_WIDTH = 1280;

/** Safe zone height — matches world height. */
export const SAFE_ZONE_HEIGHT = 720;

/**
 * Floor for text scale factor.
 * With FIT mode the engine already downscales the canvas to fit the screen.
 * A floor of 1.0 prevents double-dip shrinking in scaleFontSize().
 */
export const TEXT_SCALE_FLOOR = 1.0;

/** Minimum touch target size in CSS pixels (WCAG / Apple HIG). */
export const MIN_TOUCH_TARGET_PX = 44;

// ── Interfaces ──

export interface WorldSize {
	readonly width: number;
	readonly height: number;
}

export interface SafeZone {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly right: number;
	readonly bottom: number;
}

export interface SafeAreaInsets {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

// ── Functions ──

/**
 * Compute world size from the device's screen dimensions.
 *
 * The world is always WORLD_HEIGHT tall. Width varies based on the
 * device aspect ratio, clamped to [WORLD_WIDTH_MIN, WORLD_WIDTH_MAX].
 *
 * @param screenWidth  Device screen width in CSS pixels
 * @param screenHeight Device screen height in CSS pixels
 */
export function computeWorldSize(screenWidth: number, screenHeight: number): WorldSize {
	if (screenHeight <= 0 || screenWidth <= 0) {
		return { width: SAFE_ZONE_WIDTH, height: WORLD_HEIGHT };
	}

	const aspectRatio = screenWidth / screenHeight;
	const rawWidth = Math.round(WORLD_HEIGHT * aspectRatio);
	const width = Math.max(WORLD_WIDTH_MIN, Math.min(WORLD_WIDTH_MAX, rawWidth));

	return { width, height: WORLD_HEIGHT };
}

/**
 * Create the safe zone rectangle centered within the computed world size.
 *
 * The safe zone is always SAFE_ZONE_WIDTH x SAFE_ZONE_HEIGHT, centered
 * horizontally in the world. HUD elements and menus should be positioned
 * within this rectangle to remain visible on all devices.
 *
 * @param worldWidth The computed world width from computeWorldSize()
 */
export function createSafeZone(worldWidth: number): SafeZone {
	const x = Math.round((worldWidth - SAFE_ZONE_WIDTH) / 2);
	const y = 0;
	const width = SAFE_ZONE_WIDTH;
	const height = SAFE_ZONE_HEIGHT;

	return {
		x,
		y,
		width,
		height,
		right: x + width,
		bottom: y + height,
	};
}

/**
 * Scale a base font size for the current world dimensions.
 *
 * At the reference resolution (1280x720), returns the base size unmodified.
 * For wider worlds, scales proportionally but never below TEXT_SCALE_FLOOR.
 * This prevents text from becoming unreadably small on narrow devices.
 *
 * @param baseSizePx Base font size from design tokens (e.g. 24)
 * @param worldWidth Current world width from computeWorldSize()
 * @returns Scaled font size in pixels (always >= baseSizePx * TEXT_SCALE_FLOOR)
 */
export function scaleFontSize(baseSizePx: number, worldWidth: number): number {
	if (worldWidth <= 0) return baseSizePx;

	const scale = worldWidth / SAFE_ZONE_WIDTH;
	const clampedScale = Math.max(TEXT_SCALE_FLOOR, scale);
	return Math.round(baseSizePx * clampedScale);
}

/**
 * Format a scaled font size as a CSS-style pixel string.
 *
 * Convenience wrapper: `scaleFontSizeStr(24, 1280)` returns `"24px"`.
 */
export function scaleFontSizeStr(baseSizePx: number, worldWidth: number): string {
	return `${scaleFontSize(baseSizePx, worldWidth)}px`;
}

/**
 * Compute anchored position within the safe zone.
 *
 * @param anchor  Which corner/edge to anchor to
 * @param offsetX Offset from anchor in world pixels (positive = inward)
 * @param offsetY Offset from anchor in world pixels (positive = inward)
 * @param safeZone The safe zone rectangle
 */
export function anchorInSafeZone(
	anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
	offsetX: number,
	offsetY: number,
	safeZone: SafeZone,
): { x: number; y: number } {
	switch (anchor) {
		case 'top-left':
			return { x: safeZone.x + offsetX, y: safeZone.y + offsetY };
		case 'top-right':
			return { x: safeZone.right - offsetX, y: safeZone.y + offsetY };
		case 'bottom-left':
			return { x: safeZone.x + offsetX, y: safeZone.bottom - offsetY };
		case 'bottom-right':
			return { x: safeZone.right - offsetX, y: safeZone.bottom - offsetY };
		case 'center':
			return {
				x: safeZone.x + safeZone.width / 2 + offsetX,
				y: safeZone.y + safeZone.height / 2 + offsetY,
			};
	}
}
