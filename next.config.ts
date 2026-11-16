import type { NextConfig } from 'next';
const nextConfig:NextConfig={distDir:process.env.NODE_ENV==='development'?'.next-dev':'.next',serverExternalPackages:['@electric-sql/pglite','@coinbase/cdp-sdk','@crossmint/wallets-sdk'],devIndicators:false,logging:{incomingRequests:false}};
export default nextConfig;
