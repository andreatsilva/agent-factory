# Prompt for Astra — Import NEO v2 Asset Pack

You are integrating the attached NEO_Orbital_Reference_Derived_Assets_v2.zip into the existing AI Agent Factory website. Do not regenerate or redraw unrelated pixel art and do not replace the current terminal HUD.

First inspect README.md, manifest.json, atlas.json, scene-layout.json and reference/original_target_composition.png. Treat the original-composition screenshot as the acceptance target for the factory world only, and the existing website as the reference for HUD and functionality.

IMPORTANT: Use the actual RGBA assets provided, not procedural placeholder rectangles. Start by rendering rooms/full_station_connected_reference.png to establish exactly the intended art density and aesthetics. Then implement an interactive layered scene using modular cutouts, props, workers, machinery, corridors, and the atlas manifest. Draw structures/original_connection_network.png at (0,0) under the rooms for exact inter-room bridges. The cutouts are derived from an illustration and some contain baked connectors/overlapping edges; compose and mask them carefully. Keep the complete static station image as a fidelity fallback if modular cutouts degrade the appearance. Preserve existing camera zoom/pan, room selection, production/agent states, NEO controls, factory expansion, real APIs and operational logs.

Treat worker standing and operating frames as distinct illustrated poses, not guaranteed contiguous animation sequences. Maintain pixel-perfect nearest-neighbor scaling. Capture real screenshots and iterate until the space station looks visually faithful. Report any cutout seams that cannot be fully repaired without source-layer art.
