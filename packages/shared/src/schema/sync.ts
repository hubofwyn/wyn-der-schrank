import { z } from 'zod';
import { CollectibleInstanceSchema } from './collectible.js';
import { EnemyInstanceSchema } from './enemy.js';
import { PlayerSchema } from './player.js';

export const SyncStateSchema = z.object({
	tick: z.number().int(),
	timestamp: z.number(),
	players: z.array(PlayerSchema),
	enemies: z.array(EnemyInstanceSchema),
	collectibles: z.array(CollectibleInstanceSchema),
});
