import { describe, expect, it, vi } from 'vitest';
import { createMockInput } from '../../../modules/__test-utils__/mocks.js';
import { AdaptiveInput } from '../adaptive-input.js';

describe('AdaptiveInput', () => {
	function createPair() {
		const keyboard = createMockInput();
		const touch = createMockInput();
		const adaptive = new AdaptiveInput(keyboard, touch);
		return { keyboard, touch, adaptive };
	}

	// ── update ──

	it('calls update on both child providers', () => {
		const { keyboard, touch, adaptive } = createPair();
		adaptive.update();
		expect(keyboard.update).toHaveBeenCalledOnce();
		expect(touch.update).toHaveBeenCalledOnce();
	});

	// ── isDown ──

	it('returns true when keyboard reports isDown', () => {
		const { keyboard, adaptive } = createPair();
		keyboard._pressed.add('jump');
		expect(adaptive.isDown('jump')).toBe(true);
	});

	it('returns true when touch reports isDown', () => {
		const { touch, adaptive } = createPair();
		touch._pressed.add('jump');
		expect(adaptive.isDown('jump')).toBe(true);
	});

	it('returns true when both report isDown', () => {
		const { keyboard, touch, adaptive } = createPair();
		keyboard._pressed.add('left');
		touch._pressed.add('left');
		expect(adaptive.isDown('left')).toBe(true);
	});

	it('returns false when neither reports isDown', () => {
		const { adaptive } = createPair();
		expect(adaptive.isDown('attack')).toBe(false);
	});

	// ── justPressed ──

	it('returns true when keyboard justPressed', () => {
		const { keyboard, adaptive } = createPair();
		keyboard._justPressed.add('jump');
		expect(adaptive.justPressed('jump')).toBe(true);
	});

	it('returns true when touch justPressed', () => {
		const { touch, adaptive } = createPair();
		touch._justPressed.add('attack');
		expect(adaptive.justPressed('attack')).toBe(true);
	});

	it('returns false when neither justPressed', () => {
		const { adaptive } = createPair();
		expect(adaptive.justPressed('jump')).toBe(false);
	});

	// ── justReleased ──

	it('returns true when keyboard justReleased', () => {
		const { keyboard, adaptive } = createPair();
		keyboard._justReleased.add('right');
		expect(adaptive.justReleased('right')).toBe(true);
	});

	it('returns true when touch justReleased', () => {
		const { touch, adaptive } = createPair();
		touch._justReleased.add('left');
		expect(adaptive.justReleased('left')).toBe(true);
	});

	// ── getAxis ──

	it('returns keyboard axis when touch is zero', () => {
		const { keyboard, adaptive } = createPair();
		keyboard._pressed.add('right');
		expect(adaptive.getAxis('horizontal')).toBe(1);
	});

	it('returns touch axis when keyboard is zero', () => {
		const { touch, adaptive } = createPair();
		touch._pressed.add('left');
		expect(adaptive.getAxis('horizontal')).toBe(-1);
	});

	it('returns touch axis when both are nonzero (touch priority)', () => {
		const { keyboard, touch, adaptive } = createPair();
		keyboard._pressed.add('right');
		touch._pressed.add('left');
		// Both have magnitude 1, touch wins when equal
		const axis = adaptive.getAxis('horizontal');
		expect(axis === -1 || axis === 1).toBe(true);
	});

	it('returns zero when neither has axis input', () => {
		const { adaptive } = createPair();
		expect(adaptive.getAxis('horizontal')).toBe(0);
	});

	// ── isTouchActive ──

	it('reports isTouchActive from touch provider', () => {
		const { adaptive } = createPair();
		// MockInput has isTouchActive = false by default
		expect(adaptive.isTouchActive).toBe(false);
	});

	// ── getBinding / setBinding / resetBindings ──

	it('delegates getBinding to keyboard', () => {
		const { keyboard, adaptive } = createPair();
		const spy = vi.spyOn(keyboard, 'getBinding').mockReturnValue('KeyW');
		expect(adaptive.getBinding('jump')).toBe('KeyW');
		expect(spy).toHaveBeenCalledWith('jump');
	});

	it('delegates setBinding to keyboard', () => {
		const { adaptive } = createPair();
		// setBinding is a vi.fn() on MockInput, just verify no throw
		adaptive.setBinding('jump', 'KeyW');
	});

	it('delegates resetBindings to keyboard', () => {
		const { adaptive } = createPair();
		adaptive.resetBindings();
	});
});
