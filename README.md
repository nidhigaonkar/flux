# Flux

Flux helps developers set up and manage payment wallets and accounts for AI agents from one workspace. It supports Link account authorization, Coinbase user wallets, Coinbase and Crossmint testnet wallet provisioning, agent connections, and safe configuration exports, with provider credentials required for live integrations.

A wallet workspace with a hosted Link OAuth backend. Next.js App Router, TypeScript, Tailwind, Zod, Better Auth email/password sign-in, and PostgreSQL via PGlite. No Prisma.

## Run

Node.js 22+ and pnpm:

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000/setup. Without credentials, the setup page lists the missing configuration and disables live authorization.
Coinbase and Crossmint testnet provisioning are implemented; both require server credentials and Flux sign-in. No Link OAuth client registration is required for crypto setup.

## Configure real Link account connections

1. Set `AUTH_URL` to your app origin (`http://localhost:3000` locally) and `AUTH_SECRET` to a random server secret of at least 32 characters. No GitHub account, OAuth app, or email delivery service is required for Flux sign-in.
2. Open `/login`, select **Create account**, and register with your name, email, and a password of at least 12 characters.
3. Register a **confidential Link OAuth client** through the registration form linked from https://docs.link.com/authentication/oauth. Register the exact URI `http://localhost:3000/api/link/callback` for local development. Use a separate registered HTTPS callback for production.
4. Set the returned `LINK_CLIENT_ID` and `LINK_CLIENT_SECRET`. Set `LINK_PUBLISHABLE_KEY` to the Stripe publishable key from your Stripe Dashboard. A Stripe secret API key cannot authenticate Link OAuth.
5. Set `LINK_REDIRECT_URI` to the exact registered callback URI. It must use the same origin as `AUTH_URL` and the `/api/link/callback` path, without query parameters.
6. Generate `ENCRYPTION_KEY` with `openssl rand -hex 32`. Keep the 64 hex characters in the server environment. Losing this key makes saved tokens unreadable. Do not rotate it without a token re-encryption migration.
7. Restart the app, sign in to Flux with email and password, select **Connect Link**, and complete consent on Link's official website.


Link payment eligibility is currently documented for US and Canadian customers. The account connection itself is real; this build does not initiate payments, requests for purchases, or credentials for spending.

## Product flow

- **Wallet Setup**: Link OAuth, safe status, eligible payment-method count, and revoke/disconnect.
- **Agent Setup**: create a named agent record independently of accounts.
- **Connections**: attach existing accounts to agents; detach without revoking the account. An account may be attached to multiple agents.
- **Export**: safe account references and metadata only. A Flux Link connection identifier is locally assigned, not a provider account identifier. No token or spending authorization is exported.

Signing in opens an owner-scoped **live** workspace. Old local demo wallets are not adopted, copied, or exposed to that user. Legacy demo APIs remain available only in local development when application authentication is not configured. Production requires configured authentication and a valid signed-in session. Live Link endpoints always require authenticated ownership and valid encryption/OAuth configuration, even in local development.

## Planned capability

- Let users select and set up multiple wallet types at once in a single flow, including Coinbase and Crossmint wallets and a Link payment account. Handle each provider independently, preserve successful connections if another fails, and allow retries for incomplete setup.

## Backend

- `auth.ts`: Better Auth email/password authentication and database-backed sessions. Owner IDs use the stable internal user ID, never an editable email. Password hashing, session generation, cookie validation, and CSRF/origin checks are provided by the library.
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

Configure Flux sign-in (`AUTH_URL`, `AUTH_SECRET`) first. Then configure each provider independently:

