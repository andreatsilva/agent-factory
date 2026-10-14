# Local validation — 3 October 2026

## Result

The factory is running at http://127.0.0.1:8787 with its original room arrangement and procedurally drawn pixel art. The reference image is not embedded, drawn, or served.

Six automated integration test groups pass (`node --test test/factory.test.mjs`). Tests cover every application route, malformed inputs, source escaping, local-origin protection, pipeline transitions, duplicate prevention, persistence, cancellation, model failures and fixed-price payment verification. The test provider and test databases are isolated from the live factory.

## Real integrations verified

- Installed official portable Ollama and both configured models locally.
- `qwen3:8b` answered the UI test and `/api/neo/think`.
- `qwen2.5-coder:7b` generated the toolkit plans and answered `/api/coder/think` with `25 * (20 - 5) - 100`.
- Live research collected eight public source signals restricted to the previous 180 days. URLs, publication dates and reviewer identity are retained. Two signals were model-reviewed; the remaining signals are explicitly labeled heuristic.
- The completed live cycle published two HTML toolkits at 2000 euro cents each. Both were built using the coder model. No test sales were inserted into the live database.
- STOP cancelled an active build, refused further jobs, unloaded both configured models, and returned `verified: true`, no remaining models and zero unload errors.
- Server restart preserved gaming mode, eight opportunities and two products. START resumed the factory afterward.
- The operator artifact download returned HTTP 200 and was saved as `test-output/verified-toolkit.html`. Machine-readable evidence is in `test-output/live-smoke.json`.

## Browser checks

- Factory, store, package details, operator toolkit, missing payment-session page and invalid-session page opened correctly.
- Tested all seven sector navigation controls, all six canvas room hit targets, the NEO canvas hit target, all fourteen agent inspectors, monitor show/hide and inspector close.
- Tested research, cycle, AI test, STOP, START and store navigation controls.
- Store displayed two €20 products, review provenance and source dates. Checkout without an account displayed the expected connection message.
- A separate test server on port 8788 exercised checkout → verified success → unlocked download using a simulated payment provider. No real Stripe account or money was involved. Test server is stopped after verification.
- Toolkit calculator produced revenue €500, profit €275 and break-even seven sales for 25 sales, €5 variable cost and €100 fixed cost. Worksheet notes survived reload.
- HTML download, worksheet export and print controls were exercised without JavaScript errors. The in-app browser did not expose a download event for the Blob worksheet export or a native print dialog, so native save/print completion was not verified. HTML response content and attachment headers passed API tests.
- The browser ignored the requested narrow viewport override; only the actual desktop viewport was visually verified. The original forced 900px mobile canvas width has been removed, but mobile-device acceptance remains unverified.

## Remaining external configuration

Real checkout requires a Stripe secret key and account. Public hosting/authentication, remote fulfillment, tax configuration and refunds are not part of the local runtime. Do not expose the loopback operator API directly to the Internet.

Node 22 emits its built-in experimental SQLite warning. This is not an application failure. The machine's global npm shim is broken, so verification and launch use the dependency-free Node commands documented in README.

## Expanded specification: latest verification

- 14 automated test groups pass (`node --test test/*.test.mjs`). They now include physical motion/arrival, exact pause/resume, digital-evidence gates, rejection, cached reasoning, model retry, manufacturing briefs, utility calculations and ZIP CRC/integrity.
- Real itch.io metadata adapter returned 32 priced tool listings; HN returned 11 supporting discussions. The selected category stored seven priced top-seller references without claiming audited sales counts.
- NEO approved an original offline utility brief. The coding model wrote its quick-start instructions. All automated QA checks passed and one seven-file ZIP was published at €20.
- `test-output/verified-product.zip` was downloaded via the operator endpoint and independently extracted with Windows `Expand-Archive` into `test-output/verified-product`.
- Live `/api/agents` samples 700 ms apart showed six workers changing physical position. After STOP, all fourteen worker positions/states remained exactly unchanged across repeated samples. Model unload returned verified=true, zero remaining configured models, zero errors.
- Legacy worksheet prototypes were retained as review-required drafts, not deleted. No fake live sales were created.
- The revised movement sprites, new room inspectors and sprite-tool image import/export have not received real-browser acceptance. Browser auto-review failed because the account usage limit was reached. No alternate browser/control path was used to bypass that restriction.
- The expanded MVP is not yet declared stable. Remaining acceptance: current browser console/visual checks, image import and exported PNG verification, native download/print handling where applicable, and actual mobile viewport testing. Real payments are deliberately dormant until account configuration.

