import type { Metadata } from 'next';
import './globals.css';
import { BRAND } from '@/lib/branding';
export const metadata:Metadata={title:`${BRAND.name} — One setup. Every wallet.`,description:'Set up Coinbase, Crossmint, and Link for your AI agents. One clear workspace, from first connection to configuration.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
