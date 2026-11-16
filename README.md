# Flux

A wallet workspace with a real hosted Link OAuth backend. Next.js App Router, TypeScript, Tailwind, Zod, Auth.js GitHub sign-in, and PostgreSQL via PGlite. No Prisma.

## Run

Node.js 22+ and pnpm:

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000/setup. Without credentials, the setup page lists the missing configuration and disables live authorization. There is no simulated approval on this page. Coinbase and Crossmint testnet provisioning are implemented; both require server credentials and Flux sign-in. No Link OAuth client registration is required for crypto setup.

## Configure real Link account connections

1. Register a GitHub OAuth application for Flux. For local development use homepage `http://localhost:3000` and authorization callback `http://localhost:3000/api/auth/callback/github`.
2. Set `AUTH_URL`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_SECRET` in `.env`. Generate an independent Auth.js secret with `openssl rand -base64 32`.
3. Register a **confidential Link OAuth client** through the registration form linked from https://docs.link.com/authentication/oauth. Register the exact URI `http://localhost:3000/api/link/callback` for local development. Use a separate registered HTTPS callback for production.
4. Set the returned `LINK_CLIENT_ID` and `LINK_CLIENT_SECRET`. Set `LINK_PUBLISHABLE_KEY` to the Stripe publishable key from your Stripe Dashboard. A Stripe secret API key cannot authenticate Link OAuth.
5. Set `LINK_REDIRECT_URI` to the exact registered callback URI. It must use the same origin as `AUTH_URL` and the `/api/link/callback` path, without query parameters.
6. Generate `ENCRYPTION_KEY` with `openssl rand -hex 32`. Keep the 64 hex characters in the server environment. Losing this key makes saved tokens unreadable. Do not rotate it without a token re-encryption migration.
7. Restart the app, sign in to Flux with GitHub, select **Connect Link**, and complete consent on Link's official website.

Do not paste credentials into chat, browser storage, or source control. `.env` and `.data` are ignored. `.env.example` contains placeholders only.

Link payment eligibility is currently documented for US and Canadian customers. The account connection itself is real; this build does not initiate payments, requests for purchases, or credentials for spending. A Link account is not a blockchain wallet.

## Product flow

- **Wallet Setup**: Link OAuth, safe status, eligible payment-method count, and revoke/disconnect.
- **Agent Setup**: create a named agent record independently of accounts.
- **Connections**: attach existing accounts to agents; detach without revoking the account. An account may be attached to multiple agents.
- **Export**: safe account references and metadata only. A Flux Link connection identifier is locally assigned, not a provider account identifier. No token or spending authorization is exported.

Signing in opens an owner-scoped **live** workspace. Old local demo wallets are not adopted, copied, or exposed to that user. Legacy demo APIs remain available only in local development when application authentication is not configured. Production requires configured authentication and a valid signed-in session. Live Link endpoints always require authenticated ownership and valid encryption/OAuth configuration, even in local development.

## Backend

- `auth.ts`: Auth.js GitHub OAuth and signed/encrypted JWT sessions. Owner IDs are based on the provider's stable account ID, not an editable email.
- `lib/link/config.ts`: required configuration, AES-256-GCM with owner/connection-bound authenticated context.
- `lib/link/oauth.ts`: documented Link authorization, token exchange, refresh, and revocation HTTP calls. No guessed endpoints or automatic mutation retries.
- `lib/link/service.ts`: persistent single-use owner/browser-bound state, encrypted PKCE verifier, grants, transactional refresh rotation, reconciliation-required state after an uncertain refresh, SDK account reads, and confirmed revocation.
- `app/api/link/*`: authenticated, same-origin endpoints with redacted errors and persistent per-owner rate limiting.
- `db/migrations/003_link.sql`: encrypted token and OAuth state tables. Secret material is never stored in wallet JSON.

API:

| Route | Purpose |
| --- | --- |
| `GET /api/link/status` | Configuration readiness and safe status for the authenticated owner's accounts |
| `POST /api/link/start` | Issue a PKCE authorization URL and HttpOnly browser-binding cookie |
| `GET /api/link/callback` | Consume state once, exchange the code, validate granted scope, encrypt tokens |
| `POST /api/link/:id` | Refresh expiry as needed, read methods with the official SDK, persist only eligibility count |
| `DELETE /api/link/:id` | Revoke the refresh token at Link, clear saved tokens, detach agents after confirmation |

Callback redirects contain only safe result codes. Incoming Next.js request logging is disabled to avoid logging OAuth authorization codes; deployment proxies must also avoid recording callback query strings. All Link HTTP routes return `Cache-Control: no-store`. Provider errors and bodies are never returned to browsers.

A failed or uncertain revocation does not claim success or delete the saved token. A refresh timeout is treated as unknown because rotation may have happened at the provider; the old refresh token is not blindly retried. Authorization state expires after ten minutes. The provider authorization code is exchanged immediately after a validated callback.

## Database and hosting

PGlite initializes migrations automatically and persists in `.data/postgres` (or `DATABASE_PATH`). This is filesystem-backed PostgreSQL compiled to WASM: run exactly one application process per data directory. Refresh/revoke transactions serialize access to each stored grant. Use a Node.js host with persistent storage; this is not a Cloudflare Worker or a horizontally scaled deployment. Move the repository to hosted PostgreSQL before running multiple server instances. Require HTTPS and exact registered production URLs. No hosted deployment is included.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
```

Tests mock provider HTTP responses and use an in-memory database. They cover state owner/browser binding, expiry, replay protection, PKCE, granted scopes, encryption and owner binding, secret-free status, live/demo isolation, concurrent refresh rotation, uncertain refresh, confirmed/failed revocation, wallet assignment, input validation and local demo lifecycle.

No real GitHub login, Link authorization, token exchange, account read, or revocation was performed during development. End-to-end live verification requires the configuration above. See `INTEGRATIONS.md` for official references and remaining capabilities.

## Coinbase and Crossmint testnet setup

Configure Flux sign-in (`AUTH_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`) first. Then configure each provider independently:

- Coinbase: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` from the CDP Portal.
- Crossmint: `CROSSMINT_SERVER_API_KEY` from the self-service staging console (must start `sk_staging_`), plus separate `CROSSMINT_RECOVERY_SIGNER_SECRET` and `CROSSMINT_WALLET_SIGNER_SECRET` values generated using `openssl rand -hex 32`. Preserve both master signer secrets securely; do not rotate without migrating wallet signers.

Provider Settings lists missing variable names and offers read-access tests without creating wallets. Wallet Setup creates named, server-controlled wallets, displays full addresses, supports precise test-token balance reads, and links to official funding instructions. Accounts can be attached to agents separately. The backend exposes no transfers or mainnet network choice. Coinbase EVM account addresses are network-agnostic; Flux restricts reads and instructions to Base Sepolia rather than claiming the address cannot exist on mainnet.

`POST /api/crypto` accepts `provider`, a UUID `requestKey`, `name`, and only `network: "base-sepolia"`. `POST /api/crypto/:id` supports `refresh`, `reconcile`, and `retry`; retries after an uncertain mutation are read-only reconciliations. `POST /api/crypto/test` tests read access. `GET /api/crypto` returns configuration readiness and owner-scoped operation status. Secrets never appear in responses or config exports.

The crypto adapter tests use mocks. No live credentials were available and no real test wallet was provisioned during development. See INTEGRATIONS.md for official sources, installed SDK versions, ownership, and limitations.
