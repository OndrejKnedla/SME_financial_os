/**
 * Prompts for OCR extraction using Claude
 */

export const RECEIPT_EXTRACTION_PROMPT = `You are an expert at extracting structured data from receipts and invoices.

Analyze the provided image of a receipt or invoice and extract the following information in JSON format:

{
  "documentType": "receipt" | "invoice",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "string or null",
  "vendor": {
    "name": "string",
    "taxId": "string or null (IČO for Czech, NIP for Polish)",
    "vatId": "string or null (DIČ for Czech, VAT-PL for Polish)",
    "address": "string or null"
  },
  "items": [
    {
      "description": "string",
      "quantity": number or null,
      "unitPrice": number or null (in smallest currency unit),
      "totalPrice": number (in smallest currency unit),
      "vatRate": number or null (percentage, e.g., 21 for 21%)
    }
  ],
  "subtotal": number or null (in smallest currency unit),
  "vatAmount": number or null (in smallest currency unit),
  "total": number (in smallest currency unit - REQUIRED),
  "currency": "CZK" | "PLN" | "EUR" | "USD",
  "vatBreakdown": [
    {
      "rate": number (percentage),
      "base": number (in smallest currency unit),
      "amount": number (in smallest currency unit)
    }
  ] or null,
  "payment": {
    "method": "cash" | "card" | "transfer" | "other" | null,
    "cardLast4": "string or null"
  } or null,
  "confidence": number (0-1, your confidence in the extraction accuracy),
  "warnings": ["array of any issues or uncertainties"]
}

Important rules:
1. All monetary amounts must be in the smallest currency unit (e.g., haléře for CZK, grosze for PLN, cents for EUR/USD)
   - For example: 123.45 CZK should be returned as 12345
2. Dates must be in YYYY-MM-DD format
3. VAT rates should be percentages (e.g., 21 for 21%, not 0.21)
4. If you can't determine a value with confidence, use null
5. The "total" field is REQUIRED - if you can't find it, estimate from items
6. Look for Czech/Polish tax identifiers:
   - Czech IČO: 8 digits
   - Czech DIČ: CZ + 8-10 digits
   - Polish NIP: 10 digits (may have dashes)
   - Polish VAT: PL + 10 digits
7. Common Czech VAT rates: 21%, 15%, 10%, 0%
8. Common Polish VAT rates: 23%, 8%, 5%, 0%

Return ONLY valid JSON, no additional text.`;

export const INVOICE_EXTRACTION_PROMPT = `You are an expert at extracting structured data from business invoices.

Analyze the provided image of an invoice and extract the following information in JSON format:

{
  "documentType": "invoice",
  "date": "YYYY-MM-DD (issue date)",
  "dueDate": "YYYY-MM-DD or null",
  "invoiceNumber": "string",
  "vendor": {
    "name": "string (seller/supplier name)",
    "taxId": "string or null (IČO/NIP)",
    "vatId": "string or null (DIČ/VAT)",
    "address": "string or null",
    "bankAccount": "string or null (IBAN or account number)"
  },
  "buyer": {
    "name": "string or null",
    "taxId": "string or null",
    "vatId": "string or null",
    "address": "string or null"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number (in smallest currency unit),
      "totalPrice": number (in smallest currency unit),
      "vatRate": number (percentage)
    }
  ],
  "subtotal": number (in smallest currency unit),
  "vatAmount": number (in smallest currency unit),
  "total": number (in smallest currency unit - REQUIRED),
  "currency": "CZK" | "PLN" | "EUR" | "USD",
  "vatBreakdown": [
    {
      "rate": number (percentage),
      "base": number (in smallest currency unit),
      "amount": number (in smallest currency unit)
    }
  ],
  "variableSymbol": "string or null (VS - payment reference)",
  "constantSymbol": "string or null (KS)",
  "specificSymbol": "string or null (SS)",
  "confidence": number (0-1),
  "warnings": ["array of any issues"]
}

Important rules:
1. All monetary amounts in smallest currency unit (haléře/grosze/cents)
2. Look for payment symbols (VS, KS, SS) - common in Czech/Slovak invoices
3. Variable symbol is often the invoice number or a specific payment code
4. Extract both seller (vendor) and buyer information if present
5. The invoice number is usually prominently displayed
6. Return ONLY valid JSON, no additional text.`;

export const LANGUAGE_HINTS: Record<string, string> = {
  cs: `
The document is likely in Czech. Look for:
- "Faktura" = Invoice
- "Účtenka" or "Paragon" = Receipt
- "DPH" = VAT
- "Základ daně" = Tax base
- "Celkem" or "Celková částka" = Total
- "Datum" = Date
- "Číslo faktury" or "Č." = Invoice number
- "Dodavatel" = Supplier
- "Odběratel" = Customer
- "Variabilní symbol" or "VS" = Variable symbol
`,
  pl: `
The document is likely in Polish. Look for:
- "Faktura" = Invoice
- "Paragon" = Receipt
- "VAT" or "PTU" = VAT
- "Netto" = Net amount
- "Brutto" = Gross amount
- "Razem" or "Suma" = Total
- "Data" = Date
- "Nr faktury" = Invoice number
- "Sprzedawca" = Seller
- "Nabywca" = Buyer
`,
  en: `
The document is likely in English. Look for standard terms:
- Invoice, Receipt, Bill
- VAT, Tax, GST
- Subtotal, Total, Amount Due
- Date, Due Date
- Invoice Number, Receipt Number
`,
};
