# AI Agent Factory — current architecture and audit

Updated 3 October 2026. `PROJECT_MVP.md` is the user's canonical specification. This file records implementation, not aspirations.

## Existing code retained

- `index.html`: plain HTML/CSS and a 1280×720 canvas. Original department coordinates and procedural equipment are retained. No framework or image backdrop.
- `store.html`, `success.html`: existing plain JavaScript catalog and payment return pages.
- `server.mjs`: Node HTTP server, built-in SQLite, loopback-only service, static allowlist and JSON routes. No runtime npm dependencies.
- `data/factory.sqlite`: persistent settings, jobs, events, opportunities, artifacts and orders. Schema changes are additive.
- Ollama: `qwen3:8b` for reasoning; `qwen2.5-coder:7b` for coding/content. Sequential inference, short context and release after generation. Portable installation in `../.runtime`.
- Windows setup/start/stop scripts and automated Node integration tests.

## Audit against the expanded MVP

Already verified: startup, real Ollama inference, public research retrieval, persistent state, fixed €20 pricing, catalog, payment verification architecture, download authorization, live job cancellation and model unload. Real payments remain intentionally disabled without the user's account.

Gaps identified before incremental work:

1. Workers use looping client paths and inferred states. They need persistent destinations, task assignments, physically meaningful movement and complete STOP freeze.
2. Research is hard-coded to discussion search, without commercial evidence or digital-format selection gates. Popular discussion is not proof of sales.
3. Products use generic validation worksheets and competitor article titles; there are no persisted manufacturing briefs or substantive QA/rework records.
4. Delivery is a single HTML file, not the required validated ZIP.
5. Jobs are cancelled on STOP rather than checkpointed for continuation; retries and model-routing records are incomplete.

## Milestones

- Initial restoration: reconstructed missing backend behind the retained frontend, installed/tested local models, restored SQLite, storefront and START/STOP. See `VALIDATION.md`.
- Expanded-spec audit: copied the exact supplied specification into `PROJECT_MVP.md`; recorded real architecture and gaps here. Next priority: persistent worker motion, then digital-product evidence and manufacturing/QA.

### Implemented after the audit

- `workers.mjs`: shared deterministic movement, station destinations, waypoint routes, position-at-time calculation, arrival, pause and resume. SQLite stores all 14 workers, including name, role, room, destination, task, progress, health, speed and remaining path. The canvas renders these real assignments with articulated humanoid sprites. Original room geometry is unchanged.
- Jobs now checkpoint completed research and saved manufacturing guides. STOP pauses the current job and freezes exact positions. START/restart resumes paused work; already committed products are deduplicated. The router evicts the other configured model before inference; measured token counts are persisted.
- `research.mjs`: independent adapters for public itch.io top-selling tools metadata and Hacker News discussions. Marketplace robots.txt is checked; metadata is cached for six hours (discussions one hour); access/rate-limit responses are not retried. Other transient source failures retry once. No paid files or artwork are downloaded.
- `pipeline.mjs`: evidence gate, saved NEO decisions, cached model review, rejection reasons, manufacturing briefs, bounded coder retry, QA/rework and publication. A discussion signal alone cannot authorize manufacture. Missing NEO review retains the candidate for later review, rather than publishing speculative filler.
- `manufacturing.mjs` and `product-tools.mjs`: original offline sprite-sheet utility with frame slicing, PNG export, JSON atlas, palette extraction/export, original demo, guide, asset register and release checklist. LLM writes concise documentation; deterministic original code implements the utility. No competitor names, code or assets are used as the implementation.
- `zip.mjs`: dependency-free ZIP packaging with CRC32 and central directory. ZIP and contents are checked before the catalog row is committed. Paid delivery now returns the ZIP. Legacy buyer access remains supported.
- Existing generic prototypes are retained as `review_required` drafts. The operator Product Factory inspector can still open them; the store publishes only products passing the new gate.
- Additional SQLite tables: agents, source cache/runs, research evidence, candidate decisions, product specifications, QA reports and measured model usage. Existing tables/records are preserved through additive migrations.
- Inspection endpoints: `/api/agents`, `/api/research/sources`, `/api/research/candidates`, `/api/product-specs`, `/api/qa`, `/api/usage`, and `/api/products?status=all` for operator drafts.

