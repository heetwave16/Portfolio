import type {NextConfig} from 'next';

/**
 * Content-Security-Policy, scoped to scripts + frames only.
 * Its job here is to keep the Vercel preview toolbar (script + iframe served from
 * https://vercel.live, injected into preview HTML) from ever rendering, on preview AND production,
 * independent of dashboard settings or the VERCEL_PREVIEW_FEEDBACK_ENABLED env var.
 * Next's own inline bootstrap/RSC scripts need 'unsafe-inline'; dev-mode React needs 'unsafe-eval'.
 */
const isDev = process.env.NODE_ENV !== 'production';
const CSP = [
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
