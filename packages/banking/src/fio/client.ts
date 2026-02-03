/**
 * Fio Banka API Client
 *
 * Fio Banka provides a simple REST API for accessing account transactions.
 * Documentation: https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
 *
 * Key endpoints:
 * - /ib_api/rest/last/{token}/transactions.json - Get new transactions since last call
 * - /ib_api/rest/periods/{token}/{from}/{to}/transactions.json - Get transactions for period
 * - /ib_api/rest/by-id/{token}/{year}/{id}/transactions.json - Get transactions since ID
 * - /ib_api/rest/set-last-id/{token}/{id}/ - Set last downloaded ID
 * - /ib_api/rest/set-last-date/{token}/{date}/ - Set last downloaded date
 *
 * Rate limiting: Only one request per 30 seconds per token
 */

import type {
  BankProvider,
  BankTransaction,
  AccountInfo,
  GetTransactionsOptions,
  Currency,
  TransactionType,
} from '../types';
import { format, parse } from 'date-fns';

const FIO_API_BASE = 'https://www.fio.cz/ib_api/rest';

interface FioTransaction {
  column22?: { value: number; id: number }; // ID pohybu
  column0?: { value: string }; // Datum
  column1?: { value: number }; // Objem
  column14?: { value: string }; // Měna
  column2?: { value: string }; // Protiúčet
  column3?: { value: string }; // Kód banky
  column4?: { value: string }; // KS
  column5?: { value: string }; // VS
  column6?: { value: string }; // SS
  column7?: { value: string }; // Uživatelská identifikace
  column8?: { value: number }; // Typ
  column9?: { value: string }; // Provedl
  column10?: { value: string }; // Název protiúčtu
  column12?: { value: string }; // Název banky
  column16?: { value: string }; // Zpráva pro příjemce
  column17?: { value: number }; // ID pokynu
  column18?: { value: string }; // Upřesnění
  column25?: { value: string }; // Komentář
  column26?: { value: string }; // BIC
  column27?: { value: string }; // Referenční číslo platby
}

interface FioAccountInfo {
  accountId: string;
  bankId: string;
  currency: string;
  iban: string;
  bic: string;
  openingBalance: number;
  closingBalance: number;
  dateStart: string;
  dateEnd: string;
  yearList: number | null;
  idList: number | null;
  idFrom: number | null;
  idTo: number | null;
  idLastDownload: number | null;
}

interface FioResponse {
  accountStatement: {
    info: FioAccountInfo;
    transactionList: {
      transaction: FioTransaction[] | null;
    };
  };
}

export class FioClient implements BankProvider {
  name = 'Fio Banka';
  code = 'FIO';

  private token: string;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 30000; // 30 seconds

  constructor(token: string) {
    if (!token) {
      throw new Error('Fio API token is required');
    }
    this.token = token;
  }

  /**
   * Enforce rate limiting - Fio allows only 1 request per 30 seconds
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make a request to the Fio API
   */
  private async request<T>(endpoint: string): Promise<T> {
    await this.enforceRateLimit();

    const url = `${FIO_API_BASE}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Rate limit exceeded. Please wait 30 seconds between requests.');
      }
      if (response.status === 500) {
        throw new Error('Fio API error. The token may be invalid or expired.');
      }
      throw new Error(`Fio API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;
    return data;
  }

  /**
   * Parse a Fio transaction into our standard format
   */
  private parseTransaction(tx: FioTransaction): BankTransaction {
    const dateStr = tx.column0?.value;
    const date = dateStr
      ? parse(dateStr, 'yyyy-MM-dd+HH:mm', new Date())
      : new Date();

    // Amount is in main units (CZK), convert to smallest unit (haléře)
    const amount = Math.round((tx.column1?.value ?? 0) * 100);

    // Determine transaction type based on Fio type code
    const fioType = tx.column8?.value;
    let type: TransactionType = 'OTHER';
    if (fioType !== undefined) {
      // Fio type codes: https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
      // 1 = Příchozí platba, 2 = Odchozí platba, 3 = Příkaz k inkasu, etc.
      switch (fioType) {
        case 1:
        case 2:
          type = 'TRANSFER';
          break;
        case 3:
          type = 'DIRECT_DEBIT';
          break;
        case 4:
          type = 'STANDING_ORDER';
          break;
        default:
          type = 'OTHER';
      }
    }

    return {
      id: String(tx.column22?.value ?? ''),
      externalId: String(tx.column22?.value ?? ''),
      date,
      amount,
      currency: (tx.column14?.value ?? 'CZK') as Currency,
      counterpartyName: tx.column10?.value,
      counterpartyAccount: tx.column2?.value,
      counterpartyBankCode: tx.column3?.value,
      description: tx.column16?.value ?? tx.column25?.value,
      variableSymbol: tx.column5?.value,
      constantSymbol: tx.column4?.value,
      specificSymbol: tx.column6?.value,
      reference: tx.column27?.value,
      userNote: tx.column7?.value,
      bankNote: tx.column18?.value,
      type,
    };
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    // Use the "last" endpoint to get account info
    const data = await this.request<FioResponse>(
      `/last/${this.token}/transactions.json`
    );

    const info = data.accountStatement.info;

    return {
      accountId: info.accountId,
      accountNumber: `${info.accountId}/${info.bankId}`,
      bankCode: info.bankId,
      iban: info.iban,
      bic: info.bic,
      currency: info.currency as Currency,
    };
  }

  /**
   * Get transactions for a date range
   */
  async getTransactions(options: GetTransactionsOptions = {}): Promise<BankTransaction[]> {
    const dateFrom = options.dateFrom ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: last 90 days
    const dateTo = options.dateTo ?? new Date();

    const fromStr = format(dateFrom, 'yyyy-MM-dd');
    const toStr = format(dateTo, 'yyyy-MM-dd');

    const data = await this.request<FioResponse>(
      `/periods/${this.token}/${fromStr}/${toStr}/transactions.json`
    );

    const transactions = data.accountStatement.transactionList.transaction ?? [];
    let result = transactions.map((tx) => this.parseTransaction(tx));

    // Apply limit if specified
    if (options.limit && result.length > options.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get new transactions since last sync
   * Uses the /last endpoint which returns transactions since the last download
   */
  async getNewTransactions(sinceId?: string): Promise<BankTransaction[]> {
    let data: FioResponse;

    if (sinceId) {
      // Get transactions since specific ID
      const year = new Date().getFullYear();
      data = await this.request<FioResponse>(
        `/by-id/${this.token}/${year}/${sinceId}/transactions.json`
      );
    } else {
      // Get new transactions since last download
      data = await this.request<FioResponse>(
        `/last/${this.token}/transactions.json`
      );
    }

    const transactions = data.accountStatement.transactionList.transaction ?? [];
    return transactions.map((tx) => this.parseTransaction(tx));
  }

  /**
   * Set the last downloaded transaction ID
   * This marks the point from which new transactions will be returned
   */
  async setLastId(id: string): Promise<void> {
    await this.request(`/set-last-id/${this.token}/${id}/`);
  }

  /**
   * Set the last downloaded date
   */
  async setLastDate(date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    await this.request(`/set-last-date/${this.token}/${dateStr}/`);
  }

  /**
   * Validate the connection/token
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch {
      return false;
    }
  }
}
