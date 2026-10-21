"use client";

import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { findTrackInSceneTracks } from "@/timeline";
import {
	ADJACENT_TOLERANCE_TICKS,
	DEFAULT_TRANSITION_SECONDS,
	TRANSITION_TYPES,
	type TransitionType,
} from "@/transitions";
import { mediaTimeFromSeconds } from "@/wasm";

/** Looping CSS previews: layer A is the outgoing clip, layer B the incoming one. */
const PREVIEW_CSS = `
.tr-a, .tr-b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #fff; animation-duration: 1.8s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; animation-fill-mode: both; }
.tr-a { background: #e5486a; }
.tr-b { background: #2f6fed; }
@keyframes trB-dissolve { 0% { opacity: 0 } 70%, 100% { opacity: 1 } }
@keyframes trA-slide { 0% { transform: none } 70%, 100% { transform: translateX(-100%) } }
@keyframes trB-slide { 0% { transform: translateX(100%) } 70%, 100% { transform: none } }
@keyframes trB-cover { 0% { transform: translateX(100%) } 70%, 100% { transform: none } }
@keyframes trB-wipe { 0% { clip-path: inset(0 100% 0 0) } 70%, 100% { clip-path: inset(0 0 0 0) } }
@keyframes trA-dip-black { 0% { filter: brightness(1) } 35%, 100% { filter: brightness(0) } }
@keyframes trB-dip-black { 0%, 35% { opacity: 0; filter: brightness(0) } 36% { opacity: 1; filter: brightness(0) } 70%, 100% { opacity: 1; filter: brightness(1) } }
@keyframes trA-dip-white { 0% { filter: brightness(1) } 35%, 100% { filter: brightness(6) } }
@keyframes trB-dip-white { 0%, 35% { opacity: 0; filter: brightness(6) } 36% { opacity: 1; filter: brightness(6) } 70%, 100% { opacity: 1; filter: brightness(1) } }
@keyframes trB-zoom-in { 0% { transform: scale(.5); opacity: 0 } 70%, 100% { transform: none; opacity: 1 } }
@keyframes trB-zoom-out { 0% { transform: scale(1.6); opacity: 0 } 70%, 100% { transform: none; opacity: 1 } }
@keyframes trB-spin { 0% { transform: rotate(-180deg) scale(.2); opacity: 0 } 70%, 100% { transform: none; opacity: 1 } }
@keyframes trA-whip-pan { 0% { transform: none; filter: blur(0) } 35% { filter: blur(5px) } 70%, 100% { transform: translateX(-100%); filter: blur(0) } }
@keyframes trB-whip-pan { 0% { transform: translateX(100%); filter: blur(0) } 35% { filter: blur(5px) } 70%, 100% { transform: none; filter: blur(0) } }
@keyframes trB-glitch { 0% { opacity: 0 } 12% { opacity: 1; transform: translateX(4px) } 22% { opacity: 0 } 34% { opacity: 1; transform: translateX(-4px); filter: hue-rotate(70deg) } 44% { opacity: 0 } 56% { opacity: 1; transform: translateX(2px) } 66%, 100% { opacity: 1; transform: none; filter: none } }
@keyframes trB-iris { 0% { clip-path: circle(0% at 50% 50%) } 70%, 100% { clip-path: circle(80% at 50% 50%) } }
@keyframes trB-box { 0% { clip-path: inset(50% 50% 50% 50%) } 70%, 100% { clip-path: inset(0 0 0 0) } }
`;

type PreviewAnimation = { a?: string; b: string };

const PREVIEW_ANIMATIONS: Record<TransitionType, PreviewAnimation> = {
	dissolve: { b: "trB-dissolve" },
	slide: { a: "trA-slide", b: "trB-slide" },
	cover: { b: "trB-cover" },
	wipe: { b: "trB-wipe" },
	"dip-black": { a: "trA-dip-black", b: "trB-dip-black" },
	"dip-white": { a: "trA-dip-white", b: "trB-dip-white" },
	"zoom-in": { b: "trB-zoom-in" },
	"zoom-out": { b: "trB-zoom-out" },
	spin: { b: "trB-spin" },
	"whip-pan": { a: "trA-whip-pan", b: "trB-whip-pan" },
	glitch: { b: "trB-glitch" },
	iris: { b: "trB-iris" },
	box: { b: "trB-box" },
};

function TransitionPreview({ type }: { type: TransitionType }) {
	const animation = PREVIEW_ANIMATIONS[type];
	return (
		<div className="relative aspect-video w-full overflow-hidden rounded-sm">
			<div
				className="tr-a"
				style={animation.a ? { animationName: animation.a } : undefined}
			>
				A
			</div>
			<div className="tr-b" style={{ animationName: animation.b }}>
				B
			</div>
		</div>
	);
}

export function TransitionsView() {
	const editor = useEditor();

	const applyTransition = ({ type }: { type: TransitionType }) => {
		const selected = editor.selection.getSelectedElements();
		if (selected.length !== 1) {
			toast.info("Select the clip that should transition in");
			return;
		}

		const { trackId, elementId } = selected[0];
		const tracks = editor.scenes.getActiveScene().tracks;
		const track = findTrackInSceneTracks({ tracks, trackId });
		const element = track?.elements.find((entry) => entry.id === elementId);
		if (!track || !element) return;

		if (element.type !== "video" && element.type !== "image") {
			toast.error("Transitions work on video and image clips");
			return;
		}

		const previous = track.elements
			.filter((entry) => entry.id !== element.id)
			.find(
				(entry) =>
					(entry.type === "video" || entry.type === "image") &&
					Math.abs(entry.startTime + entry.duration - element.startTime) <=
						ADJACENT_TOLERANCE_TICKS,
			);

		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId,
					patch: {
						transition: {
							type,
							direction: element.transition?.direction ?? "left",
							duration:
								element.transition?.duration ??
								mediaTimeFromSeconds({ seconds: DEFAULT_TRANSITION_SECONDS }),
						},
					},
				},
			],
		});

		if (!previous) {
			toast.info(
				"Applied. Place another clip right before this one to see it play",
			);
		}
	};

	return (
		<PanelView title="Transitions">
			<style>{PREVIEW_CSS}</style>
			<div className="flex flex-col gap-3">
				<p className="text-muted-foreground text-xs">
					Select a clip, then click a transition. It plays at the start of the
					clip, blending with the clip right before it. Fine-tune direction and
					duration in the clip's Transition tab.
				</p>
				<div className="grid grid-cols-2 gap-2">
					{TRANSITION_TYPES.map((entry) => (
						<button
							key={entry.type}
							type="button"
							title={entry.description}
							onClick={() => applyTransition({ type: entry.type })}
							className="hover:bg-accent flex flex-col gap-1.5 rounded-md p-1.5 text-left transition-colors"
						>
							<TransitionPreview type={entry.type} />
							<span className="px-0.5 text-xs">{entry.label}</span>
						</button>
					))}
				</div>
			</div>
		</PanelView>
	);
}
