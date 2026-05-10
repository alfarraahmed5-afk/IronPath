import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace root contains the lockfile + monorepo manifest. Without
  // this Next.js auto-detects an unrelated lockfile in the user home and
  // resolves react/react-dom from there, which produces Minified React
  // error #31 at prerender time for /404 + /500 (host-React vs app-React
  // identity mismatch).
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['framer-motion', '@number-flow/react'],
  },
};

export default nextConfig;
