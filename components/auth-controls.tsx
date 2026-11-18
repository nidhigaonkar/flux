'use client';
import Link from 'next/link';
import {useState} from 'react';
import {authClient,logOut} from '@/lib/auth-client';
export function AuthControls(){const {data:session,isPending}=authClient.useSession();const [busy,setBusy]=useState(false);const [error,setError]=useState('');if(isPending)return <span className="muted">Checking session…</span>;if(!session)return <Link className="header-sign-in" href="/login">Sign in</Link>;return <div className="auth-controls"><span title={session.user.email}>{session.user.name}</span><button disabled={busy} onClick={async()=>{setBusy(true);try{await logOut()}catch{setError('Could not sign out. Try again.');setBusy(false)}}}>{busy?'Signing out…':'Sign out'}</button>{error&&<span role="alert">{error}</span>}</div>}
