# Flux

A full landing page and a working local wallet setup product built with Next.js App Router, TypeScript, Tailwind CSS, a shadcn-style Radix button, Zod, and embedded PostgreSQL (PGlite). Prisma and SQLite are not used.

## Run locally

Requires Node.js 22+ and pnpm.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000. The landing page links to `/dashboard` and `/agents/new`. The database initializes automatically from `db/migrations/001_initial.sql` and persists at `.data/postgres`. No database service, provider accounts, or credentials are required. Use one running app process per PGlite data directory. PGlite is PostgreSQL compiled to WASM; a remote PostgreSQL driver will be needed for multi-process hosting.

## Try the product

Open Wallet Setup (`/setup`) to select providers, label wallets, and simulate success, pending authorization, or failure. These are workspace records and do not create agents. Finish pending setup or retry failures from the wallet list.

Create agents separately at `/agents/new`. On Connections (`/connections`), choose an agent and attach existing ready wallets. A wallet can be attached to multiple agents. Detaching removes only the selected assignment and preserves the workspace wallet and other assignments. All state persists across refreshes. Existing demo wallets and assignments are migrated automatically by `db/migrations/002_workspace_wallets.sql`.

The export modal includes a readable JSON preview, clipboard copy, download, and a Node.js example. Demo exports explicitly identify simulated data and do not authorize spending.

## Data and boundaries

- Server-persisted agents, selected providers, wallet records, operations, and activity.
- Owner-scoped access using a local demo-only opaque HttpOnly SameSite cookie. This is demo isolation, not production authentication.
- Parameterized SQL, validation, same-origin mutation checks, and basic process-local rate limiting.
- Transactional demo setup, unique agent/provider records and operation keys; concurrent retries preserve successful connections.
- Crypto quantities stored as decimal strings. No combined crypto/payment account totals.
- Local disconnect never claims external deletion or revocation.
- No secret inputs, token storage, payment execution, or live provider calls are implemented.
- All API access fails closed when `NODE_ENV=production`. `pnpm build` validates production compilation; `pnpm start` serves the marketing pages but product APIs intentionally return 503 until production authentication is implemented.

The frontend is complete for the local demo. **Live wallet provisioning and hosted authorization are not implemented.** Provider settings document official requirements and link to provider setup instead of accepting credentials that cannot be safely used. See [INTEGRATIONS.md](INTEGRATIONS.md).

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

The tests run the demo adapters against an in-memory PostgreSQL database. They cover partial success, retries/concurrency, selected provider progress, distinct Link behavior, owner isolation, refresh, disconnect/reconnect, decimal balances, and secret-free valid exports. Real provider calls are not tested.

## Project structure

- `app/page.tsx`: complete marketing landing page
- `components/`: dashboard, setup wizard, detail, export, and shared UI
- `app/api/workspace/route.ts`: validated demo API and local session boundary
- `lib/db.ts`: PostgreSQL repository and transactional operations
- `lib/providers.ts`: capability metadata, deterministic demo adapter, safe export
- `lib/branding.ts`: single product branding constant
- `db/migrations/001_initial.sql`: idempotent local schema migration

## Deployment

This repository uses a Node.js server and filesystem-backed PGlite. It is not packaged for Sites/Cloudflare Workers. No hosted deployment was made. Production launch additionally needs supported authentication, a hosted PostgreSQL connection, encrypted secret storage, genuine provider adapters, provisioning reconciliation, and tests for those live boundaries. The local demo intentionally cannot bypass production authentication.
