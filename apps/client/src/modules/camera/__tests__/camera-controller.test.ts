import { beforeEach, describe, expect, it } from 'vitest';
import type { DiagnosticEvent, IDiagnostics } from '../../../core/ports/diagnostics.js';
import { type CameraConfig, CameraController } from '../camera-controller.js';

function createSpyDiagnostics(): IDiagnostics & { events: DiagnosticEvent[] } {
	const events: DiagnosticEvent[] = [];
	return {
		events,
		isEnabled: () => true,
		emit: (channel, level, label, data) => {
			events.push({ frame: 0, timestamp: 0, channel, level, label, data });
		},
		query: (filter) => {
			let result = events;
			if (filter?.channel) result = result.filter((e) => e.channel === filter.channel);
			if (filter?.level) result = result.filter((e) => e.level === filter.level);
			if (filter?.last) result = result.slice(-filter.last);
			return result;
		},
	};
}

function defaultConfig(overrides: Partial<CameraConfig> = {}): CameraConfig {
	return {
		lerpX: 0.1,
		lerpY: 0.1,
		boundsMinX: 0,
		boundsMinY: 0,
		boundsMaxX: 2000,
		boundsMaxY: 1000,
		viewportWidth: 1280,
		viewportHeight: 720,
		lookaheadX: 0,
		...overrides,
	};
}

const FRAME = 16.667; // ~60fps frame time

