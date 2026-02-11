import type { AssetEntry } from '@wds/shared';
import { AssetManifestSchema } from '@wds/shared';
import { SceneKeys } from '../modules/navigation/scene-keys.js';
import { BaseScene } from './base-scene.js';

/**
 * PreloadScene — loads all game assets with a progress bar.
 *
 * Flow: loads asset-manifest.json, then queues every asset from the
 * manifest into the Phaser loader. Displays a simple progress bar
 * while loading. Transitions to Platformer when complete.
 */
export class PreloadScene extends BaseScene {
	constructor() {
		super({ key: SceneKeys.PRELOAD });
	}

	preload(): void {
		this.createProgressBar();
		this.load.json('asset-manifest', 'assets/data/asset-manifest.json');
		this.load.on('complete', () => this.onManifestLoaded());
	}

	create(): void {
		// All assets loaded — transition to Platformer.
		// Later: transition to Title -> MainMenu.
		this.navigateTo(SceneKeys.PLATFORMER);
	}

	private createProgressBar(): void {
		const { width, height } = this.scale;
		const barWidth = 400;
		const barHeight = 28;
		const x = (width - barWidth) / 2;
		const y = height / 2;

		// Background bar
		const bg = this.add.rectangle(width / 2, y, barWidth, barHeight, 0x222222);
		bg.setOrigin(0.5);

		// Fill bar
		const fill = this.add.rectangle(x, y, 0, barHeight, 0x3355ff);
		fill.setOrigin(0, 0.5);

		// Loading text
		const text = this.add.text(width / 2, y - 30, 'Loading...', {
			fontSize: '18px',
			color: '#cccccc',
		});
		text.setOrigin(0.5);

		this.load.on('progress', (value: number) => {
			fill.width = barWidth * value;
		});
	}

	private onManifestLoaded(): void {
		const raw = this.cache.json.get('asset-manifest') as unknown;
		if (!raw) return;

		const result = AssetManifestSchema.safeParse(raw);
		if (!result.success) {
			console.error('Invalid asset manifest:', result.error);
			return;
		}

		const { assets } = result.data;
		if (assets.length === 0) return;

		// Queue all assets from the manifest
		for (const asset of assets) {
			this.queueAsset(asset);
		}

		// Start a second load pass for manifest assets
		this.load.start();
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
