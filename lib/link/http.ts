import {NextRequest,NextResponse} from 'next/server';
import {authenticatedOwner} from '@/auth';
import {config,LinkError} from './config';
export const noStore={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function requireOwner(){const owner=await authenticatedOwner();if(!owner)throw new LinkError('sign_in_required',401);return owner;}
export function requireOrigin(req:NextRequest){const origin=config().origin;if(req.headers.get('origin')!==origin||new URL(req.url).host!==new URL(origin).host&&req.headers.get('host')!==new URL(origin).host)throw new LinkError('invalid_request_origin',403);}
export function errorResponse(e:unknown){const known=e instanceof LinkError?e:new LinkError('provider_unavailable',502);return NextResponse.json({error:known.code},{status:known.status,headers:{...noStore,...(known.status===429?{'Retry-After':known.retryAfter||'600'}:{})}});}
