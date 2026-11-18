import {NextRequest,NextResponse} from 'next/server';
import {getAuth,authConfigured} from '@/auth';
export const runtime='nodejs';
async function handler(req:NextRequest){if(!authConfigured())return NextResponse.json({error:'authentication_configuration_required'},{status:503,headers:{'Cache-Control':'no-store'}});try{const response=await(await getAuth()).handler(req);response.headers.set('Cache-Control','no-store');return response;}catch{return NextResponse.json({error:'authentication_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
export const GET=handler;
export const POST=handler;
