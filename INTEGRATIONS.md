# Integration notes

Official sources inspected November 15, 2026. No real credentials or user accounts were used during development.

## Link — implemented backend

Official references:
- https://docs.link.com/authentication/oauth
- https://docs.link.com/guides/add-payments-to-your-agent
- https://docs.link.com/sdks/typescript
- https://github.com/stripe/link-cli/tree/main/packages/sdk

Packages: `@stripe/link-sdk` 3.1.0 and `next-auth` 5.0.0-beta.32 (Auth.js, GitHub provider). The application is ESM, as required by the Link SDK.

Implemented: confidential-client OAuth with PKCE and a provider-hosted authorization surface; single-use expiring state bound to authenticated owner and HttpOnly browser cookie; exact registered callback; server-only exchange; scope validation; encrypted access/refresh tokens; transactionally serialized refresh with atomic rotated-token storage; read-only SDK method listing reduced to an eligibility count; provider revocation and local token deletion only after confirmation; account and agent-assignment status; safe configuration export. Link grants are stored independently of agents.

Authentication uses Auth.js GitHub OAuth, then Link authorization requests only `payment_methods.agentic`. No passwords, OTPs, card numbers, session cookies, purchase requests, payment credentials, or financial-insights scopes are collected. The SDK's read response is not returned to the browser or persisted; only the number of eligible methods is saved. No Link account balance or spending limit is fabricated.

Requirements: a registered Link confidential client (application through Stripe's form in the OAuth guide), Stripe publishable key, exact redirect URI, Auth.js/GitHub configuration, and a 32-byte encryption key. Use HTTPS in production. The actual hosted account environment is shown as production; no payment is executed. The documented US/Canada payment eligibility restriction applies.

Errors are sanitized. Token response bodies and ciphertext never appear in safe status or exported configurations. Refresh errors with uncertain rotation stop automatic retries. Unconfirmed revocation is retained as an actionable status. Disconnecting Link revokes the provider grant and detaches agent assignments after provider confirmation; detaching a single agent does not revoke Link access.

Verified using mocked HTTP responses and an in-memory database: URL parameters, PKCE, owner/browser state checks, single use, expiry, denial, scope validation, authenticated encryption, owner isolation, live/demo separation, SDK status reads, serialized refresh rotation, revocation, and safe responses. **Not verified against live Link or GitHub accounts.** No registered credentials are present.

## Coinbase — real API Key Wallet setup, Base Sepolia reads

Official sources: https://docs.cdp.coinbase.com/wallets/quickstart/api-key-auth and https://github.com/coinbase/cdp-sdk

Installed `@coinbase/cdp-sdk` 1.62.0. Implements named account lookup and get-or-create, read-only credential testing, and paginated Base Sepolia token balances using integer base units converted to precise decimal strings. It does not connect a Coinbase exchange/consumer account or implement Agentic Wallet authorization.

Requires server-side `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET`. Read-access testing cannot validate the Wallet Secret or prove provisioning permission. EVM accounts are network-agnostic: creating an account does not constrain the resulting address to a single chain. Flux hardcodes Base Sepolia for all balance reads and funding guidance, exposes no mainnet selection or transaction API, and explicitly explains this address distinction. No automatic funding is performed.

## Crossmint — real staging server wallets

Official sources:
- https://github.com/Crossmint/wallets-server-quickstart
- https://docs.crossmint.com/api-reference/wallets/create-wallet
- https://docs.crossmint.com/api-reference/wallets/get-wallet-by-locator
- https://docs.crossmint.com/wallets/concepts/wallet-locators
- https://help.crossmint.com/articles/2804023362-how-do-i-get-production-access-to-crossmint

Installed `@crossmint/wallets-sdk` 1.0.7, matching the official server quickstart. Uses `createWallet({chain:'base-sepolia', owner, alias, recovery, signers})`, verified against the installed SDK declarations and implementation. Recovery and operational signers are server-controlled. Each wallet derives unique signer secrets via HMAC from separate server master secrets; neither derived nor master secrets are sent to the browser or saved in wallet metadata. Keep master secrets stable; rotating them without a signer migration can lose access.

The owner is the authenticated user's actual Flux user ID (`userId:<owner>`), not a fabricated email or user. A stable alias scopes each setup operation. Reconciliation uses the documented owner/alias locator with a read-only GET to the fixed staging API host. A 404 alone does not authorize a second creation after an unknown outcome.

Only `sk_staging_` server keys are accepted. Set `CROSSMINT_SERVER_API_KEY`, `CROSSMINT_RECOVERY_SIGNER_SECRET`, and `CROSSMINT_WALLET_SIGNER_SECRET`. Both signer secrets are 64 hex characters. Wallet create/read/balance scopes are needed; additional signer registration permissions may be required by the project's SDK signing model. Read tests check access only and do not create wallets. Production keys, mainnet selection, transfers, and automated funding are disabled. Staging is self-service; production currently needs enterprise onboarding and business verification.

Crossmint balances preserve the provider's native, USDC, and requested USDXM test-token quantities as decimal strings. Coinbase and Crossmint are not assumed to use the same test stablecoin.

## Crypto reliability and verification

`crypto_operations` persists stable operation identifiers, provider-specific names/aliases, a provisioning lease, sanitized error codes, and creation state. Concurrent duplicate requests share one operation. Unknown outcomes permit lookup/reconciliation only; they do not blindly recreate. Known preflight/authentication failures can retry after lookup. Completed providers survive another provider's failure. Balance-read failures retain prior quantities with an explicit failed-refresh status.

All crypto mutations require an Auth.js session, same-origin checks, and persistent per-owner rate limits. Link client registration is not required for crypto endpoints. SDK secrets are environment-only and are not exported or accepted in browser requests. Wallets are real provider records when credentials are supplied, while network/environment metadata explicitly identifies testnet/staging.

Verified with mocked adapters and an in-memory database: duplicate/concurrent provisioning, unknown-outcome reconciliation, partial failure, owner isolation, decimal precision, failed refresh preservation, staging-only key guards, official Crossmint lookup host/locator, and persistent rate limiting. SDK calls compile against the installed packages. No real Coinbase or Crossmint provider call was made; credentials are not configured. Production remains disabled.

## Deployment boundary

PGlite 0.5.16 is filesystem-backed and supports the current single-process Node.js deployment. A hosted PostgreSQL connection is still needed for multiple app instances. JWT sessions use Auth.js and live endpoints fail closed if auth or encryption configuration is absent. Local legacy demo sessions accept only UUID identifiers, so they cannot impersonate GitHub owner IDs if live configuration is later removed.

Payment execution, spending requests, routing, swaps, purchases, automatic funding, and monetization remain outside scope.
