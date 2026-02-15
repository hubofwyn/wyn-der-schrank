import type { IAudioPlayer } from '../ports/audio.js';

/**
 * PhaserAudio adapter — implements IAudioPlayer using Phaser 4's native
 * WebAudio/HTML5Audio sound manager (game.sound).
 *
 * LIFECYCLE:
 * 1. Construct with no args (game not yet available).
 * 2. Call `bind(game)` once after `new Phaser.Game()` resolves.
 * 3. All IAudioPlayer methods are safe to call before bind — they no-op silently.
 *
 * VOLUME MODEL:
 * Phaser has a single global `sound.volume`. We layer music/sfx volumes on top:
 *   effective music volume  = masterVolume × musicVolume
 *   effective sfx volume    = masterVolume × sfxVolume
 * Each sound instance gets its per-play volume scaled accordingly.
 */
export class PhaserAudio implements IAudioPlayer {
	private sound: Phaser.Sound.BaseSoundManager | null = null;
	private _isMuted = false;
	private _currentMusicKey: string | null = null;
	private currentMusic: Phaser.Sound.BaseSound | null = null;

	private masterVol = 0.8;
	private musicVol = 0.7;
	private sfxVol = 1.0;

	get isMuted(): boolean {
		return this._isMuted;
	}

	get currentMusicKey(): string | null {
		return this._currentMusicKey;
	}

	/**
	 * Bind to the Phaser game's sound manager.
	 * Must be called after `new Phaser.Game()` has initialized.
	 */
	bind(game: Phaser.Game): void {
		this.sound = game.sound;
	}

	playSfx(key: string, config?: { volume?: number; rate?: number }): void {
		if (!this.sound) return;

		const vol = (config?.volume ?? 1) * this.masterVol * this.sfxVol;
		const soundConfig: Phaser.Types.Sound.SoundConfig = {
			volume: this._isMuted ? 0 : vol,
		};
		if (config?.rate !== undefined) {
			soundConfig.rate = config.rate;
		}
		this.sound.play(key, soundConfig);
	}

	playMusic(key: string, config?: { loop?: boolean; volume?: number; fadeInMs?: number }): void {
		if (!this.sound) return;

		// Already playing this track — do nothing.
		if (this._currentMusicKey === key && this.currentMusic?.isPlaying) {
			return;
		}

		const vol = (config?.volume ?? 1) * this.masterVol * this.musicVol;
		const loop = config?.loop ?? true;
		const fadeInMs = config?.fadeInMs ?? 0;

		// If another track is currently playing and we have a fade duration,
		// crossfade: fade out the old track while fading in the new one.
		// This prevents jarring music cuts on scene transitions.
		if (this.currentMusic?.isPlaying && fadeInMs > 0) {
			const oldMusic = this.currentMusic;
			const oldVol = this.getEffectiveMusicVolume();
			this.fadeSound(oldMusic, oldVol, 0, fadeInMs, () => {
				oldMusic.stop();
				oldMusic.destroy();
			});
			this.currentMusic = null;
		} else {
			this.stopCurrentMusic();
		}

		const music = this.sound.add(key, {
			loop,
			volume: fadeInMs > 0 ? 0 : this._isMuted ? 0 : vol,
		});

		music.play();

		if (fadeInMs > 0 && !this._isMuted) {
			this.fadeSound(music, 0, vol, fadeInMs);
		}

		this.currentMusic = music;
		this._currentMusicKey = key;
	}

	stopMusic(fadeOutMs?: number): void {
		if (!this.currentMusic) return;

		if (fadeOutMs && fadeOutMs > 0 && this.currentMusic.isPlaying) {
			const music = this.currentMusic;
			const startVol = this.getEffectiveMusicVolume();
			this.fadeSound(music, startVol, 0, fadeOutMs, () => {
				music.stop();
				music.destroy();
			});
		} else {
			this.stopCurrentMusic();
		}

		this._currentMusicKey = null;
		this.currentMusic = null;
	}

