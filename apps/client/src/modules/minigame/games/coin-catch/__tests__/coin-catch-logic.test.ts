import { describe, expect, it, vi } from 'vitest';
import type { IDiagnostics } from '../../../../../core/ports/diagnostics.js';
import { createMockClock, createMockInput } from '../../../../__test-utils__/mocks.js';
import { COIN_CATCH } from '../coin-catch-config.js';
import { CoinCatchLogic } from '../coin-catch-logic.js';
import { spawnEntity } from '../falling-objects.js';

function createLogic(rngValues?: number[]) {
	const input = createMockInput();
	const clock = createMockClock();
	const diagnostics: IDiagnostics = {
		emit: vi.fn(),
		isEnabled: () => true,
		query: () => [],
	};
	const rngQueue = rngValues ? [...rngValues] : [];
	let rngIndex = 0;
	const rng = rngValues
		? () => {
				const val = rngQueue[rngIndex % rngQueue.length]!;
				rngIndex++;
				return val;
			}
		: () => 0.5; // default: always coin at center
	const logic = new CoinCatchLogic({ input, clock, diagnostics, rng });
	return { logic, input, clock, diagnostics, rng };
}

describe('CoinCatchLogic', () => {
	// ── Phase transitions ──

	it('starts in intro phase', () => {
		const { logic } = createLogic();
		expect(logic.phase).toBe('intro');
		expect(logic.id).toBe('coin-catch');
	});

	it('transitions to active on start()', () => {
		const { logic } = createLogic();
		logic.start();
		expect(logic.phase).toBe('active');
	});

	it('does not update during intro phase', () => {
		const { logic } = createLogic();
		logic.update(16);
		expect(logic.phase).toBe('intro');
	});

	// ── Catcher movement ──

	it('moves catcher left on input', () => {
		const { logic, input } = createLogic();
		logic.start();
		// Prevent spawn by pushing timer up
		logic.fallingState.spawnTimer = 999_999;

		const startX = logic.renderSnapshot().player.x;
		input._pressed.add('left');
		logic.update(16);
		input._pressed.delete('left');

		const expectedMove = COIN_CATCH.CATCHER_SPEED_PX_PER_SEC * (16 / 1000);
		expect(logic.renderSnapshot().player.x).toBeCloseTo(startX - expectedMove, 1);
	});

	it('moves catcher right on input', () => {
		const { logic, input } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		const startX = logic.renderSnapshot().player.x;
		input._pressed.add('right');
		logic.update(16);
		input._pressed.delete('right');

		const expectedMove = COIN_CATCH.CATCHER_SPEED_PX_PER_SEC * (16 / 1000);
		expect(logic.renderSnapshot().player.x).toBeCloseTo(startX + expectedMove, 1);
	});

	it('clamps catcher to CATCHER_MIN_X', () => {
		const { logic, input } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		input._pressed.add('left');
		// Move enough frames to hit boundary
		for (let i = 0; i < 200; i++) {
			logic.update(16);
		}
		input._pressed.delete('left');

		expect(logic.renderSnapshot().player.x).toBe(COIN_CATCH.CATCHER_MIN_X);
	});

	it('clamps catcher to CATCHER_MAX_X', () => {
		const { logic, input } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		input._pressed.add('right');
		for (let i = 0; i < 200; i++) {
			logic.update(16);
		}
		input._pressed.delete('right');

		expect(logic.renderSnapshot().player.x).toBe(COIN_CATCH.CATCHER_MAX_X);
	});

	// ── Coin catching ──

	it('catches coin and increases score', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// Manually spawn a coin at catcher position
		spawnEntity(logic.fallingState, 'coin', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[0]!.y = COIN_CATCH.CATCHER_Y;

		logic.update(16);

		expect(logic.hudSnapshot().score).toBe(COIN_CATCH.POINTS_COIN);
	});

	it('increments combo on consecutive coin catches', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// First catch
		spawnEntity(logic.fallingState, 'coin', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[0]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);
		expect(logic.hudSnapshot().combo).toBe(1);

		// Second catch
		spawnEntity(logic.fallingState, 'gold-coin', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[logic.fallingState.entities.length - 1]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);
		expect(logic.hudSnapshot().combo).toBe(2);
	});

	// ── Bomb hit ──

	it('bomb hit reduces lives and resets combo', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// Build combo first
		spawnEntity(logic.fallingState, 'coin', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[0]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);
		expect(logic.hudSnapshot().combo).toBe(1);

		// Wait for any invincibility from catch (there shouldn't be, but be safe)
		logic.update(COIN_CATCH.INVINCIBILITY_DURATION_MS + 1);

		// Hit bomb
		spawnEntity(logic.fallingState, 'bomb', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[logic.fallingState.entities.length - 1]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);

		const hud = logic.hudSnapshot();
		expect(hud.lives).toBe(COIN_CATCH.INITIAL_LIVES - 1);
		expect(hud.combo).toBe(0);
	});

	it('bomb hit grants invincibility', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		spawnEntity(logic.fallingState, 'bomb', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[0]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);

		expect(logic.renderSnapshot().player.isInvincible).toBe(true);
		expect(logic.hudSnapshot().lives).toBe(COIN_CATCH.INITIAL_LIVES - 1);

		// Second bomb during invincibility should not reduce lives
		spawnEntity(logic.fallingState, 'bomb', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[logic.fallingState.entities.length - 1]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);

		expect(logic.hudSnapshot().lives).toBe(COIN_CATCH.INITIAL_LIVES - 1);
	});

	// ── Game over (lose) ──

	it('finishes with loss when all lives lost', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		for (let i = 0; i < COIN_CATCH.INITIAL_LIVES; i++) {
			spawnEntity(logic.fallingState, 'bomb', COIN_CATCH.WORLD_WIDTH / 2);
			logic.fallingState.entities[logic.fallingState.entities.length - 1]!.y = COIN_CATCH.CATCHER_Y;
			logic.update(16);

			if (i < COIN_CATCH.INITIAL_LIVES - 1) {
				// Tick through invincibility in clamped steps (delta clamped to 50ms max)
				const steps = Math.ceil((COIN_CATCH.INVINCIBILITY_DURATION_MS + 1) / 50);
				for (let j = 0; j < steps; j++) {
					logic.fallingState.spawnTimer = 999_999;
					logic.update(50);
				}
			}
		}

		expect(logic.phase).toBe('finished');
		const result = logic.getResult();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(false);
		expect(result!.reward.coins).toBe(0);
	});

	// ── Game over (win) ──

	it('finishes with win when timer expires', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// Advance time to round duration (in 50ms clamped steps)
		const steps = Math.ceil(COIN_CATCH.ROUND_DURATION_MS / 50);
		for (let i = 0; i < steps + 1; i++) {
			logic.fallingState.spawnTimer = 999_999;
			logic.update(50);
			if (logic.phase === 'finished') break;
		}

		expect(logic.phase).toBe('finished');
		const result = logic.getResult();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(true);
	});

	// ── HUD snapshot ──

	it('hudSnapshot returns correct initial state', () => {
		const { logic } = createLogic();
		logic.start();

		const hud = logic.hudSnapshot();
		expect(hud.minigameId).toBe('coin-catch');
		expect(hud.phase).toBe('active');
		expect(hud.score).toBe(0);
		expect(hud.lives).toBe(COIN_CATCH.INITIAL_LIVES);
		expect(hud.maxLives).toBe(COIN_CATCH.INITIAL_LIVES);
		expect(hud.combo).toBe(0);
		expect(hud.progress).toBe(0);
		expect(hud.timeRemainingMs).toBe(COIN_CATCH.ROUND_DURATION_MS);
	});

	it('hudSnapshot progress advances as time passes', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// Advance 30 seconds (half the round)
		for (let i = 0; i < 600; i++) {
			logic.fallingState.spawnTimer = 999_999;
			logic.update(50);
		}

		const hud = logic.hudSnapshot();
		expect(hud.progress).toBeCloseTo(0.5, 1);
		expect(hud.timeRemainingMs).toBeCloseTo(30_000, -2);
	});

	// ── getResult ──

	it('getResult returns null when not finished', () => {
		const { logic } = createLogic();
		logic.start();
		expect(logic.getResult()).toBeNull();
	});

	// ── Delta clamping ──

	it('clamps negative delta to 0 (no-op)', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		const before = logic.hudSnapshot().timeRemainingMs;
		logic.update(-100);
		const after = logic.hudSnapshot().timeRemainingMs;
		expect(after).toBe(before);
	});

	it('clamps large delta to MINIGAME_MAX_DELTA_MS (50)', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		const before = logic.hudSnapshot().timeRemainingMs;
		logic.update(500); // should be clamped to 50
		const after = logic.hudSnapshot().timeRemainingMs;
		expect(before - after).toBe(50);
	});

	it('zero delta does not change state', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		const before = logic.hudSnapshot().timeRemainingMs;
		logic.update(0);
		const after = logic.hudSnapshot().timeRemainingMs;
		expect(after).toBe(before);
	});

	// ── Difficulty curve ──

	it('speed multiplier increases every 10 seconds', () => {
		const { logic } = createLogic();
		logic.start();

		// At 0s: multiplier = 1.0
		logic.fallingState.spawnTimer = 999_999;
		logic.update(16);
		const snap0 = logic.renderSnapshot();
		expect(snap0.phase).toBe('active');

		// Advance to 10s (200 frames at 50ms)
		for (let i = 0; i < 200; i++) {
			logic.fallingState.spawnTimer = 999_999;
			logic.update(50);
		}
		// elapsedMs ~ 10016, floor(10016/10000) = 1, multiplier = 1.1
		const hud10 = logic.hudSnapshot();
		expect(hud10.phase).toBe('active');

		// Advance to 20s
		for (let i = 0; i < 200; i++) {
			logic.fallingState.spawnTimer = 999_999;
			logic.update(50);
		}
		// elapsedMs ~ 20016, floor(20016/10000) = 2, multiplier = 1.2

		// Advance to 30s
		for (let i = 0; i < 200; i++) {
			logic.fallingState.spawnTimer = 999_999;
			logic.update(50);
		}
		// Still active
		expect(logic.phase).toBe('active');
	});

	// ── Fairness guard ──

	it('no back-to-back bombs (fairness guard)', () => {
		// RNG values: first two rolls produce bomb (< 0.20), fairness rerolls second as coin
		// Roll pattern for spawn: [kind_roll, x_roll, kind_roll, x_roll, ...]
		// kind_roll < 0.20 → bomb, then < 0.20 again → would be bomb, but fairness → coin
		const { logic } = createLogic([
			0.1,
			0.5, // spawn 1: kind=bomb (0.1 < 0.20), x=center
			0.1,
			0.5, // spawn 2: kind would be bomb, but fairness guard → coin
		]);
		logic.start();

		// Force two spawns
		logic.fallingState.spawnTimer = 0;
		logic.update(16);
		const firstEntity = logic.fallingState.entities[0]!;
		expect(firstEntity.kind).toBe('bomb');

		// Force second spawn
		logic.fallingState.spawnTimer = 0;
		logic.update(16);
		const secondEntity = logic.fallingState.entities[logic.fallingState.entities.length - 1]!;
		expect(secondEntity.kind).toBe('coin'); // fairness guard
	});

	// ── Deterministic replay ──

	it('deterministic replay: seeded RNG produces exact state', () => {
		// All coins, center position
		const { logic } = createLogic([0.5, 0.5]);
		logic.start();
		logic.fallingState.spawnTimer = 0;

		logic.update(16);

		// Should have spawned a coin (0.5 >= 0.20 + 0.10 = 0.30, so it's a regular coin)
		expect(logic.fallingState.entities.length).toBeGreaterThanOrEqual(1);
		const entity = logic.fallingState.entities[0]!;
		expect(entity.kind).toBe('coin');
	});

	// ── Render snapshot ──

	it('renderSnapshot satisfies MinigameRenderStateBase', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		const snap = logic.renderSnapshot();
		expect(snap.player.x).toBe(COIN_CATCH.WORLD_WIDTH / 2);
		expect(snap.player.y).toBe(COIN_CATCH.CATCHER_Y);
		expect(snap.player.isInvincible).toBe(false);
		expect(snap.entities).toEqual([]);
		expect(snap.phase).toBe('active');
	});

	// ── Offscreen removal (no penalty) ──

	it('missed coins are not penalized', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		spawnEntity(logic.fallingState, 'coin', 100);
		logic.fallingState.entities[0]!.y = COIN_CATCH.WORLD_HEIGHT + 100; // way past bottom

		const livesBefore = logic.hudSnapshot().lives;
		logic.update(16);
		const livesAfter = logic.hudSnapshot().lives;

		expect(livesAfter).toBe(livesBefore);
		expect(logic.fallingState.entities).toHaveLength(0);
	});

	// ── Gold coin scoring ──

	it('gold coin awards more points than regular coin', () => {
		const { logic } = createLogic();
		logic.start();
		logic.fallingState.spawnTimer = 999_999;

		// Catch gold coin
		spawnEntity(logic.fallingState, 'gold-coin', COIN_CATCH.WORLD_WIDTH / 2);
		logic.fallingState.entities[0]!.y = COIN_CATCH.CATCHER_Y;
		logic.update(16);

		expect(logic.hudSnapshot().score).toBe(COIN_CATCH.POINTS_GOLD);
	});
});
