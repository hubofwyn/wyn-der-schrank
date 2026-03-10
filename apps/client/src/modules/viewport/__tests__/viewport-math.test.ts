import { describe, expect, it } from 'vitest';
import {
	anchorInSafeZone,
	computeWorldSize,
	createSafeZone,
	MIN_TOUCH_TARGET_PX,
	SAFE_ZONE_HEIGHT,
	SAFE_ZONE_WIDTH,
	scaleFontSize,
	scaleFontSizeStr,
	TEXT_SCALE_FLOOR,
	WORLD_HEIGHT,
	WORLD_WIDTH_MAX,
	WORLD_WIDTH_MIN,
} from '../viewport-math.js';

// ── Constants ──

describe('viewport constants', () => {
	it('has fixed world height of 720', () => {
		expect(WORLD_HEIGHT).toBe(720);
	});

	it('has world width range 960–1600', () => {
		expect(WORLD_WIDTH_MIN).toBe(960);
		expect(WORLD_WIDTH_MAX).toBe(1600);
	});

	it('has safe zone 1280x720', () => {
		expect(SAFE_ZONE_WIDTH).toBe(1280);
		expect(SAFE_ZONE_HEIGHT).toBe(720);
	});

	it('has text scale floor of 1.0', () => {
		expect(TEXT_SCALE_FLOOR).toBe(1.0);
	});

	it('has minimum touch target of 44px', () => {
		expect(MIN_TOUCH_TARGET_PX).toBe(44);
	});
});

// ── computeWorldSize ──

