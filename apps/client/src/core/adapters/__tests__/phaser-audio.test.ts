import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhaserAudio } from '../phaser-audio.js';

/**
 * Minimal mock of Phaser.Sound.BaseSound with the properties PhaserAudio
 * reads/writes at runtime: isPlaying, isPaused, play, stop, pause, resume,
 * destroy, and setVolume (available on WebAudioSound).
 */
function createMockSound(key: string) {
	return {
		key,
		isPlaying: false,
		isPaused: false,
		play: vi.fn(function (this: ReturnType<typeof createMockSound>) {
			this.isPlaying = true;
			this.isPaused = false;
		}),
		stop: vi.fn(function (this: ReturnType<typeof createMockSound>) {
			this.isPlaying = false;
			this.isPaused = false;
		}),
		pause: vi.fn(function (this: ReturnType<typeof createMockSound>) {
			if (this.isPlaying) {
				this.isPlaying = false;
				this.isPaused = true;
			}
		}),
		resume: vi.fn(function (this: ReturnType<typeof createMockSound>) {
			if (this.isPaused) {
				this.isPaused = false;
				this.isPlaying = true;
			}
		}),
		destroy: vi.fn(),
		setVolume: vi.fn(),
		once: vi.fn(),
	};
}

type MockSound = ReturnType<typeof createMockSound>;

/**
 * Minimal mock of Phaser.Sound.BaseSoundManager.
 * Tracks calls to play() and add() and returns mock sound instances.
 */
function createMockSoundManager() {
	const sounds: MockSound[] = [];

	return {
		mute: false,
		locked: false,
		play: vi.fn((_key: string, _config?: Record<string, unknown>) => {}),
		add: vi.fn((key: string, _config?: Record<string, unknown>): MockSound => {
			const sound = createMockSound(key);
			sounds.push(sound);
			return sound;
		}),
		once: vi.fn(),
		/** Test helper: get the most recently created sound. */
		get _lastSound(): MockSound | undefined {
			return sounds.at(-1);
		},
		/** Test helper: get all created sounds. */
		get _sounds(): MockSound[] {
			return sounds;
		},
	};
}

type MockSoundManager = ReturnType<typeof createMockSoundManager>;

/** Create a mock Phaser.Game with just the sound property. */
function createMockGame(soundManager: MockSoundManager) {
	return { sound: soundManager } as unknown as Phaser.Game;
}

