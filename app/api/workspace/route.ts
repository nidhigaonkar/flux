import { NextRequest,NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { listAgents,seedWorkspace,createAgent,getAgent,saveProgress,connectDemo,refreshDemo,disconnectDemo } from '@/lib/db';
export const runtime='nodejs';
const provider=z.enum(['coinbase','crossmint','link']);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),name:z.string().trim().min(1).max(80),description:z.string().max(400).default('')}),
 z.object({action:z.literal('save'),id:z.string(),step:z.number().int().min(1).max(4),selected:z.array(provider).max(3)}),
 z.object({action:z.literal('connect'),id:z.string(),provider,scenario:z.enum(['success','pending','failure']).default('success')}),
 z.object({action:z.literal('refresh'),id:z.string(),provider}),z.object({action:z.literal('disconnect'),id:z.string(),provider})
]);
const rate=new Map<string,{count:number;until:number}>();
function unavailable(){return process.env.NODE_ENV==='production';}
function sameOrigin(req:NextRequest){try{const origin=new URL(req.headers.get('origin')||'');return ['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.get('host');}catch{return false;}}
export async function GET(req:NextRequest){
 if(unavailable())return NextResponse.json({error:'This local demo is disabled in production. Configure supported authentication before deployment.'},{status:503});
 try{let owner=req.cookies.get('wallet_demo_session')?.value;const fresh=!owner;if(!owner)owner=randomUUID();if(fresh)await seedWorkspace(owner);const agents=await listAgents(owner);const res=NextResponse.json({agents});if(fresh)res.cookies.set('wallet_demo_session',owner,{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:60*60*24*30});return res;}catch{return NextResponse.json({error:'The local database is unavailable. Check that the app can write to DATABASE_PATH.'},{status:503});}
}
export async function POST(req:NextRequest){
 if(unavailable())return NextResponse.json({error:'Live access is disabled. Authentication and provider credentials are required.'},{status:503});
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const owner=req.cookies.get('wallet_demo_session')?.value;if(!owner)return NextResponse.json({error:'Open the dashboard to initialize your demo session.'},{status:401});
 const window=rate.get(owner);if(window&&window.until>Date.now()&&window.count>=60)return NextResponse.json({error:'Too many setup requests. Try again in a minute.'},{status:429,headers:{'Retry-After':'60'}});rate.set(owner,{count:window&&window.until>Date.now()?window.count+1:1,until:window&&window.until>Date.now()?window.until:Date.now()+60000});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Check your inputs. An agent name and valid provider selection are required.'},{status:400});const data=parsed.data;
 try{if(data.action==='create')return NextResponse.json({agent:await createAgent(owner,data.name,data.description)});
 const agent=await getAgent(owner,data.id);if(!agent)return NextResponse.json({error:'Agent not found.'},{status:404});
 if(data.action==='save')await saveProgress(owner,data.id,data.step,data.selected);
 else if(data.action==='connect')await connectDemo(owner,data.id,data.provider,data.scenario);
 else if(data.action==='refresh')await refreshDemo(owner,data.id,data.provider);
 else if(data.action==='disconnect')await disconnectDemo(owner,data.id,data.provider);
 return NextResponse.json({agent:await getAgent(owner,data.id)});
 }catch{return NextResponse.json({error:'The setup could not be saved. Your completed connections are preserved; please retry.'},{status:500});}
}
