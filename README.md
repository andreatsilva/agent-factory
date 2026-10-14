# AI Agent Factory — local pixel colony

For the GitHub Pages visual-only frontend and live PC connection, see [PAGES.md](PAGES.md). For credentials, private data and public-service boundaries, see [SECURITY.md](SECURITY.md).

Continue this existing project; do not replace its architecture or layout. `PROJECT_MVP.md` contains the canonical user specification. `ARCHITECTURE.md` describes the real modules and remaining acceptance work.

## Start

Requires Node.js 22.13+. Server thumbnail production uses the locked `@napi-rs/canvas` dependency. The Windows launcher installs it if missing; direct starts require `npm ci` once.

1. First-time local AI setup: `setup_local_ai.bat` downloads official portable Ollama and the two models into `../.runtime` (several GB).
2. Start: `start_factory.bat`.
3. Factory: http://127.0.0.1:8787. Store: http://127.0.0.1:8787/store.html.

Direct commands:

```powershell
npm ci
node --env-file-if-exists=.env server.mjs
node --test test/*.test.mjs
```

Copy `.env.example` to `.env` for optional settings. Never put payment secrets in HTML. The server binds only to loopback; it is a local operator application, not a publicly authenticated storefront.

## Current workflow

- **SYNC RESEARCH** runs modular public metadata adapters: itch.io top-selling digital tools and Hacker News discussions. Marketplace robots.txt is checked. Cache lifetimes are six hours and one hour, respectively. Priced marketplace references support demand hypotheses; discussions alone never authorize production. Unknown sales volumes and complaints stay unknown.
- **RUN NEO CYCLE** performs evidence collection → NEO decision → persisted manufacturing brief → original build → QA/rework → ZIP → catalog. One supported manufacturing profile currently exists: an offline sprite/palette production utility. Unsupported product formats are recorded as rejected rather than fabricated.
- **TEST LOCAL AI** executes a real NEO request. NEO uses `qwen3:8b`; the coding worker uses `qwen2.5-coder:7b`. Requests are sequential, context is bounded, the router evicts the other configured model and models unload after use by default. Unchanged evidence reuses a saved review. Actual token counts are recorded.
- **AGENT MONITOR** shows fourteen persisted worker roles with task, destination, room, health, progress and speed. Workers physically walk along department routes, arrive and remain at stations. They are not fourteen simultaneous LLM processes.
- **STOP FACTORY** freezes positions, pauses new work, aborts heavy inference, saves job checkpoints, unloads configured models and verifies their loaded state. Unverified unload is clearly distinguished. `stop_factory.bat` is also available.
- **START FACTORY** resumes saved routes and checkpointed jobs. Partial products are committed atomically and existing products are deduplicated. Background cycles run every 30 minutes while started.
- **PRODUCT FACTORY** opens operator copies and ZIP downloads. Old prototypes remain available as review-required drafts. **RESEARCH LAB** shows evidence and decisions; **QUALITY CONTROL** shows actual checks; **OPERATIONS / DATA** shows measured model usage.

The factory art is procedural canvas pixel art. Original rooms and central NEO layout remain in place. The supplied image is a style reference only and is not embedded or served.

## Original products and QA

The Sprite Production Workbench includes a local image importer, validated frame-grid calculation, selected-frame PNG export, JSON atlas export, color-frequency palette extraction/export and an original demo sheet. The ZIP also includes a guide, asset register, release checklist, manufacturing brief, market evidence and license.

Market references describe format and pricing only. No competitor code, paid files, artwork, names or prose are used as the product implementation. The utility code is deterministic original code; the local coding model writes concise instructions from the actual feature list.

QA checks required files, script syntax, frame/palette calculations, external-dependency absence, original naming and ZIP CRC/directory integrity. Failed packages are reworked once and withheld if still invalid. Missing NEO validation holds the candidate for review. The latest utility still needs real-browser image import/export acceptance; do not call the expanded MVP stable until that check is complete.

## €20 store

Price is fixed at **2000 euro cents** by SQLite and server-side checkout. The browser cannot override it. Without `STRIPE_SECRET_KEY`, payments remain dormant and checkout asks for an account. No fake live sales are recorded.

Use your own Stripe test-mode key first. The backend retrieves the session from Stripe and requires paid status, EUR, total 2000 and matching product metadata before creating a persistent download token. Repeat verification does not duplicate revenue. Fulfillment returns the validated ZIP. Previously purchased legacy artifacts remain deliverable.

