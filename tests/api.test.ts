import { test,after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET,POST } from '../app/api/workspace/route';
import { database } from '../lib/db';
process.env.DATABASE_PATH='memory://';
Object.assign(process.env,{NODE_ENV:'test'});
after(async()=>{await (await database()).close()});
function request(data:unknown,cookie:string,origin:string|null='http://localhost:3000'){return new NextRequest('http://localhost:3000/api/workspace',{method:'POST',headers:{host:'localhost:3000','Content-Type':'application/json',cookie,...(origin?{origin}:{})},body:JSON.stringify(data)});}
test('API validates inputs, enforces same origin and ownership, and disables production demo',async()=>{
 const r=await GET(new NextRequest('http://localhost:3000/api/workspace'));assert.equal(r.status,200);const cookie=r.headers.get('set-cookie')!.split(';')[0];const initial=await r.json();assert.equal(initial.agents.length,1);
 const invalid=await POST(request({action:'create',name:' '},cookie));assert.equal(invalid.status,400);
 assert.equal((await POST(request({action:'create',name:'a'},cookie,'https://elsewhere.example'))).status,403);
 assert.equal((await POST(request({action:'create',name:'a'},cookie,null))).status,403);
 assert.equal((await POST(request({action:'create',name:'a'},cookie,'malformed'))).status,403);
 const created=await POST(request({action:'create',name:'API agent'},cookie));assert.equal(created.status,200);const {agent}=await created.json();
 assert.equal((await POST(request({action:'connect',id:agent.id,provider:'coinbase'},'wallet_demo_session=another-owner'))).status,404);
 const resumed=await GET(new NextRequest('http://localhost:3000/api/workspace',{headers:{cookie}}));assert.ok((await resumed.json()).agents.some((a:{id:string})=>a.id===agent.id));
 Object.assign(process.env,{NODE_ENV:'production'});assert.equal((await GET(new NextRequest('http://localhost:3000/api/workspace'))).status,503);assert.equal((await POST(request({action:'create',name:'blocked'},cookie))).status,503);Object.assign(process.env,{NODE_ENV:'test'});
});
