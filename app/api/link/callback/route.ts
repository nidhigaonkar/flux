import {NextRequest,NextResponse} from 'next/server';
import {completeAuthorization} from '@/lib/link/service';
import {config,LinkError} from '@/lib/link/config';
import {requireOwner,noStore} from '@/lib/link/http';
export const runtime='nodejs';
export async function GET(req:NextRequest){let origin:string;try{origin=config().origin;}catch{return NextResponse.json({error:'configuration_required'},{status:503,headers:noStore});}let result='connected';try{const owner=await requireOwner();await completeAuthorization(owner,req.nextUrl.searchParams.get('state')||'',req.cookies.get('flux_link_flow')?.value||'',req.nextUrl.searchParams.get('code'),req.nextUrl.searchParams.has('error'));}catch(e){result=e instanceof LinkError?e.code:'provider_unavailable';}const url=new URL('/setup',origin);url.searchParams.set('link',result);const response=NextResponse.redirect(url,303);for(const [k,v] of Object.entries(noStore))response.headers.set(k,v);response.cookies.set('flux_link_flow','',{path:'/api/link',maxAge:0,httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:')});return response;}
