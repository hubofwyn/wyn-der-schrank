export interface IGameClock {
	readonly now: number;
	readonly delta: number;
	readonly frame: number;
	readonly elapsed: number;

	/**
	 * Feed the current frame's time values into the clock.
	 * Called by the active scene at the top of update(time, delta).
	 */
	refresh(time: number, delta: number): void;
}

export interface IRendererStats {
	readonly type: 'WEBGL' | 'CANVAS';
	readonly fps: number;
	readonly drawCalls: number;
}
