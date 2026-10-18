"use client";

import type { TextElement } from "@/timeline";
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
	DEFAULT_TEXT_ANIMATION_SECONDS,
	MAX_TEXT_ANIMATION_SECONDS,
	MIN_TEXT_ANIMATION_SECONDS,
	TEXT_ANIMATION_TYPES,
	type TextAnimation,
	type TextAnimationType,
} from "@/text/animation";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/wasm";

type TextAnimationTabProps = {
	element: TextElement;
	trackId: string;
};

type AnimationSlot = "animationIn" | "animationOut";

const NONE_VALUE = "none";

function AnimationControls({
	label,
	slot,
	element,
	trackId,
}: {
	label: string;
	slot: AnimationSlot;
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const animation = element[slot];

	const update = ({
		next,
		pushHistory = true,
	}: {
		next: TextAnimation | undefined;
		pushHistory?: boolean;
	}) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch: { [slot]: next } }],
			pushHistory,
		});
	};

	const durationSeconds = animation
		? mediaTimeToSeconds({ time: animation.duration })
		: DEFAULT_TEXT_ANIMATION_SECONDS;

	return (
		<Section sectionKey={`text-${slot}`} showTopBorder={false}>
			<SectionHeader>
				<SectionTitle>{label}</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Style">
						<Select
							value={animation?.type ?? NONE_VALUE}
							onValueChange={(value) =>
								update({
									next:
										value === NONE_VALUE
											? undefined
											: {
													type: value as TextAnimationType,
													duration:
														animation?.duration ??
														mediaTimeFromSeconds({
															seconds: DEFAULT_TEXT_ANIMATION_SECONDS,
														}),
												},
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE_VALUE}>None</SelectItem>
								{TEXT_ANIMATION_TYPES.map((entry) => (
									<SelectItem key={entry.type} value={entry.type}>
										{entry.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					{animation && (
						<SectionField label={`Duration (${durationSeconds.toFixed(1)}s)`}>
							<Slider
								min={MIN_TEXT_ANIMATION_SECONDS}
								max={MAX_TEXT_ANIMATION_SECONDS}
								step={0.1}
								value={[durationSeconds]}
								onValueChange={([seconds]) =>
									update({
										next: {
											...animation,
											duration: mediaTimeFromSeconds({ seconds }),
										},
										pushHistory: false,
									})
								}
								onValueCommit={([seconds]) =>
									update({
										next: {
											...animation,
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

export function TextAnimationTab({ element, trackId }: TextAnimationTabProps) {
	return (
		<div className="flex flex-col">
			<AnimationControls
				label="Intro"
				slot="animationIn"
				element={element}
				trackId={trackId}
			/>
			<AnimationControls
				label="Outro"
				slot="animationOut"
				element={element}
				trackId={trackId}
			/>
		</div>
	);
}
