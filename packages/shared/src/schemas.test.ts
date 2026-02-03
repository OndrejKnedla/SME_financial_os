import { describe, it, expect } from 'vitest';
import {
  countrySchema,
  currencySchema,
  invoiceStatusSchema,
  createOrganizationSchema,
  createContactSchema,
  createInvoiceSchema,
  invoiceItemSchema,
  createExpenseSchema,
  paginationSchema,
  addressSchema,
} from './schemas';

describe('Enum Schemas', () => {
  describe('countrySchema', () => {
    it('accepts valid countries', () => {
      expect(countrySchema.parse('CZ')).toBe('CZ');
      expect(countrySchema.parse('PL')).toBe('PL');
      expect(countrySchema.parse('SK')).toBe('SK');
    });

    it('rejects invalid countries', () => {
      expect(() => countrySchema.parse('US')).toThrow();
      expect(() => countrySchema.parse('DE')).toThrow();
    });
  });

  describe('currencySchema', () => {
    it('accepts valid currencies', () => {
      expect(currencySchema.parse('CZK')).toBe('CZK');
      expect(currencySchema.parse('PLN')).toBe('PLN');
      expect(currencySchema.parse('EUR')).toBe('EUR');
    });

    it('rejects invalid currencies', () => {
      expect(() => currencySchema.parse('USD')).toThrow();
      expect(() => currencySchema.parse('GBP')).toThrow();
    });
  });

  describe('invoiceStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(invoiceStatusSchema.parse('DRAFT')).toBe('DRAFT');
      expect(invoiceStatusSchema.parse('SENT')).toBe('SENT');
      expect(invoiceStatusSchema.parse('PAID')).toBe('PAID');
      expect(invoiceStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
    });
  });
});

describe('Address Schema', () => {
  it('accepts valid address', () => {
    const address = {
      street: 'Test Street 123',
      city: 'Prague',
      zip: '110 00',
      country: 'CZ',
    };
    expect(addressSchema.parse(address)).toEqual(address);
  });

  it('accepts partial address', () => {
    const address = { city: 'Prague' };
    expect(addressSchema.parse(address)).toEqual(address);
  });

  it('accepts empty object', () => {
    expect(addressSchema.parse({})).toEqual({});
  });
});

describe('Organization Schema', () => {
  describe('createOrganizationSchema', () => {
    it('accepts valid organization with minimal data', () => {
      const org = { name: 'Test Company' };
      const result = createOrganizationSchema.parse(org);
      expect(result.name).toBe('Test Company');
      expect(result.country).toBe('CZ'); // default
      expect(result.currency).toBe('CZK'); // default
      expect(result.invoicePrefix).toBe('INV'); // default
    });

    it('accepts valid organization with all fields', () => {
      const org = {
        name: 'Test Company s.r.o.',
        taxId: '12345678',
        vatId: 'CZ12345678',
        country: 'CZ' as const,
        address: {
          street: 'Test Street 123',
          city: 'Prague',
          zip: '110 00',
        },
        currency: 'CZK' as const,
        invoicePrefix: 'FAK',
      };
      const result = createOrganizationSchema.parse(org);
      expect(result).toEqual(org);
    });

    it('rejects organization without name', () => {
      expect(() => createOrganizationSchema.parse({})).toThrow();
    });

    it('rejects organization with empty name', () => {
      expect(() => createOrganizationSchema.parse({ name: '' })).toThrow();
    });
  });
});

describe('Contact Schema', () => {
  describe('createContactSchema', () => {
    it('accepts valid contact with minimal data', () => {
      const contact = { name: 'Test Contact' };
      const result = createContactSchema.parse(contact);
      expect(result.name).toBe('Test Contact');
      expect(result.type).toBe('COMPANY'); // default
      expect(result.paymentTerms).toBe(14); // default
    });

    it('accepts valid contact with all fields', () => {
      const contact = {
        type: 'COMPANY' as const,
        name: 'Test Company',
        email: 'test@example.com',
        phone: '+420123456789',
        taxId: '12345678',
        vatId: 'CZ12345678',
        address: {
          street: 'Test Street',
          city: 'Prague',
        },
        paymentTerms: 30,
        currency: 'CZK' as const,
      };
      const result = createContactSchema.parse(contact);
      expect(result).toEqual(contact);
    });

    it('accepts contact with empty email', () => {
      const contact = { name: 'Test', email: '' };
      const result = createContactSchema.parse(contact);
      expect(result.email).toBe('');
    });

    it('rejects invalid email', () => {
      const contact = { name: 'Test', email: 'invalid-email' };
      expect(() => createContactSchema.parse(contact)).toThrow();
    });

    it('rejects payment terms > 365', () => {
      const contact = { name: 'Test', paymentTerms: 400 };
      expect(() => createContactSchema.parse(contact)).toThrow();
    });
  });
});

