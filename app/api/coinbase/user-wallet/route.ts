import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticatedOwner,authConfigured} from '@/auth';
import {connectUserWallet,userWalletMissing} from '@/lib/coinbase/user-wallet';
import {requireCryptoOwner,failure,headers} from '@/lib/crypto/http';
export const runtime='nodejs';
export async function GET(){try{const owner=await authenticatedOwner();return NextResponse.json({authenticated:!!owner,authenticationConfigured:authConfigured(),configured:!userWalletMissing().length,missing:userWalletMissing()},{headers});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{const owner=await requireCryptoOwner(req);const parsed=z.object({accessToken:z.string().min(1).max(16384),address:z.string().regex(/^0x[a-fA-F0-9]{40}$/)}).strict().safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_input'},{status:400,headers});return NextResponse.json(await connectUserWallet(owner,parsed.data.accessToken,parsed.data.address),{headers});}catch(e){return failure(e);}}
