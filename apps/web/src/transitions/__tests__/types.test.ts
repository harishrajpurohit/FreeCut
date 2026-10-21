import { describe, expect, test } from "bun:test";
import { TRANSITION_TYPES } from "@/transitions/constants";
import { applyTransition } from "@/transitions/resolve";
import type { NodeTransition, TransitionType } from "@/transitions/types";

const baseTransform = {
	scaleX: 1,
	scaleY: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

const canvas = { canvasWidth: 1000, canvasHeight: 500 };

function run({
	type,
	role,
	progress,
	direction = "left",
}: {
	type: TransitionType;
	role: "in" | "out";
	progress: number;
	direction?: NodeTransition["direction"];
}) {
	return applyTransition({
		transition: { type, direction, duration: 100, role },
		progress,
		opacity: 1,
		transform: baseTransform,
		...canvas,
	});
}

function brightnessOf(result: ReturnType<typeof run>): number {
	const pass = result.effectPasses[0]?.[0];
	return typeof pass?.uniforms.u_brightness === "number"
		? pass.uniforms.u_brightness
		: Number.NaN;
}

describe("transition catalogue", () => {
	test("every type is listed once and renders without throwing at any progress", () => {
		const types = TRANSITION_TYPES.map((entry) => entry.type);
		expect(new Set(types).size).toBe(types.length);
		expect(types.length).toBeGreaterThanOrEqual(13);

		for (const type of types) {
			for (const role of ["in", "out"] as const) {
				for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
					const result = run({ type, role, progress });
					expect(Number.isFinite(result.opacity)).toBe(true);
					expect(result.opacity).toBeGreaterThanOrEqual(0);
					expect(result.opacity).toBeLessThanOrEqual(1);
					expect(Number.isFinite(result.transform.scaleX)).toBe(true);
				}
			}
		}
	});

	test("every type ends with the incoming clip fully shown and untransformed", () => {
		for (const { type } of TRANSITION_TYPES) {
			const end = run({ type, role: "in", progress: 1 });
			expect(end.opacity).toBe(1);
			expect(end.transform.position).toEqual({ x: 0, y: 0 });
			expect(end.transform.scaleX).toBeCloseTo(1, 5);
			expect(end.transform.rotate).toBeCloseTo(0, 5);
		}
	});

	test("every type starts with the incoming clip hidden or displaced", () => {
		for (const { type } of TRANSITION_TYPES) {
			const start = run({ type, role: "in", progress: 0 });
			const hiddenOrMoved =
				start.opacity < 1 ||
				start.transform.position.x !== 0 ||
				start.transform.position.y !== 0 ||
				start.transform.scaleX !== 1 ||
				start.mask !== null;
			expect(hiddenOrMoved).toBe(true);
		}
	});
});

describe("cover", () => {
	test("slides the incoming clip in while the outgoing clip stays still", () => {
		const incoming = run({ type: "cover", role: "in", progress: 0, direction: "right" });
		const outgoing = run({ type: "cover", role: "out", progress: 1, direction: "right" });
		expect(incoming.transform.position.x).toBe(1000);
		expect(outgoing.transform.position).toEqual({ x: 0, y: 0 });
	});
});

describe("dip to black / flash", () => {
	test("outgoing clip fades to black by the midpoint", () => {
		expect(brightnessOf(run({ type: "dip-black", role: "out", progress: 0 }))).toBe(0);
		expect(brightnessOf(run({ type: "dip-black", role: "out", progress: 0.25 }))).toBe(-0.5);
		expect(brightnessOf(run({ type: "dip-black", role: "out", progress: 0.5 }))).toBe(-1);
	});

	test("incoming clip stays hidden until the midpoint, then comes up from black", () => {
		expect(run({ type: "dip-black", role: "in", progress: 0.4 }).opacity).toBe(0);
		const justAfter = run({ type: "dip-black", role: "in", progress: 0.5 });
		expect(justAfter.opacity).toBe(1);
		expect(brightnessOf(justAfter)).toBe(-1);
		expect(brightnessOf(run({ type: "dip-black", role: "in", progress: 1 }))).toBe(0);
	});

	test("flash uses white instead of black", () => {
		expect(brightnessOf(run({ type: "dip-white", role: "out", progress: 0.5 }))).toBe(1);
	});
});

