import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware - ensures user is authenticated
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  // Re-assign to non-null variables to help TypeScript
  const session = ctx.session;
  const user = ctx.user;
  return next({
    ctx: {
      ...ctx,
      session,
      user,
    },
  });
});

// Organization middleware - ensures user has an organization selected
const hasOrganization = middleware(async ({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization selected' });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
    },
  });
});

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(isAuthed);

// Organization procedure - requires auth + organization
export const orgProcedure = t.procedure.use(isAuthed).use(hasOrganization);
