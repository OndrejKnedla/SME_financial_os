# SME Financial OS - Project Specification for Claude Code

## 🎯 Mission
Build an all-in-one financial platform for SMEs (2-50 employees) in Czech Republic and Poland, combining invoicing, bank integration, expense management, and cash flow insights. Think "Aspire for CEE" or "Mercury for European SMEs".

## 🚀 Why This Project Matters
1. **Poland KSeF mandate** - From April 2026, ALL Polish businesses must use electronic invoicing via KSeF. Millions of SMEs need solutions NOW.
2. **Market size** - Poland: 2.5M SMEs, €250-300M accounting software market. Czech: 1.1M SMEs, €300M market.
3. **Gap in market** - No modern, integrated platform exists for CEE SMEs combining invoicing + banking + expenses.

---

## 📁 Project Structure

```
sme-financial-os/
├── CLAUDE.md                 # This file - main spec
├── apps/
│   ├── web/                  # Next.js 14 web application
│   │   ├── app/              # App router
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities
│   └── mobile/               # React Native (Phase 2)
├── packages/
│   ├── api/                  # tRPC API layer
│   ├── db/                   # Prisma schema + migrations
│   ├── shared/               # Shared types, utils
│   ├── ocr/                  # Document OCR (Claude Vision)
│   ├── banking/              # Bank integrations
│   │   ├── fio/              # Fio Banka API
│   │   ├── polish-api/       # PolishAPI standard
│   │   └── aggregator/       # Tink/Salt Edge wrapper
│   ├── invoicing/            # Invoice generation
│   │   ├── templates/        # Invoice templates
│   │   ├── pdf/              # PDF generation
│   │   └── ksef/             # Poland KSeF integration
│   └── accounting/           # Accounting logic
│       ├── vat/              # VAT calculations (CZ/PL)
│       └── reports/          # Financial reports
├── infrastructure/
│   ├── docker/               # Docker configs
│   └── terraform/            # Infrastructure as code
└── docs/
    ├── api/                  # API documentation
    ├── architecture/         # System design docs
    └── user-guides/          # End-user documentation
```

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Tables**: TanStack Table

### Backend
- **API**: tRPC v11
- **Database**: PostgreSQL 16 (Neon or Supabase)
- **ORM**: Prisma 5
- **Auth**: Better Auth or Lucia
- **Queue**: BullMQ + Redis
- **File Storage**: Cloudflare R2

### Infrastructure
- **Hosting**: Vercel (web) + Railway (API workers)
- **CDN**: Cloudflare
- **Monitoring**: Sentry + Axiom
- **CI/CD**: GitHub Actions

### External Services
- **OCR**: Claude Vision API (Anthropic)
- **Banking**: Fio API, PolishAPI, Tink/Salt Edge
- **PDF**: react-pdf or Puppeteer
- **Email**: Resend
- **KSeF**: Polish Ministry of Finance API

---

## 📊 Database Schema (Prisma)

