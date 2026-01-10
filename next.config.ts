import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers are handled by proxy with dynamic nonce for CSP
  // See src/proxy.ts for CSP configuration
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'next-intl', 'zod'],
  },
};

export default nextConfig;
