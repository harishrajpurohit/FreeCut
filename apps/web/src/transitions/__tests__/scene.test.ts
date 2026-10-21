import { describe, expect, test } from "bun:test";
import { getActiveTransition, getTransitionHoldTicks } from "@/transitions/resolve";
import { resolveNodeTransitions } from "@/transitions/scene";
import type { TransitionType } from "@/transitions/types";

type Clip = {
	type: string;
	startTime: number;
	duration: number;
	transition?: { type: TransitionType; direction: "left"; duration: number };
};

const clip = (
	startTime: number,
	duration: number,
	transition?: TransitionType,
): Clip => ({
	type: "image",
	startTime,
	duration,
	...(transition && {
		transition: { type: transition, direction: "left", duration: 100 },
	}),
});

describe("resolveNodeTransitions", () => {
	test("a clip with no neighbours or transitions gets none", () => {
		expect(resolveNodeTransitions({ elements: [clip(0, 1000)], index: 0 })).toEqual([]);
	});

	test("the incoming clip gets an `in`, the one before it an `out`", () => {
		const elements = [clip(0, 1000), clip(1000, 1000, "dissolve")];
		expect(resolveNodeTransitions({ elements, index: 0 }).map((t) => t.role)).toEqual(["out"]);
		expect(resolveNodeTransitions({ elements, index: 1 }).map((t) => t.role)).toEqual(["in"]);
	});

	test("a middle clip in A -> B -> C carries both, so each cut can blend", () => {
		const elements = [
			clip(0, 1000),
			clip(1000, 1000, "iris"),
			clip(2000, 1000, "dip-black"),
		];
		const middle = resolveNodeTransitions({ elements, index: 1 });
		expect(middle.map((t) => [t.role, t.type])).toEqual([
			["in", "iris"],
			["out", "dip-black"],
		]);
		// The first clip is held for the iris, the last one only plays the dip.
		expect(resolveNodeTransitions({ elements, index: 0 }).map((t) => t.type)).toEqual(["iris"]);
		expect(resolveNodeTransitions({ elements, index: 2 }).map((t) => t.role)).toEqual(["in"]);
	});

	test("clips with a gap between them do not transition", () => {
		const elements = [clip(0, 1000), clip(1500, 1000, "dissolve")];
		expect(resolveNodeTransitions({ elements, index: 0 })).toEqual([]);
		expect(resolveNodeTransitions({ elements, index: 1 })).toEqual([]);
	});

	test("the transition is capped to the incoming clip's length", () => {
		const elements = [clip(0, 1000), clip(1000, 40, "dissolve")];
		expect(resolveNodeTransitions({ elements, index: 1 })[0].duration).toBe(40);
		expect(resolveNodeTransitions({ elements, index: 0 })[0].duration).toBe(40);
	});

	test("non-visual elements are ignored", () => {
		const elements = [
			{ type: "audio", startTime: 0, duration: 1000 },
			clip(1000, 1000, "dissolve"),
		];
		expect(resolveNodeTransitions({ elements, index: 0 })).toEqual([]);
		expect(resolveNodeTransitions({ elements, index: 1 })).toEqual([]);
	});
});

describe("middle clip timeline", () => {
	const elements = [
		clip(0, 1000),
		clip(1000, 1000, "iris"),
		clip(2000, 1000, "dip-black"),
	];
	const transitions = resolveNodeTransitions({ elements, index: 1 });

	test("is held after its end for the outgoing transition", () => {
		expect(getTransitionHoldTicks({ transitions })).toBe(100);
	});

	test("plays its own transition at the start and the outgoing one after the end, never both", () => {
		const at = (clipTime: number) =>
			getActiveTransition({ transitions, clipTime, clipDuration: 1000 })?.transition.type ?? null;
		expect(at(50)).toBe("iris");
		expect(at(500)).toBeNull();
		expect(at(1050)).toBe("dip-black");
		expect(at(1200)).toBeNull();
	});
});
