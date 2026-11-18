import {NextResponse} from 'next/server';
import {PaymentError} from './types';
import {CryptoError} from '../crypto/types';
export const headers={'Cache-Control':'no-store'};
export function failure(e:unknown){const p=e instanceof PaymentError||e instanceof CryptoError?e:new PaymentError('payment_service_unavailable',502);return NextResponse.json({error:p.code},{status:p.status,headers:{...headers,...(p.status===429?{'Retry-After':'60'}:{})}});}
