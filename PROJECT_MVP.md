You are continuing an EXISTING project called **AI Agent Factory**.

This repository is already under active development. Your job is to IMPROVE, FIX, and COMPLETE the existing project — NOT redesign it from scratch, replace its architecture, create a different app, or reinterpret the concept.

Treat the current repository as the source of truth.

# 1. CORE RULE: DO NOT REINVENT THE PROJECT

Before changing anything:

1. Inspect the entire existing repository.
2. Identify the current frontend, backend, database, local-AI integration, agent system, research system, product system, storefront, and START/STOP functionality.
3. Reuse existing code whenever possible.
4. Preserve working functionality.
5. Make incremental changes rather than rewrites.
6. Do not replace the current app with React, Next.js, Electron, another framework, or a new architecture unless the existing architecture literally cannot support a required feature.
7. Do not generate a brand-new dashboard.
8. Do not remove existing functionality just because you would personally implement it differently.
9. Do not simplify functional backend features into visual mockups.
10. Do not use fake metrics or simulated activity when real state already exists.

If something is broken, FIX it.

If something is incomplete, COMPLETE it.

If something already works, KEEP it.

---

# 2. PRODUCT VISION

AI Agent Factory is a local-first autonomous business system running on the user's own PC.

Visually, it is represented as an **old-school pixel-art futuristic factory / space-colony cutaway**.

The user should feel like they are looking inside a living industrial space station populated by AI workers.

The factory contains multiple departments that correspond to real software systems.

NEO is the central supervisory AI.

The long-term objective is:

INTERNET SIGNAL
→ RESEARCH LAB
→ NEO VALIDATION
→ PRODUCT FACTORY
→ QUALITY CONTROL
→ STORE
→ €20 SALE
→ DELIVERY
→ REVENUE

The system should require as little human intervention as reasonably possible.

---

# 3. VISUAL DIRECTION — DO NOT CHANGE THIS

The visual target is:

- old-school pixel art
- retro-futuristic industrial space station
- top-down / cutaway colony layout
- dark
- metallic
- industrial
- Matrix influence
- Fallout-terminal influence
- late-80s / early-90s computer aesthetic
- green phosphor displays
- black/dark steel backgrounds
- occasional yellow/amber warning lights
- restrained cyan only where necessary
- absolutely NOT a modern SaaS dashboard
- absolutely NOT glossy cyberpunk cards everywhere
- absolutely NOT clean flat Material Design
- absolutely NOT modern rounded-app aesthetics

The factory itself should dominate the screen.

UI overlays should be secondary.

## Factory materials

Increase the sense that this is a METALLIC INDUSTRIAL FACILITY.

Use:

- dark gunmetal
- blackened steel
- oxidized green-gray metal
- steel floor plates
- industrial wall panels
- rivets
- bolts
- vents
- pipes
- conduits
- cable bundles
- server racks
- machinery
- reactor tanks
- terminals
- storage crates
- gantries
- rails
- warning stripes
- grates
- mechanical doors
- ducts
- industrial lighting

Avoid making rooms look like HTML rectangles with labels.

They should visually read as actual rooms inside a space station.

---

# 4. FACTORY LAYOUT

Use the CURRENT factory layout as the foundation.

Do not re-layout the entire application without a functional reason.

The station should have a central hub and interconnected departments.

NEO occupies the physical and conceptual center of the factory.

Major departments currently include:

- NEO Central Command
- Website Creator
- Research Lab
- Agent Assembly
- Quality Control
- Product Factory
- Operations / Infrastructure
- Market / Store Relay

Additional departments can be added later, but do not add unnecessary production lines now.

Focus on polishing and completing the existing MVP.

---

# 5. NEO

NEO is the central brain of the factory.

NEO is NOT just a visual decoration.

NEO must supervise:

- agent states
- task queues
- Research Lab results
- product selection
- product generation
- failures
- retries
- local LLM routing
- quality control
- factory start/stop state
- system health
- model loading/unloading
- revenue/catalog state

NEO should maintain a useful event log.

NEO should intervene when:

- an agent crashes
- a task times out
- an LLM call fails
- research fails
- generated output fails QA
- a model is unavailable
- a product fails validation

NEO should prefer retrying or rerouting intelligently instead of silently failing.

---

# 6. FIX AGENT MOVEMENT — HIGH PRIORITY

The agents are currently not moving correctly.

This is a BUG and must be fixed before adding unrelated features.

Agents must be visible moving around the actual factory.

Movement must reflect real agent state rather than being purely decorative.

