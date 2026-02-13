import type { MinigameId } from '@hub-of-wyn/shared';
import type { IMinigameLogic, MinigameFactory, MinigameLogicDeps } from './minigame-logic.js';

export class MinigameRegistry {
	private readonly factories = new Map<MinigameId, MinigameFactory>();

	register(id: MinigameId, factory: MinigameFactory): void {
		if (this.factories.has(id)) {
			throw new Error(`Minigame '${id}' is already registered`);
		}
		this.factories.set(id, factory);
	}

	create(id: MinigameId, deps: MinigameLogicDeps): IMinigameLogic {
		const factory = this.factories.get(id);
		if (!factory) {
			throw new Error(`Unknown minigame: '${id}'`);
		}
		return factory(deps);
	}

	has(id: MinigameId): boolean {
		return this.factories.has(id);
	}

	get registeredIds(): readonly MinigameId[] {
		return [...this.factories.keys()];
	}
}