### Current scope and remaining acceptance

One manufacturing profile is implemented end-to-end: a downloadable sprite/palette workflow utility. Unsupported formats are explicitly rejected rather than pretending the factory can build arbitrary software. The default selection is evidence-led; experimental candidates are not automatically published. Customer complaints, true sales counts and global market coverage remain unknown unless an adapter actually observes them.

Fourteen automated test groups pass. A real-source cycle collected 43 signals, saved seven priced marketplace references, obtained NEO approval, generated documentation through the coder and published one seven-file ZIP. Windows `Expand-Archive` independently extracted it. Live API checks observed six workers moving and exact STOP freeze; Ollama confirmed no configured models remained loaded.

Next priority: restore browser approval access, then visually verify the new humanoid motion, room overlays and utility import/export controls on desktop and mobile. The expanded MVP is **not declared stable** until those browser acceptance checks pass. Payment remains dormant until the user connects their own account.

## Validation constraint

Browser automation approval review is currently unavailable because of the account usage limit. Continue code/API/unit verification, but do not claim new visual changes have passed browser acceptance until that access is restored. Do not replace the browser tool with an indirect control mechanism.

## Camera and expandable layout milestone — 3 October 2026

The user requested a game-style camera and expandable station while retaining the existing layout.

`camera.mjs` implements pure viewport/world transforms, cursor-anchored zoom, fit-to-bounds and bounded pan. The existing canvas renderer applies the camera transform around the original world geometry; hit testing applies the inverse. ResizeObserver matches backing dimensions to the available viewport. Camera motion uses short eased transitions (instant for reduced-motion preferences) and wakes rendering even while the factory is stopped; idle redraw remains throttled.

`layout.mjs` defines a fixed original core and deterministic modular bay geometry. Four arms can each hold eight bays. Geometry is checked for non-overlap in tests. Corridors terminate at bay boundaries; the core worker routes are unchanged. These modules are structural expansion space only. Assigning new real production workflows to bays is a future feature and is not simulated.

The server stores the revisioned layout JSON in the existing settings table. GET /api/layout reads it; POST adds or removes an outermost bay. Validation prevents unsupported sides/interiors, stale revisions, disconnected remaining bays and exceeding capacity. Editing the layout in gaming mode does not initiate inference. New browser modules are explicitly included in the static allowlist.

Desktop browser access was restored for this milestone. The new camera controls and the bay save/reload/removal flow passed browser checks without captured errors. All 18 automated groups pass, including restart persistence, stale-edit conflicts, zoom anchor math at multiple viewport sizes, full-layout fitting and preservation of the existing factory workflow. Remaining acceptance: physical multi-touch testing and the previously pending generated-product image import/export checks. No general MVP-stability claim is made.

## Industrial scene, character assets and activity — 3 October 2026

The original rooms and expansion layout are preserved. The canvas now has extruded steel deck edges, shaded machine cabinets, copper mechanisms, worn/riveted floor plates, conveyors, a QA scanning arch and a freight line. A cached pixel nebula and planet sit behind drifting, twinkling stars. World/camera coordinates are unchanged.

Two original transparent PNG sprite sheets provide 16 directional walking frames and 16 tablet/tool work frames. They were generated through the built-in image tool and copied into assets/. See assets/README.md for exact prompts and filenames. worker-sprites.mjs detects alpha bounds so exporter padding cannot crop helmets or boots; the original asset files remain intact. The simple procedural worker is only a loading/error fallback.

Workers on a long-running production job visit their department's service stations while retaining the real task ID. Between jobs, all 14 roles participate fairly in bounded local inspection rounds (maximum four concurrent). These execute inexpensive SQLite checks of saved queues, evidence, briefs, scores, artifacts, prices and fulfillment records. They use no LLM or external network. Inspection states and results are explicit; they do not add products, sales or research signals. The latest result per worker is retained in maintenance_checks and exposed by GET /api/maintenance and the Ops inspector. STOP freezes routes, station dwell timers, factory/space animation and inspection writes. START resumes them. Empty belts represent powered standby; cargo and production machinery activity require the relevant real production stage.

