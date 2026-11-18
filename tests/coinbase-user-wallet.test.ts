import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {connectUserWallet,userWalletMissing} from '../lib/coinbase/user-wallet';
import {database,createAgent,attachWallet,detachWallet,getAgent,listWorkspaceWallets} from '../lib/db';
import {CryptoError} from '../lib/crypto/types';
import {safeConfig} from '../lib/providers';
Object.assign(process.env,{DATABASE_PATH:'memory://',NEXT_PUBLIC_CDP_PROJECT_ID:'test-project',CDP_API_KEY_ID:'test-key-id',CDP_API_KEY_SECRET:'test-key-secret'});
after(async()=>{await(await database()).close()});
const address='0x1234567890123456789012345678901234567890';
const jwt=(project='test-project',user='coinbase-user')=>`header.${Buffer.from(JSON.stringify({project_id:project,sub:user})).toString('base64url')}.signature`;
const verified=async()=>({userId:'coinbase-user',evmAccountObjects:[{address,ejectedAt:null}],authenticationMethods:[{type:'email',email:'private@example.test'}]});
test('embedded wallet is verified, saved independently, idempotent, and attachable without sharing tokens',async()=>{
 const [a,b]=await Promise.all([connectUserWallet('owner',jwt(),address,verified),connectUserWallet('owner',jwt(),address.toUpperCase().replace('0X','0x'),verified)]);assert.equal(a.id,b.id);
 let wallets=await listWorkspaceWallets('owner');assert.equal(wallets.length,1);assert.equal((wallets[0] as unknown as {ownership:string}).ownership,'user_controlled');assert.equal(wallets[0].network,'base-sepolia');assert.equal(wallets[0].mode,'live');assert.ok(!JSON.stringify(wallets).includes(jwt()));assert.ok(!JSON.stringify(wallets).includes('private@example.test'));
 const agent=await createAgent('owner','Agent','','live');await attachWallet('owner',agent.id,a.id);const saved=(await getAgent('owner',agent.id))!;assert.equal(saved.wallets.length,1);assert.equal(safeConfig(saved).authorizesSpending,false);assert.ok(!JSON.stringify(safeConfig(saved)).includes('test-key-secret'));
 await detachWallet('owner',agent.id,a.id);wallets=await listWorkspaceWallets('owner');assert.equal(wallets.length,1);assert.equal((await getAgent('owner',agent.id))!.wallets.length,0);
});
test('a different Flux owner cannot claim an already linked wallet',async()=>{await assert.rejects(connectUserWallet('intruder',jwt(),address,verified),/wallet_already_linked/);assert.deepEqual(await listWorkspaceWallets('intruder'),[])});
test('server rejects arbitrary addresses, wrong projects, wrong subjects, ejected keys and unverified tokens',async()=>{
 await assert.rejects(connectUserWallet('owner',jwt(),'0x9999999999999999999999999999999999999999',verified),/wallet_ownership_unverified/);
 await assert.rejects(connectUserWallet('owner',jwt('other-project'),address,verified),/wrong_coinbase_project/);
 await assert.rejects(connectUserWallet('owner',jwt('test-project','different-subject'),address,verified),/wrong_coinbase_project/);
 await assert.rejects(connectUserWallet('owner',jwt(),address,async()=>({userId:'coinbase-user',evmAccountObjects:[{address,ejectedAt:new Date().toISOString()}]})),/wallet_ownership_unverified/);
 await assert.rejects(connectUserWallet('owner',jwt(),address,async()=>{throw new CryptoError('coinbase_sign_in_required',401)}),/coinbase_sign_in_required/);
});
test('user wallets require a public project and server verification key, but no Wallet Secret',async()=>{delete process.env.CDP_WALLET_SECRET;assert.deepEqual(userWalletMissing(),[]);const old=process.env.NEXT_PUBLIC_CDP_PROJECT_ID;delete process.env.NEXT_PUBLIC_CDP_PROJECT_ID;assert.ok(userWalletMissing().includes('NEXT_PUBLIC_CDP_PROJECT_ID'));await assert.rejects(connectUserWallet('owner',jwt(),address,verified),/user_wallet_configuration_required/);process.env.NEXT_PUBLIC_CDP_PROJECT_ID=old;});
