import type { Mask } from "@/masks/types";
import type { Transform } from "@/rendering";
import type { NodeTransition } from "@/transitions/types";

function smoothstep(value: number): number {
	const t = Math.min(1, Math.max(0, value));
	return t * t * (3 - 2 * t);
}

/** Ticks the clip stays visible after its own end (the outgoing half of a transition). */
export function getTransitionHoldTicks({
	transition,
}: {
	transition: NodeTransition | undefined;
}): number {
	return transition?.role === "out" ? transition.duration : 0;
}

/** Progress 0 → 1 across the transition, or null when the clip is outside it. */
export function getTransitionProgress({
	transition,
	clipTime,
	clipDuration,
}: {
	transition: NodeTransition | undefined;
	clipTime: number;
	clipDuration: number;
}): number | null {
	if (!transition || transition.duration <= 0) return null;
	const elapsed = transition.role === "in" ? clipTime : clipTime - clipDuration;
	if (elapsed < 0 || elapsed > transition.duration) return null;
	return smoothstep(elapsed / transition.duration);
}

const SLIDE_SIGN: Record<NodeTransition["direction"], { x: number; y: number }> =
	{
		left: { x: -1, y: 0 },
		right: { x: 1, y: 0 },
		up: { x: 0, y: -1 },
		down: { x: 0, y: 1 },
	};

// A split mask keeps the side its normal points toward, so the normal faces the
// edge the wipe starts from and the line travels away from that edge.
const WIPE_SPLIT: Record<
	NodeTransition["direction"],
	{ rotation: number; axis: "x" | "y"; sign: 1 | -1 }
> = {
	left: { rotation: 180, axis: "x", sign: 1 },
	right: { rotation: 0, axis: "x", sign: -1 },
	up: { rotation: 270, axis: "y", sign: 1 },
	down: { rotation: 90, axis: "y", sign: -1 },
};

export interface TransitionAdjustment {
	opacity: number;
	transform: Transform;
	mask: Mask | null;
}

export function applyTransition({
	transition,
	progress,
	opacity,
	transform,
	canvasWidth,
	canvasHeight,
}: {
	transition: NodeTransition;
	progress: number;
	opacity: number;
	transform: Transform;
	canvasWidth: number;
	canvasHeight: number;
}): TransitionAdjustment {
	const isIncoming = transition.role === "in";

	if (transition.type === "dissolve") {
		// The outgoing clip holds its last frame underneath while the incoming one fades in.
		return {
			opacity: isIncoming ? opacity * progress : opacity,
			transform,
			mask: null,
		};
	}

	if (transition.type === "slide") {
		const sign = SLIDE_SIGN[transition.direction];
		// Incoming slides from its edge to rest; outgoing is pushed out the opposite side.
		const offset = isIncoming ? 1 - progress : -progress;
		return {
			opacity,
			transform: {
				...transform,
				position: {
					x: transform.position.x + sign.x * offset * canvasWidth,
					y: transform.position.y + sign.y * offset * canvasHeight,
				},
			},
			mask: null,
		};
	}

	if (!isIncoming) {
		return { opacity, transform, mask: null };
	}

	const wipe = WIPE_SPLIT[transition.direction];
	const line = wipe.sign * (progress - 0.5);
	return {
		opacity,
		transform,
		mask: {
			id: "transition-wipe",
			type: "split",
			params: {
				centerX: wipe.axis === "x" ? line : 0,
				centerY: wipe.axis === "y" ? line : 0,
				rotation: wipe.rotation,
				feather: 0,
				inverted: false,
				strokeColor: "#000000",
				strokeWidth: 0,
				strokeAlign: "inside",
			},
		},
	};
}
