import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: 'CZK' | 'PLN' | 'EUR' = 'CZK',
  locale?: string
): string {
  const localeMap: Record<string, string> = {
    CZK: 'cs-CZ',
    PLN: 'pl-PL',
    EUR: 'de-DE',
  };

  return new Intl.NumberFormat(locale ?? localeMap[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // Convert from cents
}

export function formatDate(date: Date | string, locale = 'cs-CZ'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
