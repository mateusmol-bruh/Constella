/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    return [{ source: '/api/backend/:path*', destination: `${backend}/api/:path*` }];
  },
};
export default nextConfig;
