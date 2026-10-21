import { buildGaussianBlurPasses } from "@/effects/definitions/blur";
import { COLOR_ADJUST_SHADER } from "@/effects/definitions/color-adjust";
import type { EffectPass } from "@/effects/types";
import type { Mask } from "@/masks/types";
import type { Transform } from "@/rendering";
import type { NodeTransition, TransitionDirection } from "@/transitions/types";

function smoothstep(value: number): number {
	const t = Math.min(1, Math.max(0, value));
	return t * t * (3 - 2 * t);
}

const MIN_VISIBLE_BLUR_SIGMA = 0.5;

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/** Deterministic pseudo-random value in [0, 1) so a frame always renders the same. */
function hash01(seed: number): number {
	const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}

/** Ticks the clip stays visible after its own end (the outgoing half of a transition). */
export function getTransitionHoldTicks({
	transitions,
}: {
	transitions: NodeTransition[] | undefined;
}): number {
	const outgoing = transitions?.find(
		(transition) => transition.role === "out",
	);
	return outgoing ? outgoing.duration : 0;
}

/**
 * The transition currently playing on a clip, with its eased progress. A clip
 * can carry an incoming one (at its start) and an outgoing one (after its
 * end); their windows never overlap, so at most one is active.
 */
export function getActiveTransition({
	transitions,
	clipTime,
	clipDuration,
}: {
	transitions: NodeTransition[] | undefined;
	clipTime: number;
	clipDuration: number;
}): { transition: NodeTransition; progress: number; rawProgress: number } | null {
	for (const transition of transitions ?? []) {
		const progress = getTransitionProgress({
			transition,
			clipTime,
			clipDuration,
		});
		if (progress !== null) {
			const elapsed =
				transition.role === "in" ? clipTime : clipTime - clipDuration;
			return {
				transition,
				progress,
				rawProgress: clamp01(elapsed / transition.duration),
			};
		}
	}
	return null;
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

const DIRECTION_SIGN: Record<TransitionDirection, { x: number; y: number }> = {
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
};

// A split mask keeps the side its normal points toward, so the normal faces the
// edge the wipe starts from and the line travels away from that edge.
const WIPE_SPLIT: Record<
	TransitionDirection,
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
	/** Extra effect-pass groups to run after the clip's own effects. */
	effectPasses: EffectPass[][];
}

interface TransitionInput {
	transition: NodeTransition;
	/** Eased progress 0 → 1. */
	progress: number;
	/** Uneased progress, for effects that step at a steady rate. Defaults to `progress`. */
	rawProgress?: number;
	opacity: number;
	transform: Transform;
	canvasWidth: number;
	canvasHeight: number;
}

function adjustment(
	base: TransitionInput,
	changes: Partial<TransitionAdjustment> = {},
): TransitionAdjustment {
	return {
		opacity: base.opacity,
		transform: base.transform,
		mask: null,
		effectPasses: [],
		...changes,
	};
}

function colorPass({
	brightness = 0,
	saturation = 0,
	hue = 0,
}: {
	brightness?: number;
	saturation?: number;
	hue?: number;
}): EffectPass {
	return {
		shader: COLOR_ADJUST_SHADER,
		uniforms: {
			u_brightness: brightness + 0,
			u_contrast: 0,
			u_saturation: saturation,
			u_temperature: 0,
			u_hue: hue,
			u_vignette: 0,
		},
	};
}

function scaled(transform: Transform, factor: number): Transform {
	return {
		...transform,
		scaleX: transform.scaleX * factor,
		scaleY: transform.scaleY * factor,
	};
}

function shifted(
	transform: Transform,
	x: number,
	y: number,
): Transform {
	return {
		...transform,
		// "+ 0" turns a negative zero into a plain zero.
		position: {
			x: transform.position.x + x + 0,
			y: transform.position.y + y + 0,
		},
	};
}

function boxMask({
	type,
	size,
}: {
	type: "ellipse" | "rectangle";
	size: number;
}): Mask {
	const dimension = Math.max(size, 0.01);
	return {
		id: `transition-${type}`,
		type,
		params: {
			centerX: 0,
			centerY: 0,
			width: dimension,
			height: dimension,
			rotation: 0,
			scale: 1,
			feather: 0,
			inverted: false,
			strokeColor: "#000000",
			strokeWidth: 0,
			strokeAlign: "inside",
		},
	};
}

