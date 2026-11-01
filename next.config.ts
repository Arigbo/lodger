import type { NextConfig } from 'next';
import { OPTIMIZED_IMAGE_HOSTS } from './src/config/images';
import { securityHeaders } from './src/config/security';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    // Hosts outside this list render unoptimised via optimizedImageProps().
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname, pathname: '/**' })),
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },

  async redirects() {
    return [
      { source: '/landlord/property/:path*', destination: '/landlord/properties/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
