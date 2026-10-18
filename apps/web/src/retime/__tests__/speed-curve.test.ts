import { describe, expect, test } from "bun:test";
import {
	buildSpeedCurveSegments,
	SPEED_CURVE_PRESETS,
} from "@/retime/speed-curve";

const source = {
	startTime: 1000,
	duration: 8000,
	trimStart: 500,
	trimEnd: 300,
	rate: 1,
};

describe("buildSpeedCurveSegments", () => {
	test("covers the clip's source footage contiguously with no gaps or overlap", () => {
		const segments = buildSpeedCurveSegments({
			source,
			rates: [1, 2, 0.5, 4],
			minSegmentDuration: 1,
		});
		expect(segments).not.toBeNull();
		const list = segments ?? [];
		expect(list).toHaveLength(4);

		// First slice starts where the clip started, last ends at the original trimEnd.
		expect(list[0].trimStart).toBe(source.trimStart);
		expect(list[list.length - 1].trimEnd).toBe(source.trimEnd);

		for (let i = 1; i < list.length; i++) {
			const previousEnd = list[i - 1].startTime + list[i - 1].duration;
			expect(list[i].startTime).toBe(previousEnd);

			// Source consumed by a segment ends exactly where the next one begins.
			const previousSourceEnd =
				list[i - 1].trimStart + list[i - 1].duration * list[i - 1].rate;
			expect(Math.abs(list[i].trimStart - previousSourceEnd)).toBeLessThanOrEqual(2);
		}
	});

	test("segment length follows the inverse of its rate", () => {
		const list =
			buildSpeedCurveSegments({
				source,
				rates: [1, 2, 0.5, 4],
				minSegmentDuration: 1,
			}) ?? [];
		// Each slice is 2000 source ticks.
		expect(list[0].duration).toBe(2000);
		expect(list[1].duration).toBe(1000);
		expect(list[2].duration).toBe(4000);
		expect(list[3].duration).toBe(500);
	});

	test("uses the clip's existing rate to size the source span", () => {
		const list =
			buildSpeedCurveSegments({
				source: { ...source, rate: 2 },
				rates: [1, 1],
				minSegmentDuration: 1,
			}) ?? [];
		// 8000 timeline ticks at 2x covers 16000 source ticks.
		expect(list[0].duration + list[1].duration).toBe(16000);
	});

	test("refuses when any segment would be too short", () => {
		expect(
			buildSpeedCurveSegments({
				source,
				rates: [1, 4],
				minSegmentDuration: 2000,
			}),
		).toBeNull();
		expect(
			buildSpeedCurveSegments({ source, rates: [], minSegmentDuration: 1 }),
		).toBeNull();
	});
});

describe("SPEED_CURVE_PRESETS", () => {
	test("have unique ids and positive rates", () => {
		const ids = SPEED_CURVE_PRESETS.map((preset) => preset.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const preset of SPEED_CURVE_PRESETS) {
			expect(preset.rates.every((rate) => rate > 0)).toBe(true);
		}
	});
});
