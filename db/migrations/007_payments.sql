CREATE TABLE IF NOT EXISTS agent_payment_keys (
 agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_requests (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, agent_id TEXT NOT NULL REFERENCES agents(id),
 wallet_id TEXT NOT NULL REFERENCES workspace_wallets(id), request_key TEXT NOT NULL,
 recipient TEXT NOT NULL, asset TEXT NOT NULL CHECK(asset IN ('ETH','USDC')),
 amount_units TEXT NOT NULL, reason TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'proposed',
 quote JSONB, quote_hash TEXT, quote_expires_at TIMESTAMPTZ, approved_at TIMESTAMPTZ,
 tx_hash TEXT UNIQUE, error_code TEXT, expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '24 hours',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(agent_id,request_key)
);
CREATE INDEX IF NOT EXISTS payment_owner_idx ON payment_requests(owner_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS payment_active_wallet_idx ON payment_requests(wallet_id)
 WHERE state IN ('signing','submission_unknown','pending');
