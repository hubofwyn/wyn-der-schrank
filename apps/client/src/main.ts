// Wyn der Schrank — Composition Root
// All services are wired here and ONLY here.
// See core/container.ts for the Container interface.

// Side-effect import: registers `globalThis.Phaser` so all scenes and
// adapters can reference the Phaser namespace without explicit imports.
import 'phaser';

import { ConsoleDiagnostics } from './core/adapters/console-diagnostics.js';
import { LocalStorageAdapter } from './core/adapters/local-storage-adapter.js';
import { NoopInput } from './core/adapters/noop-input.js';
import { NoopNetwork } from './core/adapters/noop-network.js';
import { NoopPhysics } from './core/adapters/noop-physics.js';
import { PhaserAudio } from './core/adapters/phaser-audio.js';
import { PhaserClock } from './core/adapters/phaser-clock.js';
import type { Container, MinigameScope } from './core/container.js';
import type { IInputProvider } from './core/ports/input.js';
import { CharacterCatalog } from './modules/character/character-catalog.js';
import { WorldCatalog } from './modules/level/world-catalog.js';
import { CoinCatchLogic } from './modules/minigame/games/coin-catch/coin-catch-logic.js';
import { ShakeRushLogic } from './modules/minigame/games/shake-rush/shake-rush-logic.js';
import { MinigameManager } from './modules/minigame/minigame-manager.js';
import { MinigameRegistry } from './modules/minigame/minigame-registry.js';
import { FlowController } from './modules/navigation/flow-controller.js';
import { SessionSave } from './modules/progression/session-save.js';
import { SettingsManager } from './modules/settings/settings-manager.js';
import { BootScene } from './scenes/boot-scene.js';
import { CharacterSelectScene } from './scenes/character-select-scene.js';
import { GameOverScene } from './scenes/game-over-scene.js';
import { HudScene } from './scenes/hud-scene.js';
import { LevelCompleteScene } from './scenes/level-complete-scene.js';
import { LevelSelectScene } from './scenes/level-select-scene.js';
import { MainMenuScene } from './scenes/main-menu-scene.js';
import { MinigameHudScene } from './scenes/minigame-hud-scene.js';
import { MinigameScene } from './scenes/minigame-scene.js';
import { PauseScene } from './scenes/pause-scene.js';
import { PlatformerScene } from './scenes/platformer-scene.js';
import { PreloadScene } from './scenes/preload-scene.js';
import { SettingsScene } from './scenes/settings-scene.js';
import { TitleScene } from './scenes/title-scene.js';
import { WorldSelectScene } from './scenes/world-select-scene.js';

/**
 * Build the DI container with all infrastructure services.
 *
 * Scene-scoped adapters (input, physics body) are created per-scene
 * in their create() methods. The root container holds noop instances
 * for those ports — they satisfy the interface without real behavior.
 */
function createContainer(): Container {
	const clock = new PhaserClock();
	const input = new NoopInput();
	const audio = new PhaserAudio();
	const physics = new NoopPhysics();
	const network = new NoopNetwork();
	const storage = new LocalStorageAdapter();
	const settingsManager = new SettingsManager(storage);
	const sessionSave = new SessionSave(storage);
	const diagnostics = new ConsoleDiagnostics(
		clock,
		settingsManager,
		settingsManager.current.diagnostics.ringBufferSize,
	);

	const characterCatalog = new CharacterCatalog();
	const worldCatalog = new WorldCatalog();
	const flowController = new FlowController();

	const registry = new MinigameRegistry();
	registry.register('shake-rush', (deps) => new ShakeRushLogic(deps));
	registry.register('coin-catch', (deps) => new CoinCatchLogic(deps));
	const manager = new MinigameManager(registry, diagnostics);

	function createMinigameScope(minigameId: string, sceneInput: IInputProvider): MinigameScope {
		const logic = manager.createLogic(minigameId as import('@hub-of-wyn/shared').MinigameId, {
			input: sceneInput,
			clock,
			diagnostics,
			rng: Math.random,
		});
		return {
			minigameId,
			logic,
			dispose() {
				manager.disposeActive();
			},
		};
	}

	return {
		clock,
		input,
		audio,
		physics,
		network,
		storage,
		settingsManager,
		sessionSave,
		diagnostics,
		characterCatalog,
		worldCatalog,
		flowController,
		createMinigameScope,
	};
}

const game = new Phaser.Game({
	type: Phaser.AUTO,
	width: 1280,
	height: 720,
	parent: document.body,
	pixelArt: true,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { x: 0, y: 800 },
			fixedStep: true,
			fps: 60,
			debug: false,
		},
	},
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [
		BootScene,
		PreloadScene,
		TitleScene,
		CharacterSelectScene,
		MainMenuScene,
		WorldSelectScene,
		LevelSelectScene,
		PlatformerScene,
		HudScene,
		PauseScene,
		SettingsScene,
		LevelCompleteScene,
		GameOverScene,
		MinigameScene,
		MinigameHudScene,
	],
});

const container = createContainer();
game.registry.set('container', container);

// Bind PhaserAudio to the game's sound manager now that the game is created.
// Apply persisted settings (volumes + mute) immediately.
(container.audio as PhaserAudio).bind(game);
(container.audio as PhaserAudio).unlockAudioContext();

const audioSettings = container.settingsManager.current.audio;
container.audio.setMasterVolume(audioSettings.masterVolume);
container.audio.setMusicVolume(audioSettings.musicVolume);
container.audio.setSfxVolume(audioSettings.sfxVolume);
if (audioSettings.muted) {
	container.audio.mute();
}
