import { z } from 'zod';

// Base schemas
export const countrySchema = z.enum(['CZ', 'PL', 'SK']);
export const currencySchema = z.enum(['CZK', 'PLN', 'EUR']);
export const invoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
]);
export const invoiceTypeSchema = z.enum(['INVOICE', 'PROFORMA', 'CREDIT_NOTE']);
export const ksefStatusSchema = z.enum(['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR']);
export const memberRoleSchema = z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'MEMBER']);
export const contactTypeSchema = z.enum(['COMPANY', 'INDIVIDUAL']);
export const bankProviderSchema = z.enum(['FIO', 'POLISH_API', 'TINK', 'SALT_EDGE', 'MANUAL']);
export const paymentMethodSchema = z.enum(['BANK_TRANSFER', 'CARD', 'CASH', 'OTHER']);
export const expenseStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']);
export const ocrStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const categoryTypeSchema = z.enum(['INCOME', 'EXPENSE']);

// Address schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  country: countrySchema.default('CZ'),
  address: addressSchema.optional(),
  currency: currencySchema.default('CZK'),
  invoicePrefix: z.string().default('INV'),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// Contact schemas
export const createContactSchema = z.object({
  type: contactTypeSchema.default('COMPANY'),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  address: addressSchema.optional(),
  paymentTerms: z.number().int().min(0).max(365).default(14),
  currency: currencySchema.optional(),
});

export const updateContactSchema = createContactSchema.partial();

// Invoice item schema
export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().int().min(0), // cents
  taxRate: z.number().min(0).max(100),
});

// Invoice schemas
export const createInvoiceSchema = z.object({
  contactId: z.string().optional(),
  type: invoiceTypeSchema.default('INVOICE'),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  currency: currencySchema.default('CZK'),
  bankAccountId: z.string().optional(),
  variableSymbol: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// Bank account schemas
export const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  currency: currencySchema.default('CZK'),
  isDefault: z.boolean().default(false),
});

export const connectBankAccountSchema = z.object({
  provider: bankProviderSchema,
  accessToken: z.string().optional(),
  // Provider-specific fields
  fioToken: z.string().optional(),
});

// Expense schemas
export const createExpenseSchema = z.object({
  date: z.date(),
  amount: z.number().int().positive(),
  currency: currencySchema.default('CZK'),
  taxRate: z.number().min(0).max(100).optional(),
  vendorName: z.string().optional(),
  vendorTaxId: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// Pagination schema
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

// Date range filter schema
export const dateRangeSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// Type exports
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type ConnectBankAccountInput = z.infer<typeof connectBankAccountSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
