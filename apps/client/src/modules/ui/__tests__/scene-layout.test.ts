import { describe, expect, it } from 'vitest';
import type { SafeZone } from '../../viewport/viewport-math.js';
import { MIN_TOUCH_TARGET_PX } from '../../viewport/viewport-math.js';
import { Spacing } from '../design-tokens.js';
import {
	buttonStack,
	centeredGridStartX,
	cornerButton,
	hitArea,
	hudColumn,
	menuLayout,
	safeCenterX,
	safeCenterY,
	scaledStyle,
} from '../scene-layout.js';

// Reference safe zone: 1280x720 centered in a 1280-wide world (x=0)
const REF_ZONE: SafeZone = { x: 0, y: 0, width: 1280, height: 720, right: 1280, bottom: 720 };

// Wide world: 1600 wide, safe zone centered (x=160)
const WIDE_ZONE: SafeZone = {
	x: 160,
	y: 0,
	width: 1280,
	height: 720,
	right: 1440,
	bottom: 720,
};

describe('safeCenterX', () => {
	it('returns center of reference zone', () => {
		expect(safeCenterX(REF_ZONE)).toBe(640);
	});

	it('returns center of wide zone', () => {
		expect(safeCenterX(WIDE_ZONE)).toBe(800);
	});
});

describe('safeCenterY', () => {
	it('returns center of reference zone', () => {
		expect(safeCenterY(REF_ZONE)).toBe(360);
	});
});

describe('menuLayout', () => {
	it('computes Y positions from height ratios', () => {
		const layout = menuLayout(REF_ZONE, [0.3, 0.55, 0.65]);
		expect(layout.cx).toBe(640);
		expect(layout.items).toEqual([216, 396, 468]);
	});

	it('works with wide zone offset', () => {
		const layout = menuLayout(WIDE_ZONE, [0.5]);
		expect(layout.cx).toBe(800);
		expect(layout.items).toEqual([360]);
	});

	it('handles empty ratios', () => {
		const layout = menuLayout(REF_ZONE, []);
		expect(layout.items).toEqual([]);
	});
});

describe('buttonStack', () => {
	it('stacks buttons with default 72px gap', () => {
		const stack = buttonStack(REF_ZONE, 0.45, 3);
		expect(stack.cx).toBe(640);
		expect(stack.items).toHaveLength(3);
		expect(stack.items[1]! - stack.items[0]!).toBe(72);
		expect(stack.items[2]! - stack.items[1]!).toBe(72);
	});

	it('uses custom gap', () => {
		const stack = buttonStack(REF_ZONE, 0.5, 2, 60);
		expect(stack.items[1]! - stack.items[0]!).toBe(60);
	});

	it('first item starts at correct ratio', () => {
		const stack = buttonStack(REF_ZONE, 0.45, 1);
		expect(stack.items[0]).toBe(720 * 0.45);
	});
});

describe('cornerButton', () => {
	it('anchors bottom-left with default insets', () => {
		const pos = cornerButton('bottom-left', REF_ZONE);
		expect(pos.x).toBe(Spacing.xxl);
		expect(pos.y).toBe(720 - Spacing.xxl);
	});

	it('anchors bottom-right with default insets', () => {
		const pos = cornerButton('bottom-right', REF_ZONE);
		expect(pos.x).toBe(1280 - Spacing.xxl);
		expect(pos.y).toBe(720 - Spacing.xxl);
	});

	it('anchors bottom-left in wide zone', () => {
		const pos = cornerButton('bottom-left', WIDE_ZONE);
		expect(pos.x).toBe(160 + Spacing.xxl);
	});

	it('accepts custom insets', () => {
		const pos = cornerButton('top-left', REF_ZONE, 80, 50);
		expect(pos.x).toBe(80);
		expect(pos.y).toBe(50);
	});
});

