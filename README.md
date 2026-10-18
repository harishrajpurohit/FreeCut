# FreeCut

A free, open-source, browser-based video editor with CapCut-style features. Your videos stay on your device.

FreeCut is a fork of [OpenCut](https://github.com/OpenCut-app/opencut-classic) (the "classic" web editor) that adds new editing features on top of it. It is released under the same MIT license. Full credit for the original editor, timeline, renderer and Rust/WASM core goes to the OpenCut contributors.

## What FreeCut adds

Everything below is new in this fork. The base editor (multi-track timeline, keyframes, masks, subtitles, GPU renderer, MP4/WebM export) comes from OpenCut.

### Filters and effects
- **14 color filters** on a new GPU shader: Vivid, Warm, Cool, Black & White, Vintage, Sepia, Noir, Faded, Cinematic, Golden hour, Dreamy, Cyberpunk, Adjust (brightness, contrast, saturation, temperature, hue) and Vignette.
- **Effects gallery** with live previews, search, and All / Filters / Adjust / Effects tabs.

### Transitions
- **Dissolve, Slide and Wipe** between adjacent clips on the same track, with direction (left, right, up, down) and duration controls in a new **Transition** tab. Works for video and image clips.

### Text and captions
- **8 text style presets** in the Text panel: Classic, Bold title, Yellow, Black box, Highlight, Neon, Elegant, Impact.
- **Text animations**: separate intro and outro animations (Fade, Pop, Slide up, Slide down, Zoom) with adjustable duration, in a new **Animation** tab.
- **Caption style picker**: choose a style preset for auto-generated captions. Auto-captions (Whisper) and SRT/ASS import are inherited from OpenCut.

### Audio and speed
- **Audio fade in / fade out** for audio clips and for video clips with sound, applied in playback, waveforms and export.
- **Speed curves**: Ramp up, Ramp down, Hero, Bullet, Flash in, Flash out and Pulse. A curve splits the clip into segments that play at different speeds, in a single undo step, and each segment's speed stays editable.

### Stickers
- **Emoji stickers**: a new offline Emoji tab with 104 emoji in 6 groups, with search.

### Fixes to the original code
- Sticker providers were never registered, so every sticker tab was empty.
- Scene effects failed to render in a locally built WASM package (a field-name mismatch between the TypeScript and Rust sides).
- Legacy project migrations opened a database named "undefined" and migrated nothing.
- Keybinding persistence imported two helper functions that did not exist, so its tests could not run.

### Status

| Area | Checked |
|---|---|
| Filters, gallery, dissolve, wipe, text presets, text fade, audio fade, speed curve (Ramp up), emoji, MP4 export | Tried in the running editor |
| Slide transition, other text animations, other speed curves, fade out | Unit tests only |
| Caption style picker | Not run (needs a Whisper model download) |

## Getting started

### Prerequisites

- [Bun](https://bun.sh/docs/installation)
- [Rust](https://rustup.rs/) with the `wasm32-unknown-unknown` target and [`wasm-pack`](https://rustwasm.github.io/wasm-pack/). **Required:** the color filters and the scene-effects fix live in the Rust crates, and the published `opencut-wasm` package does not include them, so you must build the WASM package locally (see below).
- On Windows: the Visual Studio Build Tools with the C++ workload (needed by Rust).
- Docker is optional. The editor itself runs without the database and Redis.

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/harishrajpurohit/FreeCut.git
   cd FreeCut
   bun install
   ```

2. Copy the environment file:

   ```bash
   # Unix/Linux/Mac
   cp apps/web/.env.example apps/web/.env.local

   # Windows PowerShell
   Copy-Item apps/web/.env.example apps/web/.env.local
   ```

3. Build the WASM package and link it into the web app:

   ```bash
   bun run build:wasm

   cd rust/wasm/pkg
   bun link

   cd ../../../apps/web
   bun link opencut-wasm
   ```

   Re-run `bun run build:wasm` after changing anything under `rust/`. Running `bun install` again can replace the linked package, so repeat the `bun link opencut-wasm` step if filters stop appearing.

4. Start the dev server:

   ```bash
   bun dev:web
   ```

The app is available at [http://localhost:3000](http://localhost:3000).

### Optional services

The Sounds library search needs a local Redis (see `docker-compose.yml`); without it that one API route returns a 500, and everything else works. To run the database and Redis:

```bash
docker compose up -d db redis serverless-redis-http
```

### Tests and type checking

```bash
cd apps/web
bun test
bunx tsc --noEmit
```

Four test files import the WASM bundle, which `bun test` cannot initialize, so they fail in that runner. This is not caused by FreeCut's changes.

### Desktop app

The native desktop app (`apps/desktop`, built with GPUI) is inherited from OpenCut and is still in progress. See [`apps/desktop/README.md`](apps/desktop/README.md).

## Project structure

- `apps/web/`: Next.js web application
- `apps/desktop/`: Native desktop app built with GPUI (in progress)
- `rust/`: Platform-agnostic core: GPU compositor, effects, masks and WASM bindings
- `docs/`: Architecture and subsystem documentation, including [how to add an effect](docs/effects-renderer.md)

Where the new features live:

| Feature | Location |
|---|---|
| Filters | `rust/crates/effects/src/shaders/color_adjust.wgsl`, `apps/web/src/effects/definitions/color-adjust.ts` |
| Effects gallery | `apps/web/src/effects/gallery.ts`, `apps/web/src/effects/components/` |
| Transitions | `apps/web/src/transitions/` |
| Text presets and animations | `apps/web/src/text/` |
| Audio fades | `apps/web/src/timeline/audio-fade.ts` |
| Speed curves | `apps/web/src/retime/speed-curve.ts`, `apps/web/src/retime/apply-speed-curve.ts` |
| Emoji stickers | `apps/web/src/stickers/providers/emoji.ts` |

## Known limitations

- The logo images are still OpenCut's artwork. Only the text name was changed to FreeCut.
- Package and crate names (`opencut-wasm`, `@opencut/*`) and local storage keys were left unchanged so installs and saved data keep working.
- Speed curves approximate a ramp with several constant-speed segments rather than a continuous curve, and keyframes on the original clip are not carried onto the segments.

## Acknowledgements and license

FreeCut is built on [OpenCut](https://github.com/OpenCut-app/opencut-classic) by the OpenCut contributors. Upstream development continues at [opencut-app/opencut](https://github.com/opencut-app/opencut).

Released under the [MIT License](LICENSE).
