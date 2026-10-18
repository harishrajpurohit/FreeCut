import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import {
	TEXT_STYLE_PRESETS,
	textStyleToParams,
	type TextStylePreset,
} from "@/text/presets";
import type { MediaTime } from "@/wasm";

export function TextView() {
	const editor = useEditor();

	const addText = ({
		currentTime,
		preset,
	}: {
		currentTime: MediaTime;
		preset?: TextStylePreset;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: {
				...DEFAULTS.text.element,
				name: preset?.name ?? DEFAULTS.text.element.name,
				params: {
					...DEFAULTS.text.element.params,
					...(preset ? textStyleToParams({ style: preset.style }) : {}),
				},
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<PanelView title="Text">
			<div className="flex flex-col gap-4">
				<DraggableItem
					name="Default text"
					preview={
						<div className="bg-accent flex size-full items-center justify-center rounded">
							<span className="text-xs select-none">Default text</span>
						</div>
					}
					dragData={{
						id: "temp-text-id",
						type: DEFAULTS.text.element.type,
						name: DEFAULTS.text.element.name,
						content: "Default text",
					}}
					aspectRatio={1}
					onAddToTimeline={({ currentTime }) => addText({ currentTime })}
					shouldShowLabel={false}
				/>
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">Styles</span>
					<div className="grid grid-cols-2 gap-2">
						{TEXT_STYLE_PRESETS.map((preset) => (
							<DraggableItem
								key={preset.id}
								name={preset.name}
								preview={
									<div className="bg-accent flex size-full items-center justify-center rounded">
										<span
											className="text-sm leading-tight select-none"
											style={preset.previewStyle}
										>
											{preset.name}
										</span>
									</div>
								}
								dragData={{
									id: `text-preset-${preset.id}`,
									type: DEFAULTS.text.element.type,
									name: preset.name,
									content: preset.name,
								}}
								isDraggable={false}
								aspectRatio={1.6}
								onAddToTimeline={({ currentTime }) =>
									addText({ currentTime, preset })
								}
								shouldShowLabel={false}
							/>
						))}
					</div>
				</div>
			</div>
		</PanelView>
	);
}