Public hosting, authentication, remote email/webhook fulfillment, tax setup and refunds require additional deployment work. Never expose the local operator export endpoints directly to the Internet.

## Persistence and routes

`data/factory.sqlite` stores agents, jobs/checkpoints, events, source cache/runs, candidates/evidence/decisions, briefs, generated files, QA reports, measured model usage, catalog and orders. Migrations are additive. Stop the server before copying the entire data directory for backup.

| Method | Route | Purpose |
|---|---|---|
| GET | `/`, `/index.html`, `/store.html`, `/success.html` | Factory/store/payment return |
| GET | `/api/status`, `/api/local-ai/status`, `/api/agents` | Runtime/model/worker state |
| GET | `/api/dashboard`, `/api/products`, `/api/opportunities` | Real metrics and catalog |
| GET | `/api/products?status=all` | Operator catalog including retained drafts |
| GET | `/api/research/sources`, `/api/research/candidates` | Source runs, decisions and evidence |
| GET | `/api/product-specs`, `/api/qa`, `/api/usage` | Manufacturing/QA/token records |
| GET | `/api/jobs`, `/api/events?after=ID` | Work history and logs |
| POST | `/api/local-ai/test` | Real NEO inference |
| POST | `/api/neo/think`, `/api/coder/think` | JSON body with `prompt` |
| POST | `/api/research/refresh`, `/api/factory/cycle` | Start background work |
| POST | `/api/factory/start`, `/api/factory/stop` | Checkpoint/resume and gaming mode |
| GET | `/api/products/preview?id=ID` | Store package details |
| GET | `/api/products/export?id=ID` | Operator ZIP; add `view=1` for HTML inspection |
| POST | `/api/checkout/create` | JSON body with `product_id` |
| GET | `/api/orders/status?session_id=ID` | Verify provider payment |
| GET | `/api/download?token=TOKEN` | Verified-order ZIP |

Static files are allowlisted. Secrets, source code and SQLite files are not served. Foreign browser-origin mutations and unexpected Host headers are rejected. External text is escaped and never executed on the server.

## Verification and limits

Eighteen automated groups cover all routes, malformed requests, evidence gates, model failures/retry, source caching, manufacturing, ZIP integrity, price/paid-delivery checks, worker movement, exact freeze and restart persistence. Payment tests use isolated provider fixtures and never charge cards.

The live test collected 43 public signals, saved seven priced references, obtained local NEO approval and built one valid seven-file ZIP. Windows independently extracted the ZIP. Live API samples confirmed physical movement and exact STOP freeze with successful model unload.

See `VALIDATION.md`. Browser access was restored for the camera milestone below. Generated-product image import/export and real-device touch behavior still need acceptance. The expanded MVP is not yet declared stable. Real payment processing remains intentionally unconfigured.

Official references: https://docs.ollama.com/api/generate · https://docs.ollama.com/windows · https://docs.stripe.com/api/checkout/sessions/create

## Game camera and station expansion — 3 October 2026

The core room positions, equipment and worker routes are unchanged. The reference image remains a style reference only.

- Click a department in the sector strip to focus it. Double-click a room to focus without using the strip.
- Drag the canvas to pan; use the mouse wheel or + / − buttons to zoom at the cursor/center. Arrow keys pan while the canvas has focus. Home or OVERVIEW fits the whole saved station.
- The minimap shows the visible area and supports click-to-recenter. Camera movement remains available in gaming mode; it does not start AI work.
- EXPAND opens a builder: choose a side and interior, PREVIEW BAY, then BUILD BAY. Workshop, cargo storage and server interiors are available. These are explicitly unassigned spaces, not new automated production capabilities.
- Up to eight connected bays per arm (32 total) can extend north/east/south/west. Empty outermost bays can be removed through their inspector. Original departments cannot be removed or relocated here.
- Layout changes persist in SQLite via GET/POST /api/layout. Revision checks reject stale edits from another window; reload to pick up changes in other windows. All existing localhost/origin protections apply.

The renderer now uses the actual available canvas dimensions, rather than scaling a fixed image into side margins. Touch pointer pan/pinch handlers are implemented; real-device multi-touch validation remains pending. Eighteen automated groups pass. Desktop browser checks covered all sector buttons, zoom controls, wheel zoom, drag pan, keyboard navigation, minimap navigation, expansion preview/build/reload/removal, and START/STOP. No browser warnings or errors were recorded during those checks.


