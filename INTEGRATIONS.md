# Provider integration notes

Official documentation inspected November 15, 2026. No real credentials were used, no wallet was provisioned, and no user account was authorized.

## Implemented dependencies

- Next.js 15.5.29, React 19.3.1, Zod 3.25.76
- `@electric-sql/pglite` 0.5.16 (local PostgreSQL)
- No provider SDK is installed. No provider API method or endpoint is called in this build.

## Coinbase

Official source: https://docs.cdp.coinbase.com/wallets/quickstart/api-key-auth
Official SDK: https://github.com/coinbase/cdp-sdk

The current documentation calls the API-key path **API Key Wallet**, under CDP non-custodial wallets. The server controls accounts while CDP secures private keys in a TEE. This should not be labeled an Agentic Wallet authorization integration. Required configuration is a CDP API key ID, API key secret, and Wallet Secret. Official documentation demonstrates EVM account creation, named account retrieval, and Base Sepolia testnet funding.

Implemented: deterministic simulated address and test USDC string, status, network metadata, setup/retry/refresh/disconnect, and guidance linking to official documentation.

Blocked: live credential validation, provisioning/reconciliation, balances, and authenticated owner credential storage. The app does not accept CDP credentials. No mainnet creation is possible.

## Crossmint

Official reference: https://github.com/Crossmint/wallets-server-quickstart
Official docs: https://docs.crossmint.com/wallets/overview
Official SDK repository: https://github.com/Crossmint/crossmint-sdk

The official server quickstart documents `@crossmint/wallets-sdk` 1.0.7 and Base Sepolia. The chosen future ownership model is server recovery signer plus server operational signer: the application server controls both, without fabricating user identities. Staging API access and both signer secrets are required. The quickstart lists wallet create/read/balance scopes as well as transaction/sign/funding scopes used by its broader example. This MVP must request only the scopes necessary for the operations actually enabled.

Implemented: deterministic simulated address and test USDC balance string; separate staging metadata and lifecycle actions. Coinbase and Crossmint both document Base Sepolia in the referenced quickstarts, so the demo uses that overlap. The token quantities are examples, not a claim of provider-wide token compatibility.

Blocked: real staging provisioning, signer construction and secure secret storage, provider read validation, and wallet reconciliation. SDK not installed or live-tested.

## Stripe Link

Official hosted guide: https://docs.link.com/guides/add-payments-to-your-agent
Official OAuth guide: https://docs.link.com/authentication/oauth
Official SDK/CLI repository: https://github.com/stripe/link-cli
Official agent CLI quickstart: https://docs.link.com/quickstart/agents

Current documentation supports hosted OAuth, not just a local CLI. It lists a registered confidential client, Stripe publishable key, exact registered callback, server session storage, and secure token storage as prerequisites. The hosted guide names `@stripe/link-sdk`, the `payment_methods.agentic` scope, state validation, and PKCE. Stripe secret API keys do not authenticate the Link API. Token acquisition and rotation belong to the application, not the SDK.

Implemented: a distinct linked payment account demo, simulated authorization/pending/failure/approval, no blockchain address, no crypto balance, no invented spending limit.

Blocked: no registered OAuth client or production authentication exists in this build. No live authorization URL is generated, callback accepted, or token exchanged. Provider settings honestly show these prerequisites. We do not run a shared authenticated CLI session, collect OTPs/passwords/card numbers/cookies, or label any live account connected. All Link examples are simulated.

## Security/verification limits

Production APIs return 503. The local opaque cookie provides isolation between demo workspaces, not a supported production identity system. Credential encryption and OAuth token lifecycle code are deliberately absent because live access is disabled. Before enabling live mode, use a supported authentication library, encrypted token/credential store, exact callback configuration, durable distributed limits, mock-backed adapter tests, idempotency keys, and reconciliation for unknown provisioning outcomes.

No live capability has been verified. All successful operations in this application are demo operations. Payment routing, execution, swaps, purchases, monetization, and mainnet provisioning are outside this build.
