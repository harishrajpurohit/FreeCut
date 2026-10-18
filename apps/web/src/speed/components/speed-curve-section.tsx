"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
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
import { applySpeedCurve } from "@/retime/apply-speed-curve";
import { SPEED_CURVE_PRESETS } from "@/retime/speed-curve";
import type { AudioElement, VideoElement } from "@/timeline";

export function SpeedCurveSection({
	element,
	trackId,
}: {
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	const editor = useEditor();
	const [presetId, setPresetId] = useState(SPEED_CURVE_PRESETS[0].id);
	const preset =
		SPEED_CURVE_PRESETS.find((entry) => entry.id === presetId) ??
		SPEED_CURVE_PRESETS[0];

	const handleApply = () => {
		const result = applySpeedCurve({
			editor,
			trackId,
			elementId: element.id,
			preset,
		});
		if (!result.ok) {
			toast.error(result.reason);
			return;
		}
		toast.success(
			`Applied ${preset.name}: split into ${result.segmentCount} speed segments`,
		);
	};

	return (
		<Section collapsible sectionKey={`${element.id}:speed-curve`}>
			<SectionHeader>
				<SectionTitle>Speed curve</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Preset">
						<Select value={presetId} onValueChange={setPresetId}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPEED_CURVE_PRESETS.map((entry) => (
									<SelectItem key={entry.id} value={entry.id}>
										{entry.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					<p className="text-muted-foreground text-xs">
						{preset.description}. Splits the clip into segments with different
						speeds that you can still adjust individually.
					</p>
					<Button type="button" className="w-full" onClick={handleApply}>
						Apply curve
					</Button>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
