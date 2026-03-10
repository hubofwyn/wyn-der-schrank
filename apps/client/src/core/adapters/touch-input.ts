import type { Settings } from '@hub-of-wyn/shared';
import type { ActionKey, IInputProvider } from '../ports/input.js';

/**
 * Button definitions for the touch overlay.
 * Each maps a visual button to one or more ActionKeys.
 */
interface TouchButtonDef {
	readonly id: string;
	readonly action: ActionKey;
	readonly label: string;
	readonly side: 'left' | 'right' | 'top';
}

const GAMEPLAY_BUTTONS: readonly TouchButtonDef[] = [
	{ id: 'touch-left', action: 'left', label: '\u25C0', side: 'left' },
	{ id: 'touch-right', action: 'right', label: '\u25B6', side: 'left' },
	{ id: 'touch-down', action: 'down', label: '\u25BC', side: 'left' },
	{ id: 'touch-jump', action: 'jump', label: 'A', side: 'right' },
	{ id: 'touch-attack', action: 'attack', label: 'B', side: 'right' },
	{ id: 'touch-pause', action: 'pause', label: '\u2759\u2759', side: 'top' },
] as const;

/**
 * Button size presets in CSS pixels.
 */
const BUTTON_SIZES: Record<string, number> = {
	small: 48,
	medium: 60,
	large: 72,
};

/**
 * Touch input adapter — virtual buttons rendered as a DOM overlay.
 *
 * Creates transparent button elements positioned over the game canvas.
 * Uses DOM PointerEvent (not Phaser input) for reliable multi-touch
 * tracking with proper pointercancel handling.
 *
 * Implements IInputProvider with the same frame-edge semantics as
 * PhaserInput: update() must be called once per frame before game logic.
 *
 * Lifecycle:
 * - Created in scene.create() (scene-scoped)
 * - update() called in scene.update()
 * - destroy() called on scene shutdown
 */
export class TouchInput implements IInputProvider {
	private readonly container: HTMLElement;
	private readonly buttons: Map<string, HTMLButtonElement> = new Map();
	private readonly actionToButtons: Map<ActionKey, string[]> = new Map();

	// Raw pointer state: which actions are currently held via touch
	private readonly pointersDown: Map<number, ActionKey> = new Map();
	private readonly currentlyDown: Set<ActionKey> = new Set();

	// Frame-edge state computed in update()
	private readonly prevDown: Set<ActionKey> = new Set();
	private readonly frameJustPressed: Set<ActionKey> = new Set();
	private readonly frameJustReleased: Set<ActionKey> = new Set();

	private _isTouchActive = false;
	private _visible = true;

	readonly isGamepadConnected = false;

	constructor(parentElement: HTMLElement, settings: Settings) {
		this.container = this.createContainer();
		parentElement.appendChild(this.container);

		const size = BUTTON_SIZES[settings.display.touchButtonSize] ?? BUTTON_SIZES.medium!;
		const opacity = settings.display.touchButtonOpacity;

		for (const def of GAMEPLAY_BUTTONS) {
			const btn = this.createButton(def, size, opacity);
			this.container.appendChild(btn);
			this.buttons.set(def.id, btn);

			if (!this.actionToButtons.has(def.action)) {
				this.actionToButtons.set(def.action, []);
			}
			this.actionToButtons.get(def.action)!.push(def.id);
		}

		this.layoutButtons(size);
	}

	get isTouchActive(): boolean {
		return this._isTouchActive;
	}

	/**
	 * Called once per frame BEFORE game logic.
	 * Snapshots the current pointer state and computes edge transitions.
	 */
	update(): void {
		this.frameJustPressed.clear();
		this.frameJustReleased.clear();

		// Compute edges
		for (const action of this.currentlyDown) {
			if (!this.prevDown.has(action)) {
				this.frameJustPressed.add(action);
			}
		}
		for (const action of this.prevDown) {
			if (!this.currentlyDown.has(action)) {
				this.frameJustReleased.add(action);
			}
		}

		// Copy current → previous for next frame
		this.prevDown.clear();
		for (const action of this.currentlyDown) {
			this.prevDown.add(action);
		}

		this._isTouchActive = this.currentlyDown.size > 0;
	}

	isDown(action: ActionKey): boolean {
		return this.currentlyDown.has(action);
	}

	justPressed(action: ActionKey): boolean {
		return this.frameJustPressed.has(action);
	}

	justReleased(action: ActionKey): boolean {
		return this.frameJustReleased.has(action);
	}

	getAxis(axis: 'horizontal' | 'vertical'): number {
		if (axis === 'horizontal') {
			const l = this.currentlyDown.has('left') ? -1 : 0;
			const r = this.currentlyDown.has('right') ? 1 : 0;
			return l + r;
		}
		const u = this.currentlyDown.has('jump') ? -1 : 0;
		const d = this.currentlyDown.has('down') ? 1 : 0;
		return u + d;
	}

	getBinding(action: ActionKey): string {
		const ids = this.actionToButtons.get(action);
		return ids?.[0] ?? '';
	}

	setBinding(_action: ActionKey, _code: string): void {
		// Touch buttons don't support rebinding
	}

	resetBindings(): void {
		// Touch buttons don't support rebinding
	}

	/**
	 * Show or hide the touch overlay.
	 * Used by scenes to hide buttons during pause/menu overlays.
	 */
	setVisible(visible: boolean): void {
		this._visible = visible;
		this.container.style.display = visible ? '' : 'none';

		// If hiding, release all held buttons to avoid stuck state
		if (!visible) {
			this.releaseAll();
		}
	}

