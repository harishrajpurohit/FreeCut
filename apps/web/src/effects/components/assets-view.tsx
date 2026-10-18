"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { effectsRegistry, EFFECT_TARGET_ELEMENT_TYPES } from "@/effects";
import {
	countByCategory,
	filterEffects,
	GALLERY_CATEGORIES,
	type GalleryCategory,
} from "@/effects/gallery";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import { useEditor } from "@/editor/use-editor";
import { buildEffectElement } from "@/timeline/element-utils";
import type { EffectDefinition } from "@/effects/types";

export function EffectsView() {
	const effects = effectsRegistry.getAll();
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<GalleryCategory>("all");

	const counts = useMemo(() => countByCategory({ effects }), [effects]);
	const visibleEffects = useMemo(
		() => filterEffects({ effects, query, category }),
		[effects, query, category],
	);

	return (
		<PanelView title="Effects">
			<div className="flex flex-col gap-3">
				<Input
					size="sm"
					variant="default"
					placeholder="Search filters and effects..."
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					showClearIcon
					onClear={() => setQuery("")}
					className="w-full"
					containerClassName="w-full"
				/>
				<Tabs
					value={category}
					onValueChange={(value) => setCategory(value as GalleryCategory)}
					variant="underline"
				>
					<TabsList aria-label="Effect categories">
						{GALLERY_CATEGORIES.filter(
							(entry) => entry.id === "all" || counts[entry.id] > 0,
						).map((entry) => (
							<TabsTrigger key={entry.id} value={entry.id}>
								{entry.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{visibleEffects.length > 0 ? (
					<EffectsGrid effects={visibleEffects} />
				) : (
					<p className="text-muted-foreground py-6 text-center text-sm">
						No filters or effects match your search.
					</p>
				)}
			</div>
		</PanelView>
	);
}

function EffectsGrid({ effects }: { effects: EffectDefinition[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
		>
			{effects.map((effect) => (
				<EffectItem key={effect.type} effect={effect} />
			))}
		</div>
	);
}

function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const render = () => {
			if (canvasRef.current) {
				effectPreviewService.renderPreview({
					effectType,
					params: {},
					targetCanvas: canvasRef.current,
				});
			}
		};

		render();
		return effectPreviewService.onPreviewImageReady({ callback: render });
	}, [effectType]);

	return <canvas ref={canvasRef} className="size-full" />;
}

function EffectItem({ effect }: { effect: EffectDefinition }) {
	const editor = useEditor();

	const handleAddToTimeline = useCallback(() => {
		const currentTime = editor.playback.getCurrentTime();
		const element = buildEffectElement({
			effectType: effect.type,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
	}, [editor, effect.type]);

	const preview = <EffectPreviewCanvas effectType={effect.type} />;

	return (
		<DraggableItem
			name={effect.name}
			preview={preview}
			dragData={{
				id: effect.type,
				name: effect.name,
				type: "effect",
				effectType: effect.type,
				targetElementTypes: EFFECT_TARGET_ELEMENT_TYPES,
			}}
			onAddToTimeline={handleAddToTimeline}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}