Examples:

Research agent starts research
→ walks from NEO / idle location to Research Lab.

Research finishes
→ worker returns or moves to validation.

Product selected
→ Product Factory workers move to their stations.

QA begins
→ QA worker travels to Quality Control.

Agent idle
→ remains at an idle/workstation location.

Factory stopped
→ ALL agent movement stops.

Factory started
→ agents resume according to current tasks.

Do not implement agents as a single CSS animation loop unrelated to application state.

There should be a basic movement/state system.

At minimum each worker should have:

- id
- name
- role
- current room
- destination
- state
- active task
- progress
- movement speed
- health/status

---

# 7. AGENT ART STYLE

The current workers need to look MORE HUMANOID.

Keep them pixel art.

Do not use circles or generic dots as the final worker representation.

Create small humanoid pixel sprites with:

- head
- torso
- two arms
- two legs
- directional facing if practical
- walking animation
- idle animation
- working animation if practical

Style:

retro industrial worker / synthetic humanoid.

NOT cute robots.

NOT emoji.

NOT modern cartoon characters.

NOT realistic humans.

Think:

small 1980s sci-fi synthetic workers moving around an industrial colony.

Different roles can have subtle visual variation:

Research:
green terminal/operator accents.

Builder:
tool belt / technical accent.

QA:
yellow inspection accent.

NEO technician:
bright green/cyan accent.

Product worker:
industrial crate/tool accent.

Keep sprite dimensions and animation lightweight.

---

# 8. LOCAL AI ARCHITECTURE

The project is LOCAL-AI FIRST.

Existing Ollama integration should be preserved and completed.

Preferred current model roles:

NEO / general reasoning:
qwen3:8b

Coding / Website Creator:
qwen2.5-coder:7b

The user's machine has limited VRAM.

Do NOT keep several large models simultaneously loaded.

Use a model router.

Prefer:

TASK
→ determine required model
→ unload unnecessary model if needed
→ load/use correct model
→ complete task
→ release model when appropriate

Keep context short.

Do not repeatedly send the entire project history into the model.

Use structured summaries and persistent state.

---

# 9. STOP FACTORY / GAMING MODE

This is CRITICAL.

The user uses this computer for gaming.

The factory needs a reliable:

STOP FACTORY

button.

When STOP FACTORY is pressed:

- stop new tasks
- pause queues
- stop research
- stop product generation
- stop agent movement
- prevent new LLM inference
- unload Ollama models where possible
- release GPU VRAM
- reduce CPU background work
- preserve current state in the database
- clearly display GAMING MODE / FACTORY STOPPED

Existing active operations should either:

A. safely finish a tiny atomic operation, or
B. be checkpointed and paused.

Do not leave heavy workers running in the background.

START FACTORY should restore operation cleanly.

Also maintain a simple desktop/local script if one already exists for emergency shutdown.

---

# 10. PRODUCT STRATEGY — VERY IMPORTANT

The Research Lab should NOT spend most of its time inventing completely original products from scratch.

That wastes tokens and introduces unnecessary uncertainty.

The default strategy is:

**Find categories and formats of DIGITAL PRODUCTS that already demonstrate strong demand worldwide, identify why they sell, then create an ORIGINAL competing product based on the proven market structure.**

Important legal/quality constraint:

Do NOT plagiarize or duplicate copyrighted files, branding, text, templates, code, artwork, names, or proprietary assets from another seller.

"Copy what sells" means:

- copy the validated MARKET PATTERN
- copy the PRODUCT FORMAT
- copy useful FEATURE SETS
- copy proven BUSINESS MODELS
- study pricing
- study positioning
- study demand
- study customer complaints
- study missing features

Then create our own original implementation.

Example:

BAD:

Find someone's paid Notion template
→ download/copy it
→ rename it
→ sell it.

GOOD:

Research top-selling productivity templates
→ determine common features
→ identify complaints and missing features
→ build our own better productivity template
→ price it at €20.

---

# 11. DIGITAL PRODUCTS ONLY

For now, Research Lab must ONLY look for DIGITAL PRODUCTS.

No physical inventory.

No shipping.

No dropshipping.

No physical fulfillment.

Potential categories include:

- templates
- spreadsheets
- calculators
- trackers
- checklists
- business kits
- prompt packs
- automation kits
- scripts
- small utilities
- downloadable tools
- Notion-style systems
- planning kits
- freelancer kits
- business documentation packages
- digital dashboards
- small local apps
- micro-tools
- website templates
- boilerplates
- design assets where original assets can be produced efficiently
- educational reference packages where lawful and useful

