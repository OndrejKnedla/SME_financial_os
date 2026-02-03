import { describe, it, expect } from 'vitest';
import {
  centsToDecimal,
  decimalToCents,
  calculateNetFromGross,
  calculateGrossFromNet,
  calculateTax,
  generateVariableSymbol,
  formatInvoiceNumber,
  getDefaultCurrency,
  getLocaleForCountry,
  validateCzechIco,
  validatePolishNip,
  addDays,
  isOverdue,
  daysUntilDue,
} from './utils';

describe('Currency Conversion', () => {
  describe('centsToDecimal', () => {
    it('converts cents to decimal correctly', () => {
      expect(centsToDecimal(100)).toBe(1);
      expect(centsToDecimal(1234)).toBe(12.34);
      expect(centsToDecimal(0)).toBe(0);
      expect(centsToDecimal(1)).toBe(0.01);
    });
  });

  describe('decimalToCents', () => {
    it('converts decimal to cents correctly', () => {
      expect(decimalToCents(1)).toBe(100);
      expect(decimalToCents(12.34)).toBe(1234);
      expect(decimalToCents(0)).toBe(0);
      expect(decimalToCents(0.01)).toBe(1);
    });

    it('rounds correctly', () => {
      expect(decimalToCents(12.345)).toBe(1235);
      expect(decimalToCents(12.344)).toBe(1234);
    });
  });
});

describe('Tax Calculations', () => {
  describe('calculateNetFromGross', () => {
    it('calculates net from gross with 21% VAT (Czech standard)', () => {
      expect(calculateNetFromGross(12100, 21)).toBe(10000);
    });

    it('calculates net from gross with 23% VAT (Polish standard)', () => {
      expect(calculateNetFromGross(12300, 23)).toBe(10000);
    });

    it('handles 0% tax rate', () => {
      expect(calculateNetFromGross(10000, 0)).toBe(10000);
    });
  });

  describe('calculateGrossFromNet', () => {
    it('calculates gross from net with 21% VAT (Czech standard)', () => {
      expect(calculateGrossFromNet(10000, 21)).toBe(12100);
    });

    it('calculates gross from net with 23% VAT (Polish standard)', () => {
      expect(calculateGrossFromNet(10000, 23)).toBe(12300);
    });

    it('handles 0% tax rate', () => {
      expect(calculateGrossFromNet(10000, 0)).toBe(10000);
    });
  });

  describe('calculateTax', () => {
    it('calculates tax with 21% rate', () => {
      expect(calculateTax(10000, 21)).toBe(2100);
    });

    it('calculates tax with 23% rate', () => {
      expect(calculateTax(10000, 23)).toBe(2300);
    });

    it('handles 0% tax rate', () => {
      expect(calculateTax(10000, 0)).toBe(0);
    });

    it('rounds correctly', () => {
      expect(calculateTax(1000, 15)).toBe(150);
    });
  });
});

describe('Invoice Utilities', () => {
  describe('generateVariableSymbol', () => {
    it('generates 10-digit variable symbol from invoice number', () => {
      expect(generateVariableSymbol('INV-2024-0001')).toBe('0020240001');
    });

    it('handles numeric-only input', () => {
      expect(generateVariableSymbol('20240001')).toBe('0020240001');
    });

    it('truncates to last 10 digits if longer', () => {
      expect(generateVariableSymbol('12345678901234567890')).toBe('1234567890');
    });

    it('pads with zeros if shorter', () => {
      expect(generateVariableSymbol('123')).toBe('0000000123');
    });
  });

  describe('formatInvoiceNumber', () => {
    it('formats invoice number correctly', () => {
      expect(formatInvoiceNumber('INV', 1, 2024)).toBe('INV-2024-0001');
    });

    it('pads number to 4 digits', () => {
      expect(formatInvoiceNumber('F', 42, 2024)).toBe('F-2024-0042');
    });

    it('uses current year if not provided', () => {
      const currentYear = new Date().getFullYear();
      expect(formatInvoiceNumber('INV', 1)).toBe(`INV-${currentYear}-0001`);
    });

    it('handles large numbers', () => {
      expect(formatInvoiceNumber('INV', 12345, 2024)).toBe('INV-2024-12345');
    });
  });
});

describe('Country/Currency Utilities', () => {
  describe('getDefaultCurrency', () => {
    it('returns CZK for Czech Republic', () => {
      expect(getDefaultCurrency('CZ')).toBe('CZK');
    });

    it('returns PLN for Poland', () => {
      expect(getDefaultCurrency('PL')).toBe('PLN');
    });

    it('returns EUR for Slovakia', () => {
      expect(getDefaultCurrency('SK')).toBe('EUR');
    });
  });

  describe('getLocaleForCountry', () => {
    it('returns cs-CZ for Czech Republic', () => {
      expect(getLocaleForCountry('CZ')).toBe('cs-CZ');
    });

    it('returns pl-PL for Poland', () => {
      expect(getLocaleForCountry('PL')).toBe('pl-PL');
    });

    it('returns sk-SK for Slovakia', () => {
      expect(getLocaleForCountry('SK')).toBe('sk-SK');
    });
  });
});

describe('Tax ID Validation', () => {
  describe('validateCzechIco', () => {
    it('validates correct Czech IČO', () => {
      expect(validateCzechIco('27082440')).toBe(true); // Valid IČO
      expect(validateCzechIco('25596641')).toBe(true); // Valid IČO
    });

    it('rejects invalid Czech IČO', () => {
      expect(validateCzechIco('12345678')).toBe(false); // Invalid checksum
      expect(validateCzechIco('1234567')).toBe(false); // Too short
      expect(validateCzechIco('123456789')).toBe(false); // Too long
      expect(validateCzechIco('1234567a')).toBe(false); // Non-numeric
    });
  });

  describe('validatePolishNip', () => {
    it('validates correct Polish NIP', () => {
      expect(validatePolishNip('5260250995')).toBe(true); // Valid NIP
      expect(validatePolishNip('526-025-09-95')).toBe(true); // With dashes
    });

    it('rejects invalid Polish NIP', () => {
      expect(validatePolishNip('1234567890')).toBe(false); // Invalid checksum
      expect(validatePolishNip('123456789')).toBe(false); // Too short
      expect(validatePolishNip('12345678901')).toBe(false); // Too long
      expect(validatePolishNip('123456789a')).toBe(false); // Non-numeric
    });
  });
});

describe('Date Utilities', () => {
  describe('addDays', () => {
    it('adds days to a date', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 14);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('handles month boundary', () => {
      const date = new Date('2024-01-25');
      const result = addDays(date, 14);
      expect(result.toISOString().split('T')[0]).toBe('2024-02-08');
    });

    it('does not mutate original date', () => {
      const date = new Date('2024-01-01');
      addDays(date, 14);
      expect(date.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('handles negative days', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -14);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
    });
  });

  describe('isOverdue', () => {
    it('returns true for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('returns false for future date', () => {
      const futureDate = new Date('2030-01-01');
      expect(isOverdue(futureDate)).toBe(false);
    });
  });

  describe('daysUntilDue', () => {
    it('returns positive number for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(daysUntilDue(futureDate)).toBe(7);
    });

    it('returns negative number for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      expect(daysUntilDue(pastDate)).toBe(-7);
    });

    it('returns 0 for today', () => {
      const today = new Date();
      expect(daysUntilDue(today)).toBe(0);
    });
  });
});
