/**
 * Transform internal invoice model to FA(3) format for KSeF
 */

import type { FA3Invoice, FA3InvoiceItem, FA3VatRate, FA3VatBreakdown, FA3PaymentMethod, FA3Address } from './types';

// Input types (matching our Prisma models)
interface InvoiceInput {
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: 'CZK' | 'PLN' | 'EUR';
  subtotal: number; // in cents/grosze
  taxAmount: number;
  total: number;
  notes?: string | null;
  items: InvoiceItemInput[];
  contact: ContactInput | null;
  bankAccount?: BankAccountInput | null;
}

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number; // in cents/grosze
  taxRate: number; // e.g., 23 for 23%
  totalNet: number;
  totalTax: number;
  totalGross: number;
  position: number;
}

interface ContactInput {
  name: string;
  taxId?: string | null; // NIP
  vatId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  } | null;
}

interface OrganizationInput {
  name: string;
  taxId?: string | null; // NIP
  vatId?: string | null;
  address?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  } | null;
}

interface BankAccountInput {
  accountNumber: string;
  bankName: string;
}

// Map numeric VAT rate to FA(3) rate code
function mapVatRate(rate: number): FA3VatRate {
  switch (rate) {
    case 23:
      return '23';
    case 22:
      return '22';
    case 8:
      return '8';
    case 7:
      return '7';
    case 5:
      return '5';
    case 4:
      return '4';
    case 0:
      return '0';
    default:
      return '23'; // Default to standard rate
  }
}

// Parse address string to structured format
function parseAddress(address: { street?: string; city?: string; zip?: string; country?: string } | null | undefined): FA3Address {
  if (!address) {
    return {
      country: 'PL',
      city: 'Unknown',
      buildingNumber: '0',
      postalCode: '00-000',
    };
  }

  // Try to extract building number from street
  const streetParts = (address.street || '').match(/^(.+?)\s+(\d+[A-Za-z]?)(?:\/(\d+))?$/);
  const street = streetParts ? streetParts[1] : address.street;
  const buildingNumber = streetParts && streetParts[2] ? streetParts[2] : '0';
  const apartmentNumber = streetParts ? streetParts[3] : undefined;

  return {
    country: address.country || 'PL',
    city: address.city || 'Unknown',
    street,
    buildingNumber,
    apartmentNumber,
    postalCode: address.zip || '00-000',
  };
}

// Calculate VAT breakdown by rate
function calculateVatBreakdown(items: InvoiceItemInput[]): FA3VatBreakdown[] {
  const breakdown: Map<FA3VatRate, FA3VatBreakdown> = new Map();

  for (const item of items) {
    const rate = mapVatRate(item.taxRate);
    const existing = breakdown.get(rate);

    if (existing) {
      existing.netAmount += item.totalNet;
      existing.vatAmount += item.totalTax;
      existing.grossAmount += item.totalGross;
    } else {
      breakdown.set(rate, {
        vatRate: rate,
        netAmount: item.totalNet,
        vatAmount: item.totalTax,
        grossAmount: item.totalGross,
      });
    }
  }

  return Array.from(breakdown.values());
}

// Convert amount to Polish words (simplified)
function amountToPolishWords(grosze: number): string {
  const zloty = Math.floor(grosze / 100);
  const gr = grosze % 100;

  // Simplified version - in production, use a proper number-to-words library
  const zlWords = zloty === 1 ? 'złoty' : zloty < 5 ? 'złote' : 'złotych';
  const grWords = gr === 1 ? 'grosz' : gr < 5 ? 'grosze' : 'groszy';

  return `${zloty} ${zlWords} ${gr.toString().padStart(2, '0')}/100 ${grWords}`;
}

/**
 * Transform internal invoice to FA(3) format
 */
