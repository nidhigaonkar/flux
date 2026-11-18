import {NextRequest,NextResponse} from 'next/server';
import {authenticatedOwner} from '@/auth';
import {requireCryptoOwner} from '@/lib/crypto/http';
import {listPayments,proposePayment} from '@/lib/payments/service';
import {failure,headers} from '@/lib/payments/http';
export const runtime='nodejs';
export async function GET(){try{const owner=await authenticatedOwner();if(!owner)return NextResponse.json({error:'sign_in_required'},{status:401,headers});return NextResponse.json({payments:await listPayments(owner)},{headers});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{const owner=await requireCryptoOwner(req);return NextResponse.json({payment:await proposePayment(owner,await req.json().catch(()=>null))},{headers});}catch(e){return failure(e);}}
