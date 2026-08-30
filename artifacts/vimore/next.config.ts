import type { NextConfig } from 'next';

const APPWRITE_ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const APPWRITE_HOST = new URL(APPWRITE_ENDPOINT).origin;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Build a strict Content Security Policy.
// unsafe-eval is only permitted in dev (Next.js HMR needs it).
// unsafe-inline is required by Next.js for its own inline scripts/styles.
const csp = [
  `default-src 'self'`,
  // unsafe-eval removed in production; ad-network script host explicitly whitelisted
  `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ''} https://www.highperformanceformat.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // Appwrite + Agora signalling + push endpoint
  `connect-src 'self' ${APPWRITE_HOST} wss: ws: https:`,
  `img-src 'self' data: blob: ${APPWRITE_HOST} https:`,
  `media-src 'self' blob: ${APPWRITE_HOST} https:`,
  // Restrict frames to self + ad network only (not all of https:)
  `frame-src 'self' https://www.highperformanceformat.com`,
  `worker-src 'self' blob:`,
  // Harden against common injection vectors
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
].join('; ');

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          { key: 'Content-Security-Policy', value: csp },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Only allow this site to frame itself (blocks clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Control referrer information sent to other origins
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enforce HTTPS for 2 years, including subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Disable sensitive browser APIs that the app does not need globally
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=()' },
          // Allow cross-origin embedding of assets (needed for PWA/fonts)
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          // Isolate browsing context from other origins
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/api/file/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.replit.dev', '*.replit.app', '*.spock.replit.dev', '*.worf.replit.dev', '*.janeway.replit.dev'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar', '@radix-ui/react-dialog', 'recharts'],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
