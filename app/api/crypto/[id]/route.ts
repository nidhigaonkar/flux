import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {provision,reconcile,refreshBalances,operation} from '@/lib/crypto/service';
import {failure,headers,requireCryptoOwner} from '@/lib/crypto/http';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const owner=await requireCryptoOwner(req);const {id}=await params;const parsed=z.object({action:z.enum(['refresh','reconcile','retry'])}).strict().safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_input'},{status:400,headers});const op=await operation(owner,id);if(parsed.data.action==='refresh'){await refreshBalances(owner,id);return NextResponse.json({ok:true},{headers});}const result=parsed.data.action==='retry'?await provision(owner,op.provider,op.request_key,op.name):await reconcile(owner,id);return NextResponse.json({id:result.id,state:result.state},{status:result.state==='connected'?200:202,headers});}catch(e){return failure(e);}}
