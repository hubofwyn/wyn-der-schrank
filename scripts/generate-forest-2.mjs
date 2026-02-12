#!/usr/bin/env node
/**
 * Generates forest-2.json — a Tiled-format tilemap for a platformer level.
 *
 * Layout (150 wide x 40 tall, 16x16 tiles):
 *   Rows 35-39  : solid ground (all 1s)
 *   Row  34     : ground with 3 pit gaps (cols 30-33, 60-63, 90-93)
 *   Row  28     : floating platforms (cols 20-35, 50-65, 80-95, 110-125)
 *   Row  22     : smaller platforms (cols 25-32, 55-62, 85-92, 115-122)
 *   Row  16     : high platforms (cols 30-38, 65-73, 100-108)
 *   Everything else: 0 (empty)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 150;
const HEIGHT = 40;
const TILE_W = 16;
const TILE_H = 16;

// ---------------------------------------------------------------------------
// Build ground-layer data (flat array, 6000 entries)
// ---------------------------------------------------------------------------
const data = new Array(WIDTH * HEIGHT).fill(0);

function setTile(row, col, id) {
	data[row * WIDTH + col] = id;
}

function fillRow(row, colStart, colEnd, id) {
	for (let c = colStart; c <= colEnd; c++) {
		setTile(row, c, id);
	}
}

// Rows 35-39: solid ground
for (let r = 35; r <= 39; r++) {
	fillRow(r, 0, WIDTH - 1, 1);
}

// Row 34: ground with pit gaps at 30-33, 60-63, 90-93
for (let c = 0; c < WIDTH; c++) {
	const inGap = (c >= 30 && c <= 33) || (c >= 60 && c <= 63) || (c >= 90 && c <= 93);
	if (!inGap) setTile(34, c, 1);
}

// Row 28: floating platforms
for (const [s, e] of [
	[20, 35],
	[50, 65],
	[80, 95],
	[110, 125],
]) {
	fillRow(28, s, e, 1);
}

// Row 22: smaller floating platforms
for (const [s, e] of [
	[25, 32],
	[55, 62],
	[85, 92],
	[115, 122],
]) {
	fillRow(22, s, e, 1);
}

// Row 16: high platforms
for (const [s, e] of [
	[30, 38],
	[65, 73],
	[100, 108],
]) {
	fillRow(16, s, e, 1);
}

// ---------------------------------------------------------------------------
// Objects layer
// ---------------------------------------------------------------------------
let nextId = 1;

function obj(name, type, x, y, extraProps) {
	const o = {
		id: nextId++,
		name,
		type,
		x,
		y,
		width: 0,
		height: 0,
		rotation: 0,
		visible: true,
	};
	if (extraProps) {
		o.properties = Object.entries(extraProps).map(([pName, value]) => ({
			name: pName,
			type: 'string',
			value,
		}));
	}
	return o;
}

const objects = [];

// Player spawn
objects.push(obj('PlayerSpawn', 'spawn', 50, 520));

// 10 coins scattered across the level at interesting positions
const coinPositions = [
	// Ground-level coins near pits (tempting)
	{ x: 464, y: 528 }, // col 29, just before first pit
	{ x: 544, y: 528 }, // col 34, just after first pit
	// Floating platform coins (row 28 -> y = 28*16 = 448, coins above at ~432)
	{ x: 400, y: 432 }, // above platform 1
	{ x: 880, y: 432 }, // above platform 2
	{ x: 1360, y: 432 }, // above platform 3
	{ x: 1840, y: 432 }, // above platform 4
	// High platform coins (row 22 -> y=352, coins above at ~336)
	{ x: 456, y: 336 }, // above smaller platform 1
	{ x: 936, y: 336 }, // above smaller platform 2
	// Top-tier coins (row 16 -> y=256, coins above at ~240)
	{ x: 544, y: 240 }, // above high platform 1
	{ x: 1680, y: 240 }, // above high platform 3
];

for (let i = 0; i < coinPositions.length; i++) {
	const { x, y } = coinPositions[i];
	objects.push(obj(`Coin${i + 1}`, 'collectible', x, y));
}

// 3 skeleton enemies on ground and platforms
const enemyPositions = [
	{ x: 720, y: 528 }, // ground between pits 1 and 2
	{ x: 1200, y: 432 }, // on floating platform (row 28)
	{ x: 1040, y: 240 }, // on high platform (row 16)
];

for (let i = 0; i < enemyPositions.length; i++) {
	const { x, y } = enemyPositions[i];
	objects.push(obj(`Enemy${i + 1}`, 'enemy', x, y, { enemyType: 'skeleton' }));
}

// Level exit
objects.push(obj('LevelExit', 'exit', 2300, 520));

const nextObjectId = nextId;

// ---------------------------------------------------------------------------
// Assemble the Tiled JSON
// ---------------------------------------------------------------------------
const tilemap = {
	compressionlevel: -1,
	height: HEIGHT,
	infinite: false,
	layers: [
		{
			data,
			height: HEIGHT,
			id: 1,
			name: 'Ground',
			opacity: 1,
			type: 'tilelayer',
			visible: true,
			width: WIDTH,
			x: 0,
			y: 0,
		},
		{
			draworder: 'topdown',
			id: 2,
			name: 'Objects',
			objects,
			opacity: 1,
			type: 'objectgroup',
			visible: true,
			x: 0,
			y: 0,
		},
	],
	nextlayerid: 3,
	nextobjectid: nextObjectId,
	orientation: 'orthogonal',
	renderorder: 'right-down',
	tiledversion: '1.11.2',
	tileheight: TILE_H,
	tilesets: [
		{
			columns: 10,
			firstgid: 1,
			image: '../../tilesets/dungeon-tileset.png',
			imageheight: 160,
			imagewidth: 160,
			margin: 0,
			name: 'dungeon-tileset',
			spacing: 0,
			tilecount: 100,
			tileheight: TILE_H,
			tilewidth: TILE_W,
		},
	],
	tilewidth: TILE_W,
	type: 'map',
	version: '1.10',
	width: WIDTH,
};

// ---------------------------------------------------------------------------
// Write to disk
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../apps/client/public/assets/tilemaps/levels/forest-2.json');

mkdirSync(dirname(outPath), { recursive: true });

const json = JSON.stringify(tilemap, null, 2);
writeFileSync(outPath, json + '\n', 'utf-8');

// Quick sanity checks
const parsed = JSON.parse(json);
const groundData = parsed.layers[0].data;
console.log('Wrote:', outPath);
console.log('JSON size:', json.length, 'bytes');
console.log('Ground data length:', groundData.length, '(expected 6000)');
console.log('Solid tiles:', groundData.filter((t) => t === 1).length);
console.log('Objects:', parsed.layers[1].objects.length, '(expected 15)');
console.log('nextobjectid:', parsed.nextobjectid);
console.log('Valid JSON: OK');
