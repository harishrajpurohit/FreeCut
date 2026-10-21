import type { MediaTime } from "@/wasm";

export type TransitionType =
	| "dissolve"
	| "slide"
	| "cover"
	| "wipe"
	| "dip-black"
	| "dip-white"
	| "zoom-in"
	| "zoom-out"
	| "spin"
	| "whip-pan"
	| "glitch"
	| "iris"
	| "box";

export type TransitionDirection = "left" | "right" | "up" | "down";

/**
 * Stored on the incoming clip. The transition plays over the first `duration`
 * of that clip, blending with the previous adjacent clip on the track.
 */
export interface ElementTransition {
	type: TransitionType;
	direction: TransitionDirection;
	duration: MediaTime;
}

export type TransitionRole = "in" | "out";

/** Transition as seen by a render node: `in` on the incoming clip, `out` on the clip it replaces. */
export interface NodeTransition
	extends Omit<ElementTransition, "duration"> {
	/** Ticks. */
	duration: number;
	role: TransitionRole;
}
