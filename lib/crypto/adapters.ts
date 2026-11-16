import {createHash,createHmac} from 'node:crypto';
import {z} from 'zod';
import {Adapter,CryptoProvider,NETWORK,CryptoError,decimalString,bounded,normalizeError} from './types';
import {requireProvider} from './config';
const address=z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const identity=(owner:string,id:string)=>createHash('sha256').update(`${owner}:${id}`).digest('hex');
export const accountName=(owner:string,id:string)=>`flux${identity(owner,id).slice(0,32)}`;
export const crossmintLocator=(owner:string,id:string)=>`userId:${owner}:evm:smart:alias:flux-${identity(owner,id).slice(0,24)}`;
export function adapterFor(provider:CryptoProvider):Adapter{requireProvider(provider);return provider==='coinbase'?coinbase():crossmint();}
function coinbase():Adapter{const client=async()=>{const {CdpClient}=await import('@coinbase/cdp-sdk');return new CdpClient({apiKeyId:process.env.CDP_API_KEY_ID,apiKeySecret:process.env.CDP_API_KEY_SECRET,walletSecret:process.env.CDP_WALLET_SECRET,debugging:false});};return {
 async find(owner,id){try{return address.parse((await bounded((await client()).evm.getAccount({name:accountName(owner,id)}))).address);}catch(e){const err=e as {statusCode?:number;httpStatusCode?:number;status?:number};if([err.statusCode,err.httpStatusCode,err.status].includes(404))return null;throw normalizeError(e);}},
 async create(owner,id){return address.parse((await bounded((await client()).evm.getOrCreateAccount({name:accountName(owner,id)}))).address);},
 async test(){await bounded((await client()).evm.listAccounts({pageSize:1}));},
 async balances(value){const c=await client();const tokens=[];let pageToken:string|undefined;let pages=0;do{const page=await bounded(c.evm.listTokenBalances({address:address.parse(value) as `0x${string}`,network:NETWORK,pageToken,pageSize:100}));for(const b of page.balances)tokens.push({symbol:b.token.symbol||b.token.contractAddress,amount:decimalString(b.amount.amount,b.amount.decimals),decimals:b.amount.decimals,contractAddress:b.token.contractAddress});pageToken=page.nextPageToken;if(++pages>=10&&pageToken)throw new CryptoError('balance_pagination_limit',502);}while(pageToken);return tokens;}
};}
function crossmint():Adapter{const key=process.env.CROSSMINT_SERVER_API_KEY!;const client=async()=>{const {CrossmintWallets,createCrossmint}=await import('@crossmint/wallets-sdk');return CrossmintWallets.from(createCrossmint({apiKey:key}));};const read=async(locator:string)=>{let r:Response;try{r=await fetch(`https://staging.crossmint.com/api/2025-06-09/wallets/${encodeURIComponent(locator)}`,{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});}catch{throw new CryptoError('provider_unavailable',502);}if(r.status===404)return null;if(!r.ok)throw new CryptoError(r.status===401||r.status===403?'invalid_credentials':r.status===429?'rate_limited':'provider_unavailable',r.status===429?429:502,r.headers.get('retry-after')||undefined);return address.parse((await r.json()).address);};return {
 find(owner,id){return read(crossmintLocator(owner,id));},
 async create(owner,id){const suffix=identity(owner,id);const derive=(secret:string)=>createHmac('sha256',Buffer.from(secret,'hex')).update(`flux:${suffix}`).digest('hex');const wallet=await bounded((await client()).createWallet({chain:NETWORK,owner:`userId:${owner}`,alias:`flux-${suffix.slice(0,24)}`,recovery:{type:'server',secret:derive(process.env.CROSSMINT_RECOVERY_SIGNER_SECRET!)},signers:[{type:'server',secret:derive(process.env.CROSSMINT_WALLET_SIGNER_SECRET!)}]}));return address.parse(wallet.address);},
 async test(){await read('evm:smart:alias:flux-credential-check-no-wallet');},
 async balances(value){const wallet=await bounded((await client()).getWallet(address.parse(value),{chain:NETWORK}));const b=await bounded(wallet.balances(['usdxm']));return z.array(z.object({symbol:z.string(),amount:z.string().regex(/^\d+(\.\d+)?$/),decimals:z.number().int().optional()})).parse([b.nativeToken,b.usdc,...b.tokens]);}
};}
