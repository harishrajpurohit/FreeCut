import type { MediaTime } from "@/wasm";

export type TextAnimationType =
	| "fade"
	| "pop"
	| "slide-up"
	| "slide-down"
	| "zoom";

export interface TextAnimation {
	type: TextAnimationType;
	duration: MediaTime;
}

export const DEFAULT_TEXT_ANIMATION_SECONDS = 0.4;
export const MIN_TEXT_ANIMATION_SECONDS = 0.1;
export const MAX_TEXT_ANIMATION_SECONDS = 2;

export const TEXT_ANIMATION_TYPES: {
	type: TextAnimationType;
	label: string;
}[] = [
	{ type: "fade", label: "Fade" },
	{ type: "pop", label: "Pop" },
	{ type: "slide-up", label: "Slide up" },
	{ type: "slide-down", label: "Slide down" },
	{ type: "zoom", label: "Zoom" },
];

/** Fraction of the canvas height that slide animations travel. */
const SLIDE_DISTANCE_RATIO = 0.08;

export interface TextAnimationState {
	opacity: number;
	scale: number;
	offsetY: number;
}

const IDENTITY: TextAnimationState = { opacity: 1, scale: 1, offsetY: 0 };

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** `progress` runs 0 (fully hidden) to 1 (fully shown). */
function stateAtProgress({
	type,
	progress,
	canvasHeight,
}: {
	type: TextAnimationType;
	progress: number;
	canvasHeight: number;
}): TextAnimationState {
	const p = Math.min(1, Math.max(0, progress));
	switch (type) {
		case "fade":
			return { opacity: easeOutCubic(p), scale: 1, offsetY: 0 };
		case "pop":
			return {
				opacity: Math.min(1, p * 3),
				scale: Math.max(0, easeOutBack(p)),
				offsetY: 0,
			};
		case "slide-up":
			return {
				opacity: easeOutCubic(p),
				scale: 1,
				offsetY: (1 - easeOutCubic(p)) * SLIDE_DISTANCE_RATIO * canvasHeight,
			};
		case "slide-down":
			return {
				opacity: easeOutCubic(p),
				scale: 1,
				offsetY: -(1 - easeOutCubic(p)) * SLIDE_DISTANCE_RATIO * canvasHeight,
			};
		case "zoom":
			return {
				opacity: easeOutCubic(p),
				scale: 1.5 - 0.5 * easeOutCubic(p),
				offsetY: 0,
			};
	}
}

/**
 * Resolves the in/out animation state at `clipTime` (ticks from the element's
 * start). The out animation is the in animation played in reverse over the
 * last `duration` ticks.
 */
export function resolveTextAnimation({
	animationIn,
	animationOut,
	clipTime,
	clipDuration,
	canvasHeight,
}: {
	animationIn: TextAnimation | undefined;
	animationOut: TextAnimation | undefined;
	clipTime: number;
	clipDuration: number;
	canvasHeight: number;
}): TextAnimationState {
	let state = IDENTITY;

	if (
		animationIn &&
		animationIn.duration > 0 &&
		clipTime < animationIn.duration
	) {
		state = stateAtProgress({
			type: animationIn.type,
			progress: clipTime / animationIn.duration,
			canvasHeight,
		});
	}

	if (animationOut && animationOut.duration > 0) {
		const remaining = clipDuration - clipTime;
		if (remaining < animationOut.duration) {
			const out = stateAtProgress({
				type: animationOut.type,
				progress: remaining / animationOut.duration,
				canvasHeight,
			});
			state = {
				opacity: state.opacity * out.opacity,
				scale: state.scale * out.scale,
				offsetY: state.offsetY + out.offsetY,
			};
		}
	}

	return state;
}
