export type ActionKey =
	| 'jump'
	| 'left'
	| 'right'
	| 'down'
	| 'attack'
	| 'interact'
	| 'pause'
	| 'ability'
	| 'menu-up'
	| 'menu-down'
	| 'menu-left'
	| 'menu-right'
	| 'menu-confirm'
	| 'menu-back';

export interface IInputProvider {
	/**
	 * Called once per frame BEFORE game logic runs.
	 * Captures edge transitions so that justPressed/justReleased
	 * are accurate for exactly one frame.
	 */
	update(): void;

	/** True while the action's key is held down. */
	isDown(action: ActionKey): boolean;

	/** True only on the frame the key transitioned from up to down. */
	justPressed(action: ActionKey): boolean;

	/** True only on the frame the key transitioned from down to up. */
	justReleased(action: ActionKey): boolean;

	/** Returns -1, 0, or +1 for keyboard; continuous for gamepad. */
	getAxis(axis: 'horizontal' | 'vertical'): number;

	readonly isTouchActive: boolean;
	readonly isGamepadConnected: boolean;

	getBinding(action: ActionKey): string;
	setBinding(action: ActionKey, code: string): void;
	resetBindings(): void;
}