```prisma
// packages/db/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ORGANIZATIONS ====================

model Organization {
  id            String   @id @default(cuid())
  name          String
  taxId         String?  // IČO (CZ) or NIP (PL)
  vatId         String?  // DIČ (CZ) or VAT-EU (PL)
  country       Country  @default(CZ)
  address       Json?    // { street, city, zip, country }
  currency      Currency @default(CZK)
  
  // KSeF (Poland)
  ksefEnabled   Boolean  @default(false)
  ksefToken     String?  // Encrypted
  
  // Settings
  invoicePrefix String   @default("INV")
  invoiceNumber Int      @default(1)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  members       OrganizationMember[]
  bankAccounts  BankAccount[]
  contacts      Contact[]
  invoices      Invoice[]
  expenses      Expense[]
  categories    Category[]
}

enum Country {
  CZ
  PL
  SK
}

enum Currency {
  CZK
  PLN
  EUR
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           MemberRole   @default(MEMBER)
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, userId])
}

enum MemberRole {
  OWNER
  ADMIN
  ACCOUNTANT
  MEMBER
}

// ==================== USERS ====================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  memberships   OrganizationMember[]
  sessions      Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ==================== CONTACTS ====================

model Contact {
  id             String       @id @default(cuid())
  organizationId String
  
  type           ContactType  @default(COMPANY)
  name           String
  email          String?
  phone          String?
  taxId          String?      // IČO/NIP
  vatId          String?      // DIČ/VAT
  address        Json?
  
  // Defaults for invoicing
  paymentTerms   Int          @default(14) // days
  currency       Currency?
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invoices       Invoice[]
  
  @@index([organizationId])
}

enum ContactType {
  COMPANY
  INDIVIDUAL
}

// ==================== INVOICES ====================

model Invoice {
  id             String        @id @default(cuid())
  organizationId String
  contactId      String?
  
  // Invoice details
  number         String
  status         InvoiceStatus @default(DRAFT)
  type           InvoiceType   @default(INVOICE)
  
  // Dates
  issueDate      DateTime      @default(now())
  dueDate        DateTime
  paidAt         DateTime?
  
  // Amounts (in smallest currency unit - cents/haléře/grosze)
  subtotal       Int           @default(0)
  taxAmount      Int           @default(0)
  total          Int           @default(0)
  currency       Currency      @default(CZK)
  
  // Payment
  variableSymbol String?       // CZ specific
  bankAccountId  String?
  
  // KSeF (Poland)
  ksefId         String?       // KSeF reference number
  ksefStatus     KsefStatus?
  ksefXml        String?       // Stored FA(3) XML
  
  // Notes
  notes          String?
  internalNotes  String?
  
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  contact        Contact?      @relation(fields: [contactId], references: [id])
  bankAccount    BankAccount?  @relation(fields: [bankAccountId], references: [id])
  items          InvoiceItem[]
  payments       Payment[]
  documents      Document[]
  
  @@unique([organizationId, number])
  @@index([organizationId, status])
  @@index([contactId])
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
}

enum InvoiceType {
  INVOICE
  PROFORMA
  CREDIT_NOTE
}

enum KsefStatus {
  PENDING
  SUBMITTED
  ACCEPTED
  REJECTED
  ERROR
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Int      // cents
  taxRate     Decimal  @db.Decimal(5, 2) // e.g., 21.00 for 21%
  totalNet    Int
  totalTax    Int
  totalGross  Int
  
  position    Int      @default(0)
  
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  @@index([invoiceId])
}

// ==================== BANKING ====================

model BankAccount {
  id             String       @id @default(cuid())
  organizationId String
  
  name           String
  bankName       String
  accountNumber  String       // IBAN or local format
  currency       Currency     @default(CZK)
  
  // Integration
  provider       BankProvider?
  providerAccountId String?
  accessToken    String?      // Encrypted
  refreshToken   String?      // Encrypted
  tokenExpiresAt DateTime?
  lastSyncAt     DateTime?
  
  isDefault      Boolean      @default(false)
  isActive       Boolean      @default(true)
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transactions   BankTransaction[]
  invoices       Invoice[]
  
  @@index([organizationId])
}

enum BankProvider {
  FIO           // Direct Fio API
  POLISH_API    // PolishAPI standard
  TINK          // Tink aggregator
  SALT_EDGE     // Salt Edge aggregator
  MANUAL        // Manual entry
}

model BankTransaction {
  id            String      @id @default(cuid())
  bankAccountId String
  
  // Transaction data
  externalId    String?     // Bank's transaction ID
  date          DateTime
  amount        Int         // cents (positive = credit, negative = debit)
  currency      Currency
  
  // Details
  counterpartyName    String?
  counterpartyAccount String?
  description         String?
  variableSymbol      String?  // CZ/SK payment matching
  
  // Categorization
  categoryId    String?
  
  // Matching
  matchedPaymentId String?  @unique
  
  createdAt     DateTime    @default(now())
  
  bankAccount   BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  category      Category?   @relation(fields: [categoryId], references: [id])
  matchedPayment Payment?   @relation(fields: [matchedPaymentId], references: [id])
  
  @@unique([bankAccountId, externalId])
  @@index([bankAccountId, date])
  @@index([variableSymbol])
}

// ==================== PAYMENTS ====================

model Payment {
  id          String      @id @default(cuid())
  invoiceId   String
  
  amount      Int
  currency    Currency
  paidAt      DateTime    @default(now())
  method      PaymentMethod @default(BANK_TRANSFER)
  reference   String?
  
  invoice     Invoice     @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  transaction BankTransaction?
  
  @@index([invoiceId])
}

enum PaymentMethod {
  BANK_TRANSFER
  CARD
  CASH
  OTHER
}

// ==================== EXPENSES ====================

model Expense {
  id             String       @id @default(cuid())
  organizationId String
  categoryId     String?
  
  // Expense details
  date           DateTime
  amount         Int          // cents
  currency       Currency     @default(CZK)
  taxRate        Decimal?     @db.Decimal(5, 2)
  taxAmount      Int?
  
  // Vendor
  vendorName     String?
  vendorTaxId    String?
  
  description    String?
  
  // Status
  status         ExpenseStatus @default(PENDING)
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  category       Category?    @relation(fields: [categoryId], references: [id])
  documents      Document[]
  
  @@index([organizationId, date])
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
  PAID
}

// ==================== DOCUMENTS ====================

model Document {
  id             String       @id @default(cuid())
  organizationId String
  
  // File info
  filename       String
  mimeType       String
  size           Int
  url            String       // R2 URL
  
  // OCR results
  ocrStatus      OcrStatus    @default(PENDING)
  ocrResult      Json?        // Extracted data
  ocrConfidence  Float?
  
  // Relations (optional)
  invoiceId      String?
  expenseId      String?
  
  createdAt      DateTime     @default(now())
  
  invoice        Invoice?     @relation(fields: [invoiceId], references: [id])
  expense        Expense?     @relation(fields: [expenseId], references: [id])
  
  @@index([organizationId])
}

enum OcrStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ==================== CATEGORIES ====================

model Category {
  id             String       @id @default(cuid())
  organizationId String
  
  name           String
  color          String       @default("#6366f1")
  icon           String?
  type           CategoryType @default(EXPENSE)
  
  // Accounting
  accountCode    String?      // For accounting integration
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  expenses       Expense[]
  transactions   BankTransaction[]
  
  @@unique([organizationId, name, type])
}

enum CategoryType {
  INCOME
  EXPENSE
}
```