Favor products that:

- are inexpensive to generate
- require low ongoing support
- can be automatically delivered
- have obvious buyer intent
- can realistically be sold for €20
- can be created with modest token usage
- can be validated against existing demand

---

# 12. RESEARCH LAB — PRIMARY JOB

Research Lab is the most important discovery system.

Its job is NOT:

"think of random product ideas."

Its job is:

"find evidence of what people already pay for."

Research should gather signals such as:

- products repeatedly appearing in marketplaces
- popular digital-product categories
- high-volume searches
- trending searches
- buyer-intent queries
- frequently recommended digital tools
- recurring customer problems
- high-engagement discussions
- product review volume
- common complaints
- competitor pricing
- repeated feature requests
- underserved variants of successful products
- profitable niches with low production cost

Possible sources should be implemented through modular adapters rather than hard-coded into NEO.

Examples may include:

- search engines
- Google Trends where available
- Reddit where permitted
- Hacker News where useful
- digital-product marketplaces where access permits
- SaaS directories
- software directories
- public reviews
- forums
- public websites
- competitor stores
- social trend signals where legally accessible

Respect robots.txt, APIs, rate limits, platform rules and licensing.

---

# 13. RESEARCH PIPELINE

Research Lab should approximately follow:

SOURCE DISCOVERY
↓
PRODUCT / CATEGORY EXTRACTION
↓
DEMAND SIGNAL
↓
BUYER INTENT
↓
COMPETITOR COUNT
↓
COMPETITOR PRICE
↓
REVIEW / ENGAGEMENT SIGNAL
↓
CUSTOMER COMPLAINTS
↓
FEATURE GAP
↓
PRODUCTION DIFFICULTY
↓
TOKEN / COMPUTE COST
↓
EXPECTED SUPPORT BURDEN
↓
€20 PRICE FIT
↓
NEO SCORE
↓
VALIDATE
↓
SEND TO PRODUCT FACTORY

Research results MUST store evidence.

Each candidate should have fields similar to:

- title
- category
- source URLs
- source type
- evidence collected
- demand score
- competition score
- gap score
- buyer-intent score
- estimated creation effort
- token-cost estimate
- support burden
- €20 price suitability
- final NEO score
- reason for selection
- rejected reason if rejected

---

# 14. PRODUCT SELECTION PHILOSOPHY

Default:

70–90% proven-market adaptations.

10–30% experimental/original ideas.

The exact ratio can evolve from revenue data later.

A proven-market adaptation means:

"An original product built around a format/category with clear evidence of existing sales demand."

The factory should strongly prefer improving an already validated concept over creating random concepts.

NEO should ask:

"What is ALREADY selling?"

then:

"Why is it selling?"

then:

"What complaints exist?"

then:

"Can we build our own useful version cheaply?"

then:

"Does €20 make sense?"

Only after that:

"Should Product Factory build it?"

---

# 15. TOKEN EFFICIENCY

Token efficiency is a major design goal.

Do not use an LLM when deterministic code is sufficient.

Examples:

Use code for:

- sorting
- scoring
- deduplication
- keyword frequency
- price calculations
- margin calculations
- extracting known fields
- database operations
- state transitions
- file packaging
- simple templates

Use local LLM for:

- understanding customer pain
- interpreting research
- synthesizing opportunity insights
- writing product content
- coding
- improving positioning
- generating useful original materials
- difficult QA reasoning

Avoid:

- repeatedly regenerating whole products
- repeatedly passing huge source documents
- multi-agent conversations for trivial tasks
- several models discussing the same problem without purpose

Prefer:

research once
→ save structured evidence
→ summarize
→ reuse that summary.

---

# 16. PRODUCT FACTORY

Product Factory should create products from Research Lab specifications.

Each product must sell for:

**€20**

Do not let frontend code decide the authoritative price.

Price must be enforced by backend/store logic.

The Product Factory should receive a structured manufacturing brief containing:

- product type
- target buyer
- problem
- proven-market references
- required features
- differentiation
- expected files
- quality criteria
- price
- estimated token budget

The agent then builds the ORIGINAL product.

---

# 17. PRODUCT QUALITY

Do not create low-value filler simply because it is easy.

A €20 product should provide a clear benefit.

NEO/QA should ask:

- Does this save time?
- Does it solve the claimed problem?
- Are the files actually useful?
- Are there obvious errors?
- Does the package feel complete?
- Does the product match its description?
- Is anything copied improperly?
- Would a reasonable person understand why this costs €20?

