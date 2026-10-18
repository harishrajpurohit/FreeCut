import type { EffectCategory, EffectDefinition } from "@/effects/types";

export type GalleryCategory = "all" | EffectCategory;

export const GALLERY_CATEGORIES: { id: GalleryCategory; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "filter", label: "Filters" },
	{ id: "adjust", label: "Adjust" },
	{ id: "effect", label: "Effects" },
];

export function filterEffects({
	effects,
	query,
	category,
}: {
	effects: EffectDefinition[];
	query: string;
	category: GalleryCategory;
}): EffectDefinition[] {
	const normalizedQuery = query.trim().toLowerCase();

	return effects.filter((effect) => {
		if (category !== "all" && (effect.category ?? "effect") !== category) {
			return false;
		}
		if (!normalizedQuery) {
			return true;
		}
		return (
			effect.name.toLowerCase().includes(normalizedQuery) ||
			effect.keywords.some((keyword) =>
				keyword.toLowerCase().includes(normalizedQuery),
			)
		);
	});
}

export function countByCategory({
	effects,
}: {
	effects: EffectDefinition[];
}): Record<GalleryCategory, number> {
	const counts: Record<GalleryCategory, number> = {
		all: effects.length,
		filter: 0,
		adjust: 0,
		effect: 0,
	};
	for (const effect of effects) {
		counts[effect.category ?? "effect"] += 1;
	}
	return counts;
}
