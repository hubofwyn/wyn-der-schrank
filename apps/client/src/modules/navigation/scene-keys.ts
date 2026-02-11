export const SceneKeys = {
	BOOT: 'Boot',
	PRELOAD: 'Preload',
	TITLE: 'Title',
	MAIN_MENU: 'MainMenu',
	CHARACTER_SELECT: 'CharacterSelect',
	WORLD_SELECT: 'WorldSelect',
	LEVEL_SELECT: 'LevelSelect',
	SETTINGS: 'Settings',
	CREDITS: 'Credits',
	LEADERBOARD: 'Leaderboard',
	PLATFORMER: 'Platformer',
	HUD: 'Hud',
	PAUSE: 'Pause',
	MINIGAME: 'Minigame',
	MINIGAME_HUD: 'MinigameHud',
	LEVEL_COMPLETE: 'LevelComplete',
	GAME_OVER: 'GameOver',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