Final restart verification: latest server loaded successfully; persisted STOP state was retained before START. Catalog retained 3 records (1 published, 2 legacy drafts), 9 opportunities and zero sales/revenue. Both configured Ollama models were available with no models loaded at the idle check. All seven new inspection endpoints returned HTTP 200. Payment configuration remains absent by design. The temporary checkout fixture server was terminated through its original execution session. Latest browser acceptance remains pending for the reason above.

## Game camera / expansion acceptance — 3 October 2026

- 18/18 automated test groups pass after the final camera changes.
- Camera transform/zoom-anchor math checked at 1280×720, 390×450 and 1920×800; 32-bay layout fits both desktop and narrow bounds with no overlapping rooms.
- Real browser: all seven original sector focus buttons opened the correct inspector; humanoid workers were visible at their current stations.
- Real browser: plus/minus, wheel zoom, drag pan, Home/arrow navigation and minimap recentering exercised. The camera fills the actual viewport and preserves pixel rendering.
- Real browser: previewed and built an east workshop bay, verified it survived reload, inspected it and removed it. The temporary bay was removed; the original station remains the saved starting layout.
- Real browser: STOP displayed GAMING MODE and AI UNLOADED; zoom remained usable. START restored OPERATIONAL. Original active/paused state was restored after server restart during this work.
- Browser log inspection returned no warning/error entries during the new-control tests.
- Real-device multi-touch and the earlier generated-product file import/export browser acceptance remain pending. The historical browser usage block above no longer applied to these desktop checks.

## Industrial visuals / sprite milestone

- 22 automated test groups pass, including all newly served scene modules and PNG routes, sprite alpha-bound slicing, fair access for all 14 workers, at-most-four inspections, real check results, no fabricated jobs/products, active-task station changes, and paused dwell timing.
- Both original sprite sheets are 1254×1254 PNGs with transparent alpha. All 16 alpha-isolated cells in each were successfully located; no cell-boundary slicing or file resampling was needed.
- Browser screenshots verified orange/teal humanoid characters, metal/copper machinery, extruded platform edges, worn deck textures, conveyors and the pixel space scene at overview and room zoom.
- Browser warning/error log inspection returned no entries after both sprite assets loaded.
- Live workers changed coordinates between API samples. Maintenance results were stored with real counts and timestamps. During STOP, all worker coordinates/states remained identical over a three-second interval, inspection writes ceased and Ollama reported zero loaded configured models. START restored operation.
- A byte-level screenshot comparison was inconclusive because captures can straddle UI repaint and viewport changes; it is not recorded as a passing pixel-freeze test. Animation freeze is supported by the frozen scene clock, worker/API verification and automated pause tests.
- User-created workshop (east) and storage (north) expansion bays were retained. Live app was left running after checks.

## Visual refinement — 4 October 2026
Preserved all room coordinates and saved expansions. Added a segmented NEO reactor with powered diagnostic light, grated raised catwalks (including expansion connectors), warm bulkhead lamps, architectural corner supports, dimensional terminals/benches, and copper-braced glass tanks. Replaced cluttered roofline terminals with low ventilation grilles. All animation uses the existing pause-aware clock. Browser inspection verified the overview, close NEO core and east expansion; no browser warnings/errors. Existing suite: 22/22 passed. This pass changes rendering only; no backend or stored layout changes.

## Business engine and NEO conversation — 4 October 2026

