import { describe, expect, it } from 'vitest';
import { CharacterCatalog } from '../character-catalog.js';

const VALID_CHARACTERS = [
	{
		id: 'knight',
		name: 'Knight',
		description: 'Tank',
		stats: { maxHealth: 150, speed: 200, jumpForce: 380, attackPower: 12, defense: 10 },
		ability: { id: 'shield-bash', name: 'Shield Bash', description: 'Stun', cooldownMs: 5000 },
		spriteKey: 'player',
		portraitKey: 'player',
		unlocked: true,
	},
	{
		id: 'mage',
		name: 'Mage',
		description: 'Glass cannon',
		stats: { maxHealth: 80, speed: 230, jumpForce: 460, attackPower: 18, defense: 3 },
		ability: { id: 'arcane-bolt', name: 'Arcane Bolt', description: 'Range', cooldownMs: 3000 },
		spriteKey: 'player',
		portraitKey: 'player',
		unlocked: true,
	},
	{
		id: 'rogue',
		name: 'Rogue',
		description: 'Fast',
		stats: { maxHealth: 100, speed: 280, jumpForce: 420, attackPower: 14, defense: 5 },
		ability: { id: 'shadow-dash', name: 'Shadow Dash', description: 'Dash', cooldownMs: 4000 },
		spriteKey: 'player',
		portraitKey: 'player',
		unlocked: false,
	},
];

describe('CharacterCatalog', () => {
	it('starts uninitialized', () => {
		const catalog = new CharacterCatalog();
		expect(catalog.isInitialized).toBe(false);
	});

	it('initializes from valid data', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		expect(catalog.isInitialized).toBe(true);
	});

	it('throws on invalid data', () => {
		const catalog = new CharacterCatalog();
		expect(() => catalog.init([{ id: 'invalid' }])).toThrow();
	});

	it('throws on non-array data', () => {
		const catalog = new CharacterCatalog();
		expect(() => catalog.init('not an array')).toThrow();
	});

	it('getById returns correct character', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		const knight = catalog.getById('knight');
		expect(knight).toBeDefined();
		expect(knight?.name).toBe('Knight');
		expect(knight?.stats.maxHealth).toBe(150);
	});

	it('getById returns undefined for unknown id', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		// @ts-expect-error — testing invalid ID at runtime
		const result = catalog.getById('wizard');
		expect(result).toBeUndefined();
	});

	it('getAll returns all characters', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		const all = catalog.getAll();
		expect(all).toHaveLength(3);
	});

	it('getUnlocked filters locked characters', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		const unlocked = catalog.getUnlocked();
		expect(unlocked).toHaveLength(2);
		expect(unlocked.every((c) => c.unlocked)).toBe(true);
	});

	it('getDefault returns first unlocked character', () => {
		const catalog = new CharacterCatalog();
		catalog.init(VALID_CHARACTERS);
		const def = catalog.getDefault();
		expect(def).toBeDefined();
		expect(def?.id).toBe('knight');
	});

	it('getDefault returns undefined when all locked', () => {
		const allLocked = VALID_CHARACTERS.map((c) => ({ ...c, unlocked: false }));
		const catalog = new CharacterCatalog();
		catalog.init(allLocked);
		expect(catalog.getDefault()).toBeUndefined();
	});

	it('getAll returns empty array before init', () => {
		const catalog = new CharacterCatalog();
		expect(catalog.getAll()).toEqual([]);
	});
});
