import {NextRequest,NextResponse} from 'next/server';
import {authenticatedOwner} from '@/auth';
import {CryptoError,normalizeError} from './types';
import {rateLimit} from './service';
export const headers={'Cache-Control':'no-store'};
export async function requireCryptoOwner(req:NextRequest){const owner=await authenticatedOwner();if(!owner)throw new CryptoError('sign_in_required',401);let origin:string;try{const u=new URL(process.env.AUTH_URL||'');if(u.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error();origin=u.origin;}catch{throw new CryptoError('configuration_required',503);}if(req.headers.get('origin')!==origin)throw new CryptoError('invalid_request_origin',403);await rateLimit(owner);return owner;}
export function failure(e:unknown){const err=normalizeError(e);return NextResponse.json({error:err.code},{status:err.status,headers:{...headers,...(err.status===429?{'Retry-After':/^\d+$/.test(err.retryAfter||'')?err.retryAfter!:'60'}:{})}});}
