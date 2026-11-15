import type { NextConfig } from 'next';
const nextConfig:NextConfig={distDir:process.env.NODE_ENV==='development'?'.next-dev':'.next',serverExternalPackages:['@electric-sql/pglite'],devIndicators:false};
export default nextConfig;
