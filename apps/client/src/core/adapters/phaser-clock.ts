import type { IGameClock } from '../ports/engine.js';

/**
 * Wraps Phaser 4's scene time values into the IGameClock port.
 *
 * Created once per scene. The scene passes its `time` and `delta` from
 * the update() callback into refresh() each frame.
 */
export class PhaserClock implements IGameClock {
	private _now = 0;
	private _delta = 0;
	private _frame = 0;
	private _elapsed = 0;

	get now(): number {
		return this._now;
	}

	get delta(): number {
		return this._delta;
	}

	get frame(): number {
		return this._frame;
	}

	get elapsed(): number {
		return this._elapsed;
	}

	/**
	 * Called by the scene at the top of update(time, delta).
	 * Captures Phaser's timestep values into the port interface.
	 */
	refresh(time: number, delta: number): void {
		this._now = time;
		this._delta = delta;
		this._frame++;
		this._elapsed += delta;
	}
}
