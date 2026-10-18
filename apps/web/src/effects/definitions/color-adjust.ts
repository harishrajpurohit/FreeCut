import type { EffectCategory, EffectDefinition } from "@/effects/types";
import type { ParamDefinition } from "@/params";

export const COLOR_ADJUST_SHADER = "color-adjust";

type ColorAdjustValues = {
	brightness: number;
	contrast: number;
	saturation: number;
	temperature: number;
	hue: number;
	vignette: number;
};

const NEUTRAL: ColorAdjustValues = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	temperature: 0,
	hue: 0,
	vignette: 0,
};

const PARAM_RANGES: Record<
	keyof ColorAdjustValues,
	{ label: string; min: number; max: number; step: number }
> = {
	brightness: { label: "Brightness", min: -100, max: 100, step: 1 },
	contrast: { label: "Contrast", min: -100, max: 100, step: 1 },
	saturation: { label: "Saturation", min: -100, max: 100, step: 1 },
	temperature: { label: "Temperature", min: -100, max: 100, step: 1 },
	hue: { label: "Hue", min: -180, max: 180, step: 1 },
	vignette: { label: "Vignette", min: 0, max: 100, step: 1 },
};

function readNumber({
	params,
	key,
	fallback,
}: {
	params: Record<string, unknown>;
	key: string;
	fallback: number;
}): number {
	const raw = params[key];
	if (raw === undefined) return fallback;
	const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
	return Number.isFinite(value) ? value : fallback;
}

function buildParams({
	keys,
	defaults,
}: {
	keys: (keyof ColorAdjustValues)[];
	defaults: Partial<ColorAdjustValues>;
}): ParamDefinition[] {
	return keys.map((key) => ({
		key,
		label: PARAM_RANGES[key].label,
		type: "number",
		default: defaults[key] ?? 0,
		min: PARAM_RANGES[key].min,
		max: PARAM_RANGES[key].max,
		step: PARAM_RANGES[key].step,
	}));
}

function createColorAdjustEffect({
	type,
	name,
	category,
	keywords,
	keys,
	defaults,
}: {
	type: string;
	name: string;
	category: EffectCategory;
	keywords: string[];
	keys: (keyof ColorAdjustValues)[];
	defaults: Partial<ColorAdjustValues>;
}): EffectDefinition {
	return {
		type,
		name,
		category,
		keywords,
		params: buildParams({ keys, defaults }),
		renderer: {
			passes: [
				{
					shader: COLOR_ADJUST_SHADER,
					uniforms: ({ effectParams }) => {
						const value = (key: keyof ColorAdjustValues) =>
							readNumber({
								params: effectParams,
								key,
								fallback: defaults[key] ?? NEUTRAL[key],
							});
						return {
							u_brightness: value("brightness") / 100,
							u_contrast: value("contrast") / 100,
							u_saturation: value("saturation") / 100,
							u_temperature: value("temperature") / 100,
							u_hue: value("hue"),
							u_vignette: value("vignette") / 100,
						};
					},
				},
			],
		},
	};
}

const ALL_KEYS: (keyof ColorAdjustValues)[] = [
	"brightness",
	"contrast",
	"saturation",
	"temperature",
	"hue",
	"vignette",
];

export const colorEffectDefinitions: EffectDefinition[] = [
	createColorAdjustEffect({
		type: "color-adjust",
		name: "Adjust",
		category: "adjust",
		keywords: ["adjust", "brightness", "contrast", "saturation", "color", "hue"],
		keys: ALL_KEYS,
		defaults: {},
	}),
	createColorAdjustEffect({
		type: "filter-vivid",
		name: "Vivid",
		category: "filter",
		keywords: ["vivid", "filter", "pop", "saturated"],
		keys: ["saturation", "contrast"],
		defaults: { saturation: 45, contrast: 15 },
	}),
	createColorAdjustEffect({
		type: "filter-warm",
		name: "Warm",
		category: "filter",
		keywords: ["warm", "filter", "sunset", "golden"],
		keys: ["temperature", "saturation"],
		defaults: { temperature: 50, saturation: 10 },
	}),
	createColorAdjustEffect({
		type: "filter-cool",
		name: "Cool",
		category: "filter",
		keywords: ["cool", "filter", "cold", "blue"],
		keys: ["temperature", "saturation"],
		defaults: { temperature: -50, saturation: 5 },
	}),
	createColorAdjustEffect({
		type: "filter-black-and-white",
		name: "Black & White",
		category: "filter",
		keywords: ["black", "white", "grayscale", "mono", "filter"],
		keys: ["contrast"],
		defaults: { contrast: 10, saturation: -100 },
	}),
	createColorAdjustEffect({
		type: "filter-vintage",
		name: "Vintage",
		category: "filter",
		keywords: ["vintage", "retro", "old", "film", "filter"],
		keys: ["temperature", "vignette", "contrast"],
		defaults: { temperature: 35, saturation: -25, contrast: -10, vignette: 40 },
	}),
	createColorAdjustEffect({
		type: "filter-sepia",
		name: "Sepia",
		category: "filter",
		keywords: ["sepia", "brown", "old", "antique", "filter"],
		keys: ["temperature", "contrast"],
		defaults: { temperature: 65, saturation: -65, contrast: 5 },
	}),
	createColorAdjustEffect({
		type: "filter-noir",
		name: "Noir",
		category: "filter",
		keywords: ["noir", "dramatic", "black", "white", "dark", "filter"],
		keys: ["contrast", "vignette"],
		defaults: { saturation: -100, contrast: 40, brightness: -5, vignette: 45 },
	}),
	createColorAdjustEffect({
		type: "filter-faded",
		name: "Faded",
		category: "filter",
		keywords: ["faded", "matte", "soft", "film", "washed", "filter"],
		keys: ["contrast", "saturation"],
		defaults: { contrast: -25, saturation: -20, brightness: 10 },
	}),
	createColorAdjustEffect({
		type: "filter-cinematic",
		name: "Cinematic",
		category: "filter",
		keywords: ["cinematic", "movie", "film", "teal", "orange", "filter"],
		keys: ["contrast", "temperature", "vignette"],
		defaults: { contrast: 22, saturation: -8, temperature: -15, vignette: 28 },
	}),
	createColorAdjustEffect({
		type: "filter-golden-hour",
		name: "Golden hour",
		category: "filter",
		keywords: ["golden", "hour", "sunset", "sunrise", "warm", "filter"],
		keys: ["temperature", "brightness"],
		defaults: { temperature: 70, saturation: 18, brightness: 4, vignette: 18 },
	}),
	createColorAdjustEffect({
		type: "filter-dreamy",
		name: "Dreamy",
		category: "filter",
		keywords: ["dreamy", "soft", "bright", "glow", "airy", "filter"],
		keys: ["brightness", "contrast"],
		defaults: { brightness: 15, contrast: -15, saturation: 10, temperature: 10 },
	}),
	createColorAdjustEffect({
		type: "filter-cyberpunk",
		name: "Cyberpunk",
		category: "filter",
		keywords: ["cyberpunk", "neon", "night", "purple", "filter"],
		keys: ["hue", "saturation", "temperature"],
		defaults: { hue: 35, saturation: 45, contrast: 15, temperature: -30 },
	}),
	createColorAdjustEffect({
		type: "effect-vignette",
		name: "Vignette",
		category: "effect",
		keywords: ["vignette", "dark", "edges"],
		keys: ["vignette"],
		defaults: { vignette: 60 },
	}),
];
