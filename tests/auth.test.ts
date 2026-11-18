import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {getAuth,authConfigured} from '../auth';
import {database,createAgent,getAgent} from '../lib/db';
Object.assign(process.env,{DATABASE_PATH:'memory://',AUTH_URL:'http://localhost:3000',AUTH_SECRET:'test-only-email-auth-secret-32-characters-minimum',NODE_ENV:'test'});
after(async()=>{await(await database()).close()});
const password='Test-only-password-8271';
function request(path:string,body?:unknown,cookie=''){return new Request(`http://localhost:3000/api/auth/${path}`,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:cookie,'X-Forwarded-For':'127.0.0.1'},...(body?{body:JSON.stringify(body)}:{})});}
function cookies(r:Response){return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}
test('email signup creates a private session, stores hashed passwords, and signout revokes the session',async()=>{
 assert.equal(authConfigured(),true);const auth=await getAuth();
 const signup=await auth.handler(request('sign-up/email',{name:'Test user',email:'first@example.test',password}));assert.equal(signup.status,200,await signup.clone().text());const cookie=cookies(signup);assert.ok(cookie.includes('session_token='));assert.match(signup.headers.get('set-cookie')||'',/httponly/i);
 const session=await auth.api.getSession({headers:new Headers({cookie})});assert.ok(session?.user.id);assert.equal(session?.user.email,'first@example.test');
 const body=await signup.json();assert.ok(!JSON.stringify(body).includes(password));assert.ok(!JSON.stringify(body).includes('password'));
 const pg=await database();const row=(await pg.query<{password:string}>('SELECT password FROM auth_account WHERE "userId"=$1',[session!.user.id])).rows[0];assert.ok(row.password);assert.notEqual(row.password,password);assert.ok(!row.password.includes(password));
 const agent=await createAgent(`user:${session!.user.id}`,'Private agent','','live');assert.equal(await getAgent('user:someone-else',agent.id),null);
 const logout=await auth.handler(request('sign-out',{},cookie));assert.equal(logout.status,200);assert.equal(await auth.api.getSession({headers:new Headers({cookie})}),null);
 const wrong=await auth.handler(request('sign-in/email',{email:'first@example.test',password:'incorrect-password'}));assert.equal(wrong.status,401);
 const login=await auth.handler(request('sign-in/email',{email:'first@example.test',password}));assert.equal(login.status,200);const restored=await auth.api.getSession({headers:new Headers({cookie:cookies(login)})});assert.equal(restored?.user.id,session!.user.id);assert.equal((await getAgent(`user:${restored!.user.id}`,agent.id))?.name,'Private agent');
});
test('authentication rejects short passwords and cross-origin requests',async()=>{const auth=await getAuth();const short=await auth.handler(request('sign-up/email',{name:'Short',email:'short@example.test',password:'short'}));assert.equal(short.status,400);const bad=new Request('http://localhost:3000/api/auth/sign-in/email',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({email:'first@example.test',password})});assert.equal((await auth.handler(bad)).status,403);});
