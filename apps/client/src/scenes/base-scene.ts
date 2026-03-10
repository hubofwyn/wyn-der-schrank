import type { Container } from '../core/container.js';
import { pickSfxVariant } from '../modules/assets/audio-keys.js';
import type { SceneKey } from '../modules/navigation/scene-keys.js';
import { hitArea } from '../modules/ui/scene-layout.js';

/**
 * Abstract base for all game scenes.
 *
 * Provides typed access to the DI container (stored in the Phaser game
 * registry by main.ts) and navigation helpers that wrap the ScenePlugin.
 *
 * Resize lifecycle: subclasses that display UI call `this.subscribeResize()`
 * in `create()`. The default handler restarts the scene so `create()` can
 * re-lay out from the updated safe zone. Scenes that need custom behavior
 * can override `onViewportResize()`. The subscription is automatically
 * cleaned up on scene shutdown.
 */
export abstract class BaseScene extends Phaser.Scene {
	private _resizeUnsub: (() => void) | null = null;

	/** Typed accessor for the DI container stored in the game registry. */
	protected get container(): Container {
		return this.registry.get('container') as Container;
	}

	/** Transition to another scene (stops this one). */
	protected navigateTo(key: SceneKey): void {
		this.scene.start(key);
	}

	/** Launch a scene in parallel (e.g., HUD overlay). */
	protected launchParallel(key: SceneKey): void {
		this.scene.launch(key);
	}

	/** Stop a parallel scene. */
	protected stopParallel(key: SceneKey): void {
		this.scene.stop(key);
	}

	/** Pause a scene. No argument pauses this scene. */
	protected pauseScene(key?: SceneKey): void {
		if (key) {
			this.scene.pause(key);
		} else {
			this.scene.pause();
		}
	}

	/** Resume a paused scene. */
	protected resumeScene(key: SceneKey): void {
		this.scene.resume(key);
	}

	/**
	 * Subscribe to viewport resize events. Call in `create()`.
	 * Automatically unsubscribes on scene shutdown.
	 */
	protected subscribeResize(): void {
		this._resizeUnsub = this.container.viewport.onResize(() => {
			this.onViewportResize();
		});
		this.events.once('shutdown', () => {
			this._resizeUnsub?.();
			this._resizeUnsub = null;
		});
	}

	/**
	 * Called when the viewport resizes. Default: restart the scene
	 * so `create()` re-lays out from the updated safe zone.
	 * Override for custom behavior (e.g. gameplay scenes that should not restart).
	 */
	protected onViewportResize(): void {
		this.scene.restart();
	}

	/** Play the standard menu-select SFX (random variant). */
	protected playButtonSfx(): void {
		const sfx = pickSfxVariant('menu-select');
		if (sfx) this.container.audio.playSfx(sfx);
	}

	/**
	 * Make a text object interactive with expanded hit area (44px minimum).
	 *
	 * Measures the text's rendered bounds, expands to at least MIN_TOUCH_TARGET_PX,
	 * and sets interactive with the expanded rectangle as the hit area.
	 */
	protected makeButton(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
		const size = hitArea(text.width, text.height);
		const offsetX = (size.width - text.width) / 2;
		const offsetY = (size.height - text.height) / 2;
		const rect = new Phaser.Geom.Rectangle(-offsetX, -offsetY, size.width, size.height);
		text.setInteractive({
			hitArea: rect,
			hitAreaCallback: Phaser.Geom.Rectangle.Contains,
			useHandCursor: true,
		});
		return text;
	}
}
