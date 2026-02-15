import { describe, expect, it } from 'vitest';
import { FlowController } from '../flow-controller.js';

describe('FlowController', () => {
	it('starts in idle phase with null selections', () => {
		const fc = new FlowController();
		expect(fc.selection).toEqual({
			phase: 'idle',
			characterId: null,
			worldId: null,
			levelId: null,
		});
	});

	it('selectCharacter transitions to character-selected', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		expect(fc.selection.phase).toBe('character-selected');
		expect(fc.selection.characterId).toBe('knight');
	});

	it('selectWorld transitions to world-selected when character set', () => {
		const fc = new FlowController();
		fc.selectCharacter('mage');
		fc.selectWorld('forest');
		expect(fc.selection.phase).toBe('world-selected');
		expect(fc.selection.worldId).toBe('forest');
	});

	it('selectWorld is no-op without character', () => {
		const fc = new FlowController();
		fc.selectWorld('forest');
		expect(fc.selection.phase).toBe('idle');
		expect(fc.selection.worldId).toBeNull();
	});

	it('selectLevel transitions to ready when world set', () => {
		const fc = new FlowController();
		fc.selectCharacter('rogue');
		fc.selectWorld('cave');
		fc.selectLevel('cave-1');
		expect(fc.selection.phase).toBe('ready');
		expect(fc.selection.levelId).toBe('cave-1');
	});

	it('selectLevel is no-op without world', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectLevel('forest-1');
		expect(fc.selection.phase).toBe('character-selected');
		expect(fc.selection.levelId).toBeNull();
	});

	it('selectCharacter clears world and level', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		fc.selectLevel('forest-1');
		expect(fc.selection.phase).toBe('ready');

		fc.selectCharacter('mage');
		expect(fc.selection.phase).toBe('character-selected');
		expect(fc.selection.characterId).toBe('mage');
		expect(fc.selection.worldId).toBeNull();
		expect(fc.selection.levelId).toBeNull();
	});

	it('selectWorld clears level', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		fc.selectLevel('forest-1');

		fc.selectWorld('cave');
		expect(fc.selection.phase).toBe('world-selected');
		expect(fc.selection.worldId).toBe('cave');
		expect(fc.selection.levelId).toBeNull();
	});

	// ── canStartLevel ──

	it('canStartLevel returns no_character when idle', () => {
		const fc = new FlowController();
		const result = fc.canStartLevel();
		expect(result).toEqual({ ok: false, reason: 'no_character' });
	});

	it('canStartLevel returns no_world when only character set', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		expect(fc.canStartLevel()).toEqual({ ok: false, reason: 'no_world' });
	});

	it('canStartLevel returns no_level when only character+world set', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		expect(fc.canStartLevel()).toEqual({ ok: false, reason: 'no_level' });
	});

	it('canStartLevel returns ok when fully selected', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		fc.selectLevel('forest-1');
		expect(fc.canStartLevel()).toEqual({ ok: true });
	});

	// ── getMapKey ──

	it('getMapKey returns null when no level selected', () => {
		const fc = new FlowController();
		expect(fc.getMapKey()).toBeNull();
	});

	it('getMapKey returns map-prefixed level ID', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		fc.selectLevel('forest-1');
		expect(fc.getMapKey()).toBe('map-forest-1');
	});

	// ── reset ──

	it('reset returns to idle and clears all', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		fc.selectLevel('forest-1');

		fc.reset();
		expect(fc.selection).toEqual({
			phase: 'idle',
			characterId: null,
			worldId: null,
			levelId: null,
		});
	});

	// ── Back behavior contracts ──

	it('Back from MainMenu to CharacterSelect: character stays selected', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.selectWorld('forest');
		// Back from MainMenu — no explicit clear, character stays for re-pick
		expect(fc.selection.characterId).toBe('knight');
	});

	it('Back from CharacterSelect to Title: reset clears everything', () => {
		const fc = new FlowController();
		fc.selectCharacter('knight');
		fc.reset();
		expect(fc.selection.characterId).toBeNull();
		expect(fc.selection.phase).toBe('idle');
	});
});
