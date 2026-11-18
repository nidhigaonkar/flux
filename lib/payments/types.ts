import {z} from 'zod';
import {parseUnits,encodeFunctionData,erc20Abi,type Hex} from 'viem';
export const CHAIN_ID=84532;
export const NETWORK='base-sepolia';
export const USDC='0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
export const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/).refine(a=>a.toLowerCase()!=='0x'+'0'.repeat(40));
export const proposal=z.object({agentId:z.string().min(1).max(100),walletId:z.string().min(1).max(100),requestKey:z.string().uuid(),recipient:address,asset:z.enum(['ETH','USDC']),amount:z.string().regex(/^\d{1,30}(\.\d{1,18})?$/),reason:z.string().trim().min(3).max(500),network:z.literal(NETWORK)}).strict();
export class PaymentError extends Error{constructor(public code:string,public status=400){super(code)}}
export type Payment={id:string;owner_id:string;agent_id:string;wallet_id:string;request_key:string;recipient:string;asset:'ETH'|'USDC';amount_units:string;reason:string;state:string;quote:Quote|null;quote_hash:string|null;quote_expires_at:Date|null;approved_at:Date|null;tx_hash:Hex|null;error_code:string|null;expires_at:Date;created_at:Date;agent_name?:string};
export type Quote={chainId:84532;network:'base-sepolia';from:Hex;to:Hex;data:Hex;value:string;nonce:number;gas:string;maxFeePerGas:string;maxPriorityFeePerGas:string;estimatedFee:string;maxExecutionFee:string;l1Fee:string;blockNumber:string};
export function amountUnits(asset:'ETH'|'USDC',amount:string){const decimals=asset==='ETH'?18:6;if((amount.split('.')[1]?.length||0)>decimals)throw new PaymentError('too_many_decimal_places');const units=parseUnits(amount,decimals);if(units<=0n||units>=2n**256n)throw new PaymentError('invalid_amount');return units.toString();}
export function transfer(p:Pick<Payment,'recipient'|'asset'|'amount_units'>){return p.asset==='ETH'?{to:p.recipient as Hex,data:'0x' as Hex,value:p.amount_units}:{to:USDC as Hex,data:encodeFunctionData({abi:erc20Abi,functionName:'transfer',args:[p.recipient as Hex,BigInt(p.amount_units)]}),value:'0'};}