describe('hitArea', () => {
	it('enforces 44px minimum width', () => {
		const area = hitArea(10, 10, 0, 0);
		expect(area.width).toBe(MIN_TOUCH_TARGET_PX);
		expect(area.height).toBe(MIN_TOUCH_TARGET_PX);
	});

	it('uses text dimensions plus padding when larger than minimum', () => {
		const area = hitArea(200, 30);
		expect(area.width).toBe(200 + Spacing.md * 2);
		expect(area.height).toBe(Math.max(30 + Spacing.sm * 2, MIN_TOUCH_TARGET_PX));
	});

	it('applies custom padding', () => {
		const area = hitArea(100, 30, 20, 20);
		expect(area.width).toBe(140);
		expect(area.height).toBe(70);
	});

	it('returns minimum for zero-size text', () => {
		const area = hitArea(0, 0);
		expect(area.width).toBe(MIN_TOUCH_TARGET_PX);
		expect(area.height).toBe(MIN_TOUCH_TARGET_PX);
	});
});

describe('hudColumn', () => {
	it('generates line positions from top-left', () => {
		const col = hudColumn('top-left', REF_ZONE, 4);
		expect(col.x).toBe(Spacing.md);
		expect(col.lines).toHaveLength(4);
		expect(col.lines[0]).toBe(Spacing.md);
		expect(col.lines[1]).toBe(Spacing.md + 24);
		expect(col.lines[2]).toBe(Spacing.md + 48);
		expect(col.lines[3]).toBe(Spacing.md + 72);
	});

	it('generates from top-right', () => {
		const col = hudColumn('top-right', REF_ZONE, 1);
		expect(col.x).toBe(1280 - Spacing.md);
	});

	it('uses custom line height and padding', () => {
		const col = hudColumn('top-left', REF_ZONE, 2, 30, 20);
		expect(col.x).toBe(20);
		expect(col.lines[0]).toBe(20);
		expect(col.lines[1]).toBe(50);
	});

	it('respects wide zone offset', () => {
		const col = hudColumn('top-left', WIDE_ZONE, 1);
		expect(col.x).toBe(160 + Spacing.md);
	});
});

describe('centeredGridStartX', () => {
	it('centers 3 cards in reference zone', () => {
		const startX = centeredGridStartX(REF_ZONE, 320, 3, 32);
		const totalWidth = 3 * 320 + 2 * 32;
		const expected = 640 - totalWidth / 2 + 160;
		expect(startX).toBe(expected);
	});

	it('centers single card at safe zone center', () => {
		const startX = centeredGridStartX(REF_ZONE, 100, 1, 0);
		expect(startX).toBe(640);
	});

	it('offsets for wide zone', () => {
		const startX = centeredGridStartX(WIDE_ZONE, 100, 1, 0);
		expect(startX).toBe(800);
	});
});

describe('scaledStyle', () => {
	const BASE_STYLE = { fontSize: '28px', fontFamily: 'monospace' } as const;

	it('returns base fontSize at reference width (1280)', () => {
		const result = scaledStyle(BASE_STYLE, 1280);
		expect(result.fontSize).toBe('28px');
		expect(result.fontFamily).toBe('monospace');
	});

	it('scales up fontSize for wider worlds', () => {
		const result = scaledStyle(BASE_STYLE, 1600);
		// 28 * (1600/1280) = 35
		expect(result.fontSize).toBe('35px');
	});

	it('preserves base fontSize for narrow worlds (floor = 1.0)', () => {
		const result = scaledStyle(BASE_STYLE, 960);
		// scale = 960/1280 = 0.75, clamped to 1.0
		expect(result.fontSize).toBe('28px');
	});

	it('preserves fontStyle if present', () => {
		const bold = { fontSize: '48px', fontFamily: 'monospace', fontStyle: 'bold' } as const;
		const result = scaledStyle(bold, 1280);
		expect(result.fontStyle).toBe('bold');
		expect(result.fontSize).toBe('48px');
	});

	it('does not mutate the original style', () => {
		const original = { fontSize: '24px', fontFamily: 'monospace' };
		scaledStyle(original, 1600);
		expect(original.fontSize).toBe('24px');
	});
});
