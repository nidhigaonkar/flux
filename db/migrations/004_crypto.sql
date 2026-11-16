CREATE TABLE IF NOT EXISTS crypto_operations (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, provider TEXT NOT NULL CHECK(provider IN ('coinbase','crossmint')),
 request_key TEXT NOT NULL, name TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'reserved',
 address TEXT, error_code TEXT, lease_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id,provider,request_key)
);
CREATE INDEX IF NOT EXISTS crypto_operations_owner_idx ON crypto_operations(owner_id);
CREATE TABLE IF NOT EXISTS crypto_rate_limits (
 owner_id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1, window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
