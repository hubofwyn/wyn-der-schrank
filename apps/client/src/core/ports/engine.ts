export interface IGameClock {
	readonly now: number;
	readonly delta: number;
	readonly frame: number;
	readonly elapsed: number;
}

export interface IRendererStats {
	readonly type: 'WEBGL' | 'CANVAS';
	readonly fps: number;
	readonly drawCalls: number;
}
