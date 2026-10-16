# Orbital factory scene

The factory world uses the supplied **NEO Orbital Factory Asset Pack v2**. No replacement artwork was generated. The 11 PNG files in `assets/orbital/` are byte-identical copies of the eight category atlases, original connection network, complete-station fallback and NEO hologram portrait. Their source paths and SHA-256 hashes are recorded in `docs/orbital-pack/provenance.json` alongside the supplied instructions and metadata.

## Composition and interaction

`orbital-assets.mjs` records atlas frames, source trim offsets and room placements. `orbital-rooms.mjs` constructs every department and expansion from an empty floor, separate machines, consoles, supports and workbenches. `orbital-scene.mjs` draws these individual pieces with nearest-neighbor sampling. Ordinary rooms no longer use the flattened whole-room illustrations or their baked workers. The supplied central NEO chamber remains a single machine, with crew routed to its landing. The intact station image is only a loading/failure fallback. The supplied composition guides room placement while the existing Matrix terminal HUD remains the interface.

`orbital-map.mjs` translates saved room identities and worker routes into presentation coordinates. SQLite layouts and simulation coordinates are unchanged:

| Existing section | Constructed interior |
| --- | --- |
| Research Lab | Glass research dome, servers and operator benches |
| Product Factory | Industrial fabrication machine and operator benches |
| Website Creator | Triple code display and build workstations |
| NEO Ops / Logistics | Map console and logistics workstations |
| Quality Control | Analytics display and inspection workstations |
| Automation / Data | Three agent pods and control benches |
| Sales Ops | Marketplace display and sales workstations |
| Thumbnail Creators | Visual display and creator workstations |

Sales and thumbnail modules occupy their corresponding rooms within the core station. Other saved bays and crew docks extend the north, east, south or west arms using supplied corridor, floor and machinery sprites. Add/remove previews, revision checks, room inspection and capacity rules remain managed by the existing application. The renderer supports the existing 124-agent roster limit.

**STATION** fits the main station; **OVERVIEW** fits all expansion arms. Sector focus, double-click focus, drag/pinch/wheel zoom, keyboard pan/zoom and the minimap retain their existing controls. This keeps the station readable even when long crew-dock arms exist.

## Live animation

Departments have colored deck reflections, inset guide lights, directional machine shadows and supplied cargo props. The Product Factory uses the supplied connected conveyor machine, with supplied crates moving across its belt only while that room has working or inspecting crew. This is a machine-operation effect, not a count of completed products or inventory. Research drone patrols, chamber particles and pod effects follow the same activity gates. Reduced motion fixes these effects to a static frame; idle/offline rooms have steady dim lighting. Selected rooms also highlight their deck corners.

Worker movement follows actual route start/arrival times and destinations, with stable provided standing/operating poses. Different illustrated poses are not treated as contiguous walk frames. The motion tracker preserves a trip when public snapshot polling trims its remaining route. Working and inspecting states activate equipment indicators; stopped or disconnected factories freeze worker activity. Reduced-motion preferences suppress decorative motion. The existing factory render loop controls space drift, ship motion and hologram effects.

Room plates show actual working, QA, inbound, ready, paused or offline activity. A crew dock is counted by its physical destination, so a worker in the website room does not activate every website crew dock. Selected rooms have an amber plate. Plates stay above travelling worker labels for readability. Public snapshots include an optional bounded workstation index, keeping public and local worker positions consistent. Pausing and resuming a trip retains its remaining visual path.

Expansion corridor rendering and worker navigation share centre lines. Vertical bays keep their equipment to either side of the through-walkway. Each room has twelve service positions and solid machine footprints. Cached visibility-graph paths route crew around those footprints. Workers and objects are sorted together by their ground contact, allowing benches to hide workers behind them and workers to overlap machinery from the front aisle. A separate foreground floor rim preserves the deck edge. This is layered 2.5D pixel art, not a polygonal 3D engine; all equipment remains supplied PNG artwork.

The supplied chamber and portrait replace the previous floating NEO in the world, conversation console and operator login. Visitor chat remains read-only; authenticated control, MFA, products, research, production and sales workflows retain their existing APIs and authorization boundaries.

## Source limitations

The pack consists of crops from a composed illustration. Whole-room cutouts contain painted workers and connector fragments, so they are excluded from ordinary room construction. Individual machines can still contain decorative details, such as the figures inside the agent pods. Their artwork is preserved unchanged. Room placement follows the supplied `scene-layout.json`; reconstructed interiors use the available individual pieces rather than reproducing every painted overlap in the reference screenshot.

## Verification

The complete Node suite passes 105 tests. Scene coverage checks source trim metadata, department/module mapping, four expansion arms, real route timing, 124-agent positions, public-poll and pause/resume continuity, public/local workstation parity, per-room activity, actual PNG loading/transparency and paused/reduced-motion frames. Construction tests check every workstation path in every room type, reject whole-room illustration rendering, and compare actual rendered pixels to verify front/behind workbench occlusion. Pages tests check the 40-file public allowlist and cache versioning.

Browser checks cover room focus, station framing, 390px mobile spacing, and isolated start/stop plus preview/build/remove of a constructed server bay with 124 test agents. The real services were reloaded between jobs, preserving the running factory, 70 agents and 280 products at that check. Screenshots and test logs are stored locally in ignored `test-output/`.
