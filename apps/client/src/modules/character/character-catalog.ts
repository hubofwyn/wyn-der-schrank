import type { CharacterDefinition, CharacterId } from '@hub-of-wyn/shared';
import { CharacterDefinitionSchema } from '@hub-of-wyn/shared';

const CharacterArraySchema = CharacterDefinitionSchema.array();

/**
 * CharacterCatalog — loads and queries character definitions.
 *
 * Pure TS, zone-safe. Validates raw JSON via Zod on init().
 * Stores characters in a Map keyed by CharacterId.
 */
export class CharacterCatalog {
	private characters: Map<CharacterId, CharacterDefinition> = new Map();
	private initialized = false;

	/** Validate and store character definitions from raw JSON data. */
	init(raw: unknown): void {
		const parsed = CharacterArraySchema.parse(raw);
		this.characters = new Map();
		for (const char of parsed) {
			this.characters.set(char.id, char);
		}
		this.initialized = true;
	}

	/** Whether init() has been called successfully. */
	get isInitialized(): boolean {
		return this.initialized;
	}

	/** Get a character by ID. Returns undefined if not found. */
	getById(id: CharacterId): CharacterDefinition | undefined {
		return this.characters.get(id);
	}

	/** Get all character definitions. */
	getAll(): CharacterDefinition[] {
		return [...this.characters.values()];
	}

	/** Get only unlocked characters. */
	getUnlocked(): CharacterDefinition[] {
		return [...this.characters.values()].filter((c) => c.unlocked);
	}

	/** Get the first unlocked character as a fallback default. Returns undefined if none unlocked. */
	getDefault(): CharacterDefinition | undefined {
		for (const char of this.characters.values()) {
			if (char.unlocked) return char;
		}
		return undefined;
	}
}
