import { describe, expect, test } from "bun:test";
import {
	buildEmojiUrl,
	emojiProvider,
	emojiToIdValue,
	idValueToEmoji,
	searchEmoji,
} from "@/stickers/providers/emoji";
import { EMOJI_GROUPS } from "@/stickers/providers/emoji-data";

describe("emoji ids", () => {
	test("round-trips single and multi code point emoji", () => {
		for (const emoji of ["😀", "❤️", "✌️", "👍"]) {
			const value = emojiToIdValue({ emoji });
			expect(idValueToEmoji({ value })).toBe(emoji);
		}
	});

	test("rejects garbage ids", () => {
		expect(idValueToEmoji({ value: "zzzz" })).toBeNull();
		expect(idValueToEmoji({ value: "110000" })).toBeNull();
	});

	test("ids contain no characters that break the provider:value format", () => {
		for (const group of EMOJI_GROUPS) {
			for (const entry of group.entries) {
				const value = emojiToIdValue({ emoji: entry.split("|")[0] });
				expect(value).toMatch(/^[0-9a-f]+(-[0-9a-f]+)*$/);
			}
		}
	});
});

describe("emoji data", () => {
	test("every entry has an emoji and a name, and emoji are unique", () => {
		const seen = new Set<string>();
		for (const group of EMOJI_GROUPS) {
			for (const entry of group.entries) {
				const [emoji, name] = entry.split("|");
				expect(emoji?.length).toBeGreaterThan(0);
				expect(name?.length).toBeGreaterThan(0);
				expect(seen.has(emoji)).toBe(false);
				seen.add(emoji);
			}
		}
	});
});

describe("emoji provider", () => {
	test("search matches names and keywords", () => {
		expect(searchEmoji({ query: "birthday" }).length).toBeGreaterThan(1);
		expect(searchEmoji({ query: "LOL" }).map((r) => r.emoji)).toContain("😂");
		expect(searchEmoji({ query: "nonexistentthing" })).toHaveLength(0);
	});

	test("browse returns one titled section per group", async () => {
		const result = await emojiProvider.browse({});
		expect(result.sections).toHaveLength(EMOJI_GROUPS.length);
		expect(result.sections[0].title).toBe(EMOJI_GROUPS[0].title);
	});

	test("resolveUrl produces a self-contained SVG data url", () => {
		const url = emojiProvider.resolveUrl({
			stickerId: `emoji:${emojiToIdValue({ emoji: "🎉" })}`,
		});
		expect(url.startsWith("data:image/svg+xml")).toBe(true);
		expect(decodeURIComponent(url)).toContain("🎉");
		expect(buildEmojiUrl({ emoji: "🎉" })).toBe(url);
	});
});