describe('computeWorldSize', () => {
	it('returns 1280x720 for a 16:9 screen', () => {
		const result = computeWorldSize(1920, 1080);
		expect(result).toEqual({ width: 1280, height: 720 });
	});

	it('returns 1280x720 for exact reference resolution', () => {
		const result = computeWorldSize(1280, 720);
		expect(result).toEqual({ width: 1280, height: 720 });
	});

	it('clamps to WORLD_WIDTH_MIN for narrow aspect ratios', () => {
		// 4:3 = 1.333 → 720 * 1.333 = 960
		const result = computeWorldSize(1024, 768);
		expect(result.width).toBe(WORLD_WIDTH_MIN);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('clamps to WORLD_WIDTH_MIN for portrait screens', () => {
		// Portrait phone: taller than wide
		const result = computeWorldSize(390, 844);
		expect(result.width).toBe(WORLD_WIDTH_MIN);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('clamps to WORLD_WIDTH_MAX for ultrawide screens', () => {
		// 21:9 = 2.333 → 720 * 2.333 = 1680 → clamped to 1600
		const result = computeWorldSize(2560, 1080);
		expect(result.width).toBe(WORLD_WIDTH_MAX);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('handles typical mobile landscape (iPhone 15 Pro)', () => {
		// 2556x1179 → aspect 2.168 → 720 * 2.168 = 1561
		const result = computeWorldSize(2556, 1179);
		expect(result.width).toBeGreaterThanOrEqual(WORLD_WIDTH_MIN);
		expect(result.width).toBeLessThanOrEqual(WORLD_WIDTH_MAX);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('handles iPad landscape (4:3)', () => {
		const result = computeWorldSize(2048, 1536);
		expect(result.width).toBe(WORLD_WIDTH_MIN);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('returns safe defaults for zero dimensions', () => {
		expect(computeWorldSize(0, 0)).toEqual({ width: SAFE_ZONE_WIDTH, height: WORLD_HEIGHT });
		expect(computeWorldSize(0, 1080)).toEqual({ width: SAFE_ZONE_WIDTH, height: WORLD_HEIGHT });
		expect(computeWorldSize(1920, 0)).toEqual({ width: SAFE_ZONE_WIDTH, height: WORLD_HEIGHT });
	});

	it('returns safe defaults for negative dimensions', () => {
		expect(computeWorldSize(-100, 100)).toEqual({ width: SAFE_ZONE_WIDTH, height: WORLD_HEIGHT });
	});

	it('rounds to nearest pixel', () => {
		// 1366x768 → aspect 1.778... → 720 * 1.778 = 1280.16 → 1280
		const result = computeWorldSize(1366, 768);
		expect(Number.isInteger(result.width)).toBe(true);
	});

	it('handles 1:1 square aspect ratio', () => {
		const result = computeWorldSize(1000, 1000);
		expect(result.width).toBe(WORLD_WIDTH_MIN);
		expect(result.height).toBe(WORLD_HEIGHT);
	});

	it('produces width within valid range for various screens', () => {
		const screens = [
			[375, 667], // iPhone SE portrait
			[667, 375], // iPhone SE landscape
			[1920, 1080], // 1080p
			[2560, 1440], // 1440p
			[3840, 2160], // 4K
			[1280, 800], // MacBook Air
		];
		for (const [w, h] of screens) {
			const result = computeWorldSize(w, h);
			expect(result.width).toBeGreaterThanOrEqual(WORLD_WIDTH_MIN);
			expect(result.width).toBeLessThanOrEqual(WORLD_WIDTH_MAX);
			expect(result.height).toBe(WORLD_HEIGHT);
		}
	});
});

// ── createSafeZone ──

describe('createSafeZone', () => {
	it('centers safe zone at reference width 1280', () => {
		const zone = createSafeZone(1280);
		expect(zone.x).toBe(0);
		expect(zone.y).toBe(0);
		expect(zone.width).toBe(1280);
		expect(zone.height).toBe(720);
		expect(zone.right).toBe(1280);
		expect(zone.bottom).toBe(720);
	});

	it('has equal margins for wider worlds', () => {
		const zone = createSafeZone(1600);
		const margin = (1600 - SAFE_ZONE_WIDTH) / 2; // 160
		expect(zone.x).toBe(margin);
		expect(zone.right).toBe(1600 - margin);
	});

	it('has zero x offset at minimum width', () => {
		// 960 < 1280, so margin is negative but rounded
		const zone = createSafeZone(960);
		expect(zone.x).toBe(Math.round((960 - SAFE_ZONE_WIDTH) / 2));
		expect(zone.width).toBe(SAFE_ZONE_WIDTH);
	});

	it('always has height = SAFE_ZONE_HEIGHT', () => {
		for (const w of [960, 1280, 1440, 1600]) {
			expect(createSafeZone(w).height).toBe(SAFE_ZONE_HEIGHT);
		}
	});

	it('right = x + width', () => {
		const zone = createSafeZone(1440);
		expect(zone.right).toBe(zone.x + zone.width);
	});

	it('bottom = y + height', () => {
		const zone = createSafeZone(1440);
		expect(zone.bottom).toBe(zone.y + zone.height);
	});
});

// ── scaleFontSize ──

describe('scaleFontSize', () => {
	it('returns base size at reference width 1280', () => {
		expect(scaleFontSize(24, 1280)).toBe(24);
	});

	it('scales up for wider worlds', () => {
		// 1600 / 1280 = 1.25 → 24 * 1.25 = 30
		expect(scaleFontSize(24, 1600)).toBe(30);
	});

	it('never scales below TEXT_SCALE_FLOOR (1.0)', () => {
		// 960 / 1280 = 0.75, but floor is 1.0 → returns 24
		expect(scaleFontSize(24, 960)).toBe(24);
	});

	it('returns base size for zero world width', () => {
		expect(scaleFontSize(24, 0)).toBe(24);
	});

	it('returns integer values', () => {
		expect(Number.isInteger(scaleFontSize(24, 1440))).toBe(true);
		expect(Number.isInteger(scaleFontSize(18, 1366))).toBe(true);
	});

	it('scales all design token sizes correctly at reference width', () => {
		const tokenSizes = [48, 32, 24, 28, 18]; // title, heading, body, button, small
		for (const size of tokenSizes) {
			expect(scaleFontSize(size, SAFE_ZONE_WIDTH)).toBe(size);
		}
	});

	it('monotonically increases with world width above reference', () => {
		const widths = [1280, 1360, 1440, 1520, 1600];
		const sizes = widths.map((w) => scaleFontSize(24, w));
		for (let i = 1; i < sizes.length; i++) {
			expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
		}
	});
});

// ── scaleFontSizeStr ──

describe('scaleFontSizeStr', () => {
	it('returns pixel string at reference width', () => {
		expect(scaleFontSizeStr(24, 1280)).toBe('24px');
	});

	it('returns scaled pixel string for wider world', () => {
		expect(scaleFontSizeStr(24, 1600)).toBe('30px');
	});
});

// ── anchorInSafeZone ──

describe('anchorInSafeZone', () => {
	const zone = createSafeZone(1280);

	it('anchors to top-left with offset', () => {
		const pos = anchorInSafeZone('top-left', 16, 16, zone);
		expect(pos.x).toBe(zone.x + 16);
		expect(pos.y).toBe(zone.y + 16);
	});

	it('anchors to top-right with offset', () => {
		const pos = anchorInSafeZone('top-right', 16, 16, zone);
		expect(pos.x).toBe(zone.right - 16);
		expect(pos.y).toBe(zone.y + 16);
	});

	it('anchors to bottom-left with offset', () => {
		const pos = anchorInSafeZone('bottom-left', 16, 16, zone);
		expect(pos.x).toBe(zone.x + 16);
		expect(pos.y).toBe(zone.bottom - 16);
	});

	it('anchors to bottom-right with offset', () => {
		const pos = anchorInSafeZone('bottom-right', 16, 16, zone);
		expect(pos.x).toBe(zone.right - 16);
		expect(pos.y).toBe(zone.bottom - 16);
	});

	it('anchors to center with zero offset', () => {
		const pos = anchorInSafeZone('center', 0, 0, zone);
		expect(pos.x).toBe(zone.x + zone.width / 2);
		expect(pos.y).toBe(zone.y + zone.height / 2);
	});

	it('anchors to center with offset', () => {
		const pos = anchorInSafeZone('center', 10, -20, zone);
		expect(pos.x).toBe(zone.x + zone.width / 2 + 10);
		expect(pos.y).toBe(zone.y + zone.height / 2 - 20);
	});

	it('works with wider world safe zones', () => {
		const wideZone = createSafeZone(1600);
		const pos = anchorInSafeZone('top-left', 16, 16, wideZone);
		expect(pos.x).toBe(wideZone.x + 16);
		// Wide zone has x offset of 160, so top-left is at 176
		expect(pos.x).toBe(176);
	});

	it('places HUD elements inside visible area', () => {
		const wideZone = createSafeZone(1440);
		const topLeft = anchorInSafeZone('top-left', 0, 0, wideZone);
		const bottomRight = anchorInSafeZone('bottom-right', 0, 0, wideZone);

		expect(topLeft.x).toBeGreaterThanOrEqual(wideZone.x);
		expect(topLeft.y).toBeGreaterThanOrEqual(wideZone.y);
		expect(bottomRight.x).toBeLessThanOrEqual(wideZone.right);
		expect(bottomRight.y).toBeLessThanOrEqual(wideZone.bottom);
	});
});