describe('CameraController', () => {
	let cam: CameraController;

	beforeEach(() => {
		cam = new CameraController(defaultConfig());
	});

	describe('initialization', () => {
		it('starts at boundsMin position', () => {
			const state = cam.getState();
			// Clamped to center of viewport within bounds
			expect(state.x).toBe(640); // boundsMinX + viewportWidth/2
			expect(state.y).toBe(360); // boundsMinY + viewportHeight/2
		});

		it('starts with zoom 1', () => {
			expect(cam.getState().zoom).toBe(1);
		});
	});

	describe('lerp toward target', () => {
		it('moves toward target each frame', () => {
			cam.setTarget(1000, 500);
			cam.update(FRAME);

			const state = cam.getState();
			// Should have moved toward target but not reached it
			expect(state.x).toBeGreaterThan(640);
			expect(state.x).toBeLessThan(1000);
			expect(state.y).toBeGreaterThan(360);
			expect(state.y).toBeLessThan(500);
		});

		it('converges closer over multiple frames', () => {
			cam.setTarget(1000, 500);

			cam.update(FRAME);
			const after1 = cam.getState().x;

			cam.update(FRAME);
			const after2 = cam.getState().x;

			cam.update(FRAME);
			const after3 = cam.getState().x;

			expect(after2).toBeGreaterThan(after1);
			expect(after3).toBeGreaterThan(after2);
			// Distance to target should decrease
			expect(1000 - after2).toBeLessThan(1000 - after1);
			expect(1000 - after3).toBeLessThan(1000 - after2);
		});

		it('with lerpX=1 snaps immediately', () => {
			const fastCam = new CameraController(defaultConfig({ lerpX: 1, lerpY: 1 }));
			fastCam.setTarget(1000, 500);
			fastCam.update(FRAME);

			const state = fastCam.getState();
			expect(state.x).toBe(1000);
			expect(state.y).toBe(500);
		});

		it('with lerpX=0 does not move', () => {
			const frozenCam = new CameraController(defaultConfig({ lerpX: 0, lerpY: 0 }));
			frozenCam.snap(); // Start at default position
			const before = frozenCam.getState();

			frozenCam.setTarget(1000, 500);
			frozenCam.update(FRAME);

			const after = frozenCam.getState();
			expect(after.x).toBe(before.x);
			expect(after.y).toBe(before.y);
		});
	});

	describe('bounds clamping', () => {
		it('clamps camera so viewport stays within world bounds', () => {
			cam.setTarget(0, 0);
			cam.snap();

			const state = cam.getState();
			// Camera center must be at least halfViewport from world edge
			expect(state.x).toBe(640); // viewportWidth/2
			expect(state.y).toBe(360); // viewportHeight/2
		});

		it('clamps at the far edge of world bounds', () => {
			cam.setTarget(2000, 1000);
			cam.snap();

			const state = cam.getState();
			expect(state.x).toBe(1360); // boundsMaxX - viewportWidth/2
			expect(state.y).toBe(640); // boundsMaxY - viewportHeight/2
		});

		it('centers when world is smaller than viewport', () => {
			const smallCam = new CameraController(
				defaultConfig({
					boundsMinX: 0,
					boundsMinY: 0,
					boundsMaxX: 500,
					boundsMaxY: 300,
					viewportWidth: 1280,
					viewportHeight: 720,
				}),
			);
			smallCam.setTarget(250, 150);
			smallCam.snap();

			const state = smallCam.getState();
			expect(state.x).toBe(250); // (0 + 500) / 2
			expect(state.y).toBe(150); // (0 + 300) / 2
		});
	});

	describe('lookahead', () => {
		it('offsets toward facing direction', () => {
			const lookCam = new CameraController(defaultConfig({ lookaheadX: 100, lerpX: 1, lerpY: 1 }));
			lookCam.setTarget(1000, 500);
			lookCam.setFacingDirection(1);
			lookCam.update(FRAME);

			expect(lookCam.getState().x).toBe(1100); // target + lookahead
		});

		it('offsets in negative direction when facing left', () => {
			const lookCam = new CameraController(defaultConfig({ lookaheadX: 100, lerpX: 1, lerpY: 1 }));
			lookCam.setTarget(1000, 500);
			lookCam.setFacingDirection(-1);
			lookCam.update(FRAME);

			expect(lookCam.getState().x).toBe(900); // target - lookahead
		});

		it('no offset when facing direction is 0', () => {
			const lookCam = new CameraController(defaultConfig({ lookaheadX: 100, lerpX: 1, lerpY: 1 }));
			lookCam.setTarget(1000, 500);
			lookCam.setFacingDirection(0);
			lookCam.update(FRAME);

			expect(lookCam.getState().x).toBe(1000);
		});
	});

	describe('setBounds', () => {
		it('updates bounds and reclamps position', () => {
			cam.setTarget(1500, 800);
			cam.snap();

			// Now shrink bounds — world smaller than viewport, camera centers
			cam.setBounds(0, 0, 800, 400);
			const state = cam.getState();
			expect(state.x).toBe(400); // (0 + 800) / 2
			expect(state.y).toBe(200); // (0 + 400) / 2
		});
	});

	describe('setZoom', () => {
		it('updates the zoom value in state', () => {
			cam.setZoom(2);
			expect(cam.getState().zoom).toBe(2);
		});
	});

	describe('snap', () => {
		it('jumps immediately to target without lerp', () => {
			cam.setTarget(1000, 500);
			cam.snap();

			const state = cam.getState();
			expect(state.x).toBe(1000);
			expect(state.y).toBe(500);
		});

		it('respects bounds when snapping', () => {
			cam.setTarget(0, 0);
			cam.snap();

			const state = cam.getState();
			expect(state.x).toBe(640);
			expect(state.y).toBe(360);
		});
	});

	describe('diagnostics', () => {
		it('emits bounds-clamp event when position is clamped', () => {
			const spy = createSpyDiagnostics();
			const diagCam = new CameraController(defaultConfig({ lerpX: 1, lerpY: 1 }), spy);

			// Target outside bounds — will be clamped
			diagCam.setTarget(0, 0);
			diagCam.update(FRAME);

			const clampEvents = spy.events.filter((e) => e.label === 'bounds-clamp');
			expect(clampEvents.length).toBeGreaterThanOrEqual(1);
			expect(clampEvents[0].channel).toBe('camera');
			expect(clampEvents[0].level).toBe('state');
		});

		it('emits debug lerp events when enabled', () => {
			const spy = createSpyDiagnostics();
			const diagCam = new CameraController(defaultConfig(), spy);

			diagCam.setTarget(1000, 500);
			diagCam.update(FRAME);

			const debugEvents = spy.events.filter((e) => e.level === 'debug');
			expect(debugEvents.length).toBeGreaterThanOrEqual(1);
			expect(debugEvents[0].label).toBe('lerp');
		});
	});
});
