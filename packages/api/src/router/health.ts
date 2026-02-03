import { router, publicProcedure } from '../trpc';

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  db: publicProcedure.query(async ({ ctx }) => {
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected' };
    } catch {
      return { status: 'disconnected' };
    }
  }),
});
