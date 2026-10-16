# NEO ORBITAL FACTORY — REFERENCE-DERIVED ASSET PACK v2

**Built from the actual transparent pixel-art atlases generated for your requested scene.**
Not an unrelated new artwork style and not an AI recreation of objects using flat vector shapes.

## Contents
- 203 individual transparent PNG assets, including pose strips and an original-composition fallback
- 10 independent manually selected room / central-structure cutouts
- 54 structure/corridor/floor pieces isolated by connected components
- 14 standing worker poses and 13 operating worker poses
- Individual terminals, computers, servers, station machinery, drones, spacecraft, planets and asteroids
- Original high-resolution RGBA sprite atlases in `atlases/source_*`
- Repacked sprite atlases per category and `atlas.json` frame coordinates
- `manifest.json`: every sprite's dimensions, anchor, source atlas, original crop rectangle, and output path
- `scene-layout.json`: suggested original room positions for reconstruction
- `previews/contact_sheet.png` and `previews/rooms_reassembled.png`
- `reference/original_target_composition.png`: user's intended original visual arrangement

## Crucial accuracy note
The original reference picture is a **composited illustration**, not a layered design file. The room graphics in source atlas 1 are partly joined by drawn connectors, so some manually separated room sprites can contain connector fragments, seams, or overlapping boundaries. They are actual crops of the image-derived art, not fully independent, perfectly seamless production illustrations. The complete connected station sprite provides the most faithful immediate look.

The worker sprites show **different illustrated poses**, not a verified chronological animation sequence. Do not play them in order assuming motion continuity.

Some background details and multi-object sprites may still appear together where they were originally painted as a single connected silhouette. Inspect `previews/contact_sheet.png` and adjust selections as needed.

## How to integrate with Astra
1. Keep existing terminal HUD and all factory logic unchanged. Do not replace it with the decorative HUD from the visual target screenshot.
2. Load `rooms/full_station_connected_reference.png` initially as a pixel-exact visual baseline (RGBA, no full-page image).
3. Use `scene-layout.json` to position modular room assets for interactive controls, focusing, real status lighting and future dynamic expansion.
4. Use the individual sprites in `workers/`, `machinery/`, `screens/`, `structures/`, `space/`, and `neo/` as world elements.
5. Use the per-category PNG atlases and `atlas.json` when rendering from PixiJS/WebGL.
6. Use `image-rendering: pixelated` or nearest filtering; never blur the pixel details.
7. Keep the original space backgrounds separate so camera parallax is possible.
8. Bind actual factory status and agent IDs to animations; no fake orders or revenue data.
9. Review screenshots against `reference/original_target_composition.png` before accepting changes.

## Transparency
Files are RGBA PNG with transparent background. They were saved from RGBA sources with faint background alpha haze (<15/255) removed. Some faint edge halos may persist; treat them as an original source limitation.

## Inventory
- machinery: 30
- neo: 2
- props: 5
- rooms: 11
- screens: 14
- space: 33
- structures: 71
- workers: 37

## Attribution / derivative source
The art is derived from the reference pixel-art sheets generated in this conversation for the user. The reference composition screenshot and source atlases are included solely as implementation reference and assets for this user's project.
