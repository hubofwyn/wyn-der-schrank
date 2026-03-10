import type { SafeAreaInsets, SafeZone, WorldSize } from '../../modules/viewport/viewport-math.js';

/**
 * Port for viewport state and resize events.
 *
 * Implemented by PhaserViewport adapter in core/adapters/.
 * Consumed by scenes for safe zone anchoring and font scaling.
 */
export interface IViewportProvider {
	/** Current computed world size. */
	readonly worldSize: WorldSize;

	/** Current safe zone rectangle, centered in the world. */
	readonly safeZone: SafeZone;

	/** Device safe area insets (notch, home indicator, etc.). */
	readonly safeAreaInsets: SafeAreaInsets;

	/** Whether the current device supports touch input. */
	readonly isTouchDevice: boolean;

	/**
	 * Scale a base font size for the current world width.
	 * Convenience method wrapping scaleFontSize().
	 */
	scaleFontSize(baseSizePx: number): number;

	/**
	 * Scale a base font size and return as CSS pixel string.
	 * Convenience method wrapping scaleFontSizeStr().
	 */
	scaleFontSizeStr(baseSizePx: number): string;

	/**
	 * Register a callback for viewport resize events.
	 * Returns an unsubscribe function.
	 */
	onResize(callback: (worldSize: WorldSize, safeZone: SafeZone) => void): () => void;

	/** Clean up event listeners. Called on game shutdown. */
	destroy(): void;
}
