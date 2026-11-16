import {NextRequest,NextResponse} from 'next/server';
import {beginAuthorization,safeAccounts} from '@/lib/link/service';
import {config,LinkError} from '@/lib/link/config';
import {requireOrigin,requireOwner,errorResponse,noStore} from '@/lib/link/http';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{requireOrigin(req);const owner=await requireOwner();const accounts=await safeAccounts(owner);if(accounts.some(a=>a.status!=='disconnected'))throw new LinkError('disconnect_before_reconnecting',409);const flow=await beginAuthorization(owner);const res=NextResponse.json({url:flow.url},{headers:noStore});res.cookies.set('flux_link_flow',flow.browser,{httpOnly:true,secure:config().origin.startsWith('https:'),sameSite:'lax',path:'/api/link',maxAge:600});return res;}catch(e){return errorResponse(e);}}
