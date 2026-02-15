/**
 * Audio asset key constants and SFX variant map.
 *
 * Pure TS, zone-safe. No Phaser or browser imports.
 *
 * SFX keys follow the pattern: `sfx-{category}-{variant}`.
 * Music keys follow the pattern: `music-{name}`.
 * The variant map groups SFX keys by category so the caller
 * can pick a random variant for natural audio variation.
 */

// ── Music keys ──

export const MusicKeys = {
	TITLE: 'music-title',
	PLATFORMER: 'music-platformer',
	MINIGAME: 'music-minigame',
} as const;

export type MusicKey = (typeof MusicKeys)[keyof typeof MusicKeys];

// ── SFX keys ──

export const SfxKeys = {
	JUMP_1: 'sfx-jump-1',
	JUMP_2: 'sfx-jump-2',
	JUMP_3: 'sfx-jump-3',
	JUMP_4: 'sfx-jump-4',
	LAND_1: 'sfx-land-1',
	LAND_2: 'sfx-land-2',
	LAND_3: 'sfx-land-3',
	LAND_4: 'sfx-land-4',
	COIN_1: 'sfx-coin-1',
	COIN_2: 'sfx-coin-2',
	COIN_3: 'sfx-coin-3',
	COIN_4: 'sfx-coin-4',
	HURT_1: 'sfx-hurt-1',
	HURT_2: 'sfx-hurt-2',
	ENEMY_DEFEAT_1: 'sfx-enemy-defeat-1',
	ENEMY_DEFEAT_2: 'sfx-enemy-defeat-2',
	MENU_SELECT_1: 'sfx-menu-select-1',
	MENU_SELECT_2: 'sfx-menu-select-2',
	MENU_SELECT_3: 'sfx-menu-select-3',
	MENU_SELECT_4: 'sfx-menu-select-4',
	MENU_CONFIRM_1: 'sfx-menu-confirm-1',
	MENU_CONFIRM_2: 'sfx-menu-confirm-2',
	LEVEL_COMPLETE: 'sfx-level-complete',
	GAME_OVER: 'sfx-game-over',
} as const;

export type SfxKey = (typeof SfxKeys)[keyof typeof SfxKeys];

// ── SFX variant map ──

/** Category → list of SFX keys. Pick a random one for variation. */
export const SfxVariants: Record<string, readonly SfxKey[]> = {
	jump: [SfxKeys.JUMP_1, SfxKeys.JUMP_2, SfxKeys.JUMP_3, SfxKeys.JUMP_4],
	land: [SfxKeys.LAND_1, SfxKeys.LAND_2, SfxKeys.LAND_3, SfxKeys.LAND_4],
	coin: [SfxKeys.COIN_1, SfxKeys.COIN_2, SfxKeys.COIN_3, SfxKeys.COIN_4],
	hurt: [SfxKeys.HURT_1, SfxKeys.HURT_2],
	'enemy-defeat': [SfxKeys.ENEMY_DEFEAT_1, SfxKeys.ENEMY_DEFEAT_2],
	'menu-select': [
		SfxKeys.MENU_SELECT_1,
		SfxKeys.MENU_SELECT_2,
		SfxKeys.MENU_SELECT_3,
		SfxKeys.MENU_SELECT_4,
	],
	'menu-confirm': [SfxKeys.MENU_CONFIRM_1, SfxKeys.MENU_CONFIRM_2],
	'level-complete': [SfxKeys.LEVEL_COMPLETE],
	'game-over': [SfxKeys.GAME_OVER],
} as const;

/**
 * Pick a random SFX key from a category.
 * Returns undefined if the category doesn't exist.
 */
export function pickSfxVariant(category: string): SfxKey | undefined {
	const variants = SfxVariants[category];
	if (!variants || variants.length === 0) return undefined;
	return variants[Math.floor(Math.random() * variants.length)];
}
