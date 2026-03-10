import { describe, expect, it } from 'vitest';
import { debounce } from '../debounce.js';

/** Fake timer that gives manual control over setTimeout/clearTimeout. */
function createFakeTimer() {
	const pending = new Map<number, { cb: () => void; ms: number }>();
	let nextId = 1;
	return {
		timer: {
			set(cb: () => void, ms: number): number {
				const id = nextId++;
				pending.set(id, { cb, ms });
				return id;
			},
			clear(id: number): void {
				pending.delete(id);
			},
		},
		/** Fire all pending timers (simulates time passage). */
		flush(): void {
			const entries = [...pending.values()];
			pending.clear();
			for (const entry of entries) {
				entry.cb();
			}
		},
		/** Number of pending timers. */
		get pendingCount(): number {
			return pending.size;
		},
	};
}

describe('debounce', () => {
	it('does not call fn immediately', () => {
		const { timer } = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, timer);

		debounced();
		expect(calls).toBe(0);
	});

	it('calls fn after delay', () => {
		const { timer, flush } = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, timer);

		debounced();
		flush();
		expect(calls).toBe(1);
	});

	it('resets timer on repeated calls — only fires once', () => {
		const fake = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, fake.timer);

		debounced();
		debounced();
		debounced();
		expect(fake.pendingCount).toBe(1);

		fake.flush();
		expect(calls).toBe(1);
	});

	it('passes arguments to the original function', () => {
		const { timer, flush } = createFakeTimer();
		const received: unknown[][] = [];
		const debounced = debounce((...args: unknown[]) => received.push(args), 100, timer);

		debounced(1, 'a');
		debounced(2, 'b');
		flush();

		expect(received).toEqual([[2, 'b']]);
	});

	it('cancel() prevents pending invocation', () => {
		const { timer, flush } = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, timer);

		debounced();
		debounced.cancel();
		flush();
		expect(calls).toBe(0);
	});

	it('cancel() is safe to call when nothing is pending', () => {
		const { timer } = createFakeTimer();
		const debounced = debounce(() => {}, 100, timer);
		expect(() => debounced.cancel()).not.toThrow();
	});

	it('can be called again after cancel', () => {
		const { timer, flush } = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, timer);

		debounced();
		debounced.cancel();
		debounced();
		flush();
		expect(calls).toBe(1);
	});

	it('allows multiple independent invocations after each flush', () => {
		const { timer, flush } = createFakeTimer();
		let calls = 0;
		const debounced = debounce(() => calls++, 100, timer);

		debounced();
		flush();
		expect(calls).toBe(1);

		debounced();
		flush();
		expect(calls).toBe(2);
	});

	it('uses provided delay value for timer', () => {
		const delays: number[] = [];
		const timer = {
			set(cb: () => void, ms: number): number {
				delays.push(ms);
				return 1;
			},
			clear(): void {},
		};
		const debounced = debounce(() => {}, 250, timer);
		debounced();
		expect(delays).toEqual([250]);
	});
});