describe('Invoice Schema', () => {
  describe('invoiceItemSchema', () => {
    it('accepts valid invoice item', () => {
      const item = {
        description: 'Web development',
        quantity: 10,
        unitPrice: 100000, // 1000.00 in cents
        taxRate: 21,
      };
      expect(invoiceItemSchema.parse(item)).toEqual(item);
    });

    it('rejects item without description', () => {
      const item = {
        description: '',
        quantity: 1,
        unitPrice: 1000,
        taxRate: 21,
      };
      expect(() => invoiceItemSchema.parse(item)).toThrow();
    });

    it('rejects item with negative quantity', () => {
      const item = {
        description: 'Test',
        quantity: -1,
        unitPrice: 1000,
        taxRate: 21,
      };
      expect(() => invoiceItemSchema.parse(item)).toThrow();
    });

    it('rejects item with tax rate > 100', () => {
      const item = {
        description: 'Test',
        quantity: 1,
        unitPrice: 1000,
        taxRate: 150,
      };
      expect(() => invoiceItemSchema.parse(item)).toThrow();
    });
  });

  describe('createInvoiceSchema', () => {
    it('accepts valid invoice', () => {
      const invoice = {
        dueDate: new Date('2024-12-31'),
        items: [
          {
            description: 'Web development',
            quantity: 10,
            unitPrice: 100000,
            taxRate: 21,
          },
        ],
      };
      const result = createInvoiceSchema.parse(invoice);
      expect(result.items).toHaveLength(1);
      expect(result.type).toBe('INVOICE'); // default
      expect(result.currency).toBe('CZK'); // default
    });

    it('accepts invoice with all fields', () => {
      const invoice = {
        contactId: 'contact-123',
        type: 'INVOICE' as const,
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        items: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 50000,
            taxRate: 21,
          },
        ],
        currency: 'PLN' as const,
        bankAccountId: 'bank-123',
        variableSymbol: '1234567890',
        notes: 'Thank you for your business',
        internalNotes: 'Internal note',
      };
      const result = createInvoiceSchema.parse(invoice);
      expect(result.contactId).toBe('contact-123');
      expect(result.currency).toBe('PLN');
    });

    it('rejects invoice without items', () => {
      const invoice = {
        dueDate: new Date('2024-12-31'),
        items: [],
      };
      expect(() => createInvoiceSchema.parse(invoice)).toThrow();
    });

    it('rejects invoice without due date', () => {
      const invoice = {
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 21,
          },
        ],
      };
      expect(() => createInvoiceSchema.parse(invoice)).toThrow();
    });
  });
});

describe('Expense Schema', () => {
  describe('createExpenseSchema', () => {
    it('accepts valid expense', () => {
      const expense = {
        date: new Date('2024-01-15'),
        amount: 10000, // 100.00 in cents
      };
      const result = createExpenseSchema.parse(expense);
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('CZK'); // default
    });

    it('accepts expense with all fields', () => {
      const expense = {
        date: new Date('2024-01-15'),
        amount: 10000,
        currency: 'PLN' as const,
        taxRate: 23,
        vendorName: 'Test Vendor',
        vendorTaxId: '1234567890',
        description: 'Office supplies',
        categoryId: 'cat-123',
      };
      const result = createExpenseSchema.parse(expense);
      expect(result.vendorName).toBe('Test Vendor');
    });

    it('rejects expense with zero amount', () => {
      const expense = {
        date: new Date(),
        amount: 0,
      };
      expect(() => createExpenseSchema.parse(expense)).toThrow();
    });

    it('rejects expense with negative amount', () => {
      const expense = {
        date: new Date(),
        amount: -100,
      };
      expect(() => createExpenseSchema.parse(expense)).toThrow();
    });

    it('rejects expense without date', () => {
      const expense = {
        amount: 1000,
      };
      expect(() => createExpenseSchema.parse(expense)).toThrow();
    });
  });
});

describe('Pagination Schema', () => {
  describe('paginationSchema', () => {
    it('accepts valid pagination', () => {
      const pagination = {
        cursor: 'abc123',
        limit: 50,
      };
      expect(paginationSchema.parse(pagination)).toEqual(pagination);
    });

    it('applies default limit', () => {
      const result = paginationSchema.parse({});
      expect(result.limit).toBe(20);
    });

    it('rejects limit > 100', () => {
      expect(() => paginationSchema.parse({ limit: 150 })).toThrow();
    });

    it('rejects limit < 1', () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    });
  });
});