- Full current suite: 34/34 tests pass (`node --test test/*.test.mjs`); output saved in `test-output/business-suite.txt`. Coverage includes scoring, rejection, budgets, real package generation, QA repair/exhaustion, capability assignment, bounded capacity up/down, performance decisions, independent loss windows, deduplication, mode isolation, report/cost idempotency and restart/checkpoint persistence. Prior factory, checkout, research, movement and layout regression tests remain passing.
- Three complete DEMO cycles ran through the actual local UI with normal worker travel: Restaurant starter, Restaurant appointment variant, Home maintenance starter. Each produced a real five-file ZIP, scored 100 on the implemented static QA checks, prepared a simulated listing and recorded three simulated orders. Combined: nine simulated orders, €180 simulated revenue, €9.27 simulated costs and €170.73 simulated net profit. This validates workflow arithmetic, not commercial demand or real profitability.
- A server restart retained the three packages, all nine simulated order records, ledger totals, decisions, conversation history and the user's east workshop/north storage bays. Evidence snapshots: `test-output/business-before-restart.json`, `business-jobs.json`, `business-final.json`.
- LIVE research fetched real public HN discussion references. Its score 59/confidence 30 failed the evidence gate; no LIVE business products or sales were invented. Repeated source checks retained the same opportunity fingerprint. Stronger purchase-demand evidence is still required for LIVE production.
- Browser checks covered the business console, mode/configuration controls, queue/workers, product/listing links and running the complete cycle. Generated website preview was checked at desktop size and 390×844; navigation anchors worked and the narrow layout stacked correctly. Preview remains sandboxed. ZIP responses and contents are covered by automated validation. Native download-dialog completion and real-device multi-touch remain unverified.
- NEO's original binary canvas face, chat input, thinking state, real Ollama reply and persisted history were verified in the browser. Chat does not execute factory actions. Context now separates current business-mode economics from the legacy live storefront, distinguishes active/inactive workers, and gives current facts precedence over older replies.
- Dynamic workers were deployed for sustained backlog and later deactivated when idle. The header now reports 14 active workers; the monitor retains all 17 recorded roles with inactive roles labelled. Browser warning/error inspection returned no entries during the final UI checks.
- App remains available on loopback port 8787 in DEMO mode. Existing local storefront remains separate. External marketplace writes return MANUAL_ACTION_REQUIRED; real marketplace accounts/API credentials, verified traffic/order imports and Stripe configuration are not connected by this milestone. See ARCHITECTURE.md for real/simulated boundaries and next integration requirements.

## Manual listing handoff and accounting follow-up — 4 October 2026

- 35/35 automated tests pass. New coverage exercises the QA/listing export, URL and confirmation validation, idempotent publication records, conflicting URLs, restart persistence, mode isolation, malformed reports, and manual sales with refunds. The fixture asserts no extra upstream requests during publication recording.
- Browser acceptance used a separate database and temporary server on port 8788. A QA-passed fixture was shown as READY / MANUAL_ACTION_REQUIRED. The publication form retained its URL and checkbox across view changes, saved successfully, and showed LISTED with OPERATOR-REPORTED / NOT VERIFIED. No external page was published or contacted.
- The isolated UI accepted two reported €20 orders, €20 refunds and €1 fee; Economics showed €40 − €20 − €1 = €19. Unpriced cost warning was visible and NEO returned CONTINUE rather than claiming verified profit. No test transactions were inserted into the user's database.
- Browser warnings/errors were empty. The isolated fixture tab/server were closed after acceptance. Main factory remains on port 8787 with its saved layout and data.


## Research-based pricing and first LIVE product — 4 October 2026

- Current suite: 39/39 tests pass (test-output/pricing-suite.txt). Added pricing, stale/missing evidence, ECB currency conversion, cost-floor, robots wildcard, public-source parser, original restaurant-kit and package-integrity coverage. Existing business/accounting, isolation, restart, factory movement/layout and checkout regressions remain passing.
- Completed the real LIVE sequence through the local factory: FOUND PRODUCT -> MADE PRODUCT -> CREATED PAGE. Product BP-602ef20abacafcbe1a3ec7df-LIVE is Tablelight — Restaurant Website Kit, READY, QA 100 on 15 structural checks. Page created at 2026-10-04T17:39:00.420Z. No simulated orders were inserted into LIVE.
- Research observed ThemeWagon RestaurantPro Standard / Single Project at USD 29, with a seller-reported, unaudited 75 purchases. ECB reference rates dated 2026-10-02 gave 1 EUR = 1.1225 USD. Converted comparator: EUR 25.835189; 10% discount rounded down gives EUR 23.25. The category includes free alternatives. One paid comparator on one marketplace is a starting point, not proof of demand or equivalent features.
- Fixed source-access failures caused by robots wildcard parsing and an incorrect assumption that the category's first page always includes the older comparator listing. Robots rules remain enforced. The LIVE collector is deliberately bounded to this restaurant niche and these public sources.
- The original eight-file package includes the website, original SVG artwork, printable menu, reference menu JSON, customization guide, README, license and manifest. No competitor code, images or copy were reproduced.
- Real browser acceptance verified desktop and 390x844 restaurant/product layouts, printable-menu navigation and return to the menu, visible source/FX/price records, the three workflow milestones and package links. Browser warning/error logs were empty. The temporary viewport override was reset. Native print/download-dialog completion and real-device touch are not claimed.
- Downloaded the actual local ZIP and validated all eight entry CRCs plus its SHA-256 against the exported listing metadata: 1bcd9a54eabf506e1422369d6ee90aa5fd709c4fc467f97e3243b306b04ed923. Evidence: test-output/tablelight-live.zip and tablelight-listing.json.
- After restarting the server, SQLite retained READY status, EUR 23.25, QA 100 and the original page path/timestamp. Refreshed evidence: test-output/price-workflow-live.json. Historical product/order prices remain unchanged; new products lock their observed pricing snapshot.
- Local product page: http://127.0.0.1:8787/product?id=BP-602ef20abacafcbe1a3ec7df-LIVE&mode=LIVE . App is running in LIVE mode on port 8787. Existing factory artwork/layout and expansion bays were preserved. External publication and checkout remain unconnected; listing handoff is MANUAL_ACTION_REQUIRED and LIVE sales remain zero.

