import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/okx-proxy/:path*', // Your frontend will call this path
        destination: 'https://www.okx.com/:path*', // Vercel will proxy to this external URL
      },
    ];
  },
};

export default nextConfig;