22 automated groups pass. Real browser checks confirmed loaded character assets, textured room views and no warning/error logs. Live API samples confirmed moving workers, persisted inspection results, exact STOP position freeze, no inspection writes during STOP, and successful model unload. Physical multi-touch and the previously pending product import/export browser acceptance are still separate outstanding MVP checks.

## NEO direct link and internal business engine — 4 October 2026

The current iteration is defined by BUSINESS_MILESTONE.md. It extends the original Node/SQLite/canvas application. The original factory rooms, expansion bays, art, Ollama routing, legacy sprite-tool line and real €20 storefront remain present.

### NEO conversation

neo-console.mjs draws an original animated face entirely from 0/1 glyphs on canvas: facial relief, blinking, subtle movement and thinking/reply states. It appears in the direct-link console and the mainframe screen. TALK TO NEO or NEO COMMAND opens the conversation. Enter sends; Shift+Enter adds a line. Reduced-motion preferences and stopped/offline state are respected.

neo-chat.mjs saves turns in neo_conversations, including pending/complete/failed states and model identity. Local qwen3:8b replies use a bounded recent conversation and a fresh factory/business snapshot. Chat is read-only conversation and planning; it has no command executor or external tools. Factory work and chat share the existing single-inference gate. STOP cancels inference; interrupted messages retain an explicit failure. Message IDs prevent duplicate inference after repeated submissions.

### Business modules and persistence

- business-rules.mjs: validated Opportunity schema, stable niche/deliverable/locale fingerprint, transparent weighted score and risk/evidence penalties, configuration constraints and performance decisions.
- business-engine.mjs: queue, deterministic manager decisions, one sequential website job, capability assignment, arrival-aware stages, QA/rework, listing preparation, cost governor, sales reports, variants, bounded capacity and persistence. Existing jobs/checkpoints, agents/routes, settings, logs and database connection are reused.
- website-line.mjs: original reusable responsive website starter. Five real files: index.html, README.md, listing.svg, license.txt, manifest.json. ZIP uses the existing ZIP writer. Intentional customization fields are explicitly documented; this is not a client-deployed website or hosted contact-form service.
- marketplace.mjs: generic MarketplaceAdapter with prepareListing, validateListing, publishListing, updateListing, fetchMetrics, fetchOrders, pauseListing. LIVE writes return MANUAL_ACTION_REQUIRED. The DEMO adapter uses labelled fixtures and stored simulated order/report records. External marketplace APIs are not claimed to be integrated.
- business-console.mjs: terminal panels for economics, queue/workers, products/listings, research and sales/cost import, and configuration. Existing canvas layout remains unchanged. Department inspectors expose their business queue/workers.

Additive SQLite tables: business_opportunities, business_products (product-job lifecycle plus ZIP/HTML), business_listings, business_ledger, business_reports, business_orders, business_decisions, business_qa, business_library, business_sources. Each business dataset carries DEMO/LIVE mode. Original opportunities/products/orders remain intact for the legacy storefront; business demo products never enter its checkout or payment tables.

### Execution and economics

RUN NEO CYCLE uses /api/business/cycle. SYNC RESEARCH uses /api/business/research and only gathers/scores the queue. Scheduled cycles use the business engine. The prior /api/factory/cycle and /api/research/refresh routes remain available for the existing sprite-tool line and regression coverage.

The website line selects the cheapest available provider: original deterministic templates. No premium API or image generation is needed. Production waits for assigned workers to reach their actual department before advancing. STOP freezes workers and checkpoints the job. START/restart resumes without duplicating committed packages or demo initial sales.

Scores use demand 25%, competition opportunity 15%, margin 15%, production ease 10%, automation 15%, repeatability 10%, scalability 10%, followed by explicit penalties. Two references and adequate confidence are mandatory. LIVE public discussion engagement is capped and cannot satisfy the purchase-demand gate by itself. Manual/imported evidence is labelled as such. DEMO fixtures use example.com URLs clearly marked fictional; there is no silent LIVE fallback to fabricated research.