export function transformToFA3(
  invoice: InvoiceInput,
  seller: OrganizationInput
): FA3Invoice {
  // Validate required fields
  if (!seller.taxId) {
    throw new Error('Seller NIP is required for KSeF submission');
  }

  if (!invoice.contact?.taxId) {
    throw new Error('Buyer NIP is required for KSeF submission');
  }

  // Transform items
  const items: FA3InvoiceItem[] = invoice.items.map((item, index) => ({
    lineNumber: item.position || index + 1,
    description: item.description,
    quantity: Number(item.quantity),
    unit: 'szt.', // Default unit - could be configurable
    unitPrice: item.unitPrice,
    vatRate: mapVatRate(item.taxRate),
    netAmount: item.totalNet,
    vatAmount: item.totalTax,
    grossAmount: item.totalGross,
  }));

  // Calculate VAT breakdown
  const vatBreakdown = calculateVatBreakdown(invoice.items);

  // Build FA(3) invoice
  const fa3Invoice: FA3Invoice = {
    header: {
      invoiceType: 'VAT',
      formCode: 'FA',
      schemaVersion: '3',
      systemInfo: 'SME Financial OS v1.0',
    },
    seller: {
      nip: seller.taxId,
      name: seller.name,
      address: parseAddress(seller.address),
    },
    buyer: {
      nip: invoice.contact.taxId,
      name: invoice.contact.name,
      address: parseAddress(invoice.contact.address),
      email: invoice.contact.email || undefined,
      phone: invoice.contact.phone || undefined,
    },
    invoiceDate: invoice.issueDate,
    invoiceNumber: invoice.number,
    currency: invoice.currency === 'PLN' ? 'PLN' : 'EUR', // KSeF only supports PLN and some foreign currencies
    items,
    summary: {
      vatBreakdown,
      totalNet: invoice.subtotal,
      totalVat: invoice.taxAmount,
      totalGross: invoice.total,
      grossInWords: amountToPolishWords(invoice.total),
    },
    payment: {
      paymentMethod: '1', // Bank transfer
      dueDate: invoice.dueDate,
      bankAccount: invoice.bankAccount?.accountNumber,
      bankName: invoice.bankAccount?.bankName,
      remainingAmount: invoice.total,
    },
  };

  // Add annotations if needed
  if (invoice.notes) {
    fa3Invoice.annotations = {
      additionalInfo: invoice.notes,
    };
  }

  return fa3Invoice;
}

/**
 * Validate that an invoice is ready for KSeF submission
 */
export function validateForKSeF(invoice: InvoiceInput, seller: OrganizationInput): string[] {
  const errors: string[] = [];

  // Seller validation
  if (!seller.taxId) {
    errors.push('Seller NIP (tax ID) is required');
  } else if (!/^\d{10}$/.test(seller.taxId.replace(/[-\s]/g, ''))) {
    errors.push('Seller NIP must be a 10-digit number');
  }

  if (!seller.name) {
    errors.push('Seller name is required');
  }

  if (!seller.address?.city) {
    errors.push('Seller city is required');
  }

  // Buyer validation
  if (!invoice.contact) {
    errors.push('Buyer (contact) is required');
  } else {
    if (!invoice.contact.taxId) {
      errors.push('Buyer NIP (tax ID) is required');
    } else if (!/^\d{10}$/.test(invoice.contact.taxId.replace(/[-\s]/g, ''))) {
      errors.push('Buyer NIP must be a 10-digit number');
    }

    if (!invoice.contact.name) {
      errors.push('Buyer name is required');
    }
  }

  // Invoice validation
  if (!invoice.number) {
    errors.push('Invoice number is required');
  }

  if (!invoice.issueDate) {
    errors.push('Invoice date is required');
  }

  if (!invoice.items || invoice.items.length === 0) {
    errors.push('At least one invoice item is required');
  }

  // Currency validation (KSeF primarily supports PLN)
  if (invoice.currency !== 'PLN' && invoice.currency !== 'EUR') {
    errors.push('KSeF only supports PLN and EUR currencies');
  }

  return errors;
}
