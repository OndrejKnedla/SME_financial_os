import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { KsefStatus } from '@sme-financial-os/db';
// Import from relative path for type checking (pnpm workspace resolves at runtime)
import {
  createKSeFClient,
  generateFA3Xml,
  calculateInvoiceHash,
  transformToFA3,
  validateForKSeF,
  type KSeFEnvironment,
  type KSeFInvoiceStatus,
} from '../../../invoicing/src/ksef';

// Map KSeF API status to Prisma enum
function mapKSeFStatusToPrisma(status: KSeFInvoiceStatus): KsefStatus {
  switch (status) {
    case 'PENDING':
      return 'PENDING';
    case 'PROCESSING':
      return 'SUBMITTED'; // Map PROCESSING to SUBMITTED
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'REJECTED':
      return 'REJECTED';
    case 'ERROR':
    default:
      return 'ERROR';
  }
}

export const ksefRouter = router({
  // Test connection to KSeF
  testConnection: orgProcedure
    .input(
      z.object({
        environment: z.enum(['production', 'test', 'demo']).default('test'),
      })
    )
    .query(async ({ input }) => {
      const client = createKSeFClient(input.environment as KSeFEnvironment);
      const isConnected = await client.testConnection();

      return { connected: isConnected, environment: input.environment };
    }),

  // Initialize KSeF session
  initSession: orgProcedure
    .input(
      z.object({
        environment: z.enum(['production', 'test', 'demo']).default('test'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get organization's KSeF token
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      if (!org.ksefEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'KSeF is not enabled for this organization',
        });
      }

      if (!org.ksefToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'KSeF authorization token is not configured',
        });
      }

      if (!org.taxId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization NIP (tax ID) is required for KSeF',
        });
      }

      const client = createKSeFClient(input.environment as KSeFEnvironment);

      try {
        const session = await client.initSession({
          nip: org.taxId,
          token: org.ksefToken,
        });

        return {
          success: true,
          referenceNumber: session.referenceNumber,
          expiresAt: session.expiresAt,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to initialize KSeF session',
        });
      }
    }),

  // Validate invoice for KSeF submission
  validateInvoice: orgProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organizationId: ctx.organizationId,
        },
        include: {
          contact: true,
          items: true,
          bankAccount: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Transform to validation format
      const invoiceData = {
        number: invoice.number,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        notes: invoice.notes,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice,
          taxRate: Number(item.taxRate),
          totalNet: item.totalNet,
          totalTax: item.totalTax,
          totalGross: item.totalGross,
          position: item.position,
        })),
        contact: invoice.contact
          ? {
              name: invoice.contact.name,
              taxId: invoice.contact.taxId,
              vatId: invoice.contact.vatId,
              email: invoice.contact.email,
              phone: invoice.contact.phone,
              address: invoice.contact.address as any,
            }
          : null,
        bankAccount: invoice.bankAccount
          ? {
              accountNumber: invoice.bankAccount.accountNumber,
              bankName: invoice.bankAccount.bankName,
            }
          : null,
      };

      const sellerData = {
        name: org.name,
        taxId: org.taxId,
        vatId: org.vatId,
        address: org.address as any,
      };

      const errors = validateForKSeF(invoiceData, sellerData);

      return {
        valid: errors.length === 0,
        errors,
        invoice: {
          id: invoice.id,
          number: invoice.number,
          ksefStatus: invoice.ksefStatus,
          ksefId: invoice.ksefId,
        },
      };
    }),

  // Submit invoice to KSeF
  submitInvoice: orgProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        environment: z.enum(['production', 'test', 'demo']).default('test'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get invoice with all relations
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organizationId: ctx.organizationId,
        },
        include: {
          contact: true,
          items: true,
          bankAccount: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (invoice.ksefStatus === 'ACCEPTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice is already registered in KSeF',
        });
      }

      // Get organization
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      if (!org.ksefEnabled || !org.ksefToken || !org.taxId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'KSeF is not properly configured for this organization',
        });
      }

      // Transform invoice data
      const invoiceData = {
        number: invoice.number,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        notes: invoice.notes,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice,
          taxRate: Number(item.taxRate),
          totalNet: item.totalNet,
          totalTax: item.totalTax,
          totalGross: item.totalGross,
          position: item.position,
        })),
        contact: invoice.contact
          ? {
              name: invoice.contact.name,
              taxId: invoice.contact.taxId,
              vatId: invoice.contact.vatId,
              email: invoice.contact.email,
              phone: invoice.contact.phone,
              address: invoice.contact.address as any,
            }
          : null,
        bankAccount: invoice.bankAccount
          ? {
              accountNumber: invoice.bankAccount.accountNumber,
              bankName: invoice.bankAccount.bankName,
            }
          : null,
      };

      const sellerData = {
        name: org.name,
        taxId: org.taxId,
        vatId: org.vatId,
        address: org.address as any,
      };

      // Validate first
      const errors = validateForKSeF(invoiceData, sellerData);
      if (errors.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invoice validation failed: ${errors.join(', ')}`,
        });
      }

      // Transform to FA(3) and generate XML
      const fa3Invoice = transformToFA3(invoiceData, sellerData);
      const xml = generateFA3Xml(fa3Invoice);
      const hash = calculateInvoiceHash(xml);

      // Update invoice status to PENDING
      await ctx.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          ksefStatus: 'PENDING',
          ksefXml: xml,
        },
      });

      // Initialize session and submit
      const client = createKSeFClient(input.environment as KSeFEnvironment);

      try {
        // Init session
        await client.initSession({
          nip: org.taxId,
          token: org.ksefToken,
        });

        // Submit invoice
        const result = await client.submitInvoice(xml, hash);

        // Update invoice with KSeF reference
        await ctx.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            ksefId: result.ksefReferenceNumber,
            ksefStatus: mapKSeFStatusToPrisma(result.status),
          },
        });

        // Terminate session
        await client.terminateSession();

        return {
          success: true,
          referenceNumber: result.referenceNumber,
          ksefReferenceNumber: result.ksefReferenceNumber,
          status: result.status,
        };
      } catch (error: any) {
        // Update status to ERROR
        await ctx.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            ksefStatus: 'ERROR',
          },
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to submit invoice to KSeF',
        });
      }
    }),

  // Get KSeF status of an invoice
  getStatus: orgProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organizationId: ctx.organizationId,
        },
        select: {
          id: true,
          number: true,
          ksefId: true,
          ksefStatus: true,
          ksefXml: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        ksefId: invoice.ksefId,
        status: invoice.ksefStatus,
        hasXml: !!invoice.ksefXml,
      };
    }),

  // Download UPO (Official Receipt Confirmation)
  downloadUpo: orgProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        environment: z.enum(['production', 'test', 'demo']).default('test'),
      })
    )
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organizationId: ctx.organizationId,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (!invoice.ksefId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice has not been submitted to KSeF',
        });
      }

      if (invoice.ksefStatus !== 'ACCEPTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UPO is only available for accepted invoices',
        });
      }

      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org?.ksefToken || !org?.taxId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'KSeF is not properly configured',
        });
      }

      const client = createKSeFClient(input.environment as KSeFEnvironment);

      try {
        await client.initSession({
          nip: org.taxId,
          token: org.ksefToken,
        });

        const upo = await client.downloadUPO(invoice.ksefId);

        await client.terminateSession();

        return {
          referenceNumber: upo.referenceNumber,
          ksefReferenceNumber: upo.ksefReferenceNumber,
          timestamp: upo.timestamp,
          upoXml: upo.upoXml,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to download UPO',
        });
      }
    }),

  // Get organization KSeF settings
  getSettings: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        ksefEnabled: true,
        ksefToken: true,
        taxId: true,
        country: true,
      },
    });

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    return {
      enabled: org.ksefEnabled,
      hasToken: !!org.ksefToken,
      hasTaxId: !!org.taxId,
      country: org.country,
      isPolish: org.country === 'PL',
    };
  }),

  // Update organization KSeF settings
  updateSettings: orgProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        token: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // If enabling, validate requirements
      if (input.enabled) {
        if (!org.taxId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization NIP (tax ID) is required to enable KSeF',
          });
        }

        if (!input.token && !org.ksefToken) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'KSeF authorization token is required',
          });
        }
      }

      const updateData: any = {
        ksefEnabled: input.enabled,
      };

      if (input.token) {
        updateData.ksefToken = input.token;
      }

      await ctx.prisma.organization.update({
        where: { id: ctx.organizationId },
        data: updateData,
      });

      return { success: true };
    }),
});
