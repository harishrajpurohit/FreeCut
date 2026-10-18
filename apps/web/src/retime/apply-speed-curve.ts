import type { EditorCore } from "@/core";
import {
	BatchCommand,
	DeleteElementsCommand,
	InsertElementCommand,
	UpdateElementsCommand,
} from "@/commands";
import type { Command } from "@/commands";
import { clampRetimeRate } from "@/retime/rate";
import {
	buildSpeedCurveSegments,
	type SpeedCurvePreset,
} from "@/retime/speed-curve";
import {
	findTrackInSceneTracks,
	type AudioElement,
	type CreateTimelineElement,
	type VideoElement,
} from "@/timeline";
import { roundMediaTime, TICKS_PER_SECOND } from "@/wasm";

/** Segments shorter than this are not created: they would be a handful of frames. */
const MIN_SEGMENT_SECONDS = 0.1;

export type ApplySpeedCurveResult =
	| { ok: true; segmentCount: number }
	| { ok: false; reason: string };

/**
 * Replaces a clip with consecutive segments that play at different constant
 * speeds. Later clips on the track move to keep the track contiguous, and the
 * whole change is one undo step.
 */
export function applySpeedCurve({
	editor,
	trackId,
	elementId,
	preset,
}: {
	editor: EditorCore;
	trackId: string;
	elementId: string;
	preset: SpeedCurvePreset;
}): ApplySpeedCurveResult {
	const tracks = editor.scenes.getActiveScene().tracks;
	const track = findTrackInSceneTracks({ tracks, trackId });
	const element = track?.elements.find((entry) => entry.id === elementId);
	if (!track || !element) {
		return { ok: false, reason: "Clip not found" };
	}
	if (element.type !== "video" && element.type !== "audio") {
		return { ok: false, reason: "Speed curves apply to video and audio clips" };
	}

	const segments = buildSpeedCurveSegments({
		source: {
			startTime: element.startTime,
			duration: element.duration,
			trimStart: element.trimStart,
			trimEnd: element.trimEnd,
			rate: element.retime?.rate ?? 1,
		},
		rates: preset.rates,
		minSegmentDuration: MIN_SEGMENT_SECONDS * TICKS_PER_SECOND,
	});
	if (!segments) {
		return { ok: false, reason: "Clip is too short for this curve" };
	}

	const maintainPitch = element.retime?.maintainPitch ?? false;
	const originalEnd = element.startTime + element.duration;
	const newEnd = segments[segments.length - 1].startTime + segments[segments.length - 1].duration;
	const delta = newEnd - originalEnd;

	const laterElements = track.elements.filter(
		(entry) => entry.id !== elementId && entry.startTime >= originalEnd,
	);
	const shiftCommand =
		laterElements.length > 0 && delta !== 0
			? new UpdateElementsCommand({
					updates: laterElements.map((entry) => ({
						trackId,
						elementId: entry.id,
						patch: {
							startTime: roundMediaTime({ time: entry.startTime + delta }),
						},
					})),
				})
			: null;

	const { id: _id, ...elementWithoutId } = element;
	const insertCommands = segments.map((segment, index) => {
		const isFirst = index === 0;
		const isLast = index === segments.length - 1;
		const next = {
			...elementWithoutId,
			name: `${element.name} ${index + 1}`,
			startTime: roundMediaTime({ time: segment.startTime }),
			duration: roundMediaTime({ time: segment.duration }),
			trimStart: roundMediaTime({ time: segment.trimStart }),
			trimEnd: roundMediaTime({ time: segment.trimEnd }),
			retime: {
				rate: clampRetimeRate({ rate: segment.rate }),
				maintainPitch,
			},
			// Keyframes are positioned in the original clip's time and no longer line up.
			animations: undefined,
			audioFadeIn: isFirst ? element.audioFadeIn : undefined,
			audioFadeOut: isLast ? element.audioFadeOut : undefined,
			...(element.type === "video" && {
				transition: isFirst ? (element as VideoElement).transition : undefined,
			}),
		} as Omit<VideoElement | AudioElement, "id">;

		return new InsertElementCommand({
			element: next as CreateTimelineElement,
			placement: { mode: "explicit", trackId },
		});
	});

	const deleteCommand = new DeleteElementsCommand({
		elements: [{ trackId, elementId }],
	});

	// Make room before inserting when the clip grows; close the gap after when it shrinks.
	const commands: Command[] =
		delta > 0
			? [
					...(shiftCommand ? [shiftCommand] : []),
					deleteCommand,
					...insertCommands,
				]
			: [
					deleteCommand,
					...insertCommands,
					...(shiftCommand ? [shiftCommand] : []),
				];

	editor.command.execute({ command: new BatchCommand(commands) });
	return { ok: true, segmentCount: segments.length };
}
