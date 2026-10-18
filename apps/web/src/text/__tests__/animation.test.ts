import { describe, expect, test } from "bun:test";
import { resolveTextAnimation, type TextAnimation } from "@/text/animation";
import { textStyleToParams, TEXT_STYLE_PRESETS } from "@/text/presets";

const anim = (type: TextAnimation["type"], duration = 100) =>
	({ type, duration }) as TextAnimation;

const base = { clipDuration: 1000, canvasHeight: 1000 };

describe("resolveTextAnimation", () => {
	test("is identity outside both animation windows", () => {
		const state = resolveTextAnimation({
			...base,
			animationIn: anim("fade"),
			animationOut: anim("fade"),
			clipTime: 500,
		});
		expect(state).toEqual({ opacity: 1, scale: 1, offsetY: 0 });
	});

	test("fade in starts transparent and ends opaque", () => {
		const start = resolveTextAnimation({
			...base,
			animationIn: anim("fade"),
			animationOut: undefined,
			clipTime: 0,
		});
		const end = resolveTextAnimation({
			...base,
			animationIn: anim("fade"),
			animationOut: undefined,
			clipTime: 100,
		});
		expect(start.opacity).toBe(0);
		expect(end.opacity).toBe(1);
	});

	test("out animation plays over the last duration and ends hidden", () => {
		const atEnd = resolveTextAnimation({
			...base,
			animationIn: undefined,
			animationOut: anim("fade"),
			clipTime: 1000,
		});
		expect(atEnd.opacity).toBe(0);
		const before = resolveTextAnimation({
			...base,
			animationIn: undefined,
			animationOut: anim("fade"),
			clipTime: 899,
		});
		expect(before.opacity).toBe(1);
	});

	test("slide-up begins below its rest position, slide-down above", () => {
		const up = resolveTextAnimation({
			...base,
			animationIn: anim("slide-up"),
			animationOut: undefined,
			clipTime: 0,
		});
		const down = resolveTextAnimation({
			...base,
			animationIn: anim("slide-down"),
			animationOut: undefined,
			clipTime: 0,
		});
		expect(up.offsetY).toBeGreaterThan(0);
		expect(down.offsetY).toBeLessThan(0);
	});

	test("pop starts at scale 0 and settles at 1", () => {
		const start = resolveTextAnimation({
			...base,
			animationIn: anim("pop"),
			animationOut: undefined,
			clipTime: 0,
		});
		const end = resolveTextAnimation({
			...base,
			animationIn: anim("pop"),
			animationOut: undefined,
			clipTime: 100,
		});
		expect(start.scale).toBeCloseTo(0, 5);
		expect(end.scale).toBeCloseTo(1, 5);
	});
});

describe("textStyleToParams", () => {
	test("maps background presets onto element params", () => {
		const preset = TEXT_STYLE_PRESETS.find((p) => p.id === "black-box");
		expect(preset).toBeDefined();
		const params = textStyleToParams({ style: preset?.style ?? {} });
		expect(params["background.enabled"]).toBe(true);
		expect(params["background.color"]).toBe("#000000");
		expect(params.fontWeight).toBe("bold");
	});

	test("omits fields a preset does not set", () => {
		const params = textStyleToParams({ style: { color: "#fff" } });
		expect(Object.keys(params)).toEqual(["color"]);
	});
});
