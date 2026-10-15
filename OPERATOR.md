# Hosted operator access

Open https://andreatsilva.github.io/agent-factory/operator.html . The public factory and product catalog link to **OPERATOR LOGIN**.

The command deck manages start/stop (gaming mode), research, product cycles, continuous production, parallel lanes, automatic crew capacity, research interval, price discount, recorded-cost budgets, department crew counts and expansion bays. It shows the existing pixel factory floor, production jobs, research status and recent product stages. Marketplace accounts, payment processing and external client messaging are not managed here.

## First login

Run `node setup-operator.mjs` locally once. It creates username `admin` with a cryptographically random password. The only password delivery copy is `data/operator-login.txt`, ignored by Git. Put it in your password manager and then remove that delivery file. On Windows, restrict the credential files to your Windows account (the initial setup for this PC applies this restriction).

The verifier is stored separately in ignored `data/operator-auth.json`: a random 32-byte salt and a 64-byte scrypt hash, using N=131072, r=8, p=1. No password, hash or signing key belongs in GitHub settings, Pages artifacts or frontend configuration. Restart `viewer-server.mjs` after initial setup; it loads the verifier once at startup. Missing credentials disable login and invalid records fail startup.

To reset a forgotten password, run `node setup-operator.mjs --reset` **on the PC**, then restart the viewer. The restart revokes every session. Password reset preserves MFA. No public signup or password-reset endpoint exists. Authenticator enrollment requires a signed-in session and fresh password verification. Do not paste the password into a chat or commit it.

## Sessions and controls

Login verifies the password on the PC gateway and, once enrolled, a second factor. A completed login returns a random 256-bit bearer token over HTTPS, held only in the page's JavaScript memory. It is never placed in a URL, cookie, localStorage or sessionStorage. Refreshing or leaving the page clears that tab's copy; sign in again. The gateway stores only token digests in memory, accepts at most two sessions and enforces a one-hour absolute expiry. Restarting the gateway revokes all sessions. **SIGN OUT** revokes the current token; **REVOKE ALL SESSIONS** revokes both. If offline revocation fails, the UI clears its copy and explicitly reports that server revocation was not confirmed.

The gateway requires the exact configured Pages Origin plus authentication on every management request. Origin checks supplement authentication; scripts can spoof Origin, so they are never sufficient on their own. Bearer headers avoid dependence on third-party cookies and require CORS preflight. The page refuses framed login and uses a restricted CSP and text-only rendering for server data. Like any browser bearer-token system, a compromise of the trusted Pages origin or browser could steal a live token; it is not immune to XSS or malware.

Pause the factory before saving production settings if a job is active. The backend rejects conflicting changes. START resumes checkpointed work. Crew removals cannot remove original, core or busy workers. Layout edits carry a revision to reject stale changes; only empty outer bays can be removed. Existing workflows continue if you close the browser or sign out. The public catalog/feed and visitor chat remain independent.

## Gateway boundary

Only port 8788 is tunneled. Operator server 8787 and Ollama 11434 remain loopback-only. `operator-gateway.mjs` supports fixed `/operator/login`, `/operator/logout`, `/operator/logout-all`, `/operator/state` and `/operator/action/{start,stop,research,cycle,config,crew,layout}` routes. There is no arbitrary-path proxy, remote shell, package download, file browser or direct Ollama endpoint. Action bodies have explicit field allowlists; existing backend validation still runs. Config changes cannot supply provider URLs, keys, operating mode or arbitrary fields. Upstream requests never forward caller credentials, cookies or Origin headers.

Login allows one scrypt operation at a time, four attempts/minute and eight/15 minutes globally. Management allows 30 state requests/minute, 12 actions/minute and one mutation at a time. Request bodies are capped at 8 KB and upstream calls time out. Login attempts, logout and successful actions write bounded credential-free audit records to ignored `data/operator-audit.jsonl` (one rotated previous file). These controls limit abuse; shared rate limits can still be exhausted by an attacker. Per-user roles and edge DDoS protection are not implemented. A stable domain with managed identity/edge protections is the appropriate next step for wider operator access.

Guidance used: [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Authenticator MFA

After signing in, open **SECURITY // AUTHENTICATOR**, re-enter your current password and choose **SET UP AUTHENTICATOR**. In Microsoft Authenticator select **Add account → Other account**, or in Google Authenticator select **Add → Scan a QR code**. Scan the QR code (or manually add the displayed key as a time-based account), then enter the six-digit code and choose **ACTIVATE MFA**. The QR is generated locally on the PC and rendered in the browser; it is never sent to a third-party QR service. Setup expires after ten minutes, is tied to that session and is inactive until a code is confirmed. Canceling, signing out or restarting discards pending setup.

Save the ten single-use recovery codes in your password manager before dismissing them. They are displayed only once and never stored in plaintext. A recovery code replaces the app code, but still requires the password. Activation revokes existing sessions and login challenges, then issues a fresh session. Future logins require password followed by a six-digit app code or recovery code. Password-only challenges expire after five minutes and cannot read state or perform actions. If you just used a code to enroll or log in, wait for the app to display the next code before using it again. Keep the phone and PC clocks synchronized.

TOTP uses RFC 6238 HMAC-SHA1, a random 160-bit key, six digits and 30-second periods, accepting adjacent periods for clock drift. Accepted counters cannot be replayed, including after restart. Verification allows ten attempts per 15 minutes globally and at most five per challenge/setup. Fresh-password checks share the existing password throttle. Bad codes never create sessions.

Active MFA state is stored separately in ignored `data/operator-security/mfa.sqlite`, with SQLite FULL synchronous commits for the key, latest accepted counter and SHA-256 recovery-code hashes. The directory is restricted to the current OS user (Windows ACL or Unix mode 0700), including SQLite journal files. Failure to load or persist active state fails closed. This protects against other unprivileged OS users; it is not encryption against an administrator or compromised PC. Back up this private directory with your credentials and never publish it. Public feeds, audits and Pages builds exclude these fields.

`GET /operator/mfa` returns only enabled/available status and recovery-code count. `POST /operator/mfa/setup`, `/confirm` and `/cancel` require full authentication; setup additionally requires the password. `POST /operator/verify` accepts only the short-lived challenge and second factor. There is no remote disable/reset endpoint.

If your phone and all recovery codes are lost, stop the viewer on the PC, run `node setup-operator.mjs --reset --reset-mfa`, then restart it. This explicitly resets MFA and rotates the password; enroll again immediately. Ordinary `--reset` changes only the password and preserves MFA. Stop the viewer first for local recovery so its in-memory state cannot overwrite the reset. Anyone with control of your Windows account can perform this recovery, as they can already modify the factory.

Compatibility: [Google Authenticator key URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format), [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238). MFA is available after deployment but becomes active on your account only after you confirm a code from your authenticator.
