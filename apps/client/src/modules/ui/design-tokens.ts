/**
 * Design tokens — pure TS constants for consistent UI styling.
 * No engine imports. Scenes cast TextStyleDef to engine TextStyle at the call site.
 */

export interface TextStyleDef {
	readonly fontSize: string;
	readonly fontFamily: string;
	readonly fontStyle?: string;
}

export const Colors: Readonly<{
	background: number;
	panel: number;
	text: string;
	textMuted: string;
	accent: string;
	success: string;
	danger: string;
	button: string;
	buttonHover: string;
}> = Object.freeze({
	background: 0x1a1a2e,
	panel: 0x16213e,
	text: '#ffffff',
	textMuted: '#aaaaaa',
	accent: '#ffdd44',
	success: '#44ff44',
	danger: '#ff4444',
	button: '#44ff44',
	buttonHover: '#66ff66',
});

export const Spacing: Readonly<{
	xs: number;
	sm: number;
	md: number;
	lg: number;
	xl: number;
	xxl: number;
}> = Object.freeze({
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
});

export const Typography: Readonly<Record<string, TextStyleDef>> = Object.freeze({
	title: { fontSize: '48px', fontFamily: 'monospace', fontStyle: 'bold' },
	heading: { fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold' },
	body: { fontSize: '24px', fontFamily: 'monospace' },
	button: { fontSize: '28px', fontFamily: 'monospace' },
	small: { fontSize: '18px', fontFamily: 'monospace' },
});

export const ZIndex: Readonly<{
	background: number;
	world: number;
	entities: number;
	hud: number;
	overlay: number;
	modal: number;
}> = Object.freeze({
	background: 0,
	world: 10,
	entities: 20,
	hud: 100,
	overlay: 200,
	modal: 300,
});