## Latest visual controls

The factory now uses dimensional steel/copper machinery, riveted floor textures, original animated worker sprites and a layered animated space background. Belts idle empty while powered; real job stages activate production effects. All 14 worker roles rotate through lightweight local inspection rounds between production jobs; these are labeled INSPECTING and have actual saved check results. Click a worker for its task and latest check, or open NEO OPS / LOGISTICS for the inspection ledger. No AI model is loaded for these rounds.

STOP pauses movement, work gestures, machinery, space animation and inspection writes. Camera navigation stays available. The station resumes from its saved routes. See assets/README.md for original character assets and generation prompts. Current automated suite: 22 passing groups.

## Current business MVP (4 October 2026)

Open http://127.0.0.1:8787/ and choose BUSINESS OPS → CONFIGURATION → USE DEMO MODE. Close the panel and press RUN NEO CYCLE. A worker visits Research Lab, NEO scores the queue, a capable builder creates an original website ZIP, QA checks it, and a simulated listing/order window feeds the ledger and a performance decision. Allow about a minute or two for real worker travel. Repeated cycles reuse components and do not recreate an existing fingerprint.

BUSINESS OPS → PRODUCTS / LISTINGS opens previews and ZIP downloads. ECONOMICS shows mode-specific revenue, costs, profit, conversion, queue and capacity. IMPORT / REPORT accepts manual JSON research, incremental sales windows and operating costs. CONFIGURATION holds budgets, thresholds, revision and capacity caps. The mode is always labelled. DEMO money is not real; OPEN LIVE €20 STORE remains the original separate checkout storefront.

TALK TO NEO (or NEO COMMAND) opens the animated binary face and local-model chat. Conversation survives refresh/restart. STOP FACTORY also pauses chat inference; START resumes availability. Chat can discuss the live state and help plan, but factory actions use their explicit controls.

The website deliverable is an editable static starter with documented business/email customization, not a deployed client website. External marketplace adapters currently prepare packages and return MANUAL_ACTION_REQUIRED in LIVE mode. Live public discussions alone do not prove buying demand; supply stronger authorized evidence before production.

