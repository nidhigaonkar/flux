CREATE TABLE IF NOT EXISTS agents (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT 'demo' CHECK(mode = 'demo'),
 step INTEGER NOT NULL DEFAULT 1 CHECK(step BETWEEN 1 AND 4), selected JSONB NOT NULL DEFAULT '[]',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agents_owner_idx ON agents(owner_id);
CREATE TABLE IF NOT EXISTS agent_wallets (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('coinbase','crossmint','link')),
 kind TEXT NOT NULL, provider_account_id TEXT NOT NULL, address TEXT, network TEXT,
 environment TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'demo' CHECK(mode='demo'),
 status TEXT NOT NULL, balance TEXT NOT NULL DEFAULT '0.00', last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(agent_id,provider)
);
CREATE TABLE IF NOT EXISTS setup_operations (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL, error_code TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS activity_events (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 provider TEXT, summary TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
