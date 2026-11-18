import {NextRequest,NextResponse} from 'next/server';
import {agentIdentity,proposePayment,listPayments} from '@/lib/payments/service';
import {rateLimit} from '@/lib/crypto/service';
import {failure,headers} from '@/lib/payments/http';
import {proposal,PaymentError} from '@/lib/payments/types';
export const runtime='nodejs';
async function identity(req:NextRequest){const value=req.headers.get('authorization');if(!value?.startsWith('Bearer '))throw new PaymentError('invalid_agent_key',401);const agent=await agentIdentity(value.slice(7));await rateLimit(`agent-payments:${agent.agent_id}`);return agent;}
export async function POST(req:NextRequest){try{const agent=await identity(req);const body=proposal.safeParse(await req.json().catch(()=>null));if(!body.success||body.data.agentId!==agent.agent_id)throw new PaymentError('invalid_payment_request');const p=await proposePayment(agent.owner_id,body.data);return NextResponse.json({id:p.id,state:p.state,approvalRequired:true},{status:201,headers});}catch(e){return failure(e);}}
export async function GET(req:NextRequest){try{const agent=await identity(req);const payments=(await listPayments(agent.owner_id)).filter(p=>p.agent_id===agent.agent_id).map(p=>({id:p.id,state:p.state,recipient:p.recipient,asset:p.asset,amountUnits:p.amount_units,network:'base-sepolia',transactionHash:p.tx_hash}));return NextResponse.json({payments},{headers});}catch(e){return failure(e);}}
