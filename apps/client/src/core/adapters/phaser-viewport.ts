import {
	computeWorldSize,
	createSafeZone,
	type SafeAreaInsets,
	type SafeZone,
	scaleFontSize,
	scaleFontSizeStr,
	type WorldSize,
} from '../../modules/viewport/viewport-math.js';
import type { IViewportProvider } from '../ports/viewport.js';

/**
 * Adapter that bridges device/browser viewport state into IViewportProvider.
 *
 * Probes DOM for safe area insets (env() CSS values) and listens
 * for window resize events to recompute world size and safe zone.
 *
 * Created once in main.ts. Scenes read worldSize/safeZone each frame.
 */
export class PhaserViewport implements IViewportProvider {
	private _worldSize: WorldSize;
	private _safeZone: SafeZone;
	private _safeAreaInsets: SafeAreaInsets;
	private _isTouchDevice: boolean;
	private readonly _listeners = new Set<(worldSize: WorldSize, safeZone: SafeZone) => void>();
	private readonly _resizeHandler: () => void;

	constructor(screenWidth: number, screenHeight: number) {
		this._worldSize = computeWorldSize(screenWidth, screenHeight);
		this._safeZone = createSafeZone(this._worldSize.width);
		this._safeAreaInsets = PhaserViewport.probeSafeAreaInsets();
		this._isTouchDevice = PhaserViewport.detectTouch();

		this._resizeHandler = () => this.handleResize();
		window.addEventListener('resize', this._resizeHandler);
	}

	get worldSize(): WorldSize {
		return this._worldSize;
	}

	get safeZone(): SafeZone {
		return this._safeZone;
	}

	get safeAreaInsets(): SafeAreaInsets {
		return this._safeAreaInsets;
	}

	get isTouchDevice(): boolean {
		return this._isTouchDevice;
	}

	scaleFontSize(baseSizePx: number): number {
		return scaleFontSize(baseSizePx, this._worldSize.width);
	}

	scaleFontSizeStr(baseSizePx: number): string {
		return scaleFontSizeStr(baseSizePx, this._worldSize.width);
	}

	onResize(callback: (worldSize: WorldSize, safeZone: SafeZone) => void): () => void {
		this._listeners.add(callback);
		return () => {
			this._listeners.delete(callback);
		};
	}

	destroy(): void {
		window.removeEventListener('resize', this._resizeHandler);
		this._listeners.clear();
	}

	private handleResize(): void {
		const prevWidth = this._worldSize.width;
		this._worldSize = computeWorldSize(window.innerWidth, window.innerHeight);
		this._safeZone = createSafeZone(this._worldSize.width);
		this._safeAreaInsets = PhaserViewport.probeSafeAreaInsets();

		// Only notify if world size actually changed
		if (this._worldSize.width !== prevWidth) {
			for (const listener of this._listeners) {
				listener(this._worldSize, this._safeZone);
			}
		}
	}

	/**
	 * Probe CSS env() safe-area-inset values via a temporary DOM element.
	 * Returns zeros if the browser doesn't support safe area insets.
	 */
	private static probeSafeAreaInsets(): SafeAreaInsets {
		try {
			const el = document.createElement('div');
			el.style.position = 'fixed';
			el.style.visibility = 'hidden';
			el.style.pointerEvents = 'none';
			el.style.top = 'env(safe-area-inset-top, 0px)';
			el.style.right = 'env(safe-area-inset-right, 0px)';
			el.style.bottom = 'env(safe-area-inset-bottom, 0px)';
			el.style.left = 'env(safe-area-inset-left, 0px)';
			document.body.appendChild(el);

			const style = getComputedStyle(el);
			const insets: SafeAreaInsets = {
				top: Number.parseFloat(style.top) || 0,
				right: Number.parseFloat(style.right) || 0,
				bottom: Number.parseFloat(style.bottom) || 0,
				left: Number.parseFloat(style.left) || 0,
			};

			document.body.removeChild(el);
			return insets;
		} catch {
			return { top: 0, right: 0, bottom: 0, left: 0 };
		}
	}

	/**
	 * Detect touch capability without triggering false positives
	 * on desktop browsers that support touch events.
	 */
	private static detectTouch(): boolean {
		return (
			'ontouchstart' in window ||
			navigator.maxTouchPoints > 0 ||
			// @ts-expect-error -- Legacy IE/Edge property, harmless check
			navigator.msMaxTouchPoints > 0
		);
	}
}
