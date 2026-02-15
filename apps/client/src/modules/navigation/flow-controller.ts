import type { CharacterId, LevelId, WorldId } from '@hub-of-wyn/shared';

/**
 * Flow phases — typed state machine tracking selection progress.
 *
 * - idle: no selections made
 * - character-selected: character chosen, no world/level
 * - world-selected: character + world, no level
 * - ready: character + world + level (can start gameplay)
 */
export type FlowPhase = 'idle' | 'character-selected' | 'world-selected' | 'ready';

export interface FlowSelection {
	readonly phase: FlowPhase;
	readonly characterId: CharacterId | null;
	readonly worldId: WorldId | null;
	readonly levelId: LevelId | null;
}

export type CanStartResult =
	| { ok: true }
	| { ok: false; reason: 'no_character' | 'no_world' | 'no_level' };

/**
 * FlowController — small state machine tracking the user's menu selections.
 *
 * Pure TS, zone-safe. Enforces valid phase transitions:
 * idle -> character-selected -> world-selected -> ready
 *
 * Back behavior contracts:
 * - selectCharacter: valid from any phase, clears world and level
 * - selectWorld: requires character selected, clears level
 * - selectLevel: requires world selected
 * - reset: returns to idle, clears everything
 */
export class FlowController {
	private _phase: FlowPhase = 'idle';
	private _characterId: CharacterId | null = null;
	private _worldId: WorldId | null = null;
	private _levelId: LevelId | null = null;

	/** Current selection state (readonly snapshot). */
	get selection(): FlowSelection {
		return {
			phase: this._phase,
			characterId: this._characterId,
			worldId: this._worldId,
			levelId: this._levelId,
		};
	}

	/**
	 * Select a character. Valid from any phase.
	 * Clears world and level (forces re-selection downstream).
	 */
	selectCharacter(id: CharacterId): void {
		this._characterId = id;
		this._worldId = null;
		this._levelId = null;
		this._phase = 'character-selected';
	}

	/**
	 * Select a world. Requires a character to be selected.
	 * Clears level selection.
	 */
	selectWorld(id: WorldId): void {
		if (this._characterId === null) return;
		this._worldId = id;
		this._levelId = null;
		this._phase = 'world-selected';
	}

	/**
	 * Select a level. Requires a world to be selected.
	 */
	selectLevel(id: LevelId): void {
		if (this._worldId === null) return;
		this._levelId = id;
		this._phase = 'ready';
	}

	/**
	 * Check if all selections are made and gameplay can start.
	 */
	canStartLevel(): CanStartResult {
		if (this._characterId === null) return { ok: false, reason: 'no_character' };
		if (this._worldId === null) return { ok: false, reason: 'no_world' };
		if (this._levelId === null) return { ok: false, reason: 'no_level' };
		return { ok: true };
	}

	/**
	 * Get the map key for the currently selected level.
	 * Returns `map-{levelId}` or null if no level is selected.
	 */
	getMapKey(): string | null {
		if (this._levelId === null) return null;
		return `map-${this._levelId}`;
	}

	/**
	 * Reset all selections. Returns to idle phase.
	 * Used when navigating back to Title.
	 */
	reset(): void {
		this._phase = 'idle';
		this._characterId = null;
		this._worldId = null;
		this._levelId = null;
	}
}