If not:

REJECT
→ REWORK
→ QA AGAIN.

---

# 18. WEBSITE CREATOR

Preserve Website Creator.

Do not rebuild it unless required.

Its long-term purpose is to operate website/freelance workflows, but current priority is:

1. stabilize factory
2. fix agents
3. Research Lab
4. Product Factory
5. local AI
6. quality
7. store

Website Creator should continue using the coding model where available.

---

# 19. STORE

Preserve the existing storefront architecture.

Every current factory product:

PRICE = €20.

The store needs:

- catalog
- product title
- useful description
- preview/contents
- €20 price
- checkout
- payment verification
- fulfillment
- revenue recording

Do not create fake sales.

Payment integration should remain dormant until the user provides/creates the appropriate receiving account.

Never hardcode secret API credentials into frontend code.

---

# 20. DATA / MEMORY

Persist important state.

Use the existing SQLite architecture if currently present.

Persist at minimum:

- agents
- tasks
- research candidates
- research evidence
- approved opportunities
- rejected opportunities
- product specifications
- generated products
- QA state
- store catalog
- orders
- revenue
- failures
- NEO events
- factory run/pause state

The factory should survive restarts without losing important work.

---

# 21. CURRENT MVP PRIORITIES

Implement in this order.

## Priority 1
Do a repository audit.

Document current functionality and identify broken paths.

## Priority 2
FIX AGENT MOVEMENT.

Agents must visibly walk around the pixel factory according to current state.

## Priority 3
Improve factory visual quality WITHOUT changing its established art style.

Focus on:

- more metallic environment
- better industrial walls
- more machinery
- better pipes
- better corridors
- humanoid pixel agents
- stronger room interiors
- better lighting
- warning lights
- old-school pixel-art consistency

## Priority 4
Verify START/STOP FACTORY works properly.

## Priority 5
Verify local Ollama integration.

## Priority 6
Improve Research Lab toward proven digital-product discovery.

## Priority 7
Optimize token usage.

## Priority 8
Verify Product Factory receives structured briefs and creates original market-informed products.

## Priority 9
Verify QA.

## Priority 10
Verify €20 store and fulfillment architecture.

---

# 22. MVP ACCEPTANCE CRITERIA

Do NOT declare the MVP stable until all of these are true:

[ ] Existing application starts successfully.

[ ] No major JavaScript console errors.

[ ] Backend starts successfully.

[ ] SQLite database works.

[ ] Factory state persists.

[ ] Agents are visible.

[ ] Agents are humanoid pixel sprites.

[ ] Agents physically move.

[ ] Movement corresponds to agent destination/state.

[ ] STOP FACTORY freezes the agents.

[ ] START FACTORY resumes the agents.

[ ] STOP FACTORY prevents new AI work.

[ ] Local Ollama connection is detected correctly.

[ ] Models can be unloaded for gaming mode.

[ ] NEO logs real system activity.

[ ] Research Lab can obtain real internet signals.

[ ] Research Lab stores source evidence.

[ ] Research Lab prioritizes already-proven digital-product formats.

[ ] Research Lab does not simply hallucinate product trends.

[ ] NEO scores opportunities.

[ ] NEO can reject weak opportunities.

[ ] Product Factory receives structured manufacturing specs.

[ ] Products are original rather than copied copyrighted works.

[ ] Token consumption is minimized.

[ ] Generated product ZIP is valid.

[ ] Product passes QA before publishing.

[ ] Store reads real catalog data.

[ ] Every product is priced at exactly €20.

[ ] Checkout architecture is ready.

[ ] Fulfillment architecture is ready.

[ ] Payment remains disabled until the user connects a receiving/payment account.

[ ] No unnecessary redesign of the existing repository occurred.

---

# 23. DEVELOPMENT BEHAVIOR

Work autonomously through the repository.

Do not ask for approval after every small change.

Run the project.

Test actual behavior.

Inspect browser/runtime errors.

Inspect backend errors.

Fix them.

Run tests again.

Continue iteratively.

After each substantial milestone, update project documentation with:

- what changed
- current architecture
- known issues
- next priority

Create a canonical file such as:

`PROJECT_MVP.md`

containing this specification.

Also create/update:

`ARCHITECTURE.md`

with the REAL current architecture after inspecting the repository.

Use those files as the project's source of truth in future Codex sessions.

Most importantly:

**DO NOT REINVENT THIS PROJECT. CONTINUE THE PROJECT THAT IS ALREADY HERE.**