import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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

export default withNextIntl(nextConfig);
