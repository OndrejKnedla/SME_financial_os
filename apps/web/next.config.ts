import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sme-financial-os/api', '@sme-financial-os/db', '@sme-financial-os/shared'],
  eslint: {
    // Lint errors are checked separately with `pnpm lint`
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are checked separately with `pnpm typecheck`
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
