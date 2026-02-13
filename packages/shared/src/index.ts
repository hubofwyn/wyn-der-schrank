// Schemas

export {
	AssetEntrySchema,
	AssetManifestSchema,
	AssetTypeSchema,
	AudioMetaSchema,
	SpritesheetMetaSchema,
	TilemapMetaSchema,
} from './schema/assets.js';
export {
	CharacterAbilitySchema,
	CharacterDefinitionSchema,
	CharacterIdSchema,
	CharacterStatsSchema,
} from './schema/character.js';
export {
	CollectibleDefinitionSchema,
	CollectibleInstanceSchema,
	CollectibleTypeSchema,
} from './schema/collectible.js';
export { EntityIdSchema, RangeSchema, RectSchema, Vec2Schema } from './schema/common.js';
export {
	DiagnosticChannelConfigSchema,
	DiagnosticChannelSchema,
	DiagnosticLevelSchema,
	DiagnosticsConfigSchema,
} from './schema/diagnostics.js';
export {
	EnemyBehaviorSchema,
	EnemyDefinitionSchema,
	EnemyInstanceSchema,
	EnemyTypeSchema,
} from './schema/enemy.js';
export { GameEventSchema } from './schema/events.js';
export {
	LevelIdSchema,
	LevelMetadataSchema,
	ObjectPlacementSchema,
	TileLayerRefSchema,
	WorldDefinitionSchema,
	WorldIdSchema,
} from './schema/level.js';
export {
	MinigameDefinitionSchema,
	MinigameIdSchema,
	MinigamePhaseSchema,
	MinigameResultSchema,
	MinigameStateSchema,
} from './schema/minigame.js';
export {
	BodyDimensionsSchema,
	FastFallConfigSchema,
	JumpConfigSchema,
	MovementConfigSchema,
	PlatformerConfigSchema,
} from './schema/physics-config.js';
export { FacingSchema, PlayerSchema, PlayerStateSchema } from './schema/player.js';
export { PlayerProfileSchema, SessionStateSchema } from './schema/progression.js';
export { LeaderboardEntrySchema, LevelResultSchema, StarRatingSchema } from './schema/scoring.js';
export { SettingsSchema } from './schema/settings.js';
export { SyncStateSchema } from './schema/sync.js';

// Types (re-exports of z.infer<>)
export type {
	AssetEntry,
	AssetManifest,
	AssetType,
	AudioMeta,
	BodyDimensions,
	CharacterAbility,
	CharacterDefinition,
	CharacterId,
	CharacterStats,
	CollectibleDefinition,
	CollectibleInstance,
	CollectibleType,
	DiagnosticChannel,
	DiagnosticChannelConfig,
	DiagnosticLevel,
	DiagnosticsConfig,
	EnemyBehavior,
	EnemyDefinition,
	EnemyInstance,
	EnemyType,
	EntityId,
	Facing,
	FastFallConfig,
	GameEvent,
	JumpConfig,
	LeaderboardEntry,
	LevelId,
	LevelMetadata,
	LevelResult,
	MinigameDefinition,
	MinigameId,
	MinigamePhase,
	MinigameResult,
	MinigameState,
	MovementConfig,
	ObjectPlacement,
	PlatformerConfig,
	Player,
	PlayerProfile,
	PlayerState,
	Range,
	Rect,
	SessionState,
	Settings,
	SpritesheetMeta,
	StarRating,
	SyncState,
	TileLayerRef,
	TilemapMeta,
	Vec2,
	WorldDefinition,
	WorldId,
} from './types/index.js';
