import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";
import { EMOJI_GROUPS } from "./emoji-data";

export const EMOJI_PROVIDER_ID = "emoji";

const EMOJI_SVG_SIZE = 128;
const EMOJI_FONT_FAMILY =
	"'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla',sans-serif";

interface EmojiRecord {
	emoji: string;
	name: string;
	keywords: string;
	groupId: string;
}

function parseEntry({
	entry,
	groupId,
}: {
	entry: string;
	groupId: string;
}): EmojiRecord {
	const [emoji, name, keywords = ""] = entry.split("|");
	return { emoji, name, keywords, groupId };
}

const ALL_EMOJI: EmojiRecord[] = EMOJI_GROUPS.flatMap((group) =>
	group.entries.map((entry) => parseEntry({ entry, groupId: group.id })),
);

/** Stable, URL-safe id value: the emoji's code points in hex, e.g. "2764-fe0f". */
export function emojiToIdValue({ emoji }: { emoji: string }): string {
	return Array.from(emoji)
		.map((character) => (character.codePointAt(0) ?? 0).toString(16))
		.join("-");
}

export function idValueToEmoji({ value }: { value: string }): string | null {
	const parts = value.split("-");
	if (parts.length === 0) return null;
	try {
		const codePoints = parts.map((part) => {
			const parsed = Number.parseInt(part, 16);
			if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0x10ffff) {
				throw new Error("invalid code point");
			}
			return parsed;
		});
		return String.fromCodePoint(...codePoints);
	} catch {
		return null;
	}
}

/** Self-contained SVG so emoji stickers work offline and render the same in the canvas. */
export function buildEmojiUrl({ emoji }: { emoji: string }): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${EMOJI_SVG_SIZE}" height="${EMOJI_SVG_SIZE}" viewBox="0 0 ${EMOJI_SVG_SIZE} ${EMOJI_SVG_SIZE}"><text x="${EMOJI_SVG_SIZE / 2}" y="${EMOJI_SVG_SIZE / 2}" font-size="96" text-anchor="middle" dominant-baseline="central" font-family="${EMOJI_FONT_FAMILY}">${emoji}</text></svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function toStickerItem({ record }: { record: EmojiRecord }): StickerItem {
	return {
		id: buildStickerId({
			providerId: EMOJI_PROVIDER_ID,
			providerValue: emojiToIdValue({ emoji: record.emoji }),
		}),
		provider: EMOJI_PROVIDER_ID,
		name: record.name,
		previewUrl: buildEmojiUrl({ emoji: record.emoji }),
		metadata: { emoji: record.emoji, group: record.groupId },
	};
}

export function searchEmoji({ query }: { query: string }): EmojiRecord[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return ALL_EMOJI;
	return ALL_EMOJI.filter(
		(record) =>
			record.name.includes(normalized) ||
			record.keywords.includes(normalized) ||
			record.emoji === normalized,
	);
}

export const emojiProvider: StickerProvider = {
	id: EMOJI_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const matches = searchEmoji({ query });
		const limit = options?.limit ?? matches.length;
		return {
			items: matches.slice(0, limit).map((record) => toStickerItem({ record })),
			total: matches.length,
			hasMore: matches.length > limit,
		};
	},
	async browse({
		options,
	}: {
		options?: { page?: number; limit?: number };
	}): Promise<StickerBrowseResult> {
		const limit = options?.limit;
		return {
			sections: EMOJI_GROUPS.map((group) => {
				const records = ALL_EMOJI.filter((record) => record.groupId === group.id);
				const visible = limit === undefined ? records : records.slice(0, limit);
				return {
					id: group.id,
					title: group.title,
					items: visible.map((record) => toStickerItem({ record })),
					hasMore: visible.length < records.length,
					layout: "grid" as const,
				};
			}),
		};
	},
	resolveUrl({ stickerId }: { stickerId: string }): string {
		const { providerValue } = parseStickerId({ stickerId });
		const emoji = idValueToEmoji({ value: providerValue });
		return buildEmojiUrl({ emoji: emoji ?? "❓" });
	},
};
