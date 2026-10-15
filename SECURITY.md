# Security boundaries

The factory operator server is intended for a trusted local PC. It has loopback binding, Host checks and cross-origin mutation guards, but **no remote user authentication**. Its APIs contain operator data and production controls. Never publish that server or Ollama directly. CORS and a secret URL do not replace authentication.

Keep `.env`, databases and WAL/SHM files, logs, test output, tunnel credentials and customer artifacts out of Git. Ignore rules cover the normal locations, environment variants and common database/private-key extensions. Ignore rules do not remove previous commits. If a real key was pushed, revoke/rotate it first, then address history; see [GitHub guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

The existing local Ollama integration needs no cloud API key. Optional Stripe and future marketplace credentials belong only in the local server environment. The observation feed needs no API key because every field it serves is intentionally public.

## Inspection — 14 October 2026

- The available local Git history contained one commit, `9bf55f32aeceb644fac8e88da293d233cec8017d`, matching GitHub `main` before this change.
- A text scan found no matches for common Stripe, GitHub, OpenAI-style, AWS, Google, JWT or private-key credential formats. This bounded pattern scan cannot guarantee the absence of every secret or personal-data format.
- No `.env` was present. The local SQLite database, logs and test output were ignored and untracked. `.env.example` contains setup values and a placeholder Stripe example.
- Other clones, forks, deleted remote refs, GitHub caches and files uploaded by other means were not audited.

## Public interface

`public-snapshot.mjs` constructs an explicit bounded schema instead of serializing database records. `viewer-server.mjs` serves exactly GET `/snapshot`, GET `/products` and POST `/chat`; it cannot forward arbitrary paths, client headers or factory mutations. Its upstream must be a loopback HTTP origin. Snapshot reads share a two-second cache; catalog reads share a ten-second cache. Failed/stale upstream data returns 503 without internal error details.

The product catalog intentionally publishes bounded listing text, price, recorded discount, features, file count and date for QA-passed, completed LIVE products. Both local and viewer endpoints apply the explicit `public-products.mjs` schema. It strips operator URLs, external listing URLs, packages, research records, metrics and unknown fields. Browser rendering uses textContent and same-origin details URLs; no product HTML or generated SVG is executed. There is no public checkout or download. The endpoint rejects query strings and cannot select DEMO mode or arbitrary product files.

The visitor conversation is separate from operator chat. `public-chat.mjs` has no database or tool access: its only inputs are validated visitor text, bounded visitor-provided history and sanitized public facts. Text cannot become an operator instruction in this code path. The system prompt also asks the model to refuse action requests, but the actual control boundary is the absence of tools and mutation routes, not model compliance. Public POSTs cannot select a model or send system/tool roles. No visitor conversation is persisted; usage totals are recorded by the existing local generator. Browser output uses textContent, never model-generated HTML.

The viewer and local public-chat handler both limit requests (six/minute, sixty/hour), and each allows one pending reply. The model budget is 180 output tokens, with a 45-second generation timeout. Occupied model inference and gaming mode block new visitor inference. Visitor chat may use an idle model slot during web research; subsequent factory inference waits for the bounded chat turn. STOP aborts a running reply. These shared limits bound anonymous inference load but are not authentication or a full denial-of-service defense. CORS restricts browser origins; nonbrowser clients can still contact these deliberately public endpoints. The tunnel carries visitor messages to the PC; private operator history is never included.

The Pages build copies an explicit file allowlist and rejects unexpected leftover output. Only that artifact is deployed. Counts reveal factory activity and output volume; enable the feed only when those are appropriate to publish. Never add private fields to this public schema.

Tests cover sensitive-field exclusion, prototype-key rejection, private-route/method restrictions, CORS, cache coalescing, offline behavior, stale data, credential-bearing URL rejection and the static artifact boundary.
