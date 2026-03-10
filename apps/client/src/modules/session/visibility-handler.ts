/**
 * Page visibility handler — pure TS, zero DOM.
 *
 * Pauses/resumes a game when the page becomes hidden/visible.
 * DOM access is injected for testability.
 */

export interface VisibilityHandlerDeps {
	/** Subscribe to visibility changes. Returns unsubscribe function. */
	onVisibilityChange: (callback: (visible: boolean) => void) => () => void;
	/** Called when the page becomes hidden. */
	onHidden: () => void;
	/** Called when the page becomes visible. */
	onVisible: () => void;
}

export class VisibilityHandler {
	private readonly _unsub: () => void;

	constructor(deps: VisibilityHandlerDeps) {
		this._unsub = deps.onVisibilityChange((visible) => {
			if (visible) {
				deps.onVisible();
			} else {
				deps.onHidden();
			}
		});
	}

	destroy(): void {
		this._unsub();
	}
}
