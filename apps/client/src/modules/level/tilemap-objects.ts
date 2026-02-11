export interface TilemapObject {
	readonly type: string;
	readonly x?: number;
	readonly y?: number;
	readonly name?: string;
	readonly properties?: ReadonlyArray<{ name: string; type: string; value: unknown }>;
}

const DEFAULT_ENEMY_TYPE = 'skeleton';

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
): ReadonlyArray<{ x: number; y: number; enemyType: string }> {
	const enemies: Array<{ x: number; y: number; enemyType: string }> = [];

	for (const obj of objects) {
		if (obj.type !== 'enemy') continue;
		if (!hasCoordinates(obj)) continue;

		const enemyType = getStringProperty(obj.properties, 'enemyType') ?? DEFAULT_ENEMY_TYPE;
		enemies.push({ x: obj.x, y: obj.y, enemyType });
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
