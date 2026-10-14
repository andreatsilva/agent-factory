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
2. Select **GitHub Actions** in repository Settings → Pages. `pages.yml` deploys only the fifteen-file `pages-dist` allowlist.
3. Without a configured feed, the page still renders with camera/sector navigation and clearly labels itself an offline layout preview.

Local static preview: run `npm run build:pages`, then `npm run preview:pages` and open http://127.0.0.1:8790/agent-factory/ . Relative imports and sprite URLs support the repository subpath. The local operator page continues to use its normal backend.

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

References: [GitHub static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Cloudflare Tunnel configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/).
