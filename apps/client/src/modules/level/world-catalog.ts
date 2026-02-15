import type { LevelId, SessionSaveData, WorldDefinition, WorldId } from '@hub-of-wyn/shared';
import { WorldDefinitionSchema } from '@hub-of-wyn/shared';

const WorldArraySchema = WorldDefinitionSchema.array();

/**
 * WorldCatalog — loads and queries world/level definitions.
 *
 * Pure TS, zone-safe. Validates raw JSON via Zod on init().
 * Provides unlock checking against SessionSaveData without coupling
 * to the persistence layer.
 */
export class WorldCatalog {
	private worlds: Map<WorldId, WorldDefinition> = new Map();
	private initialized = false;

	/** Validate and store world definitions from raw JSON data. */
	init(raw: unknown): void {
		const parsed = WorldArraySchema.parse(raw);
		this.worlds = new Map();
		for (const world of parsed) {
			this.worlds.set(world.id, world);
		}
		this.initialized = true;
	}

	/** Whether init() has been called successfully. */
	get isInitialized(): boolean {
		return this.initialized;
	}

	/** Get a world by ID. Returns undefined if not found. */
	getById(id: WorldId): WorldDefinition | undefined {
		return this.worlds.get(id);
	}

	/** Get all world definitions. */
	getAll(): WorldDefinition[] {
		return [...this.worlds.values()];
	}

	/** Get all worlds sorted by explicit order field. */
	getOrdered(): WorldDefinition[] {
		return [...this.worlds.values()].sort((a, b) => a.order - b.order);
	}

	/** Get level IDs for a given world. Returns empty array if world not found. */
	getLevelsForWorld(worldId: WorldId): LevelId[] {
		const world = this.worlds.get(worldId);
		return world ? [...world.levels] : [];
	}

	/**
	 * Check if a world is unlocked given current save data.
	 *
	 * - `none` -> always unlocked
	 * - `world-complete` -> all levels in the required world must be in save.levels,
	 *    AND the required world must have >0 levels (empty world != complete)
	 * - `stars` -> totalStars >= starsRequired
	 */
	isWorldUnlocked(worldId: WorldId, saveData: SessionSaveData): boolean {
		const world = this.worlds.get(worldId);
		if (!world) return false;

		const condition = world.unlockCondition;

		switch (condition.type) {
			case 'none':
				return true;

			case 'world-complete': {
				if (!condition.worldId) return false;
				const requiredWorld = this.worlds.get(condition.worldId);
				if (!requiredWorld) return false;
				if (requiredWorld.levels.length === 0) return false;
				return requiredWorld.levels.every((levelId) => levelId in saveData.levels);
			}

			case 'stars':
				return saveData.totalStars >= (condition.starsRequired ?? 0);

			default:
				return false;
		}
	}

	/**
	 * Get the next level after the current one within a world.
	 * Uses the world's levels array order (explicit, not string-sorted).
	 * Returns null if current level is last in world or not found.
	 */
	getNextLevel(currentLevelId: LevelId, worldId: WorldId): LevelId | null {
		const world = this.worlds.get(worldId);
		if (!world) return null;

		const index = world.levels.indexOf(currentLevelId);
		if (index === -1 || index >= world.levels.length - 1) return null;

		return world.levels[index + 1] ?? null;
	}
}
