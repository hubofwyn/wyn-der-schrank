export interface IAudioPlayer {
	playSfx(key: string, config?: { volume?: number; rate?: number }): void;
	playMusic(key: string, config?: { loop?: boolean; volume?: number; fadeInMs?: number }): void;
	stopMusic(fadeOutMs?: number): void;
	crossfadeMusic(toKey: string, durationMs?: number): void;
	pauseMusic(): void;
	resumeMusic(): void;
	setMasterVolume(volume: number): void;
	setMusicVolume(volume: number): void;
	setSfxVolume(volume: number): void;
	mute(): void;
	unmute(): void;
	readonly isMuted: boolean;
	readonly currentMusicKey: string | null;
	unlockAudioContext(): void;
}
