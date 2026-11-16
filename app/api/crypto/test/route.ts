import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {adapterFor} from '@/lib/crypto/adapters';
import {failure,headers,requireCryptoOwner} from '@/lib/crypto/http';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{await requireCryptoOwner(req);const parsed=z.object({provider:z.enum(['coinbase','crossmint'])}).strict().safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_input'},{status:400,headers});await adapterFor(parsed.data.provider).test();return NextResponse.json({ok:true,message:'Provider read access verified. No wallet created. Provisioning credentials are checked when creating a wallet.'},{headers});}catch(e){return failure(e);}}
