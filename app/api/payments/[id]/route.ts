import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCryptoOwner} from '@/lib/crypto/http';
import {quotePayment,approvePayment,rejectPayment,markUnknown,recordHash,refreshPayment} from '@/lib/payments/service';
import {failure,headers} from '@/lib/payments/http';
export const runtime='nodejs';
const input=z.discriminatedUnion('action',[z.object({action:z.literal('quote')}).strict(),z.object({action:z.literal('approve'),quoteHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),z.object({action:z.literal('reject')}).strict(),z.object({action:z.literal('unknown')}).strict(),z.object({action:z.literal('refresh')}).strict(),z.object({action:z.literal('hash'),hash:z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict()]);
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const owner=await requireCryptoOwner(req);const {id}=await params;const d=input.safeParse(await req.json().catch(()=>null));if(!d.success)return NextResponse.json({error:'invalid_input'},{status:400,headers});const x=d.data;const payment=x.action==='quote'?await quotePayment(owner,id):x.action==='approve'?await approvePayment(owner,id,x.quoteHash):x.action==='reject'?await rejectPayment(owner,id):x.action==='unknown'?await markUnknown(owner,id):x.action==='hash'?await recordHash(owner,id,x.hash as `0x${string}`):await refreshPayment(owner,id);return NextResponse.json({payment},{headers});}catch(e){return failure(e);}}
