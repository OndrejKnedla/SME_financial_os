import { prisma } from './client';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      emailVerified: true,
    },
  });
  console.log('Created demo user:', user.email);

  // Create a demo organization (Czech company)
  const orgCz = await prisma.organization.upsert({
    where: { id: 'demo-org-cz' },
    update: {},
    create: {
      id: 'demo-org-cz',
      name: 'Demo s.r.o.',
      taxId: '12345678',
      vatId: 'CZ12345678',
      country: 'CZ',
      currency: 'CZK',
      address: {
        street: 'Václavské náměstí 1',
        city: 'Praha',
        zip: '110 00',
        country: 'CZ',
      },
      invoicePrefix: 'INV',
      invoiceNumber: 1,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('Created Czech demo organization:', orgCz.name);

  // Create default categories
  const categories = [
    { name: 'Office Supplies', color: '#3b82f6', type: 'EXPENSE' as const },
    { name: 'Travel', color: '#10b981', type: 'EXPENSE' as const },
    { name: 'Software', color: '#8b5cf6', type: 'EXPENSE' as const },
    { name: 'Marketing', color: '#f59e0b', type: 'EXPENSE' as const },
    { name: 'Utilities', color: '#6366f1', type: 'EXPENSE' as const },
    { name: 'Services', color: '#22c55e', type: 'INCOME' as const },
    { name: 'Products', color: '#0ea5e9', type: 'INCOME' as const },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        organizationId_name_type: {
          organizationId: orgCz.id,
          name: cat.name,
          type: cat.type,
        },
      },
      update: {},
      create: {
        organizationId: orgCz.id,
        name: cat.name,
        color: cat.color,
        type: cat.type,
      },
    });
  }
  console.log('Created default categories');

  // Create demo contacts
  const contact1 = await prisma.contact.upsert({
    where: { id: 'demo-contact-1' },
    update: {},
    create: {
      id: 'demo-contact-1',
      organizationId: orgCz.id,
      type: 'COMPANY',
      name: 'Acme Corporation s.r.o.',
      email: 'info@acme.cz',
      phone: '+420 123 456 789',
      taxId: '87654321',
      vatId: 'CZ87654321',
      address: {
        street: 'Národní 1',
        city: 'Praha',
        zip: '110 00',
        country: 'CZ',
      },
      paymentTerms: 14,
    },
  });

  const contact2 = await prisma.contact.upsert({
    where: { id: 'demo-contact-2' },
    update: {},
    create: {
      id: 'demo-contact-2',
      organizationId: orgCz.id,
      type: 'COMPANY',
      name: 'TechStart s.r.o.',
      email: 'accounting@techstart.cz',
      phone: '+420 987 654 321',
      taxId: '11223344',
      vatId: 'CZ11223344',
      address: {
        street: 'Karlova 10',
        city: 'Brno',
        zip: '602 00',
        country: 'CZ',
      },
      paymentTerms: 30,
    },
  });
  console.log('Created demo contacts');

  // Create a demo bank account
  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: 'demo-bank-1' },
    update: {},
    create: {
      id: 'demo-bank-1',
      organizationId: orgCz.id,
      name: 'Main Account',
      bankName: 'Fio banka',
      accountNumber: 'CZ6520100000002000123456',
      currency: 'CZK',
      isDefault: true,
      isActive: true,
    },
  });
  console.log('Created demo bank account');

  // Create demo invoices
  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

  const invoice1 = await prisma.invoice.upsert({
    where: {
      organizationId_number: {
        organizationId: orgCz.id,
        number: 'INV-2026-0001',
      },
    },
    update: {},
    create: {
      organizationId: orgCz.id,
      contactId: contact1.id,
      number: 'INV-2026-0001',
      status: 'SENT',
      type: 'INVOICE',
      issueDate: now,
      dueDate: dueDate,
      subtotal: 1000000, // 10,000 CZK
      taxAmount: 210000, // 2,100 CZK (21% VAT)
      total: 1210000, // 12,100 CZK
      currency: 'CZK',
      bankAccountId: bankAccount.id,
      variableSymbol: '20260001',
      items: {
        create: [
          {
            description: 'Web Development Services',
            quantity: 40,
            unitPrice: 25000, // 250 CZK/hour
            taxRate: 21,
            totalNet: 1000000,
            totalTax: 210000,
            totalGross: 1210000,
            position: 0,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: {
      organizationId_number: {
        organizationId: orgCz.id,
        number: 'INV-2026-0002',
      },
    },
    update: {},
    create: {
      organizationId: orgCz.id,
      contactId: contact2.id,
      number: 'INV-2026-0002',
      status: 'DRAFT',
      type: 'INVOICE',
      issueDate: now,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 500000,
      taxAmount: 105000,
      total: 605000,
      currency: 'CZK',
      bankAccountId: bankAccount.id,
      variableSymbol: '20260002',
      items: {
        create: [
          {
            description: 'Consulting Services',
            quantity: 10,
            unitPrice: 50000,
            taxRate: 21,
            totalNet: 500000,
            totalTax: 105000,
            totalGross: 605000,
            position: 0,
          },
        ],
      },
    },
  });
  console.log('Created demo invoices');

  // Update organization invoice number
  await prisma.organization.update({
    where: { id: orgCz.id },
    data: { invoiceNumber: 3 },
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
