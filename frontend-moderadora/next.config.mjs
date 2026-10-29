/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: new URL('.', import.meta.url).pathname.replace(
    /^\/([A-Z]:)/i,
    '$1',
  ),
  poweredByHeader: false,
  experimental: { middlewareClientMaxBodySize: '50mb', proxyTimeout: 120000 },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backend = (
      process.env.BACKEND_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    return [
      { source: '/api/backend/:path*', destination: `${backend}/api/:path*` },
      {
        source: '/media/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
};
export default nextConfig;
