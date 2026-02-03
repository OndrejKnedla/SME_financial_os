import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@sme-financial-os/api';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async ({ req }) => {
      // Extract session token from Authorization header
      const authHeader = req.headers.get('authorization');
      const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      // Extract organization ID from header
      const organizationId = req.headers.get('x-organization-id') ?? undefined;

      return createContext({ sessionToken, organizationId });
    },
  });

export { handler as GET, handler as POST };
