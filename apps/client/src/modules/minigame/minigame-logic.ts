import type { MinigameId, MinigamePhase, MinigameResult } from '@hub-of-wyn/shared';
import type { IDiagnostics } from '../../core/ports/diagnostics.js';
import type { IGameClock } from '../../core/ports/engine.js';
import type { IInputProvider } from '../../core/ports/input.js';
import type { MinigameHudState } from './minigame-hud-state.js';

export interface MinigameLogicDeps {
	readonly input: IInputProvider;
	readonly clock: IGameClock;
	readonly diagnostics: IDiagnostics;
}

export type MinigameFactory = (deps: MinigameLogicDeps) => IMinigameLogic;

export interface IMinigameLogic {
	readonly id: MinigameId;
	readonly phase: MinigamePhase;
	start(): void;
	update(deltaMs: number): void;
	hudSnapshot(): MinigameHudState;
	renderSnapshot(): unknown;
	getResult(): MinigameResult | null;
	dispose(): void;
}
