import {NextRequest,NextResponse} from 'next/server';
import {disconnectAccount,syncAccount,limit} from '@/lib/link/service';
import {requireOrigin,requireOwner,errorResponse,noStore} from '@/lib/link/http';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{requireOrigin(req);const owner=await requireOwner();const {id}=await params;await limit(owner,'refresh');await syncAccount(owner,id);return NextResponse.json({ok:true},{headers:noStore});}catch(e){return errorResponse(e);}}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{requireOrigin(req);const owner=await requireOwner();const {id}=await params;await limit(owner,'disconnect');await disconnectAccount(owner,id);return NextResponse.json({ok:true,revoked:true},{headers:noStore});}catch(e){return errorResponse(e);}}
