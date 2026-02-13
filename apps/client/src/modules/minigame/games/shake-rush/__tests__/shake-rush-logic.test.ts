import { describe, expect, it, vi } from 'vitest';
import type { IDiagnostics } from '../../../../../core/ports/diagnostics.js';
import { createMockClock, createMockInput } from '../../../../__test-utils__/mocks.js';
import { spawnEntity } from '../lane-system.js';
import { SHAKE_RUSH } from '../shake-rush-config.js';
import { ShakeRushLogic } from '../shake-rush-logic.js';

function createLogic() {
	const input = createMockInput();
	const clock = createMockClock();
	const diagnostics: IDiagnostics = {
		emit: vi.fn(),
		isEnabled: () => true,
		query: () => [],
	};
	const logic = new ShakeRushLogic({ input, clock, diagnostics });
	return { logic, input, clock, diagnostics };
}

describe('ShakeRushLogic', () => {
	it('starts in intro phase', () => {
		const { logic } = createLogic();
		expect(logic.phase).toBe('intro');
		expect(logic.id).toBe('shake-rush');
	});

	it('transitions to active on start()', () => {
		const { logic } = createLogic();
		logic.start();
		expect(logic.phase).toBe('active');
	});

	it('lane change up via justPressed jump', () => {
		const { logic, input } = createLogic();
		logic.start();

		// Player starts at lane 1; pressing jump should move to lane 0
		input._justPressed.add('jump');
		logic.update(16);

		const snap = logic.renderSnapshot();
		expect(snap.player.lane).toBe(0);
	});

	it('lane change down via justPressed down', () => {
		const { logic, input } = createLogic();
		logic.start();

		// Player starts at lane 1; pressing down should move to lane 2
		input._justPressed.add('down');
		logic.update(16);

		const snap = logic.renderSnapshot();
		expect(snap.player.lane).toBe(2);
	});

	it('horizontal movement via isDown left/right', () => {
		const { logic, input } = createLogic();
		logic.start();
		const startX = logic.renderSnapshot().player.x;

		// Move right
		input._pressed.add('right');
		logic.update(16);
		input._pressed.delete('right');

		const afterRight = logic.renderSnapshot().player.x;
		expect(afterRight).toBe(startX + SHAKE_RUSH.PLAYER_MOVE_SPEED);

		// Move left
		input._pressed.add('left');
		logic.update(16);

		const afterLeft = logic.renderSnapshot().player.x;
		expect(afterLeft).toBe(afterRight - SHAKE_RUSH.PLAYER_MOVE_SPEED);
	});

	it('parcel pickup on proximity', () => {
		const { logic, input } = createLogic();
		logic.start();

		// Manually spawn a parcel near the player's position and lane
		spawnEntity(logic.laneState, 'parcel-protein', 1);
		// Move entity to player's starting x position
		logic.laneState.entities[0]!.x = SHAKE_RUSH.PLAYER_START_X;

		logic.update(16);

		const snap = logic.renderSnapshot();
		expect(snap.player.carrying).toBe('protein');
	});

	it('delivery at delivery zone while carrying', () => {
		const { logic, input } = createLogic();
		logic.start();

		// Prevent random spawns
		logic.laneState.spawnTimer = 999_999;

		// Spawn and pick up a parcel
		spawnEntity(logic.laneState, 'parcel-protein', 1);
		logic.laneState.entities[0]!.x = SHAKE_RUSH.PLAYER_START_X;
		logic.update(16);

		// Verify we're carrying
		expect(logic.renderSnapshot().player.carrying).toBe('protein');

		// Move player to delivery zone by pressing right many times
		logic.laneState.spawnTimer = 999_999;
		input._pressed.add('right');
		const distanceNeeded = SHAKE_RUSH.DELIVERY_ZONE_X - SHAKE_RUSH.PLAYER_START_X;
		const updatesNeeded = Math.ceil(distanceNeeded / SHAKE_RUSH.PLAYER_MOVE_SPEED) + 1;
		for (let i = 0; i < updatesNeeded; i++) {
			logic.update(16);
		}
		input._pressed.delete('right');

		// Check delivery happened
		const hud = logic.hudSnapshot();
		expect(hud.score).toBeGreaterThan(0);
		expect(logic.renderSnapshot().player.carrying).toBeNull();
	});

	it('obstacle hit reduces lives', () => {
		const { logic } = createLogic();
		logic.start();

		expect(logic.hudSnapshot().lives).toBe(SHAKE_RUSH.INITIAL_LIVES);

		// Spawn obstacle at player's position
		spawnEntity(logic.laneState, 'obstacle-poop', 1);
		logic.laneState.entities[0]!.x = SHAKE_RUSH.PLAYER_START_X;

		logic.update(16);

		expect(logic.hudSnapshot().lives).toBe(SHAKE_RUSH.INITIAL_LIVES - 1);
	});

	it('combo increments on consecutive deliveries', () => {
		const { logic, input } = createLogic();
		logic.start();

		// Prevent random spawns throughout test
		logic.laneState.spawnTimer = 999_999;

		// First delivery
		spawnEntity(logic.laneState, 'parcel-protein', 1);
		logic.laneState.entities[0]!.x = SHAKE_RUSH.PLAYER_START_X;
		logic.update(16); // pickup

		// Move to delivery zone
		logic.laneState.spawnTimer = 999_999;
		input._pressed.add('right');
		const distanceNeeded = SHAKE_RUSH.DELIVERY_ZONE_X - SHAKE_RUSH.PLAYER_START_X;
		const updatesNeeded = Math.ceil(distanceNeeded / SHAKE_RUSH.PLAYER_MOVE_SPEED) + 1;
		for (let i = 0; i < updatesNeeded; i++) {
			logic.update(16);
		}
		input._pressed.delete('right');

		expect(logic.hudSnapshot().combo).toBe(1);

		// Move player back left for second delivery
		logic.laneState.spawnTimer = 999_999;
		input._pressed.add('left');
		for (let i = 0; i < updatesNeeded; i++) {
			logic.update(16);
		}
		input._pressed.delete('left');

		// Second delivery
		logic.laneState.spawnTimer = 999_999;
		spawnEntity(logic.laneState, 'parcel-protein', 1);
		const newEntity = logic.laneState.entities[logic.laneState.entities.length - 1]!;
		newEntity.x = logic.renderSnapshot().player.x;
		logic.update(16); // pickup

		logic.laneState.spawnTimer = 999_999;
		input._pressed.add('right');
		for (let i = 0; i < updatesNeeded; i++) {
			logic.update(16);
		}
		input._pressed.delete('right');

		expect(logic.hudSnapshot().combo).toBe(2);
	});

	it('dash moves player forward', () => {
		const { logic, input } = createLogic();
		logic.start();
		const startX = logic.renderSnapshot().player.x;

		// First update: ability triggers dash state
		input._justPressed.add('ability');
		logic.update(16);
		input._justPressed.delete('ability');

		expect(logic.renderSnapshot().player.isDashing).toBe(true);

		// Second update: dash movement applies
		logic.update(16);

		const snap = logic.renderSnapshot();
		expect(snap.player.isDashing).toBe(true);
		expect(snap.player.x).toBeGreaterThan(startX);
	});

	it('game over when lives reach 0', () => {
		const { logic } = createLogic();
		logic.start();

		// Hit obstacles until lives = 0
		for (let i = 0; i < SHAKE_RUSH.INITIAL_LIVES; i++) {
			spawnEntity(logic.laneState, 'obstacle-poop', 1);
			logic.laneState.entities[logic.laneState.entities.length - 1]!.x = SHAKE_RUSH.PLAYER_START_X;
			logic.update(16);

			// Wait for invincibility to expire before next hit
			if (i < SHAKE_RUSH.INITIAL_LIVES - 1) {
				logic.update(SHAKE_RUSH.INVINCIBILITY_DURATION_MS + 1);
			}
		}

		expect(logic.phase).toBe('finished');
		const result = logic.getResult();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(false);
	});

	it('win when deliveries reach TARGET_DELIVERIES', () => {
		const { logic, input } = createLogic();
		logic.start();

		for (let d = 0; d < SHAKE_RUSH.TARGET_DELIVERIES; d++) {
			// Prevent random spawns by keeping spawn timer high
			logic.laneState.spawnTimer = 999_999;

			// Spawn parcel at player location
			spawnEntity(logic.laneState, 'parcel-protein', 1);
			logic.laneState.entities[logic.laneState.entities.length - 1]!.x =
				logic.renderSnapshot().player.x;
			logic.update(16); // pickup

			// Move to delivery zone
			logic.laneState.spawnTimer = 999_999;
			input._pressed.add('right');
			const distanceNeeded = SHAKE_RUSH.DELIVERY_ZONE_X - logic.renderSnapshot().player.x;
			const updatesNeeded = Math.ceil(distanceNeeded / SHAKE_RUSH.PLAYER_MOVE_SPEED) + 2;
			for (let i = 0; i < updatesNeeded; i++) {
				logic.update(16);
			}
			input._pressed.delete('right');

			// Move back left for next delivery (if not the last)
			if (d < SHAKE_RUSH.TARGET_DELIVERIES - 1) {
				logic.laneState.spawnTimer = 999_999;
				input._pressed.add('left');
				for (let i = 0; i < updatesNeeded; i++) {
					logic.update(16);
				}
				input._pressed.delete('left');
			}
		}

		expect(logic.phase).toBe('finished');
		const result = logic.getResult();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(true);
		expect(result!.score).toBeGreaterThan(0);
	});

	it('hudSnapshot returns correct progress', () => {
		const { logic } = createLogic();
		logic.start();

		const hud = logic.hudSnapshot();
		expect(hud.minigameId).toBe('shake-rush');
		expect(hud.phase).toBe('active');
		expect(hud.progress).toBe(0);
		expect(hud.progressLabel).toBe(`0/${SHAKE_RUSH.TARGET_DELIVERIES} Deliveries`);
		expect(hud.lives).toBe(SHAKE_RUSH.INITIAL_LIVES);
		expect(hud.maxLives).toBe(SHAKE_RUSH.INITIAL_LIVES);
	});

	it('getResult returns null when not finished', () => {
		const { logic } = createLogic();
		logic.start();
		expect(logic.getResult()).toBeNull();
	});
});
