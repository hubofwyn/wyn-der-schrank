import type { CharacterStats } from '@wds/shared';
import { PlatformerConfigSchema, SettingsSchema } from '@wds/shared';
import { PhaserClock } from '../core/adapters/phaser-clock.js';
import { PhaserInput } from '../core/adapters/phaser-input.js';
import { PhaserBody } from '../core/adapters/phaser-physics.js';
import { getFirstStepsLevel } from '../modules/level/level-data.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { PlayerController } from '../modules/player/player-controller.js';

/**
 * PlatformerScene — the core gameplay scene.
 *
 * Wires PlayerController through ports to Phaser rendering.
 * Adapters are scene-scoped (PhaserInput/PhaserBody require a live scene).
 */
export class PlatformerScene extends Phaser.Scene {
	private clock!: PhaserClock;
	private phaserInput!: PhaserInput;
	private playerController!: PlayerController;

	constructor() {
		super({ key: SceneKeys.PLATFORMER });
	}

	create(): void {
		const level = getFirstStepsLevel();

		// ── Adapters ──
		this.clock = new PhaserClock();
		this.phaserInput = new PhaserInput(
			this.input.keyboard!,
			SettingsSchema.parse({
				audio: {},
				display: {},
				controls: {},
				accessibility: {},
			}),
		);

		// ── Platforms ──
		const platforms = this.physics.add.staticGroup();
		for (const p of level.platforms) {
			const rect = this.add.rectangle(p.x, p.y, p.width, p.height, p.color);
			platforms.add(rect);
		}

		// ── Player ──
		const playerRect = this.add.rectangle(level.spawn.x, level.spawn.y, 32, 48, 0x3355ff);
		this.physics.add.existing(playerRect, false);

		const arcadeBody = playerRect.body as Phaser.Physics.Arcade.Body;
		arcadeBody.setCollideWorldBounds(true);
		arcadeBody.setMaxVelocity(300, 600);

		const playerBody = new PhaserBody(arcadeBody);

		const config = PlatformerConfigSchema.parse({});
		const stats: CharacterStats = {
			maxHealth: 100,
			speed: 250,
			jumpForce: 420,
			attackPower: 10,
			defense: 5,
		};

		this.playerController = new PlayerController({
			input: this.phaserInput,
			body: playerBody,
			clock: this.clock,
			config,
			stats,
		});

		// ── Collisions ──
		this.physics.add.collider(playerRect, platforms);

		// ── Camera ──
		this.cameras.main.startFollow(playerRect, true, 0.1, 0.1);
		this.cameras.main.setBounds(0, 0, level.worldWidth, level.worldHeight);

		// ── World bounds ──
		this.physics.world.setBounds(0, 0, level.worldWidth, level.worldHeight);
	}

	update(time: number, delta: number): void {
		this.clock.refresh(time, delta);
		this.phaserInput.update();
		this.playerController.update();
	}
}