export function applyTransition(input: TransitionInput): TransitionAdjustment {
	const { transition, progress, opacity, transform, canvasWidth, canvasHeight } =
		input;
	const rawProgress = input.rawProgress ?? progress;
	const isIncoming = transition.role === "in";
	const sign = DIRECTION_SIGN[transition.direction];

	switch (transition.type) {
		case "dissolve":
			// The outgoing clip holds its last frame underneath while the incoming one fades in.
			return adjustment(input, {
				opacity: isIncoming ? opacity * progress : opacity,
			});

		case "slide": {
			// Incoming slides from its edge to rest; outgoing is pushed out the opposite side.
			const offset = isIncoming ? 1 - progress : -progress;
			return adjustment(input, {
				transform: shifted(
					transform,
					sign.x * offset * canvasWidth,
					sign.y * offset * canvasHeight,
				),
			});
		}

		case "cover": {
			if (!isIncoming) return adjustment(input);
			const offset = 1 - progress;
			return adjustment(input, {
				transform: shifted(
					transform,
					sign.x * offset * canvasWidth,
					sign.y * offset * canvasHeight,
				),
			});
		}

		case "wipe": {
			if (!isIncoming) return adjustment(input);
			const wipe = WIPE_SPLIT[transition.direction];
			const line = wipe.sign * (progress - 0.5);
			return adjustment(input, {
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
			});
		}

		case "dip-black":
		case "dip-white": {
			const level = transition.type === "dip-black" ? -1 : 1;
			if (isIncoming) {
				// Hidden until the outgoing clip has fully faded, then comes up from the color.
				return adjustment(input, {
					opacity: progress < 0.5 ? 0 : opacity,
					effectPasses: [
						[colorPass({ brightness: level * clamp01(2 - 2 * progress) })],
					],
				});
			}
			return adjustment(input, {
				effectPasses: [[colorPass({ brightness: level * clamp01(2 * progress) })]],
			});
		}

		case "zoom-in":
			if (!isIncoming) return adjustment(input);
			return adjustment(input, {
				opacity: opacity * progress,
				transform: scaled(transform, 0.5 + 0.5 * progress),
			});

		case "zoom-out":
			if (!isIncoming) return adjustment(input);
			return adjustment(input, {
				opacity: opacity * progress,
				transform: scaled(transform, 1.5 - 0.5 * progress),
			});

		case "spin":
			if (!isIncoming) return adjustment(input);
			return adjustment(input, {
				opacity: opacity * progress,
				transform: {
					...scaled(transform, 0.2 + 0.8 * progress),
					rotate: transform.rotate - (1 - progress) * 180,
				},
			});

		case "whip-pan": {
			const offset = isIncoming ? 1 - progress : -progress;
			// Blur peaks mid-way, along the direction of travel.
			const peak = Math.sin(Math.PI * progress);
			const isHorizontal = sign.x !== 0;
			const sigma = peak * 0.03 * (isHorizontal ? canvasWidth : canvasHeight);
			return adjustment(input, {
				transform: shifted(
					transform,
					sign.x * offset * canvasWidth,
					sign.y * offset * canvasHeight,
				),
				// Below ~half a pixel the blur is invisible, and a zero sigma would divide by zero.
				effectPasses:
					sigma < MIN_VISIBLE_BLUR_SIGMA
						? []
						: [
								buildGaussianBlurPasses({
									sigmaX: isHorizontal ? sigma : 0.001,
									sigmaY: isHorizontal ? 0.001 : sigma,
								}),
							],
			});
		}

		case "glitch": {
			// Cuts between the two clips about every frame; the incoming clip wins more
			// often as time passes and always at the end. Steps use uneased time so the
			// flicker keeps a steady rhythm.
			const step = Math.floor(rawProgress * 16);
			const showIncoming =
				rawProgress >= 0.92 ||
				(rawProgress > 0.04 && hash01(step * 3.1) < 0.1 + 0.8 * rawProgress);
			// Exactly zero at both ends so the clip lands precisely at rest.
			const amplitude =
				rawProgress <= 0 || rawProgress >= 1
					? 0
					: Math.sin(Math.PI * rawProgress);
			const jitterX = (hash01(step * 5.7) - 0.5) * 0.12 * canvasWidth * amplitude;
			const jitterY = (hash01(step * 7.9) - 0.5) * 0.04 * canvasHeight * amplitude;
			const hue = (hash01(step * 9.3) - 0.5) * 140 * amplitude;
			const isVisible = isIncoming ? showIncoming : !showIncoming;
			return adjustment(input, {
				opacity: isVisible ? opacity : 0,
				transform: shifted(transform, jitterX, jitterY),
				effectPasses: [[colorPass({ hue, saturation: 0.5 * amplitude })]],
			});
		}

		case "iris":
		case "box": {
			if (!isIncoming) return adjustment(input);
			// Covers the whole clip once the shape reaches past its corners.
			const reach = transition.type === "iris" ? 1.45 : 1.02;
			return adjustment(input, {
				opacity: progress > 0 ? opacity : 0,
				mask: boxMask({
					type: transition.type === "iris" ? "ellipse" : "rectangle",
					size: reach * progress,
				}),
			});
		}
	}
}