	crossfadeMusic(toKey: string, durationMs?: number): void {
		if (!this.sound) return;

		const duration = durationMs ?? 1000;
		const halfDuration = duration / 2;

		// Fade out current, then fade in new.
		if (this.currentMusic?.isPlaying) {
			const oldMusic = this.currentMusic;
			const oldVol = this.getEffectiveMusicVolume();
			this.fadeSound(oldMusic, oldVol, 0, halfDuration, () => {
				oldMusic.stop();
				oldMusic.destroy();
			});
		}

		// Start new track with fade-in after half the crossfade duration.
		this._currentMusicKey = null;
		this.currentMusic = null;

		// Slight delay so fade-out is underway before fade-in starts.
		setTimeout(() => {
			this.playMusic(toKey, { fadeInMs: halfDuration });
		}, halfDuration * 0.5);
	}

	pauseMusic(): void {
		if (this.currentMusic?.isPlaying) {
			this.currentMusic.pause();
		}
	}

	resumeMusic(): void {
		if (this.currentMusic?.isPaused) {
			this.currentMusic.resume();
		}
	}

	setMasterVolume(volume: number): void {
		this.masterVol = Math.max(0, Math.min(1, volume));
		this.applyMusicVolume();
	}

	setMusicVolume(volume: number): void {
		this.musicVol = Math.max(0, Math.min(1, volume));
		this.applyMusicVolume();
	}

	setSfxVolume(volume: number): void {
		this.sfxVol = Math.max(0, Math.min(1, volume));
	}

	mute(): void {
		this._isMuted = true;
		if (this.sound) {
			this.sound.mute = true;
		}
	}

	unmute(): void {
		this._isMuted = false;
		if (this.sound) {
			this.sound.mute = false;
		}
	}

	unlockAudioContext(): void {
		// Phaser 4 handles audio unlock automatically via BaseSoundManager.unlock().
		// The sound manager listens for the first user gesture and resumes the
		// AudioContext. This method exists so callers can explicitly request it,
		// but in practice Phaser's built-in handling is sufficient.
		//
		// If the sound manager is locked, touching/clicking anywhere will unlock it.
		// We can listen for the 'unlocked' event if we need to react.
		if (!this.sound) return;

		if (this.sound.locked) {
			this.sound.once('unlocked', () => {
				// Re-apply volumes after unlock in case they were set before audio was ready.
				this.applyMusicVolume();
			});
		}
	}

	// ── Private helpers ──

	private getEffectiveMusicVolume(): number {
		return this.masterVol * this.musicVol;
	}

	private applyMusicVolume(): void {
		if (!this.currentMusic || !this.currentMusic.isPlaying) return;

		// WebAudioSound and HTML5AudioSound both expose a writable `volume` property,
		// but BaseSound in the type declarations does not. Cast to the concrete type
		// that Phaser 4 actually provides at runtime.
		const vol = this._isMuted ? 0 : this.getEffectiveMusicVolume();
		(this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(vol);
	}

	private stopCurrentMusic(): void {
		if (this.currentMusic) {
			if (this.currentMusic.isPlaying || this.currentMusic.isPaused) {
				this.currentMusic.stop();
			}
			this.currentMusic.destroy();
			this.currentMusic = null;
		}
	}

	/**
	 * Manually tween a sound's volume over time.
	 * Phaser 4 sounds have a mutable `volume` property.
	 */
	private fadeSound(
		sound: Phaser.Sound.BaseSound,
		from: number,
		to: number,
		durationMs: number,
		onComplete?: () => void,
	): void {
		const steps = Math.max(1, Math.floor(durationMs / 16)); // ~60fps
		const stepMs = durationMs / steps;
		const delta = (to - from) / steps;
		let current = from;
		let step = 0;

		const snd = sound as Phaser.Sound.WebAudioSound;

		const interval = setInterval(() => {
			step++;
			current += delta;
			snd.setVolume(Math.max(0, Math.min(1, current)));

			if (step >= steps) {
				clearInterval(interval);
				snd.setVolume(Math.max(0, Math.min(1, to)));
				onComplete?.();
			}
		}, stepMs);
	}
}
