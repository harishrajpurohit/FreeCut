import { ADJACENT_TOLERANCE_TICKS } from "@/transitions/constants";
import type { ElementTransition, NodeTransition } from "@/transitions/types";

interface TransitionCandidate {
	type: string;
	startTime: number;
	duration: number;
	transition?: Pick<ElementTransition, "type" | "direction"> & {
		duration: number;
	};
}

function isVisualClip(element: { type: string }): element is TransitionCandidate {
	return element.type === "video" || element.type === "image";
}

function areAdjacent({
	first,
	second,
}: {
	first: { startTime: number; duration: number };
	second: { startTime: number };
}): boolean {
	return (
		Math.abs(first.startTime + first.duration - second.startTime) <=
		ADJACENT_TOLERANCE_TICKS
	);
}

/**
 * A transition is stored on the incoming clip. For a clip in a track's sorted
 * element list this returns up to two render-node transitions:
 *
 * - `in`: the clip's own transition, when a clip sits directly before it.
 * - `out`: the transition of the clip directly after it, which holds this
 *   clip's last frame so the two can blend.
 *
 * A middle clip in an A → B → C chain needs both, so they are independent.
 */
export function resolveNodeTransitions({
	elements,
	index,
}: {
	elements: { type: string; startTime: number; duration: number }[];
	index: number;
}): NodeTransition[] {
	const element = elements[index];
	if (!element || !isVisualClip(element)) return [];

	const transitions: NodeTransition[] = [];

	const previous = elements[index - 1];
	if (
		element.transition &&
		previous &&
		isVisualClip(previous) &&
		areAdjacent({ first: previous, second: element })
	) {
		transitions.push({
			...element.transition,
			duration: Math.min(element.transition.duration, element.duration),
			role: "in",
		});
	}

	const next = elements[index + 1];
	if (
		next &&
		isVisualClip(next) &&
		next.transition &&
		areAdjacent({ first: element, second: next })
	) {
		transitions.push({
			...next.transition,
			duration: Math.min(next.transition.duration, next.duration),
			role: "out",
		});
	}

	return transitions;
}
