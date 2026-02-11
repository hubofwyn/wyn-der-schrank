/**
 * Pure domain camera controller.
 *
 * Computes camera position with lerp smoothing and bounds clamping.
 * The scene reads getState() each frame and applies it to the Phaser camera.
 * No Phaser imports — this is in the modules/ zone.
 */

export interface CameraState {
	readonly x: number;
	readonly y: number;
	readonly zoom: number;
}

export interface CameraConfig {
	/** Horizontal smoothing factor (0 = no movement, 1 = instant snap). */
	readonly lerpX: number;
	/** Vertical smoothing factor (0 = no movement, 1 = instant snap). */
	readonly lerpY: number;
	/** World bounds — camera won't scroll past these. */
	readonly boundsMinX: number;
	readonly boundsMinY: number;
	readonly boundsMaxX: number;
	readonly boundsMaxY: number;
	/** Viewport dimensions (needed for bounds clamping). */
	readonly viewportWidth: number;
	readonly viewportHeight: number;
	/** Pixels ahead of target in its facing direction. */
	readonly lookaheadX: number;
}

export class CameraController {
	private x: number;
	private y: number;
	private zoom = 1;
	private targetX = 0;
	private targetY = 0;
	private facingDirection = 0;

	constructor(private config: CameraConfig) {
		this.x = config.boundsMinX;
		this.y = config.boundsMinY;
		this.clampToBounds();
	}

	/** Set the target position the camera should follow. */
	setTarget(x: number, y: number): void {
		this.targetX = x;
		this.targetY = y;
	}

	/** Set the facing direction for lookahead (-1 = left, 0 = none, 1 = right). */
	setFacingDirection(direction: number): void {
		this.facingDirection = direction;
	}

	/** Update camera position with lerp smoothing toward target. */
	update(delta: number): void {
		const { lerpX, lerpY, lookaheadX } = this.config;

		// Target with lookahead offset
		const goalX = this.targetX + this.facingDirection * lookaheadX;
		const goalY = this.targetY;

		// Frame-rate independent lerp: factor = 1 - (1 - lerp)^(delta/16.67)
		// At 60fps (delta=16.67), factor equals the configured lerp value.
		const frames = delta / 16.667;
		const factorX = 1 - (1 - lerpX) ** frames;
		const factorY = 1 - (1 - lerpY) ** frames;

		this.x += (goalX - this.x) * factorX;
		this.y += (goalY - this.y) * factorY;

		this.clampToBounds();
	}

	/** Get current camera state for the scene to apply. */
	getState(): CameraState {
		return { x: this.x, y: this.y, zoom: this.zoom };
	}

	/** Update world bounds (e.g., on level change). */
	setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
		this.config = {
			...this.config,
			boundsMinX: minX,
			boundsMinY: minY,
			boundsMaxX: maxX,
			boundsMaxY: maxY,
		};
		this.clampToBounds();
	}

	/** Set zoom level. */
	setZoom(zoom: number): void {
		this.zoom = zoom;
	}

	/** Snap camera to target immediately (no lerp). */
	snap(): void {
		const { lookaheadX } = this.config;
		this.x = this.targetX + this.facingDirection * lookaheadX;
		this.y = this.targetY;
		this.clampToBounds();
	}

	private clampToBounds(): void {
		const { boundsMinX, boundsMinY, boundsMaxX, boundsMaxY, viewportWidth, viewportHeight } =
			this.config;

		// Camera position represents the center of the viewport.
		// Clamp so the viewport edges don't exceed world bounds.
		const halfW = viewportWidth / 2;
		const halfH = viewportHeight / 2;

		const minX = boundsMinX + halfW;
		const maxX = boundsMaxX - halfW;
		const minY = boundsMinY + halfH;
		const maxY = boundsMaxY - halfH;

		// If the world is smaller than the viewport, center it.
		if (minX >= maxX) {
			this.x = (boundsMinX + boundsMaxX) / 2;
		} else {
			this.x = Math.max(minX, Math.min(maxX, this.x));
		}

		if (minY >= maxY) {
			this.y = (boundsMinY + boundsMaxY) / 2;
		} else {
			this.y = Math.max(minY, Math.min(maxY, this.y));
		}
	}
}
