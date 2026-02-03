/**
 * OCR Types for Receipt and Invoice Processing
 */

import { z } from 'zod';

// Supported document types
export type DocumentType = 'receipt' | 'invoice' | 'unknown';

// Supported currencies
export type Currency = 'CZK' | 'PLN' | 'EUR' | 'USD';

// Extracted line item
export interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  vatRate?: number;
}

// Extracted vendor information
export interface ExtractedVendor {
  name: string;
  taxId?: string; // IČO/NIP
  vatId?: string; // DIČ/VAT
  address?: string;
  phone?: string;
  email?: string;
}

// Extracted payment information
export interface ExtractedPayment {
  method?: 'cash' | 'card' | 'transfer' | 'other';
  cardLast4?: string;
  bankAccount?: string;
}

// Main extraction result
export interface ExtractionResult {
  success: boolean;
  confidence: number; // 0-1
  documentType: DocumentType;

  // Core data
  date?: Date;
  invoiceNumber?: string;

  // Amounts (in smallest currency unit - cents/haléře/grosze)
  subtotal?: number;
  vatAmount?: number;
  total: number;
  currency: Currency;

  // Vendor
  vendor?: ExtractedVendor;

  // Line items
  items: ExtractedLineItem[];

  // Payment
  payment?: ExtractedPayment;

  // VAT breakdown
  vatBreakdown?: {
    rate: number;
    base: number;
    amount: number;
  }[];

  // Raw text for reference
  rawText?: string;

  // Warnings/notes
  warnings: string[];
}

// Zod schema for validation
export const extractedExpenseSchema = z.object({
  date: z.coerce.date(),
  amount: z.number().positive(),
  currency: z.enum(['CZK', 'PLN', 'EUR', 'USD']),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().optional(),
  vendorName: z.string().min(1),
  vendorTaxId: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export type ExtractedExpense = z.infer<typeof extractedExpenseSchema>;

// Processing options
export interface ProcessingOptions {
  language?: 'cs' | 'pl' | 'en' | 'auto';
  expectedCurrency?: Currency;
  extractLineItems?: boolean;
  maxTokens?: number;
}

// Error types
export class OCRError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OCRError';
    this.code = code;
  }
}

export class ExtractionError extends OCRError {
  constructor(message: string) {
    super(message, 'EXTRACTION_FAILED');
  }
}

export class UnsupportedFormatError extends OCRError {
  constructor(format: string) {
    super(`Unsupported file format: ${format}`, 'UNSUPPORTED_FORMAT');
  }
}