## Local product catalog — 4 October 2026

- Added /catalog and /api/business/catalog. The catalog defaults to LIVE independently of the factory's operating mode; DEMO is an explicit, labelled view. Browsing is read-only and does not change mode or record sales.
- Only READY, LISTED or SELLING products with a stored ZIP, prepared listing and a passing latest QA record appear. Search by name/niche and sorting by date, name or saved price are server-rendered with no client scripts.
- Factory OPEN PRODUCT CATALOG and Business Ops now link to the catalog. Product details return to their own mode's catalog. Legacy toolkit store remains available from the catalog footer. Existing pixel factory rendering and saved room layout are unchanged.
- Suite: 40/40 passing (test-output/catalog-suite.txt). Coverage includes mode isolation, price sorting, safe escaped searches, invalid parameters, package/art/details routes, exclusion of paused products, failed latest QA and missing packages, and restart persistence.
- Browser acceptance: factory button -> LIVE catalog -> product details -> catalog; search/no-results/clear; high-to-low sort submission; desktop and 390x844 catalog/card layout. No browser warning/error logs. Viewport reset afterward. Tablelight remains EUR 23.25 and LIVE sales remain zero.
- Restarted the idle factory server with the new code, and restored its already-installed Ollama service after detecting it was offline. No model downloads or external publication were performed. Catalog remains a local preview with no checkout.

## Continuous parallel production acceptance — 7 October 2026

- 44/44 tests pass (test-output/parallel-suite.txt). New tests verify three concurrent lanes, unique claims, later imported work entering without manual cycles, shared daily budget under concurrent charges, bounded QA failure with healthy-lane progress, persisted cooldown/configuration, and STOP/restart recovery of every child checkpoint without duplicate products or simulated orders.
- Browser testing used a separate DEMO database on port 8788. Three different products were assigned at the same time to website workers, then progressed through shared QA and packaging. All three finished with their real packages; the nine DEMO orders remained isolated from LIVE. Screenshot: test-output/parallel-demo.jpg shows three occupied lanes. Production uses real per-job worker assignments; tests accelerated station arrival only in the isolated fixture.
- Found and fixed a parallel counter race in the batch-completion message (an increment read the old total before await). Added an assertion for the seven-product completion count. The final full suite passed after the fix.
- Browser STOP displayed GAMING MODE after the demo batch completed; mid-production STOP/restart with three active child jobs is covered by automated acceptance. The isolated demo server/tab was closed after checks. Original factory artwork and user layout were not redesigned.
- LIVE continuous mode is enabled with three lanes and a five-minute research refresh. It survived the final server restart. Both installed local Ollama models are available. Evidence snapshot: test-output/continuous-live.json.
- LIVE has no approved backlog at acceptance: the bounded restaurant collector repeatedly finds the existing Tablelight product. The UI correctly reports WAITING_FOR_RESEARCH rather than creating duplicate products or fictional evidence. Broader research sources or distinct approved imports are needed to sustain full utilization. The scheduler stays active while the local server is running; STOP remains authoritative.

## Expanded research and real parallel batch — 7 October 2026

