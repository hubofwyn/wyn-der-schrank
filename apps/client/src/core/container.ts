import type { PlatformerConfig } from '@hub-of-wyn/shared';
import type { IMinigameLogic } from '../modules/minigame/minigame-logic.js';
import type { IAudioPlayer } from './ports/audio.js';
import type { IDiagnostics } from './ports/diagnostics.js';
import type { IGameClock } from './ports/engine.js';
import type { IInputProvider } from './ports/input.js';
import type { INetworkClient } from './ports/network.js';
import type { IBody, IPhysicsWorld } from './ports/physics.js';
import type { ISettingsManager } from './ports/settings.js';
import type { IStorageProvider } from './ports/storage.js';

/**
 * Service container — the SINGLE location where all dependencies are declared.
 *
 * RULES:
 * 1. Every service is created in main.ts and ONLY there.
 * 2. Modules receive dependencies via constructor parameters.
 * 3. No service may construct another service (that's main.ts's job).
 * 4. Adding a service = add to Container interface + createContainer factory in main.ts.
 */
export interface Container {
	// ── Infrastructure (Phaser adapters + services) ──
	readonly clock: IGameClock;
	readonly input: IInputProvider;
	readonly audio: IAudioPlayer;
	readonly physics: IPhysicsWorld;
	readonly network: INetworkClient;
	readonly storage: IStorageProvider;
	readonly settingsManager: ISettingsManager;
	readonly diagnostics: IDiagnostics;

	// ── Scoped Factories (per-scene lifecycle) ──
	// Optional until wired — TypeScript enforces callers check before use.
	readonly createPlatformerScope?: (levelId: string) => PlatformerScope;
	readonly createMinigameScope?: (minigameId: string, input: IInputProvider) => MinigameScope;
}

/**
 * Created when PlatformerScene starts, disposed when it shuts down.
 * Contains level-specific services that shouldn't outlive a level.
 */
export interface PlatformerScope {
	readonly levelId: string;
	readonly config: PlatformerConfig;
	readonly playerBody: IBody;
	dispose(): void;
}

/**
 * Created when MinigameScene starts, disposed when it ends.
 */
export interface MinigameScope {
	readonly minigameId: string;
	readonly logic: IMinigameLogic;
	dispose(): void;
}