describe('PhaserAudio', () => {
	let audio: PhaserAudio;
	let soundManager: MockSoundManager;

	beforeEach(() => {
		audio = new PhaserAudio();
		soundManager = createMockSoundManager();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('before bind', () => {
		it('starts with isMuted false', () => {
			expect(audio.isMuted).toBe(false);
		});

		it('starts with currentMusicKey null', () => {
			expect(audio.currentMusicKey).toBeNull();
		});

		it('no-ops playSfx before bind', () => {
			// Should not throw
			audio.playSfx('sfx-jump-1');
		});

		it('no-ops playMusic before bind', () => {
			audio.playMusic('music-title');
			expect(audio.currentMusicKey).toBeNull();
		});

		it('no-ops stopMusic before bind', () => {
			audio.stopMusic();
		});

		it('no-ops crossfadeMusic before bind', () => {
			audio.crossfadeMusic('music-title');
		});

		it('no-ops pauseMusic/resumeMusic before bind', () => {
			audio.pauseMusic();
			audio.resumeMusic();
		});

		it('can set volumes before bind without error', () => {
			audio.setMasterVolume(0.5);
			audio.setMusicVolume(0.5);
			audio.setSfxVolume(0.5);
		});

		it('can mute/unmute before bind', () => {
			audio.mute();
			expect(audio.isMuted).toBe(true);
			audio.unmute();
			expect(audio.isMuted).toBe(false);
		});
	});

	describe('bind', () => {
		it('connects to the game sound manager', () => {
			audio.bind(createMockGame(soundManager));
			audio.playSfx('sfx-jump-1');
			expect(soundManager.play).toHaveBeenCalledOnce();
		});
	});

	describe('playSfx', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('plays a sound with the given key', () => {
			audio.playSfx('sfx-jump-1');
			expect(soundManager.play).toHaveBeenCalledWith('sfx-jump-1', expect.any(Object));
		});

		it('applies layered volume: masterVol * sfxVol * config.volume', () => {
			audio.setMasterVolume(0.5);
			audio.setSfxVolume(0.8);
			audio.playSfx('sfx-coin-1', { volume: 0.5 });

			const config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			// 0.5 * 0.5 * 0.8 = 0.2
			expect(config['volume']).toBeCloseTo(0.2);
		});

		it('uses default volume 1.0 when no config provided', () => {
			// Default: master=0.8, sfx=1.0, config.volume=1.0
			audio.playSfx('sfx-jump-1');

			const config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			// 1.0 * 0.8 * 1.0 = 0.8
			expect(config['volume']).toBeCloseTo(0.8);
		});

		it('passes rate when provided', () => {
			audio.playSfx('sfx-jump-1', { rate: 1.5 });

			const config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['rate']).toBe(1.5);
		});

		it('omits rate when not provided', () => {
			audio.playSfx('sfx-jump-1');

			const config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config).not.toHaveProperty('rate');
		});

		it('sets volume to 0 when muted', () => {
			audio.mute();
			audio.playSfx('sfx-jump-1');

			const config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['volume']).toBe(0);
		});
	});

	describe('playMusic', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('adds and plays a music track', () => {
			audio.playMusic('music-title');

			expect(soundManager.add).toHaveBeenCalledWith('music-title', expect.any(Object));
			expect(soundManager._lastSound?.play).toHaveBeenCalled();
			expect(audio.currentMusicKey).toBe('music-title');
		});

		it('loops by default', () => {
			audio.playMusic('music-title');

			const config = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['loop']).toBe(true);
		});

		it('respects loop: false', () => {
			audio.playMusic('music-title', { loop: false });

			const config = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['loop']).toBe(false);
		});

		it('sets volume using layered model: masterVol * musicVol * config.volume', () => {
			audio.setMasterVolume(0.5);
			audio.setMusicVolume(0.6);
			audio.playMusic('music-title', { volume: 0.5 });

			const config = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			// No fadeIn: direct volume = 0.5 * 0.5 * 0.6 = 0.15
			expect(config['volume']).toBeCloseTo(0.15);
		});

		it('starts at volume 0 when fadeInMs > 0', () => {
			audio.playMusic('music-title', { fadeInMs: 500 });

			const config = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['volume']).toBe(0);
		});

		it('does nothing when the same track is already playing', () => {
			audio.playMusic('music-title');
			const firstSound = soundManager._lastSound;

			audio.playMusic('music-title');

			// Should not add a second sound
			expect(soundManager.add).toHaveBeenCalledTimes(1);
			expect(firstSound?.stop).not.toHaveBeenCalled();
		});

		it('stops previous music when switching tracks', () => {
			audio.playMusic('music-title');
			const firstSound = soundManager._lastSound;

			audio.playMusic('music-platformer');

			expect(firstSound?.stop).toHaveBeenCalled();
			expect(firstSound?.destroy).toHaveBeenCalled();
			expect(audio.currentMusicKey).toBe('music-platformer');
		});

		it('sets volume to 0 when muted (no fade)', () => {
			audio.mute();
			audio.playMusic('music-title');

			const config = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['volume']).toBe(0);
		});
	});

	describe('stopMusic', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('stops and destroys current music', () => {
			audio.playMusic('music-title');
			const sound = soundManager._lastSound;

			audio.stopMusic();

			expect(sound?.stop).toHaveBeenCalled();
			expect(sound?.destroy).toHaveBeenCalled();
			expect(audio.currentMusicKey).toBeNull();
		});

		it('no-ops when no music is playing', () => {
			audio.stopMusic();
			// Should not throw
		});

		it('clears currentMusicKey', () => {
			audio.playMusic('music-title');
			expect(audio.currentMusicKey).toBe('music-title');

			audio.stopMusic();
			expect(audio.currentMusicKey).toBeNull();
		});

		it('accepts fadeOutMs parameter without error', () => {
			audio.playMusic('music-title');
			audio.stopMusic(300);
			expect(audio.currentMusicKey).toBeNull();
		});
	});

	describe('pauseMusic / resumeMusic', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('pauses currently playing music', () => {
			audio.playMusic('music-title');
			const sound = soundManager._lastSound;

			audio.pauseMusic();

			expect(sound?.pause).toHaveBeenCalled();
		});

		it('resumes paused music', () => {
			audio.playMusic('music-title');
			const sound = soundManager._lastSound;

			audio.pauseMusic();
			audio.resumeMusic();

			expect(sound?.resume).toHaveBeenCalled();
		});

		it('no-ops pauseMusic when no music is playing', () => {
			audio.pauseMusic();
		});

		it('no-ops resumeMusic when no music is paused', () => {
			audio.resumeMusic();
		});

		it('does not affect currentMusicKey', () => {
			audio.playMusic('music-title');
			audio.pauseMusic();
			expect(audio.currentMusicKey).toBe('music-title');

			audio.resumeMusic();
			expect(audio.currentMusicKey).toBe('music-title');
		});
	});

	describe('volume controls', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('clamps masterVolume to [0, 1]', () => {
			audio.setMasterVolume(-0.5);
			audio.playSfx('sfx-jump-1');
			let config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['volume']).toBe(0);

			audio.setMasterVolume(2.0);
			audio.playSfx('sfx-jump-2');
			config = soundManager.play.mock.calls[1]?.[1] as Record<string, unknown>;
			// master=1.0, sfx=1.0, config=1.0 → 1.0
			expect(config['volume']).toBeCloseTo(1.0);
		});

		it('clamps musicVolume to [0, 1]', () => {
			audio.setMusicVolume(-1);
			audio.playMusic('music-title');
			let addConfig = soundManager.add.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(addConfig['volume']).toBe(0);

			audio.stopMusic();
			audio.setMusicVolume(5);
			audio.playMusic('music-platformer');
			addConfig = soundManager.add.mock.calls[1]?.[1] as Record<string, unknown>;
			// master=0.8, music=1.0, config=1.0 → 0.8
			expect(addConfig['volume']).toBeCloseTo(0.8);
		});

		it('clamps sfxVolume to [0, 1]', () => {
			audio.setSfxVolume(-1);
			audio.playSfx('sfx-jump-1');
			let config = soundManager.play.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(config['volume']).toBe(0);

			audio.setSfxVolume(5);
			audio.playSfx('sfx-jump-2');
			config = soundManager.play.mock.calls[1]?.[1] as Record<string, unknown>;
			// master=0.8, sfx=1.0, config=1.0 → 0.8
			expect(config['volume']).toBeCloseTo(0.8);
		});

		it('applies volume change to currently playing music', () => {
			audio.playMusic('music-title');
			const sound = soundManager._lastSound;

			audio.setMasterVolume(0.5);

			// setVolume is called via applyMusicVolume
			expect(sound?.setVolume).toHaveBeenCalled();
		});

		it('applies music volume change to currently playing music', () => {
			audio.playMusic('music-title');
			const sound = soundManager._lastSound;

			audio.setMusicVolume(0.3);

			// effective = 0.8 * 0.3 = 0.24
			expect(sound?.setVolume).toHaveBeenCalledWith(expect.closeTo(0.24));
		});
	});

	describe('mute / unmute', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('sets isMuted flag', () => {
			expect(audio.isMuted).toBe(false);
			audio.mute();
			expect(audio.isMuted).toBe(true);
			audio.unmute();
			expect(audio.isMuted).toBe(false);
		});

		it('sets sound manager mute property', () => {
			audio.mute();
			expect(soundManager.mute).toBe(true);

			audio.unmute();
			expect(soundManager.mute).toBe(false);
		});
	});

	describe('unlockAudioContext', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('no-ops when sound manager is not locked', () => {
			soundManager.locked = false;
			audio.unlockAudioContext();
			expect(soundManager.once).not.toHaveBeenCalled();
		});

		it('registers unlocked listener when sound manager is locked', () => {
			soundManager.locked = true;
			audio.unlockAudioContext();
			expect(soundManager.once).toHaveBeenCalledWith('unlocked', expect.any(Function));
		});

		it('no-ops before bind', () => {
			const unbound = new PhaserAudio();
			unbound.unlockAudioContext();
		});
	});

	describe('crossfadeMusic', () => {
		beforeEach(() => {
			audio.bind(createMockGame(soundManager));
		});

		it('schedules transition to a new track', () => {
			audio.playMusic('music-title');

			audio.crossfadeMusic('music-platformer', 1000);

			// After crossfade delay (500ms = half * 0.5), the new track should start
			vi.advanceTimersByTime(600);

			expect(soundManager.add).toHaveBeenCalledWith('music-platformer', expect.any(Object));
		});

		it('clears currentMusicKey during transition', () => {
			audio.playMusic('music-title');
			audio.crossfadeMusic('music-platformer');

			// Key is cleared immediately at start of crossfade
			expect(audio.currentMusicKey).toBeNull();
		});

		it('no-ops before bind', () => {
			const unbound = new PhaserAudio();
			unbound.crossfadeMusic('music-title');
		});
	});

	describe('IAudioPlayer contract', () => {
		it('implements all required properties', () => {
			expect(audio).toHaveProperty('isMuted');
			expect(audio).toHaveProperty('currentMusicKey');
		});

		it('implements all required methods', () => {
			expect(typeof audio.playSfx).toBe('function');
			expect(typeof audio.playMusic).toBe('function');
			expect(typeof audio.stopMusic).toBe('function');
			expect(typeof audio.crossfadeMusic).toBe('function');
			expect(typeof audio.pauseMusic).toBe('function');
			expect(typeof audio.resumeMusic).toBe('function');
			expect(typeof audio.setMasterVolume).toBe('function');
			expect(typeof audio.setMusicVolume).toBe('function');
			expect(typeof audio.setSfxVolume).toBe('function');
			expect(typeof audio.mute).toBe('function');
			expect(typeof audio.unmute).toBe('function');
			expect(typeof audio.unlockAudioContext).toBe('function');
		});
	});
});
