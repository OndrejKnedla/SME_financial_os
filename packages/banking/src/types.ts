// Common types for bank integrations

export type Currency = 'CZK' | 'PLN' | 'EUR' | 'USD' | 'GBP';

export interface BankTransaction {
  // Identification
  id: string;
  externalId: string;

  // Transaction details
  date: Date;
  amount: number; // in smallest unit (cents/haléře), positive = credit, negative = debit
  currency: Currency;

  // Counterparty
  counterpartyName?: string;
  counterpartyAccount?: string;
  counterpartyBankCode?: string;

  // Description & reference
  description?: string;
  variableSymbol?: string; // CZ/SK specific
  constantSymbol?: string; // CZ/SK specific
  specificSymbol?: string; // CZ/SK specific
  reference?: string;

  // Additional data
  userNote?: string;
  bankNote?: string;
  type?: TransactionType;
}

export type TransactionType =
  | 'PAYMENT'
  | 'CARD_PAYMENT'
  | 'TRANSFER'
  | 'DIRECT_DEBIT'
  | 'STANDING_ORDER'
  | 'ATM_WITHDRAWAL'
  | 'FEE'
  | 'INTEREST'
  | 'OTHER';

export interface AccountInfo {
  accountId: string;
  accountNumber: string;
  bankCode?: string;
  iban?: string;
  bic?: string;
  currency: Currency;
  accountName?: string;
  ownerName?: string;
}

export interface BankProvider {
  name: string;
  code: string;

  // Get account info
  getAccountInfo(): Promise<AccountInfo>;

  // Get transactions
  getTransactions(options: GetTransactionsOptions): Promise<BankTransaction[]>;

  // Get new transactions since last sync
  getNewTransactions(sinceId?: string): Promise<BankTransaction[]>;

  // Validate connection/token
  validateConnection(): Promise<boolean>;
}

export interface GetTransactionsOptions {
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface SyncResult {
  success: boolean;
  newTransactions: number;
  lastTransactionId?: string;
  lastTransactionDate?: Date;
  error?: string;
}