---

## 🔌 API Routes (tRPC)

```typescript
// packages/api/src/router/index.ts

import { router } from '../trpc';
import { authRouter } from './auth';
import { organizationRouter } from './organization';
import { contactRouter } from './contact';
import { invoiceRouter } from './invoice';
import { bankingRouter } from './banking';
import { expenseRouter } from './expense';
import { dashboardRouter } from './dashboard';
import { ksefRouter } from './ksef';

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  contact: contactRouter,
  invoice: invoiceRouter,
  banking: bankingRouter,
  expense: expenseRouter,
  dashboard: dashboardRouter,
  ksef: ksefRouter,  // Poland KSeF
});
```

### Invoice Router
```typescript
// packages/api/src/router/invoice.ts

export const invoiceRouter = router({
  // List invoices with filtering
  list: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(InvoiceStatus).optional(),
      contactId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  
  // Get single invoice
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => { /* ... */ }),
  
  // Create invoice
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Update invoice
  update: protectedProcedure
    .input(updateInvoiceSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Delete invoice
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Send invoice (email)
  send: protectedProcedure
    .input(z.object({ id: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Generate PDF
  generatePdf: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Mark as paid
  markPaid: protectedProcedure
    .input(z.object({ id: z.string(), paidAt: z.date().optional() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Duplicate invoice
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
  
  // Submit to KSeF (Poland)
  submitToKsef: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

### Banking Router
```typescript
// packages/api/src/router/banking.ts

