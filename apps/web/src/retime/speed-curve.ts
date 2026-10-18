import { clampRetimeRate } from "@/retime/rate";

export interface SpeedCurvePreset {
	id: string;
	name: string;
	description: string;
	/** Playback rate for each equal slice of the clip's source footage. */
	rates: number[];
}

export const SPEED_CURVE_PRESETS: SpeedCurvePreset[] = [
	{
		id: "ramp-up",
		name: "Ramp up",
		description: "Slow start, builds to fast",
		rates: [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5],
	},
	{
		id: "ramp-down",
		name: "Ramp down",
		description: "Fast start, settles to slow",
		rates: [3.5, 3, 2.5, 2, 1.5, 1, 0.75, 0.5],
	},
	{
		id: "hero",
		name: "Hero",
		description: "Normal, slow-motion peak, normal",
		rates: [1.5, 1, 0.4, 0.3, 0.3, 0.4, 1, 1.5],
	},
	{
		id: "bullet",
		name: "Bullet",
		description: "Quick cut into an extreme slow-motion beat",
		rates: [1.5, 1.5, 0.2, 0.2, 0.2, 1.5, 1.5, 1.5],
	},
	{
		id: "flash-in",
		name: "Flash in",
		description: "Opens fast, then normal",
		rates: [4, 2.5, 1.5, 1, 1, 1, 1, 1],
	},
	{
		id: "flash-out",
		name: "Flash out",
		description: "Normal, then speeds away",
		rates: [1, 1, 1, 1, 1, 1.5, 2.5, 4],
	},
	{
		id: "pulse",
		name: "Pulse",
		description: "Alternates slow and fast",
		rates: [0.5, 2, 0.5, 2, 0.5, 2, 0.5, 2],
	},
];

/** A segment shorter than this (ticks-agnostic: callers pass the minimum in ticks) is not worth creating. */
export interface SpeedCurveSource {
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	/** Current constant rate of the clip; 1 when unset. */
	rate: number;
}

export interface SpeedCurveSegment {
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	rate: number;
}

/**
 * Splits a clip into one segment per entry of `rates`. Each segment covers an
 * equal slice of the clip's visible source footage, so the picture and audio
 * stay continuous across the cuts; only the playback rate (and so the
 * timeline length) of each slice changes.
 */
export function buildSpeedCurveSegments({
	source,
	rates,
	minSegmentDuration,
}: {
	source: SpeedCurveSource;
	rates: number[];
	minSegmentDuration: number;
}): SpeedCurveSegment[] | null {
	if (rates.length === 0) return null;

	const sourceRate = clampRetimeRate({ rate: source.rate });
	const sourceSpan = source.duration * sourceRate;
	if (!(sourceSpan > 0)) return null;

	const segments: SpeedCurveSegment[] = [];
	let cursor = source.startTime;

	for (let index = 0; index < rates.length; index++) {
		const sliceStart = Math.round((sourceSpan * index) / rates.length);
		const sliceEnd = Math.round((sourceSpan * (index + 1)) / rates.length);
		const rate = clampRetimeRate({ rate: rates[index] });
		const duration = Math.round((sliceEnd - sliceStart) / rate);
		if (duration < minSegmentDuration) return null;

		segments.push({
			startTime: cursor,
			duration,
			trimStart: source.trimStart + sliceStart,
			trimEnd: source.trimEnd + (sourceSpan - sliceEnd),
			rate,
		});
		cursor += duration;
	}

	return segments;
}
