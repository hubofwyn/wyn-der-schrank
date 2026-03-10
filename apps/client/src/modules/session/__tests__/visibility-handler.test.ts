import { describe, expect, it } from 'vitest';
import { VisibilityHandler } from '../visibility-handler.js';

describe('VisibilityHandler', () => {
	it('calls onHidden when page becomes hidden', () => {
		let visCallback: ((visible: boolean) => void) | null = null;
		let hiddenCalls = 0;
		let visibleCalls = 0;

		new VisibilityHandler({
			onVisibilityChange: (cb) => {
				visCallback = cb;
				return () => {
					visCallback = null;
				};
			},
			onHidden: () => hiddenCalls++,
			onVisible: () => visibleCalls++,
		});

		visCallback?.(false);
		expect(hiddenCalls).toBe(1);
		expect(visibleCalls).toBe(0);
	});

	it('calls onVisible when page becomes visible', () => {
		let visCallback: ((visible: boolean) => void) | null = null;
		let hiddenCalls = 0;
		let visibleCalls = 0;

		new VisibilityHandler({
			onVisibilityChange: (cb) => {
				visCallback = cb;
				return () => {
					visCallback = null;
				};
			},
			onHidden: () => hiddenCalls++,
			onVisible: () => visibleCalls++,
		});

		visCallback?.(true);
		expect(hiddenCalls).toBe(0);
		expect(visibleCalls).toBe(1);
	});

	it('handles hidden then visible sequence', () => {
		let visCallback: ((visible: boolean) => void) | null = null;
		let hiddenCalls = 0;
		let visibleCalls = 0;

		new VisibilityHandler({
			onVisibilityChange: (cb) => {
				visCallback = cb;
				return () => {
					visCallback = null;
				};
			},
			onHidden: () => hiddenCalls++,
			onVisible: () => visibleCalls++,
		});

		visCallback?.(false);
		visCallback?.(true);
		expect(hiddenCalls).toBe(1);
		expect(visibleCalls).toBe(1);
	});

	it('destroy unsubscribes from visibility changes', () => {
		let visCallback: ((visible: boolean) => void) | null = null;
		let hiddenCalls = 0;

		const handler = new VisibilityHandler({
			onVisibilityChange: (cb) => {
				visCallback = cb;
				return () => {
					visCallback = null;
				};
			},
			onHidden: () => hiddenCalls++,
			onVisible: () => {},
		});

		handler.destroy();
		expect(visCallback).toBeNull();
	});
});
