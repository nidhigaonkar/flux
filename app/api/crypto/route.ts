import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticatedOwner} from '@/auth';
import {publicConfig} from '@/lib/crypto/config';
import {provision,listOperations} from '@/lib/crypto/service';
import {failure,headers,requireCryptoOwner} from '@/lib/crypto/http';
export const runtime='nodejs';
const input=z.object({provider:z.enum(['coinbase','crossmint']),requestKey:z.string().uuid(),name:z.string().trim().min(1).max(80),network:z.literal('base-sepolia')}).strict();
export async function GET(){try{const owner=await authenticatedOwner();return NextResponse.json({...publicConfig(),authenticated:!!owner,operations:owner?await listOperations(owner):[]},{headers});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{const owner=await requireCryptoOwner(req);const parsed=input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_input'},{status:400,headers});const d=parsed.data;const result=await provision(owner,d.provider,d.requestKey,d.name);return NextResponse.json({id:result.id,state:result.state},{status:result.state==='connected'?200:202,headers});}catch(e){return failure(e);}}
