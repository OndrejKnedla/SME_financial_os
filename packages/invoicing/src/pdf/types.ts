// Types for invoice PDF generation

export interface InvoiceAddress {
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

export interface InvoiceCompany {
  name: string;
  taxId?: string;
  vatId?: string;
  address?: InvoiceAddress;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

export interface InvoiceContact {
  name: string;
  taxId?: string;
  vatId?: string;
  address?: InvoiceAddress;
  email?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  taxRate: number;
  totalNet: number;
  totalTax: number;
  totalGross: number;
}

export interface InvoiceBankAccount {
  name: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swift?: string;
}

export interface InvoiceData {
  // Invoice details
  number: string;
  type: 'INVOICE' | 'PROFORMA' | 'CREDIT_NOTE';
  issueDate: Date;
  dueDate: Date;

  // Parties
  seller: InvoiceCompany;
  buyer: InvoiceContact;

  // Items
  items: InvoiceItem[];

  // Totals (in cents)
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: 'CZK' | 'PLN' | 'EUR';

  // Payment
  bankAccount?: InvoiceBankAccount;
  variableSymbol?: string;

  // Notes
  notes?: string;

  // KSeF (Poland)
  ksefId?: string;

  // Locale
  locale: 'cs' | 'pl' | 'en';
}

export interface PDFGeneratorOptions {
  locale?: 'cs' | 'pl' | 'en';
  showLogo?: boolean;
  showQrCode?: boolean;
}
