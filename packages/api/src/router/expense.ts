import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import { createExpenseSchema, updateExpenseSchema, paginationSchema, dateRangeSchema } from '@sme-financial-os/shared';
import { TRPCError } from '@trpc/server';
import { DocumentProcessor, type ExtractionResult } from '../../../ocr/src';

export const expenseRouter = router({
  // List expenses
  list: orgProcedure
    .input(
      z.object({
        ...paginationSchema.shape,
        ...dateRangeSchema.shape,
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
        categoryId: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, dateFrom, dateTo, status, categoryId, search } = input;

      const where = {
        organizationId: ctx.organizationId,
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            }
          : {}),
        ...(search && {
          OR: [
            { vendorName: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.expense.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { date: 'desc' },
          include: {
            category: true,
            documents: true,
          },
        }),
        ctx.prisma.expense.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor, total };
    }),

  // Get single expense
  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.prisma.expense.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          category: true,
          documents: true,
        },
      });

      if (!expense) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      return expense;
    }),

  // Create expense
  create: orgProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.prisma.expense.create({
        data: {
          organizationId: ctx.organizationId,
          date: input.date,
          amount: input.amount,
          currency: input.currency,
          taxRate: input.taxRate ?? 21,
          taxAmount: input.taxRate ? Math.round(input.amount * (input.taxRate / 100)) : 0,
          vendorName: input.vendorName,
          vendorTaxId: input.vendorTaxId,
          description: input.description,
          categoryId: input.categoryId,
          status: 'PENDING',
        },
      });

      return expense;
    }),

  // Update expense
  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        ...updateExpenseSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.prisma.expense.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      // Recalculate tax if amount or rate changed
      let taxAmount = existing.taxAmount;
      if (data.amount || data.taxRate) {
        const amount = data.amount ?? existing.amount;
        const taxRate = data.taxRate ?? (existing.taxRate ? Number(existing.taxRate) : 21);
        taxAmount = Math.round(amount * (taxRate / 100));
      }

      const expense = await ctx.prisma.expense.update({
        where: { id },
        data: {
          ...data,
          taxAmount,
        },
      });

      return expense;
    }),

  // Delete expense
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.expense.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      await ctx.prisma.expense.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Approve expense
  approve: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.expense.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      const expense = await ctx.prisma.expense.update({
        where: { id: input.id },
        data: { status: 'APPROVED' },
      });

      return expense;
    }),

  // Mark expense as paid
  markPaid: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.expense.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      const expense = await ctx.prisma.expense.update({
        where: { id: input.id },
        data: { status: 'PAID' },
      });

      return expense;
    }),

  // Process receipt/invoice with OCR
  processOcr: orgProcedure
    .input(
      z.object({
        imageData: z.string(), // base64 encoded image
        mimeType: z.string(),
        language: z.enum(['cs', 'pl', 'en', 'auto']).default('auto'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const processor = new DocumentProcessor();

      try {
        const result = await processor.processImage(
          input.imageData,
          input.mimeType,
          {
            language: input.language,
            expectedCurrency: ctx.prisma.organization
              ? undefined
              : 'CZK',
          }
        );

        return {
          success: result.success,
          confidence: result.confidence,
          documentType: result.documentType,
          extractedData: {
            date: result.date?.toISOString(),
            amount: result.total,
            currency: result.currency,
            taxRate: result.vatBreakdown?.[0]?.rate,
            taxAmount: result.vatAmount,
            vendorName: result.vendor?.name,
            vendorTaxId: result.vendor?.taxId,
            description: result.items.map((i) => i.description).join(', ') || undefined,
            invoiceNumber: result.invoiceNumber,
          },
          items: result.items,
          warnings: result.warnings,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'OCR processing failed',
        });
      }
    }),

  // Create expense from OCR result
  createFromOcr: orgProcedure
    .input(
      z.object({
        // OCR extracted data
        date: z.coerce.date(),
        amount: z.number().positive(),
        currency: z.enum(['CZK', 'PLN', 'EUR']),
        taxRate: z.number().min(0).max(100).optional(),
        taxAmount: z.number().optional(),
        vendorName: z.string().min(1),
        vendorTaxId: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.string().optional(),

        // Document info
        documentUrl: z.string().optional(), // URL if uploaded to storage
        ocrConfidence: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate tax amount if not provided
      let taxAmount = input.taxAmount;
      if (!taxAmount && input.taxRate) {
        taxAmount = Math.round(input.amount * (input.taxRate / 100));
      }

      // Create the expense
      const expense = await ctx.prisma.expense.create({
        data: {
          organizationId: ctx.organizationId,
          date: input.date,
          amount: input.amount,
          currency: input.currency,
          taxRate: input.taxRate ?? 21,
          taxAmount: taxAmount ?? 0,
          vendorName: input.vendorName,
          vendorTaxId: input.vendorTaxId,
          description: input.description,
          categoryId: input.categoryId,
          status: 'PENDING',
        },
      });

      // If document URL provided, create document record
      if (input.documentUrl) {
        await ctx.prisma.document.create({
          data: {
            organizationId: ctx.organizationId,
            expenseId: expense.id,
            filename: `receipt-${expense.id}`,
            mimeType: 'image/jpeg', // Default, should be passed from upload
            size: 0,
            url: input.documentUrl,
            ocrStatus: 'COMPLETED',
            ocrConfidence: input.ocrConfidence,
          },
        });
      }

      return expense;
    }),

  // Get categories for expense categorization
  getCategories: orgProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.category.findMany({
      where: {
        organizationId: ctx.organizationId,
        type: 'EXPENSE',
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }),

  // Create category
  createCategory: orgProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().default('#6366f1'),
        accountCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          color: input.color,
          accountCode: input.accountCode,
          type: 'EXPENSE',
        },
      });

      return category;
    }),
});
