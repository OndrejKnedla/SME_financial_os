import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@sme-financial-os/api', '@sme-financial-os/db', '@sme-financial-os/shared'],
  // Set workspace root for monorepo
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
