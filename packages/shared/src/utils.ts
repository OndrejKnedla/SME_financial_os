import type { Currency, Country } from './types';

/**
 * Convert amount from cents to decimal
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Convert amount from decimal to cents
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

/**
 * Calculate net amount from gross and tax rate
 */
export function calculateNetFromGross(gross: number, taxRate: number): number {
  return Math.round(gross / (1 + taxRate / 100));
}

/**
 * Calculate gross amount from net and tax rate
 */
export function calculateGrossFromNet(net: number, taxRate: number): number {
  return Math.round(net * (1 + taxRate / 100));
}

/**
 * Calculate tax amount from net and tax rate
 */
export function calculateTax(net: number, taxRate: number): number {
  return Math.round(net * (taxRate / 100));
}

/**
 * Generate a variable symbol from invoice number (Czech/Slovak banking)
 */
export function generateVariableSymbol(invoiceNumber: string): string {
  // Remove non-numeric characters and take last 10 digits
  const numericOnly = invoiceNumber.replace(/\D/g, '');
  return numericOnly.slice(-10).padStart(10, '0');
}

/**
 * Format invoice number with prefix
 */
export function formatInvoiceNumber(prefix: string, number: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `${prefix}-${y}-${number.toString().padStart(4, '0')}`;
}

/**
 * Get default currency for country
 */
export function getDefaultCurrency(country: Country): Currency {
  const currencyMap: Record<Country, Currency> = {
    CZ: 'CZK',
    PL: 'PLN',
    SK: 'EUR',
  };
  return currencyMap[country];
}

/**
 * Get locale for country
 */
export function getLocaleForCountry(country: Country): string {
  const localeMap: Record<Country, string> = {
    CZ: 'cs-CZ',
    PL: 'pl-PL',
    SK: 'sk-SK',
  };
  return localeMap[country];
}

/**
 * Validate Czech IČO (company ID)
 */
export function validateCzechIco(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i]!, 10) * weights[i]!;
  }

  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder;

  return checkDigit === parseInt(ico[7]!, 10);
}

/**
 * Validate Polish NIP (tax ID)
 */
export function validatePolishNip(nip: string): boolean {
  const cleanNip = nip.replace(/[-\s]/g, '');
  if (!/^\d{10}$/.test(cleanNip)) return false;

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i]!, 10) * weights[i]!;
  }

  const checkDigit = sum % 11;
  return checkDigit === parseInt(cleanNip[9]!, 10);
}

/**
 * Generate CUID-like ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}`;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if invoice is overdue
 */
export function isOverdue(dueDate: Date): boolean {
  return new Date() > new Date(dueDate);
}

/**
 * Calculate days until due or days overdue
 */
export function daysUntilDue(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
