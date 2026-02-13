import type { MinigameId } from '@hub-of-wyn/shared';
import type { IDiagnostics } from '../../core/ports/diagnostics.js';
import type { IMinigameLogic, MinigameLogicDeps } from './minigame-logic.js';
import type { MinigameRegistry } from './minigame-registry.js';

const NOOP_DIAGNOSTICS: IDiagnostics = {
	emit() {},
	isEnabled() {
		return false;
	},
	query() {
		return [];
	},
};

export class MinigameManager {
	private activeLogic: IMinigameLogic | null = null;
	private readonly registry: MinigameRegistry;
	private readonly diagnostics: IDiagnostics;

	constructor(registry: MinigameRegistry, diagnostics?: IDiagnostics) {
		this.registry = registry;
		this.diagnostics = diagnostics ?? NOOP_DIAGNOSTICS;
	}

	get active(): IMinigameLogic | null {
		return this.activeLogic;
	}

	createLogic(id: MinigameId, deps: MinigameLogicDeps): IMinigameLogic {
		if (this.activeLogic) {
			this.disposeActive();
		}
		const logic = this.registry.create(id, deps);
		this.activeLogic = logic;
		this.diagnostics.emit('minigame', 'state', 'created', { minigameId: id });
		return logic;
	}

	disposeActive(): void {
		if (this.activeLogic) {
			const id = this.activeLogic.id;
			this.activeLogic.dispose();
			this.activeLogic = null;
			this.diagnostics.emit('minigame', 'state', 'disposed', { minigameId: id });
		}
	}
}