describe("zoom and spin", () => {
	test("zoom in grows the incoming clip from small", () => {
		const start = run({ type: "zoom-in", role: "in", progress: 0 });
		expect(start.transform.scaleX).toBe(0.5);
		expect(start.opacity).toBe(0);
	});

	test("zoom out starts the incoming clip large", () => {
		expect(run({ type: "zoom-out", role: "in", progress: 0 }).transform.scaleX).toBe(1.5);
	});

	test("spin starts rotated and small", () => {
		const start = run({ type: "spin", role: "in", progress: 0 });
		expect(start.transform.rotate).toBe(-180);
		expect(start.transform.scaleX).toBeCloseTo(0.2, 5);
	});
});

describe("whip pan", () => {
	test("pushes like slide and adds motion blur that peaks mid-way and vanishes at the ends", () => {
		const ends = run({ type: "whip-pan", role: "in", progress: 0, direction: "left" });
		const middle = run({ type: "whip-pan", role: "in", progress: 0.5, direction: "left" });
		expect(ends.transform.position.x).toBe(-1000);
		expect(ends.effectPasses).toHaveLength(0);
		expect(middle.effectPasses[0].length).toBeGreaterThan(0);
	});

	test("blurs vertically when travelling vertically", () => {
		const horizontal = run({ type: "whip-pan", role: "in", progress: 0.5, direction: "left" });
		const vertical = run({ type: "whip-pan", role: "in", progress: 0.5, direction: "up" });
		const first = (r: ReturnType<typeof run>) => r.effectPasses[0][0].uniforms.u_direction;
		expect(first(horizontal)).toEqual([1, 0]);
		expect(first(vertical)).toEqual([1, 0]);
		const secondVertical = vertical.effectPasses[0][1].uniforms.u_sigma as number;
		const secondHorizontal = horizontal.effectPasses[0][1].uniforms.u_sigma as number;
		expect(secondVertical).toBeGreaterThan(secondHorizontal);
	});
});

describe("glitch", () => {
	test("is deterministic for a given progress", () => {
		const a = run({ type: "glitch", role: "in", progress: 0.37 });
		const b = run({ type: "glitch", role: "in", progress: 0.37 });
		expect(a).toEqual(b);
	});

	test("at any moment exactly one of the two clips is visible", () => {
		for (const progress of [0.1, 0.2, 0.33, 0.5, 0.61, 0.8, 0.95]) {
			const incoming = run({ type: "glitch", role: "in", progress }).opacity;
			const outgoing = run({ type: "glitch", role: "out", progress }).opacity;
			expect(incoming + outgoing).toBe(1);
		}
	});
});

describe("iris and box", () => {
	test("start with the incoming clip hidden and grow a centred mask", () => {
		const start = run({ type: "iris", role: "in", progress: 0 });
		expect(start.opacity).toBe(0);

		const half = run({ type: "iris", role: "in", progress: 0.5 });
		expect(half.mask?.type).toBe("ellipse");
		const params = half.mask?.params as { width: number; height: number; centerX: number };
		expect(params.centerX).toBe(0);
		expect(params.width).toBeCloseTo(0.725, 5);
		expect(params.height).toBeCloseTo(0.725, 5);
	});

	test("the shape reaches past the corners by the end", () => {
		const iris = run({ type: "iris", role: "in", progress: 1 }).mask?.params as { width: number };
		const box = run({ type: "box", role: "in", progress: 1 }).mask?.params as { width: number };
		// An ellipse needs sqrt(2) of the clip size to touch the corners; a rectangle needs 1.
		expect(iris.width).toBeGreaterThanOrEqual(Math.SQRT2);
		expect(box.width).toBeGreaterThanOrEqual(1);
	});

	test("do not affect the outgoing clip", () => {
		expect(run({ type: "box", role: "out", progress: 0.5 }).mask).toBeNull();
	});
});
