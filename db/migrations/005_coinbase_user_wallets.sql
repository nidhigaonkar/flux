CREATE TABLE IF NOT EXISTS coinbase_user_wallets (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL,
 cdp_user_id TEXT NOT NULL, address TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(project_id,address)
);
CREATE INDEX IF NOT EXISTS coinbase_user_wallet_owner_idx ON coinbase_user_wallets(owner_id);
