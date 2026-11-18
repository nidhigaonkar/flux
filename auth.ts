import {betterAuth} from 'better-auth';
import {Kysely,PGliteDialect} from 'kysely';
import {headers} from 'next/headers';
import {database} from '@/lib/db';
export function authConfigured(){try{const url=new URL(process.env.AUTH_URL||'');return !!process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32&&(url.protocol==='https:'||(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)));}catch{return false;}}
async function createAuth(){if(!authConfigured())throw Error('authentication_configuration_required');const pg=await database();return betterAuth({
 appName:'Flux',baseURL:process.env.AUTH_URL!,basePath:'/api/auth',secret:process.env.AUTH_SECRET!,
 database:{db:new Kysely({dialect:new PGliteDialect({pglite:pg})}),type:'postgres',transaction:true},
 trustedOrigins:[new URL(process.env.AUTH_URL!).origin],
 emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:false},
 user:{modelName:'auth_user'},account:{modelName:'auth_account'},verification:{modelName:'auth_verification'},
 session:{modelName:'auth_session',expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
 rateLimit:{enabled:true,storage:'database',modelName:'auth_rate_limit',window:60,max:100,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:5}}},
 advanced:{useSecureCookies:process.env.NODE_ENV==='production',defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
 logger:{level:'error'},
 });}
const state=globalThis as unknown as {fluxEmailAuth?:ReturnType<typeof createAuth>};
export function getAuth(){return state.fluxEmailAuth??=createAuth();}
export async function authenticatedOwner(){if(!authConfigured())return null;const session=await(await getAuth()).api.getSession({headers:await headers()});return session?.user.id?`user:${session.user.id}`:null;}
