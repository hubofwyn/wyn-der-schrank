import type { z } from 'zod';
import type { AssetEntrySchema, AssetManifestSchema, AssetTypeSchema } from '../schema/assets.js';
import type {
	CharacterAbilitySchema,
	CharacterDefinitionSchema,
	CharacterIdSchema,
	CharacterStatsSchema,
} from '../schema/character.js';
import type {
	CollectibleDefinitionSchema,
	CollectibleInstanceSchema,
	CollectibleTypeSchema,
} from '../schema/collectible.js';
import type { EntityIdSchema, RangeSchema, RectSchema, Vec2Schema } from '../schema/common.js';
import type {
	EnemyBehaviorSchema,
	EnemyDefinitionSchema,
	EnemyInstanceSchema,
	EnemyTypeSchema,
} from '../schema/enemy.js';
import type { GameEventSchema } from '../schema/events.js';
import type {
	LevelIdSchema,
	LevelMetadataSchema,
	ObjectPlacementSchema,
	TileLayerRefSchema,
	WorldDefinitionSchema,
	WorldIdSchema,
} from '../schema/level.js';
import type {
	MinigameDefinitionSchema,
	MinigameIdSchema,
	MinigamePhaseSchema,
	MinigameResultSchema,
	MinigameStateSchema,
} from '../schema/minigame.js';
import type {
	BodyDimensionsSchema,
	FastFallConfigSchema,
	JumpConfigSchema,
	MovementConfigSchema,
	PlatformerConfigSchema,
} from '../schema/physics-config.js';
import type { FacingSchema, PlayerSchema, PlayerStateSchema } from '../schema/player.js';
import type { PlayerProfileSchema, SessionStateSchema } from '../schema/progression.js';
import type {
	LeaderboardEntrySchema,
	LevelResultSchema,
	StarRatingSchema,
} from '../schema/scoring.js';
import type { SettingsSchema } from '../schema/settings.js';
import type { SyncStateSchema } from '../schema/sync.js';

// Common
export type Vec2 = z.infer<typeof Vec2Schema>;
export type Rect = z.infer<typeof RectSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type EntityId = z.infer<typeof EntityIdSchema>;

// Character
export type CharacterId = z.infer<typeof CharacterIdSchema>;
export type CharacterStats = z.infer<typeof CharacterStatsSchema>;
export type CharacterAbility = z.infer<typeof CharacterAbilitySchema>;
export type CharacterDefinition = z.infer<typeof CharacterDefinitionSchema>;

// Physics Config
export type PlatformerConfig = z.infer<typeof PlatformerConfigSchema>;
export type MovementConfig = z.infer<typeof MovementConfigSchema>;
export type JumpConfig = z.infer<typeof JumpConfigSchema>;
export type FastFallConfig = z.infer<typeof FastFallConfigSchema>;
export type BodyDimensions = z.infer<typeof BodyDimensionsSchema>;

// Player
export type Facing = z.infer<typeof FacingSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type Player = z.infer<typeof PlayerSchema>;

// Enemy
export type EnemyType = z.infer<typeof EnemyTypeSchema>;
export type EnemyBehavior = z.infer<typeof EnemyBehaviorSchema>;
export type EnemyDefinition = z.infer<typeof EnemyDefinitionSchema>;
export type EnemyInstance = z.infer<typeof EnemyInstanceSchema>;

// Level
export type WorldId = z.infer<typeof WorldIdSchema>;
export type LevelId = z.infer<typeof LevelIdSchema>;
export type TileLayerRef = z.infer<typeof TileLayerRefSchema>;
export type ObjectPlacement = z.infer<typeof ObjectPlacementSchema>;
export type LevelMetadata = z.infer<typeof LevelMetadataSchema>;
export type WorldDefinition = z.infer<typeof WorldDefinitionSchema>;

// Collectible
export type CollectibleType = z.infer<typeof CollectibleTypeSchema>;
export type CollectibleDefinition = z.infer<typeof CollectibleDefinitionSchema>;
export type CollectibleInstance = z.infer<typeof CollectibleInstanceSchema>;

// Minigame
export type MinigameId = z.infer<typeof MinigameIdSchema>;
export type MinigamePhase = z.infer<typeof MinigamePhaseSchema>;
export type MinigameState = z.infer<typeof MinigameStateSchema>;
export type MinigameResult = z.infer<typeof MinigameResultSchema>;
export type MinigameDefinition = z.infer<typeof MinigameDefinitionSchema>;

// Scoring
export type StarRating = z.infer<typeof StarRatingSchema>;
export type LevelResult = z.infer<typeof LevelResultSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// Progression
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;

// Settings
export type Settings = z.infer<typeof SettingsSchema>;

// Events
export type GameEvent = z.infer<typeof GameEventSchema>;

// Sync
export type SyncState = z.infer<typeof SyncStateSchema>;

// Assets
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetEntry = z.infer<typeof AssetEntrySchema>;
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
