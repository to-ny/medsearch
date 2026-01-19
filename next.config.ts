import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Old ID-only routes to new slug routes (default to NL)
      // The page component will then redirect to the proper slug URL
      { source: '/vtm/:code', destination: '/nl/substances/:code', permanent: true },
      { source: '/vmp/:code', destination: '/nl/generics/:code', permanent: true },
      { source: '/amp/:code', destination: '/nl/medications/:code', permanent: true },
      { source: '/ampp/:code', destination: '/nl/packages/:code', permanent: true },
      { source: '/company/:code', destination: '/nl/companies/:code', permanent: true },
      { source: '/vmp-group/:code', destination: '/nl/therapeutic-groups/:code', permanent: true },
      { source: '/atc/:code', destination: '/nl/classifications/:code', permanent: true },
      { source: '/chapter-iv/:chapter/:paragraph', destination: '/nl/chapter-iv/:chapter/:paragraph', permanent: true },
      { source: '/search', destination: '/nl/search', permanent: true },
    ];
  },
};

export default nextConfig;
