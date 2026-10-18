"use client";

import { useEditor } from "@/editor/use-editor";
import { Slider } from "@/components/ui/slider";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import type { AudioElement, VideoElement } from "@/timeline";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	ZERO_MEDIA_TIME,
} from "@/wasm";

type FadeSlot = "audioFadeIn" | "audioFadeOut";

function FadeSlider({
	label,
	slot,
	element,
	trackId,
}: {
	label: string;
	slot: FadeSlot;
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const editor = useEditor();
	const seconds = mediaTimeToSeconds({ time: element[slot] ?? ZERO_MEDIA_TIME });
	const maxSeconds = Math.max(
		0.1,
		mediaTimeToSeconds({ time: element.duration }),
	);

	const update = ({
		value,
		pushHistory,
	}: {
		value: number;
		pushHistory: boolean;
	}) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						[slot]: value > 0 ? mediaTimeFromSeconds({ seconds: value }) : undefined,
					},
				},
			],
			pushHistory,
		});
	};

	return (
		<SectionField label={`${label} (${seconds.toFixed(1)}s)`}>
			<Slider
				min={0}
				max={maxSeconds}
				step={0.1}
				value={[Math.min(seconds, maxSeconds)]}
				onValueChange={([value]) => update({ value, pushHistory: false })}
				onValueCommit={([value]) => update({ value, pushHistory: true })}
			/>
		</SectionField>
	);
}

export function AudioFadeTab({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	return (
		<Section sectionKey={`${element.id}:fade`} showTopBorder={false}>
			<SectionHeader>
				<SectionTitle>Fade</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<FadeSlider
						label="Fade in"
						slot="audioFadeIn"
						element={element}
						trackId={trackId}
					/>
					<FadeSlider
						label="Fade out"
						slot="audioFadeOut"
						element={element}
						trackId={trackId}
					/>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
