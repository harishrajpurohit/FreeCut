import type { SubtitleStyleOverrides } from "@/subtitles/types";
import type { ParamValues } from "@/params";

export interface TextStylePreset {
	id: string;
	name: string;
	/** Source of truth for both the Text panel and caption styling. */
	style: SubtitleStyleOverrides;
	/** Inline CSS for the preview tile. */
	previewStyle: {
		color: string;
		fontFamily: string;
		fontWeight: number | string;
		fontStyle?: string;
		letterSpacing?: string;
		background?: string;
		padding?: string;
		borderRadius?: string;
	};
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
	{
		id: "classic",
		name: "Classic",
		style: { fontFamily: "Arial", fontWeight: "normal", color: "#ffffff" },
		previewStyle: { color: "#ffffff", fontFamily: "Arial", fontWeight: 400 },
	},
	{
		id: "bold-title",
		name: "Bold title",
		style: {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 22,
			color: "#ffffff",
			letterSpacing: 1,
		},
		previewStyle: {
			color: "#ffffff",
			fontFamily: "Arial",
			fontWeight: 800,
			letterSpacing: "0.05em",
		},
	},
	{
		id: "yellow-caption",
		name: "Yellow",
		style: { fontFamily: "Arial", fontWeight: "bold", color: "#ffe14d" },
		previewStyle: { color: "#ffe14d", fontFamily: "Arial", fontWeight: 800 },
	},
	{
		id: "black-box",
		name: "Black box",
		style: {
			fontFamily: "Arial",
			fontWeight: "bold",
			color: "#ffffff",
			background: {
				enabled: true,
				color: "#000000",
				cornerRadius: 8,
				paddingX: 24,
				paddingY: 14,
			},
		},
		previewStyle: {
			color: "#ffffff",
			fontFamily: "Arial",
			fontWeight: 800,
			background: "#000000",
			padding: "2px 8px",
			borderRadius: "4px",
		},
	},
	{
		id: "highlight",
		name: "Highlight",
		style: {
			fontFamily: "Arial",
			fontWeight: "bold",
			color: "#111111",
			background: {
				enabled: true,
				color: "#ffe14d",
				cornerRadius: 6,
				paddingX: 24,
				paddingY: 14,
			},
		},
		previewStyle: {
			color: "#111111",
			fontFamily: "Arial",
			fontWeight: 800,
			background: "#ffe14d",
			padding: "2px 8px",
			borderRadius: "4px",
		},
	},
	{
		id: "neon-green",
		name: "Neon",
		style: {
			fontFamily: "Arial",
			fontWeight: "bold",
			color: "#39ff14",
			letterSpacing: 2,
		},
		previewStyle: {
			color: "#39ff14",
			fontFamily: "Arial",
			fontWeight: 800,
			letterSpacing: "0.1em",
		},
	},
	{
		id: "elegant",
		name: "Elegant",
		style: {
			fontFamily: "Georgia",
			fontStyle: "italic",
			fontWeight: "normal",
			color: "#f5e9d3",
			letterSpacing: 1,
		},
		previewStyle: {
			color: "#f5e9d3",
			fontFamily: "Georgia, serif",
			fontWeight: 400,
			fontStyle: "italic",
			letterSpacing: "0.05em",
		},
	},
	{
		id: "impact",
		name: "Impact",
		style: {
			fontFamily: "Impact",
			fontWeight: "normal",
			fontSize: 20,
			color: "#ffffff",
			letterSpacing: 1,
		},
		previewStyle: {
			color: "#ffffff",
			fontFamily: "Impact, sans-serif",
			fontWeight: 400,
			letterSpacing: "0.05em",
		},
	},
];

export const DEFAULT_CAPTION_STYLE_PRESET_ID = "bold-title";

export function getTextStylePreset({
	id,
}: {
	id: string;
}): TextStylePreset | undefined {
	return TEXT_STYLE_PRESETS.find((preset) => preset.id === id);
}

/** Maps a preset onto text element params; unspecified fields are left to the defaults. */
export function textStyleToParams({
	style,
}: {
	style: SubtitleStyleOverrides;
}): ParamValues {
	const params: ParamValues = {};
	if (style.fontFamily !== undefined) params.fontFamily = style.fontFamily;
	if (style.fontSize !== undefined) params.fontSize = style.fontSize;
	if (style.color !== undefined) params.color = style.color;
	if (style.fontWeight !== undefined) params.fontWeight = style.fontWeight;
	if (style.fontStyle !== undefined) params.fontStyle = style.fontStyle;
	if (style.textDecoration !== undefined) {
		params.textDecoration = style.textDecoration;
	}
	if (style.letterSpacing !== undefined) {
		params.letterSpacing = style.letterSpacing;
	}
	if (style.lineHeight !== undefined) params.lineHeight = style.lineHeight;
	if (style.background) {
		params["background.enabled"] = style.background.enabled;
		params["background.color"] = style.background.color;
		if (style.background.cornerRadius !== undefined) {
			params["background.cornerRadius"] = style.background.cornerRadius;
		}
		if (style.background.paddingX !== undefined) {
			params["background.paddingX"] = style.background.paddingX;
		}
		if (style.background.paddingY !== undefined) {
			params["background.paddingY"] = style.background.paddingY;
		}
	}
	return params;
}
