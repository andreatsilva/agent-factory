# GitHub Pages observation deck

Public site: https://andreatsilva.github.io/agent-factory/ . Pages hosts the art and navigation; Node, SQLite, Ollama and controls stay on the PC.

```text
Visitor → GitHub Pages (visual files)
        → HTTPS /snapshot → PC viewer:8788
                         → local factory:8787/api/public/snapshot
```

The feed shares room geometry, agent IDs/department/activity/positions, running or paused state, and product/queue counts. It excludes product titles, revenue, clients, briefs, logs, chat, prompts, keys, packages and payment information. Anyone who knows its URL can read these public fields. CORS is not authentication.

## Publish

1. Push to `main` in `andreatsilva/agent-factory`.
2. Select **GitHub Actions** in repository Settings → Pages. `pages.yml` deploys only the seventeen-file `pages-dist` allowlist.
3. Without a configured feed, the page still renders with camera/sector navigation and clearly labels itself an offline layout preview.

Local static preview: run `npm run build:pages`, then `npm run preview:pages` and open http://127.0.0.1:8790/agent-factory/ . Relative imports and sprite URLs support the repository subpath. The local operator page continues to use its normal backend.

The build stamps one content version onto module imports, sprite URLs and viewer configuration. This prevents GitHub Pages/browser caches from combining new UI code with older modules. The CSP hash is computed after versioning and newline normalization. The static HTML starts in public mode so operator controls stay hidden while JavaScript loads.

## Connect the PC

1. Start the factory using `start_factory.bat` (port 8787).
2. Run `npm run start:viewer` in another terminal (port 8788).
3. Route an HTTPS tunnel **only to `http://127.0.0.1:8788`**. Never tunnel the operator's 8787 or Ollama's 11434, open router ports, or bind the operator server to 0.0.0.0.
4. Set repository Settings → Secrets and variables → Actions → Variables → `FACTORY_FEED_URL` to `https://your-feed-host/snapshot`, then rerun the Pages workflow. This URL is public, not a secret. Alternatively set `feedUrl` in `pages-config.json`.

For a temporary connection with the official Cloudflare executable installed:

```powershell
cloudflared tunnel --url http://127.0.0.1:8788
```

Append `/snapshot` to its displayed HTTPS address. Quick Tunnel addresses change on restart and have no uptime guarantee; use a named tunnel with a stable hostname for ongoing use. The PC, factory, viewer and tunnel must all remain running. On disconnection the page freezes the last known state and shows OFFLINE with its update time.

This PC's portable Cloudflare executable is in ignored `data/tools/cloudflared.exe`; use that path in place of `cloudflared` if it is not on PATH. `stop_public_view.ps1` stops the recorded temporary viewer/tunnel session while leaving the factory running. It verifies the process command lines before stopping them. After manually restarting a tunnel, update `FACTORY_FEED_URL` and run the Pages workflow again.

Local `.env` options: `PAGES_ORIGIN=https://andreatsilva.github.io` (no path/trailing slash), `VIEWER_PORT=8788`, and `FACTORY_LOCAL_URL=http://127.0.0.1:8787`. HTTPS is required for deployed feeds. Browser requests omit credentials and reject redirects; the built Content Security Policy permits connections only to the configured feed origin.

Never put an API key in this frontend, repository variables, URL parameters or browser storage. A private remote operator interface would need separate authentication; the public viewer has no operator actions.

## Visitor conversations

Visitors can click **TALK TO NEO** or the floating central character. `POST /chat` on the same public feed origin accepts a message of at most 600 characters and up to six bounded recent messages. The viewer forwards only these fields to the fixed local `/api/public/chat` route. It cannot forward commands, tool definitions, arbitrary paths, models, headers or credentials. The model receives only public running state, active-agent count and aggregate production counts; it never receives operator chat, client records or files.

Replies use the installed local NEO model and have no tools or execution path. They may discuss ideas but cannot perform factory actions. Chat history lives in the visitor's tab; the server does not save visitor messages or replies. Normal local AI usage totals are still recorded. Messages transit the configured HTTPS tunnel to the PC. Avoid entering personal information.

One visitor reply runs at a time, with shared limits of six requests/minute and sixty/hour, an 8 KB body limit, a 180-token response budget and bounded timeouts. These are global limits, not identity-based authentication. Factory inference has priority: visitors get a busy response while the model is occupied. Web research and other non-inference work can continue during visitor chat. A factory inference that becomes ready during a short visitor turn waits for that turn instead of failing the production job. Gaming mode blocks chat inference and STOP aborts current inference. Offline/missing Ollama produces a retryable error. This anonymous endpoint consumes PC resources, so keep the limits in place; a stable public deployment may later need an edge abuse challenge.

NEO's original project sprite is `assets/neo-suspended-v1.png`; `assets/README.md` records its generation prompt. The factory retains its existing room layout and pixel-art renderers. Only the central figure, suspension animation and conversation portrait changed.

References: [GitHub static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Cloudflare Tunnel configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/).
