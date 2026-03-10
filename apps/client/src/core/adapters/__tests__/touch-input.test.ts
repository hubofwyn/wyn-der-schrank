// @vitest-environment happy-dom

import type { Settings } from '@hub-of-wyn/shared';
import { SettingsSchema } from '@hub-of-wyn/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TouchInput } from '../touch-input.js';

/**
 * Tests for TouchInput adapter.
 *
 * TouchInput creates DOM elements, so we need minimal DOM mocking.
 * We use JSDOM-compatible stubs and simulate pointer events to test
 * the state machine (isDown, justPressed, justReleased frame edges).
 */

function createDefaultSettings(): Settings {
	return SettingsSchema.parse({
		audio: {},
		display: {},
		controls: {},
		accessibility: {},
		diagnostics: {},
	});
}

/**
 * Simulate a PointerEvent on a button element.
 * Uses the native Event constructor if available, otherwise creates
 * a minimal event-like object.
 */
function simulatePointer(
	btn: HTMLButtonElement,
	type: 'pointerdown' | 'pointerup' | 'pointercancel',
	pointerId = 1,
): void {
	const event = new PointerEvent(type, {
		pointerId,
		bubbles: true,
		cancelable: true,
	});
	btn.dispatchEvent(event);
}

describe('TouchInput', () => {
	let parent: HTMLDivElement;
	let touchInput: TouchInput;
	let settings: Settings;

	beforeEach(() => {
		parent = document.createElement('div');
		document.body.appendChild(parent);
		settings = createDefaultSettings();

		// Stub setPointerCapture since it's not available in JSDOM
		HTMLElement.prototype.setPointerCapture = vi.fn();
		HTMLElement.prototype.releasePointerCapture = vi.fn();
	});

	afterEach(() => {
		touchInput?.destroy();
		parent.remove();
	});

	function create() {
		touchInput = new TouchInput(parent, settings);
		return touchInput;
	}

	function getButton(action: string): HTMLButtonElement {
		const btn = parent.querySelector(`[data-action="${action}"]`);
		if (!btn) throw new Error(`Button for action "${action}" not found`);
		return btn as HTMLButtonElement;
	}

	// ── DOM structure ──

	it('creates container element with touch-controls id', () => {
		create();
		const container = parent.querySelector('#touch-controls');
		expect(container).not.toBeNull();
	});

	it('creates buttons for all gameplay actions', () => {
		create();
		const actions = ['left', 'right', 'down', 'jump', 'attack', 'pause'];
		for (const action of actions) {
			expect(parent.querySelector(`[data-action="${action}"]`)).not.toBeNull();
		}
	});

	it('removes all DOM elements on destroy', () => {
		create();
		expect(parent.querySelector('#touch-controls')).not.toBeNull();
		touchInput.destroy();
		expect(parent.querySelector('#touch-controls')).toBeNull();
	});

	// ── State machine: isDown ──

	it('reports isDown after pointerdown', () => {
		create();
		const btn = getButton('jump');
		simulatePointer(btn, 'pointerdown', 1);
		expect(touchInput.isDown('jump')).toBe(true);
	});

	it('reports not isDown after pointerup', () => {
		create();
		const btn = getButton('jump');
		simulatePointer(btn, 'pointerdown', 1);
		simulatePointer(btn, 'pointerup', 1);
		expect(touchInput.isDown('jump')).toBe(false);
	});

	it('reports not isDown after pointercancel', () => {
		create();
		const btn = getButton('jump');
		simulatePointer(btn, 'pointerdown', 1);
		simulatePointer(btn, 'pointercancel', 1);
		expect(touchInput.isDown('jump')).toBe(false);
	});

	// ── State machine: justPressed / justReleased ──

	it('reports justPressed on the frame after pointerdown', () => {
		create();
		const btn = getButton('attack');
		simulatePointer(btn, 'pointerdown', 1);

		// First update: edge transition from not-down to down
		touchInput.update();
		expect(touchInput.justPressed('attack')).toBe(true);
	});

	it('clears justPressed on the next update', () => {
		create();
		const btn = getButton('attack');
		simulatePointer(btn, 'pointerdown', 1);

		touchInput.update(); // justPressed = true
		touchInput.update(); // justPressed = false (still down but not just pressed)
		expect(touchInput.justPressed('attack')).toBe(false);
		expect(touchInput.isDown('attack')).toBe(true);
	});

	it('reports justReleased on the frame after pointerup', () => {
		create();
		const btn = getButton('left');
		simulatePointer(btn, 'pointerdown', 1);
		touchInput.update(); // register the press

		simulatePointer(btn, 'pointerup', 1);
		touchInput.update(); // edge transition from down to not-down
		expect(touchInput.justReleased('left')).toBe(true);
	});

	it('clears justReleased on the next update', () => {
		create();
		const btn = getButton('left');
		simulatePointer(btn, 'pointerdown', 1);
		touchInput.update();

		simulatePointer(btn, 'pointerup', 1);
		touchInput.update(); // justReleased = true
		touchInput.update(); // justReleased = false
		expect(touchInput.justReleased('left')).toBe(false);
	});

	// ── getAxis ──

	it('returns -1 for horizontal when left is down', () => {
		create();
		simulatePointer(getButton('left'), 'pointerdown', 1);
		expect(touchInput.getAxis('horizontal')).toBe(-1);
	});

	it('returns 1 for horizontal when right is down', () => {
		create();
		simulatePointer(getButton('right'), 'pointerdown', 1);
		expect(touchInput.getAxis('horizontal')).toBe(1);
	});

	it('returns 0 when both left and right are down', () => {
		create();
		simulatePointer(getButton('left'), 'pointerdown', 1);
		simulatePointer(getButton('right'), 'pointerdown', 2);
		expect(touchInput.getAxis('horizontal')).toBe(0);
	});

	it('returns 0 for horizontal when no direction is down', () => {
		create();
		expect(touchInput.getAxis('horizontal')).toBe(0);
	});

	// ── Multi-touch ──

	it('tracks multiple simultaneous buttons', () => {
		create();
		simulatePointer(getButton('left'), 'pointerdown', 1);
		simulatePointer(getButton('jump'), 'pointerdown', 2);

		expect(touchInput.isDown('left')).toBe(true);
		expect(touchInput.isDown('jump')).toBe(true);
	});

	it('releases only the correct button on pointerup', () => {
		create();
		simulatePointer(getButton('left'), 'pointerdown', 1);
		simulatePointer(getButton('jump'), 'pointerdown', 2);

		simulatePointer(getButton('left'), 'pointerup', 1);
		expect(touchInput.isDown('left')).toBe(false);
		expect(touchInput.isDown('jump')).toBe(true);
	});

	// ── Visibility ──

	it('starts visible by default', () => {
		create();
		expect(touchInput.visible).toBe(true);
	});

	it('hides the container when setVisible(false) is called', () => {
		create();
		touchInput.setVisible(false);
		expect(touchInput.visible).toBe(false);
		const container = parent.querySelector('#touch-controls') as HTMLElement;
		expect(container.style.display).toBe('none');
	});

	it('shows the container when setVisible(true) is called', () => {
		create();
		touchInput.setVisible(false);
		touchInput.setVisible(true);
		expect(touchInput.visible).toBe(true);
		const container = parent.querySelector('#touch-controls') as HTMLElement;
		expect(container.style.display).not.toBe('none');
	});

	it('releases all buttons when hidden', () => {
		create();
		simulatePointer(getButton('jump'), 'pointerdown', 1);
		expect(touchInput.isDown('jump')).toBe(true);

		touchInput.setVisible(false);
		expect(touchInput.isDown('jump')).toBe(false);
	});

	// ── isTouchActive ──

	it('reports isTouchActive as false when no buttons pressed', () => {
		create();
		touchInput.update();
		expect(touchInput.isTouchActive).toBe(false);
	});

	it('reports isTouchActive as true when a button is pressed', () => {
		create();
		simulatePointer(getButton('jump'), 'pointerdown', 1);
		touchInput.update();
		expect(touchInput.isTouchActive).toBe(true);
	});

	// ── Settings ──

	it('applies button opacity from settings', () => {
		settings = SettingsSchema.parse({
			audio: {},
			display: { touchButtonOpacity: 0.8 },
			controls: {},
			accessibility: {},
			diagnostics: {},
		});
		create();
		const btn = getButton('jump');
		// Check that the button has some background style (exact value depends on opacity)
		expect(btn.style.background).toContain('rgba');
	});

	it('applies button size from settings', () => {
		settings = SettingsSchema.parse({
			audio: {},
			display: { touchButtonSize: 'large' },
			controls: {},
			accessibility: {},
			diagnostics: {},
		});
		create();
		const btn = getButton('jump');
		expect(btn.style.width).toBe('72px');
		expect(btn.style.height).toBe('72px');
	});
});
