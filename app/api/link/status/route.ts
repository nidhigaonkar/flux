import {NextResponse} from 'next/server';
import {authenticatedOwner,authConfigured} from '@/auth';
import {missingConfiguration} from '@/lib/link/config';
import {safeAccounts} from '@/lib/link/service';
import {errorResponse,noStore} from '@/lib/link/http';
export const runtime='nodejs';
export async function GET(){try{const owner=await authenticatedOwner();const missing=missingConfiguration();return NextResponse.json({authenticated:!!owner,authenticationConfigured:authConfigured(),configured:!missing.length,missing,accounts:owner?await safeAccounts(owner):[]},{headers:noStore});}catch(e){return errorResponse(e);}}