- Coinbase: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` from the CDP Portal.
- Crossmint: `CROSSMINT_SERVER_API_KEY` from the self-service staging console (must start `sk_staging_`), plus separate `CROSSMINT_RECOVERY_SIGNER_SECRET` and `CROSSMINT_WALLET_SIGNER_SECRET` values generated using `openssl rand -hex 32`. Preserve both master signer secrets securely; do not rotate without migrating wallet signers.

Provider Settings lists missing variable names and offers read-access tests without creating wallets. Wallet Setup creates named, server-controlled wallets, displays full addresses, supports precise test-token balance reads, and links to official funding instructions. Accounts can be attached to agents separately. The backend exposes no transfers or mainnet network choice. Coinbase EVM account addresses are network-agnostic; Flux restricts reads and instructions to Base Sepolia rather than claiming the address cannot exist on mainnet.

`POST /api/crypto` accepts `provider`, a UUID `requestKey`, `name`, and only `network: "base-sepolia"`. `POST /api/crypto/:id` supports `refresh`, `reconcile`, and `retry`; retries after an uncertain mutation are read-only reconciliations. `POST /api/crypto/test` tests read access. `GET /api/crypto` returns configuration readiness and owner-scoped operation status. Secrets never appear in responses or config exports.

The crypto adapter tests use mocks. No live credentials were available and no real test wallet was provisioned during development. See INTEGRATIONS.md for official sources, installed SDK versions, ownership, and limitations.

## User-owned Coinbase wallets inside Flux

Wallet Setup now includes a separate **CDP User Wallet** flow using `@coinbase/cdp-react`, `@coinbase/cdp-core`, and `@coinbase/cdp-hooks` 0.0.132. Users sign in to Flux first, then use Coinbase’s email sign-in component inside the page. Coinbase creates an EVM EOA on login. An existing Coinbase identity returns its wallet rather than creating a new wallet on every Flux save.

Set `NEXT_PUBLIC_CDP_PROJECT_ID` in `.env` using the Project ID from https://portal.cdp.coinbase.com/wallets/non-custodial/clients and allow `http://localhost:3000` for local development. The server’s `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` must belong to that same project. Restart Flux after changes; `NEXT_PUBLIC_` configuration is embedded at build time. Use a separate project and exact production domain for production. This flow does not require `CDP_WALLET_SECRET`.

The SDK UI is gated on initialization and wallet provisioning. `Connect wallet to Flux` sends the SDK access token transiently to an authenticated, same-origin backend endpoint. The server calls the official `cdp.endUser.validateAccessToken`, checks project and subject claims against the verified end user, and confirms the selected address is an active EOA owned by that end user. Only then is a `user_controlled` wallet reference persisted. The CDP access token, authentication methods, OTP, and private key are not stored or exported by Flux. Coinbase’s SDK manages its own user session.

The saved wallet appears on Connections and can be attached to agents; this grants no delegated signing or spending rights. Detaching preserves the wallet. The existing API-key/server-controlled wallet flow remains under **Advanced: server-controlled wallets**. The earlier local setup wallet is a server-controlled account and is not automatically adopted as a user wallet.

User-wallet use is labeled Base Sepolia. EVM addresses also exist on other networks; no transaction, funding request, mainnet action, or delegation is implemented in this flow. Live email/OTP verification has not been performed because project/domain configuration is still required.

## Email/password login

`/login` supports account creation and sign-in; the application header includes sign-out. Better Auth 1.7.25 handles passwords and sessions through Kysely’s built-in PGlite dialect. `006_email_auth.sql` adds separate auth tables. Sign-in and signup are rate limited with persistent counters, passwords require 12–128 characters, session cookies are HttpOnly/SameSite and Secure in production, and sessions are checked against the database so sign-out revokes them immediately.

`AUTH_URL` and `AUTH_SECRET` are the only app authentication environment variables. A missing local secret was generated securely in the ignored `.env`; it is not shown or committed. Production requires an HTTPS origin and its own random secret.

Email verification and email-based password reset are not enabled in this simple flow; no email is sent on registration. Existing demo and former GitHub-owned records are preserved and not automatically transferred based on an email address. New users have private workspaces identified by `user:<internal ID>`. Coinbase/Link authorization is still separate from Flux login.