export const bankingRouter = router({
  // Bank accounts
  accounts: router({
    list: protectedProcedure.query(/* ... */),
    create: protectedProcedure.input(createAccountSchema).mutation(/* ... */),
    connect: protectedProcedure.input(connectAccountSchema).mutation(/* ... */),
    sync: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
    disconnect: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
  }),
  
  // Transactions
  transactions: router({
    list: protectedProcedure.input(listTransactionsSchema).query(/* ... */),
    categorize: protectedProcedure.input(categorizeSchema).mutation(/* ... */),
    match: protectedProcedure.input(matchSchema).mutation(/* ... */),
    unmatch: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
  }),
  
  // Auto-matching
  suggestMatches: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .query(/* ... */),
});
```

---

## 🎨 UI Components Structure

```
apps/web/components/
├── ui/                      # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── table.tsx
│   └── ...
├── layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── mobile-nav.tsx
│   └── page-header.tsx
├── dashboard/
│   ├── stats-cards.tsx
│   ├── cash-flow-chart.tsx
│   ├── recent-invoices.tsx
│   ├── overdue-invoices.tsx
│   └── recent-transactions.tsx
├── invoices/
│   ├── invoice-list.tsx
│   ├── invoice-table.tsx
│   ├── invoice-form.tsx
│   ├── invoice-preview.tsx
│   ├── invoice-item-row.tsx
│   ├── contact-select.tsx
│   └── status-badge.tsx
├── banking/
│   ├── account-list.tsx
│   ├── connect-bank-dialog.tsx
│   ├── transaction-list.tsx
│   ├── transaction-row.tsx
│   ├── match-invoice-dialog.tsx
│   └── categorize-dialog.tsx
├── expenses/
│   ├── expense-list.tsx
│   ├── expense-form.tsx
│   ├── receipt-upload.tsx
│   └── ocr-preview.tsx
├── contacts/
│   ├── contact-list.tsx
│   ├── contact-form.tsx
│   └── contact-card.tsx
└── settings/
    ├── organization-form.tsx
    ├── bank-accounts.tsx
    ├── invoice-settings.tsx
    ├── ksef-settings.tsx
    └── team-members.tsx
```

---

## 📱 App Routes (Next.js)

```
apps/web/app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Sidebar layout
│   ├── page.tsx                # Dashboard home
│   ├── invoices/
│   │   ├── page.tsx            # Invoice list
│   │   ├── new/page.tsx        # Create invoice
│   │   └── [id]/
│   │       ├── page.tsx        # Invoice detail
│   │       └── edit/page.tsx   # Edit invoice
│   ├── expenses/
│   │   ├── page.tsx
│   │   └── new/page.tsx
│   ├── banking/
│   │   ├── page.tsx            # Accounts + transactions
│   │   └── connect/page.tsx    # Connect new bank
│   ├── contacts/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── reports/
│   │   ├── page.tsx
│   │   ├── income/page.tsx
│   │   ├── expenses/page.tsx
│   │   └── cash-flow/page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── organization/page.tsx
│       ├── billing/page.tsx
│       ├── team/page.tsx
│       └── integrations/page.tsx
└── api/
    └── trpc/[trpc]/route.ts
```

---

## 🇵🇱 KSeF Integration (Poland)

### KSeF XML Schema (FA3)
```typescript
// packages/invoicing/ksef/types.ts

export interface KsefInvoice {
  // Header
  KodFormularza: 'FA';
  WariantFormularza: 3;
  DataWytworzeniaFa: string; // ISO date
  
  // Seller (Podmiot1)
  Podmiot1: {
    NIP: string;
    Nazwa: string;
    Adres: {
      KodKraju: 'PL';
      AdresL1: string;
      AdresL2?: string;
    };
  };
  
  // Buyer (Podmiot2)
  Podmiot2: {
    NIP?: string;
    Nazwa: string;
    Adres: {
      KodKraju: string;
      AdresL1: string;
    };
  };
  
  // Invoice details
  Fa: {
    KodWaluty: 'PLN' | 'EUR' | 'USD';
    P_1: string;  // Issue date
    P_2: string;  // Invoice number
    P_15: number; // Net amount
    P_16: boolean; // Split payment
    // ... more fields
  };
  
  // Line items
  FaWiersz: Array<{
    NrWierszaFa: number;
    NazwaWiersza: string;
    IloscWiersza: number;
    CenaJednWiersza: number;
    WartoscWiersza: number;
    StawkaPodatku: number;
  }>;
}
```

### KSeF API Client
```typescript
// packages/invoicing/ksef/client.ts

