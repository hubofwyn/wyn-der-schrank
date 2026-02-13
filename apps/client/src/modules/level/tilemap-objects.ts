import type { EnemyType } from '@hub-of-wyn/shared';
import { EnemyTypeSchema } from '@hub-of-wyn/shared';

export interface TilemapObject {
	readonly type: string;
	readonly x?: number;
	readonly y?: number;
	readonly name?: string;
	readonly properties?: ReadonlyArray<{ name: string; type: string; value: unknown }>;
}

const DEFAULT_ENEMY_TYPE: EnemyType = 'skeleton';
const DEFAULT_PATROL_RANGE = 100;

const hasCoordinates = (obj: TilemapObject): obj is TilemapObject & { x: number; y: number } =>
	obj.x != null && obj.y != null;

const getPropertyValue = (
	properties: TilemapObject['properties'],
	name: string,
): unknown | undefined => {
	if (!properties) return undefined;
	return properties.find((property) => property.name === name)?.value;
};

const getStringProperty = (
	properties: TilemapObject['properties'],
	name: string,
): string | undefined => {
	const value = getPropertyValue(properties, name);
	return typeof value === 'string' ? value : undefined;
};

const getNumberProperty = (
	properties: TilemapObject['properties'],
	name: string,
): number | undefined => {
	const value = getPropertyValue(properties, name);
	return typeof value === 'number' ? value : undefined;
};

export function extractSpawn(objects: TilemapObject[]): { x: number; y: number } | null {
	for (const obj of objects) {
		if (obj.type !== 'spawn') continue;
		if (!hasCoordinates(obj)) continue;
		return { x: obj.x, y: obj.y };
	}

	return null;
}

export function extractEnemies(
	objects: TilemapObject[],
): ReadonlyArray<{ x: number; y: number; enemyType: EnemyType; patrolRange: number }> {
	const enemies: Array<{ x: number; y: number; enemyType: EnemyType; patrolRange: number }> = [];

	for (const obj of objects) {
		if (obj.type !== 'enemy') continue;
		if (!hasCoordinates(obj)) continue;

		const rawType = getStringProperty(obj.properties, 'enemyType');
		const parsed = rawType ? EnemyTypeSchema.safeParse(rawType) : { success: false as const };
		const enemyType: EnemyType = parsed.success ? parsed.data : DEFAULT_ENEMY_TYPE;
		const patrolRange = getNumberProperty(obj.properties, 'patrolRange') ?? DEFAULT_PATROL_RANGE;
		enemies.push({ x: obj.x, y: obj.y, enemyType, patrolRange });
	}

	return enemies;
}

export function extractCollectibles(
	objects: TilemapObject[],
): ReadonlyArray<{ x: number; y: number }> {
	const collectibles: Array<{ x: number; y: number }> = [];

	for (const obj of objects) {
		if (obj.type !== 'collectible') continue;
		if (!hasCoordinates(obj)) continue;

		collectibles.push({ x: obj.x, y: obj.y });
	}

	return collectibles;
}

export function extractExit(objects: TilemapObject[]): { x: number; y: number } | null {
	for (const obj of objects) {
		if (obj.type !== 'exit') continue;
		if (!hasCoordinates(obj)) continue;
		return { x: obj.x, y: obj.y };
	}

	return null;
}
