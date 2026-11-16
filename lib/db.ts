import { PGlite } from '@electric-sql/pglite';
import { readFile,mkdir } from 'node:fs/promises';
import { join,dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { demoResult, type Provider } from './providers';
const globalDb=globalThis as unknown as {walletDb?:Promise<PGlite>;walletSchema2?:Promise<void>};
export async function database(){
 if(!globalDb.walletDb)globalDb.walletDb=(async()=>{const dataPath=process.env.DATABASE_PATH||join(process.cwd(),'.data','postgres');if(dataPath!=='memory://')await mkdir(dirname(dataPath),{recursive:true});const pg=new PGlite(dataPath);await pg.waitReady;await pg.exec(await readFile(join(process.cwd(),'db/migrations/001_initial.sql'),'utf8'));return pg;})();
 const pg=await globalDb.walletDb;if(!globalDb.walletSchema2)globalDb.walletSchema2=(async()=>{await pg.exec(await readFile(join(process.cwd(),'db/migrations/002_workspace_wallets.sql'),'utf8'));})();await globalDb.walletSchema2;return pg;
}
export type StoredWallet={id:string;provider:Provider;kind:string;providerAccountId:string;address:string|null;network:string|null;environment:string;mode:string;status:string;balance:string;lastSyncedAt:string};
export type StoredActivity={id:string;provider:Provider|null;summary:string;createdAt:string};
export type StoredAgent={id:string;ownerId:string;name:string;description:string;mode:string;step:number;selected:string;createdAt:string;wallets:StoredWallet[];activities:StoredActivity[]};
const agentColumns=`id, owner_id AS "ownerId", name, description, mode, step, selected::text, created_at AS "createdAt"`;
const walletColumns=`id, provider, kind, provider_account_id AS "providerAccountId", address, network, environment, mode, status, balance, last_synced_at AS "lastSyncedAt"`;
export async function getAgent(owner:string,id:string):Promise<StoredAgent|null>{const pg=await database();const a=(await pg.query<StoredAgent>(`SELECT ${agentColumns} FROM agents WHERE id=$1 AND owner_id=$2`,[id,owner])).rows[0];if(!a)return null;const walletRows=await pg.query<{data:StoredWallet}>(`SELECT w.data FROM workspace_wallets w JOIN agent_wallet_links l ON l.wallet_id=w.id WHERE l.agent_id=$1 AND w.owner_id=$2 ORDER BY w.created_at`,[id,owner]);const wallets={rows:walletRows.rows.map(w=>w.data)};const activities=await pg.query<StoredActivity>(`SELECT id,provider,summary,created_at AS "createdAt" FROM activity_events WHERE agent_id=$1 ORDER BY created_at DESC`,[id]);return {...a,wallets:wallets.rows,activities:activities.rows};}
export async function listAgents(owner:string){const pg=await database();const ids=(await pg.query<{id:string}>('SELECT id FROM agents WHERE owner_id=$1 ORDER BY created_at DESC',[owner])).rows;return Promise.all(ids.map(async a=>(await getAgent(owner,a.id))!));}
export async function createAgent(owner:string,name:string,description:string){const pg=await database();const id=randomUUID();await pg.transaction(async tx=>{await tx.query('INSERT INTO agents(id,owner_id,name,description) VALUES($1,$2,$3,$4)',[id,owner,name,description]);await tx.query('INSERT INTO activity_events(id,agent_id,summary) VALUES($1,$2,$3)',[randomUUID(),id,'Agent created. Attach existing wallets from Connections.']);});return (await getAgent(owner,id))!;}
export async function saveProgress(owner:string,id:string,step:number,selected:Provider[]){const pg=await database();await pg.query('UPDATE agents SET step=$1,selected=$2::jsonb,updated_at=now() WHERE id=$3 AND owner_id=$4',[step,JSON.stringify([...new Set(selected)]),id,owner]);}
export type WorkspaceWallet=StoredWallet & {name:string};
export async function listWorkspaceWallets(owner:string){const pg=await database();const rows=await pg.query<{data:StoredWallet;name:string}>('SELECT data,name FROM workspace_wallets WHERE owner_id=$1 ORDER BY created_at DESC',[owner]);return rows.rows.map(w=>({...w.data,name:w.name}));}
export async function setupWallet(owner:string,id:string,provider:Provider,name:string,scenario:'success'|'pending'|'failure'){
 const pg=await database();const data={id,...demoResult(id,provider),status:scenario==='failure'?'setup_failed':scenario==='pending'?'authorization_pending':'connected',lastSyncedAt:new Date().toISOString()};
 await pg.query('INSERT INTO workspace_wallets(id,owner_id,provider,name,data) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id) DO NOTHING',[id,owner,provider,name,JSON.stringify(data)]);
}
export async function retryWallet(owner:string,id:string){const pg=await database();const r=await pg.query("UPDATE workspace_wallets SET data=data || jsonb_build_object('status','connected','lastSyncedAt',now()) WHERE id=$1 AND owner_id=$2 RETURNING id",[id,owner]);if(!r.rows.length)throw Error('Wallet not found');}
export async function attachWallet(owner:string,agentId:string,walletId:string){const pg=await database();await pg.transaction(async tx=>{
 const a=(await tx.query('SELECT id FROM agents WHERE id=$1 AND owner_id=$2',[agentId,owner])).rows.length;
 const w=(await tx.query<{provider:Provider;data:StoredWallet}>('SELECT provider,data FROM workspace_wallets WHERE id=$1 AND owner_id=$2',[walletId,owner])).rows[0];if(!a||!w)throw Error('Agent or wallet not found');if(w.data.status!=='connected')throw Error('Finish wallet setup before attaching it.');
 const inserted=await tx.query('INSERT INTO agent_wallet_links(agent_id,wallet_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING wallet_id',[agentId,walletId]);if(inserted.rows.length)await tx.query('INSERT INTO activity_events(id,agent_id,provider,summary) VALUES($1,$2,$3,$4)',[randomUUID(),agentId,w.provider,'Existing workspace wallet attached to agent. Demo assignment only.']);
 });}
export async function detachWallet(owner:string,agentId:string,walletId:string){const pg=await database();await pg.transaction(async tx=>{const owns=(await tx.query('SELECT id FROM agents WHERE id=$1 AND owner_id=$2',[agentId,owner])).rows.length;if(!owns)throw Error('Agent not found');await tx.query('DELETE FROM agent_wallet_links WHERE agent_id=$1 AND wallet_id=$2',[agentId,walletId]);await tx.query('INSERT INTO activity_events(id,agent_id,summary) VALUES($1,$2,$3)',[randomUUID(),agentId,'Wallet detached from agent. The workspace wallet is preserved. No external wallet or authorization was deleted.']);});}
export async function connectDemo(owner:string,id:string,provider:Provider,scenario:'success'|'pending'|'failure'){
 const agent=await getAgent(owner,id);if(!agent)throw Error('Agent not found');if(agent.wallets.some(w=>w.provider===provider&&w.status==='connected'))return;
 const walletId=`${id}:${provider}`;await setupWallet(owner,walletId,provider,`${provider} wallet`,scenario);
 if(scenario==='success')await retryWallet(owner,walletId);
 // Seed/demo compatibility: pending records are visible on the sample agent.
 const pg=await database();await pg.query('INSERT INTO agent_wallet_links(agent_id,wallet_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,walletId]);
}
export async function refreshDemo(owner:string,id:string,provider:Provider){const agent=await getAgent(owner,id);if(!agent)throw Error('Agent not found');const pg=await database();for(const w of agent.wallets.filter(w=>w.provider===provider))await pg.query("UPDATE workspace_wallets SET data=jsonb_set(data,'{lastSyncedAt}',to_jsonb(now())) WHERE id=$1 AND owner_id=$2",[w.id,owner]);}
export async function disconnectDemo(owner:string,id:string,provider:Provider){const agent=await getAgent(owner,id);if(!agent)throw Error('Agent not found');for(const w of agent.wallets.filter(w=>w.provider===provider))await detachWallet(owner,id,w.id);}
export async function seedWorkspace(owner:string){const agent=await createAgent(owner,'Research assistant','An agent that researches, compares, and helps you build.');await saveProgress(owner,agent.id,4,['coinbase','crossmint','link']);await connectDemo(owner,agent.id,'coinbase','success');await connectDemo(owner,agent.id,'crossmint','success');await connectDemo(owner,agent.id,'link','pending');}
