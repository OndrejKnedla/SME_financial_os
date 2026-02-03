import { z } from 'zod';
import { router, orgProcedure } from '../trpc';
import {
  createContactSchema,
  updateContactSchema,
  paginationSchema,
} from '@sme-financial-os/shared';
import { TRPCError } from '@trpc/server';

export const contactRouter = router({
  // List contacts with pagination and search
  list: orgProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        type: z.enum(['COMPANY', 'INDIVIDUAL']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, search, type } = input;

      const where = {
        organizationId: ctx.organizationId,
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { taxId: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const contacts = await ctx.prisma.contact.findMany({
        where,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { name: 'asc' },
      });

      let nextCursor: string | undefined;
      if (contacts.length > limit) {
        const nextItem = contacts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: contacts,
        nextCursor,
      };
    }),

  // Get single contact
  get: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const contact = await ctx.prisma.contact.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.organizationId,
      },
    });

    if (!contact) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
    }

    return contact;
  }),

  // Create contact
  create: orgProcedure.input(createContactSchema).mutation(async ({ ctx, input }) => {
    const contact = await ctx.prisma.contact.create({
      data: {
        ...input,
        organizationId: ctx.organizationId,
      },
    });

    return contact;
  }),

  // Update contact
  update: orgProcedure
    .input(z.object({ id: z.string() }).merge(updateContactSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify contact belongs to organization
      const existing = await ctx.prisma.contact.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
      }

      const contact = await ctx.prisma.contact.update({
        where: { id },
        data,
      });

      return contact;
    }),

  // Delete contact
  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // Verify contact belongs to organization
    const existing = await ctx.prisma.contact.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
    }

    await ctx.prisma.contact.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
