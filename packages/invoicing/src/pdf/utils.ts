import { format } from 'date-fns';
import { cs, pl, enUS } from 'date-fns/locale';
import type { Locale } from './translations';

const dateLocales = {
  cs: cs,
  pl: pl,
  en: enUS,
};

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: 'CZK' | 'PLN' | 'EUR',
  locale: Locale = 'cs'
): string {
  // Amount is in cents, convert to main unit
  const value = amount / 100;

  const formats: Record<string, Intl.NumberFormatOptions> = {
    CZK: { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 },
    PLN: { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 },
    EUR: { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 },
  };

  const localeMap: Record<Locale, string> = {
    cs: 'cs-CZ',
    pl: 'pl-PL',
    en: 'en-GB',
  };

  return new Intl.NumberFormat(localeMap[locale], formats[currency]).format(value);
}

/**
 * Format a date
 */
export function formatDate(date: Date, locale: Locale = 'cs'): string {
  const formatString = locale === 'en' ? 'dd/MM/yyyy' : 'dd.MM.yyyy';
  return format(date, formatString, { locale: dateLocales[locale] });
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value}%`;
}

/**
 * Format address as array of lines
 */
export function formatAddress(address?: {
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}): string[] {
  if (!address) return [];

  const lines: string[] = [];

  if (address.street) {
    lines.push(address.street);
  }

  if (address.city || address.zip) {
    const cityLine = [address.zip, address.city].filter(Boolean).join(' ');
    if (cityLine) lines.push(cityLine);
  }

  if (address.country) {
    lines.push(address.country);
  }

  return lines;
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(
  type: 'INVOICE' | 'PROFORMA' | 'CREDIT_NOTE',
  locale: Locale
): string {
  const labels: Record<typeof type, Record<Locale, string>> = {
    INVOICE: { cs: 'Faktura', pl: 'Faktura', en: 'Invoice' },
    PROFORMA: { cs: 'Proforma faktura', pl: 'Faktura proforma', en: 'Proforma Invoice' },
    CREDIT_NOTE: { cs: 'Dobropis', pl: 'Faktura korygująca', en: 'Credit Note' },
  };

  return labels[type][locale];
}
