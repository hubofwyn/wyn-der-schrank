import type { Settings } from '@hub-of-wyn/shared';
import type { ActionKey, IInputProvider } from '../ports/input.js';

/**
 * Maps action names to Phaser KeyCode strings (e.g. 'Space', 'KeyA').
 * Initialized from the Settings schema controls block.
 */
type KeyBindings = Record<ActionKey, string>;

/**
 * Per-action state tracked across frames for edge detection.
 */
interface KeyState {
	down: boolean;
	justPressed: boolean;
	justReleased: boolean;
}

/**
 * Phaser 4 input adapter.
 *
 * Wraps Phaser.Input.Keyboard into the IInputProvider port.
 * Tracks frame-edge transitions so justPressed/justReleased are
 * accurate for exactly one frame.
 *
 * The scene must call update() once per frame BEFORE any game logic.
 */
export class PhaserInput implements IInputProvider {
	private keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
	private bindings: KeyBindings;
	private keys: Map<ActionKey, Phaser.Input.Keyboard.Key> = new Map();
	private state: Map<ActionKey, KeyState> = new Map();

	readonly isTouchActive = false;
	readonly isGamepadConnected = false;

	constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, settings: Settings) {
		this.keyboard = keyboard;
		this.bindings = this.buildBindings(settings);
		this.createKeys();
	}

	private buildBindings(settings: Settings): KeyBindings {
		const c = settings.controls;
		return {
			jump: c.jump,
			left: c.left,
			right: c.right,
			down: c.down,
			attack: c.attack,
			interact: c.interact,
			pause: c.pause,
			ability: c.ability,
			'menu-up': 'ArrowUp',
			'menu-down': 'ArrowDown',
			'menu-left': 'ArrowLeft',
			'menu-right': 'ArrowRight',
			'menu-confirm': 'Enter',
			'menu-back': 'Escape',
		};
	}

	private createKeys(): void {
		for (const [action, code] of Object.entries(this.bindings)) {
			const keyCode = this.resolveKeyCode(code);
			if (keyCode !== undefined) {
				const key = this.keyboard.addKey(keyCode, true, false);
				this.keys.set(action as ActionKey, key);
			}
			this.state.set(action as ActionKey, {
				down: false,
				justPressed: false,
				justReleased: false,
			});
		}
	}

	private resolveKeyCode(code: string): number | undefined {
		const codes = Phaser.Input.Keyboard.KeyCodes as Record<string, number | undefined>;

		// Try direct match (e.g. 'SPACE', 'ESC')
		const upper = code.toUpperCase();
		if (codes[upper] !== undefined) return codes[upper];

		// Try stripping 'Key' prefix (e.g. 'KeyA' -> 'A')
		if (code.startsWith('Key')) {
			const letter = code.slice(3).toUpperCase();
			if (codes[letter] !== undefined) return codes[letter];
		}

		// Try 'Arrow' prefix (e.g. 'ArrowUp' -> 'UP')
		if (code.startsWith('Arrow')) {
			const dir = code.slice(5).toUpperCase();
			if (codes[dir] !== undefined) return codes[dir];
		}

		// Try as-is
		if (codes[code] !== undefined) return codes[code];

		return undefined;
	}

	/**
	 * Called once per frame BEFORE game logic.
	 * Compares current key state to previous frame and sets edge flags.
	 */
	update(): void {
		for (const [action, key] of this.keys) {
			const prev = this.state.get(action);
			if (!prev) continue;

			const wasDown = prev.down;
			const isDown = key.isDown;

			this.state.set(action, {
				down: isDown,
				justPressed: isDown && !wasDown,
				justReleased: !isDown && wasDown,
			});
		}
	}

	isDown(action: ActionKey): boolean {
		return this.state.get(action)?.down ?? false;
	}

	justPressed(action: ActionKey): boolean {
		return this.state.get(action)?.justPressed ?? false;
	}

	justReleased(action: ActionKey): boolean {
		return this.state.get(action)?.justReleased ?? false;
	}

	getAxis(axis: 'horizontal' | 'vertical'): number {
		if (axis === 'horizontal') {
			const l = this.isDown('left') ? -1 : 0;
			const r = this.isDown('right') ? 1 : 0;
			return l + r;
		}
		const u = this.isDown('jump') ? -1 : 0;
		const d = this.isDown('down') ? 1 : 0;
		return u + d;
	}

	getBinding(action: ActionKey): string {
		return this.bindings[action];
	}

	setBinding(action: ActionKey, code: string): void {
		// Remove old key
		const oldKey = this.keys.get(action);
		if (oldKey) {
			this.keyboard.removeKey(oldKey, true);
		}

		// Create new key
		this.bindings[action] = code;
		const keyCode = this.resolveKeyCode(code);
		if (keyCode !== undefined) {
			const key = this.keyboard.addKey(keyCode, true, false);
			this.keys.set(action, key);
		}
	}

	resetBindings(): void {
		// Remove all current keys
		for (const key of this.keys.values()) {
			this.keyboard.removeKey(key, true);
		}
		this.keys.clear();
		this.state.clear();

		// Rebuild from defaults
		this.bindings = this.buildBindings({
			audio: { masterVolume: 0.8, musicVolume: 0.7, sfxVolume: 1.0, muted: false },
			display: {
				showFps: false,
				showMinimap: true,
				screenShake: true,
				particleQuality: 'medium',
			},
			controls: {
				jump: 'Space',
				left: 'KeyA',
				right: 'KeyD',
				down: 'KeyS',
				attack: 'KeyJ',
				interact: 'KeyE',
				pause: 'Escape',
				ability: 'KeyK',
			},
			accessibility: { highContrast: false, largeText: false },
			diagnostics: { enabled: false, channels: {}, ringBufferSize: 500 },
		});
		this.createKeys();
	}
}
