/**
 * KSeF (Krajowy System e-Faktur) - Polish National e-Invoice System
 * Types based on FA(3) schema for structured invoices
 */

// KSeF Environment
export type KSeFEnvironment = 'production' | 'test' | 'demo';

// KSeF Session Types
export interface KSeFSession {
  sessionToken: string;
  referenceNumber: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface KSeFAuthRequest {
  nip: string; // Polish tax ID (NIP)
  token: string; // Authorization token from KSeF portal
}

// Invoice Submission
export interface KSeFInvoiceSubmission {
  invoiceHash: string;
  invoiceXml: string;
}

export interface KSeFInvoiceResponse {
  referenceNumber: string; // KSeF reference number (unique invoice ID in system)
  ksefReferenceNumber: string; // Full KSeF reference
  acquisitionTimestamp: Date;
  status: KSeFInvoiceStatus;
}

export type KSeFInvoiceStatus =
  | 'PENDING' // Waiting for processing
  | 'PROCESSING' // Being validated
  | 'ACCEPTED' // Successfully registered in KSeF
  | 'REJECTED' // Validation failed
  | 'ERROR'; // System error

// UPO (Urzędowe Poświadczenie Odbioru) - Official Receipt Confirmation
export interface KSeFUPO {
  referenceNumber: string;
  ksefReferenceNumber: string;
  timestamp: Date;
  invoiceHash: string;
  upoXml: string;
  upoPdf?: Buffer;
}

// FA(3) Invoice Structure (simplified)
export interface FA3Invoice {
  header: FA3Header;
  seller: FA3Party;
  buyer: FA3Party;
  invoiceDate: Date;
  salesDate?: Date;
  invoiceNumber: string;
  currency: 'PLN' | 'EUR' | 'USD' | 'GBP';
  items: FA3InvoiceItem[];
  summary: FA3Summary;
  payment?: FA3Payment;
  annotations?: FA3Annotations;
}

export interface FA3Header {
  // Rodzaj faktury
  invoiceType: FA3InvoiceType;
  formCode: 'FA'; // Always FA for standard invoice
  schemaVersion: '3'; // FA(3) version
  systemInfo: string;
}

export type FA3InvoiceType =
  | 'VAT' // Standard VAT invoice
  | 'KOR' // Correction invoice
  | 'ZAL' // Advance payment invoice
  | 'ROZ' // Settlement invoice
  | 'UPR' // Simplified invoice
  | 'KOR_ZAL' // Correction to advance
  | 'KOR_ROZ'; // Correction to settlement

export interface FA3Party {
  // Dane identyfikacyjne
  nip?: string; // Polish NIP
  nipEU?: string; // EU VAT ID (for EU companies)
  name: string;
  tradeName?: string; // Trading name if different

  // Address
  address: FA3Address;

  // Contact (optional)
  email?: string;
  phone?: string;
}

export interface FA3Address {
  country: string; // ISO 3166-1 alpha-2 code
  voivodeship?: string; // Polish województwo
  county?: string; // Polish powiat
  municipality?: string; // Polish gmina
  city: string;
  street?: string;
  buildingNumber: string;
  apartmentNumber?: string;
  postalCode: string;
}

export interface FA3InvoiceItem {
  lineNumber: number;
  description: string;

  // Classification (optional)
  pkwiuCode?: string; // Polish PKWiU code
  gtuCode?: string; // GTU code (for specific goods/services)
  cnCode?: string; // CN code for customs

  // Quantity and unit
  quantity: number;
  unit: string;
  unitPrice: number; // Net price per unit in grosze (1/100 PLN)

  // VAT
  vatRate: FA3VatRate;

  // Amounts (all in grosze)
  netAmount: number;
  vatAmount: number;
  grossAmount: number;

  // Discounts
  discountPercent?: number;
  discountAmount?: number;
}

export type FA3VatRate =
  | '23' // Standard rate
  | '22' // Old standard rate
  | '8' // Reduced rate
  | '7' // Old reduced rate
  | '5' // Super-reduced rate
  | '4' // Old super-reduced
  | '0' // Zero rate
  | 'zw' // Exempt (zwolniona)
  | 'np' // Not subject to VAT (nie podlega)
  | 'oo'; // Reverse charge (odwrotne obciążenie)

export interface FA3Summary {
  // Totals by VAT rate
  vatBreakdown: FA3VatBreakdown[];

  // Total amounts (in grosze)
  totalNet: number;
  totalVat: number;
  totalGross: number;

  // Amount in words (Polish)
  grossInWords?: string;
}

export interface FA3VatBreakdown {
  vatRate: FA3VatRate;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface FA3Payment {
  // Payment terms
  paymentMethod: FA3PaymentMethod;
  dueDate: Date;

  // Bank details
  bankAccount?: string; // IBAN
  bankName?: string;

  // Paid amount (if partial payment)
  paidAmount?: number;
  remainingAmount?: number;
}

export type FA3PaymentMethod =
  | '1' // Transfer (przelew)
  | '2' // Cash (gotówka)
  | '3' // Card (karta)
  | '4' // Cheque (czek)
  | '5' // Compensation (kompensata)
  | '6' // Other (inny);

export interface FA3Annotations {
  // Special transaction markers (P_*)
  selfBilling?: boolean; // P_16 - samofakturowanie
  reverseCharge?: boolean; // P_17 - odwrotne obciążenie
  splitPayment?: boolean; // P_18 - mechanizm podzielonej płatności
  marginScheme?: boolean; // P_19 - procedura marży

  // Other annotations
  additionalInfo?: string;
  relatedInvoice?: string; // For corrections
}

// API Error types
export interface KSeFError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

export class KSeFApiError extends Error {
  code: string;
  details?: string;

  constructor(error: KSeFError) {
    super(error.message);
    this.name = 'KSeFApiError';
    this.code = error.code;
    this.details = error.details;
  }
}