Run tests directly with: node --test test/*.test.mjs

Full architecture, limitations and real/simulated distinctions: ARCHITECTURE.md. Milestone request: BUSINESS_MILESTONE.md.

### Manual LIVE listing handoff

In BUSINESS OPS → PRODUCTS / LISTINGS, expand LISTING COPY / PUBLICATION to review the title, description, tags and €20 price. EXPORT LISTING JSON includes QA results, the package file list and ZIP SHA-256 checksum. Download the ZIP and publish through your chosen marketplace account yourself.

For a LIVE package awaiting publication, enter the public HTTPS listing URL and confirm that you already published that exact package at €20. RECORD MANUAL PUBLICATION saves an operator-reported, unverified record locally. It does not contact the marketplace. You can then enter incremental observations in IMPORT / REPORT. No verified payment records are created by this flow.

Economics shows refunds separately and subtracts them from daily/monthly profit. Unpriced cost entries remain visible in both modes. Form drafts survive console polling and view changes within the page; refresh clears unsaved drafts.

## Current workflow: found → made → product page

The business line now uses research-based prices instead of a fixed €20. In BUSINESS OPS → CONFIGURATION select LIVE, then close the panel and RUN NEO CYCLE. The bounded restaurant research adapter fetches public ThemeWagon single-project license metadata, its category context, and current ECB currency rates. It records asking prices and seller-reported purchase counts; these are not audited demand or guaranteed sales. No competing template is downloaded or copied.

Default pricing is 10% below the lowest current comparable paid license, converted to EUR and rounded down to cents. Configure `priceDiscount` (0.1 = 10%). Missing/stale prices, unsupported FX, or an insufficient cost margin block new production. Prices are locked on each product and each sales observation; earlier products/orders retain their historical price. The separate legacy store is unchanged.

First focused deliverable: **Tablelight — Restaurant Website Kit**. Eight original files include a restaurant homepage, six-item sample menu, printable menu, sample menu JSON, listing artwork, license and customization instructions. The kit uses HTML/CSS with no JavaScript, remote fonts or copied artwork. Buyers must replace sample business details before deployment; email enquiries are not confirmed reservations.

After the cycle, open BUSINESS OPS → PRODUCTS / LISTINGS → OPEN PRODUCT PAGE. The page shows FOUND / MADE / PAGE READY, features, preview, operator ZIP download, source prices, exchange-rate date, QA record and exact contents. Pages are local operator previews; external checkout/publication remains a separate step. DEMO exercises the same workflow with clearly labelled fictional price observations.

### Browse completed products
Open http://127.0.0.1:8787/catalog or use OPEN PRODUCT CATALOG in the factory. Search by product name/niche and sort by saved price, name or newest first. Only finished, QA-passed products with packages and listings are shown. Product pages include previews, research and operator ZIP downloads. The default catalog always shows LIVE products; the explicit DEMO link shows simulated products without changing the factory's operating mode. Paused/killed/failed products stay out of the catalog. This is a local catalog preview, not a connected checkout; the legacy toolkit store remains separately accessible from its footer.

## Continuous parallel production
Business Ops → Economics → ENABLE CONTINUOUS / 3 LANES turns on a persistent queue processor. While START FACTORY is active, up to three distinct approved products progress concurrently; each free lane takes the next item without waiting for a 30-minute cycle. Configuration supports 1–4 lanes and a research refresh interval of 1–60 minutes (default five). Current research source caching still applies. STOP cancels all lanes, freezes workers and retains each checkpoint; START or restart resumes the saved batch without duplicating products or orders.

Workers release each station between stages. Three existing website workers can build concurrently; QA and packaging wait for available capable workers. Shared spending limits and per-product QA still apply. The local model router remains single-inference to limit memory use. Status shows the occupied lanes, queued work, budget limits and waiting for research.

The LIVE collector currently covers one restaurant-template opportunity. Continuous mode does not turn that one source into unlimited unique products: more distinct approved research/imports are needed to keep all lanes busy. Duplicate ideas are retained, not manufactured repeatedly. DEMO evidence/orders remain isolated.

The LIVE research registry now checks restaurant, agency, interior studio and business-service template markets. Three additional original kits include a niche-specific website and project-brief worksheet. Source failures are isolated so a broken listing cannot block other families. The current registry is bounded to these four families; it does not generate duplicate products when it runs out of new approved work.

## Persistent marketplace discovery (7 October 2026)
LIVE research now crawls public marketplace category indexes and their next-page links instead of the fixed four product URLs. Each scheduled refresh reads at most two index pages and four listing candidates. The SQLite `market_discovery_LIVE` checkpoint retains pending pages, seen listings, retry counts and an opportunity outbox; a crash before import replays the outbox through the existing fingerprint deduplication. Completed sweeps revisit after 24 hours. Failed listings receive at most three attempts per sweep; interrupted work remains pending.

Business Ops / Economics exposes page and listing counts, the next index, and source rejection/error reasons. Free listings, unsupported formats and missing seller counts do not silently become approved products. Pricing still requires matching public standard-license evidence and current ECB rates. Marketplace counts are seller-reported, not independently verified demand.

Discovery is dynamic; manufacturing is still capability-limited. Supported original kits are restaurant, agency, interior, business and guest accommodation. Multiple comparators in the same niche do not create duplicate products. The accommodation kit includes room/occupancy guidance, arrival information and a guest planning worksheet; it has no booking backend. This is not an unlimited autonomous product-design system.

## Continuous original product planning — 8 October 2026
The fixed-template discovery checkpoint was not enough for continuous output: five supported families deduplicated forever. LIVE continuous mode now invokes local Ollama to design original audience/purpose briefs when the queue runs low. It prepares up to the configured lane count each refill, builds through the safe static renderer, runs QA, and creates product pages. Completed batches trigger another scheduled refill after a 60-second cooldown independently of the five-minute web crawl. No manual imports or button presses are required after START.

Briefs contain original service sections, process steps and enquiry worksheets; generated JSON is schema-constrained, validated and HTML-escaped. Audience/purpose and content overlap checks reject duplicates. Briefs, sequence, retry reasons, packages and queue state persist in SQLite. STOP aborts planning and production through the same factory cancellation path. Invalid model output is rejected and retried on a later refill, not replaced by fake completed work. Business Ops shows the planner state and its latest error.

These are market-informed product hypotheses: observed seller counts and prices refer to the broader comparator, not verified demand for the generated audience. Product pages label that distinction. Published product prices remain immutable; a separate comparator pool can refresh evidence for future designs. Output speed depends on local model inference, QA and source availability. The factory must remain running; checkout and external publication are still separate.

## Local sales workflow — 9 October 2026
Open SALES OPS in the existing factory. This is a separate LOCAL_REHEARSAL workflow; platform accounts remain disconnected, messages are not sent, and its cases never count as business revenue or real client orders.

The first supported offer is a text-led thumbnail pair: two actual 1280 × 720 PNG compositions from a short headline, brand, optional subtitle and accent colour. It uses original geometric artwork and local fonts; it does not perform photographic editing or AI image generation. The initial manual browser renderer has been replaced by the automatic server queue described below.

Flow: complete brief → qualify scope → proposal with editable cost/fee assumptions and a 30% estimated margin floor → approve local test order → produce PNGs → structural PNG validation → explicit visual review → prepare an unsent delivery message → close the local rehearsal. One consolidated revision is included. A failed internal QA review can return work to production without consuming that revision. START/STOP FACTORY gates production. Planning and reviewing local records remain available when paused.

SQLite tables sales_cases and sales_artifacts retain the full case history, proposal, revision notes, visual review and versioned ZIPs. Each ZIP contains two PNGs, brief.json, README.txt and a SHA256 manifest. Replaced versions remain retrievable. The sample maker-channel case demonstrates the full loop with two artifact versions and no real payment or external delivery.

### Automatic local sales production (2026-10-10)

Approve a local test order in SALES OPS while the factory is running. The server takes the oldest eligible QUEUED case, saves its PRODUCING claim, and draws two PNGs in a dedicated worker thread. No browser or Ollama request is needed for these text/geometric compositions. One sales order runs at a time, independently of the existing website production lanes. The browser watches the queue and shows the completed version without replacing an in-progress brief or QA form.

STOP FACTORY terminates the renderer and returns its order to the persisted queue. START resumes queued work. Interrupted PRODUCING claims recover on server restart. Artifacts and case versions commit in one SQLite transaction; visual QA is never automatically approved. Renderer failures retry after 5 and 10 seconds, then become PRODUCTION_FAILED on the third failure. RETRY PRODUCTION starts a new bounded attempt group. Rejected visual QA waits for a changed brief before rerendering; internal correction does not consume the one client revision. A renderer defect still requires a code fix.

Marketplace accounts remain disconnected. Proposals, orders and handoffs are local rehearsals. The worker does not contact clients, send files externally or record real revenue. The old browser image-upload production endpoint now returns 409; production starts only from approved queue entries. The server compositor uses [Skia Canvas](https://github.com/Brooooooklyn/canvas), pinned in package-lock.json.

## Modular production lines and crew — 11 October 2026

SALES OPS and THUMBNAIL CREATORS now occupy connected factory bays. Sector buttons zoom into each line and open its live workflow status. Sales activity moves the sales crew between intake, proposal and delivery stations. An approved thumbnail order claims a creator, collects its brief in Sales Ops, walks back to the render line, then runs the PNG worker. START/STOP remains authoritative for movement and rendering.

`factory-modules.mjs` registers each production module's name, bay, stations, crew and capability. Startup adds missing registered bays without relocating the original core or existing expansions. A new workflow should register its visual module here as part of implementation; decorative EXPAND bays remain unassigned until connected to a workflow.

MANAGE CREW / 124 deploys or reserves capable local roles by department. The factory supports at most 124 saved roles, including reserves; existing reserve roles can be reactivated. Additional roles receive distinct berths in automatically appended twelve-person crew docks. Original crew, busy workers and registered production bays cannot be removed through the empty-bay controls. Saved layout and roles persist in SQLite. Crew capacity is separate from the 1–4 website production lanes, single local model inference, and one thumbnail render order at a time.

## Pixel factory depth — 11 October 2026

The existing canvas scene now has deeper deck slabs, raised rear bulkheads, bevelled machine roofs and sides, cast shadows, supported conveyors, framed proofing screens and low safety rails. Steel plates retain pixel textures and rivets, with stepped wall shading and restrained workstation lighting. The original room coordinates, camera navigation, sprites and space-colony style remain intact. These are layered 2.5D drawings with no extra runtime or downloaded artwork.

The original-product planner now supplies broader history and recent rejection feedback to Ollama, rotates unused design directions, and backs off after empty refills. Full-history duplicate validation still applies. Six new original briefs completed production in two successive live batches after the change; future output still depends on valid model output and research evidence.
