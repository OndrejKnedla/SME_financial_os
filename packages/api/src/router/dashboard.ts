import { z } from 'zod';
import { router, orgProcedure } from '../trpc';

export const dashboardRouter = router({
  // Get key stats
  stats: orgProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get invoice stats
    const [
      totalRevenue,
      lastMonthRevenue,
      unpaidInvoices,
      overdueInvoices,
      totalExpenses,
      lastMonthExpenses,
    ] = await Promise.all([
      // Total revenue this month
      ctx.prisma.invoice.aggregate({
        where: {
          organizationId: ctx.organizationId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      // Last month revenue
      ctx.prisma.invoice.aggregate({
        where: {
          organizationId: ctx.organizationId,
          status: 'PAID',
          paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { total: true },
      }),
      // Unpaid invoices count and total
      ctx.prisma.invoice.aggregate({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ['SENT', 'VIEWED'] },
        },
        _count: true,
        _sum: { total: true },
      }),
      // Overdue invoices
      ctx.prisma.invoice.aggregate({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ['SENT', 'VIEWED'] },
          dueDate: { lt: now },
        },
        _count: true,
        _sum: { total: true },
      }),
      // Total expenses this month
      ctx.prisma.expense.aggregate({
        where: {
          organizationId: ctx.organizationId,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Last month expenses
      ctx.prisma.expense.aggregate({
        where: {
          organizationId: ctx.organizationId,
          date: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentRevenue = totalRevenue._sum.total ?? 0;
    const prevRevenue = lastMonthRevenue._sum.total ?? 0;
    const currentExpenses = totalExpenses._sum.amount ?? 0;
    const prevExpenses = lastMonthExpenses._sum.amount ?? 0;

    return {
      revenue: {
        current: currentRevenue,
        previous: prevRevenue,
        change: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      },
      expenses: {
        current: currentExpenses,
        previous: prevExpenses,
        change: prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0,
      },
      unpaid: {
        count: unpaidInvoices._count,
        total: unpaidInvoices._sum.total ?? 0,
      },
      overdue: {
        count: overdueInvoices._count,
        total: overdueInvoices._sum.total ?? 0,
      },
      cashFlow: currentRevenue - currentExpenses,
    };
  }),

  // Get recent invoices
  recentInvoices: orgProcedure.query(async ({ ctx }) => {
    const invoices = await ctx.prisma.invoice.findMany({
      where: { organizationId: ctx.organizationId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: { name: true },
        },
      },
    });

    return invoices;
  }),

  // Get overdue invoices
  overdueInvoices: orgProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const invoices = await ctx.prisma.invoice.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: ['SENT', 'VIEWED'] },
        dueDate: { lt: now },
      },
      take: 10,
      orderBy: { dueDate: 'asc' },
      include: {
        contact: {
          select: { name: true },
        },
      },
    });

    return invoices;
  }),

  // Get recent expenses
  recentExpenses: orgProcedure.query(async ({ ctx }) => {
    const expenses = await ctx.prisma.expense.findMany({
      where: { organizationId: ctx.organizationId },
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    return expenses;
  }),

  // Cash flow data for chart
  cashFlow: orgProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const { months } = input;
      const now = new Date();
      const data = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const [income, expenses] = await Promise.all([
          ctx.prisma.invoice.aggregate({
            where: {
              organizationId: ctx.organizationId,
              status: 'PAID',
              paidAt: { gte: monthStart, lte: monthEnd },
            },
            _sum: { total: true },
          }),
          ctx.prisma.expense.aggregate({
            where: {
              organizationId: ctx.organizationId,
              date: { gte: monthStart, lte: monthEnd },
            },
            _sum: { amount: true },
          }),
        ]);

        data.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          income: (income._sum.total ?? 0) / 100, // Convert from cents
          expenses: (expenses._sum.amount ?? 0) / 100,
        });
      }

      return data;
    }),
});
