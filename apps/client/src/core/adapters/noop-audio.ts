import type { IAudioPlayer } from '../ports/audio.js';

/**
 * No-op audio adapter for MVP.
 * Satisfies the IAudioPlayer port with empty methods.
 * Replaced by a real Phaser audio adapter when sound is needed.
 */
export class NoopAudio implements IAudioPlayer {
	readonly isMuted: boolean = false;
	readonly currentMusicKey: string | null = null;

	playSfx(_key: string, _config?: { volume?: number; rate?: number }): void {}
	playMusic(_key: string, _config?: { loop?: boolean; volume?: number; fadeInMs?: number }): void {}
	stopMusic(_fadeOutMs?: number): void {}
	crossfadeMusic(_toKey: string, _durationMs?: number): void {}
	pauseMusic(): void {}
	resumeMusic(): void {}
	setMasterVolume(_volume: number): void {}
	setMusicVolume(_volume: number): void {}
	setSfxVolume(_volume: number): void {}
	mute(): void {}
	unmute(): void {}
	unlockAudioContext(): void {}
}
