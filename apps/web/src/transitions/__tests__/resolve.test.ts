import { describe, expect, test } from "bun:test";
import {
	applyTransition,
	getTransitionHoldTicks,
	getTransitionProgress,
} from "@/transitions/resolve";
import type { NodeTransition } from "@/transitions/types";

const baseTransform = {
	scaleX: 1,
	scaleY: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

function transition(overrides: Partial<NodeTransition>): NodeTransition {
	return {
		type: "dissolve",
		direction: "left",
		duration: 100,
		role: "in",
		...overrides,
	};
}

describe("getTransitionProgress", () => {
	test("incoming clip progresses over its first `duration` ticks", () => {
		const t = transition({ role: "in" });
		expect(getTransitionProgress({ transition: t, clipTime: 0, clipDuration: 500 })).toBe(0);
		expect(getTransitionProgress({ transition: t, clipTime: 50, clipDuration: 500 })).toBe(0.5);
		expect(getTransitionProgress({ transition: t, clipTime: 100, clipDuration: 500 })).toBe(1);
		expect(getTransitionProgress({ transition: t, clipTime: 101, clipDuration: 500 })).toBeNull();
	});

	test("outgoing clip progresses after its own end", () => {
		const t = transition({ role: "out" });
		expect(getTransitionProgress({ transition: t, clipTime: 499, clipDuration: 500 })).toBeNull();
		expect(getTransitionProgress({ transition: t, clipTime: 500, clipDuration: 500 })).toBe(0);
		expect(getTransitionProgress({ transition: t, clipTime: 550, clipDuration: 500 })).toBe(0.5);
	});

	test("only the outgoing clip is held past its end", () => {
		expect(getTransitionHoldTicks({ transition: transition({ role: "out" }) })).toBe(100);
		expect(getTransitionHoldTicks({ transition: transition({ role: "in" }) })).toBe(0);
		expect(getTransitionHoldTicks({ transition: undefined })).toBe(0);
	});
});

describe("applyTransition", () => {
	const args = { opacity: 1, transform: baseTransform, canvasWidth: 1000, canvasHeight: 500 };

	test("dissolve fades the incoming clip and leaves the outgoing one opaque", () => {
		const incoming = applyTransition({ ...args, transition: transition({ role: "in" }), progress: 0.25 });
		const outgoing = applyTransition({ ...args, transition: transition({ role: "out" }), progress: 0.25 });
		expect(incoming.opacity).toBe(0.25);
		expect(outgoing.opacity).toBe(1);
	});

	test("slide from left starts off-screen left and pushes the outgoing clip right", () => {
		const t = transition({ type: "slide", direction: "left" });
		const start = applyTransition({ ...args, transition: { ...t, role: "in" }, progress: 0 });
		const end = applyTransition({ ...args, transition: { ...t, role: "in" }, progress: 1 });
		const pushed = applyTransition({ ...args, transition: { ...t, role: "out" }, progress: 1 });
		expect(start.transform.position.x).toBe(-1000);
		expect(end.transform.position.x).toBe(0);
		expect(pushed.transform.position.x).toBe(1000);
	});

	test("wipe adds a split mask only to the incoming clip, travelling across the clip", () => {
		const t = transition({ type: "wipe", direction: "left" });
		const out = applyTransition({ ...args, transition: { ...t, role: "out" }, progress: 0.5 });
		expect(out.mask).toBeNull();
		const early = applyTransition({ ...args, transition: { ...t, role: "in" }, progress: 0 });
		const late = applyTransition({ ...args, transition: { ...t, role: "in" }, progress: 1 });
		expect(early.mask?.type).toBe("split");
		expect(early.mask?.params).toMatchObject({ rotation: 180, centerX: -0.5 });
		expect(late.mask?.params).toMatchObject({ rotation: 180, centerX: 0.5 });
	});
});
