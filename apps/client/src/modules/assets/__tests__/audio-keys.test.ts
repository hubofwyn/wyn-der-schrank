import { describe, expect, it } from 'vitest';
import { MusicKeys, pickSfxVariant, SfxKeys, SfxVariants } from '../audio-keys.js';

describe('MusicKeys', () => {
	it('exports expected music key constants', () => {
		expect(MusicKeys.TITLE).toBe('music-title');
		expect(MusicKeys.PLATFORMER).toBe('music-platformer');
		expect(MusicKeys.MINIGAME).toBe('music-minigame');
	});

	it('has exactly 3 music keys', () => {
		expect(Object.keys(MusicKeys)).toHaveLength(3);
	});
});

describe('SfxKeys', () => {
	it('exports expected SFX key constants', () => {
		expect(SfxKeys.JUMP_1).toBe('sfx-jump-1');
		expect(SfxKeys.LAND_1).toBe('sfx-land-1');
		expect(SfxKeys.COIN_1).toBe('sfx-coin-1');
		expect(SfxKeys.HURT_1).toBe('sfx-hurt-1');
		expect(SfxKeys.ENEMY_DEFEAT_1).toBe('sfx-enemy-defeat-1');
		expect(SfxKeys.MENU_SELECT_1).toBe('sfx-menu-select-1');
		expect(SfxKeys.MENU_CONFIRM_1).toBe('sfx-menu-confirm-1');
		expect(SfxKeys.LEVEL_COMPLETE).toBe('sfx-level-complete');
		expect(SfxKeys.GAME_OVER).toBe('sfx-game-over');
	});

	it('follows the sfx-{category}-{variant} naming pattern', () => {
		for (const value of Object.values(SfxKeys)) {
			expect(value).toMatch(/^sfx-[\w-]+$/);
		}
	});
});

describe('SfxVariants', () => {
	it('groups jump variants correctly', () => {
		expect(SfxVariants['jump']).toEqual([
			SfxKeys.JUMP_1,
			SfxKeys.JUMP_2,
			SfxKeys.JUMP_3,
			SfxKeys.JUMP_4,
		]);
	});

	it('groups land variants correctly', () => {
		expect(SfxVariants['land']).toEqual([
			SfxKeys.LAND_1,
			SfxKeys.LAND_2,
			SfxKeys.LAND_3,
			SfxKeys.LAND_4,
		]);
	});

	it('groups coin variants correctly', () => {
		expect(SfxVariants['coin']).toEqual([
			SfxKeys.COIN_1,
			SfxKeys.COIN_2,
			SfxKeys.COIN_3,
			SfxKeys.COIN_4,
		]);
	});

	it('has single-item arrays for one-shot sounds', () => {
		expect(SfxVariants['level-complete']).toEqual([SfxKeys.LEVEL_COMPLETE]);
		expect(SfxVariants['game-over']).toEqual([SfxKeys.GAME_OVER]);
	});

	it('covers all 9 categories', () => {
		const expectedCategories = [
			'jump',
			'land',
			'coin',
			'hurt',
			'enemy-defeat',
			'menu-select',
			'menu-confirm',
			'level-complete',
			'game-over',
		];
		expect(Object.keys(SfxVariants)).toEqual(expect.arrayContaining(expectedCategories));
		expect(Object.keys(SfxVariants)).toHaveLength(expectedCategories.length);
	});

	it('contains only valid SfxKey values', () => {
		const allSfxKeys = new Set(Object.values(SfxKeys));
		for (const variants of Object.values(SfxVariants)) {
			for (const key of variants) {
				expect(allSfxKeys.has(key)).toBe(true);
			}
		}
	});
});

describe('pickSfxVariant', () => {
	it('returns a valid key for a known category', () => {
		const result = pickSfxVariant('jump');
		expect(result).toBeDefined();
		expect(SfxVariants['jump']).toContain(result);
	});

	it('returns undefined for an unknown category', () => {
		expect(pickSfxVariant('nonexistent')).toBeUndefined();
	});

	it('returns undefined for an empty string category', () => {
		expect(pickSfxVariant('')).toBeUndefined();
	});

	it('returns the only key for single-variant categories', () => {
		expect(pickSfxVariant('level-complete')).toBe(SfxKeys.LEVEL_COMPLETE);
		expect(pickSfxVariant('game-over')).toBe(SfxKeys.GAME_OVER);
	});

	it('returns keys from the correct variant pool', () => {
		const jumpVariants = new Set(SfxVariants['jump']);
		// Run multiple times to increase confidence in randomization
		for (let i = 0; i < 20; i++) {
			const result = pickSfxVariant('jump');
			expect(jumpVariants.has(result!)).toBe(true);
		}
	});

	it('returns keys from all multi-variant categories', () => {
		const categories = [
			'jump',
			'land',
			'coin',
			'hurt',
			'enemy-defeat',
			'menu-select',
			'menu-confirm',
		];
		for (const category of categories) {
			const variants = new Set(SfxVariants[category]);
			const result = pickSfxVariant(category);
			expect(variants.has(result!)).toBe(true);
		}
	});
});
