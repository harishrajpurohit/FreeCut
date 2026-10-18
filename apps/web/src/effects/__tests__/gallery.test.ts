import { describe, expect, test } from "bun:test";
import { colorEffectDefinitions } from "@/effects/definitions/color-adjust";
import { blurEffectDefinition } from "@/effects/definitions/blur";
import { countByCategory, filterEffects } from "@/effects/gallery";

const all = [blurEffectDefinition, ...colorEffectDefinitions];

describe("filterEffects", () => {
	test("returns everything for an empty query on All", () => {
		expect(filterEffects({ effects: all, query: "", category: "all" })).toHaveLength(
			all.length,
		);
	});

	test("filters by category", () => {
		const filters = filterEffects({ effects: all, query: "", category: "filter" });
		expect(filters.length).toBeGreaterThan(5);
		expect(filters.every((effect) => effect.category === "filter")).toBe(true);
	});

	test("matches by name or keyword, case-insensitively", () => {
		const bySunset = filterEffects({ effects: all, query: "SUNSET", category: "all" });
		expect(bySunset.map((effect) => effect.type)).toContain("filter-golden-hour");
		const byName = filterEffects({ effects: all, query: "sepia", category: "all" });
		expect(byName.map((effect) => effect.type)).toEqual(["filter-sepia"]);
	});

	test("combines category and query", () => {
		const none = filterEffects({ effects: all, query: "sepia", category: "effect" });
		expect(none).toHaveLength(0);
	});

	test("treats effects without a category as stylized effects", () => {
		const uncategorized = { ...blurEffectDefinition, category: undefined };
		expect(
			filterEffects({ effects: [uncategorized], query: "", category: "effect" }),
		).toHaveLength(1);
	});
});

describe("countByCategory", () => {
	test("counts per category and total", () => {
		const counts = countByCategory({ effects: all });
		expect(counts.all).toBe(all.length);
		expect(counts.filter + counts.adjust + counts.effect).toBe(all.length);
	});
});

describe("color filter presets", () => {
	test("have unique types and keywords for search", () => {
		const types = colorEffectDefinitions.map((effect) => effect.type);
		expect(new Set(types).size).toBe(types.length);
		for (const effect of colorEffectDefinitions) {
			expect(effect.keywords.length).toBeGreaterThan(0);
		}
	});

	test("hidden preset parameters still feed the shader defaults", () => {
		const noir = colorEffectDefinitions.find((e) => e.type === "filter-noir");
		const uniforms = noir?.renderer.passes[0].uniforms({
			effectParams: {},
			width: 100,
			height: 100,
		});
		// Saturation is not a visible control for Noir but must still desaturate fully.
		expect(uniforms?.u_saturation).toBe(-1);
	});
});
