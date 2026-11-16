ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_mode_check;
ALTER TABLE agents ADD CONSTRAINT agents_mode_check CHECK(mode IN ('demo','live'));
CREATE TABLE IF NOT EXISTS link_oauth_states (
 state_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, browser_hash TEXT NOT NULL,
 verifier_ciphertext TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_accounts (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
 token_ciphertext TEXT, expires_at TIMESTAMPTZ, granted_scope TEXT NOT NULL DEFAULT '',
 eligible_methods INTEGER, last_synced_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_rate_limits (
 owner_id TEXT NOT NULL, action TEXT NOT NULL, window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
 count INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(owner_id,action)
);
