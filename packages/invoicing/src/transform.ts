import type { InvoiceData, InvoiceItem, InvoiceAddress } from './pdf/types';
import type { Locale } from './pdf/translations';

// Transform Prisma address JSON to InvoiceAddress
function transformAddress(address: unknown): InvoiceAddress | undefined {
  if (!address || typeof address !== 'object') return undefined;

  const addr = address as Record<string, unknown>;
  return {
    street: typeof addr['street'] === 'string' ? addr['street'] : undefined,
    city: typeof addr['city'] === 'string' ? addr['city'] : undefined,
    zip: typeof addr['zip'] === 'string' ? addr['zip'] : undefined,
    country: typeof addr['country'] === 'string' ? addr['country'] : undefined,
  };
}

// Get locale from country code
function getLocaleFromCountry(country: string): Locale {
  switch (country) {
    case 'PL':
      return 'pl';
    case 'CZ':
    case 'SK':
      return 'cs';
    default:
      return 'en';
  }
}

interface DbInvoice {
  number: string;
  type: 'INVOICE' | 'PROFORMA' | 'CREDIT_NOTE';
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: 'CZK' | 'PLN' | 'EUR';
  variableSymbol?: string | null;
  notes?: string | null;
  ksefId?: string | null;
  items: Array<{
    description: string;
    quantity: number | { toNumber(): number };
    unitPrice: number;
    taxRate: number | { toNumber(): number };
    totalNet: number;
    totalTax: number;
    totalGross: number;
  }>;
  contact?: {
    name: string;
    taxId?: string | null;
    vatId?: string | null;
    address?: unknown;
    email?: string | null;
  } | null;
  bankAccount?: {
    name: string;
    bankName: string;
    accountNumber: string;
  } | null;
  organization: {
    name: string;
    taxId?: string | null;
    vatId?: string | null;
    address?: unknown;
    country: string;
    logoUrl?: string | null;
  };
}

/**
 * Transform a database invoice to InvoiceData for PDF generation
 */
export function transformInvoiceToData(invoice: DbInvoice): InvoiceData {
  const locale = getLocaleFromCountry(invoice.organization.country);

  // Transform items, handling Prisma Decimal types
  const items: InvoiceItem[] = invoice.items.map((item) => ({
    description: item.description,
    quantity: typeof item.quantity === 'number' ? item.quantity : item.quantity.toNumber(),
    unitPrice: item.unitPrice,
    taxRate: typeof item.taxRate === 'number' ? item.taxRate : item.taxRate.toNumber(),
    totalNet: item.totalNet,
    totalTax: item.totalTax,
    totalGross: item.totalGross,
  }));

  return {
    number: invoice.number,
    type: invoice.type,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,

    seller: {
      name: invoice.organization.name,
      taxId: invoice.organization.taxId ?? undefined,
      vatId: invoice.organization.vatId ?? undefined,
      address: transformAddress(invoice.organization.address),
      logoUrl: invoice.organization.logoUrl ?? undefined,
    },

    buyer: {
      name: invoice.contact?.name ?? 'Unknown Customer',
      taxId: invoice.contact?.taxId ?? undefined,
      vatId: invoice.contact?.vatId ?? undefined,
      address: transformAddress(invoice.contact?.address),
      email: invoice.contact?.email ?? undefined,
    },

    items,

    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,

    bankAccount: invoice.bankAccount
      ? {
          name: invoice.bankAccount.name,
          bankName: invoice.bankAccount.bankName,
          accountNumber: invoice.bankAccount.accountNumber,
        }
      : undefined,
    variableSymbol: invoice.variableSymbol ?? undefined,

    notes: invoice.notes ?? undefined,
    ksefId: invoice.ksefId ?? undefined,

    locale,
  };
}
