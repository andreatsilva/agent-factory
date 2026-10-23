# Product showcase and local production teams

The public `products.html` catalog now includes product-type filters, real listing
art/PNG previews and sandboxed website/app demonstrations. During the temporary giveaway, catalog products have public ZIP downloads.
Set `FREE_PUBLIC_DOWNLOADS=0` and restart the factory to disable public downloads
and restore the saved asking prices; the original SQLite prices are never changed.
Operator exports remain authenticated. No credentials, raw briefs, model settings or client data
are part of the public product schema.

## Teams and model routing

Hardware and installed Ollama models are checked at startup and every minute.
`hardwareScaling: 1` selects 1–4 production lanes from CPU/RAM capacity; it also
bounds automatic crew allocation to a hardware-dependent ceiling, never over 124.
Existing workers are reused before new identities and crew docks are created.
Workers are scheduled roles, not separately loaded copies of a model. Inference
remains serialized to protect VRAM, while independent render/build work can use
the production lanes. Low available system RAM holds new cycles.

The router selects compatible **installed** Qwen models that fit the memory
budget. It never downloads large models automatically:

- Simple: smallest fitting Qwen3 model, for research summaries.
- Medium: fitting Qwen2.5-Coder model, for app briefs/code-oriented tasks.
- High: largest fitting Qwen3 model, for orchestration and visual concepts.
- Images: Stable Diffusion 1.5 (CUDA), followed by local Canvas text composition.
- Logos and apps: local SVG/Canvas and HTML renderers.

The operator page shows detected hardware, capacity and model assignments.
Disable hardware auto-scaling there to use manual lane settings. Upgrades raise
capacity on the next check; additional agents are created when there is queued
work, rather than being manufactured only to sit idle.

## New product cycle

When continuous LIVE production is enabled, the creative queue alternates
thumbnail → logo → basic app → AI image alongside the existing website workflow. It uses
audiences from saved non-simulated research, runs a bounded public RSS web search
for the new product type, summarizes the results locally, creates a structured
brief, renders a ZIP, and exposes the resulting concept in the showcase.

Search excerpts are references, not verified demand or prices. Failed search
requests are reported and fall back to the saved audience hypothesis. New
creative products are **unpriced concepts awaiting visual review and their own
comparable-price evidence**. Website asking prices are never reused as thumbnail,
logo or app prices. Marketplace accounts and checkout remain unconnected.

Current deliverables:

- Thumbnails: two 1280 × 720 PNG layouts with generated backgrounds when the image model is installed; editable design JSON, original PNG and generation metadata.
- Images: 768 × 432 editorial illustrations with model revision, prompt and seed.
- Logos: geometric SVG concepts, a PNG presentation and color palette.
- Apps: standalone HTML checklist/progress tracker and focus timer; checklist
  persistence works when browser storage is available. No generated code is
  executed on the server. Public demos run in an isolated sandbox without
  same-origin access; persistent storage may be unavailable there.

## Install local image agents

Run `./setup_image_ai.ps1 -Python <python.exe>` with Python 3.10–3.13. This installs
an isolated runtime under `../.runtime/image-ai` and a pinned Stable Diffusion 1.5
FP16 safetensors snapshot under `../.runtime/image-models`. PyTorch 2.7.1/CUDA 12.8
supports the RTX 5060. Allow roughly 10 GB disk space for runtime and model.
The model retains its safety checker. No API key, paid image service, external
image endpoint or custom model code is used. The model license is CreativeML
OpenRAIL-M: https://github.com/CompVis/stable-diffusion/blob/main/LICENSE.

`data/image-runtime.json` records local installation paths and stays out of Git
and Pages. Restart the factory after installing code. NEO detects the image
model during hardware refresh; the existing thumbnail crew handles image jobs.

