import type { AssetEntry } from '@wds/shared';
import { AssetManifestSchema } from '@wds/shared';

/**
 * Parse and validate a raw asset manifest.
 *
 * Takes untrusted JSON (from Phaser's cache or any source),
 * validates it against the AssetManifestSchema, and returns
 * typed asset entries. Pure function — no Phaser, no side effects.
 */
export function parseManifest(raw: unknown): AssetEntry[] {
	if (!raw) return [];

	const result = AssetManifestSchema.safeParse(raw);
	if (!result.success) {
		console.error('Invalid asset manifest:', result.error);
		return [];
	}

	return result.data.assets;
}
