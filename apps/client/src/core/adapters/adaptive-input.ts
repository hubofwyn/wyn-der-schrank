import type { ActionKey, IInputProvider } from '../ports/input.js';

/**
 * Composite input adapter that merges keyboard and touch input.
 *
 * Returns the logical OR of both providers: if either reports a key
 * as down/justPressed/justReleased, the composite does too. This lets
 * desktop users with touchscreens use either input method seamlessly,
 * and mobile users can still pair a Bluetooth keyboard.
 *
 * The scene must call update() once per frame BEFORE game logic.
 * Both child providers' update() methods are called in sequence.
 */
export class AdaptiveInput implements IInputProvider {
	readonly isGamepadConnected = false;

	constructor(
		private readonly keyboard: IInputProvider,
		private readonly touch: IInputProvider,
	) {}

	get isTouchActive(): boolean {
		return this.touch.isTouchActive;
	}

	update(): void {
		this.keyboard.update();
		this.touch.update();
	}

	isDown(action: ActionKey): boolean {
		return this.keyboard.isDown(action) || this.touch.isDown(action);
	}

	justPressed(action: ActionKey): boolean {
		return this.keyboard.justPressed(action) || this.touch.justPressed(action);
	}

	justReleased(action: ActionKey): boolean {
		return this.keyboard.justReleased(action) || this.touch.justReleased(action);
	}

	getAxis(axis: 'horizontal' | 'vertical'): number {
		const kbAxis = this.keyboard.getAxis(axis);
		const touchAxis = this.touch.getAxis(axis);
		// Prefer touch if active, otherwise keyboard.
		// If both are nonzero, take the one with larger magnitude.
		if (touchAxis !== 0 && kbAxis !== 0) {
			return Math.abs(touchAxis) >= Math.abs(kbAxis) ? touchAxis : kbAxis;
		}
		return touchAxis !== 0 ? touchAxis : kbAxis;
	}

	getBinding(action: ActionKey): string {
		return this.keyboard.getBinding(action);
	}

	setBinding(action: ActionKey, code: string): void {
		this.keyboard.setBinding(action, code);
	}

	resetBindings(): void {
		this.keyboard.resetBindings();
	}
}
