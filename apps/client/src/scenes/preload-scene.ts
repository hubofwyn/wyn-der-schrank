import type { AssetEntry } from '@hub-of-wyn/shared';
import type { AnimationDef } from '../modules/animation/animation-def.js';
import { parseManifest } from '../modules/assets/manifest-parser.js';
import { getCoinAnimationDefs } from '../modules/collectible/animation-config.js';
import { getSkeletonAnimationDefs } from '../modules/enemy/animation-config.js';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { getPlayerAnimationDefs } from '../modules/player/animation-config.js';
import { safeCenterX, safeCenterY } from '../modules/ui/scene-layout.js';
import { BaseScene } from './base-scene.js';

/**
 * PreloadScene — loads all game assets with a progress bar.
 *
 * Flow:
 * 1. preload() — loads the asset-manifest.json only.
 * 2. create()  — parses the manifest, queues every game asset into
 *    the Phaser loader, and starts a second load pass. When the
 *    second pass completes, transitions to the next scene.
 *
 * If the manifest is empty (no assets), transitions immediately.
 */
export class PreloadScene extends BaseScene {
	private progressFill: Phaser.GameObjects.Rectangle | null = null;
	private progressBarWidth = 400;

	constructor() {
		super({ key: SceneKeys.PRELOAD });
	}

	preload(): void {
		this.createProgressBar();
		this.load.json('asset-manifest', 'assets/data/asset-manifest.json');
	}

	create(): void {
		const raw = this.cache.json.get('asset-manifest') as unknown;
		const assets = parseManifest(raw);

		if (assets.length === 0) {
			Promise.all([this.container.settingsManager.load(), this.container.sessionSave.load()]).then(
				() => {
					this.navigateTo(SceneKeys.TITLE);
				},
			);
			return;
		}

		for (const asset of assets) {
			this.queueAsset(asset);
		}

		this.load.once('complete', () => {
			this.createAnimations();
			this.initCatalogs();
			Promise.all([this.container.settingsManager.load(), this.container.sessionSave.load()]).then(
				() => {
					this.navigateTo(SceneKeys.TITLE);
				},
			);
		});

		this.load.start();
	}

	private createProgressBar(): void {
		const safeZone = this.container.viewport.safeZone;
		const cx = safeCenterX(safeZone);
		const cy = safeCenterY(safeZone);
		const barHeight = 28;
		const x = cx - this.progressBarWidth / 2;

		const bg = this.add.rectangle(cx, cy, this.progressBarWidth, barHeight, 0x222222);
		bg.setOrigin(0.5);

		this.progressFill = this.add.rectangle(x, cy, 0, barHeight, 0x3355ff);
		this.progressFill.setOrigin(0, 0.5);

		const text = this.add.text(cx, cy - 30, 'Loading...', {
			fontSize: '18px',
			color: '#cccccc',
		});
		text.setOrigin(0.5);

		this.load.on('progress', (value: number) => {
			if (this.progressFill) {
				this.progressFill.width = this.progressBarWidth * value;
			}
			this.container.diagnostics.emit('scene', 'state', 'preload-progress', {
				loaded: Math.round(value * 100),
				total: 100,
			});
		});
	}

	private createAnimations(): void {
		for (const def of getPlayerAnimationDefs('player')) {
			this.registerAnimation(def);
		}
		for (const def of getSkeletonAnimationDefs()) {
			this.registerAnimation(def);
		}
		for (const def of getCoinAnimationDefs()) {
			this.registerAnimation(def);
		}
	}

	private initCatalogs(): void {
		const charactersRaw = this.cache.json.get('characters-data') as unknown;
		if (charactersRaw) {
			this.container.characterCatalog.init(charactersRaw);
		}
		const worldsRaw = this.cache.json.get('worlds-data') as unknown;
		if (worldsRaw) {
			this.container.worldCatalog.init(worldsRaw);
		}
	}

	private registerAnimation(def: AnimationDef): void {
		if (this.anims.exists(def.key)) return;
		this.anims.create({
			key: def.key,
			frames: this.anims.generateFrameNumbers(def.textureKey, {
				start: def.startFrame,
				end: def.endFrame,
			}),
			frameRate: def.frameRate,
			repeat: def.repeat,
		});
	}

	private queueAsset(asset: AssetEntry): void {
		switch (asset.type) {
			case 'image':
				this.load.image(asset.key, asset.url);
				break;
			case 'spritesheet':
				this.load.spritesheet(asset.key, asset.url, {
					frameWidth: asset.frameWidth ?? 32,
					frameHeight: asset.frameHeight ?? 32,
				});
				break;
			case 'atlas':
				if (asset.atlasUrl) {
					this.load.atlas(asset.key, asset.url, asset.atlasUrl);
				}
				break;
			case 'tilemapTiledJSON':
				this.load.tilemapTiledJSON(asset.key, asset.url);
				break;
			case 'audio':
				this.load.audio(asset.key, asset.url);
				break;
			case 'bitmapFont':
				if (asset.fontDataUrl) {
					this.load.bitmapFont(asset.key, asset.url, asset.fontDataUrl);
				}
				break;
			case 'json':
				this.load.json(asset.key, asset.url);
				break;
		}
	}
}
