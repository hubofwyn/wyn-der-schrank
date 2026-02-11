/**
 * Pure TS level geometry data.
 * No Phaser imports — this lives in modules/ (zone rule).
 *
 * Coordinates use center-origin to match Phaser's default
 * Rectangle origin (0.5, 0.5).
 */

export interface PlatformDef {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly color: number;
}

export interface LevelGeometry {
	readonly name: string;
	readonly spawn: { readonly x: number; readonly y: number };
	readonly worldWidth: number;
	readonly worldHeight: number;
	readonly platforms: readonly PlatformDef[];
}

const GROUND_COLOR = 0x4a7c59;
const PLATFORM_COLOR = 0x8b6914;

/**
 * "First Steps" — introductory level with ascending platforms.
 * Designed so a player with default stats (speed 250, jumpVelocity -420)
 * can reach every platform. World scrolls horizontally.
 */
export function getFirstStepsLevel(): LevelGeometry {
	return {
		name: 'First Steps',
		spawn: { x: 100, y: 700 },
		worldWidth: 3200,
		worldHeight: 800,
		platforms: [
			// Ground — full width
			{ x: 1600, y: 776, width: 3200, height: 48, color: GROUND_COLOR },

			// Ascending platforms left to right
			{ x: 400, y: 650, width: 200, height: 24, color: PLATFORM_COLOR },
			{ x: 700, y: 560, width: 160, height: 24, color: PLATFORM_COLOR },
			{ x: 1000, y: 480, width: 200, height: 24, color: PLATFORM_COLOR },
			{ x: 1350, y: 520, width: 180, height: 24, color: PLATFORM_COLOR },
			{ x: 1650, y: 440, width: 160, height: 24, color: PLATFORM_COLOR },
			{ x: 1950, y: 360, width: 200, height: 24, color: PLATFORM_COLOR },
			{ x: 2300, y: 450, width: 180, height: 24, color: PLATFORM_COLOR },
			{ x: 2600, y: 350, width: 200, height: 24, color: PLATFORM_COLOR },
			{ x: 2900, y: 280, width: 240, height: 24, color: PLATFORM_COLOR },
		],
	};
}
