CREATE TABLE IF NOT EXISTS workspace_wallets (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, provider TEXT NOT NULL,
 name TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_wallet_owner_idx ON workspace_wallets(owner_id);
CREATE TABLE IF NOT EXISTS agent_wallet_links (
 agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 wallet_id TEXT NOT NULL REFERENCES workspace_wallets(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(agent_id,wallet_id)
);
-- Preserve existing demo wallets and assignments during the separation.
INSERT INTO workspace_wallets(id,owner_id,provider,name,data)
SELECT w.id,a.owner_id,w.provider,initcap(w.provider)||' wallet',jsonb_build_object(
'id',w.id,'provider',w.provider,'kind',w.kind,'providerAccountId',w.provider_account_id,
'address',w.address,'network',w.network,'environment',w.environment,'mode',w.mode,
'status',w.status,'balance',w.balance,'lastSyncedAt',w.last_synced_at)
FROM agent_wallets w JOIN agents a ON a.id=w.agent_id ON CONFLICT DO NOTHING;
INSERT INTO agent_wallet_links(agent_id,wallet_id)
SELECT agent_id,id FROM agent_wallets ON CONFLICT DO NOTHING;
-- Empty the legacy assignment storage after migration so detached links cannot return.
DELETE FROM agent_wallets;