- 47/47 tests pass (test-output/discovery-suite.txt). Added four-family bounded discovery, shared-fetch deduplication, distinct opportunity fingerprints, missing seller-count rejection, price/source identity validation, independent source failures, robots exclusions, cancellation, six-file niche kit QA, archive consistency and listing descriptions.
- LIVE browser SYNC RESEARCH collected four supported candidates: three new and the existing restaurant duplicate. The continuous scheduler automatically claimed the three new opportunities in separate lanes at 15:40:23 Europe/Lisbon. Browser screenshot test-output/live-three-products.jpg shows all three LIVE lanes occupied, with real QA and packaging stages.
- Completed original products: Signalroom agency kit EUR 31.40; Quietspace interior studio kit EUR 39.45; Clearpath business kit EUR 31.40. All READY with QA 100. Each has six files including a niche-specific project-brief.md. The four-product LIVE catalog includes the preserved Tablelight product at EUR 23.25. No simulated LIVE orders or external listings were created.
- Price evidence came from the public ReignPro, Freya and Boots5 standard/single-project offers, with ECB conversion and the configured 10% discount. Seller counts are explicitly unaudited. Category evidence is from the same marketplace and does not establish independent demand. These original static kits do not promise comparator feature parity or support.
- Browser acceptance verified the expanded catalog, new interior preview, desktop and 390x844 layout, FAQ anchor and native disclosure expansion. Viewport restored. Downloaded all three actual ZIPs, checked every entry CRC, required worksheet and SHA-256 against listing metadata, and verified all three details routes. Evidence and checksums: test-output/expanded-discovery-live.json.
- Factory art/layout preserved. Continuous mode remains enabled with three lanes. The current registry has four supported families and waits after distinct work is exhausted; it is not an unrestricted crawler or an unlimited product generator. Independent source failures no longer block healthy discovery lines.

## Discovery crawler validation — 7 October 2026
- 49/49 automated tests pass (`test-output/crawler-suite.txt`), including pagination, persisted outbox replay, free-listing exclusion, foreign URL exclusion, retry bounds, abort handling and accommodation-kit QA.
- Live public crawl traversed 24 category pages and checked 33 listing attempts. Discovered Hideaway on business category page 10 without a hardcoded product URL: USD39, 178 seller-reported purchases, ECB 2026-10-07 rate1.1177. Evidence checkpoint: `test-output/crawler-live.json`.
- The verified crawl checkpoint was transferred into the paused local factory to continue through its normal research/import/production pipeline. Previous checkpoint preserved in `test-output/pre-crawl-checkpoint.json`.
- End-to-end LIVE result: Stillwater BP-fd6477d28f832d648bff6e5b-LIVE is READY, QA100, six-file ZIP verified, EUR31.40, catalog shows 5 products. Product details verified in browser; proof: test-output/stillwater-product.jpg. Continuous LIVE remains enabled with three lanes.

## Sales workflow validation — 9 October 2026
- 55/55 tests pass in test-output/sales-suite.txt. New tests cover intake/scope/margin gates, invalid transitions, paused production, corrupt PNG rejection, identical-composition rejection, QA gate, version retention, one-revision limit, persisted engine state and zero real sales.
- Browser test: SALES OPS → sample brief → proposal → local order → produce two PNGs → visually inspect/pass → revise headline → produce version 2 → inspect/pass → prepare handoff → complete rehearsal.
- Verified actual endpoint ZIP downloads for both versions; five entries each, valid 1280×720 RGB/RGBA PNGs. Evidence: test-output/sales-demo-v1.zip, sales-demo-v2.zip, sales-live-proof.json.
- No accounts connected, messages sent, real client acceptances claimed or money recorded. First production capability is deterministic text/geometric composition, not AI image generation.
- Final server restart verified the completed local case, all 10 history entries and both artifact versions survived. Stale visual-review versions are rejected. Browser proof: test-output/sales-workflow-complete.jpg. Factory was returned to its running state.

## Automatic sales queue — 10 October 2026
- Full Node test suite: 60/60 passing (`test-output/sales-queue-suite.txt`).
- New tests verify real native PNG rendering without a DOM, distinct compositions, abort-before/during rendering, one worker claim, pause/resume without duplicate artifact versions, persisted crash recovery, bounded failure retries, explicit retry, QA correction gates and SQLite reopen through HTTP.
- Live server restarted with the new queue. A local order approved while STOPPED remained QUEUED. START FACTORY automatically generated version 1 with the Sales Ops panel closed.
- Live correction form queued a changed headline; version 2 appeared automatically through polling. Reviewed both PNG previews and prepared the unsent handoff. Case SC-329992d6-9008-4744-b3cc-50463acc2c7b remains HANDOFF_PREPARED; original sample remains CLOSED_LOCAL. Both cases and all artifact versions retained.
- Live proof: test-output/sales-queue-live-proof.json. Screenshot: test-output/sales-automatic-delivery.jpg. Browser error/warning log empty. JavaScript syntax and PowerShell launcher parsing checked.
- Server running on 127.0.0.1:8787. Marketplace accounts remain disconnected; real sales revenue remains zero. Queue handles one thumbnail order at a time alongside website production. Visual QA remains explicit.
- Separate observed limitation: website planner currently repeats duplicate audience/purpose proposals and rejects them (sequences 4927–4929 observed). Sales queue success does not imply this existing website-discovery issue is resolved.

