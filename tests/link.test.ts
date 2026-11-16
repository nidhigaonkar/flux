import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {database,createAgent,attachWallet,getAgent,listWorkspaceWallets} from '../lib/db';
import {config,encrypt,decrypt,hash,LinkError,missingConfiguration} from '../lib/link/config';
import {authorizationUrl} from '../lib/link/oauth';
import {beginAuthorization,completeAuthorization,currentAccessToken,disconnectAccount,safeAccounts,syncAccount} from '../lib/link/service';
import {GET as status} from '../app/api/link/status/route';
Object.assign(process.env,{DATABASE_PATH:'memory://',AUTH_URL:'http://localhost:3000',AUTH_SECRET:'test-only-secret-that-is-at-least-32-characters',AUTH_GITHUB_ID:'test-github',AUTH_GITHUB_SECRET:'test-github-secret',ENCRYPTION_KEY:randomBytes(32).toString('hex'),LINK_CLIENT_ID:'test-client',LINK_CLIENT_SECRET:'test-secret',LINK_PUBLISHABLE_KEY:'pk_test_example',LINK_REDIRECT_URI:'http://localhost:3000/api/link/callback',NODE_ENV:'test'});
after(async()=>{await (await database()).close()});
const token=(suffix:string)=>({access_token:`access-${suffix}`,refresh_token:`refresh-${suffix}`,token_type:'Bearer',expires_in:3600,scope:'payment_methods.agentic'});
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const transport=((_url:unknown,_init:RequestInit|undefined)=>Promise.resolve(response(token('initial')))) as typeof fetch;
async function authorize(owner:string){const flow=await beginAuthorization(owner);const state=new URL(flow.url).searchParams.get('state')!;return completeAuthorization(owner,state,flow.browser,'test-code',false,transport);}
test('configuration, authenticated encryption, and official OAuth URL',async()=>{
 assert.deepEqual(missingConfiguration(),[]);assert.equal(config().redirectUri,process.env.LINK_REDIRECT_URI);
 const value=encrypt('sensitive-token','owner:connection');assert.ok(!value.includes('sensitive'));assert.equal(decrypt(value,'owner:connection'),'sensitive-token');assert.throws(()=>decrypt(value,'other-owner'));
 const u=new URL(authorizationUrl('state','a'.repeat(43)));assert.equal(u.origin,'https://login.link.com');assert.equal(u.pathname,'/auth');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('scope'),'payment_methods.agentic');assert.ok(!u.toString().includes(process.env.LINK_CLIENT_SECRET!));
 const old=process.env.ENCRYPTION_KEY;process.env.ENCRYPTION_KEY='invalid';assert.ok(missingConfiguration().length);assert.throws(()=>config());process.env.ENCRYPTION_KEY=old;
});
test('state is owner/browser bound, single-use, expiring, and exchange uses stored PKCE',async()=>{
 const flow=await beginAuthorization('state-owner');const state=new URL(flow.url).searchParams.get('state')!;let calls=0;
 const mock=(async(url,init)=>{calls++;assert.equal(url,'https://login.link.com/auth/token');const body=new URLSearchParams(String(init?.body));assert.equal(body.get('redirect_uri'),process.env.LINK_REDIRECT_URI);assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('client_secret'),process.env.LINK_CLIENT_SECRET);const challenge=Buffer.from(hash(body.get('code_verifier')!),'hex').toString('base64url');assert.equal(challenge,new URL(flow.url).searchParams.get('code_challenge'));return response(token('state'));}) as typeof fetch;
 await assert.rejects(completeAuthorization('wrong-owner',state,flow.browser,'code',false,mock),/invalid_authorization_state/);
 await assert.rejects(completeAuthorization('state-owner',state,'wrong-browser','code',false,mock),/invalid_authorization_state/);assert.equal(calls,0);
 await completeAuthorization('state-owner',state,flow.browser,'code',false,mock);assert.equal(calls,1);
 await assert.rejects(completeAuthorization('state-owner',state,flow.browser,'code',false,mock),/invalid_authorization_state/);assert.equal(calls,1);
 const expired=await beginAuthorization('expired');const pg=await database();await pg.query("UPDATE link_oauth_states SET expires_at=now()-interval '1 second' WHERE owner_id='expired'");await assert.rejects(completeAuthorization('expired',new URL(expired.url).searchParams.get('state')!,expired.browser,'code',false,mock),/invalid_authorization_state/);
 const denied=await beginAuthorization('denied');await assert.rejects(completeAuthorization('denied',new URL(denied.url).searchParams.get('state')!,denied.browser,null,true,mock),/authorization_denied/);assert.equal((await safeAccounts('denied')).length,0);
});
test('tokens stay encrypted, live wallet assignment is owner scoped, refresh rotates once and revocation detaches',async()=>{
 const owner='live-owner',id=await authorize(owner);const pg=await database();const raw=(await pg.query<{token_ciphertext:string}>('SELECT token_ciphertext FROM link_accounts WHERE id=$1',[id])).rows[0];assert.ok(!raw.token_ciphertext.includes('access-initial'));
 const accounts=JSON.stringify(await safeAccounts(owner));assert.ok(!/access_token|refresh_token|ciphertext|refresh-initial/.test(accounts));assert.equal((await safeAccounts('different-owner')).length,0);await assert.rejects(currentAccessToken('different-owner',id),/authorization_required/);
 const a=await createAgent(owner,'Live agent','','live');await attachWallet(owner,a.id,id);assert.equal((await getAgent(owner,a.id))!.wallets[0].mode,'live');const demo=await createAgent(owner,'Demo','','demo');await assert.rejects(attachWallet(owner,demo.id,id),/separate/);
 await pg.query("UPDATE link_accounts SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);let refreshes=0;
 const refresh=(async(_url,init)=>{refreshes++;assert.equal(new URLSearchParams(String(init?.body)).get('refresh_token'),'refresh-initial');return response(token('rotated'));}) as typeof fetch;
 const access=await Promise.all([currentAccessToken(owner,id,false,undefined,refresh),currentAccessToken(owner,id,false,undefined,refresh)]);assert.deepEqual(access,['access-rotated','access-rotated']);assert.equal(refreshes,1);
 const methods=(async(_url,init)=>{assert.equal(new Headers(init?.headers).get('authorization'),'Bearer access-rotated');return response({payment_details:[{id:'safe-method',type:'card',is_default:true,name:'Example',capabilities:{agentic_payments:{eligible:true}}},{id:'ineligible',type:'card',is_default:false,name:'Other',capabilities:{agentic_payments:{eligible:false}}}]});}) as typeof fetch;
 assert.equal(await syncAccount(owner,id,methods),1);assert.equal((await safeAccounts(owner))[0].eligibleMethods,1);
 await assert.rejects(disconnectAccount('different-owner',id,transport),/not_found/);
 await disconnectAccount(owner,id,(async(url,init)=>{assert.equal(url,'https://login.link.com/auth/revoke');assert.equal(new URLSearchParams(String(init?.body)).get('token'),'refresh-rotated');return response({});}) as typeof fetch);
 assert.equal((await safeAccounts(owner))[0].status,'disconnected');assert.equal((await getAgent(owner,a.id))!.wallets.length,0);assert.equal((await listWorkspaceWallets(owner))[0].status,'disconnected');assert.equal((await pg.query<{token_ciphertext:null}>('SELECT token_ciphertext FROM link_accounts WHERE id=$1',[id])).rows[0].token_ciphertext,null);
});
test('uncertain refresh is not blindly retried and failed revocation retains recoverable state',async()=>{
 const id=await authorize('unknown');const pg=await database();await pg.query("UPDATE link_accounts SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);let calls=0;const fail=(async()=>{calls++;throw Error('private-provider-error');}) as typeof fetch;
 await assert.rejects(currentAccessToken('unknown',id,false,undefined,fail),/provider_unavailable/);assert.equal((await safeAccounts('unknown'))[0].status,'refresh_unknown');await assert.rejects(currentAccessToken('unknown',id,false,undefined,fail),/authorization_required/);assert.equal(calls,1);
 await assert.rejects(disconnectAccount('unknown',id,fail),/revocation_unconfirmed/);assert.equal((await safeAccounts('unknown'))[0].status,'revocation_failed');assert.ok((await pg.query('SELECT token_ciphertext FROM link_accounts WHERE id=$1',[id])).rows.length);
});
test('missing granted scope never creates a connected record',async()=>{
 const flow=await beginAuthorization('scope-owner');await assert.rejects(completeAuthorization('scope-owner',new URL(flow.url).searchParams.get('state')!,flow.browser,'code',false,(async()=>response({...token('scope'),scope:'userinfo:read'})) as typeof fetch),/required_scope_missing/);assert.equal((await safeAccounts('scope-owner')).length,0);
});

test('public settings expose missing variable names but never credentials or tokens',async()=>{const saved=process.env.AUTH_GITHUB_ID;delete process.env.AUTH_GITHUB_ID;try{const r=await status();const body=await r.json();assert.equal(body.authenticated,false);assert.equal(body.configured,false);assert.ok(body.missing.includes('AUTH_GITHUB_ID'));assert.deepEqual(body.accounts,[]);assert.ok(!JSON.stringify(body).includes(process.env.LINK_CLIENT_SECRET!));assert.ok(!JSON.stringify(body).includes(process.env.ENCRYPTION_KEY!));}finally{process.env.AUTH_GITHUB_ID=saved;}});
