import {createHash} from 'node:crypto';
import {z} from 'zod';
import {database} from '../db';
import {CryptoError,bounded,normalizeError} from '../crypto/types';
export function userWalletMissing(){return ['NEXT_PUBLIC_CDP_PROJECT_ID','CDP_API_KEY_ID','CDP_API_KEY_SECRET'].filter(k=>!process.env[k]?.trim());}
const evmAddress=z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const verifiedUser=z.object({userId:z.string().min(1),evmAccountObjects:z.array(z.object({address:evmAddress,ejectedAt:z.string().nullish()}))});
export type UserTokenValidator=(token:string)=>Promise<unknown>;
async function validate(token:string){try{const {CdpClient}=await import('@coinbase/cdp-sdk');return await bounded(new CdpClient({apiKeyId:process.env.CDP_API_KEY_ID,apiKeySecret:process.env.CDP_API_KEY_SECRET,debugging:false}).endUser.validateAccessToken({accessToken:token}));}catch(e){const error=normalizeError(e);throw new CryptoError(error.code==='invalid_credentials'?'coinbase_sign_in_required':error.code,error.code==='invalid_credentials'?401:error.status);}}
export async function connectUserWallet(owner:string,token:string,address:string,validator:UserTokenValidator=validate){
 if(userWalletMissing().length)throw new CryptoError('user_wallet_configuration_required',503);
 z.string().min(1).max(200).parse(owner);z.string().min(1).max(16384).parse(token);const normalized=evmAddress.parse(address).toLowerCase();
 // Only Coinbase's verified response may establish ownership; client-provided addresses are never trusted.
 const result=verifiedUser.safeParse(await validator(token));if(!result.success)throw new CryptoError('invalid_provider_response',502);
 let claims:{project_id?:string;sub?:string};try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}catch{throw new CryptoError('invalid_access_token',401);}
 if(claims.project_id!==process.env.NEXT_PUBLIC_CDP_PROJECT_ID||claims.sub!==result.data.userId)throw new CryptoError('wrong_coinbase_project',403);
 if(!result.data.evmAccountObjects.some(a=>!a.ejectedAt&&a.address.toLowerCase()===normalized))throw new CryptoError('wallet_ownership_unverified',403);
 const project=process.env.NEXT_PUBLIC_CDP_PROJECT_ID!;const id=`coinbase_user_${createHash('sha256').update(`${project}:${normalized}`).digest('hex').slice(0,40)}`;
 const data={id,provider:'coinbase',kind:'crypto_wallet',providerAccountId:normalized,address:normalized,network:'base-sepolia',environment:'testnet',mode:'live',status:'connected',balance:'',balances:[],balancesStatus:'not_refreshed',lastSyncedAt:null,ownership:'user_controlled',product:'CDP User Wallet'};
 const pg=await database();await pg.transaction(async tx=>{await tx.query('INSERT INTO coinbase_user_wallets(id,owner_id,project_id,cdp_user_id,address) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id,address) DO NOTHING',[id,owner,project,result.data.userId,normalized]);const saved=(await tx.query<{owner_id:string;cdp_user_id:string}>('SELECT owner_id,cdp_user_id FROM coinbase_user_wallets WHERE id=$1 FOR UPDATE',[id])).rows[0];if(saved.owner_id!==owner||saved.cdp_user_id!==result.data.userId)throw new CryptoError('wallet_already_linked',409);await tx.query("INSERT INTO workspace_wallets(id,owner_id,provider,name,data) VALUES($1,$2,'coinbase','Coinbase user wallet',$3::jsonb) ON CONFLICT(id) DO UPDATE SET data=workspace_wallets.data || jsonb_build_object('status','connected')",[id,owner,JSON.stringify(data)]);});return {id,address:normalized,ownership:'user_controlled',network:'base-sepolia'};
}