The ledger uses integer cents, unique event IDs and separate revenue/refund/cost kinds. Financial periods use UTC. Product/report/import fingerprints prevent repeated billing, manufacturing and duplicate revenue. Reports are incremental observations with unique IDs; they are not lifetime totals. DEMO orders have SIMULATED_PAID status, no buyers or real payments. LIVE manual reports are operator reports, not verified payment events. The existing storefront independently verifies actual Stripe payments.

Cost governor defaults: €20/day, €1/hour AI budget, €1/product, €0.10/research invocation/opportunity, €0.30/automatic revision, 50% expected margin. Unpriced local inference/runtime costs are marked unknown rather than claimed free. A configured local rate is an estimate. Recorded profit excludes unpriced costs; such products cannot be declared ready to scale on verified profitability. Hosting/advertising/other bills can be manually recorded. External paid providers are disconnected, so no automatic paid calls occur.

QA checks document structure, responsive rules, internal links, assets/scripts, explicit mailto behavior, required files, SVG dimensions, documented customization fields, placeholder errors, ZIP CRC and manifest validity. Default minimum 80; critical failures always block listing. At most one automatic revision by default, configurable up to three. Static checks are not equivalent to a full validator, Lighthouse or legal clearance. Browser acceptance is recorded in VALIDATION.md.

Performance decisions require data: SCALE at sufficient views/orders/conversion and positive priced margin; OPTIMIZE prepares a listing change; PAUSE for poor traction or negative recorded profit; KILL for repeated loss days. Re-evaluating a report does not manufacture a new observation window. SCALE can propose one related original variant, which re-enters scoring. Variants cannot recursively spawn more variants. Reuse is estimated at 85% from shared components; monetary/time savings remain null because no measured counterfactual baseline exists.

Capacity uses a sustained approved website queue, cooldown, total cap and department cap. It adds/reuses capable template workers, and deactivates surplus dynamic workers after idle thresholds. Original workers are retained. Default 18 total maximum, one concurrent production job; extra sprites are persisted workers with actual assignments, not throughput claims or extra LLM concurrency.

### API surface

GET /api/business, /api/business/ledger, /api/business/package?id=... (&view=1 for sandboxed preview), /api/neo/chat.

POST /api/business/config, /import, /cycle, /research, /metrics, /cost, /analyze; POST /api/neo/chat. All retain loopback host and same-origin mutation checks. Imports and reports validate sizes/types and reject cross-mode demo data.

### Real / simulated / remaining integrations

REAL: code generation from original templates, ZIPs, QA, database writes, routes, worker movement, cost and decision arithmetic, persistence, local Ollama chat, public research adapter, manual imports.

SIMULATED in DEMO: market demand evidence, views/clicks/messages/orders, revenue, fees and example production cost. The three demonstration cycles are proof of the internal workflow, not proof of demand or profitability.

NOT CONNECTED / MANUAL ACTION REQUIRED: marketplace account APIs and remote writes, verified platform traffic/order imports, live client fulfillment/hosting, premium AI providers. No account creation, CAPTCHA handling or platform impersonation is implemented. A future LIVE integration needs the user's chosen marketplace account and its permitted API credentials/OAuth where available; otherwise the prepared package is manually published. The existing storefront separately requires the user's Stripe account configuration for real checkout. No new external accounts are needed to run DEMO or local chat.

### Manual listing handoff follow-up

GET /api/business/listing-package?id=... exports mode-scoped listing metadata, latest passing QA, package files and SHA-256. POST /api/business/publication accepts productId, an HTTPS URL without credentials, and confirmed:true. Only LIVE READY products with a QA-passed package awaiting manual publication can transition to LISTED. The transaction updates the listing, product and opportunity together. Identical retries are idempotent; conflicting URLs are rejected. The record is marked OPERATOR_REPORTED_UNVERIFIED, with its timestamp. No URL fetch or external mutation occurs. Manual sales reports can then advance LISTED to SELLING without creating verified payment/order records. DEMO records remain isolated.

The console exposes copy/export/publication controls in the existing product library. In-memory drafts are scoped by mode and field ID, retained across polling/view changes, and cleared after successful submission. Refunds are shown separately in all financial equations; unpriced entries are disclosed even in DEMO mode.

### Market-based pricing and restaurant kit (supersedes fixed business pricing)

