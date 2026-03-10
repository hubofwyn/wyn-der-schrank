/**
 * Simple debounce utility — pure TS, zero DOM.
 *
 * Returns a debounced version of the given function that delays invocation
 * until `delayMs` milliseconds have elapsed since the last call.
 * Also returns a `cancel()` function to clear any pending invocation.
 */
export interface DebouncedFn<T extends (...args: unknown[]) => void> {
	/** Call the debounced function. Resets the delay timer. */
	(...args: Parameters<T>): void;
	/** Cancel any pending invocation. */
	cancel(): void;
}

export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	delayMs: number,
	timer: { set: (cb: () => void, ms: number) => number; clear: (id: number) => void } = {
		set: (cb, ms) => setTimeout(cb, ms) as unknown as number,
		clear: (id) => clearTimeout(id),
	},
): DebouncedFn<T> {
	let timerId: number | null = null;

	const debounced = ((...args: Parameters<T>) => {
		if (timerId !== null) {
			timer.clear(timerId);
		}
		timerId = timer.set(() => {
			timerId = null;
			fn(...args);
		}, delayMs);
	}) as DebouncedFn<T>;

	debounced.cancel = () => {
		if (timerId !== null) {
			timer.clear(timerId);
			timerId = null;
		}
	};

	return debounced;
}
