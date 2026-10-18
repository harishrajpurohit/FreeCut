import { describe, expect, test } from "bun:test";
import { resolveFadeGain } from "@/timeline/audio-fade";

const base = { durationSeconds: 10 };

describe("resolveFadeGain", () => {
	test("is 1 with no fades", () => {
		expect(
			resolveFadeGain({ ...base, fadeInSeconds: 0, fadeOutSeconds: 0, localTime: 3 }),
		).toBe(1);
	});

	test("fades in linearly from silence", () => {
		const args = { ...base, fadeInSeconds: 2, fadeOutSeconds: 0 };
		expect(resolveFadeGain({ ...args, localTime: 0 })).toBe(0);
		expect(resolveFadeGain({ ...args, localTime: 1 })).toBe(0.5);
		expect(resolveFadeGain({ ...args, localTime: 2 })).toBe(1);
	});

	test("fades out linearly to silence at the end", () => {
		const args = { ...base, fadeInSeconds: 0, fadeOutSeconds: 2 };
		expect(resolveFadeGain({ ...args, localTime: 8 })).toBe(1);
		expect(resolveFadeGain({ ...args, localTime: 9 })).toBe(0.5);
		expect(resolveFadeGain({ ...args, localTime: 10 })).toBe(0);
	});

	test("overlapping fades multiply and never go negative", () => {
		const args = { durationSeconds: 2, fadeInSeconds: 2, fadeOutSeconds: 2 };
		expect(resolveFadeGain({ ...args, localTime: 1 })).toBe(0.25);
		expect(resolveFadeGain({ ...args, localTime: 3 })).toBe(0);
	});
});