	get visible(): boolean {
		return this._visible;
	}

	/**
	 * Clean up all DOM elements and event listeners.
	 */
	destroy(): void {
		this.releaseAll();
		this.container.remove();
		this.buttons.clear();
		this.actionToButtons.clear();
	}

	// ── DOM Construction ──

	private createContainer(): HTMLElement {
		const el = document.createElement('div');
		el.id = 'touch-controls';
		el.style.cssText = [
			'position: fixed',
			'inset: 0',
			'pointer-events: none',
			'z-index: 10',
			'display: flex',
		].join(';');
		return el;
	}

	private createButton(def: TouchButtonDef, size: number, opacity: number): HTMLButtonElement {
		const btn = document.createElement('button');
		btn.id = def.id;
		btn.textContent = def.label;
		btn.setAttribute('data-action', def.action);
		btn.setAttribute('aria-label', def.action);

		btn.style.cssText = [
			'position: absolute',
			`width: ${size}px`,
			`height: ${size}px`,
			'border: none',
			'border-radius: 50%',
			`background: rgba(255, 255, 255, ${opacity * 0.3})`,
			`border: 2px solid rgba(255, 255, 255, ${opacity * 0.5})`,
			'color: rgba(255, 255, 255, 0.8)',
			`font-size: ${Math.round(size * 0.4)}px`,
			'font-family: monospace',
			'font-weight: bold',
			'pointer-events: auto',
			'touch-action: none',
			'user-select: none',
			'-webkit-user-select: none',
			'-webkit-tap-highlight-color: transparent',
			'outline: none',
			'cursor: pointer',
			'display: flex',
			'align-items: center',
			'justify-content: center',
			'transition: background 0.08s ease',
		].join(';');

		// Event handlers with pointer capture for reliable tracking
		const action = def.action;

		btn.addEventListener('pointerdown', (e: PointerEvent) => {
			e.preventDefault();
			btn.setPointerCapture(e.pointerId);
			this.pointersDown.set(e.pointerId, action);
			this.currentlyDown.add(action);
			btn.style.background = `rgba(255, 255, 255, ${opacity * 0.6})`;
		});

		btn.addEventListener('pointerup', (e: PointerEvent) => {
			e.preventDefault();
			this.handlePointerRelease(e.pointerId, action);
			btn.style.background = `rgba(255, 255, 255, ${opacity * 0.3})`;
		});

		btn.addEventListener('pointercancel', (e: PointerEvent) => {
			this.handlePointerRelease(e.pointerId, action);
			btn.style.background = `rgba(255, 255, 255, ${opacity * 0.3})`;
		});

		// Prevent context menu on long press
		btn.addEventListener('contextmenu', (e: Event) => {
			e.preventDefault();
		});

		return btn;
	}

	/**
	 * Layout buttons in their fixed positions.
	 *
	 * Left side (d-pad):
	 *   [Left] [Right]     ← bottom row
	 *      [Down]          ← above, centered
	 *
	 * Right side (actions):
	 *   [Jump/A]           ← bottom, larger
	 *      [Attack/B]      ← above and left
	 *
	 * Top right: [Pause]
	 */
	private layoutButtons(size: number): void {
		const gap = 8;
		const safeBottom = 'max(16px, env(safe-area-inset-bottom, 0px))';
		const safeLeft = 'max(16px, env(safe-area-inset-left, 0px))';
		const safeRight = 'max(16px, env(safe-area-inset-right, 0px))';
		const safeTop = 'max(12px, env(safe-area-inset-top, 0px))';
		const pauseSize = Math.round(size * 0.65);

		for (const [id, btn] of this.buttons) {
			switch (id) {
				case 'touch-left':
					btn.style.left = `calc(${safeLeft})`;
					btn.style.bottom = `calc(${safeBottom} + ${gap}px)`;
					break;
				case 'touch-right':
					btn.style.left = `calc(${safeLeft} + ${size + gap}px)`;
					btn.style.bottom = `calc(${safeBottom} + ${gap}px)`;
					break;
				case 'touch-down':
					btn.style.left = `calc(${safeLeft} + ${(size + gap) / 2}px)`;
					btn.style.bottom = `calc(${safeBottom} + ${size + gap * 2}px)`;
					break;
				case 'touch-jump':
					btn.style.right = `calc(${safeRight})`;
					btn.style.bottom = `calc(${safeBottom} + ${gap}px)`;
					break;
				case 'touch-attack':
					btn.style.right = `calc(${safeRight} + ${size + gap}px)`;
					btn.style.bottom = `calc(${safeBottom} + ${gap}px)`;
					break;
				case 'touch-pause':
					btn.style.right = `calc(${safeRight})`;
					btn.style.top = `calc(${safeTop})`;
					btn.style.width = `${pauseSize}px`;
					btn.style.height = `${pauseSize}px`;
					btn.style.fontSize = `${Math.round(pauseSize * 0.4)}px`;
					btn.style.borderRadius = '8px';
					break;
			}
		}
	}

	// ── Internal ──

	private handlePointerRelease(pointerId: number, action: ActionKey): void {
		this.pointersDown.delete(pointerId);

		// Only release the action if no other pointer is holding the same button
		let stillHeld = false;
		for (const heldAction of this.pointersDown.values()) {
			if (heldAction === action) {
				stillHeld = true;
				break;
			}
		}
		if (!stillHeld) {
			this.currentlyDown.delete(action);
		}
	}

	private releaseAll(): void {
		this.pointersDown.clear();
		this.currentlyDown.clear();
	}
}
