import type {
	TransitionDirection,
	TransitionType,
} from "@/transitions/types";

export const DEFAULT_TRANSITION_SECONDS = 0.5;
export const MIN_TRANSITION_SECONDS = 0.1;
export const MAX_TRANSITION_SECONDS = 3;

/** Clips whose edges are within this many ticks count as adjacent. */
export const ADJACENT_TOLERANCE_TICKS = 2;

export const TRANSITION_TYPES: {
	type: TransitionType;
	label: string;
	hasDirection: boolean;
}[] = [
	{ type: "dissolve", label: "Dissolve", hasDirection: false },
	{ type: "slide", label: "Slide", hasDirection: true },
	{ type: "wipe", label: "Wipe", hasDirection: true },
];

export const TRANSITION_DIRECTIONS: {
	direction: TransitionDirection;
	label: string;
}[] = [
	{ direction: "left", label: "From left" },
	{ direction: "right", label: "From right" },
	{ direction: "up", label: "From top" },
	{ direction: "down", label: "From bottom" },
];
