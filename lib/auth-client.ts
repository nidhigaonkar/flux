'use client';
import {createAuthClient} from 'better-auth/react';
export const authClient=createAuthClient();
export function goToLogin(next='/setup'){window.location.assign(`/login?next=${encodeURIComponent(next)}`);}
export async function logOut(){const result=await authClient.signOut();if(result.error)throw Error('Unable to sign out. Please try again.');window.location.assign('/login');}
