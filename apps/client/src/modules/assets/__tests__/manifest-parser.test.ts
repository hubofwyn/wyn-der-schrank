import { describe, expect, it } from 'vitest';
import { parseManifest } from '../manifest-parser.js';

describe('parseManifest', () => {
	it('returns empty array for null input', () => {
		expect(parseManifest(null)).toEqual([]);
	});

	it('returns empty array for undefined input', () => {
		expect(parseManifest(undefined)).toEqual([]);
	});

	it('returns empty array for invalid schema', () => {
		expect(parseManifest({ bad: 'data' })).toEqual([]);
	});

	it('returns empty array for valid manifest with no assets', () => {
		expect(parseManifest({ version: '0.1.0', assets: [] })).toEqual([]);
	});

	it('returns typed asset entries from valid manifest', () => {
		const manifest = {
			version: '1.0.0',
			assets: [
				{
					key: 'player',
					type: 'spritesheet',
					url: 'sprites/player.png',
					frameWidth: 16,
					frameHeight: 16,
				},
				{ key: 'tileset', type: 'image', url: 'tilesets/dungeon.png' },
				{ key: 'bgm', type: 'audio', url: 'audio/music.mp3' },
			],
		};

		const result = parseManifest(manifest);
		expect(result).toHaveLength(3);
		expect(result[0]?.key).toBe('player');
		expect(result[0]?.type).toBe('spritesheet');
		expect(result[0]?.frameWidth).toBe(16);
		expect(result[1]?.type).toBe('image');
		expect(result[2]?.type).toBe('audio');
	});

	it('rejects manifest with invalid asset type', () => {
		const manifest = {
			version: '1.0.0',
			assets: [{ key: 'bad', type: 'unknown-type', url: 'bad.xyz' }],
		};

		expect(parseManifest(manifest)).toEqual([]);
	});
});
