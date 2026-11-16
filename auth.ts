import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
export const authConfigured=()=>Boolean(process.env.AUTH_SECRET&&process.env.AUTH_GITHUB_ID&&process.env.AUTH_GITHUB_SECRET&&process.env.AUTH_URL);
export const {handlers,auth,signIn,signOut}=NextAuth({
 providers:[GitHub],session:{strategy:'jwt',maxAge:60*60*24},
 callbacks:{async jwt({token,account}){if(account?.provider==='github')token.ownerId=`github:${account.providerAccountId}`;return token;},async session({session,token}){if(session.user&&typeof token.ownerId==='string')session.user.id=token.ownerId;return session;}},
});
export async function authenticatedOwner(){if(!authConfigured())return null;const session=await auth();return session?.user?.id||null;}
