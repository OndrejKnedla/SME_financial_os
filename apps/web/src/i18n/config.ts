export const locales = ['en', 'cs', 'pl'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
  pl: 'Polski',
};

export const localeCurrencies: Record<Locale, 'CZK' | 'PLN' | 'EUR'> = {
  en: 'EUR',
  cs: 'CZK',
  pl: 'PLN',
};

export const localeVatRates: Record<Locale, number[]> = {
  en: [0, 5, 10, 20], // Generic EU rates
  cs: [0, 10, 15, 21], // Czech VAT rates
  pl: [0, 5, 8, 23], // Polish VAT rates
};
