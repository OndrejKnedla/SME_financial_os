import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from './router';

export function createApiClient(baseUrl: string, sessionToken?: string, organizationId?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/api/trpc`,
        headers() {
          const headers: Record<string, string> = {};
          if (sessionToken) {
            headers['authorization'] = `Bearer ${sessionToken}`;
          }
          if (organizationId) {
            headers['x-organization-id'] = organizationId;
          }
          return headers;
        },
        transformer: superjson,
      }),
    ],
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