## Modular lines, crew capacity and visual depth — 11 October 2026

- Full regression suite: 66/66 passing (`test-output/depth-modules-suite.txt`). Loopback HTTP tests required execution outside the shell network sandbox; the first sandboxed run encountered EACCES rather than application failures. After strengthening crew-dock assertions, all three module/crew tests passed again. Final machinery module syntax check passed.
- Module tests preserve existing bays, reserve distinct production bays, prevent removal of active modules, and append future registered sections. Crew tests deploy 124 unique roles, reject overflow, verify distinct physical positions and persisted dock geometry, and reactivate reserve workers without duplicating identities or bays. Sales crew tests verify task ownership, movement to the render bay, and paused-task release.
- The live browser showed SALES OPS and THUMBNAIL CREATORS as connected, selectable sectors. Thumbnail staffing was adjusted from two to four through MANAGE CREW; the saved roster contains 20 active / 23 total roles. The existing business configuration now permits 124 agents. Production remains in its saved paused gaming state.
- The previous duplicate-planner issue progressed through two successful LIVE batches: LinguaBloom, BalconyGreen, PlateCraft, SailStart, Woodlore Restorations and Rhythm Hub are all READY. The final read-only API check found 151 total products. This verifies recovery for those batches, not a guarantee of indefinite unique generation.
- Browser visual review covered the overview, Product Factory close-up and Thumbnail Creators close-up after reload. The original footprint remains unchanged; new deck extrusion, rear wall roofs, machine side planes, conveyor supports, shadows, proofing-screen stands and foreground rails are visible. Pixel characters, labels and sector controls remain legible. Final browser warning/error log was empty.
- Screenshots: `test-output/factory-depth.png`, `test-output/thumbnail-depth.png`, and `test-output/factory-depth-overview.png`. No external publication, marketplace account setup or client messaging was performed.

## Public Pages viewer — 14 October 2026

- Full regression suite: 71/71 passing (test-output/pages-suite.txt); the five public-view tests passed again after the final build change.
- Verified the GitHub main commit matched the single available local commit before editing. A redacted credential-pattern scan found no common secrets; .env, SQLite, logs and test output were untracked/ignored. See SECURITY.md for scope and limitations.
- Browser acceptance used the actual fifteen-file Pages artifact under /agent-factory/ on a different local origin, connected to the actual PC through the separate viewer. It showed 20 active agents and 151 completed products. Sector focus, overview, NEO's read-only inspection and private operator NEO were checked. Connected and unconfigured views had no browser warnings/errors.
- Stopped only the viewer to verify OFFLINE and last-known-state behavior; navigation continued working. The unconfigured build renders the art without requesting private APIs or inventing live counts.
- The public HTTP boundary rejects private paths, query forwarding and non-GET methods; sensitive fields are excluded by an explicit schema, and the client rejects stale snapshots and credential-bearing feed URLs.
- With explicit user approval, downloaded Cloudflare 2026.10.0 from its official release and matched the published SHA-256. Opened a temporary tunnel only to the read-only service on port 8788. Verified HTTPS 200 and the exact Pages CORS origin. No operator or Ollama port was exposed.
# NEO avatar and public visitor chat — 14 October 2026

- Preserved existing factory layout and renderers; added transparent floating NEO sprite, animated machine umbilicals, matching conversation portrait and reduced-motion support.
- Public Pages chat uses a separate bounded endpoint and sanitized public context; visitor text has no command/tool path and cannot enter operator memory. Gaming mode, concurrency, global request limits, body validation, origin checks and upstream errors are covered by regression tests.
- All 77 tests pass (`test-output/neo-full-suite.txt`). The isolated integration test sends an instruction to stop/delete work, verifies settings/jobs/agents are unchanged, and confirms operator chat stays private and untouched.
- Real browser preview exercised both a greeting and a request to stop the factory/delete jobs through installed Ollama. NEO replied to the greeting and declined the command. Factory continued running. Browser console had no warnings/errors.
- Fixed chat portrait overflow so input and send controls stay inside the dialog; NEO focus includes the complete suspension platform and mainframe.
