"use client";

import type { ImageElement, VideoElement } from "@/timeline";
import { useEditor } from "@/editor/use-editor";
import { Slider } from "@/components/ui/slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import {
	DEFAULT_TRANSITION_SECONDS,
	MAX_TRANSITION_SECONDS,
	MIN_TRANSITION_SECONDS,
	TRANSITION_DIRECTIONS,
	TRANSITION_TYPES,
	type ElementTransition,
	type TransitionDirection,
	type TransitionType,
} from "@/transitions";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/wasm";

type TransitionTabProps = {
	element: VideoElement | ImageElement;
	trackId: string;
};

const NONE_VALUE = "none";

export function TransitionTab({ element, trackId }: TransitionTabProps) {
	const editor = useEditor();
	const transition = element.transition;
	const typeDefinition = TRANSITION_TYPES.find(
		(entry) => entry.type === transition?.type,
	);

	const updateTransition = ({
		next,
		pushHistory = true,
	}: {
		next: ElementTransition | undefined;
		pushHistory?: boolean;
	}) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch: { transition: next } }],
			pushHistory,
		});
	};

	const handleTypeChange = (value: string) => {
		if (value === NONE_VALUE) {
			updateTransition({ next: undefined });
			return;
		}
		updateTransition({
			next: {
				type: value as TransitionType,
				direction: transition?.direction ?? "left",
				duration:
					transition?.duration ??
					mediaTimeFromSeconds({ seconds: DEFAULT_TRANSITION_SECONDS }),
			},
		});
	};

	const durationSeconds = transition
		? mediaTimeToSeconds({ time: transition.duration })
		: DEFAULT_TRANSITION_SECONDS;

	return (
		<Section sectionKey="transition" showTopBorder={false}>
			<SectionHeader>
				<SectionTitle>Transition</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<p className="text-muted-foreground text-xs">
						Plays at the start of this clip and blends with the clip directly
						before it on the same track.
					</p>
					<SectionField label="Type">
						<Select
							value={transition?.type ?? NONE_VALUE}
							onValueChange={handleTypeChange}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE_VALUE}>None</SelectItem>
								{TRANSITION_TYPES.map((entry) => (
									<SelectItem key={entry.type} value={entry.type}>
										{entry.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					{transition && typeDefinition?.hasDirection && (
						<SectionField label="Direction">
							<Select
								value={transition.direction}
								onValueChange={(value) =>
									updateTransition({
										next: {
											...transition,
											direction: value as TransitionDirection,
										},
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TRANSITION_DIRECTIONS.map((entry) => (
										<SelectItem key={entry.direction} value={entry.direction}>
											{entry.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SectionField>
					)}
					{transition && (
						<SectionField label={`Duration (${durationSeconds.toFixed(1)}s)`}>
							<Slider
								min={MIN_TRANSITION_SECONDS}
								max={MAX_TRANSITION_SECONDS}
								step={0.1}
								value={[durationSeconds]}
								onValueChange={([seconds]) =>
									updateTransition({
										next: {
											...transition,
											duration: mediaTimeFromSeconds({ seconds }),
										},
										pushHistory: false,
									})
								}
								onValueCommit={([seconds]) =>
									updateTransition({
										next: {
											...transition,
											duration: mediaTimeFromSeconds({ seconds }),
										},
									})
								}
							/>
						</SectionField>
					)}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
