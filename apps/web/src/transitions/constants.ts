import type {
	TransitionDirection,
	TransitionType,
} from "@/transitions/types";

export const DEFAULT_TRANSITION_SECONDS = 0.5;
export const MIN_TRANSITION_SECONDS = 0.1;
export const MAX_TRANSITION_SECONDS = 3;

/** Clips whose edges are within this many ticks count as adjacent. */
export const ADJACENT_TOLERANCE_TICKS = 2;

export interface TransitionTypeInfo {
	type: TransitionType;
	label: string;
	description: string;
	hasDirection: boolean;
}

export const TRANSITION_TYPES: TransitionTypeInfo[] = [
	{
		type: "dissolve",
		label: "Dissolve",
		description: "Fades the next clip in over the last frame",
		hasDirection: false,
	},
	{
		type: "slide",
		label: "Slide",
		description: "Pushes the previous clip out as the next slides in",
		hasDirection: true,
	},
	{
		type: "cover",
		label: "Cover",
		description: "The next clip slides in over the still previous clip",
		hasDirection: true,
	},
	{
		type: "wipe",
		label: "Wipe",
		description: "Reveals the next clip along a moving edge",
		hasDirection: true,
	},
	{
		type: "dip-black",
		label: "Dip to black",
		description: "Fades out to black, then in from black",
		hasDirection: false,
	},
	{
		type: "dip-white",
		label: "Flash",
		description: "Fades out to white, then in from white",
		hasDirection: false,
	},
	{
		type: "zoom-in",
		label: "Zoom in",
		description: "The next clip grows into place",
		hasDirection: false,
	},
	{
		type: "zoom-out",
		label: "Zoom out",
		description: "The next clip settles down from a close-up",
		hasDirection: false,
	},
	{
		type: "spin",
		label: "Spin",
		description: "The next clip spins and scales in",
		hasDirection: false,
	},
	{
		type: "whip-pan",
		label: "Whip pan",
		description: "A fast push with motion blur",
		hasDirection: true,
	},
	{
		type: "glitch",
		label: "Glitch",
		description: "Flickering cuts with jitter and color shifts",
		hasDirection: false,
	},
	{
		type: "iris",
		label: "Circle reveal",
		description: "The next clip opens from the center as a circle",
		hasDirection: false,
	},
	{
		type: "box",
		label: "Box reveal",
		description: "The next clip opens from the center as a rectangle",
		hasDirection: false,
	},
];

export function getTransitionTypeInfo({
	type,
}: {
	type: TransitionType;
}): TransitionTypeInfo | undefined {
	return TRANSITION_TYPES.find((entry) => entry.type === type);
}

export const TRANSITION_DIRECTIONS: {
	direction: TransitionDirection;
	label: string;
}[] = [
	{ direction: "left", label: "From left" },
	{ direction: "right", label: "From right" },
	{ direction: "up", label: "From top" },
	{ direction: "down", label: "From bottom" },
];
