import { describe, expect, it } from 'vitest';
import { Colors, Spacing, Typography, ZIndex } from '../design-tokens.js';

describe('design-tokens', () => {
	it('exports Colors with expected keys', () => {
		expect(Colors.background).toBe(0x1a1a2e);
		expect(Colors.text).toBe('#ffffff');
		expect(Colors.button).toBe('#44ff44');
		expect(Object.isFrozen(Colors)).toBe(true);
	});

	it('exports Spacing with a numeric scale', () => {
		expect(Spacing.xs).toBe(4);
		expect(Spacing.md).toBe(16);
		expect(Spacing.xxl).toBe(48);
		expect(Object.isFrozen(Spacing)).toBe(true);
	});

	it('exports Typography with TextStyleDef shapes', () => {
		expect(Typography.title).toMatchObject({
			fontSize: '48px',
			fontFamily: 'monospace',
			fontStyle: 'bold',
		});
		expect(Typography.body).toMatchObject({
			fontSize: '24px',
			fontFamily: 'monospace',
		});
		expect(Object.isFrozen(Typography)).toBe(true);
	});

	it('exports ZIndex with ordered depth layers', () => {
		expect(ZIndex.background).toBeLessThan(ZIndex.world);
		expect(ZIndex.world).toBeLessThan(ZIndex.entities);
		expect(ZIndex.entities).toBeLessThan(ZIndex.hud);
		expect(ZIndex.hud).toBeLessThan(ZIndex.overlay);
		expect(ZIndex.overlay).toBeLessThan(ZIndex.modal);
		expect(Object.isFrozen(ZIndex)).toBe(true);
	});
});
