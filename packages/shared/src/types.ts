// Country and currency enums matching Prisma schema
export type Country = 'CZ' | 'PL' | 'SK';
export type Currency = 'CZK' | 'PLN' | 'EUR';

// Invoice status
export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type InvoiceType = 'INVOICE' | 'PROFORMA' | 'CREDIT_NOTE';

// KSeF status for Poland
export type KsefStatus = 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'ERROR';

// Member roles
export type MemberRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER';

// Contact types
export type ContactType = 'COMPANY' | 'INDIVIDUAL';

// Bank providers
export type BankProvider = 'FIO' | 'POLISH_API' | 'TINK' | 'SALT_EDGE' | 'MANUAL';

// Payment methods
export type PaymentMethod = 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

// Expense status
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

// OCR status
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Category types
export type CategoryType = 'INCOME' | 'EXPENSE';

// Address type
export type Address = {
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
};

// VAT rates by country
export const VAT_RATES: Record<Country, number[]> = {
  CZ: [21, 15, 10, 0],
  PL: [23, 8, 5, 0],
  SK: [20, 10, 0],
};

// Default VAT rate by country
export const DEFAULT_VAT_RATE: Record<Country, number> = {
  CZ: 21,
  PL: 23,
  SK: 20,
};