export class KsefClient {
  private baseUrl = 'https://ksef.mf.gov.pl/api';
  private testUrl = 'https://ksef-test.mf.gov.pl/api';
  
  constructor(
    private token: string,
    private isTest: boolean = false
  ) {}
  
  // Initialize session
  async initSession(): Promise<string> { /* ... */ }
  
  // Submit invoice
  async submitInvoice(invoice: KsefInvoice): Promise<{
    ksefReferenceNumber: string;
    timestamp: string;
  }> { /* ... */ }
  
  // Check invoice status
  async getInvoiceStatus(referenceNumber: string): Promise<{
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    errors?: string[];
  }> { /* ... */ }
  
  // Download UPO (confirmation)
  async downloadUpo(referenceNumber: string): Promise<Buffer> { /* ... */ }
}
```

---

## 🏦 Banking Integration

### Fio Banka API (Czech)
```typescript
// packages/banking/fio/client.ts

export class FioClient {
  private baseUrl = 'https://www.fio.cz/ib_api/rest';
  
  constructor(private token: string) {}
  
  // Get transactions for period
  async getTransactions(
    dateFrom: Date,
    dateTo: Date
  ): Promise<FioTransaction[]> {
    const from = format(dateFrom, 'yyyy-MM-dd');
    const to = format(dateTo, 'yyyy-MM-dd');
    
    const response = await fetch(
      `${this.baseUrl}/periods/${this.token}/${from}/${to}/transactions.json`
    );
    
    const data = await response.json();
    return this.parseTransactions(data);
  }
  
  // Get transactions since last download
  async getNewTransactions(): Promise<FioTransaction[]> {
    const response = await fetch(
      `${this.baseUrl}/last/${this.token}/transactions.json`
    );
    
    const data = await response.json();
    return this.parseTransactions(data);
  }
  
  // Set last download pointer
  async setLastDownloadId(id: string): Promise<void> {
    await fetch(
      `${this.baseUrl}/set-last-id/${this.token}/${id}/`
    );
  }
}
```

### PolishAPI (Poland)
```typescript
// packages/banking/polish-api/client.ts

export class PolishApiClient {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private bankEndpoint: string
  ) {}
  
  // OAuth2 authorization flow
  async authorize(redirectUri: string): Promise<string> { /* ... */ }
  
  // Exchange code for tokens
  async exchangeCode(code: string): Promise<TokenResponse> { /* ... */ }
  
  // Get accounts
  async getAccounts(accessToken: string): Promise<Account[]> { /* ... */ }
  
  // Get transactions
  async getTransactions(
    accessToken: string,
    accountNumber: string,
    params: TransactionParams
  ): Promise<Transaction[]> { /* ... */ }
}
```

---

## 📄 OCR Pipeline (Claude Vision)

```typescript
// packages/ocr/processor.ts

import Anthropic from '@anthropic-ai/sdk';