The image worker is a private subprocess, with JSON over stdin/stdout and no
listening port. Runtime model loading is offline and uses safetensors only.
Ollama generation and diffusion share the factory inference lock. Before
starting diffusion, managed Ollama models are unloaded; the worker refuses to
start if any Ollama model remains loaded. Each image process exits before the
next text inference, releasing CUDA allocations. STOP kills the child and waits
for its exit. A four-minute timeout also terminates stalled rendering.

The high-tier text model plans the brief; Stable Diffusion makes the image;
Canvas adds crisp typography. These are separate roles, not interchangeable
text and image models. Model-generated artwork always requires visual review.
If no image model is installed, standalone images are not queued and thumbnails
remain clearly described as text/geometric layouts. Installed renderer failures
fail the job instead of silently returning placeholder artwork.

Artifacts and queue schedules live in SQLite. STOP aborts creative inference and
rendering; unfinished briefs are retryable on restart. Completed artifacts remain
available. Public preview URLs can only address completed products in the public
catalog; they cannot proxy arbitrary files or URLs.

Public download routes accept only completed LIVE catalog product IDs, not file
paths or arbitrary URLs. Customer packages contain deliverables and usage terms;
operator credentials, raw research state, and databases are never included.


## Research-to-production handoff

Creative production now searches for supported product formats independently of
website production. Search topics are hypotheses, not claimed demand. A search
must return relevant product-format references from at least two websites before a finding enters the
SQLite `creative_research_queue`. Failed searches never fall back to invented
research or a product build. The research schedule throttles repeated requests.

The same finding moves through QUEUED, PRODUCING and COMPLETE with its stable
product ID, saved references, research notes and generated brief. Completed
products use the existing preview, details page and free ZIP download routes.
STOP returns interrupted production to the queue; startup recovers unfinished
handoffs and recognizes already saved artifacts. Build failures retry at most
three times with a five-minute cooldown, then remain visible for investigation.

The Research Lab room inspector displays this queue, source links and finished
product links alongside the current website research count. SYNC RESEARCH also
collects a creative opportunity in LIVE mode. Continuous production discovers
and builds automatically. Earlier findings with unrelated sources are marked NEEDS_RESEARCH_REVIEW without deleting their artifacts. Source snippets remain unverified evidence: these
products still require visual, relevance, pricing and trademark review.


## GPU model teams

On the validated RTX 5060 8 GB / 32 GB RAM machine, the router assigns:
- NEO planning and orchestration: `qwen3.5:9b-q4_K_M`.
- Research summaries: `qwen3:1.7b`.
- Creative briefs and layout design: `qwen3:4b`.
- App/code work: `qwen2.5-coder:7b`.
- Image synthesis: the separate local Stable Diffusion 1.5 worker.
- Packaging, structural QA and file rendering: deterministic local code.

The new models are installed with the existing Ollama executable using
`ollama pull qwen3.5:9b-q4_K_M` and `ollama pull qwen3:4b`. Model binaries remain
local, outside Git and Pages. The router accepts only supported installed
models within its hardware budget and keeps smaller models as fallbacks.
Model size is a capacity heuristic, not a guarantee of quality. Existing brief,
uniqueness and artifact quality checks still decide whether output can proceed.

Text models stay warm for up to 60 seconds by default. A different team's turn
unloads the previous managed model; image generation releases all managed text
models first. STOP still aborts work and unloads the managed models immediately.
Only one large inference runs at a time; agent count is not GPU concurrency.
Context is capped at 8192 tokens to preserve headroom on this installation.

Private NEO/agent details and the signed-in operator page show routed models.
NVIDIA utilization, VRAM use, sampled peak utilization and recent tokens/second
are available through private hardware/status endpoints. These are measurements,
not animation activity. Idle utilization can be zero, and short tasks can fall
between samples. `gpuMemoryPercent` is the share of Ollama model memory on GPU,
not a layer count or a claim about compute utilization. The 9B benchmark used
about 85% GPU model-memory residency (some memory remained on CPU), around
7.2 GB total VRAM and 39–41 output tokens/second; the 4B model used full GPU
model-memory residency and about 110 output tokens/second. Speeds vary by task.
