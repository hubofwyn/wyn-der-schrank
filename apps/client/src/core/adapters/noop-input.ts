import type { ActionKey, IInputProvider } from '../ports/input.js';

/**
 * No-op input adapter for the root container.
 * Satisfies the IInputProvider port with inert methods.
 * PlatformerScene creates a real PhaserInput in create()
 * because input requires a live scene's keyboard manager.
 */
export class NoopInput implements IInputProvider {
	readonly isTouchActive: boolean = false;
	readonly isGamepadConnected: boolean = false;

	update(): void {}
	isDown(_action: ActionKey): boolean {
		return false;
	}
	justPressed(_action: ActionKey): boolean {
		return false;
	}
	justReleased(_action: ActionKey): boolean {
		return false;
	}
	getAxis(_axis: 'horizontal' | 'vertical'): number {
		return 0;
	}
	getBinding(_action: ActionKey): string {
		return '';
	}
	setBinding(_action: ActionKey, _code: string): void {}
	resetBindings(): void {}
}
