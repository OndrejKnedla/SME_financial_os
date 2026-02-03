import { z } from 'zod';
import { router, protectedProcedure, orgProcedure } from '../trpc';
import { createOrganizationSchema, updateOrganizationSchema } from '@sme-financial-os/shared';
import { TRPCError } from '@trpc/server';

export const organizationRouter = router({
  // List user's organizations
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        organization: true,
      },
      orderBy: { organization: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }),

  // Get current organization
  get: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
    });

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    return org;
  }),

  // Create organization
  create: protectedProcedure.input(createOrganizationSchema).mutation(async ({ ctx, input }) => {
    const org = await ctx.prisma.organization.create({
      data: {
        ...input,
        members: {
          create: {
            userId: ctx.user.id,
            role: 'OWNER',
          },
        },
      },
    });

    return org;
  }),

  // Update organization
  update: orgProcedure.input(updateOrganizationSchema).mutation(async ({ ctx, input }) => {
    // Check if user is admin or owner
    // orgProcedure guarantees user is not null
    const userId = ctx.user!.id;
    const membership = await ctx.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId,
        },
      },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
    }

    const org = await ctx.prisma.organization.update({
      where: { id: ctx.organizationId },
      data: input,
    });

    return org;
  }),

  // Get next invoice number
  getNextInvoiceNumber: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { invoicePrefix: true, invoiceNumber: true },
    });

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    const year = new Date().getFullYear();
    const number = org.invoiceNumber.toString().padStart(4, '0');
    return {
      prefix: org.invoicePrefix,
      number: org.invoiceNumber,
      formatted: `${org.invoicePrefix}-${year}-${number}`,
    };
  }),
});
