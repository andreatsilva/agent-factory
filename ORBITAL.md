# Orbital factory scene

The factory world uses the supplied **NEO Orbital Factory Asset Pack v2**. No replacement artwork was generated. The 11 PNG files in `assets/orbital/` are byte-identical copies of the eight category atlases, original connection network, complete-station fallback and NEO hologram portrait. Their source paths and SHA-256 hashes are recorded in `docs/orbital-pack/provenance.json` alongside the supplied instructions and metadata.

## Composition and interaction

`orbital-assets.mjs` records atlas frames, source trim offsets and room placements. `orbital-scene.mjs` draws the original connection network underneath rooms at `world_xy + trim_offset`, with nearest-neighbor sampling. The intact supplied station is a loading/failure fallback. The original-composition reference guides the art, while the existing Matrix terminal HUD remains the interface.

`orbital-map.mjs` translates saved room identities and worker routes into presentation coordinates. SQLite layouts and simulation coordinates are unchanged:

| Existing section | Supplied room |
| --- | --- |
| Research Lab | Research lab |
| Product Factory | Planner |
| Website Creator | Website creator |
| NEO Ops / Logistics | Sales and support |
| Quality Control | Analytics |
| Automation / Data | Auto scaler |
| Sales Ops | Marketplace operations |
| Thumbnail Creators | Content creation |

Sales and thumbnail modules occupy their corresponding rooms within the core station. Other saved bays and crew docks extend the north, east, south or west arms using supplied corridor, floor and machinery sprites. Add/remove previews, revision checks, room inspection and capacity rules remain managed by the existing application. The renderer supports the existing 124-agent roster limit.

**STATION** fits the main station; **OVERVIEW** fits all expansion arms. Sector focus, double-click focus, drag/pinch/wheel zoom, keyboard pan/zoom and the minimap retain their existing controls. This keeps the station readable even when long crew-dock arms exist.

## Live animation

Worker movement follows actual route start/arrival times and destinations, with stable provided standing/operating poses. Different illustrated poses are not treated as contiguous walk frames. The motion tracker preserves a trip when public snapshot polling trims its remaining route. Working and inspecting states activate equipment indicators; stopped or disconnected factories freeze worker activity. Reduced-motion preferences suppress decorative motion. The existing factory render loop controls space drift, ship motion and hologram effects.

Room plates show actual working, QA, inbound, ready, paused or offline activity. A crew dock is counted by its physical destination, so a worker in the website room does not activate every website crew dock. Selected rooms have an amber plate. Plates stay above travelling worker labels for readability. Public snapshots include an optional bounded workstation index, keeping public and local worker positions consistent. Pausing and resuming a trip retains its remaining visual path.

Expansion corridor rendering and worker navigation share centre lines. Vertical bays keep their consoles, screens, pods and storage to either side of the through-walkway; all equipment remains supplied PNG artwork.

The supplied chamber and portrait replace the previous floating NEO in the world, conversation console and operator login. Visitor chat remains read-only; authenticated control, MFA, products, research, production and sales workflows retain their existing APIs and authorization boundaries.

## Source limitations

The pack consists of crops from a composed illustration. Some rooms include painted workers, machines and connector fragments. Those baked details remain decorative; additional individually tracked sprites represent live agents. Small crop-edge seams and the baked figures cannot be independently animated or removed faithfully without original source layers. The modular room placement follows the supplied `scene-layout.json`; it is not an exact reconstruction of every perspective overlap in the separate reference screenshot.

## Verification

The complete Node suite passes 102 tests. Added coverage checks source trim metadata, department/module mapping, four expansion arms, real route timing, 124-agent rendering positions, public-poll and pause/resume continuity, public/local workstation parity, per-room activity, actual PNG loading/transparency and paused/reduced-motion frames. Pages tests check the complete public allowlist and cache versioning. The nine scene tests were rerun after the final interior-art adjustments.

Browser checks cover the local app and Pages build: room focus, zoom, 390px mobile spacing, NEO console, and isolated start/stop plus preview/build/remove of a bay. The real factory was left paused with its saved 70 active agents and 272 products. Screenshots and test logs are stored locally in ignored `test-output/`.
