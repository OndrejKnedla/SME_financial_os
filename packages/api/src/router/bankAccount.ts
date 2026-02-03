import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import { createBankAccountSchema } from '@sme-financial-os/shared';
import { FioClient } from '@sme-financial-os/banking';
import { TRPCError } from '@trpc/server';
import type { Invoice } from '@sme-financial-os/db';

export const bankAccountRouter = router({
  // List bank accounts
  list: orgProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.bankAccount.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts;
  }),

  // Get single bank account
  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank account not found' });
      }

      return account;
    }),

  // Create bank account (manual)
  create: orgProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.bankAccount.updateMany({
          where: { organizationId: ctx.organizationId },
          data: { isDefault: false },
        });
      }

      const account = await ctx.prisma.bankAccount.create({
        data: {
          organizationId: ctx.organizationId,
          ...input,
          provider: 'MANUAL',
        },
      });

      return account;
    }),

  // Update bank account
  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.prisma.bankAccount.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank account not found' });
      }

      // If setting as default, unset other defaults
      if (data.isDefault) {
        await ctx.prisma.bankAccount.updateMany({
          where: { organizationId: ctx.organizationId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const account = await ctx.prisma.bankAccount.update({
        where: { id },
        data,
      });

      return account;
    }),

  // Delete bank account
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.bankAccount.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank account not found' });
      }

      // Check if account has transactions
      const hasTransactions = await ctx.prisma.bankTransaction.count({
        where: { bankAccountId: input.id },
      });

      if (hasTransactions > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete account with transactions',
        });
      }

      await ctx.prisma.bankAccount.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Set as default
  setDefault: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.bankAccount.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank account not found' });
      }

      // Unset all defaults
      await ctx.prisma.bankAccount.updateMany({
        where: { organizationId: ctx.organizationId },
        data: { isDefault: false },
      });

      // Set this as default
      const account = await ctx.prisma.bankAccount.update({
        where: { id: input.id },
        data: { isDefault: true },
      });

      return account;
    }),

  // Connect Fio bank account
  connectFio: orgProcedure
    .input(
      z.object({
        name: z.string().min(1),
        fioToken: z.string().min(1, 'Fio API token is required'),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate the token by fetching account info
      const fioClient = new FioClient(input.fioToken);

      let accountInfo;
      try {
        accountInfo = await fioClient.getAccountInfo();
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Fio API token. Please check your token and try again.',
        });
      }

      // Check if account already exists
      const existing = await ctx.prisma.bankAccount.findFirst({
        where: {
          organizationId: ctx.organizationId,
          accountNumber: accountInfo.accountNumber,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This bank account is already connected.',
        });
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.bankAccount.updateMany({
          where: { organizationId: ctx.organizationId },
          data: { isDefault: false },
        });
      }

      // Create the bank account
      const account = await ctx.prisma.bankAccount.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          bankName: 'Fio banka',
          accountNumber: accountInfo.accountNumber,
          currency: accountInfo.currency as 'CZK' | 'PLN' | 'EUR',
          provider: 'FIO',
          providerAccountId: accountInfo.accountId,
          accessToken: input.fioToken, // Note: Should be encrypted in production
          isDefault: input.isDefault,
          isActive: true,
        },
      });

      return account;
    }),

  // Sync transactions from Fio
  syncFio: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
          provider: 'FIO',
        },
      });

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fio account not found' });
      }

      if (!account.accessToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account is not connected to Fio API',
        });
      }

      const fioClient = new FioClient(account.accessToken);

      // Get new transactions
      const transactions = await fioClient.getNewTransactions();

      // Save transactions to database
      let newCount = 0;

      for (const tx of transactions) {
        // Check if transaction already exists
        const existing = await ctx.prisma.bankTransaction.findFirst({
          where: {
            bankAccountId: account.id,
            externalId: tx.externalId,
          },
        });

        if (!existing) {
          await ctx.prisma.bankTransaction.create({
            data: {
              bankAccountId: account.id,
              externalId: tx.externalId,
              date: tx.date,
              amount: tx.amount,
              currency: tx.currency as 'CZK' | 'PLN' | 'EUR',
              counterpartyName: tx.counterpartyName,
              counterpartyAccount: tx.counterpartyAccount,
              description: tx.description,
              variableSymbol: tx.variableSymbol,
            },
          });
          newCount++;
        }
      }

      // Update last sync time
      await ctx.prisma.bankAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        newTransactions: newCount,
        totalFetched: transactions.length,
      };
    }),

  // Get transactions for account
  getTransactions: orgProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.accountId,
          organizationId: ctx.organizationId,
        },
      });

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank account not found' });
      }

      const transactions = await ctx.prisma.bankTransaction.findMany({
        where: { bankAccountId: input.accountId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { date: 'desc' },
      });

      let nextCursor: string | undefined;
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: transactions,
        nextCursor,
      };
    }),

  // Disconnect Fio account
  disconnectFio: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
          provider: 'FIO',
        },
      });

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fio account not found' });
      }

      // Remove the access token (keep the account and transactions)
      await ctx.prisma.bankAccount.update({
        where: { id: input.id },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isActive: false,
        },
      });

      return { success: true };
    }),

  // Get unmatched transactions (for matching UI)
  getUnmatchedTransactions: orgProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get bank accounts for this organization
      const accountIds = input.accountId
        ? [input.accountId]
        : (
            await ctx.prisma.bankAccount.findMany({
              where: { organizationId: ctx.organizationId },
              select: { id: true },
            })
          ).map((a) => a.id);

      // Get unmatched transactions (positive amounts = incoming payments)
      const transactions = await ctx.prisma.bankTransaction.findMany({
        where: {
          bankAccountId: { in: accountIds },
          matchedPaymentId: null,
          amount: { gt: 0 }, // Only incoming payments
        },
        include: {
          bankAccount: {
            select: { name: true, bankName: true },
          },
        },
        orderBy: { date: 'desc' },
        take: input.limit,
      });

      return transactions;
    }),

  // Suggest invoice matches for a transaction
  suggestMatches: orgProcedure
    .input(z.object({ transactionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the transaction
      const transaction = await ctx.prisma.bankTransaction.findFirst({
        where: { id: input.transactionId },
        include: {
          bankAccount: {
            select: { organizationId: true },
          },
        },
      });

      if (!transaction || transaction.bankAccount.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
      }

      type SuggestedMatch = Invoice & {
        matchScore: number;
        matchReason: string;
      };

      const suggestions: SuggestedMatch[] = [];

      // Strategy 1: Match by variable symbol (strongest match)
      if (transaction.variableSymbol) {
        const vsMatches = await ctx.prisma.invoice.findMany({
          where: {
            organizationId: ctx.organizationId,
            variableSymbol: transaction.variableSymbol,
            status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
          },
          include: { contact: true },
        });

        for (const invoice of vsMatches) {
          const remainingAmount = await getRemainingAmount(ctx.prisma, invoice.id, invoice.total);
          // Check if amount matches within 1% tolerance
          const amountDiff = Math.abs(transaction.amount - remainingAmount);
          const matchScore = amountDiff <= remainingAmount * 0.01 ? 100 : 80;

          suggestions.push({
            ...invoice,
            matchScore,
            matchReason: `Variable symbol match: ${transaction.variableSymbol}`,
          });
        }
      }

      // Strategy 2: Match by exact amount and unpaid invoices
      if (suggestions.length === 0) {
        const unpaidInvoices = await ctx.prisma.invoice.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
            currency: transaction.currency,
          },
          include: { contact: true },
        });

        for (const invoice of unpaidInvoices) {
          const remainingAmount = await getRemainingAmount(ctx.prisma, invoice.id, invoice.total);
          const amountDiff = Math.abs(transaction.amount - remainingAmount);

          // Exact amount match
          if (amountDiff === 0) {
            suggestions.push({
              ...invoice,
              matchScore: 70,
              matchReason: 'Exact amount match',
            });
          }
          // Close amount match (within 1%)
          else if (amountDiff <= remainingAmount * 0.01) {
            suggestions.push({
              ...invoice,
              matchScore: 50,
              matchReason: `Amount close to remaining: ${(remainingAmount / 100).toFixed(2)} ${transaction.currency}`,
            });
          }
        }
      }

      // Strategy 3: Match by counterparty name similarity
      if (transaction.counterpartyName && suggestions.length < 5) {
        const contacts = await ctx.prisma.contact.findMany({
          where: {
            organizationId: ctx.organizationId,
            name: {
              contains: transaction.counterpartyName.split(' ')[0],
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });

        if (contacts.length > 0) {
          const contactInvoices = await ctx.prisma.invoice.findMany({
            where: {
              organizationId: ctx.organizationId,
              contactId: { in: contacts.map((c) => c.id) },
              status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
            },
            include: { contact: true },
          });

          for (const invoice of contactInvoices) {
            // Skip if already in suggestions
            if (suggestions.some((s) => s.id === invoice.id)) continue;

            suggestions.push({
              ...invoice,
              matchScore: 30,
              matchReason: `Contact name match: ${invoice.contact?.name}`,
            });
          }
        }
      }

      // Sort by match score and return top 5
      return suggestions
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
    }),

  // Match a transaction to an invoice
  matchTransaction: orgProcedure
    .input(
      z.object({
        transactionId: z.string(),
        invoiceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to org
      const transaction = await ctx.prisma.bankTransaction.findFirst({
        where: { id: input.transactionId },
        include: {
          bankAccount: {
            select: { organizationId: true },
          },
        },
      });

      if (!transaction || transaction.bankAccount.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
      }

      if (transaction.matchedPaymentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction is already matched to a payment',
        });
      }

      // Verify invoice belongs to org
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organizationId: ctx.organizationId,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      // Create payment and link to transaction
      const payment = await ctx.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: transaction.amount,
          currency: transaction.currency,
          paidAt: transaction.date,
          method: 'BANK_TRANSFER',
          reference: transaction.variableSymbol || transaction.externalId,
        },
      });

      // Update transaction with payment link
      await ctx.prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: { matchedPaymentId: payment.id },
      });

      // Update invoice status
      const totalPaid = await ctx.prisma.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });

      const paidAmount = totalPaid._sum.amount || 0;
      let newStatus: 'PAID' | 'PARTIALLY_PAID' = 'PARTIALLY_PAID';

      if (paidAmount >= invoice.total) {
        newStatus = 'PAID';
      }

      await ctx.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : null,
        },
      });

      return { success: true, paymentId: payment.id, newStatus };
    }),

  // Unmatch a transaction from an invoice
  unmatchTransaction: orgProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to org
      const transaction = await ctx.prisma.bankTransaction.findFirst({
        where: { id: input.transactionId },
        include: {
          bankAccount: {
            select: { organizationId: true },
          },
          matchedPayment: {
            include: { invoice: true },
          },
        },
      });

      if (!transaction || transaction.bankAccount.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
      }

      if (!transaction.matchedPaymentId || !transaction.matchedPayment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction is not matched to any payment',
        });
      }

      const invoice = transaction.matchedPayment.invoice;

      // Remove payment link from transaction
      await ctx.prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: { matchedPaymentId: null },
      });

      // Delete the payment
      await ctx.prisma.payment.delete({
        where: { id: transaction.matchedPaymentId },
      });

      // Recalculate invoice status
      const totalPaid = await ctx.prisma.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });

      const paidAmount = totalPaid._sum.amount || 0;
      let newStatus: 'SENT' | 'PARTIALLY_PAID' | 'OVERDUE' = 'SENT';

      if (paidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      } else if (new Date(invoice.dueDate) < new Date()) {
        newStatus = 'OVERDUE';
      }

      await ctx.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          paidAt: null,
        },
      });

      return { success: true, newStatus };
    }),

  // Auto-match all unmatched transactions
  autoMatchTransactions: orgProcedure
    .input(z.object({ accountId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Get bank accounts for this organization
      const accountIds = input.accountId
        ? [input.accountId]
        : (
            await ctx.prisma.bankAccount.findMany({
              where: { organizationId: ctx.organizationId },
              select: { id: true },
            })
          ).map((a) => a.id);

      // Get all unmatched transactions with variable symbols
      const transactions = await ctx.prisma.bankTransaction.findMany({
        where: {
          bankAccountId: { in: accountIds },
          matchedPaymentId: null,
          amount: { gt: 0 },
          variableSymbol: { not: null },
        },
      });

      let matchedCount = 0;

      for (const transaction of transactions) {
        if (!transaction.variableSymbol) continue;

        // Find invoice with matching variable symbol
        const invoice = await ctx.prisma.invoice.findFirst({
          where: {
            organizationId: ctx.organizationId,
            variableSymbol: transaction.variableSymbol,
            status: { in: ['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'] },
          },
        });

        if (!invoice) continue;

        // Check remaining amount
        const remainingAmount = await getRemainingAmount(ctx.prisma, invoice.id, invoice.total);

        // Only auto-match if amount is within 1% tolerance
        const amountDiff = Math.abs(transaction.amount - remainingAmount);
        if (amountDiff > remainingAmount * 0.01) continue;

        // Create payment
        const payment = await ctx.prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: transaction.amount,
            currency: transaction.currency,
            paidAt: transaction.date,
            method: 'BANK_TRANSFER',
            reference: transaction.variableSymbol,
          },
        });

        // Link transaction to payment
        await ctx.prisma.bankTransaction.update({
          where: { id: transaction.id },
          data: { matchedPaymentId: payment.id },
        });

        // Update invoice status
        const totalPaid = await ctx.prisma.payment.aggregate({
          where: { invoiceId: invoice.id },
          _sum: { amount: true },
        });

        const paidAmount = totalPaid._sum.amount || 0;
        const newStatus = paidAmount >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

        await ctx.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : null,
          },
        });

        matchedCount++;
      }

      return { success: true, matchedCount };
    }),
});

// Helper function to calculate remaining amount on an invoice
async function getRemainingAmount(
  prisma: any,
  invoiceId: string,
  total: number
): Promise<number> {
  const totalPaid = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });

  return total - (totalPaid._sum.amount || 0);
}
