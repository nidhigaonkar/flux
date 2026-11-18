import {NextRequest,NextResponse} from 'next/server';
import {requireCryptoOwner} from '@/lib/crypto/http';
import {issueAgentKey,revokeAgentKey} from '@/lib/payments/service';
import {failure,headers} from '@/lib/payments/http';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const owner=await requireCryptoOwner(req);return NextResponse.json(await issueAgentKey(owner,(await params).id),{headers});}catch(e){return failure(e);}}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const owner=await requireCryptoOwner(req);await revokeAgentKey(owner,(await params).id);return NextResponse.json({ok:true},{headers});}catch(e){return failure(e);}}