- `restaurant-research.mjs` reads a bounded official marketplace product/category pair and ECB XML. It respects robots rules, matches the in-stock single-project variation to the structured USD offer, and stores timestamps plus explicitly unaudited seller purchase counts. Category context is from the same marketplace, not independent demand confirmation. Research cache TTL is one hour; missing/access-changed markup fails visibly without inventing prices.
- `market-pricing.mjs` validates price observations, accepts EUR directly and USD/GBP only with an ECB reference snapshot no older than seven days. Price observations expire after 30 days. Default price is floor(lowest converted comparator × 0.9 × 100) cents. Discount is configurable above 0 through 0.5. Cost/margin floors can block production. Configured/estimated costs are not a claim that all operating costs are known.
- Opportunity scoring now requires valid pricing. Unbuilt duplicate opportunities can receive refreshed evidence; manufactured products are not repriced or duplicated. Products persist `priceCents`, `pricing`, `deliverable`, `pageCreatedAt` and `pagePath` in their existing JSON. Reports persist `unitPriceCents`; revenue/refund limits and loss windows use that historical price. Missing price fields on pre-migration records mean their original €20 price, not a default for new work.
- `restaurant-kit.mjs` specializes the original website line with eight files, menu/printable-menu pages, original CSS illustration and clear deployment instructions. QA additionally verifies restaurant sections, enquiry disclaimers, sample menu data, and equality of every zipped file to its inspected source. Legacy generic packages remain intact.
- `product-page.mjs` renders the local details page from persisted product, opportunity, listing and QA records. GET `/product?id=...&mode=LIVE|DEMO` and the associated package/listing/file routes support explicit mode so an existing link survives switching the console mode. File preview exposes only `menu.html` and `listing.svg`, with restrictive CSP. Operator ZIP downloads are not paid buyer delivery.

The live adapter supports one implemented restaurant-kit opportunity, not unrestricted autonomous product discovery. A comparator's feature set/support can differ; price comparisons and product-page copy make that distinction explicit. No competitor code, prose, images or paid files are reused. Historical legacy-store products remain separate; no existing purchase amount is rewritten.

## Continuous scheduler and parallel lanes
The existing server job is now a batch coordinator when continuousProduction is enabled or maxConcurrentJobs exceeds one. Each product has a persisted business-item child job with its opportunity ID and parent job ID. Claims occur synchronously before the first await. Lane completion totals are incremented after awaiting the product result to avoid lost updates. The coordinator awaits all lanes before STOP/close releases the database. Restart resumes parents, which reclaim their paused child checkpoints, rather than launching children as independent research cycles.

The scheduler checks eligible queued work every second and records a per-mode research cooldown before fetching sources. Configuration uses continuousProduction (0/1), maxConcurrentJobs (1–4) and researchIntervalMs (60000–3600000). Product claims, source cooldown, generated packages, QA and prices persist in SQLite. Budget charges remain synchronous and shared; failed QA is bounded and does not stop other lanes. Capability acquisition waits abortably; workers are released between stages. UI reflects actual child jobs and makes empty-queue and budget states explicit. AI inference remains serialized. The limited LIVE source adapter is still the main supply constraint.

## Expanded LIVE discovery — 7 October 2026

The bounded LIVE research registry now covers four supported product families: restaurant (Tablelight), creative agency (Signalroom), interior design studio (Quietspace), and independent business services (Clearpath). Sources are explicit public ThemeWagon listings plus relevant category evidence and ECB reference rates. Each source line fails independently; healthy lines can still populate the queue. Robots rules, price/currency agreement, seller-count evidence, deduplication and QA gates remain enforced. Shared pages are fetched only once per collection, with existing server cache reuse.

The three new editions contain six original files, niche-specific service/process/project/FAQ sections, a project briefing worksheet, artwork, license and documentation. They do not reproduce marketplace assets or promise the comparator's broader features, support or framework. Examples and customization fields are labelled.

This supersedes the earlier single restaurant-source limitation. Discovery remains a curated four-family registry on one marketplace, not an unrestricted crawler or an unlimited idea generator. Once each distinct supported opportunity is built, duplicate evidence does not create another copy. Add supported research/production families or import distinct evidence-backed opportunities to expand the catalog further. Seller-reported purchases remain unaudited.
