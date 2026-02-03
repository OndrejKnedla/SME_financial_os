import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  paginationSchema,
  dateRangeSchema,
  invoiceStatusSchema,
  formatInvoiceNumber,
  generateVariableSymbol,
} from '@sme-financial-os/shared';
import { sendEmail, InvoiceEmail } from '@sme-financial-os/email';
import { render } from '@react-email/render';
import { TRPCError } from '@trpc/server';

export const invoiceRouter = router({
  // List invoices with filtering
  list: orgProcedure
    .input(
      paginationSchema.merge(dateRangeSchema).extend({
        status: invoiceStatusSchema.optional(),
        contactId: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, status, contactId, dateFrom, dateTo, search } = input;

      const where = {
        organizationId: ctx.organizationId,
        ...(status && { status }),
        ...(contactId && { contactId }),
        ...(dateFrom && { issueDate: { gte: dateFrom } }),
        ...(dateTo && { issueDate: { lte: dateTo } }),
        ...(search && {
          OR: [
            { number: { contains: search, mode: 'insensitive' as const } },
            { contact: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }),
      };

      const invoices = await ctx.prisma.invoice.findMany({
        where,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { issueDate: 'desc' },
        include: {
          contact: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
      });

      let nextCursor: string | undefined;
      if (invoices.length > limit) {
        const nextItem = invoices.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: invoices,
        nextCursor,
      };
    }),

  // Get single invoice with all details
  get: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const invoice = await ctx.prisma.invoice.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.organizationId,
      },
      include: {
        contact: true,
        items: { orderBy: { position: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        bankAccount: true,
        documents: true,
      },
    });

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    return invoice;
  }),

  // Create invoice
  create: orgProcedure.input(createInvoiceSchema).mutation(async ({ ctx, input }) => {
    // Get organization for invoice numbering
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { invoicePrefix: true, invoiceNumber: true },
    });

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    const invoiceNumber = formatInvoiceNumber(org.invoicePrefix, org.invoiceNumber);
    const variableSymbol = input.variableSymbol ?? generateVariableSymbol(invoiceNumber);

    // Calculate totals
    const items = input.items.map((item, index) => {
      const totalNet = Math.round(item.quantity * item.unitPrice);
      const totalTax = Math.round(totalNet * (item.taxRate / 100));
      const totalGross = totalNet + totalTax;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        totalNet,
        totalTax,
        totalGross,
        position: index,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.totalNet, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.totalTax, 0);
    const total = subtotal + taxAmount;

    // Create invoice with items
    const invoice = await ctx.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: ctx.organizationId,
          contactId: input.contactId,
          number: invoiceNumber,
          type: input.type,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          subtotal,
          taxAmount,
          total,
          currency: input.currency,
          bankAccountId: input.bankAccountId,
          variableSymbol,
          notes: input.notes,
          internalNotes: input.internalNotes,
          items: {
            create: items,
          },
        },
        include: {
          items: true,
          contact: true,
        },
      });

      // Increment organization invoice number
      await tx.organization.update({
        where: { id: ctx.organizationId },
        data: { invoiceNumber: { increment: 1 } },
      });

      return inv;
    });

    return invoice;
  }),

  // Update invoice
  update: orgProcedure
    .input(z.object({ id: z.string() }).merge(updateInvoiceSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...data } = input;

      // Verify invoice belongs to organization
      const existing = await ctx.prisma.invoice.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (existing.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only edit draft invoices' });
      }

      // If items are provided, recalculate totals
      let updateData: Record<string, unknown> = { ...data };

      if (items) {
        const processedItems = items.map((item, index) => {
          const totalNet = Math.round(item.quantity * item.unitPrice);
          const totalTax = Math.round(totalNet * (item.taxRate / 100));
          const totalGross = totalNet + totalTax;

          return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            totalNet,
            totalTax,
            totalGross,
            position: index,
          };
        });

        const subtotal = processedItems.reduce((sum, item) => sum + item.totalNet, 0);
        const taxAmount = processedItems.reduce((sum, item) => sum + item.totalTax, 0);
        const total = subtotal + taxAmount;

        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          total,
        };

        // Delete old items and create new ones
        await ctx.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await ctx.prisma.invoiceItem.createMany({
          data: processedItems.map((item) => ({ ...item, invoiceId: id })),
        });
      }

      const invoice = await ctx.prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          items: { orderBy: { position: 'asc' } },
          contact: true,
        },
      });

      return invoice;
    }),

  // Delete invoice
  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.invoice.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    if (existing.status === 'PAID') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete paid invoices' });
    }

    await ctx.prisma.invoice.delete({ where: { id: input.id } });

    return { success: true };
  }),

  // Mark invoice as sent
  markSent: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.invoice.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    const invoice = await ctx.prisma.invoice.update({
      where: { id: input.id },
      data: { status: 'SENT' },
    });

    return invoice;
  }),

  // Mark invoice as paid
  markPaid: orgProcedure
    .input(
      z.object({
        id: z.string(),
        paidAt: z.date().optional(),
        amount: z.number().int().positive().optional(),
        method: z.enum(['BANK_TRANSFER', 'CARD', 'CASH', 'OTHER']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      const paidAt = input.paidAt ?? new Date();
      const amount = input.amount ?? existing.total;

      // Create payment record
      await ctx.prisma.payment.create({
        data: {
          invoiceId: input.id,
          amount,
          currency: existing.currency,
          paidAt,
          method: input.method ?? 'BANK_TRANSFER',
        },
      });

      // Update invoice status
      const invoice = await ctx.prisma.invoice.update({
        where: { id: input.id },
        data: {
          status: 'PAID',
          paidAt,
        },
      });

      return invoice;
    }),

  // Duplicate invoice
  duplicate: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.invoice.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { items: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    // Get next invoice number
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { invoicePrefix: true, invoiceNumber: true },
    });

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    const invoiceNumber = formatInvoiceNumber(org.invoicePrefix, org.invoiceNumber);
    const variableSymbol = generateVariableSymbol(invoiceNumber);
    const now = new Date();
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const invoice = await ctx.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: ctx.organizationId,
          contactId: existing.contactId,
          number: invoiceNumber,
          type: existing.type,
          status: 'DRAFT',
          issueDate: now,
          dueDate,
          subtotal: existing.subtotal,
          taxAmount: existing.taxAmount,
          total: existing.total,
          currency: existing.currency,
          bankAccountId: existing.bankAccountId,
          variableSymbol,
          notes: existing.notes,
          internalNotes: existing.internalNotes,
          items: {
            create: existing.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              totalNet: item.totalNet,
              totalTax: item.totalTax,
              totalGross: item.totalGross,
              position: item.position,
            })),
          },
        },
        include: { items: true },
      });

      await tx.organization.update({
        where: { id: ctx.organizationId },
        data: { invoiceNumber: { increment: 1 } },
      });

      return inv;
    });

    return invoice;
  }),

  // Send invoice via email
  send: orgProcedure
    .input(
      z.object({
        id: z.string(),
        to: z.string().email().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          contact: true,
          organization: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      // Get email recipient
      const recipientEmail = input.to ?? invoice.contact?.email;
      if (!recipientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No recipient email. Please provide an email or update the contact.',
        });
      }

      // Determine locale from country
      const locale = invoice.organization.country === 'PL' ? 'pl' :
                     invoice.organization.country === 'CZ' ? 'cs' : 'en';

      // Format currency
      const formatAmount = (amount: number) => {
        return new Intl.NumberFormat(locale === 'cs' ? 'cs-CZ' : locale === 'pl' ? 'pl-PL' : 'en-GB', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount / 100);
      };

      // Format date
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : locale === 'pl' ? 'pl-PL' : 'en-GB').format(date);
      };

      // Render email HTML
      const emailHtml = await render(
        InvoiceEmail({
          invoiceNumber: invoice.number,
          companyName: invoice.organization.name,
          customerName: invoice.contact?.name ?? 'Customer',
          amount: formatAmount(invoice.total),
          currency: invoice.currency,
          dueDate: formatDate(invoice.dueDate),
          issueDate: formatDate(invoice.issueDate),
          locale,
        })
      );

      // Subject based on locale
      const subjects = {
        cs: `Faktura ${invoice.number} od ${invoice.organization.name}`,
        pl: `Faktura ${invoice.number} od ${invoice.organization.name}`,
        en: `Invoice ${invoice.number} from ${invoice.organization.name}`,
      };

      // Send email
      try {
        await sendEmail({
          to: recipientEmail,
          subject: subjects[locale],
          html: emailHtml,
        });

        // Update invoice status to SENT
        await ctx.prisma.invoice.update({
          where: { id: input.id },
          data: { status: 'SENT' },
        });

        return { success: true, sentTo: recipientEmail };
      } catch (error) {
        console.error('Failed to send invoice email:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send email. Please try again.',
        });
      }
    }),

  // Send payment reminder
  sendReminder: orgProcedure
    .input(
      z.object({
        id: z.string(),
        to: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          contact: true,
          organization: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (invoice.status === 'PAID') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice is already paid' });
      }

      // Get email recipient
      const recipientEmail = input.to ?? invoice.contact?.email;
      if (!recipientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No recipient email. Please provide an email or update the contact.',
        });
      }

      // Determine locale from country
      const locale = invoice.organization.country === 'PL' ? 'pl' :
                     invoice.organization.country === 'CZ' ? 'cs' : 'en';

      // Format currency
      const formatAmount = (amount: number) => {
        return new Intl.NumberFormat(locale === 'cs' ? 'cs-CZ' : locale === 'pl' ? 'pl-PL' : 'en-GB', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount / 100);
      };

      // Format date
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : locale === 'pl' ? 'pl-PL' : 'en-GB').format(date);
      };

      // Calculate days overdue
      const now = new Date();
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Import the reminder template dynamically to avoid circular deps
      const { PaymentReminderEmail } = await import('@sme-financial-os/email');

      // Render email HTML
      const emailHtml = await render(
        PaymentReminderEmail({
          invoiceNumber: invoice.number,
          companyName: invoice.organization.name,
          customerName: invoice.contact?.name ?? 'Customer',
          amount: formatAmount(invoice.total),
          currency: invoice.currency,
          dueDate: formatDate(invoice.dueDate),
          daysOverdue,
          locale,
        })
      );

      // Subject based on locale and overdue status
      const isOverdue = daysOverdue > 0;
      const subjects = {
        cs: isOverdue
          ? `Upomínka - faktura ${invoice.number} po splatnosti`
          : `Připomínka platby - faktura ${invoice.number}`,
        pl: isOverdue
          ? `Upomnienie - faktura ${invoice.number} po terminie`
          : `Przypomnienie o płatności - faktura ${invoice.number}`,
        en: isOverdue
          ? `Overdue Notice - Invoice ${invoice.number}`
          : `Payment Reminder - Invoice ${invoice.number}`,
      };

      // Send email
      try {
        await sendEmail({
          to: recipientEmail,
          subject: subjects[locale],
          html: emailHtml,
        });

        return { success: true, sentTo: recipientEmail, daysOverdue };
      } catch (error) {
        console.error('Failed to send reminder email:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send email. Please try again.',
        });
      }
    }),
});
