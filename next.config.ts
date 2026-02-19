import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['yahoo-finance2', 'cheerio'],
  experimental: {},
};

export default nextConfig;
