# SME Financial OS

All-in-one financial platform for small and medium enterprises in Czech Republic and Poland.

## Features

- **Invoicing**: Create, send, and track invoices with PDF generation
- **Expense Tracking**: OCR receipt scanning with AI-powered data extraction
- **Banking Integration**: Fio Bank API for automatic transaction sync
- **Transaction Matching**: Automatic matching of payments to invoices
- **KSeF Integration**: Polish National e-Invoice System compliance
- **Multi-language**: English, Czech, and Polish support
- **Multi-currency**: CZK, PLN, EUR support

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **API**: tRPC v11
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest
- **Monorepo**: Turborepo with pnpm

## Project Structure

```
sme-financial-os/
├── apps/
│   └── web/                 # Next.js web application
├── packages/
│   ├── api/                 # tRPC routers and procedures
│   ├── db/                  # Prisma schema and client
│   ├── shared/              # Shared types, utils, schemas
│   ├── invoicing/           # PDF generation, KSeF integration
│   ├── email/               # Email templates (Resend)
│   ├── banking/             # Bank API integrations (Fio)
│   └── ocr/                 # Receipt OCR (Claude Vision)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 16+
- Docker (optional, for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/sme-financial-os.git
cd sme-financial-os
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Start the database (with Docker):
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
pnpm db:push
```

6. Seed the database (optional):
```bash
pnpm db:seed
```

7. Start the development server:
```bash
pnpm dev
```

The app will be available at http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SECRET` | Session encryption secret (32+ chars) | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for OCR | For OCR |
| `RESEND_API_KEY` | Resend API key for emails | For emails |
| `KSEF_TOKEN` | KSeF authorization token | For Poland |

See `.env.example` for all available variables.

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database

# Quality
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm test             # Run tests
pnpm format           # Format code with Prettier
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test --coverage
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

### Self-hosted

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## License

Private - All rights reserved