export class OcrProcessor {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic();
  }
  
  async processReceipt(imageBase64: string): Promise<OcrResult> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64,
          },
        }, {
          type: 'text',
          text: `Extract invoice/receipt data. Return JSON:
{
  "vendor": { "name": "", "taxId": "", "vatId": "", "address": "" },
  "invoiceNumber": "",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "items": [{ "description": "", "quantity": 0, "unitPrice": 0, "taxRate": 0, "total": 0 }],
  "subtotal": 0,
  "taxAmount": 0,
  "total": 0,
  "currency": "CZK|PLN|EUR",
  "variableSymbol": "",
  "confidence": 0.0-1.0
}`,
        }],
      }],
    });
    
    return this.parseResponse(response);
  }
  
  async processInvoice(pdfBase64: string): Promise<OcrResult> {
    // Similar but for PDF invoices
  }
}
```

---

## 🚦 Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (monorepo, TypeScript, ESLint)
- [ ] Database schema + Prisma setup
- [ ] Authentication (Better Auth)
- [ ] Basic UI layout (sidebar, header)
- [ ] Organization CRUD

### Phase 2: Invoicing Core (Week 3-4)
- [ ] Contact management
- [ ] Invoice creation form
- [ ] Invoice list with filters
- [ ] PDF generation
- [ ] Email sending

### Phase 3: Banking (Week 5-6)
- [ ] Fio Banka integration
- [ ] Transaction import
- [ ] Auto-matching with variable symbol
- [ ] Manual matching UI
- [ ] Transaction categorization

### Phase 4: Expenses & OCR (Week 7-8)
- [ ] Expense management
- [ ] Receipt upload
- [ ] Claude Vision OCR
- [ ] Category management

### Phase 5: Dashboard & Reports (Week 9-10)
- [ ] Dashboard widgets
- [ ] Cash flow chart
- [ ] Income/expense reports
- [ ] Overdue invoice alerts

### Phase 6: KSeF Poland (Week 11-12)
- [ ] KSeF API integration
- [ ] FA(3) XML generation
- [ ] Invoice submission
- [ ] Status tracking
- [ ] UPO download

### Phase 7: Polish Localization (Week 13-14)
- [ ] Polish translations
- [ ] PolishAPI integration
- [ ] PLN currency support
- [ ] Polish tax rates

---

## 🔧 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="..."

# Anthropic (OCR)
ANTHROPIC_API_KEY="sk-ant-..."

# Banking - Fio
FIO_API_TOKEN="..."

# Banking - PolishAPI
POLISH_API_CLIENT_ID="..."
POLISH_API_CLIENT_SECRET="..."

# Banking - Aggregator (optional)
TINK_CLIENT_ID="..."
TINK_CLIENT_SECRET="..."

# KSeF (Poland)
KSEF_ENVIRONMENT="test|production"
KSEF_TOKEN="..."

# Storage
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="..."
R2_ENDPOINT="..."

# Email
RESEND_API_KEY="..."

# Monitoring
SENTRY_DSN="..."
```

---

## 📝 Coding Conventions

### TypeScript
- Use strict mode
- Prefer `type` over `interface` for object shapes
- Use `z.infer<typeof schema>` for derived types
- No `any` - use `unknown` if needed

### React
- Functional components only
- Use `'use client'` only when needed
- Prefer server components
- Use React Query for data fetching

### Naming
- Components: PascalCase (`InvoiceList.tsx`)
- Functions: camelCase (`createInvoice`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- Database tables: PascalCase (Prisma convention)

### File Structure
- One component per file
- Co-locate tests with components
- Keep hooks in `hooks/` directory
- Keep utils in `lib/` directory

---

## 🚀 Commands

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Database
pnpm db:push      # Push schema changes
pnpm db:migrate   # Create migration
pnpm db:studio    # Open Prisma Studio

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
pnpm lint:fix

# Type check
pnpm typecheck
```

---

## ⚡ Quick Start for Claude Code

1. **Start with project setup:**
   ```bash
   pnpm create turbo@latest sme-financial-os --example with-tailwind
   cd sme-financial-os
   ```

2. **Install core dependencies:**
   ```bash
   pnpm add @trpc/server @trpc/client @trpc/react-query @tanstack/react-query
   pnpm add prisma @prisma/client
   pnpm add zod
   pnpm add @anthropic-ai/sdk
   pnpm add -D typescript @types/node
   ```

3. **Set up shadcn/ui:**
   ```bash
   pnpm dlx shadcn@latest init
   pnpm dlx shadcn@latest add button card input table dialog
   ```

4. **Initialize Prisma:**
   ```bash
   pnpm prisma init
   ```

5. **Start building features in order:**
   - Auth → Organizations → Contacts → Invoices → Banking → Expenses → Dashboard → KSeF

---

## 🎯 Success Metrics

- **MVP in 8 weeks**
- **First 10 beta users in week 10**
- **KSeF integration complete by week 12**
- **100 paying customers in 6 months**

---

## 📚 Reference Links

- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Fio API Docs](https://www.fio.cz/bankovni-sluzby/api-bankovnictvi)
- [PolishAPI Spec](https://polishapi.org)
- [KSeF Documentation](https://www.podatki.gov.pl/ksef/)
- [KSeF FA(3) Schema](https://www.podatki.gov.pl/ksef/dokumentacja-techniczna/)

---

**LET'S BUILD THIS! 🚀**
